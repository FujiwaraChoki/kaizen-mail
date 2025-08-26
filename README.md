# Kaizen Mail — a beautiful TUI email client

Run a fast, elegant terminal email client powered by Bun + Ink.

Highlights
- Clean onboarding with provider presets (Gmail, Outlook, iCloud, Yahoo)
- Encrypted local config using a master password
- IMAP for inbox and folders, SMTP for sending
- Smooth navigation with delightful spinners and helpful key hints

Quick start
- Install dependencies: `bun install`
- Start the app: `bun run src/index.tsx`

Controls
- Global: `q` quit, `b` back, `?` help
- Lists: arrows to move, `enter` to select
- In mailbox: `R` refresh, `c` compose
- Reader: `r` reply, `f` forward
- Composer: `tab` next field, `shift+tab` previous, `ctrl+s` send, `esc` cancel, `ctrl+enter` newline in body

Notes
- For Gmail, use an App Password (OAuth not yet supported).
- Your credentials are encrypted at rest using your master password.
