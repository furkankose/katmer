import type { Katmer } from "../interfaces/task.interface"
import { Entry } from "@napi-rs/keyring"

export const KeyringLookup = {
  key: "keyring",
  handler: async (
    _ctx: Katmer.TaskContext,
    envKeyParts: string[],
    opts: Record<string, any>
  ) => {
    const key = envKeyParts.join(".")
    const entry = new Entry(opts.service ?? "katmer", key)
    return entry.getPassword()
  }
}
