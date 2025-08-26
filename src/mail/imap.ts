import { ImapFlow, MailboxLockObject } from 'imapflow'
import type { Account } from '../utils/store'
import { simpleParser } from 'mailparser'

export type Mailbox = { path: string; name: string; flags?: string[] }

export interface MessageListItem {
  uid: number
  subject: string
  from?: string
  date?: Date
  seen: boolean
}

export interface AttachmentMeta {
  filename?: string
  size?: number
  contentType?: string
  cid?: string
  content?: Buffer
}

export interface ParsedMessage {
  uid: number
  subject: string
  from?: string
  to?: string
  date?: Date
  text?: string
  html?: string
  raw?: Buffer
  attachments?: AttachmentMeta[]
}

export async function connectImap(account: Account): Promise<ImapFlow> {
  const client = new ImapFlow({
    host: account.imap.host,
    port: account.imap.port,
    secure: account.imap.secure,
    auth: { user: account.imap.user, pass: account.imap.password },
    logger: false,
  })
  await client.connect()
  return client
}

export async function listMailboxes(client: ImapFlow): Promise<Mailbox[]> {
  const result: Mailbox[] = []
  const boxes = await client.list()
  for (const box of boxes) {
    result.push({ path: box.path, name: box.name, flags: box.flags ? Array.from(box.flags) : undefined })
  }
  return result
}

export async function openMailbox(client: ImapFlow, path: string): Promise<MailboxLockObject> {
  return await client.mailboxOpen(path)
}

export async function listMessages(client: ImapFlow, limit = 20): Promise<MessageListItem[]> {
  // Always work in UID mode for consistency across the app
  const uids = await client.search({ all: true }, { uid: true })
  const last = uids.slice(-limit)
  const items: MessageListItem[] = []
  for await (const msg of client.fetch(last, { envelope: true, flags: true, internalDate: true }, { uid: true })) {
    items.push({
      uid: msg.uid!,
      subject: msg.envelope?.subject || '(no subject)',
      from: msg.envelope?.from?.map((a) => a.address || a.name).filter(Boolean).join(', '),
      date: msg.internalDate || undefined,
      seen: msg.flags?.has('Seen') ?? false,
    })
  }
  // newest first
  items.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0))
  return items
}

// Fetch message summaries for a provided list of UIDs
export async function listMessagesByUids(client: ImapFlow, uidList: number[]): Promise<MessageListItem[]> {
  if (!uidList || uidList.length === 0) return []
  const items: MessageListItem[] = []
  // Explicitly fetch by UID, not sequence numbers
  for await (const msg of client.fetch(uidList, { envelope: true, flags: true, internalDate: true }, { uid: true })) {
    items.push({
      uid: msg.uid!,
      subject: msg.envelope?.subject || '(no subject)',
      from: msg.envelope?.from?.map((a) => a.address || a.name).filter(Boolean).join(', '),
      date: msg.internalDate || undefined,
      seen: msg.flags?.has('Seen') ?? false,
    })
  }
  // newest first by date
  items.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0))
  return items
}

export async function fetchMessage(client: ImapFlow, uid: number): Promise<ParsedMessage> {
  // Prefer UID mode; the UI passes real IMAP UIDs.
  // If not found, try sequence number as a defensive fallback.
  let msg = await client.fetchOne(uid, { source: true, envelope: true, internalDate: true }, { uid: true })
  if (!msg) {
    msg = await client.fetchOne(uid, { source: true, envelope: true, internalDate: true })
  }
  if (!msg) {
    throw new Error('Message not found')
  }

  const source = msg.source as Buffer | undefined

  // Fallback: if no raw source is available, synthesize from envelope only
  if (!source) {
    return {
      uid,
      subject: msg.envelope?.subject || '(no subject)',
      from: msg.envelope?.from?.map((a) => a.address || a.name).filter(Boolean).join(', '),
      to: msg.envelope?.to?.map((a) => a.address || a.name).filter(Boolean).join(', '),
      date: msg.internalDate || undefined,
      text: undefined,
      html: undefined,
      raw: undefined,
      attachments: [],
    }
  }

  try {
    const parsed = await simpleParser(source)
    return {
      uid,
      subject: parsed.subject || msg.envelope?.subject || '(no subject)',
      from: parsed.from?.text || msg.envelope?.from?.map((a) => a.address || a.name).filter(Boolean).join(', '),
      to: parsed.to?.text || msg.envelope?.to?.map((a) => a.address || a.name).filter(Boolean).join(', '),
      date: parsed.date || msg.internalDate || undefined,
      text: parsed.text || undefined,
      html: (parsed.html as string | undefined) || undefined,
      raw: source,
      attachments: (parsed.attachments || []).map((a: any) => ({
        filename: a.filename,
        size: typeof a.size === 'number' ? a.size : undefined,
        contentType: a.contentType,
        cid: a.cid || a.contentId,
        content: a.content as Buffer | undefined,
      })),
    }
  } catch (e) {
    // If parsing fails, still return envelope-based data
    return {
      uid,
      subject: msg.envelope?.subject || '(no subject)',
      from: msg.envelope?.from?.map((a) => a.address || a.name).filter(Boolean).join(', '),
      to: msg.envelope?.to?.map((a) => a.address || a.name).filter(Boolean).join(', '),
      date: msg.internalDate || undefined,
      text: undefined,
      html: undefined,
      raw: source,
      attachments: [],
    }
  }
}

export async function markSeen(client: ImapFlow, uid: number, seen: boolean) {
  if (seen) await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true })
  else await client.messageFlagsRemove(uid, ['\\Seen'], { uid: true })
}
