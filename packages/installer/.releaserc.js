export default {
  branches: ["main"],

  tagFormat: "installer-v${version}",

  plugins: [
    [
      "../../scripts/release/semantic-release-helper.js",
      {
        preset: "conventionalcommits",
        path: "packages/installer",
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
            label: "Installer binary"
          }
        ]
      }
    ],
    [
      "@semantic-release/git",
      {
        assets: ["CHANGELOG.md", "package.json"],
        message: "chore(release): installer v${nextRelease.version}"
      }
    ]
  ]
}
