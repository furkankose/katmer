import type {
  FlowStepDefinition,
  FlowStepResult,
  StepInput
} from "@common/installer_engine.types"
import { InstallerEngine } from "../../installer_engine"

export class KatmerInstallerEngine extends InstallerEngine {
  async runStep(
    step: FlowStepDefinition,
    input?: StepInput
  ): Promise<FlowStepResult> {
    switch (step.id) {
      case "resolveCredentials": {
        if (!input) {
          const configured = Object.keys(this.context.config.credentials ?? {})
          const already = Object.keys(this.context.credentials ?? {})
          const missing_ids =
            this.context.pendingCredentialIds.length > 0 ?
              this.context.pendingCredentialIds
            : configured.filter((id) => !already.includes(id))

          if (missing_ids.length === 0) {
            return this.done()
          }

          return this.wait({
            stepId: step.id,
            kind: "credentials",
            payload: { missing_ids }
          })
        }

        if (input.kind === "credentials" && input.data) {
          const credentials = input.data as Record<string, string>
          return this.done({
            credentials: { ...this.context.credentials, ...credentials },
            pendingCredentialIds: []
          })
        }

        return this.done()
      }

      case "planDistribution": {
        const version = this.context.config.version ?? "0.0.0"
        const source = this.context.config.distribution?.sources?.[0]

        const plan = {
          mode: "install" as const,
          installedVersion: undefined,
          targetVersion: version,
          sourceId: source?.id,
          targetMetadata: {
            version
          } as any,
          requiresConfirmation: false
        }

        return this.done({ plan })
      }

      case "preparePayload": {
        // placeholder for fetching/extracting files
        return this.done()
      }

      case "collectInput": {
        const stepsCount = this.context.config.steps?.length ?? 0

        this.context.logger.log(
          "info",
          "Collecting input for " + stepsCount + " steps"
        )
        // first entry: ask UI to render all steps
        if (!input) {
          return this.wait({
            stepId: step.id,
            kind: "form",
            payload: {
              steps: this.context.config.steps ?? []
            }
          })
        }

        if (
          input.kind === "form" &&
          input.data &&
          typeof input.data === "object"
        ) {
          const { values, stepIndex } = input.data as {
            values: Record<string, unknown>
            stepIndex: number
          }

          const mergedValues: Record<string, unknown> = {
            ...(this.context.values ?? {}),
            ...(values ?? {})
          }

          const index = typeof stepIndex === "number" ? stepIndex : 0
          const isLast = stepsCount > 0 && index >= stepsCount - 1

          if (!isLast) {
            const nextIndex = index + 1
            return this.wait(
              {
                stepId: step.id,
                kind: "form",
                payload: {
                  steps: this.context.config.steps ?? []
                }
              },
              {
                values: mergedValues,
                uiState: {
                  formStepIndex: nextIndex
                }
              }
            )
          }

          // last step -> finish collectInput
          return this.done({
            values: mergedValues,
            uiState: undefined
          })
        }

        return this.done()
      }

      case "executeInstall": {
        this.context.logger.log("info", "Executing install steps")
        console.log(this.context)
        // placeholder for runtime execution (katmer / entrypoint)
        return this.done()
      }

      case "executeMigrations": {
        // placeholder for migrations
        return this.done()
      }

      case "finalize": {
        // placeholder for writing installed version, cleanup, etc.
        return this.done()
      }

      default: {
        // custom step ids fall back to a no-op until implemented
        return this.done()
      }
    }
  }
}
