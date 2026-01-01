type Branch = { label: string; description?: string; fields?: any[] }
type Param = {
  name?: string
  type?: string
  optional?: boolean
  description?: string // already HTML (or markdown rendered to HTML)
  children?: Param[]
  union?: { alias?: string; branches: Branch[] }
}
type ModuleDoc = {
  name: string
  description?: string
  constraints?: any
  remarks?: string
  parameters?: Param[]
  returns?: Param[]
  examples?: { name: string; content: string }[] | string
}
