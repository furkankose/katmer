const spawnOptions = {
  stdin: "inherit",
  stdout: "inherit",
  onError: console.error,
  stderr: "inherit"
} as const

const run = async () => {
  Bun.spawn(["bun", "run", "dev:server"], spawnOptions)
  Bun.spawn(["bun", "run", "dev:ui"], spawnOptions)
}

run()
