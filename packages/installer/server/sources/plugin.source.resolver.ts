import type { PluginSourceConfig } from "@type/sources"
import type { ResolvedSource } from "./source.resolver"
import type { CredentialResolver } from "../credentials/credential.resolver"

type SourcePlugin = {
  driver: string
  resolve(
    source: PluginSourceConfig,
    workspaceDir: string
  ): Promise<ResolvedSource>
}

const sourcePlugins = new Map<string, SourcePlugin>()

export function registerSourcePlugin(plugin: SourcePlugin) {
  sourcePlugins.set(plugin.driver, plugin)
}

export async function resolvePluginSource(
  source: PluginSourceConfig,
  workspaceDir: string,
  credentialResolver: CredentialResolver
): Promise<ResolvedSource> {
  const plugin = sourcePlugins.get(source.driver)

  if (!plugin) {
    throw new Error(`Unknown source driver: ${source.driver}`)
  }

  return plugin.resolve(source, workspaceDir)
}
