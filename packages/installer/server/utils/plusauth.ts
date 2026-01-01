import nodeCrypto from "node:crypto"
import { ValidationError } from "@common/errors"
import {
  removeAlgFromPublicKey,
  removeHeaders
} from "@common/utils/certificate.utils"
import { Validators } from "@common/validators"
import { CONFIG } from "../config"

type IfNever<T, P> =
  T extends never ? P
  : T extends undefined ? P
  : T

function validate<T extends keyof typeof Validators>(
  value: any,
  type: T,
  params: IfNever<Parameters<(typeof Validators)[T]>[1], {}> & { field: string }
) {
  const { field, ...validateParams } = params
  try {
    return Validators[type](value, validateParams as any)
  } catch (e) {
    throw new ValidationError(params.field, e as string)
  }
}

export async function validateAppOptions(config?: Partial<PlatformConfigBase>) {
  const app = config?.app
  if (!app) {
    throw new ValidationError("app", "Application configuration is required")
  }
  if (!app.admin) {
    throw new ValidationError(
      "app.admin",
      "Administrator configuration is required"
    )
  }
  validate(app.domain, "domain", { field: "app.admin.domain" })
  validate(app.admin.email, "email", { field: "app.admin.email" })
  validate(app.admin.password, "password", { field: "app.admin.password" })

  await validateLicenseOptions(app.license)
  await validateSSLOptions(app)
}

export async function validateLicenseOptions(
  license: PlatformConfigBase["app"]["license"]
) {
  if (!license) {
    throw new ValidationError(
      "app.license",
      "License configuration is required"
    )
  }
  validate(license.license_content, "license", {
    field: "app.license.license_content"
  })
  validate(license.signature, "license_signature", {
    field: "app.license.signature"
  })

  await verifyLicenseSignature(license)
}

export async function validateSSLOptions(
  app: Partial<PlatformConfigBase["app"]>
) {
  const { ssl } = app
  if (ssl === null || ssl === undefined) {
    throw new ValidationError("app.ssl", "SSL configuration is required")
  }
  if (ssl === false) {
    throw new ValidationError("app.ssl", "non-tls setup is not implemented yet")
  }
  if (typeof ssl === "object") {
    validate(ssl.certificate, "certificate", {
      field: "app.ssl.cert",
      domain: app.domain
    })
    validate(ssl.private_key, "privateKey", {
      field: "app.ssl.cert",
      domain: app.domain,
      certificate: ssl.certificate
    })
  } else {
    // TODO: mkcert
    throw new ValidationError(
      "app.ssl",
      "self-generated ssl setup is not implemented yet"
    )
  }
}

export async function verifyLicenseSignature(
  license: PlatformConfigBase["app"]["license"]
) {
  const { license_content, signature } = license
  const licenseB64 = removeHeaders(license_content)!
  const publicKeyb64 = removeAlgFromPublicKey(CONFIG.licensing.public_key)

  const verifier = nodeCrypto.createVerify("sha256")
  verifier.update(licenseB64)

  const pKey = nodeCrypto.createPublicKey(publicKeyb64)

  if (!verifier.verify(pKey, signature, "base64")) {
    throw new ValidationError("app.license.signature", "signature mismatch")
  }
}
