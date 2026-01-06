import { Katmer } from "@katmer/core"
import type { InstallerEngine } from "../../../installer_engine"

export function buildSourcesTask(engine: InstallerEngine) {
  const config = engine.config
  const sources = config.distribution!.sources ?? []

  const tasks = [] as Katmer.Task[]
  for (const source of sources) {
    switch (source.driver) {
      case "http": {
        tasks.push({
          name: "resolve_source",
          targets: ["all"],
          http: {
            url: source.url,
            headers: source.headers
          }
        })
        break
      }
      case "file": {
        tasks.push({
          name: "resolve_source",
          targets: ["all"],
          copy: {
            src: source.root,
            dest: engine.workspaceRoot,
            force: true
          }
        })
        break
      }
      case "git": {
        tasks.push({
          name: "resolve_source",
          targets: ["all"],
          git: {
            repo: source.repo,
            version: source.ref,
            force: true,
            dest: engine.workspaceRoot
          }
        })
        break
      }
      default:
        throw new Error(`Unknown source driver: ${(source as any).driver}`)
    }
  }
  return tasks
}
