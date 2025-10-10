import React, { useState } from 'react'
import { Box, Text, useInput, useStdin } from 'ink'
import TextInput from 'ink-text-input'

export interface SearchFilters {
  from?: string
  to?: string
  subject?: string
  body?: string
  unreadOnly?: boolean
  flaggedOnly?: boolean
  dateFrom?: string
  dateTo?: string
}

type Field = 'from' | 'to' | 'subject' | 'body' | 'dateFrom' | 'dateTo' | 'done'

export function SearchPanel({
  onSearch,
  onClose,
}: {
  onSearch: (filters: SearchFilters) => void
  onClose: () => void
}) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [flaggedOnly, setFlaggedOnly] = useState(false)
  const [focus, setFocus] = useState<Field>('from')

  const { isRawModeSupported } = useStdin()

  useInput(
    (input, key) => {
      if (key.escape) {
        onClose()
      } else if (key.tab) {
        const fields: Field[] = ['from', 'to', 'subject', 'body', 'dateFrom', 'dateTo', 'done']
        const currentIndex = fields.indexOf(focus)
        const nextIndex = (currentIndex + 1) % fields.length
        setFocus(fields[nextIndex]!)
      } else if (key.shift && key.tab) {
        const fields: Field[] = ['from', 'to', 'subject', 'body', 'dateFrom', 'dateTo', 'done']
        const currentIndex = fields.indexOf(focus)
        const prevIndex = (currentIndex - 1 + fields.length) % fields.length
        setFocus(fields[prevIndex]!)
      } else if (focus === 'done' && key.return) {
        const filters: SearchFilters = {}
        if (from) filters.from = from
        if (to) filters.to = to
        if (subject) filters.subject = subject
        if (body) filters.body = body
        if (dateFrom) filters.dateFrom = dateFrom
        if (dateTo) filters.dateTo = dateTo
        if (unreadOnly) filters.unreadOnly = true
        if (flaggedOnly) filters.flaggedOnly = true
        onSearch(filters)
      } else if (input === 'u') {
        setUnreadOnly(!unreadOnly)
      } else if (input === 'f') {
        setFlaggedOnly(!flaggedOnly)
      } else if (input === 'c') {
        // Clear all
        setFrom('')
        setTo('')
        setSubject('')
        setBody('')
        setDateFrom('')
        setDateTo('')
        setUnreadOnly(false)
        setFlaggedOnly(false)
      }
    },
    { isActive: isRawModeSupported }
  )

  return (
    <Box flexDirection="column" borderStyle="round" padding={1}>
      <Text color="cyan" bold>
        Search / Filter Emails
      </Text>
      <Box marginTop={1}>
        <Text dimColor>From: </Text>
        <TextInput
          value={from}
          onChange={setFrom}
          focus={focus === 'from'}
          placeholder="sender@example.com"
        />
      </Box>
      <Box marginTop={1}>
        <Text dimColor>To: </Text>
        <TextInput value={to} onChange={setTo} focus={focus === 'to'} placeholder="recipient@example.com" />
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Subject: </Text>
        <TextInput
          value={subject}
          onChange={setSubject}
          focus={focus === 'subject'}
          placeholder="keyword"
        />
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Body: </Text>
        <TextInput value={body} onChange={setBody} focus={focus === 'body'} placeholder="text search" />
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Date From (YYYY-MM-DD): </Text>
        <TextInput
          value={dateFrom}
          onChange={setDateFrom}
          focus={focus === 'dateFrom'}
          placeholder="2024-01-01"
        />
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Date To (YYYY-MM-DD): </Text>
        <TextInput
          value={dateTo}
          onChange={setDateTo}
          focus={focus === 'dateTo'}
          placeholder="2024-12-31"
        />
      </Box>
      <Box marginTop={1}>
        <Text>
          {unreadOnly ? '[✓] ' : '[ ] '}
          <Text dimColor>Unread only (u)</Text>
        </Text>
      </Box>
      <Box>
        <Text>
          {flaggedOnly ? '[✓] ' : '[ ] '}
          <Text dimColor>Flagged only (f)</Text>
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text color={focus === 'done' ? 'green' : 'dim'}>
          {focus === 'done' ? '› ' : '  '}Search (Enter)
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Tab/Shift+Tab navigate · u unread · f flagged · c clear · Esc cancel</Text>
      </Box>
    </Box>
  )
}
