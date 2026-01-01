import path from "node:path"
import { mkdir, exists } from "node:fs/promises"

export function resolveFile(...args: string[]) {
  return path.resolve(process.cwd(), ...args)
}

export async function ensureDirectory(filePath: string): Promise<void> {
  const dir = path.dirname(filePath)
  if (!(await exists(dir))) {
    await mkdir(dir, { recursive: true })
  }
}
