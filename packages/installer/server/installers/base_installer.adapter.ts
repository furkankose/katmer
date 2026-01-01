import type {
  FlowStepDefinition,
  FlowStepResult,
  InstallerContext,
  InteractionRequest,
  StepInput
} from "@common/engine/installer_engine.types"

export abstract class BaseInstallerAdapter {
  abstract runStep(
    step: FlowStepDefinition,
    context: InstallerContext,
    input?: StepInput
  ): Promise<FlowStepResult>

  wait(
    interaction: InteractionRequest,
    patch?: Partial<InstallerContext>
  ): FlowStepResult {
    return {
      type: "wait",
      interaction,
      contextPatch: patch
    }
  }

  done(patch?: Partial<InstallerContext>): FlowStepResult {
    return {
      type: "done",
      contextPatch: patch
    }
  }
}
