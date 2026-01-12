import { InstallerConfigSchema, type InstallerConfig } from "../types/installer"
import { Value } from "typebox/value"

let $CFG: Required<InstallerConfig>
try {
  const mod: any = await import("../config/schema")
  $CFG = Value.Default(
    InstallerConfigSchema,
    mod.default ? mod.default : mod.config || mod
  ) as Required<InstallerConfig>

  $CFG.steps.configure = [
    ...($CFG.steps.configure ?? []),
    ...(!$CFG.ui?.hideSummary ?
      [
        {
          name: "$summary",
          label: "summary"
        }
      ]
    : [])
  ]

  $CFG.distribution.sources?.forEach((source) => {
    if (source.auth) {
      for (const key of Object.keys(source.auth)) {
        if (key.toLowerCase().endsWith("credentialid")) {
          const kid = (source.auth as any)[key]
          const existing = $CFG.credentials!.find((cred) => cred.id === kid)
          if (!existing) {
            $CFG.credentials.push({ id: kid })
          }
        }
      }
    }
  })
} catch (e) {
  throw new Error(
    "Failed to load config. Make sure the config file is valid, accessible and has named export 'config' or a default export."
  )
}
const errors = Value.Errors(InstallerConfigSchema, $CFG)
if (errors.length) {
  const err = new Error(`Invalid config`) as any
  err.errors = errors
    .map((error) => {
      return `${error.message} at ${error.instancePath || "root"}: ${JSON.stringify(error.params || {})}`
    })
    .join("\n")
  throw err
}

export default $CFG
