# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Kaizen Mail is a beautiful TUI (Terminal User Interface) email client built with Bun, React, and Ink. It provides a fast, elegant terminal experience for reading and composing emails with IMAP/SMTP support and encrypted local configuration.

## Development Commands

### Running the Application
- `bun run src/index.tsx` - Start the TUI application
- `bun start` - Same as above
- `bun run dev` - Same as above

### Building
- `bun build ./src/index.tsx --compile --outfile kaizen-mail` - Compile to standalone binary

### Dependencies
- Install: `bun install`
- The app requires a TTY terminal to run interactively

## Architecture

### Entry Point & Routing
- `src/index.tsx` - Application entry point, renders `<App />`
- `src/ui/App.tsx` - Root component with routing logic between:
  - `unlock` - Password entry for existing config
  - `onboarding` - Initial setup flow for new users
  - `mail` - Main mail interface
  - `help` - Help screen

### Configuration & Encryption
- `src/utils/store.ts` - Configuration management with encryption
  - Uses `Conf` library with encryption via master password
  - Config stored at `~/.config/kaizen-mail/config.json` (encrypted)
  - Schema defined with Zod: `AccountSchema`, `ConfigSchema`
  - **Important**: All config access requires the encryption key from user's master password

### Mail Protocol Layers
- `src/mail/imap.ts` - IMAP operations using `imapflow`
  - All operations use UID mode (not sequence numbers) for consistency
  - Functions: `connectImap`, `listMailboxes`, `openMailbox`, `listMessages`, `fetchMessage`, `markSeen`
  - Defensive parsing: falls back to envelope data if raw source unavailable/unparsable
- `src/mail/smtp.ts` - SMTP sending using `nodemailer`
  - Function: `sendMail` - handles attachments and HTML/text emails

### UI Component Structure
- `src/ui/mail/MailUI.tsx` - Main mail interface orchestrator
  - Manages IMAP client connection lifecycle
  - Handles screen navigation: mailboxes → messages → reader/compose
  - Implements pagination (20 messages per page)
  - Global keyboard shortcuts: `q` quit, `b` back, `c` compose, `r` refresh, `n/p` page nav, `o` settings
- `src/ui/mail/MailboxList.tsx` - Folder/mailbox selection
- `src/ui/mail/MessageList.tsx` - Email list view with pagination
- `src/ui/mail/MessageView.tsx` - Individual message reader with reply/forward
- `src/ui/mail/Compose.tsx` - Email composition with Vim-style editor
  - **Vim Editor**: Two modes (normal/insert) with keybindings (`hjkl`, `w/b`, `dd`, `yy`, `p`, etc.)
  - Navigation: Tab/Shift+Tab cycle through fields (To → Subject → Body → Footer)
  - Attachments: Ctrl+A add, Ctrl+R remove last, Ctrl+D clear all
  - Signature: Ctrl+G toggle, Ctrl+G (shift) set from file
  - Send: Ctrl+S, Cancel: Esc
- `src/ui/onboarding/Onboarding.tsx` - Initial account setup
- `src/ui/onboarding/Unlock.tsx` - Password entry screen
- `src/ui/settings/Settings.tsx` - Settings management
- `src/ui/shared/` - Reusable components (SpinnerLine, KeyHint, Help)

### Provider Presets
- `src/utils/providers.ts` - IMAP/SMTP presets for Gmail, Outlook, iCloud, Yahoo
  - Includes host/port/security settings and helpful notes (e.g., App Password requirements)

### Utilities
- `src/utils/format.ts` - Email formatting utilities (HTML email generation)

## Key Technical Details

### Encryption & Security
- Master password encrypts all sensitive data (email credentials)
- Config file is encrypted at rest using the `Conf` library's built-in encryption
- No plaintext passwords stored on disk

### IMAP UID Consistency
- **Critical**: All IMAP operations use UID mode (`{uid: true}`) rather than sequence numbers
- This prevents sync issues when messages are added/deleted
- See `src/mail/imap.ts:60-96` for UID-based fetching patterns

### Error Handling
- Message parsing is defensive: if raw source is unavailable or fails to parse, fall back to envelope data rather than crashing
- See `src/mail/imap.ts:98-159` for fallback patterns

### Pagination Logic
- Messages are fetched in pages of 20
- UIDs are stored in ascending order; pages slice from end (newest first)
- See `src/ui/mail/MailUI.tsx:122-128` for slice logic

### Vim Editor Implementation
- The compose body field implements a custom Vim-style editor in React
- Maintains cursor position, mode state, and yank buffer
- Full implementation in `src/ui/mail/Compose.tsx:195-306`
- **Important**: Esc behavior varies - in insert mode returns to normal, in normal mode cancels compose

### Gmail & Provider Notes
- Gmail requires App Passwords (OAuth not yet supported)
- Each provider has specific requirements documented in `src/utils/providers.ts`

## Common Development Patterns

### Adding New UI Screens
1. Create component in appropriate `src/ui/` subdirectory
2. Add route to `Route` type in `src/ui/App.tsx` or screen state in `MailUI.tsx`
3. Wire up navigation with `useInput` hooks for keyboard shortcuts

### Extending Mail Functionality
- IMAP operations go in `src/mail/imap.ts` - always use UID mode
- SMTP operations go in `src/mail/smtp.ts`
- UI logic goes in respective component, state managed in `MailUI.tsx`

### Working with Config
- Always pass `encryptionKey` through component props
- Use `getStore(encryptionKey)` to access config
- Update schema in `src/utils/store.ts` when adding new config fields
