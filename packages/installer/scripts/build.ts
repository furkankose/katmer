const EXECUTABLE_NAME = "pa-installer"

const Builds = {
  ui: async () => await Bun.$`vite build ./`,
  server: async () =>
    Bun.build({
      entrypoints: ["./cli/index.ts"],
      packages: "bundle",
      target: "bun",
      outdir: "./dist/",
      minify: true,
      throw: true,
      define: {
        "process.env.NODE_ENV": JSON.stringify("production")
      }
    }),
  release: async () => {
    for (const target of [
      "linux-x64",
      "linux-arm64",
      "windows-x64",
      "darwin-arm64",
      "darwin-x64"
    ]) {
      console.log(`Building for ${target}`)
      await Bun.$`bun build --compile --target bun-${target} ./server/dist/index.js --outfile ./releases/${releaseFileName(target)}`
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
  await Builds.ui()
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
