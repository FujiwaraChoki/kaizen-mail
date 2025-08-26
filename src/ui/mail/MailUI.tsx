import React, {useEffect, useMemo, useState} from 'react'
import {Box, Text, useInput, useStdin} from 'ink'
import {getStore} from '../../utils/store.js'
import type {Account} from '../../utils/store.js'
import {connectImap, fetchMessage, listMailboxes, listMessagesByUids, openMailbox, type MessageListItem, type Mailbox} from '../../mail/imap.js'
import {SpinnerLine} from '../shared/SpinnerLine.js'
import {MailboxList} from './MailboxList.js'
import {MessageList} from './MessageList.js'
import {MessageView} from './MessageView.js'
import {Compose} from './Compose.js'
import type {ParsedMessage} from '../../mail/imap.js'

type Screen = 'mailboxes' | 'messages' | 'reader' | 'compose'

export function MailUI({encryptionKey, onQuit}: {encryptionKey: string; onQuit: () => void}) {
  const store = useMemo(() => getStore(encryptionKey), [encryptionKey])
  const account = store.get('account') as Account
  const [loading, setLoading] = useState(true)
  const [client, setClient] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [screen, setScreen] = useState<Screen>('mailboxes')
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([])
  const [selectedMailbox, setSelectedMailbox] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageListItem[]>([])
  const [uids, setUids] = useState<number[]>([])
  const [page, setPage] = useState(0)
  const pageSize = 20
  const [selectedMessage, setSelectedMessage] = useState<number | null>(null)
  const [composeInit, setComposeInit] = useState<{to?: string; subject?: string; body?: string; attachments?: {filename?: string; content?: any; path?: string; contentType?: string; cid?: string}[]} | null>(null)

  const {isRawModeSupported} = useStdin()
  useInput((input, key) => {
    if (input.toLowerCase() === 'q') onQuit()
    if (input.toLowerCase() === 'b') {
      if (screen === 'reader') setScreen('messages')
      else if (screen === 'messages') setScreen('mailboxes')
    }
    if (input.toLowerCase() === 'c') setScreen('compose')
    if (input.toLowerCase() === 'r' && screen === 'messages' && selectedMailbox) void refreshMessages()
    if (input.toLowerCase() === 'n' && screen === 'messages') void nextPage()
    if (input.toLowerCase() === 'p' && screen === 'messages') void prevPage()
  }, {isActive: isRawModeSupported})

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        const c = await connectImap(account)
        setClient(c)
        const boxes = await listMailboxes(c)
        setMailboxes(boxes)
        const last = store.get('lastSelectedMailbox') || 'INBOX'
        setSelectedMailbox(last)
        await openMailbox(c, last)
        const all = await c.search({all: true})
        setUids(all)
        setPage(0)
        const pageUids = slicePage(all, 0, pageSize)
        const msgs = await listMessagesByUids(c, pageUids)
        setMessages(msgs)
        setScreen('messages')
      } catch (e: any) {
        setError(e.message || 'Failed to connect')
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function openBox(path: string) {
    if (!client) return
    setLoading(true)
    setError(null)
    try {
      await openMailbox(client, path)
      const all = await client.search({all: true})
      setUids(all)
      setPage(0)
      const pageUids = slicePage(all, 0, pageSize)
      const msgs = await listMessagesByUids(client, pageUids)
      setSelectedMailbox(path)
      store.set('lastSelectedMailbox', path)
      setMessages(msgs)
      setScreen('messages')
    } catch (e: any) {
      setError(e.message || 'Failed to open mailbox')
    } finally {
      setLoading(false)
    }
  }

  async function refreshMessages() {
    if (!client) return
    setLoading(true)
    setError(null)
    try {
      const all = await client.search({all: true})
      setUids(all)
      setPage(0)
      const pageUids = slicePage(all, 0, pageSize)
      const msgs = await listMessagesByUids(client, pageUids)
      setMessages(msgs)
    } catch (e: any) {
      setError(e.message || 'Failed to refresh')
    } finally {
      setLoading(false)
    }
  }

  function totalPages(): number {
    return Math.max(1, Math.ceil(uids.length / pageSize))
  }

  function slicePage(allUids: number[], pageIndex: number, size: number): number[] {
    // allUids returned ascending; we want newest first
    const total = allUids.length
    const end = total - pageIndex * size
    const start = Math.max(0, end - size)
    return allUids.slice(start, end)
  }

  async function loadPage(pageIndex: number) {
    if (!client) return
    const maxPages = totalPages()
    const p = Math.min(Math.max(0, pageIndex), maxPages - 1)
    setPage(p)
    const pageUids = slicePage(uids, p, pageSize)
    const msgs = await listMessagesByUids(client, pageUids)
    setMessages(msgs)
  }

  async function nextPage() {
    if (page + 1 < totalPages()) await loadPage(page + 1)
  }

  async function prevPage() {
    if (page > 0) await loadPage(page - 1)
  }

  function prefixSubject(prefix: string, subject?: string) {
    const s = (subject || '').trim()
    if (!s) return `${prefix}: `
    const re = new RegExp(`^${prefix}\\s*:`, 'i')
    return re.test(s) ? s : `${prefix}: ${s}`
  }

  function quoteBody(msg: ParsedMessage) {
    const original = msg.text || ''
    const quoted = original.split('\n').map((l) => `> ${l}`).join('\n')
    const header = `On ${msg.date ? msg.date.toLocaleString() : 'unknown date'}, ${msg.from || 'unknown'} wrote:`
    return `\n\n${header}\n${quoted}`
  }

  function openReply(msg: ParsedMessage) {
    setComposeInit({
      to: msg.from || '',
      subject: prefixSubject('Re', msg.subject),
      body: quoteBody(msg),
    })
    setScreen('compose')
  }

  function openForward(msg: ParsedMessage, opts?: {attachOriginalEml?: boolean; attachments?: {filename?: string; content?: any; contentType?: string}[]}) {
    const hdr = [
      '----- Forwarded message -----',
      `From: ${msg.from || ''}`,
      `Date: ${msg.date ? msg.date.toLocaleString() : ''}`,
      `Subject: ${msg.subject || ''}`,
      `To: ${msg.to || ''}`,
      '',
    ].join('\n')
    const init: {to?: string; subject?: string; body?: string; attachments?: {filename?: string; content?: any; contentType?: string}[]} = {
      to: '',
      subject: prefixSubject('Fwd', msg.subject),
      body: `${hdr}\n${msg.text || ''}`,
    }
    if (opts?.attachments && opts.attachments.length > 0) {
      init.attachments = opts.attachments
    } else if (opts?.attachOriginalEml && msg.raw) {
      init.attachments = [
        {
          filename: msg.subject ? `${msg.subject}.eml` : 'forwarded-message.eml',
          content: msg.raw,
          contentType: 'message/rfc822',
        },
      ]
    }
    setComposeInit(init)
    setScreen('compose')
  }

  if (loading)
    return (
      <Box flexDirection="column">
        <Header account={account} />
        <SpinnerLine label="Connecting…" />
      </Box>
    )

  if (error)
    return (
      <Box flexDirection="column">
        <Header account={account} />
        <Text color="red">{error}</Text>
      </Box>
    )

  return (
    <Box flexDirection="column">
      <Header account={account} />
      {screen === 'mailboxes' && <MailboxList items={mailboxes} onSelect={(m) => openBox(m.path)} />}
      {screen === 'messages' && (
        <MessageList
          mailbox={selectedMailbox || 'INBOX'}
          items={messages}
          page={page}
          totalPages={totalPages()}
          onOpen={(uid) => {
            setSelectedMessage(uid)
            setScreen('reader')
          }}
        />
      )}
      {screen === 'reader' && selectedMessage && client && (
        <MessageView
          uid={selectedMessage}
          client={client}
          onBack={() => setScreen('messages')}
          fetcher={fetchMessage}
          onReply={(m) => openReply(m)}
          onForward={(m, opts) => openForward(m, opts)}
        />
      )}
      {screen === 'compose' && (
        <Compose 
          account={account} 
          onClose={() => {
            setComposeInit(null)
            setScreen('messages')
          }}
          initialTo={composeInit?.to}
          initialSubject={composeInit?.subject}
          initialBody={composeInit?.body}
          initialAttachments={composeInit?.attachments}
        />
      )}
    </Box>
  )
}

function Header({account}: {account: Account}) {
  return (
    <Box marginBottom={1} justifyContent="space-between">
      <Text color="cyan">Kaizen Mail</Text>
      <Text dimColor>{account.email}</Text>
    </Box>
  )
}
