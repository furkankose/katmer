import { FormKitInputs } from "@formkit/inputs"
import { FormKitNodeType } from "@formkit/core"

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

export {}
