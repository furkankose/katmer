import { readFile } from "node:fs/promises"
import JSON5 from "json5"

import type {
  InstallerSourceConfig,
  SourceConfigBase,
  SourceDriverId
} from "@type/sources"

import type { CredentialResolver } from "../credentials/credential.resolver"

import { resolveFileSource } from "./file.source.resolver"
import { resolveHttpSource } from "./http.source.resolver"
import { resolveGitSource } from "./git.source.resolver"
import { resolvePluginSource } from "./plugin.source.resolver"
import { resolveS3Source } from "./s3.source.resolver"

export type ResolvedSource = {
  sourceId: string
  driver: SourceDriverId
  rootDir: string // local directory with fetched payload
}

export type ResolvedSourceWithMetadata = ResolvedSource & {
  metadata: {
    version?: string
    migrations?: unknown
    raw?: unknown
  }
}

async function resolveSource(
  source: InstallerSourceConfig,
  workspaceDir: string,
  credentialResolver: CredentialResolver
): Promise<ResolvedSource> {
  switch (source.driver) {
    case "file":
      return resolveFileSource(source as any, workspaceDir, credentialResolver)
    case "http":
      return resolveHttpSource(source as any, workspaceDir, credentialResolver)
    case "git":
      return resolveGitSource(source as any, workspaceDir, credentialResolver)
    case "s3":
      return resolveS3Source(source as any, workspaceDir, credentialResolver)
    default:
      return resolvePluginSource(source, workspaceDir, credentialResolver)
  }
}

export async function resolveSources(
  sources: InstallerSourceConfig[],
  workspaceDir: string,
  credentialResolver: CredentialResolver
): Promise<ResolvedSource[]> {
  const enabled = sources.filter((s) => !s.disabled)

  const ordered = [...enabled].sort(
    (a, b) => (a.priority ?? 0) - (b.priority ?? 0)
  )

  const results: ResolvedSourceWithMetadata[] = []

  for (const source of ordered) {
    const result = await resolveSource(source, workspaceDir, credentialResolver)

    results.push({
      ...result,
      metadata: (await resolveSourceMetadata(source, result.rootDir)) || {}
    })
  }

  return results
}

export async function resolveSourceMetadata(
  source: SourceConfigBase,
  rootDir: string
): Promise<ResolvedSourceWithMetadata["metadata"] | undefined> {
  const meta = source.update?.metadata
  if (!meta?.path) return undefined

  const rawText = await readFile(`${rootDir}/${meta.path}`, "utf8")
  let parsed: any

  try {
    switch (meta.format) {
      case "json":
      case "jsonc":
      case "json5":
        parsed = JSON5.parse(rawText)
        break
      case "yaml":
      case "yml":
        parsed = await Bun.YAML.parse(rawText)
        break
      default:
        parsed = rawText
    }
  } catch (e) {
    throw new Error(`Failed to parse ${meta.path}`)
  }

  return {
    raw: parsed,
    version: meta.versionField ? parsed?.[meta.versionField] : undefined,
    migrations:
      meta.migrationsField ? parsed?.[meta.migrationsField] : undefined
  }
}
