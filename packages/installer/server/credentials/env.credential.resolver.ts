import type { CredentialResolver } from "./credential.resolver"

export class EnvCredentialResolver implements CredentialResolver {
  constructor(private prefix?: string) {}

  async get(id: string): Promise<string> {
    const key = this.prefix ? `${this.prefix}${id}` : id
    const value = process.env[key]

    if (!value) {
      throw new Error(`Env credential not found: ${key}`)
    }

    return value
  }
}
