import { writeFileSync } from "node:fs"
import { resolve } from "node:path"

import { InstallerConfigSchema } from "../types/installer"
import { Compile } from "typebox/compile"
import { Value } from "typebox/value"

const outputPath = resolve(
  import.meta.dirname,
  "../schemas",
  "katmer-installer.schema.json"
)

// sanity-check the schema by compiling it
Compile(InstallerConfigSchema)

// ensure defaults / transforms are valid
Value.Check(InstallerConfigSchema, {})

const jsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://plusauth.dev/schemas/installer.json",
  title: "KatmerInstallConfig",
  ...InstallerConfigSchema
}

writeFileSync(outputPath, JSON.stringify(jsonSchema, null, 2), "utf-8")

console.log(`✓ InstallerConfig JSON Schema generated at:\n${outputPath}`)
