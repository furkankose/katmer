import { Validators } from "../../../common"
import type { FormKitLocale } from "@formkit/i18n"

export default {
  en: {
    validation: {
      distinct: "This value must be unique",
      hostname: "Please enter a valid hostname",
      domain: () => "Please enter a valid domain",
      ip: "Please enter a valid ip address",
      certificate({ node, name, args }) {
        return node.rule_error
      },
      private_key: ({ node, name, args }) => {
        return node.rule_error
      },
      license_signature: ({ value }) => {
        try {
          return Validators.license_signature(value)
        } catch (e) {
          return e
        }
      },
      license: ({ value }) => {
        try {
          return Validators.license(value)
        } catch (e) {
          return e
        }
      }
    }
  }
} as Record<string, Partial<FormKitLocale>>
