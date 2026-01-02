// sources/index.ts
import { SourceManager } from "./source.manager"

import { FileSourceResolver } from "./adapters/file.source.resolver"
import { GitSourceResolver } from "./adapters/git.source.resolver"
import { HttpSourceResolver } from "./adapters/http.source.resolver"
import { S3SourceResolver } from "./adapters/s3.source.resolver"
import { InstallerConfig } from "@type/installer"
import { InstallerEngine } from "../installer_engine"
import { safeImportDynamic } from "@common/utils/import.utils"

export async function createSourceManager(
  engine: InstallerEngine,
  options: InstallerConfig
) {
  const registry = new SourceManager()
  for (const source of options.distribution?.sources ?? []) {
    switch (source.driver) {
      case "file":
        registry.register(new FileSourceResolver(engine, source as any))
        break
      case "git":
        registry.register(new GitSourceResolver(engine, source as any))
        break
      case "http":
        registry.register(new HttpSourceResolver(engine, source as any))
        break
      case "s3":
        registry.register(new S3SourceResolver(engine, source as any))
        break
      case "custom":
        const mod = await safeImportDynamic("source adapter", source.path)
        registry.register(new mod(engine, source))
    }
  }

  return registry
}
