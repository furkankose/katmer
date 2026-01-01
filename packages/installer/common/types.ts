export interface LogEntry {
  timestamp: number
  data: string[]
  message?: string
  level: "info" | "error" | "warn"
}

export type PlatformInstaller = {}
