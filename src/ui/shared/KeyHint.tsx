import React from 'react'
import {Box, Text} from 'ink'

export function KeyHint({hints}: {hints: Array<{key: string; label: string}>}) {
  return (
    <Box gap={2} marginTop={1} flexWrap="wrap">
      {hints.map((h, i) => (
        <Box key={i}>
          <Text dimColor>
            {h.key}: {h.label}
          </Text>
        </Box>
      ))}
    </Box>
  )
}

