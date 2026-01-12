#!/usr/bin/env bun

import process from "node:process"

import { Command } from "commander"
import { BuildScripts } from "../scripts/build"
const argv = process.argv
import { version } from "../package.json"
import path from "node:path"

const program = new Command()

program
  .name("katmer-installer")
  .description("Katmer installer")
  .version(version, "-v, --version")
  .helpOption("--help")

program
  .command("build <config_dir>")
  .description(
    "Build your installer executables using schema under <config_dir>"
  )
  .option(
    "-o, --output <output_dir>",
    "output directory for build artifacts",
    "dist"
  )
  .action(async (configDir: string, options) => {
    const opts = {
      config_dir: configDir,
      output_dir: path.resolve(options.output)
    }
    await BuildScripts.ui(opts)
    await BuildScripts.server(opts)
    await BuildScripts.release(opts)
  })

// main
;(async () => {
  await program.parseAsync(argv)
})().catch((err) => {
  console.error("fatal installer error:", err)
  process.exit(1)
})
