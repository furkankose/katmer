import { Type, type Static } from "typebox"
import { AuthConfigSchema } from "./credentials"

/**
 * Installed probe driver identifier.
 *
 * Note: the original type allows arbitrary string values via `(string & {})`,
 * so this is modeled as a string with documentation of known values.
 */
export const InstalledProbeDriverSchema = Type.String({
  description:
    'Installed probe driver. Known values: "file", "http", "command", "docker".'
})
export type InstalledProbeDriver = Static<typeof InstalledProbeDriverSchema>

export const InstalledProbeBaseSchema = Type.Object(
  {
    id: Type.String(),
    driver: InstalledProbeDriverSchema,
    label: Type.Optional(Type.String()),
    disabled: Type.Optional(Type.Boolean()),
    priority: Type.Optional(Type.Number()),
    options: Type.Optional(Type.Record(Type.String(), Type.Unknown()))
  },
  { additionalProperties: true }
)
export type InstalledProbeBase = Static<typeof InstalledProbeBaseSchema>

export const FileInstalledProbeConfigSchema = Type.Intersect(
  [
    InstalledProbeBaseSchema,
    Type.Object(
      {
        driver: Type.Literal("file"),
        path: Type.String(),
        format: Type.Optional(
          Type.String({
            description:
              'Known values: "text", "json", "yaml", "toml", or a custom format id.'
          })
        ),
        versionField: Type.Optional(Type.String())
      },
      { additionalProperties: false }
    )
  ],
  { additionalProperties: false }
)
export type FileInstalledProbeConfig = Static<
  typeof FileInstalledProbeConfigSchema
>

export const HttpInstalledProbeConfigSchema = Type.Intersect(
  [
    InstalledProbeBaseSchema,
    Type.Object(
      {
        driver: Type.Literal("http"),
        url: Type.String(),
        method: Type.Optional(Type.String()),
        headers: Type.Optional(Type.Record(Type.String(), Type.String())),
        body: Type.Optional(Type.Unknown()),
        format: Type.Optional(
          Type.String({
            description: 'Known values: "json", "text", or a custom id.'
          })
        ),
        versionField: Type.Optional(Type.String()),
        auth: Type.Optional(AuthConfigSchema)
      },
      { additionalProperties: false }
    )
  ],
  { additionalProperties: false }
)
export type HttpInstalledProbeConfig = Static<
  typeof HttpInstalledProbeConfigSchema
>

export const CommandInstalledProbeParseSchema = Type.Object(
  {
    kind: Type.Optional(
      Type.String({
        description:
          'Known values: "regex", "jsonField", "line", or a custom id.'
      })
    ),
    /**
     * For kind = "regex". First capture group is used as version.
     */
    pattern: Type.Optional(Type.String()),
    /**
     * For kind = "jsonField".
     */
    field: Type.Optional(Type.String()),
    /**
     * For kind = "line" (0-based).
     */
    line: Type.Optional(Type.Number())
  },
  { additionalProperties: false }
)

export const CommandInstalledProbeConfigSchema = Type.Intersect(
  [
    InstalledProbeBaseSchema,
    Type.Object(
      {
        driver: Type.Literal("command"),
        run: Type.Union([Type.String(), Type.Array(Type.String())]),
        cwd: Type.Optional(Type.String()),
        env: Type.Optional(Type.Record(Type.String(), Type.String())),
        timeoutSeconds: Type.Optional(Type.Number()),
        parse: Type.Optional(CommandInstalledProbeParseSchema)
      },
      { additionalProperties: false }
    )
  ],
  { additionalProperties: false }
)
export type CommandInstalledProbeConfig = Static<
  typeof CommandInstalledProbeConfigSchema
>

export const DockerInstalledProbeConfigSchema = Type.Intersect(
  [
    InstalledProbeBaseSchema,
    Type.Object(
      {
        driver: Type.Literal("docker"),
        image: Type.Optional(Type.String()),
        containerName: Type.Optional(Type.String()),
        versionSource: Type.Optional(
          Type.String({
            description:
              'Known values: "imageTag", "label", "env", "command", or a custom id.'
          })
        ),
        labelKey: Type.Optional(Type.String()),
        envKey: Type.Optional(Type.String()),
        command: Type.Optional(
          Type.Union([Type.String(), Type.Array(Type.String())])
        ),
        auth: Type.Optional(AuthConfigSchema)
      },
      { additionalProperties: false }
    )
  ],
  { additionalProperties: false }
)
export type DockerInstalledProbeConfig = Static<
  typeof DockerInstalledProbeConfigSchema
>

export const CustomInstalledProbeConfigSchema = Type.Intersect(
  [InstalledProbeBaseSchema, Type.Record(Type.String(), Type.Unknown())],
  { additionalProperties: true }
)

export const InstalledProbeConfigSchema = Type.Union(
  [
    FileInstalledProbeConfigSchema,
    HttpInstalledProbeConfigSchema,
    CommandInstalledProbeConfigSchema,
    DockerInstalledProbeConfigSchema,
    CustomInstalledProbeConfigSchema
  ],
  { description: "Union of supported installed-version probes." }
)
export type InstalledProbeConfig = Static<typeof InstalledProbeConfigSchema>

/**
 * Flexible installed-version detection.
 * You can define many probes and choose one as default.
 */
export const InstalledDetectionConfigSchema = Type.Object(
  {
    probes: Type.Optional(Type.Array(InstalledProbeConfigSchema)),
    defaultProbeId: Type.Optional(
      Type.String({
        description: "Id of the preferred probe; others can be fallback."
      })
    )
  },
  {
    description: "How to detect currently installed version on the target.",
    additionalProperties: false
  }
)
export type InstalledDetectionConfig = Static<
  typeof InstalledDetectionConfigSchema
>
