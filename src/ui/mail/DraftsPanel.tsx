import React, { useMemo, useState } from 'react'
import { Box, Text } from 'ink'
import SelectInput, { ItemOf } from 'ink-select-input'
import type { Draft } from '../../utils/drafts.js'
import { format } from 'date-fns'

type Item = ItemOf<{ label: string; value: string }>

export function DraftsPanel({
  drafts,
  onOpen,
  onDelete,
  onClose,
}: {
  drafts: Draft[]
  onOpen: (draft: Draft) => void
  onDelete: (id: string) => void
  onClose: () => void
}) {
  const list = useMemo(
    () =>
      drafts.map((d) => ({
        label: renderDraftRow(d),
        value: d.id,
      })),
    [drafts]
  )

  const [selectedId, setSelectedId] = useState<string | null>(null)

  if (drafts.length === 0) {
    return (
      <Box flexDirection="column" borderStyle="round" padding={1}>
        <Text color="cyan">Drafts</Text>
        <Text dimColor marginTop={1}>
          No drafts saved
        </Text>
        <Text dimColor marginTop={1}>
          Press Esc to close
        </Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" borderStyle="round" padding={1}>
      <Text color="cyan">Drafts ({drafts.length})</Text>
      <Box marginTop={1}>
        <SelectInput
          items={list}
          onSelect={(i: Item) => {
            const draft = drafts.find((d) => d.id === i.value)
            if (draft) onOpen(draft)
          }}
          onHighlight={(i: Item) => {
            setSelectedId(i.value)
          }}
        />
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Enter open · d delete · Esc close</Text>
      </Box>
    </Box>
  )
}

function renderDraftRow(d: Draft): string {
  const date = format(new Date(d.updatedAt), 'MMM d HH:mm')
  const to = (d.to || '(no recipient)').padEnd(25).slice(0, 25)
  const subj = (d.subject || '(no subject)').slice(0, 40)
  return `${date}  To: ${to}  ${subj}`
}
