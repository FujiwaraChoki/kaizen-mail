# Kaizen Mail — a beautiful TUI email client

Run a fast, elegant terminal email client powered by Bun + Ink.

Highlights
- Clean onboarding with provider presets (Gmail, Outlook, iCloud, Yahoo)
- Encrypted local config using a master password
- IMAP for inbox and folders, SMTP for sending
- Smooth navigation with delightful spinners and helpful key hints
- New: Vim-style compose editor with word/letter counter and collapsible help

Quick start
- Install dependencies: `bun install`
- Start the app: `bun run src/index.tsx`

Controls
- Global: `q` quit, `b` back, `ctrl+?` help
- Lists: arrows to move, `enter` to select
- Mailbox: `R` refresh, `n` next page, `p` prev page, `c` compose
- Reader: `r` reply, `f` forward, `s` save attachments
- Composer:
  - Navigation: `tab` next field, `shift+tab` previous (cycle: To → Subject → Body → Footer)
  - Send/Cancel: `ctrl+s` send, `esc` cancel (if Body is in Insert mode, `esc` returns to Normal instead)
  - Newline: `ctrl+enter` inserts a newline at cursor
  - Attachments: `ctrl+a` add file, `ctrl+r` remove last, `ctrl+d` clear all
  - Vim body editor:
    - Modes: Normal/Insert (mode shown under the editor)
    - Move: `h` `j` `k` `l`, `0` start of line, `$` end of line, `w` next word, `b` previous word
    - Insert: `i` `a` `I` `A` `o` `O`
    - Delete: `x` char, `dd` line, `dw` to next word, `db` to previous word
    - Yank/Paste: `yy` line, `p` paste after line
    - Backspace: works in both Normal and Insert
  - Footer: compact “See instructions (Enter)” toggle with full key cheatsheet
  - Counters: live “Words · Letters” under the editor

Notes
- For Gmail, use an App Password (OAuth not yet supported).
- Your credentials are encrypted at rest using your master password.
- Opening messages is more robust: if the raw source is unavailable or unparsable, the app shows envelope details instead of crashing.
