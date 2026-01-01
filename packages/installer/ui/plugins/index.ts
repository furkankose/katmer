import type { App } from "vue"
import { registerI18n } from "./i18n"
import { registerFormKit } from "./formkit/formkit"
import type { InstallerConfig } from "@type/installer"

export async function initializePlugins(
  app: App,
  installerConfig: InstallerConfig
) {
  app.config.globalProperties.$cfg = installerConfig
  registerI18n(app, installerConfig)
  registerFormKit(app, installerConfig)

  // registerPrimeVue(app)
  // registerVeeValidate(app)
  // app.use(Vueform, await createVueForm(app, installerConfig))
  // app.use(Router)

  return app
}
