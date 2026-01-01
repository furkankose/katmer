import fs from "fs-extra"
import path from "node:path"
import ts from "typescript"
import * as tsdoc from "@microsoft/tsdoc"
import { TSDocTagSyntaxKind } from "@microsoft/tsdoc/lib/configuration/TSDocTagDefinition"
import { Standardization } from "@microsoft/tsdoc/lib/details/Standardization"

// --- paths ---------------------------------------------------------------

const SRC_ROOT = path.resolve(import.meta.dir, "..", "packages/core/modules")
const CORE_ROOT = path.resolve(import.meta.dir, "..", "packages/core")
const DOCS_DIR = path.resolve(import.meta.dir, "..", "docs")
const OUT_DIR = path.resolve(DOCS_DIR, "src/content/modules")
const MDOC_OUT_DIR = path.resolve(DOCS_DIR, "src/content/docs/modules")

// ------------------------------------------------------------------------

main().catch((err) => {
  console.error("Error while generating module docs:", err)
  process.exit(1)
})

async function main() {
  const sourceFiles = await collectModuleFiles(SRC_ROOT)
  const program = ts.createProgram(sourceFiles.map(path.normalize), {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext
  })
  const checker = program.getTypeChecker()

  const modules = extractModulesFromProgram(program, checker)
  await renderModuleDocs(modules)
}

function extractModulesFromProgram(
  program: ts.Program,
  checker: ts.TypeChecker
) {
  const modules: any[] = []

  for (const sourceFile of program.getSourceFiles()) {
    const fileName = path.basename(sourceFile.fileName)
    if (sourceFile.isDeclarationFile) continue
    if (!normalize(sourceFile.fileName).startsWith(normalize(SRC_ROOT)))
      continue
    if (!/^[\w-]+\.module\.ts$/.test(fileName)) continue

    // if (!fileName.includes("http")) {
    //   continue
    // }

    const returnInfo = findReturnOptions(sourceFile, checker)
    let returnTypeJson: JsonParam[] | null = null
    if (returnInfo?.type) {
      returnTypeJson = typeToJson(returnInfo.type, checker, returnInfo.node)
    }

    ts.forEachChild(sourceFile, (node) => {
      if (!isModuleDeclaration(node)) return
      // console.log()
      const docs = extractDocComment(node, sourceFile)
      const name = extractModuleName(node, fileName)
      const { type: optionsType, node: optionsNode } =
        safeResolveModuleOptionsType(node, checker)
      const parameters =
        optionsType ? typeToJson(optionsType, checker, optionsNode) : null

      // Prefer same-file *ModuleResult* type; else generic slot
      let returns = returnTypeJson
      if (!returns) {
        const rt = safeResolveModuleReturnType(node, checker)
        if (rt) returns = typeToJson(rt, checker)
      }
      // console.log(parameters)

      modules.push({
        name,
        constraints: extractConstraints(node, sourceFile),
        source: normalize(sourceFile.fileName),
        description: docs.summary.trim(),
        remarks: docs.remarks?.trim() || undefined,
        parameters,
        examples: docs.examples.length ? docs.examples : undefined,
        returns
      })
    })
  }

  return modules
}

async function renderModuleDocs(modules: any[]) {
  fs.emptyDirSync(OUT_DIR)
  fs.emptyDirSync(MDOC_OUT_DIR)

  for (const module of modules) {
    const outputPath = path.join(OUT_DIR, `${module.name}.mdoc`)
    const mdocOutputPath = path.join(MDOC_OUT_DIR, `${module.name}.mdoc`)

    fs.writeFileSync(
      mdocOutputPath,
      `---
title: ${module.name}
---`,
      "utf8"
    )
    fs.writeFileSync(
      outputPath + ".json",
      JSON.stringify(module, null, 2),
      "utf8"
    )
    console.log(`Generated: ${outputPath}`)
  }
}

// --- AST helpers ---------------------------------------------------------

