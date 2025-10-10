import Conf from 'conf'
import path from 'path'
import os from 'os'
import fs from 'fs'
import { z } from 'zod'

export const DraftSchema = z.object({
  id: z.string(),
  to: z.string(),
  subject: z.string(),
  body: z.string(),
  attachments: z.array(
    z.object({
      filename: z.string().optional(),
      content: z.any(),
      contentType: z.string().optional(),
      path: z.string().optional(),
      cid: z.string().optional(),
    })
  ).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Draft = z.infer<typeof DraftSchema>

export interface DraftsStore {
  drafts: Draft[]
}

function draftsFilePath(): string {
  const dir = path.join(os.homedir(), '.config', 'kaizen-mail')
  return path.join(dir, 'drafts.json')
}

function ensureDraftsDir() {
  const dir = path.dirname(draftsFilePath())
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
}

export function getDraftsStore(encryptionKey: string) {
  ensureDraftsDir()
  const store = new Conf<DraftsStore>({
    projectName: 'kaizen-mail',
    configName: 'drafts',
    cwd: path.dirname(draftsFilePath()),
    encryptionKey,
    fileExtension: 'json',
    serialize: (value) => JSON.stringify(value, null, 2),
    defaults: {
      drafts: [],
    },
  })
  return store
}

export function saveDraft(
  store: Conf<DraftsStore>,
  draft: Omit<Draft, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Draft {
  const drafts = store.get('drafts') || []
  const now = new Date().toISOString()

  if (draft.id) {
    // Update existing
    const index = drafts.findIndex((d) => d.id === draft.id)
    if (index >= 0) {
      const updated: Draft = {
        ...drafts[index]!,
        ...draft,
        id: draft.id,
        updatedAt: now,
      }
      drafts[index] = updated
      store.set('drafts', drafts)
      return updated
    }
  }

  // Create new
  const newDraft: Draft = {
    ...draft,
    id: draft.id || generateDraftId(),
    createdAt: now,
    updatedAt: now,
    attachments: draft.attachments || [],
  }
  drafts.push(newDraft)
  store.set('drafts', drafts)
  return newDraft
}

export function getDrafts(store: Conf<DraftsStore>): Draft[] {
  return store.get('drafts') || []
}

export function getDraft(store: Conf<DraftsStore>, id: string): Draft | undefined {
  const drafts = store.get('drafts') || []
  return drafts.find((d) => d.id === id)
}

export function deleteDraft(store: Conf<DraftsStore>, id: string) {
  const drafts = store.get('drafts') || []
  const filtered = drafts.filter((d) => d.id !== id)
  store.set('drafts', filtered)
}

function generateDraftId(): string {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}
