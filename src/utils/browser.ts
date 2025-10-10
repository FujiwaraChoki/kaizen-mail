import { exec } from 'child_process'
import { promisify } from 'util'
import os from 'os'

const execAsync = promisify(exec)

export async function openInBrowser(url: string): Promise<void> {
  const platform = os.platform()

  let command: string

  switch (platform) {
    case 'darwin': // macOS
      command = `open "${url}"`
      break
    case 'win32': // Windows
      command = `start "${url}"`
      break
    default: // Linux and others
      command = `xdg-open "${url}"`
      break
  }

  try {
    await execAsync(command)
  } catch (error) {
    throw new Error(`Failed to open browser: ${error}`)
  }
}

export function sanitizeForBrowser(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
