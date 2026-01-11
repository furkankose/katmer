// @ts-ignore
import prompts from "prompts"

const args = process.argv.slice(2)
const autoPush = args.includes("--push")

// Fail if tracked files are dirty (ignore untracked)
const status = await Bun.$`git status --porcelain --untracked-files=no`.text()
if (status.trim().length > 0) {
  console.error("Working directory is dirty. Commit or stash changes first.")
  process.exit(1)
}

const packages = ["core", "installer"]
const channels = ["stable", "beta", "alpha", "next"] as const

const { pkgs }: { pkgs?: string[] } = await prompts({
  type: "multiselect",
  name: "pkgs",
  message: "Select package(s) to release",
  choices: packages.map((pkg) => ({ title: pkg, value: pkg }))
})

if (!pkgs || pkgs.length === 0) {
  console.error("No packages selected. Release aborted.")
  process.exit(1)
}

const selections: Record<string, string> = {}

for (const pkg of pkgs) {
  const { channel }: { channel?: string } = await prompts({
    type: "select",
    name: "channel",
    message: `Select release type for ${pkg}`,
    choices: channels.map((c) => ({ title: c, value: c })),
    initial: 0
  })

  if (!channel) {
    console.error(`No release type selected for ${pkg}`)
    process.exit(1)
  }

  selections[pkg] = channel
}

const spec = Object.entries(selections)
  .map(([pkg, ch]) => `${pkg}:${ch}`)
  .join(", ")

const message = `chore: trigger release [${spec}]`

await Bun.$`git commit --allow-empty -m ${message}`

console.log(`Release commit created: ${message}`)

if (autoPush) {
  await Bun.$`git push`
  console.log("Pushed to remote (via --push).")
  process.exit(0)
}

const { push }: { push?: boolean } = await prompts({
  type: "confirm",
  name: "push",
  message: "Do you want to push this commit to the remote?",
  initial: false
})

if (push) {
  await Bun.$`git push`
  console.log("Pushed to remote.")
} else {
  console.log("Commit created but not pushed.")
}
