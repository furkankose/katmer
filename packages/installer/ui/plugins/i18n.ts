import type { App } from "vue"

import { createI18n } from "vue-i18n"
import messages from "../../config/locales"
import type { InstallerConfig } from "@type/installer"

export const i18n = createI18n({
  legacy: false,
  locale: "en",
  fallbackLocale: "en",
  missing() {},
  messages
})

export function registerI18n(app: App, installerConfig: InstallerConfig): void {
  app.use(i18n)
}
