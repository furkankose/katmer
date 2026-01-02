import { CredentialManager, CredentialResolver } from "./credential.resolver"
import { EnvCredentialResolver } from "./adapters/env.credential.resolver"
import { FileCredentialResolver } from "./adapters/file.credential.resolver"
import { InstallerConfig } from "@type/installer"
import { safeImportDynamic } from "@common/utils/import.utils"
import { InstallerEngine } from "../installer_engine"

export async function createCredentialManager(
  engine: InstallerEngine,
  options: InstallerConfig
) {
  const registry = new CredentialManager()

  for (const credential of options.credentialSources ?? []) {
    switch (credential.driver) {
      case "env":
        registry.register(new EnvCredentialResolver(engine, credential as any))
        break
      case "file":
        registry.register(new FileCredentialResolver(engine, credential as any))
        break
      case "custom":
        const mod = await safeImportDynamic(
          "credential adapter",
          credential.path
        )
        registry.register(new mod(engine, credential))
    }
  }

  return registry
}
