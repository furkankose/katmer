import { Type, type Static } from "typebox"
import { InstallerSourceConfigSchema } from "./sources"
import { InstalledDetectionConfigSchema } from "./installed"
import { VersioningStrategyConfigSchema } from "./versioning"

/**
 * Distribution / artifact configuration:
 * - does NOT define migrations
 * - just tells you where releases live and how to compare versions.
 */
export const DistributionConfigSchema = Type.Object(
  {
    sources: Type.Optional(
      Type.Array(InstallerSourceConfigSchema, {
        description:
          "Sources that can provide installer payloads and/or metadata."
      })
    ),
    installed: Type.Optional(InstalledDetectionConfigSchema),
    /**
     * How to compare installed/bundled/remote versions.
     */
    versioning: Type.Optional(VersioningStrategyConfigSchema)
  },
  { additionalProperties: false, default: {} }
)
export type DistributionConfig = Static<typeof DistributionConfigSchema>
