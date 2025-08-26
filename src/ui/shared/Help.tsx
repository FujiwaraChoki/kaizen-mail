import React from 'react'
import {Box, Text} from 'ink'

export function Help({onClose}: {onClose: () => void}) {
  return (
    <Box flexDirection="column">
      <Text color="green">Kaizen Mail — Help</Text>
      <Text>Global: q quit, b back, ? help</Text>
      <Text>Lists: arrows to move, enter to select</Text>
      <Text>Mailbox: R refresh, n next page, p prev page, c compose</Text>
      <Text>Reader: r reply, f forward (pick attachments), s save attachments</Text>
      <Text>Compose: tab/shift+tab navigate, ctrl+s send, esc cancel, ctrl+enter newline; attachments: ctrl+a add, ctrl+r remove last, ctrl+d clear</Text>
      <Text dimColor>Press Enter to close</Text>
    </Box>
  )
}
