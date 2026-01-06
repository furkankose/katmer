import {
  type FlowStepResult,
  type StepInput,
  InstallerOptions
} from "@common/installer_engine.types"
import {
  InstallerEngine,
  type InstallerStepPayload
} from "../../installer_engine"
import { KatmerCore } from "@katmer/core"
import type { InstallerConfig } from "@type/installer"

function katmerLogger(logfn: (...args: any[]) => void, bindings?: any) {
  return {
    child: (bindings: any) => katmerLogger(logfn, bindings),
    debug: logfn.bind(null, "debug"),
    error: logfn.bind(null, "error"),
    fatal: logfn.bind(null, "fatal"),
    info: logfn.bind(null, "info"),
    trace: logfn.bind(null, "trace"),
    warn: logfn.bind(null, "warn")
  }
}
export class KatmerInstallerEngine extends InstallerEngine {
  katmer: KatmerCore

  constructor(
    public config: InstallerConfig,
    options: InstallerOptions
  ) {
    super(config, options)
    this.katmer = new KatmerCore({ cwd: this.workspaceRoot, target: [] })
    this.katmer.logger = katmerLogger(options.logger.log, {})
  }

  async runStep(
    step: InstallerStepPayload,
    input?: StepInput
  ): Promise<FlowStepResult> {
    switch (step.stepId) {
      case "init": {
        if (input) {
          const { values } = (input.data || {}) as {
            values: { targets: any[] }
          }
          if (values.targets) {
            await this.katmer.loadConfig({
              targets: {
                hosts: values.targets.reduce<Record<string, any>>(
                  (acc, target, ind) => ({
                    ...acc,
                    [target.id || target.hostname || ind]: target
                  }),
                  {}
                )
              }
            })
            await this.katmer.check()
            return this.done({
              targets: values.targets
            })
          }
        }
        if (!step.data.targets) {
          return this.wait({
            stepId: step.stepId,
            kind: "credentials",
            payload: { targets: [] }
          })
        }

        return this.done()
      }

      case "prepare": {
        this.context.logger.log("info", "Setting up installation files")

        return this.done()
      }

      case "plan": {
        const version = this.config.version ?? "0.0.0"
        const source = this.config.distribution?.sources?.[0]

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

      case "configure": {
        const stepsCount = this.uiStepCount

        this.context.logger.log(
          "info",
          "Collecting input for " + stepsCount + " steps"
        )
        // first entry: ask UI to render all steps
        if (!input) {
          return this.wait({
            stepId: step.stepId,
            kind: "form",
            payload: {
              steps: this.config.steps
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
            ...(step.data ?? {}),
            ...(values ?? {})
          }

          const index = typeof stepIndex === "number" ? stepIndex : 0
          const isLast = stepsCount > 0 && index >= stepsCount - 1

          if (!isLast) {
            const nextIndex = index + 1
            return this.wait(
              {
                stepId: step.stepId,
                kind: "form",
                payload: {
                  steps: this.config.steps
                }
              },
              mergedValues,
              {
                uiState: {
                  formStepIndex: nextIndex
                }
              }
            )
          }

          // last step -> finish configure
          return this.done(mergedValues, {
            uiState: undefined
          })
        }

        return this.done()
      }

      case "install": {
        console.log(this.context)
        // placeholder for runtime execution (katmer / entrypoint)
        return this.done()
      }

      case "migrate": {
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
