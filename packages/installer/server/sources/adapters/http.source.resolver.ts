import { writeFile, mkdir } from "node:fs/promises"
import { normalize, resolve } from "node:path"
import type { HttpSourceConfig } from "@type/sources"
import { ResolvedSource, SourceResolver } from "../source.manager"

export class HttpSourceResolver extends SourceResolver<HttpSourceConfig> {
  readonly driver = "http"

  async resolve(): Promise<ResolvedSource> {
    const dest = normalize(resolve(this.engine.workspaceRoot, this.source.id))
    await mkdir(dest, { recursive: true })

    const res = await fetch(this.source.baseUrl, {
      headers: this.source.headers
    })

    if (!res.ok) {
      throw new Error(`HTTP source failed: ${res.status}`)
    }

    const buffer = Buffer.from(await res.arrayBuffer())
    await writeFile(`${dest}/payload`, buffer)

    return {
      sourceId: this.source.id,
      driver: this.driver,
      rootDir: dest
    }
  }
}
