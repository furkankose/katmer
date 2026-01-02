import { InstallerConfigSchema, type InstallerConfig } from "../types/installer"
import { Value } from "typebox/value"
import { safeImportDynamic } from "@common/utils/import.utils"

const config: InstallerConfig = await safeImportDynamic(
  "config",
  "../config/schema",
  "config"
)
config.steps = [
  ...(config.steps ?? []),
  ...(!config.ui?.hideSummary ?
    [
      {
        name: "$summary",
        label: "summary"
      }
    ]
  : [])
]

const errors = Value.Errors(InstallerConfigSchema, config)
if (errors.length) {
  const err = new Error(`Invalid config`) as any
  err.errors = errors
    .map((error) => {
      return `${error.message} at ${error.instancePath || "root"}: ${JSON.stringify(error.params || {})}`
    })
    .join("\n")
  throw err
}
export function useConfig(): InstallerConfig {
  return Object.freeze(config)
}
