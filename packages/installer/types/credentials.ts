import { Type, type Static } from "typebox"
import { FieldPathSchema } from "./core"

// ---------- SECURE STORE ----------

/**
 * Secure store provider identifier.
 *
 * Note: the original type allows arbitrary string values via `(string & {})`,
 * so this is modeled as a string with documentation of known values.
 */
export const SecureStoreProviderSchema = Type.String({
  description:
    'Secure store provider identifier. Known values: "system", "keychain", "credentialManager", "secretService".'
})
export type SecureStoreProvider = Static<typeof SecureStoreProviderSchema>

export const SecureStoreLocationSchema = Type.Object(
  {
    /**
     * Provider implementation; "system" lets runtime pick best for OS.
     */
    provider: Type.Optional(SecureStoreProviderSchema),
    /**
     * Service namespace, e.g. "myAppInstaller".
     */
    service: Type.String(),
    /**
     * Account / key name, e.g. "myApp-repo-token".
     */
    account: Type.Optional(Type.String())
  },
  { additionalProperties: false }
)
export type SecureStoreLocation = Static<typeof SecureStoreLocationSchema>

// ---------- CREDENTIAL SOURCES ----------

export const CredentialSourceDriverSchema = Type.String({
  description:
    'Credential source driver. Known values: "env", "prompt", "secureStore", "field", "file", "inline".'
})
export type CredentialSourceDriver = Static<typeof CredentialSourceDriverSchema>

export const CredentialSourceBaseSchema = Type.Object(
  {
    driver: Type.String(),
    /**
     * Lower number = checked earlier. If omitted, use array order.
     */
    priority: Type.Optional(Type.Number())
  },
  { additionalProperties: true }
)
export type CredentialSourceBase = Static<typeof CredentialSourceBaseSchema>

export const EnvCredentialSourceSchema = Type.Intersect(
  [
    CredentialSourceBaseSchema,
    Type.Object(
      {
        driver: Type.Literal("env"),
        prefix: Type.Optional(Type.String())
      },
      { additionalProperties: false }
    )
  ],
  { additionalProperties: false }
)
export type EnvCredentialSource = Static<typeof EnvCredentialSourceSchema>

export const SecureStoreCredentialSourceSchema = Type.Intersect(
  [
    CredentialSourceBaseSchema,
    Type.Object(
      {
        driver: Type.Literal("secureStore"),
        store: SecureStoreLocationSchema
      },
      { additionalProperties: false }
    )
  ],
  { additionalProperties: false }
)
export type SecureStoreCredentialSource = Static<
  typeof SecureStoreCredentialSourceSchema
>

export const FileCredentialSourceSchema = Type.Intersect(
  [
    CredentialSourceBaseSchema,
    Type.Object(
      {
        driver: Type.Literal("file"),
        dir: Type.String(),
        encoding: Type.Optional(Type.String())
      },
      { additionalProperties: false }
    )
  ],
  { additionalProperties: false }
)
export type FileCredentialSource = Static<typeof FileCredentialSourceSchema>

export const CustomCredentialSourceSchema = Type.Intersect(
  [
    CredentialSourceBaseSchema,
    Type.Object(
      {
        driver: Type.Literal("custom"),
        path: Type.String({
          description: "Credential source adapter file's path"
        })
      },
      { additionalProperties: false }
    )
  ],
  { additionalProperties: true }
)

export const CredentialSourceSchema = Type.Union(
  [
    EnvCredentialSourceSchema,
    SecureStoreCredentialSourceSchema,
    FileCredentialSourceSchema,
    CustomCredentialSourceSchema
  ],
  { description: "Union of supported credential sources." }
)
export type CredentialSource = Static<typeof CredentialSourceSchema>

/**
 * A reusable credential definition (token, password, OTP, etc.).
 * For example: "myAppRepoToken", "myAppS3AccessKey".
 */
export const CredentialConfigSchema = Type.Object(
  {
    id: Type.String(),
    label: Type.Optional(Type.String()),
    description: Type.Optional(Type.String()),
    required: Type.Optional(Type.Boolean()),
    sources: Type.Optional(
      Type.Array(
        Type.String({
          description: "Credential source ids to lookup credentials from"
        })
      )
    ),
    persistToSecureStore: Type.Optional(
      Type.Union([Type.Boolean(), SecureStoreLocationSchema])
    )
  },
  { additionalProperties: false }
)

export type CredentialConfig = Static<typeof CredentialConfigSchema>

// ---------- AUTH ----------

export const AuthDriverSchema = Type.String({
  description:
    'Auth driver. Known values: "none", "basic", "bearer", "header", "query", "aws", "git".'
})
export type AuthDriver = Static<typeof AuthDriverSchema>

/**
 * How a source / probe uses credentials.
 * You attach credential ids defined in `InstallerConfig.credentials`.
 */
export const AuthConfigSchema = Type.Object(
  {
    driver: Type.Optional(AuthDriverSchema),

    /**
     * Single credential for simple schemes (e.g. Bearer token, API key).
     */
    credentialId: Type.Optional(Type.String()),

    /**
     * For schemes needing separate values.
     */
    usernameCredentialId: Type.Optional(Type.String()),
    passwordCredentialId: Type.Optional(Type.String()),
    tokenCredentialId: Type.Optional(Type.String()),

    /**
     * For header/query forms of auth.
     */
    headerName: Type.Optional(Type.String()),
    queryParamName: Type.Optional(Type.String()),

    /**
     * Driver-specific extras (e.g. AWS region, role, etc.).
     */
    options: Type.Optional(Type.Record(Type.String(), Type.Unknown()))
  },
  { additionalProperties: false }
)
export type AuthConfig = Static<typeof AuthConfigSchema>
