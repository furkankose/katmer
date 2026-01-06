import type { InstallerEngine } from "../../../installer_engine"

export function buildInstallerProbeTask(engine: InstallerEngine) {
  const config = engine.config.distribution?.installed
  if (!config || !config.probes) return []

  for (const probe of config.probes) {
    switch (probe.driver) {
      case "http": {
        break
      }
      case "file": {
        break
      }
    }
  }
}
