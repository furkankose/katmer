export function safeJsonParse(input: any) {
  try {
    return JSON.parse(input)
  } catch {
    return input?.toString()
  }
}
