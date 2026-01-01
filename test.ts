// import { evalExpr } from "./packages/core/utils/renderer/renderer"
//
// const res = await evalExpr(`{{asd}}`, {
//   asd: {
//     1: 2
//   }
// })
//
// console.log(res)
// console.log(Object.getOwnPropertyNames(res))

import { twMerge } from "tailwind-merge"

const classes =
  "group min-w-0 mb-4 data-[disabled]:select-none data-[disabled]:opacity-50 text-base formkit-outer clear w-auto flex-0 max-w-max sm:max-w-max mb-0 btn btn-sm clear w-auto min-w-0 flex-0 max-w-max sm:max-w-max mb-0 btn btn-sm"
const merged = twMerge(classes)
console.log(merged === classes)
console.log(merged)
console.log(classes)
