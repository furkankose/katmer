// @ts-ignore
import prompts from "prompts"

const status = await Bun.$`git status --porcelain --untracked-files=no`.text()

if (status.trim().length > 0) {
  console.error("Working directory is dirty. Commit or stash changes first.")
  process.exit(1)
}

const packages = ["core", "installer"]

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

const tag = pkgs.map((pkg) => `@${pkg}`).join(",")

await Bun.$`git commit --allow-empty -m ${`chore: release [${tag}]`}`

console.log(`Release commit created for: ${pkgs.join(", ")}`)
