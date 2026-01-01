import type { CredentialResolver } from "./credential.resolver"

export class StaticCredentialResolver implements CredentialResolver {
  constructor(private readonly map: Record<string, string>) {}

  async get(id: string): Promise<string> {
    const value = this.map[id]
    if (!value) {
      throw new Error(`Static credential not found: ${id}`)
    }
    return value
  }
}
