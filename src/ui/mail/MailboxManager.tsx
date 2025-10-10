import React, { useState } from 'react'
import { Box, Text, useInput, useStdin } from 'ink'
import TextInput from 'ink-text-input'
import type { Mailbox } from '../../mail/imap.js'

type Mode = 'list' | 'create' | 'delete' | 'rename'

export function MailboxManager({
  mailboxes,
  onCreate,
  onDelete,
  onRename,
  onClose,
}: {
  mailboxes: Mailbox[]
  onCreate: (path: string) => Promise<void>
  onDelete: (path: string) => Promise<void>
  onRename: (oldPath: string, newPath: string) => Promise<void>
  onClose: () => void
}) {
  const [mode, setMode] = useState<Mode>('list')
  const [newPath, setNewPath] = useState('')
  const [selectedPath, setSelectedPath] = useState('')
  const [renameTo, setRenameTo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { isRawModeSupported } = useStdin()

  useInput(
    (input, key) => {
      if (mode === 'list') {
        if (key.escape) {
          onClose()
        } else if (input === 'n') {
          setMode('create')
          setNewPath('')
        }
      } else {
        if (key.escape) {
          setMode('list')
          setError(null)
        }
      }
    },
    { isActive: isRawModeSupported }
  )

  async function handleCreate() {
    try {
      setError(null)
      await onCreate(newPath)
      setMode('list')
      setNewPath('')
    } catch (e: any) {
      setError(e.message || 'Failed to create mailbox')
    }
  }

  async function handleDelete() {
    try {
      setError(null)
      await onDelete(selectedPath)
      setMode('list')
      setSelectedPath('')
    } catch (e: any) {
      setError(e.message || 'Failed to delete mailbox')
    }
  }

  async function handleRename() {
    try {
      setError(null)
      await onRename(selectedPath, renameTo)
      setMode('list')
      setSelectedPath('')
      setRenameTo('')
    } catch (e: any) {
      setError(e.message || 'Failed to rename mailbox')
    }
  }

  return (
    <Box flexDirection="column" borderStyle="round" padding={1}>
      <Text color="cyan" bold>
        Mailbox Management
      </Text>

      {error && (
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}

      {mode === 'list' && (
        <>
          <Box marginTop={1} flexDirection="column">
            <Text dimColor>Mailboxes:</Text>
            {mailboxes.map((mb, idx) => (
              <Text key={idx}>
                📁 {mb.name || mb.path}
              </Text>
            ))}
          </Box>
          <Box marginTop={1}>
            <Text dimColor>n create new · Esc close</Text>
          </Box>
        </>
      )}

      {mode === 'create' && (
        <>
          <Box marginTop={1}>
            <Text dimColor>New mailbox name: </Text>
            <TextInput
              value={newPath}
              onChange={setNewPath}
              focus={true}
              placeholder="Folder/Subfolder"
              onSubmit={handleCreate}
            />
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Enter create · Esc cancel</Text>
          </Box>
        </>
      )}

      {mode === 'delete' && (
        <>
          <Box marginTop={1}>
            <Text dimColor>Delete mailbox: </Text>
            <TextInput
              value={selectedPath}
              onChange={setSelectedPath}
              focus={true}
              placeholder="INBOX/Archive"
              onSubmit={handleDelete}
            />
          </Box>
          <Box marginTop={1}>
            <Text color="red">Warning: This will permanently delete the mailbox</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Enter confirm · Esc cancel</Text>
          </Box>
        </>
      )}

      {mode === 'rename' && (
        <>
          <Box marginTop={1}>
            <Text dimColor>Old name: </Text>
            <TextInput
              value={selectedPath}
              onChange={setSelectedPath}
              focus={renameTo === ''}
              placeholder="INBOX/OldName"
            />
          </Box>
          <Box marginTop={1}>
            <Text dimColor>New name: </Text>
            <TextInput
              value={renameTo}
              onChange={setRenameTo}
              focus={selectedPath !== ''}
              placeholder="INBOX/NewName"
              onSubmit={handleRename}
            />
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Enter confirm · Esc cancel</Text>
          </Box>
        </>
      )}
    </Box>
  )
}
