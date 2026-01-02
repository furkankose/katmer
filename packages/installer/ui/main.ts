import { createApp } from "vue"
import "./styles/main.css"
import { initializePlugins } from "./plugins"
import config from "@app/config"

import App from "./App.vue"

const rootApp = createApp(App)

document.title = config.ui?.appTitle || ""
initializePlugins(rootApp, config).then((app) => {
  app.mount("#app")
})
