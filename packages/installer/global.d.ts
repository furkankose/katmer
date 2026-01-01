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

type States = "init" | "check" | "configure" | "install" | "verify" | "done"
