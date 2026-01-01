import type { CliRuntimeOptions } from "@type/cli"
import { InstallerEngine } from "@common/engine/installer_engine"
import { DEFAULT_FLOW } from "@common/engine/installer_engine.types"
import type { InstallerConfig } from "@type/installer"
import { resolveInstaller } from "../installers/resolve_installer"

export async function start_cli_runner(
  installerConfig: InstallerConfig,
  opts: CliRuntimeOptions
): Promise<number> {
  const engine = new InstallerEngine(
    installerConfig,
    resolveInstaller(installerConfig.engine),
    DEFAULT_FLOW,
    {
      log(level: string, message: string) {
        console.log(message)
      }
    }
  )

  engine.onTransition(({ status, context }) => {
    if (opts.logging === "stdout" || opts.logging === "both") {
      if (status === "failed") {
        console.error("installer failed:", context.lastError)
      } else if (status === "completed") {
        console.log("installer completed successfully")
      }
    }
  })

  await engine.send({ type: "START" })

  const final = engine.getSnapshot()
  return final.status === "completed" ? 0 : 1
}
