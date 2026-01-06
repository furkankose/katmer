import {
  InstallerEvent,
  InstallerSnapshot,
  InstallerStatus,
  InstallerContext,
  SerializedInstallerState,
  StepInput,
  TransitionListener,
  InteractionRequest,
  FlowStepResult,
  InstallerOptions
} from "@common/installer_engine.types"
import type { InstallerConfig } from "@type/installer"
import { createCredentialManager } from "./credentials/mod"
import { CredentialManager } from "./credentials/credential.resolver"
import * as os from "node:os"
import path from "node:path"

const STEPS = [
  "init",
  "prepare",
  "plan",
  "configure",
  "install",
  "migrate",
  "finalize"
] as const

export type InstallerStep = (typeof STEPS)[number]
export type InstallerStepPayload = {
  stepId: InstallerStep
  data: Record<string, any>
}

/**
 * State machine responsible for orchestrating the installer flow.
 * It executes steps sequentially and suspends when user interaction
 * is required, allowing the state to be persisted and restored.
 */
export abstract class InstallerEngine {
  workspaceRoot!: string
  context: InstallerContext
  status: InstallerStatus = "idle"

  credentialManager!: CredentialManager

  private currentStep = "init" as InstallerStep
  private pendingInteraction?: InteractionRequest
  private readonly listeners = new Set<TransitionListener>()

  steps: Record<
    | "install"
    | "init"
    | "prepare"
    | "plan"
    | "configure"
    | "migrate"
    | "finalize",
    InstallerStepPayload
  >
  uiStepCount: number

  /**
   * Creates a new engine instance.
   *
   * @param config Static installer configuration.
   * @param options
   */
  constructor(
    public config: InstallerConfig,
    options: InstallerOptions
  ) {
    this.workspaceRoot = path.resolve(os.tmpdir(), `${config.id}`)

    this.context = {
      logger: options.logger,
      plan: undefined,
      credentials: {},
      pendingCredentialIds: [],
      lastError: undefined
    }
    this.steps = this.prepareInstallationSteps()
    this.uiStepCount = Object.entries(this.config.steps || {}).reduce<number>(
      (total, [_stepName, config]) => {
        for (const step of config) {
          if (step && (step.name || step.label)) {
            total++
          }
        }
        return total
      },
      0
    )
  }

  async initialize() {
    this.credentialManager = await createCredentialManager(this)
  }

  prepareInstallationSteps() {
    return STEPS.reduce<Record<InstallerStep, InstallerStepPayload>>(
      (acc, step) => {
        acc[step] = {
          stepId: step,
          data: {}
        }
        return acc
      },
      {} as any
    )
  }

  /**
   * Executes or progresses a single step in the flow.
   *
   * When called without input, the step may either complete or request
   * interaction. When called with input, the step should resume from the
   * last suspension point.
   */
  abstract runStep(
    step: InstallerStepPayload,
    input?: StepInput
  ): Promise<FlowStepResult>
  // /**
  //  * Restores an engine from a serialized snapshot.
  //  * The provided config and flow should match the ones used when the
  //  * snapshot was originally produced.
  //  */
  // static fromSerialized(
  //   snapshot: SerializedInstallerState,
  //   config: InstallerConfig,
  //   env: InstallerEnvironment,
  //   flow: FlowDefinition,
  //   logger: Logger
  // ): InstallerEngine {
  //   const engine = new InstallerEngine(config, env, flow, logger)
  //   engine.status = snapshot.status
  //   engine.context = snapshot.context
  //   engine.currentStepIndex = snapshot.currentStepIndex
  //   engine.pendingInteraction = snapshot.pendingInteraction
  //   return engine
  // }

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
      steps: this.steps,
      context: this.context,
      currentStep: this.currentStep,
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
      currentStep: this.currentStep,
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
          await this.runLoop(event)
        }
        break
      }

      case "RETRY": {
        if (this.status === "failed") {
          this.resetRunState()
          this.status = "running"
          this.emitTransition()
          await this.runLoop(event)
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

        await this.runCurrentStepWithInput(input, event)
        if (this.status === "running") {
          await this.runLoop(event)
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
    this.currentStep = "init"
    this.pendingInteraction = undefined
    this.steps = this.prepareInstallationSteps()
    this.context = {
      ...this.context,
      plan: undefined,
      credentials: this.context.credentials ?? {},
      pendingCredentialIds: [],
      lastError: undefined
    }
  }

  /**
   * Executes steps sequentially until the flow either completes,
   * requests user interaction, or fails.
   */
  private async runLoop(initiater: InstallerEvent): Promise<void> {
    const steps = this.steps

    while (this.status === "running" && this.currentStep != "finalize") {
      const step = steps[this.currentStep]

      try {
        const result = await this.runStep(step)
        this.applyStepResult(result, initiater)
        if (this.status !== "running") {
          return
        }
      } catch (err: any) {
        this.failWithError(err, initiater)
        return
      }
    }

    if (this.status === "running" && this.currentStep == "finalize") {
      this.status = "completed"
      this.emitTransition(initiater)
    }
  }

  /**
   * Re-runs the current step with input provided after an interaction.
   */
  private async runCurrentStepWithInput(
    input: StepInput,
    initiater: InstallerEvent
  ): Promise<void> {
    const step = this.steps[this.currentStep]
    try {
      const result = await this.runStep(step, input)
      this.applyStepResult(result, initiater)
    } catch (err: any) {
      this.failWithError(err, initiater)
    }
  }

  /**
   * Applies the result of a step execution to the engine state.
   */
  private applyStepResult(
    result: FlowStepResult,
    initiater: InstallerEvent
  ): void {
    if (result.contextPatch) {
      this.context = { ...this.context, ...result.contextPatch }
    }
    if (result.data) {
      this.steps[this.currentStep].data = {
        ...(this.steps[this.currentStep].data || {}),
        ...result.data
      }
    }

    if (result.type === "done") {
      this.currentStep =
        STEPS[(STEPS.indexOf(this.currentStep) + 1) % STEPS.length]

      this.pendingInteraction = undefined
      this.emitTransition(initiater)
      return
    }

    this.pendingInteraction = result.interaction
    this.status = "awaitingInput"
    this.emitTransition(initiater)
  }

  /**
   * Updates the state to failed, using information from the error object.
   */
  private failWithError(err: any, initiater: InstallerEvent): void {
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
    this.emitTransition(initiater)
  }

  /**
   * Emits the current snapshot to all registered listeners.
   */
  private emitTransition(initiater?: InstallerEvent): void {
    const snapshot = this.getSnapshot()
    for (const listener of this.listeners) {
      listener(snapshot, initiater?.$id)
    }
  }

  /**
   * Checks whether a PROVIDE_INPUT event corresponds to the interaction
   * the engine is currently waiting for.
   */
  private isMatchingInteraction(stepId: InstallerStep, kind: string): boolean {
    return (
      this.pendingInteraction?.stepId === stepId &&
      this.pendingInteraction!.kind === kind
    )
  }

  wait(
    interaction: InteractionRequest,
    data?: Record<string, any>,
    patch?: Partial<InstallerContext>
  ): FlowStepResult {
    return {
      type: "wait",
      interaction,
      data,
      contextPatch: patch
    }
  }

  done(
    data?: Record<string, any>,
    patch?: Partial<InstallerContext>
  ): FlowStepResult {
    return {
      type: "done",
      data,
      contextPatch: patch
    }
  }
}
