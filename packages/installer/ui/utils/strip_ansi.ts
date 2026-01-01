export function stripAnsi(str: string) {
  // remove ANSI escape codes but keep \r and \n
  return str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "")
}
