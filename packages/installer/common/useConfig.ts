import { InstallerConfigSchema, type InstallerConfig } from "../types/installer"
import { Value } from "typebox/value"

let config: InstallerConfig
try {
  const mod: any = await import("../config/schema")
  config = mod.default ? mod.default : mod.config || mod
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
} catch (e) {
  throw new Error(
    "Failed to load config. Make sure the config file is valid, accessible and has named export 'config' or a default export."
  )
}
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
