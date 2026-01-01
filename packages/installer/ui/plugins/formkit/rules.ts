import isIP from "validator/lib/isIP"
import isFQDN from "validator/lib/isFQDN"
import { Validators } from "../../../common"
import type { FormKitValidationRule } from "@formkit/validation"

export default {
  hostname(node) {
    const value = node.value as string

    return (
      isIP(value) ||
      isFQDN(value, {
        require_tld: true,
        allow_trailing_dot: false,
        allow_wildcard: false,
        allow_underscores: true,
        allow_numeric_tld: false
      })
    )
  },
  distinct(node, ...args) {
    const rootItems = node.at("$root")?.context?.attrs?.items
    if (rootItems && Array.isArray(rootItems)) {
      for (const item of rootItems) {
        if (item && typeof item === "object" && node.name in item) {
          return node.value !== item[node.name]
        } else if (node.value === item) {
          return false
        }
      }
      return true
    }
    const parent = node.at("$parent")
    if (parent && parent.value) {
      // Ensure all the siblings are different values
      for (const childName in parent.value) {
        if (childName === node.name) continue
        if (parent.value[childName] === node.value) {
          return false
        }
      }
    }
    return true
  },
  ip: (node) => {
    return isIP(node.value as string)
  },
  domain: (node) => {
    try {
      return Validators.domain(node.value as string)
    } catch (e) {
      return false
    }
  },
  certificate: async (node, ...args) => {
    const domainFieldName = args[0]
    const enableWildcard = args[1]
    const finalDomain = `${enableWildcard ? "*." : ""}${node.at(domainFieldName)?.value}`

    try {
      await Validators.certificate(node.value, { domain: finalDomain })
      return true
    } catch (e) {
      ;(node as any).rule_error = e
      return false
    }
  },
  private_key: async (node, ...args) => {
    const certFieldName = args[0]
    const domainFieldName = args[1]
    const enableWildcard = args[2]
    const finalDomain = `${enableWildcard ? "*." : ""}${node.at(domainFieldName)?.value}`
    try {
      await Validators.privateKey(node.value, {
        certificate: node.at(certFieldName)?.value as string,
        domain: finalDomain
      })
      return true
    } catch (e) {
      ;(node as any).rule_error = e
      return false
    }
  },
  license: (node) => {
    try {
      return Validators.license(node.value as string)
    } catch (e) {
      return false
    }
  },
  license_signature: (node) => {
    try {
      return Validators.license_signature(node.value as string)
    } catch (e) {
      return false
    }
  }
} as Record<string, FormKitValidationRule>
