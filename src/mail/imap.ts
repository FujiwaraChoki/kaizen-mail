import { ImapFlow, MailboxLockObject } from "imapflow";
import type { Account } from "../utils/store";
import { simpleParser } from "mailparser";

export type Mailbox = { path: string; name: string; flags?: string[] };

export interface MessageListItem {
  uid: number;
  subject: string;
  from?: string;
  date?: Date;
  seen: boolean;
  flagged: boolean;
}

export interface AttachmentMeta {
  filename?: string;
  size?: number;
  contentType?: string;
  cid?: string;
  content?: Buffer;
}

export interface ParsedMessage {
  uid: number;
  subject: string;
  from?: string;
  to?: string;
  date?: Date;
  text?: string;
  html?: string;
  raw?: Buffer;
  attachments?: AttachmentMeta[];
}

export interface SearchCriteria {
  from?: string;
  to?: string;
  subject?: string;
  body?: string;
  since?: Date;
  before?: Date;
  unseen?: boolean;
  flagged?: boolean;
  all?: boolean;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

async function retryOperation<T>(operation: () => Promise<T>, retries = MAX_RETRIES, delay = RETRY_DELAY): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      if (attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError || new Error("Operation failed after retries");
}

export async function connectImap(account: Account): Promise<ImapFlow> {
  return retryOperation(async () => {
    const client = new ImapFlow({
      host: account.imap.host,
      port: account.imap.port,
      secure: account.imap.secure,
      auth: { user: account.imap.user, pass: account.imap.password },
      logger: false,
    });
    await client.connect();
    return client;
  });
}

export async function reconnectImap(client: ImapFlow, account: Account): Promise<ImapFlow> {
  try {
    await client.logout();
  } catch {
    // ignore logout errors
  }
  return connectImap(account);
}

export async function listMailboxes(client: ImapFlow): Promise<Mailbox[]> {
  return retryOperation(async () => {
    const result: Mailbox[] = [];
    const boxes = await client.list();
    for (const box of boxes) {
      result.push({ path: box.path, name: box.name, flags: box.flags ? Array.from(box.flags) : undefined });
    }
    return result;
  });
}

export async function openMailbox(client: ImapFlow, path: string): Promise<MailboxLockObject> {
  return retryOperation(async () => {
    return await client.mailboxOpen(path);
  });
}

export async function listMessages(client: ImapFlow, limit = 20): Promise<MessageListItem[]> {
  return retryOperation(async () => {
    const uids = await client.search({ all: true }, { uid: true });
    const last = uids.slice(-limit);
    const items: MessageListItem[] = [];
    for await (const msg of client.fetch(last, { envelope: true, flags: true, internalDate: true }, { uid: true })) {
      items.push({
        uid: msg.uid!,
        subject: msg.envelope?.subject || "(no subject)",
        from: msg.envelope?.from
          ?.map((a) => a.address || a.name)
          .filter(Boolean)
          .join(", "),
        date: msg.internalDate || undefined,
        seen: msg.flags?.has("\\Seen") ?? false,
        flagged: msg.flags?.has("\\Flagged") ?? false,
      });
    }
    items.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
    return items;
  });
}

export async function listMessagesByUids(client: ImapFlow, uidList: number[]): Promise<MessageListItem[]> {
  if (!uidList || uidList.length === 0) return [];
  return retryOperation(async () => {
    const items: MessageListItem[] = [];
    for await (const msg of client.fetch(uidList, { envelope: true, flags: true, internalDate: true }, { uid: true })) {
      items.push({
        uid: msg.uid!,
        subject: msg.envelope?.subject || "(no subject)",
        from: msg.envelope?.from
          ?.map((a) => a.address || a.name)
          .filter(Boolean)
          .join(", "),
        date: msg.internalDate || undefined,
        seen: msg.flags?.has("\\Seen") ?? false,
        flagged: msg.flags?.has("\\Flagged") ?? false,
      });
    }
    items.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
    return items;
  });
}

export async function searchMessages(client: ImapFlow, criteria: SearchCriteria): Promise<number[]> {
  return retryOperation(async () => {
    const query: any = {};

    if (criteria.all) {
      query.all = true;
    }
    if (criteria.from) {
      query.from = criteria.from;
    }
    if (criteria.to) {
      query.to = criteria.to;
    }
    if (criteria.subject) {
      query.subject = criteria.subject;
    }
    if (criteria.body) {
      query.body = criteria.body;
    }
    if (criteria.since) {
      query.since = criteria.since;
    }
    if (criteria.before) {
      query.before = criteria.before;
    }
    if (criteria.unseen) {
      query.unseen = true;
    }
    if (criteria.flagged) {
      query.flagged = true;
    }

    return await client.search(query, { uid: true });
  });
}

export async function fetchMessage(client: ImapFlow, uid: number): Promise<ParsedMessage> {
  return retryOperation(async () => {
    let msg = await client.fetchOne(uid, { source: true, envelope: true, internalDate: true }, { uid: true });
    if (!msg) {
      msg = await client.fetchOne(uid, { source: true, envelope: true, internalDate: true });
    }
    if (!msg) {
      throw new Error("Message not found");
    }

    const source = msg.source as Buffer | undefined;

    if (!source) {
      return {
        uid,
        subject: msg.envelope?.subject || "(no subject)",
        from: msg.envelope?.from
          ?.map((a) => a.address || a.name)
          .filter(Boolean)
          .join(", "),
        to: msg.envelope?.to
          ?.map((a) => a.address || a.name)
          .filter(Boolean)
          .join(", "),
        date: msg.internalDate || undefined,
        text: undefined,
        html: undefined,
        raw: undefined,
        attachments: [],
      };
    }

    try {
      const parsed = await simpleParser(source);
      return {
        uid,
        subject: parsed.subject || msg.envelope?.subject || "(no subject)",
        from:
          parsed.from?.text ||
          msg.envelope?.from
            ?.map((a) => a.address || a.name)
            .filter(Boolean)
            .join(", "),
        to:
          parsed.to?.text ||
          msg.envelope?.to
            ?.map((a) => a.address || a.name)
            .filter(Boolean)
            .join(", "),
        date: parsed.date || msg.internalDate || undefined,
        text: parsed.text || undefined,
        html: (parsed.html as string | undefined) || undefined,
        raw: source,
        attachments: (parsed.attachments || []).map((a: any) => ({
          filename: a.filename,
          size: typeof a.size === "number" ? a.size : undefined,
          contentType: a.contentType,
          cid: a.cid || a.contentId,
          content: a.content as Buffer | undefined,
        })),
      };
    } catch (e) {
      return {
        uid,
        subject: msg.envelope?.subject || "(no subject)",
        from: msg.envelope?.from
          ?.map((a) => a.address || a.name)
          .filter(Boolean)
          .join(", "),
        to: msg.envelope?.to
          ?.map((a) => a.address || a.name)
          .filter(Boolean)
          .join(", "),
        date: msg.internalDate || undefined,
        text: undefined,
        html: undefined,
        raw: source,
        attachments: [],
      };
    }
  });
}

export async function markSeen(client: ImapFlow, uid: number, seen: boolean) {
  return retryOperation(async () => {
    if (seen) await client.messageFlagsAdd(uid, ["\\Seen"], { uid: true });
    else await client.messageFlagsRemove(uid, ["\\Seen"], { uid: true });
  });
}

export async function toggleFlagged(client: ImapFlow, uid: number, flagged: boolean) {
  return retryOperation(async () => {
    if (flagged) await client.messageFlagsAdd(uid, ["\\Flagged"], { uid: true });
    else await client.messageFlagsRemove(uid, ["\\Flagged"], { uid: true });
  });
}

export async function deleteMessage(client: ImapFlow, uid: number) {
  return retryOperation(async () => {
    await client.messageFlagsAdd(uid, ["\\Deleted"], { uid: true });
    await client.expunge();
  });
}

export async function deleteMessages(client: ImapFlow, uids: number[]) {
  return retryOperation(async () => {
    for (const uid of uids) {
      await client.messageFlagsAdd(uid, ["\\Deleted"], { uid: true });
    }
    await client.expunge();
  });
}

export async function moveMessage(client: ImapFlow, uid: number, destination: string) {
  return retryOperation(async () => {
    await client.messageMove(uid, destination, { uid: true });
  });
}

export async function moveMessages(client: ImapFlow, uids: number[], destination: string) {
  return retryOperation(async () => {
    await client.messageMove(uids, destination, { uid: true });
  });
}

export async function markMultipleSeen(client: ImapFlow, uids: number[], seen: boolean) {
  return retryOperation(async () => {
    if (seen) await client.messageFlagsAdd(uids, ["\\Seen"], { uid: true });
    else await client.messageFlagsRemove(uids, ["\\Seen"], { uid: true });
  });
}

export async function markMultipleFlagged(client: ImapFlow, uids: number[], flagged: boolean) {
  return retryOperation(async () => {
    if (flagged) await client.messageFlagsAdd(uids, ["\\Flagged"], { uid: true });
    else await client.messageFlagsRemove(uids, ["\\Flagged"], { uid: true });
  });
}

export async function createMailbox(client: ImapFlow, path: string) {
  return retryOperation(async () => {
    await client.mailboxCreate(path);
  });
}

export async function deleteMailbox(client: ImapFlow, path: string) {
  return retryOperation(async () => {
    await client.mailboxDelete(path);
  });
}

export async function renameMailbox(client: ImapFlow, oldPath: string, newPath: string) {
  return retryOperation(async () => {
    await client.mailboxRename(oldPath, newPath);
  });
}