function findReturnOptions(
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker
): { type?: ts.Type; node?: ts.TypeNode } | undefined {
  let out: { type?: ts.Type; node?: ts.TypeNode } | undefined

  ts.forEachChild(sourceFile, (node) => {
    // Top-level declarations named *ModuleResult
    if (
      (ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isClassDeclaration(node)) &&
      node.name?.text.endsWith("ModuleResult")
    ) {
      if (ts.isTypeAliasDeclaration(node)) {
        // For aliases we can return the TypeNode so callers keep alias metadata
        out = {
          type: checker.getTypeAtLocation(node.name),
          node: node.type
        }
      } else {
        // Interfaces / classes don't have a single TypeNode to return
        out = {
          type: checker.getTypeAtLocation(node.name),
          node: undefined
        }
      }
    }
  })

  return out
}

function isModuleDeclaration(node: ts.Node): boolean {
  return !!(
    (ts.isFunctionDeclaration(node) && node.name?.text.endsWith("Module")) ||
    (ts.isClassDeclaration(node) && node.name?.text.endsWith("Module"))
  )
}

function extractModuleName(node: ts.Node, fileName: string): string {
  if (ts.isClassDeclaration(node)) {
    const nameProp = node.members.find(
      (m) => ts.isPropertyDeclaration(m) && m.name.getText() === "name"
    ) as ts.PropertyDeclaration | undefined
    const value = (nameProp as any)?.initializer?.expression?.text
    if (value) return value
  }
  return fileName.replace(/\.module\.ts$/, "")
}

function extractConstraints(
  node: ts.Node,
  sf: ts.SourceFile = node.getSourceFile()
) {
  if (!ts.isClassDeclaration(node)) return null

  const constraintsProp = node.members.find(
    (m): m is ts.PropertyDeclaration =>
      ts.isPropertyDeclaration(m) &&
      !!m.name &&
      m.name.getText(sf) === "constraints"
  )
  if (!constraintsProp || !constraintsProp.initializer) return null

  const value = exprToJson(constraintsProp.initializer, sf)

  return (
      constraintsProp.initializer.kind === ts.SyntaxKind.SatisfiesExpression
    ) ?
      exprToJson(
        (constraintsProp.initializer as ts.SatisfiesExpression).expression,
        sf
      )
    : value
}
function exprToJson(node: ts.Expression, sf: ts.SourceFile): any {
  // Strip TS-only wrappers
  if (ts.isParenthesizedExpression(node)) return exprToJson(node.expression, sf)
  if (ts.isAsExpression(node)) return exprToJson(node.expression, sf)
  if (ts.isNonNullExpression(node)) return exprToJson(node.expression, sf)
  if (node.kind === ts.SyntaxKind.SatisfiesExpression) {
    return exprToJson((node as ts.SatisfiesExpression).expression, sf)
  }

  // Literals
  if (ts.isStringLiteralLike(node)) return node.text
  if (ts.isNumericLiteral(node)) return Number(node.text)
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false
  if (node.kind === ts.SyntaxKind.NullKeyword) return null
  if (ts.isNoSubstitutionTemplateLiteral(node)) return node.text
  if (ts.isTemplateExpression(node)) {
    // Only support no-interpolation templates -> fallback to raw text otherwise
    if (node.templateSpans.length === 0) return node.head.text
    return node.getText(sf)
  }
  if (ts.isRegularExpressionLiteral(node)) {
    // Keep as string (JSON-safe). Example: "/([\\d.]+)/"
    return node.getText(sf)
  }

  // Arrays
  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.map((e) => exprToJson(e as ts.Expression, sf))
  }

  // Objects
  if (ts.isObjectLiteralExpression(node)) {
    const out: Record<string, any> = {}
    for (const prop of node.properties) {
      if (ts.isSpreadAssignment(prop)) {
        // Optional: spread merge if RHS is object
        const spreadVal = exprToJson(prop.expression, sf)
        if (
          spreadVal &&
          typeof spreadVal === "object" &&
          !Array.isArray(spreadVal)
        ) {
          Object.assign(out, spreadVal)
        } else {
          out["$spread"] = spreadVal // keep as marker if not object
        }
        continue
      }

      if (
        ts.isPropertyAssignment(prop) ||
        ts.isShorthandPropertyAssignment(prop) ||
        ts.isMethodDeclaration(prop) // unlikely here, but guard
      ) {
        const key = getPropName(prop.name ?? prop.name, sf)
        if (!key) continue

        if (ts.isShorthandPropertyAssignment(prop)) {
          // We don't resolve lexical values; keep as a ref string
          out[key] = { $expr: prop.name.getText(sf) }
          continue
        }

        if (ts.isPropertyAssignment(prop)) {
          out[key] = exprToJson(prop.initializer as ts.Expression, sf)
          continue
        }

        if (ts.isMethodDeclaration(prop)) {
          out[key] = { $expr: prop.getText(sf) }
          continue
        }
      }
      // Fallback
      const key = prop.name ? getPropName(prop.name, sf) : undefined
      if (key) out[key] = prop.getText(sf)
    }
    return out
  }

  // Identifiers / anything else → keep raw code so docs still show *something* useful
  if (
    ts.isIdentifier(node) ||
    ts.isPropertyAccessExpression(node) ||
    ts.isCallExpression(node)
  ) {
    return { $expr: node.getText(sf) }
  }

  // Last-resort fallback
  return node.getText(sf)
}

