import { readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { CredentialResolver } from "../credential.resolver"
import type { InstallerContext } from "@common/installer_engine.types"
import { FileCredentialSource } from "@type/credentials"
import process from "node:process"

export class FileCredentialResolver extends CredentialResolver<FileCredentialSource> {
  driver = "file" as const

  async resolve(id: string): Promise<string> {
    const file = resolve(this.source.dir ?? "", id)

    try {
      const content: any = await readFile(
        file,
        (this.source.encoding as any) ?? "utf8"
      )
      if (typeof content === "string") {
        return content.trim()
      } else {
        return content.toString((this.source.encoding as any) ?? "utf8").trim()
      }
    } catch {
      throw new Error(`File credential not found: ${file}`)
    }
  }

  async store(id: string, value: string) {
    const file = resolve(this.source.dir ?? "", id)
    await writeFile(file, value, {
      encoding: (this.source.encoding as any) ?? "utf8"
    })
  }
}
