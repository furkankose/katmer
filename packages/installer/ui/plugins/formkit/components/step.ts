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
        console.log(node.props.disabled)
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