function getPropName(
  name: ts.PropertyName | undefined,
  sf: ts.SourceFile
): string | undefined {
  if (!name) return undefined
  if (
    ts.isIdentifier(name) ||
    ts.isStringLiteralLike(name) ||
    ts.isNumericLiteral(name)
  ) {
    return name.text
  }
  if (ts.isComputedPropertyName(name)) {
    const inner = name.expression
    // Support ["literal"] computed names; else keep as code
    if (ts.isStringLiteralLike(inner) || ts.isNumericLiteral(inner))
      return inner.text
    return `[${inner.getText(sf)}]`
  }
  return undefined
}

function extractDocComment(
  node: ts.Node,
  sf: ts.SourceFile = node.getSourceFile()
) {
  const range = extractJsDocRange(node, sf)
  const ctx = range ? parseWithTSDoc(range) : undefined
  if (!ctx) return { summary: "", remarks: "", examples: [] }

  const doc = ctx.docComment
  const summary = renderMarkdown(doc.summarySection)
  const remarks =
    doc.remarksBlock ? renderMarkdown(doc.remarksBlock.content) : ""

  const examples =
    renderMarkdown(
      (doc.customBlocks || []).find(
        (b) => b.blockTag.tagNameWithUpperCase === "@EXAMPLES"
      ) as any
    ) ||
    (doc.customBlocks || [])
      .filter((b) => b.blockTag.tagNameWithUpperCase === "@EXAMPLE")
      .map((b) => {
        const [first, ...rest] = b.content.getChildNodes()
        return {
          name: renderPlainText(first),
          content: renderPlainText(rest as any)
        }
      })
      .filter(Boolean)

  return { summary, remarks, examples }
}

function extractJsDocRange(
  node: ts.Node,
  sf: ts.SourceFile = node.getSourceFile()
): tsdoc.TextRange | undefined {
  const text = sf.getFullText()
  const comments = ts.getLeadingCommentRanges(text, node.pos) || []
  const jsdoc = comments.filter(
    (c) =>
      text.charCodeAt(c.pos + 1) === 0x2a &&
      text.charCodeAt(c.pos + 2) === 0x2a &&
      text.charCodeAt(c.pos + 3) !== 0x2f
  )
  if (!jsdoc.length) return
  const last = jsdoc[jsdoc.length - 1]
  return tsdoc.TextRange.fromStringRange(text, last.pos, last.end)
}

function parseWithTSDoc(range: tsdoc.TextRange) {
  const config = new tsdoc.TSDocConfiguration()
  config.addTagDefinition({
    tagName: "@module",
    allowMultiple: false,
    syntaxKind: TSDocTagSyntaxKind.ModifierTag,
    standardization: Standardization.None,
    tagNameWithUpperCase: "@MODULE"
  })
  config.addTagDefinition({
    tagName: "@examples",
    allowMultiple: false,
    syntaxKind: TSDocTagSyntaxKind.BlockTag,
    standardization: Standardization.None,
    tagNameWithUpperCase: "@EXAMPLES"
  })
  const parser = new tsdoc.TSDocParser(config)
  return parser.parseRange(range)
}

