import {ImapFlow, MailboxLockObject} from 'imapflow'
import type {Account} from '../utils/store'
import {simpleParser} from 'mailparser'

export type Mailbox = {path: string; name: string; flags?: string[]}

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
    auth: {user: account.imap.user, pass: account.imap.password},
    logger: false,
  })
  await client.connect()
  return client
}

export async function listMailboxes(client: ImapFlow): Promise<Mailbox[]> {
  const result: Mailbox[] = []
  const boxes = await client.list()
  for (const box of boxes) {
    result.push({path: box.path, name: box.name, flags: box.flags ? Array.from(box.flags) : undefined})
  }
  return result
}

export async function openMailbox(client: ImapFlow, path: string): Promise<MailboxLockObject> {
  return await client.mailboxOpen(path)
}

export async function listMessages(client: ImapFlow, limit = 20): Promise<MessageListItem[]> {
  const uids = await client.search({all: true})
  const last = uids.slice(-limit)
  const items: MessageListItem[] = []
  for await (const msg of client.fetch(last, {envelope: true, flags: true, internalDate: true})) {
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
  for await (const msg of client.fetch(uidList, {envelope: true, flags: true, internalDate: true})) {
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
  const msg = await client.fetchOne(uid, {source: true, envelope: true, internalDate: true})
  const parsed = await simpleParser(msg.source as Buffer)
  return {
    uid,
    subject: parsed.subject || '(no subject)',
    from: parsed.from?.text,
    to: parsed.to?.text,
    date: parsed.date || msg.internalDate || undefined,
    text: parsed.text || undefined,
    html: parsed.html as string | undefined,
    raw: msg.source as Buffer,
    attachments: (parsed.attachments || []).map((a: any) => ({
      filename: a.filename,
      size: typeof a.size === 'number' ? a.size : undefined,
      contentType: a.contentType,
      cid: a.cid || a.contentId,
      content: a.content as Buffer | undefined,
    })),
  }
}

export async function markSeen(client: ImapFlow, uid: number, seen: boolean) {
  if (seen) await client.messageFlagsAdd(uid, ['\\Seen'])
  else await client.messageFlagsRemove(uid, ['\\Seen'])
}
