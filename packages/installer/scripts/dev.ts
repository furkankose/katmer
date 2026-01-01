// dev.ts
import {
  createServer,
  loadConfigFromFile,
  mergeConfig,
  type ViteDevServer,
  type UserConfig,
  ResolvedConfig
} from "vite"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let viteServer: ViteDevServer | null = null
let bunProc: Bun.Subprocess | null = null

async function startVite() {
  const result = (await loadConfigFromFile(
    { command: "serve", mode: "development" },
    path.resolve(__dirname, "../vite.config.ts")
  )) as any as ResolvedConfig

  viteServer = await createServer(result)

  await viteServer.listen()
  console.log("Vite dev server listening on:")
  console.log(...(viteServer.resolvedUrls?.local ?? []))
  console.log()
}

async function startBunApp() {
  bunProc = Bun.spawn(["bun", "run", "cli/index.ts", "--web"], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit"
  })

  bunProc.exited.then(() => shutdown(1))
}

async function shutdown(code = 0) {
  process.removeAllListeners()

  try {
    if (viteServer) {
      await viteServer.close()
      viteServer = null
    }
  } catch {}

  try {
    if (bunProc && !bunProc.killed) {
      bunProc.kill("SIGINT")
    }
  } catch {}

  process.exit(code)
}

process.on("SIGINT", () => shutdown(0))
process.on("SIGTERM", () => shutdown(0))
process.on("uncaughtException", (err) => {
  console.error(err)
  shutdown(1)
})

// ---- START ----
await startVite()
await startBunApp()