function renderPlainText(
  node?: tsdoc.DocNode | tsdoc.DocNodeContainer
): string {
  if (!node) return ""
  let out = ""
  const visit = (n: tsdoc.DocNode) => {
    if (n.kind === "PlainText") out += (n as tsdoc.DocPlainText).text
    else if (n.kind === "CodeSpan") out += (n as tsdoc.DocCodeSpan).code
    else if (n.kind === "SoftBreak" || n.kind === "Paragraph") out += "\n"
    for (const child of n.getChildNodes()) visit(child)
  }
  for (const child of (node as any)?.getChildNodes?.() ?? []) visit(child)
  return out.trim()
}

function renderMarkdown(node?: tsdoc.DocNode | tsdoc.DocNodeContainer): string {
  if (!node) return ""
  let out = ""
  const walk = (n: tsdoc.DocNode) => {
    switch (n.kind) {
      case "LinkTag": {
        const lt = n as tsdoc.DocLinkTag
        const destination = (
          lt.codeDestination?.emitAsTsdoc() ?? lt.urlDestination
        )
          ?.replace(/\w+ModuleOptions/, "parameter")
          .replace(/\w+ModuleResult/, "return")
          .replaceAll(".", "-")
          .toLowerCase()
        out += `[${lt.linkText}](#${destination})`
        break
      }
      case "PlainText":
        out += (n as tsdoc.DocPlainText).text
        break
      case "CodeSpan":
        out += "`" + (n as tsdoc.DocCodeSpan).code + "`"
        break
      case "FencedCode": {
        const fc = n as tsdoc.DocFencedCode
        out += fc.code ?? ""
        break
      }
      case "SoftBreak":
        out += "\n"
        break
      default:
        for (const c of n.getChildNodes()) walk(c)
    }
  }
  for (const child of (node as any)?.getChildNodes?.() ?? []) walk(child)
  return out.replace(/\r\n?/g, "\n")
}

function safeResolveModuleOptionsType(
  decl: ts.Node,
  checker: ts.TypeChecker
): { type?: ts.Type; node?: ts.TypeNode } {
  try {
    if (ts.isClassDeclaration(decl)) {
      for (const h of decl.heritageClauses ?? []) {
        if (h.token !== ts.SyntaxKind.ExtendsKeyword) continue
        for (const t of h.types) {
          const tn = t.typeArguments?.[0]
          if (tn) return { type: checker.getTypeAtLocation(tn), node: tn }
        }
      }
    } else if (ts.isFunctionDeclaration(decl)) {
      const p = decl.parameters[0]
      if (p?.type)
        return { type: checker.getTypeAtLocation(p.type), node: p.type }
    }
  } catch {}
  return {}
}

function normalize(p: string): string {
  return path.normalize(p).replace(/\\/g, "/")
}

async function collectModuleFiles(dir: string): Promise<string[]> {
  const files: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectModuleFiles(fullPath)))
    } else if (/^[\w-]+\.module\.ts$/.test(entry.name)) {
      files.push(path.resolve(fullPath))
    }
  }
  return files
}

// --- schema model --------------------------------------------------------

type JsonParam = {
  name: string
  type: string
  optional: boolean
  description?: string
  details?: string
  children?: JsonParam[]
  union?: {
    alias?: string
    branches: Array<{
      label: string // "string" | "number" | "boolean" | "object"
      description?: string
      fields?: JsonParam[]
    }>
  }
}

// --- type → json ---------------------------------------------------------

