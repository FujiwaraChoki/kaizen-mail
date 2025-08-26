import React from 'react'
import {Box, Text} from 'ink'
import Spinner from 'ink-spinner'

export function SpinnerLine({label}: {label: string}) {
  return (
    <Box>
      <Text color="cyan">
        <Spinner type="dots" /> {label}
      </Text>
    </Box>
  )
}

