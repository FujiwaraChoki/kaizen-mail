import React from 'react'
import { Box, Text } from 'ink'

export function MailHelp({ onClose }: { onClose: () => void }) {
  return (
    <Box flexDirection="column" borderStyle="round" padding={1}>
      <Text color="cyan" bold>
        Kaizen Mail - Keyboard Shortcuts
      </Text>

      <Box marginTop={1} flexDirection="column">
        <Text color="green" bold>
          Navigation
        </Text>
        <Text dimColor>q - Quit application</Text>
        <Text dimColor>b - Go back / Previous screen</Text>
        <Text dimColor>Tab / Shift+Tab - Navigate between fields</Text>
        <Text dimColor>↑↓ - Navigate lists</Text>
        <Text dimColor>Enter - Select / Open item</Text>
        <Text dimColor>Esc - Cancel / Close dialog</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color="green" bold>
          Message List
        </Text>
        <Text dimColor>r - Refresh messages</Text>
        <Text dimColor>n - Next page</Text>
        <Text dimColor>p - Previous page</Text>
        <Text dimColor>c - Compose new email</Text>
        <Text dimColor>/ - Search / Filter</Text>
        <Text dimColor>s - Toggle star/flag on current message</Text>
        <Text dimColor>v - Toggle multi-select mode</Text>
        <Text dimColor>d - Open drafts</Text>
        <Text dimColor>m - Manage mailboxes</Text>
        <Text dimColor>o - Settings</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color="green" bold>
          Multi-Select Mode
        </Text>
        <Text dimColor>Space - Toggle selection</Text>
        <Text dimColor>d - Delete selected</Text>
        <Text dimColor>m - Mark selected as read</Text>
        <Text dimColor>u - Mark selected as unread</Text>
        <Text dimColor>f - Flag selected</Text>
        <Text dimColor>x - Clear selection</Text>
        <Text dimColor>v - Exit multi-select mode</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color="green" bold>
          Message View
        </Text>
        <Text dimColor>r - Reply</Text>
        <Text dimColor>f - Forward</Text>
        <Text dimColor>s - Save attachments</Text>
        <Text dimColor>b / Esc - Back to list</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color="green" bold>
          Compose Email
        </Text>
        <Text dimColor>Ctrl+S - Send email</Text>
        <Text dimColor>Ctrl+A - Add attachment</Text>
        <Text dimColor>Ctrl+R - Remove last attachment</Text>
        <Text dimColor>Ctrl+D - Clear all attachments</Text>
        <Text dimColor>Ctrl+G - Toggle signature</Text>
        <Text dimColor>Ctrl+Shift+G - Set signature file</Text>
        <Text dimColor>Esc - Cancel composition</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color="green" bold>
          Body Editor (Vim-style)
        </Text>
        <Text dimColor>i - Insert mode</Text>
        <Text dimColor>Esc - Normal mode</Text>
        <Text dimColor>h/j/k/l - Move cursor</Text>
        <Text dimColor>w/b - Next/previous word</Text>
        <Text dimColor>0/$ - Start/end of line</Text>
        <Text dimColor>dd - Delete line</Text>
        <Text dimColor>yy - Yank (copy) line</Text>
        <Text dimColor>p - Paste</Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Press Esc to close this help</Text>
      </Box>
    </Box>
  )
}