function typeToJson(
  type: ts.Type,
  checker: ts.TypeChecker,
  typeNode?: ts.TypeNode | undefined,
  seen: Set<string> = new Set(),
  pathHint?: string
): JsonParam[] | null {
  const cacheKey = `${checker.typeToString(type)}|${pathHint ?? ""}`
  if (seen.has(cacheKey)) return null
  seen.add(cacheKey)
  {
    const { name: aliasName, decl: aliasDecl } = getAliasInfo(
      checker,
      type,
      typeNode
    )
    const flags = type.getFlags()

    const isPrim = !!(
      flags & ts.TypeFlags.StringLike ||
      flags & ts.TypeFlags.NumberLike ||
      flags & ts.TypeFlags.BooleanLike ||
      flags & ts.TypeFlags.BigIntLike ||
      flags & ts.TypeFlags.ESSymbolLike ||
      flags & ts.TypeFlags.Null ||
      flags & ts.TypeFlags.Undefined ||
      flags & ts.TypeFlags.Void ||
      flags & ts.TypeFlags.StringLiteral ||
      flags & ts.TypeFlags.NumberLiteral ||
      flags & ts.TypeFlags.BooleanLiteral
    )
    if (aliasName && isPrim) {
      const doc = getJsDocFromDecl(aliasDecl)
      return [
        {
          name: aliasName, // you can pretty-print later
          type: primitiveDisplayLabel(type, checker), // "string" | "number" | ...
          optional: false,
          description: doc?.summary,
          details: doc?.details
        }
      ]
    }
  }
  if (type.isUnion()) {
    const aliasName = getTypeAliasName(type)
    const paramName = pathHint ?? aliasName ?? "union"
    const aliasDecl = type.aliasSymbol?.declarations?.[0] as
      | ts.Declaration
      | undefined
    const aliasDoc = getJsDocFromDecl(aliasDecl)

    // collect branches, dedup primitives, keep each object branch distinct
    const branchesMap = new Map<
      string,
      { key: string; label: string; description?: string; fields?: JsonParam[] }
    >()
    const seenPrimitives = new Set<string>()

    for (const branch of (type as ts.UnionType).types) {
      if (isPrimitiveOrLiteral(branch) || checker.isArrayLikeType(branch)) {
        const base = primitiveDisplayLabel(branch, checker)
        if (seenPrimitives.has(base)) continue
        seenPrimitives.add(base)
        const key = `prim:${base}`
        branchesMap.set(key, { key, label: base, description: base })
        continue
      }

      if (isUserDefinedType(branch)) {
        const fields =
          objectTypeFields(branch, checker, seen, paramName, 1 /* depth */) ||
          undefined
        const { key, label } = makeBranchKeyAndLabel(
          branch,
          checker,
          fieldsSignature(fields)
        )
        if (!branchesMap.has(key)) branchesMap.set(key, { key, label, fields })
      }
    }

    const branches = Array.from(branchesMap.values()).sort((a, b) => {
      const order: Record<string, number> = {
        object: 0,
        string: 1,
        number: 2,
        boolean: 3
      }
      const ai = order[a.label] ?? 99
      const bi = order[b.label] ?? 99
      return ai === bi ? a.key.localeCompare(b.key) : ai - bi
    })

    return [
      {
        name: paramName,
        type: normalizeType(
          aliasName ??
            (type as ts.UnionType).types
              .map((t) => primitiveDisplayLabel(t, checker))
              .join(" | ")
        ),
        optional: false,
        description: aliasDoc?.summary,
        details: aliasDoc?.details,
        // Hide internal alias names in the UI → always show generic 'object' in the template
        union: {
          alias: aliasName?.endsWith("ModuleOptions") ? "" : undefined,
          branches: branches.map(({ label, description, fields }) => ({
            label,
            description,
            fields
          }))
        }
      }
    ]
  }

  return objectTypeFields(type, checker, seen, pathHint, 0)
}

const normalizeType = (t: string) => {
  if (!t) return t
  if (t.startsWith("Record")) return "object"
  if (/^Array<(.+)>$/.test(t)) return RegExp.$1 + "[]"
  if (/^Map<.+>$/.test(t)) return "Map"
  if (/^Set<.+>$/.test(t)) return "Set"
  return t
}

const MAX_DEPTH = 6

