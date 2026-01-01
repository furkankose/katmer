import type { CredentialResolver } from "./credential.resolver"

export class HttpCredentialResolver implements CredentialResolver {
  constructor(
    private endpoint: string,
    private headers?: Record<string, string>
  ) {}

  async get(id: string): Promise<string> {
    const res = await fetch(`${this.endpoint}/${id}`, {
      headers: this.headers
    })

    if (!res.ok) {
      throw new Error(`HTTP credential not found: ${id}`)
    }

    return (await res.text()).trim()
  }
}
