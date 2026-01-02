import { KatmerInstallerEngine } from "./katmer/katmer.adapter"
import { InstallerConfig } from "@type/installer"
import type { FlowDefinition, Logger } from "@common/installer_engine.types"

export function resolveInstaller(
  config: InstallerConfig,
  flow: FlowDefinition,
  logger: Logger
) {
  if (!config.engine || config.engine === "katmer") {
    return new KatmerInstallerEngine(config, flow, logger)
  }
  throw new Error(`Unknown installer: ${name}`)
}
