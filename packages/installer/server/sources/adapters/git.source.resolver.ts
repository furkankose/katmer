import * as git from "isomorphic-git"
import http from "isomorphic-git/http/node"
import fs from "node:fs"
import { mkdir } from "node:fs/promises"
import { resolve, normalize } from "node:path"

import type { GitSourceConfig } from "@type/sources"
import { ResolvedSource, SourceResolver } from "../source.manager"

export class GitSourceResolver extends SourceResolver<GitSourceConfig> {
  readonly driver = "git"

  async resolve(): Promise<ResolvedSource> {
    const repoDir = resolve(this.engine.workspaceRoot, this.source.id)
    await mkdir(repoDir, { recursive: true })

    const ref = this.source.ref ?? "HEAD"
    const auth = await this.resolveAuth()
    const onAuth = () => auth

    if (fs.existsSync(resolve(repoDir, ".git"))) {
      await git.fetch({ fs, http, dir: repoDir, ref, onAuth })
      await git.checkout({ fs, dir: repoDir, ref, force: true })
    } else {
      await git.clone({
        fs,
        http,
        dir: repoDir,
        url: this.source.repo,
        ref,
        singleBranch: true,
        depth: 1,
        onAuth
      })
    }

    const rootDir = normalize(
      this.source.path ? resolve(repoDir, this.source.path) : repoDir
    )

    return {
      sourceId: this.source.id,
      driver: this.driver,
      rootDir
    }
  }

  private async resolveAuth(): Promise<{
    username?: string
    password?: string
  }> {
    const auth = this.source.auth
    if (!auth) return {}

    switch (auth.driver) {
      case "basic": {
        if (!auth.usernameCredentialId || !auth.passwordCredentialId) {
          throw new Error(
            "basic auth requires usernameCredentialId and passwordCredentialId"
          )
        }

        return {
          username: await this.engine.credentialManager.resolve(
            auth.usernameCredentialId
          ),
          password: await this.engine.credentialManager.resolve(
            auth.passwordCredentialId
          )
        }
      }

      case "token":
      case "bearer": {
        if (!auth.tokenCredentialId) {
          throw new Error("token auth requires tokenCredentialId")
        }

        return {
          username: "oauth2",
          password: await this.engine.credentialManager.resolve(
            auth.tokenCredentialId
          )
        }
      }

      default:
        return {}
    }
  }
}