function objectTypeFields(
  type: ts.Type,
  checker: ts.TypeChecker,
  seen: Set<string>,
  pathHint?: string,
  depth = 0
): JsonParam[] | null {
  if (depth > MAX_DEPTH) return null
  if (!isObjectLike(type)) return null

  // apparent props (union superset)
  const apparentProps = checker.getPropertiesOfType(type)
  if (!apparentProps.length) return null

  const params: JsonParam[] = []

  for (const apparent of apparentProps) {
    const propName = apparent.getName()

    // @ts-ignore
    const propTypeForBranch = checker.getTypeOfPropertyOfType(type, propName)
    if (!propTypeForBranch) continue
    if (propTypeForBranch.getFlags() & ts.TypeFlags.Never) continue

    const displayType = checker.typeToString(propTypeForBranch)
    const doc = extractSymbolJsDoc(apparent)
    const short = doc ? doc.summary || doc.description : undefined

    const param: JsonParam = {
      name: propName,
      type: normalizeType(primitiveDisplayLabel(propTypeForBranch, checker)),
      optional: isOptional(apparent),
      description: short,
      details: doc?.details
    }

    if (isUserDefinedType(propTypeForBranch)) {
      if (propTypeForBranch.isUnion()) {
        const unionType = propTypeForBranch as ts.UnionType
        const alias = getTypeAliasName(unionType)
        const isLiteralUnion = unionType.types.every((t) => {
          const flags = t.getFlags()
          return flags & ts.TypeFlags.Literal
        })
        if (!isLiteralUnion) {
          const branches = [] as {
            key: string
            label: string
            description?: string
            fields?: JsonParam[]
          }[]

          for (const branch of (propTypeForBranch as ts.UnionType).types) {
            if (isPrimitiveOrLiteral(branch)) {
              const base = primitiveDisplayLabel(branch, checker)
              const key = `prim:${base}`
              branches.push({ key, label: base, description: base })
              continue
            }

            if (isUserDefinedType(branch)) {
              const fields =
                objectTypeFields(
                  branch,
                  checker,
                  seen,
                  propName,
                  1 /* depth */
                ) || undefined
              const { key, label } = makeBranchKeyAndLabel(
                branch,
                checker,
                fieldsSignature(fields)
              )
              branches.push({ key, label, fields })
            }
          }

          param.union = {
            alias, // (template ignores this and shows generic 'object')
            branches: branches
          }
        }
      } else {
        const nested = objectTypeFields(
          propTypeForBranch,
          checker,
          seen,
          propName,
          depth + 1
        )
        if (nested?.length) param.children = nested
      }
    }

    params.push(param)
  }

  return params
}

// --- JSDoc on symbols ----------------------------------------------------

function extractSymbolJsDoc(
  sym: ts.Symbol
): { summary?: string; description?: string; details?: string } | undefined {
  const decl = sym.valueDeclaration ?? sym.declarations?.[0]
  if (!decl) return

  const src = decl.getSourceFile()
  const text = src.getFullText()
  const ranges = ts.getLeadingCommentRanges(text, decl.pos) || []
  const jsdocs = ranges.filter(
    (c) =>
      text.charCodeAt(c.pos + 1) === 0x2a &&
      text.charCodeAt(c.pos + 2) === 0x2a &&
      text.charCodeAt(c.pos + 3) !== 0x2f
  )
  if (!jsdocs.length) return

  const range = jsdocs[jsdocs.length - 1]
  const tr = tsdoc.TextRange.fromStringRange(text, range.pos, range.end)
  const ctx = parseWithTSDoc(tr)

  const doc = ctx.docComment
  const summary = doc.summarySection ? renderMarkdown(doc.summarySection) : ""
  const remarks =
    doc.remarksBlock ? renderPlainText(doc.remarksBlock.content) : ""
  const details = [remarks].filter(Boolean).join("\n").trim()

  return {
    summary: summary.trim() || undefined,
    description: summary.trim() || undefined,
    details: details || undefined
  }
}

// --- type utils ----------------------------------------------------------

function isOptional(sym: ts.Symbol): boolean {
  return !!(sym.getFlags() & ts.SymbolFlags.Optional)
}

function isObjectLike(type: ts.Type): boolean {
  return (type.getFlags() & ts.TypeFlags.Object) !== 0
}

