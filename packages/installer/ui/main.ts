import { createApp } from "vue"
import "./styles/main.css"
import { initializePlugins } from "./plugins"
import { useConfig } from "@common/useConfig"
import App from "./App.vue"

const config = useConfig()
const rootApp = createApp(App)

document.title = config.ui?.appTitle || ""
initializePlugins(rootApp, config).then((app) => {
  app.mount("#app")
})
