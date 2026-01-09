export default {
  branches: ["main"],

  tagFormat: "v${version}",

  plugins: [
    [
      "../../scripts/release/semantic-release-helper.js",
      {
        preset: "conventionalcommits",
        path: "packages/core",
        changelogFile: "CHANGELOG.md"
      }
    ],
    [
      "@semantic-release/npm",
      {
        pkgRoot: "."
      }
    ],
    [
      "@semantic-release/github",
      {
        assets: [
          {
            path: "dist/releases/*",
            label: "Katmer binary"
          }
        ]
      }
    ],
    [
      "@semantic-release/git",
      {
        assets: ["CHANGELOG.md", "package.json"],
        message: "chore(release): katmer v${nextRelease.version}"
      }
    ]
  ]
}
