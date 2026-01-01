import type { S3SourceConfig } from "@type/sources"
import type { ResolvedSource } from "./source.resolver"
import type { CredentialResolver } from "../credentials/credential.resolver"

export async function resolveS3Source(
  source: S3SourceConfig,
  workspaceDir: string,
  credentialResolver: CredentialResolver
): Promise<ResolvedSource> {
  const dest = `${workspaceDir}/${source.id}`

  // TODO: implement
  // Placeholder: real impl should list & download objects
  // using @aws-sdk/client-s3

  throw new Error("S3 source not implemented yet")
}
