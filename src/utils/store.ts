import Conf from 'conf'
import os from 'os'
import path from 'path'
import fs from 'fs'
import {z} from 'zod'

export const AccountSchema = z.object({
  displayName: z.string(),
  email: z.string(),
  imap: z.object({
    host: z.string(),
    port: z.number(),
    secure: z.boolean(),
    user: z.string(),
    password: z.string(),
  }),
  smtp: z.object({
    host: z.string(),
    port: z.number(),
    secure: z.boolean(),
    user: z.string(),
    password: z.string(),
  }),
})

export type Account = z.infer<typeof AccountSchema>

export const ConfigSchema = z.object({
  account: AccountSchema,
  lastSelectedMailbox: z.string().optional(),
  signature: z
    .object({
      enabled: z.boolean().default(true),
      format: z.enum(['text', 'html']).default('text'),
      content: z.string().default(''),
    })
    .optional(),
})

export type Config = z.infer<typeof ConfigSchema>
export type SignatureConfig = NonNullable<Config['signature']>

export function configFilePath(): string {
  const dir = path.join(os.homedir(), '.config', 'kaizen-mail')
  return path.join(dir, 'config.json')
}

export function ensureConfigDir() {
  const dir = path.dirname(configFilePath())
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true, mode: 0o700})
}

export function hasExistingConfig(): boolean {
  try {
    return fs.existsSync(configFilePath())
  } catch {
    return false
  }
}

export function getStore(encryptionKey: string) {
  ensureConfigDir()
  const store = new Conf<Config>({
    projectName: 'kaizen-mail',
    configName: 'config',
    cwd: path.dirname(configFilePath()),
    encryptionKey,
    fileExtension: 'json',
    serialize: (value) => JSON.stringify(value, null, 2),
  })
  return store
}

export function getStoreSafe(encryptionKey: string) {
  const store = getStore(encryptionKey)
  // Trigger a read to validate decryption
  void store.get('account')
  return store
}
