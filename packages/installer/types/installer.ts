import { Type, type Static } from "typebox"
import { StepConfigSchema } from "./forms"
import { CredentialConfigSchema } from "./credentials"
import { DistributionConfigSchema } from "./distribution"
import { BuildConfigSchema } from "./build"
import { InstallerHooksConfigSchema } from "./hooks"
import { UIConfigSchema } from "./ui"

/**
 * Top-level installer configuration.
 */
export const InstallerConfigSchema = Type.Object(
  {
    /**
     * Stable id for your product/installer (used in logs, cache dirs, etc.).
     */
    id: Type.Optional(Type.String()),

    engine: Type.Optional(Type.Enum(["katmer"])),

    /**
     * Version of the product this installer is built for (semver recommended).
     * This is also the "bundled version" the runtime can compare against
     * remote "latest" and "installed" versions.
     */
    version: Type.Optional(Type.String()),

    /**
     * Supported locales, e.g. ["en", "tr-TR"].
     */
    i18n: Type.Optional(
      Type.Object(
        {
          locales: Type.Optional(
            Type.Array(
              Type.Union([
                Type.Object({
                  code: Type.String(),
                  label: Type.String()
                }),
                Type.String()
              ])
            )
          ),
          messages: Type.Optional(Type.Record(Type.String(), Type.Unknown()))
        },
        { additionalProperties: false }
      )
    ),

    /**
     * Logical steps of the installer, reused by both Web UI and CLI.
     */
    steps: Type.Optional(Type.Array(StepConfigSchema)),

    /**
     * Global CLI behaviour.
     */
    cli: Type.Optional(
      Type.Object(
        {
          allowNonInteractive: Type.Optional(Type.Boolean()),
          defaults: Type.Optional(Type.Record(Type.String(), Type.Unknown()))
        },
        { additionalProperties: false }
      )
    ),

    /**
     * Reusable credential definitions.
     */
    credentials: Type.Optional(Type.Array(CredentialConfigSchema)),

    /**
     * Distribution / artifact config.
     */
    distribution: Type.Optional(DistributionConfigSchema),

    /**
     * Build-time bundling configuration.
     */
    build: Type.Optional(BuildConfigSchema),

    /**
     * Global hooks for build/install/update; per-step hooks are on StepConfig.
     */
    hooks: Type.Optional(InstallerHooksConfigSchema),

    /**
     * UI related configuration.
     */
    ui: Type.Optional(UIConfigSchema)
  },
  { additionalProperties: false }
)
export type InstallerConfig = Static<typeof InstallerConfigSchema>
