export async function safeImportDynamic(
  name: string,
  path: string,
  exportName?: string
) {
  let result
  try {
    const mod: any = await import(path)
    result =
      mod.default ? mod.default
      : exportName ? mod[exportName] || mod
      : mod
    if (!result) {
      throw false
    }
  } catch (e) {
    throw new Error(
      `Failed to load ${name}.` +
        ` Make sure the ${name} file is valid, accessible and has` +
        `${exportName ? ` named export '${exportName}' or` : ""} a default export.`
    )
  }
  return result
}
