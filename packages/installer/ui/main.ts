import { createApp } from "vue"
import "./styles/main.css"
import { initializePlugins } from "./plugins"
import config from "@app/config"

document.title = config.ui?.appTitle || ""

import App from "./App.vue"

const rootApp = createApp(App)

initializePlugins(rootApp, config).then((app) => {
  app.mount("#app")
})
