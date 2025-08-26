import React, {useEffect, useState} from 'react'
import {Box, Text, useInput, useStdin} from 'ink'
import TextInput from 'ink-text-input'
import type {Account} from '../../utils/store'
import {sendMail, type Attachment} from '../../mail/smtp.js'
import fs from 'fs'
import path from 'path'
import {lookup as lookupMime} from 'mime-types'
import {SpinnerLine} from '../shared/SpinnerLine.js'

type Field = 'to' | 'subject' | 'body'

export function Compose({account, onClose, initialTo, initialSubject, initialBody, initialAttachments}: {account: Account; onClose: () => void; initialTo?: string; initialSubject?: string; initialBody?: string; initialAttachments?: Attachment[]}) {
  const [to, setTo] = useState(initialTo || '')
  const [subject, setSubject] = useState(initialSubject || '')
  const [body, setBody] = useState(initialBody || '')
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments || [])
  const [focus, setFocus] = useState<Field>('to')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentInfo, setSentInfo] = useState<string | null>(null)
  const [addingPath, setAddingPath] = useState(false)
  const [attachPath, setAttachPath] = useState('')

  const {isRawModeSupported} = useStdin()
  useInput((input, key) => {
    if (addingPath) return
    if (key.tab) {
      setFocus((f) => (f === 'to' ? 'subject' : f === 'subject' ? 'body' : 'to'))
    } else if (key.shift && key.tab) {
      setFocus((f) => (f === 'body' ? 'subject' : f === 'subject' ? 'to' : 'body'))
    } else if (key.escape) {
      onClose()
    } else if (key.ctrl && input === 's') {
      void doSend()
    } else if (key.ctrl && key.return) {
      setBody((b) => b + '\n')
    } else if (focus === 'body' && key.return) {
      // default Enter adds newline in body
      setBody((b) => b + '\n')
    } else if (focus === 'body' && key.ctrl && input.toLowerCase() === 'a') {
      // Start add-attachment prompt (Ctrl+A) without interfering with typing
      setAddingPath(true)
      setAttachPath('')
    } else if (focus === 'body' && key.ctrl && input.toLowerCase() === 'r') {
      // Remove last attachment (Ctrl+R)
      setAttachments((arr) => arr.slice(0, -1))
    } else if (focus === 'body' && key.ctrl && input.toLowerCase() === 'd') {
      // Clear all attachments (Ctrl+D). Avoid Ctrl+C which can signal SIGINT in terminals.
      setAttachments([])
    } else if (focus === 'body') {
      // Basic body text editing: backspace/delete and character input
      if (key.backspace || key.delete) {
        setBody((b) => b.slice(0, -1))
      } else if (!key.ctrl && !key.meta && !key.tab && !key.return && input && input.length === 1) {
        setBody((b) => b + input)
      }
    }
  }, {isActive: isRawModeSupported})

  // While adding a path, allow ESC to cancel the path prompt
  useInput((input, key) => {
    if (key.escape) {
      setAddingPath(false)
      setAttachPath('')
    }
  }, {isActive: isRawModeSupported && addingPath})

  async function doSend() {
    if (!to) {
      setError('Recipient is required')
      return
    }
    setSending(true)
    setError(null)
    try {
      const info = await sendMail(account, {to, subject, text: body, attachments})
      setSentInfo(typeof info?.messageId === 'string' ? info.messageId : 'sent')
      // brief success then close
      setTimeout(() => onClose(), 600)
    } catch (e: any) {
      setError(e.message || 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    // noop - ensures useInput registered
  }, [])

  return (
    <Box flexDirection="column">
      <Text color="green">Compose</Text>
      <Box marginTop={1}>
        <Text dimColor>To: </Text>
        <TextInput value={to} onChange={setTo} focus={!addingPath && focus === 'to'} placeholder="person@example.com" />
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text dimColor>Attachments: {attachments.length > 0 ? '' : '(none)'}</Text>
        {attachments.map((a, i) => (
          <Text key={i}>📎 {a.filename || '(unnamed)'}{typeof a.content === 'string' ? '' : ''}</Text>
        ))}
        {addingPath && (
          <Box>
            <Text dimColor>Path: </Text>
            <TextInput
              value={attachPath}
              onChange={setAttachPath}
              focus={addingPath}
              onSubmit={() => {
                try {
                  const p = attachPath.trim()
                  if (!p) return setAddingPath(false)
                  const content = fs.readFileSync(p)
                  const filename = path.basename(p)
                  const contentType = (lookupMime(filename) || 'application/octet-stream') as string
                  setAttachments((arr) => [...arr, {filename, content, contentType}])
                  setAddingPath(false)
                } catch (e: any) {
                  setError(`Failed to add attachment: ${e.message || e}`)
                  setAddingPath(false)
                }
              }}
              placeholder="/path/to/file"
            />
            <Text dimColor> (Enter to add, Esc to cancel)</Text>
          </Box>
        )}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Subject: </Text>
        <TextInput value={subject} onChange={setSubject} focus={!addingPath && focus === 'subject'} placeholder="Hello" />
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text dimColor>Body: </Text>
        <Box borderStyle="round" paddingX={1} paddingY={0} width={80}>
          <Text>{focus === 'body' ? body + '▌' : body}</Text>
        </Box>
      </Box>
      {error && (
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}
      {sending ? (
        <Box marginTop={1}>
          <SpinnerLine label="Sending…" />
        </Box>
      ) : (
        <Box marginTop={1}>
          <Text dimColor>tab next · shift+tab prev · type to write · backspace delete · ctrl+enter newline · ctrl+s send · esc cancel · ctrl+a add file · ctrl+r remove last · ctrl+d clear attachments</Text>
        </Box>
      )}
      {attachments.length > 0 && (
        <Box marginTop={1}>
          <Text dimColor>{attachments.length} attachment{attachments.length > 1 ? 's' : ''} will be sent</Text>
        </Box>
      )}
      {sentInfo && (
        <Box marginTop={1}>
          <Text color="green">Sent ✓</Text>
        </Box>
      )}
    </Box>
  )
}
