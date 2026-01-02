import { cp, mkdir } from "node:fs/promises"
import { normalize, resolve } from "node:path"
import type { FileSourceConfig } from "@type/sources"
import { ResolvedSource, SourceResolver } from "../source.manager"

export class FileSourceResolver extends SourceResolver<FileSourceConfig> {
  readonly driver = "file"

  async resolve(): Promise<ResolvedSource> {
    const dest = normalize(resolve(this.engine.workspaceRoot, this.source.id))

    await mkdir(dest, { recursive: true })
    await cp(this.source.root, dest, { recursive: true })

    return {
      sourceId: this.source.id,
      driver: this.driver,
      rootDir: dest
    }
  }
}
