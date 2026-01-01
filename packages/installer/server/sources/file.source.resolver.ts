import { cp, mkdir } from "node:fs/promises"
import { normalize, resolve } from "node:path"
import type { FileSourceConfig } from "@type/sources"
import type { ResolvedSource } from "./source.resolver"
import { resolveSourceMetadata } from "./source.resolver"
import type { CredentialResolver } from "../credentials/credential.resolver"

export async function resolveFileSource(
  source: FileSourceConfig,
  workspaceDir: string,
  credentialResolver: CredentialResolver
): Promise<ResolvedSource> {
  const dest = normalize(resolve(workspaceDir, source.id))

  await mkdir(dest, { recursive: true })
  await cp(source.root, dest, { recursive: true })

  return {
    sourceId: source.id,
    driver: "file",
    rootDir: dest
  }
}
