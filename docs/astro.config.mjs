// @ts-check
import { defineConfig } from "astro/config"
import starlight from "@astrojs/starlight"

import markdoc from "@astrojs/markdoc"

import tailwindcss from "@tailwindcss/vite"

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      customCss: [
        // Path to your Tailwind base styles:
        "./src/styles/global.css"
      ],
      components: {
        MarkdownContent: "./src/components/MarkdownContent.astro"
      },
      title: "katmer",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/withastro/starlight"
        }
      ],
      sidebar: [
        {
          slug: "getting-started"
        },
        {
          label: "Guides",
          autogenerate: { directory: "guides" }
        },
        {
          label: "Modules",
          autogenerate: { directory: "modules" }
        }
      ]
    }),
    markdoc({
      ignoreIndentation: true,
      typographer: true,
      allowHTML: true
    })
  ],

  vite: {
    plugins: [tailwindcss()]
  }
})
