export type ProviderKey = 'gmail' | 'outlook' | 'icloud' | 'yahoo' | 'custom'

export const Providers: Record<Exclude<ProviderKey, 'custom'>, {
  label: string
  imap: {host: string; port: number; secure: boolean}
  smtp: {host: string; port: number; secure: boolean}
  notes?: string
}> = {
  gmail: {
    label: 'Gmail',
    imap: {host: 'imap.gmail.com', port: 993, secure: true},
    smtp: {host: 'smtp.gmail.com', port: 465, secure: true},
    notes: 'Use an App Password with 2‑Step Verification.',
  },
  outlook: {
    label: 'Outlook / Office 365',
    imap: {host: 'outlook.office365.com', port: 993, secure: true},
    smtp: {host: 'smtp.office365.com', port: 587, secure: false},
  },
  icloud: {
    label: 'iCloud',
    imap: {host: 'imap.mail.me.com', port: 993, secure: true},
    smtp: {host: 'smtp.mail.me.com', port: 587, secure: false},
    notes: 'Use an App Password generated at appleid.apple.com.',
  },
  yahoo: {
    label: 'Yahoo',
    imap: {host: 'imap.mail.yahoo.com', port: 993, secure: true},
    smtp: {host: 'smtp.mail.yahoo.com', port: 465, secure: true},
    notes: 'Use an App Password.',
  },
}

