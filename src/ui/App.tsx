import React, {useEffect, useState} from 'react'
import {Box, Text, useApp, useStdin, useInput} from 'ink'
import {Unlock} from './onboarding/Unlock.js'
import {Onboarding} from './onboarding/Onboarding.js'
import {getStoreSafe, hasExistingConfig} from '../utils/store.js'
import {MailUI} from './mail/MailUI.js'
import {Help} from './shared/Help.js'

export type Route =
  | {name: 'unlock'}
  | {name: 'onboarding'}
  | {name: 'mail'}
  | {name: 'help'}

export default function App() {
  const {isRawModeSupported} = useStdin()
  return isRawModeSupported ? <InteractiveRoot /> : <NonInteractive />
}

function InteractiveRoot() {
  const {exit} = useApp()
  const [route, setRoute] = useState<Route>({name: 'unlock'})
  const [encryptionKey, setEncryptionKey] = useState<string | null>(null)
  const [hasConfig, setHasConfig] = useState<boolean>(false)

  useEffect(() => {
    setHasConfig(hasExistingConfig())
    if (!hasExistingConfig()) {
      setRoute({name: 'onboarding'})
    } else {
      setRoute({name: 'unlock'})
    }
  }, [])

  useInput((input, key) => {
    if (key.escape) {
      exit()
    }
    if (input === '?' && route.name !== 'help') setRoute({name: 'help'})
    else if (key.return && route.name === 'help') setRoute({name: hasConfig ? 'mail' : 'onboarding'})
  })

  if (route.name === 'help') return <Help onClose={() => setRoute(hasConfig ? {name: 'mail'} : {name: 'onboarding'})} />

  if (route.name === 'onboarding')
    return (
      <Onboarding
        onComplete={(key) => {
          setEncryptionKey(key)
          setRoute({name: 'mail'})
        }}
        onExit={() => exit()}
      />
    )

  if (route.name === 'unlock')
    return (
      <Unlock
        onUnlock={(key) => {
          void getStoreSafe(key)
          setEncryptionKey(key)
          setRoute({name: 'mail'})
        }}
        onReset={() => setRoute({name: 'onboarding'})}
      />
    )

  if (route.name === 'mail' && encryptionKey)
    return <MailUI encryptionKey={encryptionKey} onQuit={() => exit()} />

  return (
    <Box flexDirection="column">
      <Text>Loading…</Text>
    </Box>
  )
}

function NonInteractive() {
  return (
    <Box flexDirection="column">
      <Text color="green">Kaizen Mail</Text>
      <Text>Interactive TUI requires a TTY terminal.</Text>
      <Text dimColor>Run in your terminal: bun run src/index.tsx</Text>
      <Box marginTop={1}>
        <Text>
          If running inside a non-interactive environment, please switch to a terminal to experience the full UI.
        </Text>
      </Box>
    </Box>
  )
}
