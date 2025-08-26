import React, {useMemo} from 'react'
import {Box, Text} from 'ink'
import SelectInput, {ItemOf} from 'ink-select-input'
import type {MessageListItem} from '../../mail/imap.js'
import {format} from 'date-fns'

type Item = ItemOf<{label: string; value: number}>

export function MessageList({mailbox, items, onOpen, page, totalPages}: {mailbox: string; items: MessageListItem[]; onOpen: (uid: number) => void; page?: number; totalPages?: number}) {
  const list = useMemo(() => items.map((m) => ({
    label: renderMessageRow(m),
    value: m.uid,
  })), [items])

  return (
    <Box flexDirection="column">
      <Text color="green">{mailbox} — {items.length} messages{typeof page === 'number' && typeof totalPages === 'number' ? ` (Page ${page + 1}/${totalPages})` : ''}</Text>
      <Box marginTop={1}>
        <SelectInput
          items={list}
          onSelect={(i: Item) => onOpen(i.value)}
        />
      </Box>
      <Box marginTop={1}>
        <Text dimColor>R refresh · n next page · p prev page · c compose · o settings · b back</Text>
      </Box>
    </Box>
  )
}

function renderMessageRow(m: MessageListItem): string {
  const date = m.date ? format(m.date, 'MMM d HH:mm') : ''
  const seen = m.seen ? ' ' : '●'
  const from = (m.from || '').padEnd(20).slice(0, 20)
  const subj = m.subject.replace(/\s+/g, ' ').slice(0, 60)
  return `${seen} ${date}  ${from}  ${subj}`
}
