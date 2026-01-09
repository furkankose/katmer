import { execa } from "execa"
import * as commitAnalyzer from "@semantic-release/commit-analyzer"
import * as changelog from "@semantic-release/changelog"
import * as notes from "@semantic-release/release-notes-generator"

async function commitTouchesPackage(commitSha, cwd, config) {
  const { stdout } = await execa(
    "git",
    ["diff-tree", "--no-commit-id", "--name-only", "-r", commitSha],
    { cwd }
  )

  return stdout.split("\n").some((file) => {
    return file.startsWith(config.path)
  })
}

async function filterCommits(config, context) {
  const { commits, logger, cwd } = context
  const relevantCommits = []

  for (const c of commits) {
    if (await commitTouchesPackage(c.hash, cwd, config)) {
      relevantCommits.push(c)
    }
  }

  logger.log(
    `Found ${relevantCommits.length}/${commits.length} commits touching ${config.path}`
  )

  return relevantCommits
}

export async function analyzeCommits(config, context) {
  context.commits = await filterCommits(config, context)
  return commitAnalyzer.analyzeCommits(config, context)
}

export async function generateNotes(config, context) {
  context.commits = await filterCommits(config, context)

  await changelog.verifyConditions(config, context)
  return await notes.generateNotes(config, context)
}

export async function prepare(config, context) {
  if ("prepare" in commitAnalyzer) {
    await commitAnalyzer.prepare(config, context)
  }
  if ("prepare" in changelog) {
    await changelog.prepare(config, context)
  }
}
