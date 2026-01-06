import { KatmerInstallerEngine } from "./katmer/katmer.adapter"
import { InstallerConfig } from "@type/installer"
import type { InstallerOptions } from "@common/installer_engine.types"

export function resolveInstaller(
  config: InstallerConfig,
  options: InstallerOptions
) {
  if (!config.engine || config.engine === "katmer") {
    return new KatmerInstallerEngine(config, options)
  }
  throw new Error(`Unknown installer: ${config.engine}`)
}
