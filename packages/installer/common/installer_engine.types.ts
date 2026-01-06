import type { InstallerMetadata } from "@type/metadata"
import {
  InstallerStep,
  type InstallerStepPayload
} from "../server/installer_engine"

/**
 * High-level execution status for the installer flow.
 */
export type InstallerStatus =
  | "idle"
  | "running"
  | "awaitingInput"
  | "completed"
  | "failed"

/**
 * Describes how the current run relates to existing installation state.
 */
export type InstallerMode = "install" | "upgrade" | "none"

/**
 * Distribution plan for a given run. The environment is responsible for
 * computing and updating this plan.
 */
export interface DistributionPlan {
  mode: InstallerMode
  installedVersion?: string
  targetVersion: string
  sourceId?: string
  targetMetadata: InstallerMetadata
  requiresConfirmation?: boolean
}

export interface Logger {
  log(level: string, message: string): void
}

export interface InstallerOptions {
  logger: Logger
  promptHandler?: PromptHandler
}
/**
 * Context shared across steps of the installer flow.
 * This structure is intended to be serializable.
 */
export interface InstallerContext {
  logger: Logger
  /**
   * Distribution plan resolved for this run, if available.
   */
  plan?: DistributionPlan

  /**
   * Resolved credential values indexed by credential id.
   */
  credentials: Record<string, string>
  /**
   * Credential ids that are known to be missing and may require user input.
   */
  pendingCredentialIds: string[]

  /**
   * UI-related state (for example, current form step index).
   * This is used so the web/CLI frontends can restore the wizard
   * after reconnecting.
   */
  uiState?: {
    /**
     * Index of the current form step in InstallerConfig.steps.
     */
    formStepIndex: number
  }

  /**
   * Information about the last error that caused the flow to fail.
   */
  lastError?: {
    message: string
    code?: string
    details?: unknown
  }
}

/**
 * Kind of interaction requested from the user by a step.
 */
export type InteractionKind =
  | "credentials"
  | "planDecision"
  | "form"
  | (string & {})

/**
 * Describes an interaction request that must be fulfilled before a step
 * can continue.
 */
export interface InteractionRequest {
  /**
   * Identifier of the step that is currently awaiting input.
   */
  stepId: InstallerStep

  /**
   * Type of interaction requested (for example "credentials" or "form").
   */
  kind: InteractionKind

  /**
   * Optional payload describing what the UI should display.
   * The structure is defined by the environment and step implementation.
   */
  payload?: unknown
}

/**
 * Input provided in response to an interaction request.
 */
export interface StepInput {
  kind: InteractionKind
  data: unknown
}

/**
 * Result returned from running a flow step.
 */
export type FlowStepResult =
  | {
      /**
       * Indicates that the step has completed.
       */
      type: "done"

      data?: Record<string, any>

      /**
       * Partial context update to apply after the step finishes.
       */
      contextPatch?: Partial<InstallerContext>
    }
  | {
      /**
       * Indicates that the step requires interaction and execution
       * should be suspended until input is provided.
       */
      type: "wait"

      data?: Record<string, any>
      /**
       * Interaction description sent to the UI layer.
       */
      interaction: InteractionRequest

      /**
       * Partial context update to apply before suspending.
       */
      contextPatch?: Partial<InstallerContext>
    }

/**
 * Abstraction for all side effects used by the installer engine.
 * Implementations decide how each step id is interpreted.
 */
export interface InstallerEnvironment {
  /**
   * Executes or progresses a single step in the flow.
   *
   * When called without input, the step may either complete or request
   * interaction. When called with input, the step should resume from the
   * last suspension point.
   */
  runStep(
    step: InstallerStep,
    context: InstallerContext,
    input?: StepInput
  ): Promise<FlowStepResult>
}

/**
 * Events that drive the installer flow.
 * UIs and backends send these into the engine.
 */
export type InstallerEvent = (
  | { type: "PROMPT"; data: PromptRequest }
  | { type: "START" }
  | { type: "CANCEL" }
  | { type: "RETRY" }
  | {
      type: "PROVIDE_INPUT"
      stepId: InstallerStep
      kind: InteractionKind
      data: unknown
    }
) & { $id?: string }

/**
 * Serialized representation of the engine state used for persistence.
 */
export interface SerializedInstallerState {
  /**
   * Schema version reserved for forwards compatibility.
   */
  schemaVersion: 1

  /**
   * Current execution status.
   */
  status: InstallerStatus

  /**
   * Snapshot of the shared installer context.
   */
  context: InstallerContext

  /**
   * Index of the currently active step within the flow definition.
   */
  currentStep: InstallerStep

  /**
   * Interaction request that is currently awaiting input, if any.
   */
  pendingInteraction?: InteractionRequest
}

/**
 * Snapshot that is emitted to listeners on every transition.
 */
export interface InstallerSnapshot {
  status: InstallerStatus
  context: InstallerContext
  steps: Record<InstallerStep, InstallerStepPayload>
  currentStep?: InstallerStep
  pendingInteraction?: InteractionRequest
}

/**
 * Listener invoked whenever the engine transitions to a new state.
 */
export type TransitionListener = (
  snapshot: InstallerSnapshot,
  traceId?: string
) => void
export type PromptHandler = (
  data: PromptRequest,
  snapshot: InstallerSnapshot
) => PromptResponse

export type PromptRequest = {
  key: string
  type: string
  message?: string
  usage?: string
}

export type PromptResponse = {
  value: string
}

export { InstallerStep }
