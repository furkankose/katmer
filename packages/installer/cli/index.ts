import process from "node:process"

import { Command } from "commander"

import type { CliMode, CliRuntimeOptions, LogLevel, LogTarget } from "@type/cli"
import type { InstallerConfig } from "@type/installer"

import { start_cli_runner } from "../server/runner/cli_runner"
import { start_web_runner } from "../server/runner/web_runner"

import { useConfig } from "@common/useConfig"

const installer_config = useConfig()

const program = new Command()

try {
  const argv = process.argv

  program
    .name("katmer-installer")
    .description("Katmer installer")
    .version(installer_config.version ?? "0.0.0")

  program
    .option(
      "-m, --mode <mode>",
      "run mode (cli|web)",
      function parse_mode(value: string): CliMode {
        const v = value.toLowerCase()
        if (v !== "cli" && v !== "web") {
          throw new Error(`invalid mode "${value}", expected "cli" or "web"`)
        }
        return v as CliMode
      },
      detect_default_mode(argv.slice(2))
    )
    .option("--web")
    .option("--cli")
    .option("--port <port>", "port to listen on", "3000")
    .option(
      "-L, --logging <target>",
      "logging target (stdout|file|both)",

      function parse_logging(value: string): LogTarget {
        const v = value.toLowerCase()
        if (!["stdout", "file", "both"].includes(v)) {
          throw new Error(
            `invalid logging "${value}", expected "stdout", "file" or "both"`
          )
        }
        return v as LogTarget
      },
      "stdout"
    )
    .option("--logs-dir <dir>", "directory where log files will be written")
    .option(
      "--log-level <level>",
      "log level (fatal|error|warn|info|debug|trace|silent)",
      function parse_log_level(value: string): LogLevel {
        const v = value.toLowerCase()
        const levels: LogLevel[] = [
          "fatal",
          "error",
          "warn",
          "info",
          "debug",
          "trace",
          "silent"
        ]
        if (!levels.includes(v as LogLevel)) {
          throw new Error(
            `invalid log level "${value}", expected one of: ${levels.join(", ")}`
          )
        }
        return v as LogLevel
      },
      "info"
    )

  program.parse(argv)
  const opts = program.opts()

  const runtime_opts: CliRuntimeOptions = {
    mode: opts.mode,
    port: Number(opts.port),
    logging: opts.logging,
    logs_dir: opts.logsDir,
    log_level: opts.logLevel
  }

  function detect_default_mode(argv: string[]): CliMode {
    if (argv.includes("--mode=cli") || argv.includes("--cli")) return "cli"
    if (argv.includes("--mode=web") || argv.includes("--web")) return "web"
    return process.stdout.isTTY ? "cli" : "web"
  }

  await (runtime_opts.mode === "cli" ? start_cli_runner : start_web_runner)(
    installer_config,
    runtime_opts
  )
} catch (err) {
  console.error("fatal installer error:", err)
  process.exit(1)
}
