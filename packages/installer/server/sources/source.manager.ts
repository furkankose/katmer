import { SourceDriverId, SourceVersionMetadataConfig } from "@type/sources"

import { readFile } from "node:fs/promises"
import { InstallerEngine } from "../installer_engine"
import JSON5 from "json5"

export interface ResolvedSource {
  sourceId: string
  driver: SourceDriverId
  rootDir: string
}

export interface ResolvedSourceWithMetadata extends ResolvedSource {
  metadata: {
    version?: string
    migrations?: unknown
    raw?: unknown
  }
}

export abstract class SourceResolver<TSource = any> {
  abstract driver: SourceDriverId

  constructor(
    public engine: InstallerEngine,
    public source: TSource
  ) {}

  abstract resolve(): Promise<ResolvedSource>
}

export class SourceManager {
  private readonly resolvers = new Map<string, SourceResolver>()
  private order: string[] = []

  constructor() {}
  /**
   * Register a resolver.
   * If order is not explicitly set, registration order is used.
   */
  register(resolver: SourceResolver): this {
    this.resolvers.set(resolver.driver, resolver)

    if (!this.order.includes(resolver.driver)) {
      this.order.push(resolver.driver)
    }

    return this
  }

  /**
   * Resolve a credential value using fallback semantics.
   */
  async resolve(): Promise<ResolvedSourceWithMetadata> {
    const errors: Error[] = []

    for (const name of this.order) {
      const resolver = this.resolvers.get(name)!
      try {
        const resolved = await resolver.resolve()
        const metadata = (await this.resolveMetadata(resolver)) || {}

        return {
          ...resolved,
          metadata
        }
      } catch (err) {
        errors.push(err as Error)
      }
    }

    throw new Error(
      `Sources could not be resolved. Errors: ` +
        errors.map((e) => e.message).join(" | ")
    )
  }

  async resolveMetadata(resolver: SourceResolver) {
    const meta = resolver.source.metadata as
      | SourceVersionMetadataConfig
      | undefined
    const engine = resolver.engine
    if (!meta?.path) return undefined

    const rawText = await readFile(
      `${engine.workspaceRoot}/${meta.path}`,
      "utf8"
    )

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
    } catch {
      throw new Error(`Failed to parse ${meta.path}`)
    }

    return {
      raw: parsed,
      version: meta.versionField ? parsed?.[meta.versionField] : undefined,
      migrations:
        meta.migrationsField ? parsed?.[meta.migrationsField] : undefined
    }
  }
}
