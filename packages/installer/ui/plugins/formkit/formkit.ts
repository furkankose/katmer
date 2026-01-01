import { type App, h, render } from "vue"

import type { InstallerConfig } from "@type/installer"
import type { FormKitNode } from "@formkit/core"

import { createInput, defaultConfig, plugin } from "@formkit/vue"
import { createMultiStepPlugin } from "@formkit/addons"
import { ignores } from "@formkit/inputs"

import {
  directionalIcons,
  fileIcons,
  genesisIcons,
  inputIcons
} from "@formkit/icons"

import PhCaretDownIcon from "~icons/ph/caret-down-duotone?raw"
import PhPencilIcon from "~icons/ph/pencil-simple-duotone?raw"

import { rootClasses, classes, globals, sectionClasses } from "./formkit.theme"

import FormStep from "../../components/ui/FormStep.vue"
import Divider from "./components/Divider.vue"
import Debug from "./components/Debug.vue"
import Repeater from "./components/Repeater.vue"
import Dropdown from "./components/Dropdown.vue"
import Alert from "./components/Alert.vue"
import rules from "./rules"
import messages from "./messages"
import { i18n } from "../i18n"
import { Step } from "./components/step"

function preventAutoFill(node) {
  node.on("created", () => {
    node.props.definition.schemaMemoKey = `data-autofill_${node.props.definition.schemaMemoKey}`

    const schemaFn = node.props.definition.schema
    node.props.definition.schema = (sectionsSchema = {} as any) => {
      sectionsSchema.input = {
        attrs: {
          autocomplete: "off",
          "data-lpignore": true,
          "data-1p-ignore": true
        }
      }

      return schemaFn(sectionsSchema)
    }
  })
}
function scrollToErrors(node) {
  if (node.props.type === "form") {
    function scrollTo(node) {
      const el = document.getElementById(node.props.id)
      if (el) {
        el.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest"
        })
      }
    }

    function scrollToErrors() {
      node.walk((child) => {
        // Check if this child has errors
        if (
          (child.type === "input" && child.ledger.value("blocking")) ||
          child.ledger.value("errors")
        ) {
          // We found an input with validation errors
          scrollTo(child)
          // Stop searching
          return false
        }
      }, true)
    }

    const onSubmitInvalid = node.props.onSubmitInvalid
    node.props.onSubmitInvalid = () => {
      onSubmitInvalid?.(node)
      scrollToErrors()
    }
    node.on("unsettled:errors", scrollToErrors)
  }
  return false
}

function localizeMessages(node: FormKitNode) {
  const toBeLocalized = ["label", "hint", "help", "description"]

  for (const prop of toBeLocalized) {
    const propValue = node.props[prop]
    if (propValue && typeof propValue === "string") {
      node.props[prop] = i18n.global.t(propValue)
    }
  }
}
export function registerFormKit(app: App, installerConfig: InstallerConfig) {
  app.use(
    plugin,
    defaultConfig({
      config: { rootClasses, sectionClasses, classes, globals },
      plugins: [
        localizeMessages,
        preventAutoFill,
        scrollToErrors,
        (node) => {
          node.hook.prop((payload, next) => {
            if (payload.prop === "attrs") {
              delete payload.value.meta
            }
            return next(payload)
          })
          if ((node.type as any) === "ghost") {
            const childs = [] as any[]
            node.extend("stepItems", {
              get() {
                return childs
              },
              set: false
            })
            const parent = node.parent!
            node.traps.set("add", {
              get() {
                return (child: FormKitNode, ...args: any) => {
                  parent.add(child, ...(args as any))
                  parent.children.push(child)
                  childs.push(child)
                }
              },
              set: false
            })
          } else {
            node.hook.commit((v) => {
              if (v && typeof v === "object" && "__$hidden" in v) {
                delete v["__$hidden"]
              }
              return v
            })
          }
        }
      ],
      messages: messages,
      rules: rules,
      inputs: {
        step: Step,
        debug: createInput(Debug, {
          family: undefined,
          features: [ignores],
          props: ["text"]
        }),
        divider: createInput(Divider, {
          family: undefined,
          features: [ignores],
          props: ["title"]
        }),
        dropdown: createInput(Dropdown, {
          features: [ignores],
          props: [
            "label",
            "help",
            "placeholder",
            "options",
            "disabled",
            "validation"
          ]
        }),
        repeater: createInput(Repeater, {
          props: ["label", "help", "addLabel", "itemSchema", "itemSummary"],
          type: "list",
          family: "repeater"
        }),
        alert: createInput(Alert, {
          family: undefined,
          features: [ignores],
          props: ["content", "iconClass", "contentClass"]
        })
      },
      icons: {
        ...genesisIcons,
        ...inputIcons,
        ...directionalIcons,
        ...fileIcons,
        select: PhCaretDownIcon as any,
        edit: PhPencilIcon as any
      },
      async iconLoader(iconname, ...args) {
        return `<i class="${iconname} ic ic-mask flex-shrink-0 w-full h-full" aria-hidden="true" />`
      }
    })
  )
}
