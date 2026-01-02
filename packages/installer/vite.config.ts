import path from "node:path"
import vue from "@vitejs/plugin-vue"
import Components from "unplugin-vue-components/vite"
import { defineConfig } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile"
import vueDevTools from "vite-plugin-vue-devtools"
import tailwindAutoReference from "vite-plugin-vue-tailwind-auto-reference"
import Icons from "unplugin-icons/vite"

import tailwindcss from "@tailwindcss/vite"

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./ui"),
      "@app/config": path.resolve("./config.ts"),
      "@common": path.resolve(import.meta.dirname, "./common")
    }
  },
  esbuild:
    mode === "production" ?
      {
        drop: ["debugger", "console"],
        legalComments: "none"
      }
    : {},
  server: {
    host: true,
    open: false
  },

  build: {
    cssCodeSplit: false,
    cssMinify: "lightningcss"
  },
  plugins: [
    vue(),
    tailwindAutoReference("./ui/styles/tailwind.css") as any,
    tailwindcss(),
    Components({
      dirs: ["ui/components"],
      directoryAsNamespace: false,
      resolvers: []
    }),
    Icons(),
    viteSingleFile(),
    vueDevTools()
  ]
}))
