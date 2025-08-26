import React, { useMemo, useState } from 'react'
import { Box, Text, useInput, useStdin } from 'ink'
import SelectInput from 'ink-select-input'
import TextInput from 'ink-text-input'
import { Providers, type ProviderKey } from '../../utils/providers.js'
import { SpinnerLine } from '../shared/SpinnerLine.js'
import { getStore } from '../../utils/store.js'

type Step = 'provider' | 'identity' | 'servers' | 'credentials' | 'saving'
type ActiveField = 'displayName' | 'email' | 'user' | 'imapHost' | 'imapPort' | 'imapSecure' | 'smtpHost' | 'smtpPort' | 'smtpSecure' | 'password' | 'masterPassword'

export function Onboarding({ onComplete, onExit }: { onComplete: (encryptionKey: string) => void; onExit: () => void }) {
  const [step, setStep] = useState<Step>('provider')
  const [provider, setProvider] = useState<ProviderKey>('gmail')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [masterPassword, setMasterPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [activeField, setActiveField] = useState<ActiveField>('displayName')
  const [imapHost, setImapHost] = useState('')
  const [imapPort, setImapPort] = useState('993')
  const [imapSecure, setImapSecure] = useState<'yes' | 'no'>('yes')
  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState('465')
  const [smtpSecure, setSmtpSecure] = useState<'yes' | 'no'>('yes')

  const { isRawModeSupported } = useStdin()
  useInput((input, key) => {
    if (key.escape) onExit()
  }, { isActive: isRawModeSupported })

  const providerItems = useMemo(() => {
    const items = Object.entries(Providers).map(([k, v]) => ({ label: v.label, value: k as ProviderKey }))
    items.push({ label: 'Custom…', value: 'custom' as ProviderKey })
    return items
  }, [])

  async function save() {
    setStep('saving')
    setError(null)
    try {
      const encKey = masterPassword
      const store = getStore(encKey)
      const preset = provider === 'custom' ? null : Providers[provider as Exclude<ProviderKey, 'custom'>]
      const imap = preset?.imap ?? { host: imapHost, port: Number(imapPort), secure: imapSecure === 'yes' }
      const smtp = preset?.smtp ?? { host: smtpHost, port: Number(smtpPort), secure: smtpSecure === 'yes' }
      store.set('account', {
        displayName: displayName || email,
        email,
        imap: { host: imap.host, port: imap.port, secure: imap.secure, user: user || email, password },
        smtp: { host: smtp.host, port: smtp.port, secure: smtp.secure, user: user || email, password },
      })
      onComplete(encKey)
    } catch (e: any) {
      setError(e.message || 'Failed to save configuration')
      setStep('credentials')
    }
  }

  if (step === 'provider')
    return (
      <Box flexDirection="column">
        <Text color="green">👋 Welcome to Kaizen Mail</Text>
        <Text>Select your email provider</Text>
        <Box marginTop={1}>
          <SelectInput
            items={providerItems}
            onSelect={(i) => {
              const p = i.value as ProviderKey
              setProvider(p)
              if (p !== 'custom') {
                const preset = Providers[p as Exclude<ProviderKey, 'custom'>]
                setImapHost(preset.imap.host)
                setImapPort(String(preset.imap.port))
                setImapSecure(preset.imap.secure ? 'yes' : 'no')
                setSmtpHost(preset.smtp.host)
                setSmtpPort(String(preset.smtp.port))
                setSmtpSecure(preset.smtp.secure ? 'yes' : 'no')
              } else {
                setImapHost('')
                setImapPort('993')
                setImapSecure('yes')
                setSmtpHost('')
                setSmtpPort('465')
                setSmtpSecure('yes')
              }
              setStep('identity')
              setActiveField('displayName')
            }}
          />
        </Box>
        {provider !== 'custom' && Providers[provider as Exclude<ProviderKey, 'custom'>]?.notes && (
          <Box marginTop={1}>
            <Text dimColor>{Providers[provider as Exclude<ProviderKey, 'custom'>].notes}</Text>
          </Box>
        )}
      </Box>
    )

  if (step === 'identity')
    return (
      <Box flexDirection="column">
        <Text color="green">Your identity</Text>
        <Box marginTop={1}>
          <Text dimColor>Display name: </Text>
          {activeField === 'displayName' ? (
            <TextInput
              value={displayName}
              onChange={setDisplayName}
              placeholder="Jane Doe"
              onSubmit={() => setActiveField('email')}
            />
          ) : (
            <Text color={displayName ? 'white' : 'gray'}>{displayName || 'Jane Doe'}</Text>
          )}
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Email address: </Text>
          {activeField === 'email' ? (
            <TextInput
              value={email}
              onChange={setEmail}
              placeholder="jane@example.com"
              onSubmit={() => setActiveField('user')}
            />
          ) : (
            <Text color={email ? 'white' : 'gray'}>{email || 'jane@example.com'}</Text>
          )}
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Username (optional): </Text>
          {activeField === 'user' ? (
            <TextInput
              value={user}
              onChange={setUser}
              placeholder="defaults to email"
              onSubmit={() => {
                setStep('credentials')
                setActiveField('password')
              }}
            />
          ) : (
            <Text color={user ? 'white' : 'gray'}>{user || 'defaults to email'}</Text>
          )}
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Press Tab to navigate, Enter to continue</Text>
        </Box>
        <IdentityNavigation
          activeField={activeField}
          onFieldChange={setActiveField}
          onComplete={() => {
            if (provider === 'custom') {
              // In custom flow, go to credentials first, then servers
              setStep('credentials')
              setActiveField('password')
            } else {
              setStep('credentials')
              setActiveField('password')
            }
          }}
        />
      </Box>
    )

  if (step === 'servers')
    return (
      <Box flexDirection="column">
        <Text color="green">Server settings</Text>
        <Box marginTop={1}>
          <Text dimColor>IMAP host: </Text>
          {activeField === 'imapHost' ? (
            <TextInput
              value={imapHost}
              onChange={setImapHost}
              placeholder="imap.example.com"
              onSubmit={() => setActiveField('imapPort')}
            />
          ) : (
            <Text color={imapHost ? 'white' : 'gray'}>{imapHost || 'imap.example.com'}</Text>
          )}
        </Box>
        <Box marginTop={1}>
          <Text dimColor>IMAP port: </Text>
          {activeField === 'imapPort' ? (
            <TextInput
              value={imapPort}
              onChange={setImapPort}
              onSubmit={() => setActiveField('imapSecure')}
            />
          ) : (
            <Text color={imapPort ? 'white' : 'gray'}>{imapPort}</Text>
          )}
        </Box>
        <Box marginTop={1}>
          <Text dimColor>IMAP secure (yes/no): </Text>
          {activeField === 'imapSecure' ? (
            <TextInput
              value={imapSecure}
              onChange={(v) => setImapSecure(v.toLowerCase() === 'yes' ? 'yes' : 'no')}
              onSubmit={() => setActiveField('smtpHost')}
            />
          ) : (
            <Text color={imapSecure ? 'white' : 'gray'}>{imapSecure}</Text>
          )}
        </Box>
        <Box marginTop={1}>
          <Text dimColor>SMTP host: </Text>
          {activeField === 'smtpHost' ? (
            <TextInput
              value={smtpHost}
              onChange={setSmtpHost}
              placeholder="smtp.example.com"
              onSubmit={() => setActiveField('smtpPort')}
            />
          ) : (
            <Text color={smtpHost ? 'white' : 'gray'}>{smtpHost || 'smtp.example.com'}</Text>
          )}
        </Box>
        <Box marginTop={1}>
          <Text dimColor>SMTP port: </Text>
          {activeField === 'smtpPort' ? (
            <TextInput
              value={smtpPort}
              onChange={setSmtpPort}
              onSubmit={() => setActiveField('smtpSecure')}
            />
          ) : (
            <Text color={smtpPort ? 'white' : 'gray'}>{smtpPort}</Text>
          )}
        </Box>
        <Box marginTop={1}>
          <Text dimColor>SMTP secure (yes/no): </Text>
          {activeField === 'smtpSecure' ? (
            <TextInput
              value={smtpSecure}
              onChange={(v) => setSmtpSecure(v.toLowerCase() === 'yes' ? 'yes' : 'no')}
              onSubmit={() => save()}
            />
          ) : (
            <Text color={smtpSecure ? 'white' : 'gray'}>{smtpSecure}</Text>
          )}
        </Box>
        <Box marginTop={1}>
          <Text dimColor>
            {provider === 'custom' ? 'Press Tab to navigate, Enter to continue' : 'Press Tab to navigate, Enter to save'}
          </Text>
        </Box>
        <ServersNavigation
          activeField={activeField}
          onFieldChange={setActiveField}
          onComplete={() => save()}
        />
      </Box>
    )

  if (step === 'credentials')
    return (
      <Box flexDirection="column">
        <Text color="green">Credentials</Text>
        <Box marginTop={1}>
          <Text dimColor>Password / App Password: </Text>
          {activeField === 'password' ? (
            <TextInput
              value={password}
              onChange={setPassword}
              mask="•"
              onSubmit={() => setActiveField('masterPassword')}
            />
          ) : (
            <Text color={password ? 'white' : 'gray'}>{password ? '••••••••' : ''}</Text>
          )}
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Master password (encrypts config): </Text>
          {activeField === 'masterPassword' ? (
            <TextInput
              value={masterPassword}
              onChange={setMasterPassword}
              mask="•"
              onSubmit={() => {
                if (provider === 'custom') {
                  setStep('servers')
                  setActiveField('imapHost')
                } else {
                  save()
                }
              }}
            />
          ) : (
            <Text color={masterPassword ? 'white' : 'gray'}>{masterPassword ? '••••••••' : ''}</Text>
          )}
        </Box>
        {error && (
          <Box marginTop={1}>
            <Text color="red">{error}</Text>
          </Box>
        )}
        <Box marginTop={1}>
          <Text dimColor>Press Tab to navigate, Enter to save</Text>
        </Box>
        <CredentialsNavigation
          activeField={activeField}
          onFieldChange={setActiveField}
          onComplete={() => {
            if (provider === 'custom') {
              setStep('servers')
              setActiveField('imapHost')
            } else {
              save()
            }
          }}
        />
      </Box>
    )

  return (
    <Box flexDirection="column">
      <SpinnerLine label="Saving configuration…" />
    </Box>
  )
}

function IdentityNavigation({ activeField, onFieldChange, onComplete }: {
  activeField: ActiveField
  onFieldChange: (field: ActiveField) => void
  onComplete: () => void
}) {
  const { isRawModeSupported } = useStdin()
  useInput((_, key) => {
    if (key.return) {
      if (activeField === 'user') {
        onComplete()
      } else if (activeField === 'displayName') {
        onFieldChange('email')
      } else if (activeField === 'email') {
        onFieldChange('user')
      }
    } else if (key.tab) {
      if (activeField === 'displayName') {
        onFieldChange('email')
      } else if (activeField === 'email') {
        onFieldChange('user')
      } else if (activeField === 'user') {
        onFieldChange('displayName')
      }
    }
  }, { isActive: isRawModeSupported })
  return null
}

function CredentialsNavigation({ activeField, onFieldChange, onComplete }: {
  activeField: ActiveField
  onFieldChange: (field: ActiveField) => void
  onComplete: () => void
}) {
  const { isRawModeSupported } = useStdin()
  useInput((_, key) => {
    if (key.return) {
      if (activeField === 'masterPassword') {
        onComplete()
      } else if (activeField === 'password') {
        onFieldChange('masterPassword')
      }
    } else if (key.tab) {
      if (activeField === 'password') {
        onFieldChange('masterPassword')
      } else if (activeField === 'masterPassword') {
        onFieldChange('password')
      }
    }
  }, { isActive: isRawModeSupported })
  return null
}

function ServersNavigation({ activeField, onFieldChange, onComplete }: {
  activeField: ActiveField
  onFieldChange: (field: ActiveField) => void
  onComplete: () => void
}) {
  const { isRawModeSupported } = useStdin()
  useInput((_, key) => {
    if (key.return) {
      if (activeField === 'smtpSecure') {
        onComplete()
      } else if (activeField === 'imapHost') {
        onFieldChange('imapPort')
      } else if (activeField === 'imapPort') {
        onFieldChange('imapSecure')
      } else if (activeField === 'imapSecure') {
        onFieldChange('smtpHost')
      } else if (activeField === 'smtpHost') {
        onFieldChange('smtpPort')
      } else if (activeField === 'smtpPort') {
        onFieldChange('smtpSecure')
      }
    } else if (key.tab) {
      if (activeField === 'imapHost') {
        onFieldChange('imapPort')
      } else if (activeField === 'imapPort') {
        onFieldChange('imapSecure')
      } else if (activeField === 'imapSecure') {
        onFieldChange('smtpHost')
      } else if (activeField === 'smtpHost') {
        onFieldChange('smtpPort')
      } else if (activeField === 'smtpPort') {
        onFieldChange('smtpSecure')
      } else if (activeField === 'smtpSecure') {
        onFieldChange('imapHost')
      }
    }
  }, { isActive: isRawModeSupported })
  return null
}
