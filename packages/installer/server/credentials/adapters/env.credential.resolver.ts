import { CredentialResolver } from "../credential.resolver"
import type { InstallerContext } from "@common/installer_engine.types"
import { EnvCredentialSource } from "@type/credentials"

export class EnvCredentialResolver extends CredentialResolver<EnvCredentialSource> {
  driver = "env" as const

  async resolve(id: string): Promise<string> {
    const lookup = `${this.source.prefix ?? ""}${id}`
    const value = process.env[lookup]
    if (!value) {
      throw new Error(`Env credential not found: ${lookup}`)
    }
    return value
  }
}
