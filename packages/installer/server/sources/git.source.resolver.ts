import * as git from "isomorphic-git"
import http from "isomorphic-git/http/node"
import { mkdir } from "node:fs/promises"
import fs from "node:fs"
import { resolve, normalize } from "node:path"
import type { GitSourceConfig } from "@type/sources"
import type { ResolvedSource } from "./source.resolver"
import type { AuthConfig } from "@type/credentials"
import type { CredentialResolver } from "../credentials/credential.resolver"

export async function resolveGitSource(
  source: GitSourceConfig,
  workspaceDir: string,
  credentialResolver: CredentialResolver
): Promise<ResolvedSource> {
  const repoDir = resolve(workspaceDir, source.id)

  await mkdir(repoDir, { recursive: true })

  const ref = source.ref ?? "HEAD"
  const auth = await resolveGitAuth(source.auth, credentialResolver)
  const onAuth = () => auth
  if (fs.existsSync(resolve(repoDir, ".git"))) {
    await git.fetch({ fs, http, dir: repoDir, ref, onAuth })
    await git.checkout({ fs, dir: repoDir, ref, force: true })
  } else {
    await git.clone({
      fs,
      http,
      dir: repoDir,
      url: source.repo,
      ref,
      singleBranch: true,
      depth: 1,
      onAuth
    })
  }

  const rootDir = normalize(
    source.path ? resolve(repoDir, source.path) : repoDir
  )

  return {
    sourceId: source.id,
    driver: "git",
    rootDir
  }
}

export async function resolveGitAuth(
  auth: AuthConfig | undefined,
  credentials: CredentialResolver
): Promise<{ username?: string; password?: string }> {
  if (!auth) return {}

  switch (auth.kind) {
    case "basic": {
      if (!auth.usernameCredentialId || !auth.passwordCredentialId) {
        throw new Error(
          "basic auth requires usernameCredentialId and passwordCredentialId"
        )
      }

      return {
        username: await credentials.get(auth.usernameCredentialId),
        password: await credentials.get(auth.passwordCredentialId)
      }
    }

    case "token":
    case "bearer": {
      if (!auth.tokenCredentialId) {
        throw new Error("token auth requires tokenCredentialId")
      }

      return {
        username: "oauth2",
        password: await credentials.get(auth.tokenCredentialId)
      }
    }

    default:
      return {}
  }
}
