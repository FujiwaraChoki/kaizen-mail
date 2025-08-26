import React from 'react'
import {Box, Text} from 'ink'

export function Help({onClose}: {onClose: () => void}) {
  return (
    <Box flexDirection="column">
      <Text color="green">Kaizen Mail — Help</Text>
      <Text>Global: q quit, b back, ctrl+? help</Text>
      <Text>Lists: arrows to move, enter to select</Text>
      <Text>Mailbox: R refresh, n next page, p prev page, c compose, o settings</Text>
      <Text>Reader: r reply, f forward (pick attachments), s save attachments</Text>
      <Text>Compose: Vim body — normal/insert. Normal: h/j/k/l move, w/b next/prev word, i/a/I/A/o/O insert, x delete char, dd delete line, dw/db delete to next/prev word, yy yank, p paste, 0/$ line start/end. Backspace works in both modes. Esc leaves insert. Tab/Shift+Tab navigate, ctrl+s send, esc cancel, ctrl+enter newline; attachments: ctrl+a add, ctrl+r remove last, ctrl+d clear; signature: ctrl+g toggle, ctrl+G set file</Text>
      <Text dimColor>Press Enter to close</Text>
    </Box>
  )
}
