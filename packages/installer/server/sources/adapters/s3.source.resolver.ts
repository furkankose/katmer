import type { S3SourceConfig } from "@type/sources"
import { ResolvedSource, SourceResolver } from "../source.manager"

export class S3SourceResolver extends SourceResolver<S3SourceConfig> {
  readonly driver = "s3"

  async resolve(): Promise<ResolvedSource> {
    // TODO: implement using @aws-sdk/client-s3
    throw new Error("S3 source not implemented yet")
  }
}
