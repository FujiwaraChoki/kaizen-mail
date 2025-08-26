import React, {useState} from 'react'
import {Box, Text, useInput, useStdin} from 'ink'
import TextInput from 'ink-text-input'
import {SpinnerLine} from '../shared/SpinnerLine.js'
import {getStoreSafe} from '../../utils/store.js'

export function Unlock({onUnlock, onReset}: {onUnlock: (key: string) => void; onReset: () => void}) {
  const [key, setKey] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {isRawModeSupported} = useStdin()
  useInput((input, k) => {
    if (k.return && !submitting) submit()
  }, {isActive: isRawModeSupported})

  async function submit() {
    setSubmitting(true)
    setError(null)
    try {
      if (!key) throw new Error('Master password is required')
      // Validate decryption
      getStoreSafe(key)
      onUnlock(key)
    } catch (e: any) {
      setError(e.message || 'Failed to unlock')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box flexDirection="column">
      <Text color="green">🔐 Unlock Kaizen Mail</Text>
      <Box marginTop={1}>
        <Text dimColor>Enter master password: </Text>
        <TextInput value={key} onChange={setKey} mask="•" placeholder="Master password" />
      </Box>
      {error && (
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}
      {submitting ? (
        <Box marginTop={1}>
          <SpinnerLine label="Unlocking…" />
        </Box>
      ) : (
        <Box marginTop={1}>
          <Text dimColor>Press Enter to unlock · or press r to reset</Text>
        </Box>
      )}
    </Box>
  )
}
