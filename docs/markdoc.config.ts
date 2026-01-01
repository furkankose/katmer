import { component, nodes, defineMarkdocConfig } from "@astrojs/markdoc/config"
// @ts-ignore
import starlightMarkdoc from "@astrojs/starlight-markdoc"

export default defineMarkdocConfig({
  extends: [starlightMarkdoc()],
  nodes: {
    fence: {
      attributes: {
        ...nodes.fence.attributes,
        title: { type: "String" },
        content: { type: "String" },
        mark: { type: "String" },
        ins: { type: "String" },
        del: { type: "String" },
        frame: { type: "String" },
        lang: { type: "String" }
      },
      render: component("./src/components/MDCode.astro")
    }
  },
  tags: {
    "module-doc": {
      attributes: {
        returns: { type: Array },
        parameters: { type: Array }
      },
      render: component("./src/components/ModuleDoc.astro")
    }
  }
})
