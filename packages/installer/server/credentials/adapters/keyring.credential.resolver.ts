import { CredentialResolver } from "../credential.resolver"
import { InstallerEngine } from "../../installer_engine"
import { Entry } from "@napi-rs/keyring"

export class KeyringCredentialResolver extends CredentialResolver {
  driver = "keyring"
  private cache: Map<string, string | null | undefined>
  constructor(
    protected engine: InstallerEngine,
    protected source: {}
  ) {
    super(engine, source)

    this.cache = new Map()
  }

  async resolve(id: string) {
    if (this.cache.has(id)) {
      return this.cache.get(id)!
    }
    const entry = new Entry(this.serviceId, id)
    const secret = entry.getPassword()
    this.cache.set(id, secret)
    return secret
  }

  async store(id: string, secret: string) {
    const entry = new Entry(this.serviceId, id)
    entry.setPassword(secret)
    this.cache.set(id, secret)
  }

  get serviceId() {
    return this.engine.context.config.id || "installer"
  }

  async [Symbol.asyncDispose]() {
    // TODO: dispose
  }
}
