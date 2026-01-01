import { writeFile, mkdir } from "node:fs/promises"
import { normalize, resolve } from "node:path"
import type { HttpSourceConfig } from "@type/sources"
import type { ResolvedSource } from "./source.resolver"
import type { CredentialResolver } from "../credentials/credential.resolver"

export async function resolveHttpSource(
  source: HttpSourceConfig,
  workspaceDir: string,
  credentialResolver: CredentialResolver
): Promise<ResolvedSource> {
  const dest = normalize(resolve(workspaceDir, source.id))
  await mkdir(dest, { recursive: true })

  // TODO: auth, dir
  const res = await fetch(source.baseUrl, {
    headers: source.headers
  })

  if (!res.ok) {
    throw new Error(`HTTP source failed: ${res.status}`)
  }

  const buffer = Buffer.from(await res.arrayBuffer())
  await writeFile(`${dest}/payload`, buffer)

  return {
    sourceId: source.id,
    driver: "http",
    rootDir: dest
  }
}
