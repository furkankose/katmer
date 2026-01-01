// plugins/formkit/components/step.ts
import { createInput } from "@formkit/vue"
import { disablesChildren } from "@formkit/inputs"

export const Step = createInput(
  [],
  {
    type: "ghost" as any,
    props: [],
    features: [
      disablesChildren,
      (node) => {
        node.props.clickable ??= true
        node.props.disabled ??= false
      }
    ]
  },
  {
    outer: {
      $el: "div",
      attrs: {
        class: "$classes.outer"
      },
      children: "$slots.default"
    }
  }
)
