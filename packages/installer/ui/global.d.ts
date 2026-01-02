import type { FormKitInputs } from "@formkit/inputs"
import type { FormKitNodeType } from "@formkit/core"
import type { InstallerConfig } from "@type/installer"

declare module "vue" {
  export interface ComponentCustomProperties {
    $cfg: InstallerConfig
  }
}
declare module "@formkit/core" {
  interface FormKitContext {
    type: FormKitNodeType | "ghost"
  }
  interface FormKitNodeExtensions {
    stepItems: FormKitNode[]
  }
}
declare module "@formkit/inputs" {
  interface FormKitInputProps {
    divider: {}
    dropdown: {
      type: "dropdown"
      [key: string]: any
      options?: {
        label: string
        value: string
      }[]
    }
  }
  interface FormKitInputSlots<Props extends FormKitInputs<Props>> {
    dropdown: {
      activator: (opts: { disabled: boolean; class: any[] }) => any
    }
  }
}

declare module "*.vue" {
  import Vue from "vue"
  export default Vue
}

declare module "@app/config" {
  const config: InstallerConfig
  export default config
}

export {}
