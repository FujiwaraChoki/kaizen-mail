import React from 'react'
import {Box, Text} from 'ink'
import SelectInput, {ItemOf} from 'ink-select-input'
import type {Mailbox} from '../../mail/imap.js'

type Item = ItemOf<{label: string; value: string}>

export function MailboxList({items, onSelect}: {items: Mailbox[]; onSelect: (m: Mailbox) => void}) {
  const mapped = items.map((m) => ({label: m.name, value: m.path}))
  return (
    <Box flexDirection="column">
      <Text color="green">Mailboxes</Text>
      <Box marginTop={1}>
        <SelectInput
          items={mapped}
          onSelect={(i: Item) => {
            const m = items.find((mm) => mm.path === i.value)!
            onSelect(m)
          }}
        />
      </Box>
    </Box>
  )
}

