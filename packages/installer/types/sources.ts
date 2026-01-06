import { Type, type Static } from "typebox"
import { AuthConfigSchema } from "./credentials"

export const BuiltinSourceDriverSchema = Type.Union([
  Type.Literal("file"),
  Type.Literal("http"),
  Type.Literal("git"),
  Type.Literal("s3")
])
export type BuiltinSourceDriver = Static<typeof BuiltinSourceDriverSchema>

/**
 * Driver id for a source.
 * Built-ins + custom plugin names.
 *
 * Note: the original type allows arbitrary string values via `(string & {})`,
 * so this is modeled as a string with documentation of built-ins.
 */
export const SourceDriverIdSchema = Type.String({
  description:
    'Source driver id. Built-ins: "file" | "http" | "git" | "s3" (plus custom plugin ids).'
})
export type SourceDriverId = Static<typeof SourceDriverIdSchema>

export const SourceVersionMetadataConfigSchema = Type.Object(
  {
    /**
     * Path/URL to a metadata file describing a release.
     */
    path: Type.Optional(Type.String()),
    /**
     * Data format of metadata.
     */
    format: Type.Optional(
      Type.String({
        description: 'Known values: "json", "yaml", "toml", or a custom id.'
      })
    ),
    /**
     * Dot-path / JSON pointer to the version string inside metadata.
     */
    versionField: Type.Optional(Type.String()),
    /**
     * Optional dot-path / JSON pointer to migrations array in metadata.
     */
    migrationsField: Type.Optional(Type.String())
  },
  { additionalProperties: false }
)
export type SourceVersionMetadataConfig = Static<
  typeof SourceVersionMetadataConfigSchema
>

export const SourceUpdatePolicySchema = Type.Object(
  {
    /**
     * Overall behaviour.
     */
    mode: Type.Optional(
      Type.Union([
        Type.Literal("never"),
        Type.Literal("check"),
        Type.Literal("check-and-ask"),
        Type.Literal("force-latest")
      ])
    ),
    /**
     * How to read latest version info (and migrations pointer) from this source.
     */
    metadata: Type.Optional(SourceVersionMetadataConfigSchema)
  },
  { additionalProperties: false }
)
export type SourceUpdatePolicy = Static<typeof SourceUpdatePolicySchema>

/**
 * Common fields shared by all sources.
 */
export const SourceConfigBase = {
  id: Type.String(),
  label: Type.Optional(Type.String()),
  disabled: Type.Optional(Type.Boolean()),
  /**
   * Lower number = higher priority when resolving sources.
   */
  priority: Type.Optional(Type.Number()),
  /**
   * Generic update policy applicable to this source.
   */
  update: Type.Optional(SourceUpdatePolicySchema),
  /**
   * Credentials / auth for this source.
   */
  auth: Type.Optional(AuthConfigSchema),
  /**
   * Driver-specific free-form options (mainly for plugins).
   */
  options: Type.Optional(Type.Record(Type.String(), Type.Unknown()))
}

export const FileSourceConfigSchema = Type.Object(
  {
    ...SourceConfigBase,
    driver: Type.Literal("file"),
    /**
     * Root directory on disk where payload lives (e.g. build artifacts).
     */
    root: Type.String()
  },
  { additionalProperties: false }
)
export type FileSourceConfig = Static<typeof FileSourceConfigSchema>

export const HttpSourceConfigSchema = Type.Object(
  {
    ...SourceConfigBase,
    driver: Type.Literal("http"),
    /**
     * Base URL for artifacts & metadata.
     */
    url: Type.String(),
    headers: Type.Optional(Type.Record(Type.String(), Type.String()))
  },
  { additionalProperties: false }
)
export type HttpSourceConfig = Static<typeof HttpSourceConfigSchema>

export const GitSourceConfigSchema = Type.Object(
  {
    ...SourceConfigBase,
    driver: Type.Literal("git"),
    repo: Type.String(),
    ref: Type.Optional(Type.String()),
    /**
     * Optional path inside repo where installer files live.
     */
    path: Type.Optional(Type.String())
  },
  { additionalProperties: false }
)
export type GitSourceConfig = Static<typeof GitSourceConfigSchema>

export const InstallerSourceConfigSchema = Type.Union(
  [FileSourceConfigSchema, HttpSourceConfigSchema, GitSourceConfigSchema],
  {
    description: "Sources that can provide installer payloads and/or metadata."
  }
)
export type InstallerSourceConfig = Static<typeof InstallerSourceConfigSchema>
