const EXECUTABLE_NAME = "katmer-installer"
import path from "node:path"
import { buildUi } from "../ui/build"

const EXTERNALS = [
  "react",
  "react-dom/server",
  "ractive",
  "just",
  "mustache",
  "hamlet",
  "walrus",
  "hamljs",
  "atpl",
  "@babel/preset-typescript/package.json",
  "velocityjs",
  "dustjs-linkedin",
  "liquor",
  "jqtpl",
  "eco",
  "ejs",
  "jazz",
  "templayed",
  "whiskers",
  "haml-coffee",
  "hogan.js",
  "mote",
  "ect",
  "toffee",
  "bracket-template",
  "dot",
  "htmling",
  "plates",
  "babel-core",
  "vash",
  "teacup/lib/express",
  "marko",
  "slm",
  "coffee-script",
  "squirrelly",
  "twing"
]

type BuildOpts = { config_dir: string; output_dir: string }
export const BuildScripts = {
  ui: buildUi,
  server: async (opts: BuildOpts) =>
    Bun.build({
      entrypoints: [path.resolve(import.meta.dirname, "../cli/index.ts")],
      packages: "bundle",
      target: "bun",
      format: "cjs",
      outdir: path.resolve(import.meta.dirname, "../server/dist/"),
      external: EXTERNALS,
      conditions: ["module"],
      define: {
        "process.env.CSS_TRANSFORMER_WASM": "false"
      },
      minify: true,
      throw: true
    }),
  release: async (opts: BuildOpts) => {
    for (const target of [
      "linux-x64",
      "linux-arm64",
      "windows-x64",
      "darwin-arm64",
      "darwin-x64"
    ] as const) {
      console.log(`Building for ${target}`)
      await Bun.build({
        target: "bun",
        format: "cjs",
        entrypoints: [
          path.resolve(import.meta.dirname, "../server/dist/index.js")
        ],
        external: EXTERNALS,
        compile: {
          autoloadBunfig: false,
          autoloadDotenv: false,
          target: `bun-${target}`,
          outfile: path.resolve(opts.output_dir, `${releaseFileName(target)}`)
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
