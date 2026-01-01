import { Renderer } from "@astrojs/markdoc/components"
import {
  createGetHeadings,
  createContentComponent
} from "@astrojs/markdoc/runtime"
import { assetsConfig } from "@astrojs/markdoc/runtime-assets-config"
import matter from "gray-matter"
import type { Node } from "@markdoc/markdoc"
import { getMarkdocTokenizer } from "../../node_modules/@astrojs/markdoc/dist/tokenizer.js"
import { htmlTokenTransform } from "../../node_modules/@astrojs/markdoc/dist/html/transform/html-token-transform.js"
import Markdoc from "@markdoc/markdoc"
import { setupConfig } from "../../node_modules/@astrojs/markdoc/dist/runtime"
import userMarkdocConfig from "../../markdoc.config"
import "@astrojs/starlight/components"

export async function parseMarkdoc(
  TEXT: string,
  options = { allowHTML: true }
) {
  const entry = getEntryInfo(TEXT)
  const tokenizer = getMarkdocTokenizer(options)
  let tokens = tokenizer.tokenize(entry.body)

  if (options?.allowHTML) {
    tokens = htmlTokenTransform(tokenizer, tokens)
  }

  const ast = Markdoc.parse(tokens)
  const markdocConfig = await setupConfig(userMarkdocConfig, options, false)

  const validationErrors = Markdoc.validate(ast, markdocConfig as any).filter(
    (e) => {
      return (
        (e.error.level === "error" || e.error.level === "critical") &&
        e.error.id !== "variable-undefined" &&
        !(
          e.error.id === "attribute-value-invalid" &&
          /^Partial .+ not found/.test(e.error.message)
        )
      )
    }
  )

  if (validationErrors.length) {
    throw validationErrors[0]
  }

  //
  // const usedTags = getUsedTags(ast)
  //
  // for (const tag of usedTags) {
  //   switch (tag) {
  //     case "alert":
  //       await import("@/components/content/Alert.astro")
  //       break
  //     case "gk":
  //       await import("@/components/content/GK.astro")
  //       break
  //     case "mermaid":
  //       await import("@/components/content/Mermaid.astro")
  //       await import("@/components/content/MermaidClient.astro")
  //       break
  //     case "tool-card":
  //       await import("@/components/content/ToolCard.astro")
  //       break
  //     case "code-group":
  //     case "tabs":
  //       await import("@components/content/Tabs.astro")
  //       break
  //     case "table":
  //       await import("@components/content/DataTable.astro")
  //       break
  //     case "tab-item":
  //       await import("@components/content/TabItem.astro")
  //       break
  //     case "grid":
  //       await import("@/components/content/Grid.astro")
  //       break
  //     case "request-snippet":
  //       await import("@/components/content/RequestSnippet.astro")
  //       break
  //   }
  // }

  function getEntryInfo(contents: string) {
    const parsed = parseFrontmatter(contents)
    return {
      data: parsed.data,
      body: parsed.content,
      slug: parsed.data.slug,
      rawData: parsed.matter
    }
  }

  function parseFrontmatter(fileContents: string) {
    try {
      // `matter` is empty string on cache results
      // clear cache to prevent this
      ;(matter as any).clearCache()
      return matter(fileContents)
    } catch (err: any) {
      if (err.name === "YAMLException") {
        err.loc = {
          file: err.id,
          line: err.mark.line + 1,
          column: err.mark.column
        }
        err.message = err.reason
        throw err
      } else {
        throw err
      }
    }
  }

  markdocConfig.nodes = { ...assetsConfig.nodes, ...markdocConfig.nodes }
  const stringifiedAst = JSON.stringify(ast)

  const getHeadings = createGetHeadings(
    stringifiedAst,
    markdocConfig,
    options,
    false
  )

  const Content = createContentComponent(
    Renderer,
    stringifiedAst,
    markdocConfig,
    options,
    {} as any,
    {} as any,
    false
  )

  return { Content, headings: getHeadings(), data: entry.data }
}

function getUsedTags(markdocAst: Node) {
  const tags = new Set<string>()
  const validationErrors = Markdoc.validate(markdocAst)
  for (const { error } of validationErrors) {
    if (error.id === "tag-undefined") {
      const [, tagName] = /Undefined tag: '(.*)'/.exec(error.message) ?? []
      tags.add(tagName)
    }
  }
  return tags
}
