import path from "node:path"

const EXECUTABLE_NAME = "katmer"

const localPath = (...paths: string[]) =>
  path.resolve(import.meta.dirname, "..", ...paths)

const Builds = {
  server: async () => {
    console.log("Building server.")
    return Bun.build({
      entrypoints: [localPath("cli/index.ts")],
      root: localPath(),
      packages: "bundle",
      target: "bun",
      outdir: localPath("dist"),
      minify: false,
      throw: true,
      define: {
        "process.env.NODE_ENV": JSON.stringify("production")
      }
    })
  },
  release: async () => {
    for (const target of [
      "linux-x64",
      "linux-arm64",
      "windows-x64",
      "darwin-arm64",
      "darwin-x64"
    ] as const) {
      console.log(`Building for ${target}`)
      await Bun.build({
        entrypoints: [localPath("./dist/cli/index.js")],
        root: localPath(),
        compile: {
          target: `bun-${target}`,
          autoloadDotenv: false,
          autoloadBunfig: false,
          outfile: localPath(`./dist/releases/${releaseFileName(target)}`)
        }
      })
    }
  }
}

function releaseFileName(target: string) {
  if (target.includes("windows")) {
    return `${EXECUTABLE_NAME}-${target}.exe`
  }
  return `${EXECUTABLE_NAME}-${target}`
}

const run = async () => {
  await Builds.server()
  await Builds.release()
}

try {
  await run()
} catch (err: any) {
  console.error(err)
  process.exit(1)
}

export {}
