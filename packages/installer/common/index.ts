export * from "./utils/ws.utils"
export * from "./utils/json.utils"
export * from "./utils/certificate.utils"
export * from "./utils/promise.utils"
export * from "./errors"
export * from "./types"
export * from "./validators"

declare global {
  type Prettify<T> = {
    [K in keyof T]: T[K]
  } & {}

  interface PlusAuthConfig {
    ssl:
      | boolean
      | {
          certificate: string
          private_key: string
        }
    domain: string
    admin: {
      email: string
      password: string
    }
    license: {
      license_content: string
      signature: string
    }
  }

  interface PlatformConfigBase {
    app: PlusAuthConfig
  }
}
