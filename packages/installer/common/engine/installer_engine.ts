// installer-flow.engine.ts
import type {
  FlowDefinition,
  FlowStepDefinition,
  InstallerEnvironment,
  InstallerEvent,
  InstallerSnapshot,
  InstallerStatus,
  InstallerContext,
  SerializedInstallerState,
  StepInput,
  TransitionListener,
  InteractionRequest,
  FlowStepId,
  FlowStepResult,
  Logger
} from "./installer_engine.types"
import type { InstallerConfig } from "@type/installer"
/**
 * State machine responsible for orchestrating the installer flow.
 * It executes steps sequentially and suspends when user interaction
 * is required, allowing the state to be persisted and restored.
 */
export class InstallerEngine {
  private status: InstallerStatus = "idle"
  private context: InstallerContext
  private readonly env: InstallerEnvironment
  private readonly flow: FlowDefinition
  private currentStepIndex = 0
  private pendingInteraction?: InteractionRequest
  private readonly listeners = new Set<TransitionListener>()

  /**
   * Creates a new engine instance.
   *
   * @param config Static installer configuration.
   * @param env Environment implementation providing side effects.
   * @param flow Flow definition describing the sequence of steps.
   * @param logger Logger interface for emitting events.
   */
  constructor(
    config: InstallerConfig,
    env: InstallerEnvironment,
    flow: FlowDefinition,
    logger: Logger
  ) {
    this.env = env
    this.flow = flow
    this.context = {
      logger,
      config,
      plan: undefined,
      values: {},
      credentials: {},
      pendingCredentialIds: [],
      lastError: undefined
    }
  }

  /**
   * Restores an engine from a serialized snapshot.
   * The provided config and flow should match the ones used when the
   * snapshot was originally produced.
   */
  static fromSerialized(
    snapshot: SerializedInstallerState,
    config: InstallerConfig,
    env: InstallerEnvironment,
    flow: FlowDefinition,
    logger: Logger
  ): InstallerEngine {
    const engine = new InstallerEngine(config, env, flow, logger)
    engine.status = snapshot.status
    engine.context = snapshot.context
    engine.currentStepIndex = snapshot.currentStepIndex
    engine.pendingInteraction = snapshot.pendingInteraction
    return engine
  }

  /**
   * Registers a listener that is called on every transition.
   * Returns an unsubscribe function.
   */
  onTransition(listener: TransitionListener): () => void {
    this.listeners.add(listener)
    listener(this.getSnapshot())
    return () => this.listeners.delete(listener)
  }

  /**
   * Returns a snapshot of the current engine state.
   */
  getSnapshot(): InstallerSnapshot {
    return {
      status: this.status,
      context: this.context,
      currentStepIndex: this.currentStepIndex,
      currentStep: this.flow.steps[this.currentStepIndex],
      pendingInteraction: this.pendingInteraction
    }
  }

  /**
   * Serializes the engine state for persistence.
   */
  serialize(): SerializedInstallerState {
    return {
      schemaVersion: 1,
      status: this.status,
      context: this.context,
      currentStepIndex: this.currentStepIndex,
      pendingInteraction: this.pendingInteraction
    }
  }

  /**
   * Processes an event and updates the engine state accordingly.
   * Some events cause the engine to run multiple steps until it reaches
   * the next interaction point or a terminal state.
   */
  async send(event: InstallerEvent): Promise<void> {
    switch (event.type) {
      case "START": {
        if (
          this.status === "idle" ||
          this.status === "failed" ||
          this.status === "completed"
        ) {
          this.resetRunState()
          this.status = "running"
          this.emitTransition()
          await this.runLoop()
        }
        break
      }

      case "RETRY": {
        if (this.status === "failed") {
          this.resetRunState()
          this.status = "running"
          this.emitTransition()
          await this.runLoop()
        }
        break
      }

      case "CANCEL": {
        if (this.status === "completed") {
          break
        }
        this.status = "failed"
        this.context = {
          ...this.context,
          lastError: {
            message: "Installation cancelled.",
            code: "cancelled"
          }
        }
        this.emitTransition()
        break
      }

      case "PROVIDE_INPUT": {
        if (
          this.status !== "awaitingInput" ||
          !this.pendingInteraction ||
          !this.isMatchingInteraction(event.stepId, event.kind)
        ) {
          break
        }

        this.status = "running"
        this.emitTransition()

        const input: StepInput = {
          kind: event.kind,
          data: event.data
        }

        await this.runCurrentStepWithInput(input)
        if (this.status === "running") {
          await this.runLoop()
        }
        break
      }
    }
  }

  // ---------- INTERNAL EXECUTION ----------

  /**
   * Resets state that is specific to a single run while preserving
   * static configuration.
   */
  private resetRunState(): void {
    this.currentStepIndex = 0
    this.pendingInteraction = undefined
    this.context = {
      ...this.context,
      plan: undefined,
      values: this.context.values ?? {},
      credentials: this.context.credentials ?? {},
      pendingCredentialIds: [],
      lastError: undefined
    }
  }

  /**
   * Executes steps sequentially until the flow either completes,
   * requests user interaction, or fails.
   */
  private async runLoop(): Promise<void> {
    const steps = this.flow.steps

    while (this.status === "running" && this.currentStepIndex < steps.length) {
      const step = steps[this.currentStepIndex]

      try {
        const result = await this.env.runStep(step, this.context)
        this.applyStepResult(result)
        if (this.status !== "running") {
          return
        }
      } catch (err: any) {
        this.failWithError(err)
        return
      }
    }

    if (this.status === "running" && this.currentStepIndex >= steps.length) {
      this.status = "completed"
      this.emitTransition()
    }
  }

  /**
   * Re-runs the current step with input provided after an interaction.
   */
  private async runCurrentStepWithInput(input: StepInput): Promise<void> {
    const step = this.flow.steps[this.currentStepIndex]

    try {
      const result = await this.env.runStep(step, this.context, input)
      this.applyStepResult(result)
    } catch (err: any) {
      this.failWithError(err)
    }
  }

  /**
   * Applies the result of a step execution to the engine state.
   */
  private applyStepResult(result: FlowStepResult): void {
    if (result.contextPatch) {
      this.context = { ...this.context, ...result.contextPatch }
    }

    if (result.type === "done") {
      this.currentStepIndex += 1
      this.pendingInteraction = undefined
      this.emitTransition()
      return
    }

    this.pendingInteraction = result.interaction
    this.status = "awaitingInput"
    this.emitTransition()
  }

  /**
   * Updates the state to failed, using information from the error object.
   */
  private failWithError(err: any): void {
    const message =
      err && typeof err.message === "string" ?
        err.message
      : "Unexpected error during installer flow."
    const code =
      err && typeof err.code === "string" ? err.code : "installer_flow_error"

    this.status = "failed"
    this.context = {
      ...this.context,
      lastError: {
        message,
        code,
        details: err
      }
    }
    this.emitTransition()
  }

  /**
   * Emits the current snapshot to all registered listeners.
   */
  private emitTransition(): void {
    const snapshot = this.getSnapshot()
    for (const listener of this.listeners) {
      listener(snapshot)
    }
  }

  /**
   * Checks whether a PROVIDE_INPUT event corresponds to the interaction
   * the engine is currently waiting for.
   */
  private isMatchingInteraction(stepId: FlowStepId, kind: string): boolean {
    return (
      this.pendingInteraction?.stepId === stepId &&
      this.pendingInteraction.kind === kind
    )
  }
}