function isUserDefinedType(type: ts.Type): boolean {
  // Aliases are "user-defined", even if underlying type is primitive
  if (type.aliasSymbol) {
    const decl = getAliasDecl(type)
    if (decl) {
      const fileName = normalize(decl.getSourceFile().fileName)
      if (fileName.includes("/node_modules/")) return false
      if (fileName.includes("/typescript/lib/")) return false
      return normalize(fileName).startsWith(normalize(CORE_ROOT))
    }
  }

  const flags = type.getFlags()
  const isPrimitive =
    flags & ts.TypeFlags.StringLike ||
    flags & ts.TypeFlags.NumberLike ||
    flags & ts.TypeFlags.BooleanLike ||
    flags & ts.TypeFlags.Null ||
    flags & ts.TypeFlags.Undefined ||
    flags & ts.TypeFlags.ESSymbolLike ||
    flags & ts.TypeFlags.BigIntLike ||
    flags & ts.TypeFlags.Void
  if (isPrimitive) return false

  if (type.isUnionOrIntersection())
    return type.types.some((t) => isUserDefinedType(t))

  const sym = (type.aliasSymbol ?? type.getSymbol()) as ts.Symbol | undefined
  if (!sym) return false
  const decl = sym.valueDeclaration ?? sym.declarations?.[0]
  if (!decl) return false

  const fileName = normalize(decl.getSourceFile().fileName)
  if (fileName.includes("/node_modules/")) return false
  if (fileName.includes("/typescript/lib/")) return false
  return normalize(fileName).startsWith(normalize(CORE_ROOT))
}

function makeBranchKeyAndLabel(
  t: ts.Type,
  checker: ts.TypeChecker,
  fieldsSig?: string
): { key: string; label: string } {
  if (isPrimitiveOrLiteral(t)) {
    const lbl = primitiveDisplayLabel(t, checker)
    return { key: `prim:${lbl}`, label: lbl }
  }
  // object-like: keep distinct keys, label stays "object"
  const alias = getTypeAliasName(t) || t.getSymbol()?.getName() || ""
  const key =
    alias ? `obj:${alias}` : `obj:${fieldsSig ?? checker.typeToString(t)}`
  return { key, label: "object" }
}

function fieldsSignature(fields?: JsonParam[]): string {
  if (!fields?.length) return ""
  return fields
    .map((f) => `${f.name}:${f.type}${f.optional ? "?" : ""}`)
    .join("|")
}
function getAliasInfo(
  checker: ts.TypeChecker,
  type: ts.Type,
  node?: ts.TypeNode
): { name?: string; decl?: ts.Declaration } {
  // 1) If the "type" still carries alias info, use it.
  const a = type.aliasSymbol
  if (a) return { name: a.getName(), decl: a.declarations?.[0] }

  // 2) Fallback: if we have a TypeReferenceNode, resolve its symbol.
  if (node && ts.isTypeReferenceNode(node)) {
    const sym = checker.getSymbolAtLocation(node.typeName)
    if (sym && sym.getFlags() & ts.SymbolFlags.TypeAlias) {
      return { name: sym.getName(), decl: sym.declarations?.[0] }
    }
  }
  return {}
}

function getTypeAliasName(type: ts.Type): string | undefined {
  if (type.aliasSymbol) {
    const alias = type.aliasSymbol.getName()
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(alias)) return alias
  }
  const sym = type.getSymbol()
  const name = sym?.getName()
  if (name && /^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return name
  return undefined
}

function getJsDocFromDecl(
  decl?: ts.Declaration
): { summary?: string; details?: string } | undefined {
  if (!decl) return
  const sf = decl.getSourceFile()
  const text = sf.getFullText()
  const ranges = ts.getLeadingCommentRanges(text, decl.pos) || []
  const jsdocs = ranges.filter(
    (c) =>
      text.charCodeAt(c.pos + 1) === 0x2a &&
      text.charCodeAt(c.pos + 2) === 0x2a &&
      text.charCodeAt(c.pos + 3) !== 0x2f
  )
  if (!jsdocs.length) return
  const last = jsdocs[jsdocs.length - 1]
  const tr = tsdoc.TextRange.fromStringRange(text, last.pos, last.end)
  const ctx = parseWithTSDoc(tr)
  const doc = ctx.docComment
  const summary = doc.summarySection ? renderMarkdown(doc.summarySection) : ""
  const remarks =
    doc.remarksBlock ? renderPlainText(doc.remarksBlock.content) : ""
  const details = [remarks].filter(Boolean).join("\n").trim()
  return { summary: summary.trim() || undefined, details: details || undefined }
}

