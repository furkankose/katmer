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
    'Secure store provider identifier. Known values: "system", "keychain", "credentialManager", "secretService".',
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
    account: Type.Optional(Type.String()),
  },
  { additionalProperties: false }
)
export type SecureStoreLocation = Static<typeof SecureStoreLocationSchema>

// ---------- CREDENTIAL SOURCES ----------

export const CredentialSourceKindSchema = Type.String({
  description:
    'Credential source kind. Known values: "env", "prompt", "secureStore", "field", "file", "inline".',
})
export type CredentialSourceKind = Static<typeof CredentialSourceKindSchema>

export const CredentialSourceBaseSchema = Type.Object(
  {
    kind: CredentialSourceKindSchema,
    /**
     * Lower number = checked earlier. If omitted, use array order.
     */
    priority: Type.Optional(Type.Number()),
  },
  { additionalProperties: true }
)
export type CredentialSourceBase = Static<typeof CredentialSourceBaseSchema>

export const EnvCredentialSourceSchema = Type.Intersect(
  [
    CredentialSourceBaseSchema,
    Type.Object(
      {
        kind: Type.Literal("env"),
        envVar: Type.String(),
      },
      { additionalProperties: false }
    ),
  ],
  { additionalProperties: false }
)
export type EnvCredentialSource = Static<typeof EnvCredentialSourceSchema>

export const PromptCredentialSourceSchema = Type.Intersect(
  [
    CredentialSourceBaseSchema,
    Type.Object(
      {
        kind: Type.Literal("prompt"),
        /**
         * If omitted, runtime can fall back to credential label/description.
         */
        message: Type.Optional(Type.String()),
        help: Type.Optional(Type.String()),
        secret: Type.Optional(Type.Boolean()),
      },
      { additionalProperties: false }
    ),
  ],
  { additionalProperties: false }
)
export type PromptCredentialSource = Static<typeof PromptCredentialSourceSchema>

export const SecureStoreCredentialSourceSchema = Type.Intersect(
  [
    CredentialSourceBaseSchema,
    Type.Object(
      {
        kind: Type.Literal("secureStore"),
        store: SecureStoreLocationSchema,
      },
      { additionalProperties: false }
    ),
  ],
  { additionalProperties: false }
)
export type SecureStoreCredentialSource = Static<typeof SecureStoreCredentialSourceSchema>

export const FieldCredentialSourceSchema = Type.Intersect(
  [
    CredentialSourceBaseSchema,
    Type.Object(
      {
        kind: Type.Literal("field"),
        /**
         * Take the credential value from a form/CLI field.
         * Example: "secrets.repoToken"
         */
        fieldPath: FieldPathSchema,
      },
      { additionalProperties: false }
    ),
  ],
  { additionalProperties: false }
)
export type FieldCredentialSource = Static<typeof FieldCredentialSourceSchema>

export const FileCredentialSourceSchema = Type.Intersect(
  [
    CredentialSourceBaseSchema,
    Type.Object(
      {
        kind: Type.Literal("file"),
        path: Type.String(),
        /**
         * BufferEncoding | string in Node. Modeled as string in JSON Schema.
         */
        encoding: Type.Optional(Type.String()),
      },
      { additionalProperties: false }
    ),
  ],
  { additionalProperties: false }
)
export type FileCredentialSource = Static<typeof FileCredentialSourceSchema>

export const InlineCredentialSourceSchema = Type.Intersect(
  [
    CredentialSourceBaseSchema,
    Type.Object(
      {
        kind: Type.Literal("inline"),
        value: Type.String(),
      },
      { additionalProperties: false }
    ),
  ],
  { additionalProperties: false }
)
export type InlineCredentialSource = Static<typeof InlineCredentialSourceSchema>

export const CustomCredentialSourceSchema = Type.Intersect(
  [CredentialSourceBaseSchema, Type.Record(Type.String(), Type.Unknown())],
  { additionalProperties: true }
)

export const CredentialSourceSchema = Type.Union(
  [
    EnvCredentialSourceSchema,
    PromptCredentialSourceSchema,
    SecureStoreCredentialSourceSchema,
    FieldCredentialSourceSchema,
    FileCredentialSourceSchema,
    InlineCredentialSourceSchema,
    CustomCredentialSourceSchema,
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
    /**
     * Ordered list of possible locations for this credential.
     */
    sources: Type.Array(CredentialSourceSchema),
    /**
     * Persist resolved value in secure OS storage.
     */
    persistToSecureStore: Type.Optional(Type.Union([Type.Boolean(), SecureStoreLocationSchema])),
  },
  { additionalProperties: false }
)
export type CredentialConfig = Static<typeof CredentialConfigSchema>

// ---------- AUTH ----------

export const AuthKindSchema = Type.String({
  description:
    'Auth kind. Known values: "none", "basic", "bearer", "header", "query", "aws", "git".',
})
export type AuthKind = Static<typeof AuthKindSchema>

/**
 * How a source / probe uses credentials.
 * You attach credential ids defined in `InstallerConfig.credentials`.
 */
export const AuthConfigSchema = Type.Object(
  {
    kind: Type.Optional(AuthKindSchema),

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
    options: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  },
  { additionalProperties: false }
)
export type AuthConfig = Static<typeof AuthConfigSchema>
