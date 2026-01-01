import type {
  CommandInstalledProbeConfig,
  DockerInstalledProbeConfig,
  FileInstalledProbeConfig,
  HttpInstalledProbeConfig,
  InstalledDetectionConfig,
  InstalledProbeConfig
} from "@type/installed"
import type { Katmer } from "@katmer/core"

function generateInstalledProbeTasks(
  probe: InstalledProbeConfig,
  targets: string[],
  registerAs: string
): Katmer.Task[] {
  switch (probe.driver) {
    case "file":
      return fileProbeTasks(probe as any, targets, registerAs)
    case "http":
      return httpProbeTasks(probe as any, targets, registerAs)
    case "command":
      return commandProbeTasks(probe as any, targets, registerAs)
    case "docker":
      return dockerProbeTasks(probe as any, targets, registerAs)
    default:
      return []
  }
}

export function generateInstalledDetectionTasks(
  config: InstalledDetectionConfig,
  targets: string[],
  registerPrefix = "installed"
): Katmer.Task[] {
  const probes = (config.probes ?? []).filter((p) => !p.disabled)

  const ordered = [...probes].sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
  )

  if (config.defaultProbeId) {
    const idx = ordered.findIndex((p) => p.id === config.defaultProbeId)
    if (idx > 0) {
      const [preferred] = ordered.splice(idx, 1)
      ordered.unshift(preferred)
    }
  }

  return ordered.flatMap((probe) =>
    generateInstalledProbeTasks(probe, targets, `${registerPrefix}_${probe.id}`)
  )
}

function fileProbeTasks(
  probe: FileInstalledProbeConfig,
  targets: string[],
  registerAs: string
): Katmer.Task[] {
  const tasks: Katmer.Task[] = [
    {
      name: `Check file exists (${probe.id})`,
      targets,
      script: [`test -f ${probe.path}`],
      register: `${registerAs}_exists`,
      allow_failure: true
    }
  ]

  if (probe.versionField) {
    tasks.push({
      name: `Read file (${probe.id})`,
      targets,
      when: `${registerAs}_exists.rc == 0`,
      script: [`cat ${probe.path}`],
      register: `${registerAs}_content`
    })
  }

  return tasks
}

function httpProbeTasks(
  probe: HttpInstalledProbeConfig,
  targets: string[],
  registerAs: string
): Katmer.Task[] {
  const headers =
    probe.headers ?
      Object.entries(probe.headers)
        .map(([k, v]) => `-H "${k}: ${v}"`)
        .join(" ")
    : ""

  const method = probe.method ?? "GET"

  return [
    {
      name: `HTTP probe (${probe.id})`,
      targets,
      script: [`curl -s -X ${method} ${headers} ${probe.url}`],
      register: registerAs,
      allow_failure: true
    }
  ]
}

function commandProbeTasks(
  probe: CommandInstalledProbeConfig,
  targets: string[],
  registerAs: string
): Katmer.Task[] {
  const cmd = typeof probe.run === "string" ? probe.run : probe.run.join(" ")

  return [
    {
      name: `Command probe (${probe.id})`,
      targets,
      script: [cmd],
      register: registerAs,
      allow_failure: true
    }
  ]
}
function dockerProbeTasks(
  probe: DockerInstalledProbeConfig,
  targets: string[],
  registerAs: string
): Katmer.Task[] {
  const target = probe.containerName ?? probe.image
  if (!target) return []

  return [
    {
      name: `Docker probe (${probe.id})`,
      targets,
      script: [`docker inspect ${target}`],
      register: registerAs,
      allow_failure: true
    }
  ]
}
