import { KatmerInstallerAdapter } from "./katmer/katmer.adapter"

export function resolveInstaller(name?: string) {
  if (!name || name === "katmer") {
    return new KatmerInstallerAdapter()
  }
  throw new Error(`Unknown installer: ${name}`)
}
