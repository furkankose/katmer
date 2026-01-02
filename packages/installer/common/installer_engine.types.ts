// installer-flow.types.ts
import type { FieldPath } from "@type/core"
import type { InstallerConfig } from "@type/installer"
import type { InstallerMetadata } from "@type/metadata"

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
 * Identifiers reserved for built-in steps that many installers use.
 * Custom steps can extend this with their own identifiers.
 */
export type BuiltinFlowStepId =
  | "resolveCredentials"
  | "planDistribution"
  | "preparePayload"
  | "collectInput"
  | "executeInstall"
  | "executeMigrations"
  | "finalize"

/**
 * Identifier for a flow step.
 * Built-in identifiers are listed in BuiltinFlowStepId; installations can
 * introduce arbitrary custom step ids as well.
 */
export type FlowStepId = BuiltinFlowStepId | (string & {})

/**
 * A single step in the installer flow definition.
 */
export interface FlowStepDefinition {
  /**
   * Unique identifier for the step within the flow.
   */
  id: FlowStepId

  /**
   * Human-readable label used in logs or UI.
   */
  label?: string

  /**
   * Optional description describing the purpose of the step.
   */
  description?: string

  /**
   * Boolean-like expression that can be used by the environment to decide
   * whether this step should run. The interpretation of this expression
   * is environment-specific.
   */
  when?: string
}

/**
 * Complete definition of the installer flow.
 * Steps are executed sequentially by default.
 */
export interface FlowDefinition {
  steps: FlowStepDefinition[]
}

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

/**
 * Context shared across steps of the installer flow.
 * This structure is intended to be serializable.
 */
export interface InstallerContext {
  logger: Logger
  /**
   * Static installer configuration loaded at startup.
   */
  config: InstallerConfig

  /**
   * Distribution plan resolved for this run, if available.
   */
  plan?: DistributionPlan

  /**
   * Accumulated answers for configuration fields.
   * Keys are field paths such as "app.domain".
   */
  values: Record<FieldPath, unknown>

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
  stepId: FlowStepId

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
    step: FlowStepDefinition,
    context: InstallerContext,
    input?: StepInput
  ): Promise<FlowStepResult>
}

/**
 * Events that drive the installer flow.
 * UIs and backends send these into the engine.
 */
export type InstallerEvent =
  | { type: "START" }
  | { type: "CANCEL" }
  | { type: "RETRY" }
  | {
      type: "PROVIDE_INPUT"
      stepId: FlowStepId
      kind: InteractionKind
      data: unknown
    }

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
  currentStepIndex: number

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
  currentStepIndex: number
  currentStep?: FlowStepDefinition
  pendingInteraction?: InteractionRequest
}

/**
 * Listener invoked whenever the engine transitions to a new state.
 */
export type TransitionListener = (snapshot: InstallerSnapshot) => void

/**
 * Default sequential flow covering a common installer lifecycle.
 * Environments can implement handlers for each built-in step id, or
 * provide their own FlowDefinition when constructing the engine.
 */
export const DEFAULT_FLOW: FlowDefinition = {
  steps: [
    {
      id: "resolveCredentials",
      label: "Resolve credentials"
    },
    {
      id: "planDistribution",
      label: "Plan distribution"
    },
    {
      id: "preparePayload",
      label: "Prepare payload"
    },
    {
      id: "collectInput",
      label: "Collect configuration"
    },
    {
      id: "executeInstall",
      label: "Execute installation"
    },
    {
      id: "executeMigrations",
      label: "Execute migrations"
    },
    {
      id: "finalize",
      label: "Finalize"
    }
  ]
}
