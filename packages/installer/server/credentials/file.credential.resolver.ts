import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { CredentialResolver } from "./credential.resolver"

export class FileCredentialResolver implements CredentialResolver {
  constructor(private baseDir: string) {}

  async get(id: string): Promise<string> {
    const file = resolve(this.baseDir, id)

    try {
      const content = await readFile(file, "utf8")
      return content.trim()
    } catch {
      throw new Error(`File credential not found: ${file}`)
    }
  }
}
