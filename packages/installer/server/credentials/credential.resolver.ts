export interface CredentialResolver {
  /**
   * Resolve a credential value by id.
   * Must return the secret value as string.
   * Must throw if credential does not exist or is inaccessible.
   */
  get(id: string): Promise<string>
}

export class CompositeCredentialResolver implements CredentialResolver {
  constructor(private resolvers: CredentialResolver[]) {}

  async get(id: string): Promise<string> {
    const errors: Error[] = []

    for (const resolver of this.resolvers) {
      try {
        return await resolver.get(id)
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
