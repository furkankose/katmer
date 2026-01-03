import { defineCollection } from "astro:content"
import { docsLoader } from "@astrojs/starlight/loaders"
import { docsSchema } from "@astrojs/starlight/schema"
import { file, glob } from "astro/loaders"

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
  modules: defineCollection({
    loader: glob({ pattern: "src/content/modules/**/*.json" })
  })
}
