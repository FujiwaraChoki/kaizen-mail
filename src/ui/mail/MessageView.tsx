import React, {useEffect, useMemo, useState} from 'react'
import {Box, Text, useInput, useStdin} from 'ink'
import TextInput from 'ink-text-input'
import {SpinnerLine} from '../shared/SpinnerLine.js'
import type {ParsedMessage} from '../../mail/imap.js'
import fs from 'fs'
import path from 'path'

type ForwardChoice = 'none' | 'original' | 'all' | 'pick' | null

export function MessageView({uid, client, fetcher, onBack, onReply, onForward}: {uid: number; client: any; fetcher: (client: any, uid: number) => Promise<ParsedMessage>; onBack: () => void; onReply: (m: ParsedMessage) => void; onForward: (m: ParsedMessage, opts?: {attachOriginalEml?: boolean; attachments?: {filename?: string; content?: any; contentType?: string}[]}) => void}) {
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<ParsedMessage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savingDir, setSavingDir] = useState<string>('')
  const [savePrompt, setSavePrompt] = useState(false)
  const [forwardChoice, setForwardChoice] = useState<ForwardChoice>(null)
  const [pickIndex, setPickIndex] = useState<number>(0)
  const [picked, setPicked] = useState<Set<number>>(new Set())

  const {isRawModeSupported} = useStdin()
  useInput((input, key) => {
    if (!msg) return
    if (savePrompt) return
    if (forwardChoice && forwardChoice !== 'pick') return
    if (input.toLowerCase() === 'b' || key.escape) onBack()
    if (input.toLowerCase() === 's' && (msg.attachments?.length || 0) > 0) {
      setSavePrompt(true)
      setSavingDir('')
    }
    if (input.toLowerCase() === 'r') onReply(msg)
    if (input.toLowerCase() === 'f') {
      if ((msg.attachments?.length || 0) === 0) {
        onForward(msg, {attachOriginalEml: true})
      } else {
        setForwardChoice('none') // will show choice UI
      }
    }
  }, {isActive: isRawModeSupported})

  // Save prompt cancel with ESC
  useInput((input, key) => {
    if (!savePrompt) return
    if (key.escape) {
      setSavePrompt(false)
      setSavingDir('')
    }
  }, {isActive: isRawModeSupported && savePrompt})

  // Handle forward choice input
  useInput((input, key) => {
    if (!msg) return
    if (forwardChoice === null) return
    if (forwardChoice !== 'pick') {
      if (input === '1') {
        // none
        onForward(msg, {attachOriginalEml: false, attachments: []})
        setForwardChoice(null)
      } else if (input === '2') {
        onForward(msg, {attachOriginalEml: true})
        setForwardChoice(null)
      } else if (input === '3') {
        onForward(msg, {attachments: (msg.attachments || []).map(a => ({filename: a.filename, content: a.content, contentType: a.contentType}))})
        setForwardChoice(null)
      } else if (input === '4') {
        setForwardChoice('pick')
        setPicked(new Set())
        setPickIndex(0)
      } else if (key.escape) {
        setForwardChoice(null)
      }
    } else {
      // pick mode
      if (key.upArrow) setPickIndex(i => Math.max(0, i - 1))
      else if (key.downArrow) setPickIndex(i => Math.min((msg.attachments?.length || 1) - 1, i + 1))
      else if (input === ' ') {
        setPicked(prev => {
          const n = new Set(prev)
          if (n.has(pickIndex)) n.delete(pickIndex)
          else n.add(pickIndex)
          return n
        })
      } else if (key.return) {
        const selected = Array.from(picked.values()).sort((a,b)=>a-b)
        const atts = (msg.attachments || [])
          .map((a, idx) => ({idx, a}))
          .filter(({idx}) => selected.includes(idx))
          .map(({a}) => ({filename: a.filename, content: a.content, contentType: a.contentType}))
        onForward(msg, {attachments: atts})
        setForwardChoice(null)
      } else if (key.escape || input.toLowerCase() === 'q') {
        setForwardChoice(null)
      }
    }
  }, {isActive: isRawModeSupported && (forwardChoice !== null)})

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        const m = await fetcher(client, uid)
        setMsg(m)
      } catch (e: any) {
        setError(e.message || 'Failed to load message')
      } finally {
        setLoading(false)
      }
    })()
  }, [client, uid])

  if (loading) return <SpinnerLine label="Loading message…" />
  if (error) return <Text color="red">{error}</Text>
  if (!msg) return null

  return (
    <Box flexDirection="column">
      <Text>
        <Text color="green">Subject:</Text> {msg.subject}
      </Text>
      {msg.from && (
        <Text>
          <Text color="green">From:</Text> {msg.from}
        </Text>
      )}
      {msg.to && (
        <Text>
          <Text color="green">To:</Text> {msg.to}
        </Text>
      )}
      <Box marginTop={1}>
        <Text>{msg.text || '[no text body]'}</Text>
      </Box>
      {msg.attachments && msg.attachments.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text color="green">Attachments ({msg.attachments.length})</Text>
          {msg.attachments.map((a, i) => (
            <Text key={i}>
              {forwardChoice === 'pick' && (i === pickIndex ? '› ' : '  ')}
              {forwardChoice === 'pick' && (picked.has(i) ? '[x] ' : '[ ] ')}
              📎 {a.filename || '(unnamed)'}{a.size ? ` — ${a.size} bytes` : ''}{a.contentType ? ` — ${a.contentType}` : ''}
            </Text>
          ))}
          {forwardChoice === 'pick' && (
            <Text dimColor>Use ↑/↓ to move, space to toggle, Enter to confirm, Esc to cancel</Text>
          )}
        </Box>
      )}
      {!savePrompt && forwardChoice === null && (
        <Box marginTop={1}>
          <Text dimColor>r reply · f forward · s save attachments · b back</Text>
        </Box>
      )}
      {savePrompt && (
        <Box marginTop={1}>
          <Text color="green">Save attachments to directory:</Text>
          <Box>
            <TextInput
              value={savingDir}
              onChange={setSavingDir}
              placeholder="/path/to/folder"
              onSubmit={() => {
                try {
                  const dir = savingDir.trim()
                  if (!dir || !msg) return
                  fs.mkdirSync(dir, {recursive: true})
                  for (const [i, a] of (msg.attachments || []).entries()) {
                    const name = a.filename || `attachment-${i+1}`
                    const safe = name.replace(/[\n\r\t]/g, ' ').slice(0, 200)
                    const p = path.join(dir, safe)
                    const content = a.content
                    if (content) fs.writeFileSync(p, content)
                  }
                } catch {}
                setSavePrompt(false)
                setSavingDir('')
              }}
            />
            <Text dimColor>  (Enter to save, Esc to cancel)</Text>
          </Box>
        </Box>
      )}
      {forwardChoice !== null && forwardChoice !== 'pick' && (
        <Box marginTop={1} flexDirection="column">
          <Text color="green">Forward options</Text>
          <Text>1) No attachments</Text>
          <Text>2) Attach original email (.eml)</Text>
          <Text>3) Include all attachments</Text>
          <Text>4) Pick attachments…</Text>
          <Text dimColor>Press 1-4 or Esc to cancel</Text>
        </Box>
      )}
    </Box>
  )
}
