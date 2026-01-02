import type { InstallerContext } from "@common/installer_engine.types"
import { CredentialSource } from "@type/credentials"
import { InstallerEngine } from "../installer_engine"

export abstract class CredentialResolver<T extends CredentialSource = any> {
  abstract readonly driver: T["driver"]

  constructor(
    protected engine: InstallerEngine,
    protected source: T
  ) {}

  /**
   * Resolve a credential value by id.
   * Must return the secret value as string.
   * Must throw if credential does not exist or is inaccessible.
   */
  abstract resolve(id: string): Promise<string>
}

export class CredentialManager {
  private readonly resolvers = new Map<string, CredentialResolver>()
  private order: string[] = []

  /**
   * Register a resolver.
   * If order is not explicitly set, registration order is used.
   */
  register(resolver: CredentialResolver): this {
    this.resolvers.set(resolver.driver, resolver)

    if (!this.order.includes(resolver.driver)) {
      this.order.push(resolver.driver)
    }

    return this
  }

  /**
   * Resolve a credential value using fallback semantics.
   */
  async resolve(id: string): Promise<string> {
    const errors: Error[] = []

    for (const name of this.order) {
      const resolver = this.resolvers.get(name)!
      try {
        return await resolver.resolve(id)
      } catch (err) {
        errors.push(err as Error)
      }
    }

    throw new Error(
      `Credential "${id}" could not be resolved. Errors: ` +
        errors.map((e) => e.message).join(" | ")
    )
  }
}