function safeResolveModuleReturnType(
  decl: ts.Node,
  checker: ts.TypeChecker
): ts.Type | undefined {
  try {
    if (!ts.isClassDeclaration(decl)) return undefined
    for (const h of decl.heritageClauses ?? []) {
      if (h.token !== ts.SyntaxKind.ExtendsKeyword) continue
      for (const t of h.types) {
        const args =
          t.typeArguments?.map((a) => checker.getTypeAtLocation(a)) || []
        if (args[1]) return args[1]
      }
    }
  } catch {}
  return undefined
}
function isPrimitiveOrLiteral(t: ts.Type): boolean {
  const f = t.getFlags()
  return !!(
    f & ts.TypeFlags.StringLike ||
    f & ts.TypeFlags.NumberLike ||
    f & ts.TypeFlags.BooleanLike ||
    f & ts.TypeFlags.BigIntLike ||
    f & ts.TypeFlags.ESSymbolLike ||
    f & ts.TypeFlags.Null ||
    f & ts.TypeFlags.Undefined ||
    f & ts.TypeFlags.Void ||
    f & ts.TypeFlags.StringLiteral ||
    f & ts.TypeFlags.NumberLiteral ||
    f & ts.TypeFlags.BooleanLiteral
  )
}
function primitiveDisplayLabel(t: ts.Type, checker: ts.TypeChecker): string {
  if (t.isUnion()) {
    const seen = new Set<string>()
    const parts: string[] = []

    for (const branch of (t as ts.UnionType).types) {
      const label = primitiveDisplayLabelNonUnion(branch, checker)
      if (!seen.has(label)) {
        seen.add(label)
        parts.push(label)
      }
    }
    return parts.join(" | ")
  }
  return primitiveDisplayLabelNonUnion(t, checker)
}

function primitiveDisplayLabelNonUnion(
  t: ts.Type,
  checker: ts.TypeChecker
): string {
  const f = t.getFlags()

  // --- Preserve literal forms exactly as TypeScript prints them
  if (f & ts.TypeFlags.StringLiteral) return checker.typeToString(t) // e.g. "\"foo\"" (quotes included)
  if (f & ts.TypeFlags.NumberLiteral) return checker.typeToString(t) // e.g. "42"

  // --- Primitives
  if (f & ts.TypeFlags.StringLike) return "string"
  if (f & ts.TypeFlags.NumberLike) return "number"
  if (f & ts.TypeFlags.BooleanLike || f & ts.TypeFlags.BooleanLiteral)
    return "boolean"
  if (f & ts.TypeFlags.BigIntLike) return "bigint"
  if (f & ts.TypeFlags.ESSymbolLike) return "symbol"
  if (f & ts.TypeFlags.Null) return "null"
  if (f & ts.TypeFlags.Undefined) return "undefined"
  if (f & ts.TypeFlags.Void) return "void"

  // --- Arrays / ReadonlyArray<T> / T[]
  if (f & ts.TypeFlags.Object) {
    const obj = t as ts.ObjectType
    const of = obj.objectFlags ?? 0

    // Tuples: treat as object (or specialize if you want)
    if (of & ts.ObjectFlags.Tuple) return "object"

    // Reference types: Array<T>, ReadonlyArray<T>, etc.
    if (of & ts.ObjectFlags.Reference) {
      const tr = obj as ts.TypeReference
      const name =
        tr.target?.symbol?.getName?.() ?? tr.getSymbol()?.getName?.() ?? ""
      if (name === "Array" || name === "ReadonlyArray") {
        const elem = tr.typeArguments?.[0]
        const elemLabel = elem ? primitiveDisplayLabel(elem, checker) : "object"
        // If element label is a union like "A | B", wrap with parentheses
        const needsParens = elemLabel.includes(" | ")
        return `${needsParens ? `(${elemLabel})` : elemLabel}[]`
      }
    }
  }

  // --- Everything else (interfaces, type literals, classes, Map, Set, etc.)
  return "object"
}
function getAliasDecl(type: ts.Type): ts.Declaration | undefined {
  return type.aliasSymbol?.declarations?.[0]
}
