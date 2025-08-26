import React, {useState} from 'react'
import {Box, Text, useInput, useStdin} from 'ink'
import TextInput from 'ink-text-input'
import type {SignatureConfig} from '../../utils/store.js'

export function Settings({
  signature,
  onToggleEnabled,
  onToggleFormat,
  onSetContent,
  onClear,
  onClose,
}: {
  signature?: SignatureConfig
  onToggleEnabled: (enabled: boolean) => void
  onToggleFormat: () => void
  onSetContent: (content: string, format: 'text' | 'html') => void
  onClear: () => void
  onClose: () => void
}) {
  const {isRawModeSupported} = useStdin()
  const [pathMode, setPathMode] = useState(false)
  const [path, setPath] = useState('')

  useInput((input, key) => {
    if (pathMode) return
    if (key.escape || input.toLowerCase() === 'b') onClose()
    else if (input.toLowerCase() === 'g') onToggleEnabled(!(signature?.enabled ?? false))
    else if (input.toLowerCase() === 'f') onToggleFormat()
    else if (input.toLowerCase() === 'e') {
      setPathMode(true)
      setPath('')
    } else if (input.toLowerCase() === 'c') onClear()
  }, {isActive: isRawModeSupported})

  useInput((input, key) => {
    if (!pathMode) return
    if (key.escape) {
      setPathMode(false)
      setPath('')
    }
  }, {isActive: isRawModeSupported && pathMode})

  return (
    <Box flexDirection="column">
      <Text color="green">Settings</Text>
      <Box marginTop={1} flexDirection="column">
        <Text color="cyan">Signature</Text>
        <Text>Enabled: {signature?.enabled ? 'Yes' : 'No'}</Text>
        <Text>Format: {signature?.format || 'text'}</Text>
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>Current content preview:</Text>
          <Box borderStyle="round" paddingX={1} paddingY={0} width={80}>
            <Text>{(signature?.content || '').slice(0, 200) || '(empty)'}</Text>
          </Box>
        </Box>
        {pathMode && (
          <Box marginTop={1}>
            <Text dimColor>Load signature from file (.txt/.html): </Text>
            <TextInput
              value={path}
              onChange={setPath}
              focus={pathMode}
              onSubmit={() => {
                try {
                  const fs = require('fs') as typeof import('fs')
                  const p = path.trim()
                  if (!p) return setPathMode(false)
                  const content = fs.readFileSync(p, 'utf8')
                  const ext = p.toLowerCase().endsWith('.html') || p.toLowerCase().endsWith('.htm') ? 'html' : 'text'
                  onSetContent(content, ext as 'text' | 'html')
                } catch (e: any) {
                  // Show a brief error line below
                } finally {
                  setPathMode(false)
                  setPath('')
                }
              }}
              placeholder="/path/to/signature.(txt|html)"
            />
            <Text dimColor> (Enter to set, Esc to cancel)</Text>
          </Box>
        )}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>g toggle · f toggle format · e set from file · c clear · b/Esc back</Text>
      </Box>
    </Box>
  )
}

