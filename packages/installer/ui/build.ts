import * as vite from "vite"
import vue from "@vitejs/plugin-vue"
import path from "node:path"
import tailwindAutoReference from "vite-plugin-vue-tailwind-auto-reference"
import tailwindcss from "@tailwindcss/vite"
import Components from "unplugin-vue-components/vite"
import Icons from "unplugin-icons/vite"
import { viteSingleFile } from "vite-plugin-singlefile"
import vueDevTools from "vite-plugin-vue-devtools"

/**
 * Inline HTML content
 */
const INLINE_HTML = `
<!doctype html>
<html lang="en" data-theme="light">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" href="/favicon.svg" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/main.ts"></script>
  </body>
</html>
`

/**
 * Vite plugin to provide inline index.html
 */
function inlineHtmlPlugin(html: string): vite.Plugin {
  return {
    name: "inline-html",
    enforce: "pre",

    resolveId(id) {
      if (id === path.resolve(import.meta.dirname, "index.html")) return id
    },

    load(id) {
      if (id === path.resolve(import.meta.dirname, "index.html")) {
        return html
      }
    }
  }
}

const viteConfig: vite.InlineConfig = {
  root: path.resolve(import.meta.dirname),
  build: {
    cssCodeSplit: false,
    cssMinify: "lightningcss"
  },
  logLevel: "info",
  plugins: [
    inlineHtmlPlugin(INLINE_HTML),
    vue(),
    tailwindAutoReference("./styles/tailwind.css") as any,
    tailwindcss(),
    Components({
      dirs: ["components"],
      directoryAsNamespace: false,
      resolvers: []
    }),
    Icons(),
    viteSingleFile(),
    vueDevTools()
  ],

  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname),
      "@app/config": path.resolve(import.meta.dirname, "../common/config.ts"),
      "@common": path.resolve(import.meta.dirname, "../common")
    }
  },
  server: {
    host: true,
    open: false
  }
}

export async function buildUi(_opts: any) {
  await vite.build(viteConfig)
}

export async function serveUi() {
  const server = await vite.createServer(viteConfig)
  await server.listen()
}
