declare module "*.sh" {
  const content: string
  export default content
}
declare module "*.svg" {
  const content: string
  export default content
}
declare module "*.html" {
  const content: string
  export default content
}
declare module "*?raw" {
  const content: string
  export default content
}

declare module "*.vue" {
  import Vue from "vue"
  export default Vue
}

declare module "@app/config" {
  import type { InstallerConfig } from "@type/installer"

  const config: Required<InstallerConfig>
  export default config
}

type States = "init" | "check" | "configure" | "install" | "verify" | "done"
