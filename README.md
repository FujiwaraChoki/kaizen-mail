# Kaizen Mail

A fully-featured, terminal-based email client built with React (Ink) and TypeScript. Enjoy a vim-style editor, advanced search, batch operations, drafts with auto-save, and more—all in your terminal.

![Kaizen Mail](https://img.shields.io/badge/terminal-email%20client-blue)

## Features

### 📧 Email Management
- **Multi-account support** with encrypted credential storage
- **Full IMAP integration** with automatic reconnection
- **Mailbox navigation** with tree view
- **Message threading** (coming soon)
- **Pagination** for efficient browsing of large mailboxes

### 🔍 Advanced Search & Filtering
- Search by **sender, recipient, subject, or body text**
- **Date range filtering** (before/after)
- **Quick filters**: unread only, flagged only
- **Combine multiple criteria** for precise results

### ✨ Batch Operations
- **Multi-select mode** (toggle with `v`)
- **Bulk delete** multiple messages
- **Bulk mark** as read/unread
- **Bulk flag/unflag** messages
- **Visual selection** with checkboxes

### ⭐ Message Actions
- **Open in browser** - View full HTML emails in your default browser
- **Star/flag** important emails
- **Reply** with quoted text
- **Forward** with multiple attachment options
- **Save attachments** to local filesystem
- **Mark as read/unread**
- **Delete** individual or multiple messages
- **Preview in terminal** with full view in browser

### ✍️ Compose with Vim-Style Editor
- **Vim-inspired editing** with normal and insert modes
- **Full Vim keybindings**:
  - Navigation: `h j k l`, `w b` (word), `0 $` (line start/end)
  - Insert modes: `i a I A o O`
  - Delete: `x dd dw db`
  - Yank/paste: `yy p`
- **Rich text signatures** (HTML or plain text)
- **File attachments** with MIME type detection
- **Auto-save drafts** every 10 seconds
- **Word and character count**

### 💾 Drafts System
- **Automatic draft saving** while composing
- **Resume drafts** from where you left off
- **Draft management** panel (view, edit, delete)
- **Encrypted storage** for privacy

### 🗂️ Mailbox Management
- **Create** new folders
- **Delete** folders
- **Rename** folders
- Navigate folder hierarchy

### 🔐 Security & Privacy
- **Encrypted config storage** using encryption key
- **Password-protected** account credentials
- **Local-only** - no cloud dependencies

### 🎨 User Interface
- **Clean, intuitive TUI** built with Ink
- **Browser-based email viewing** with beautiful HTML rendering
- **Real-time connection status** indicator
- **Unread message counter**
- **Contextual keyboard shortcuts**
- **Comprehensive help panel** (`?` or `Ctrl+H`)
- **Error handling** with retry logic
- **Responsive HTML email templates** with light/dark theme support
- **Inline image support** in browser view
- **Automatic cleanup** of temporary files

## Installation

### Requirements
- [Bun](https://bun.sh/) runtime (v1.0+)
- IMAP and SMTP server credentials
- Terminal with TTY support

### Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/FujiwaraChoki/kaizen-mail.git
   cd kaizen-mail
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

3. **Run the app**:
   ```bash
   bun run start
   ```

4. **First-time setup**:
   - Create an encryption password (used to secure your credentials)
   - Enter your email account details:
     - IMAP settings (host, port, username, password)
     - SMTP settings (host, port, username, password)
   - Configuration is saved in `~/.config/kaizen-mail/`

## Keyboard Shortcuts

### Global Navigation
| Key | Action |
|-----|--------|
| `q` | Quit application |
| `b` | Go back / Previous screen |
| `Tab` / `Shift+Tab` | Navigate between fields |
| `↑↓` | Navigate lists |
| `Enter` | Select / Open item |
| `Esc` | Cancel / Close dialog |
| `?` or `Ctrl+H` | Show help panel |

### Message List
| Key | Action |
|-----|--------|
| `r` | Refresh messages |
| `n` | Next page |
| `p` | Previous page |
| `c` | Compose new email |
| `/` | Search / Filter |
| `s` | Toggle star/flag on current message |
| `v` | Toggle multi-select mode |
| `d` | Open drafts |
| `m` | Manage mailboxes |
| `o` | Settings |

### Multi-Select Mode
| Key | Action |
|-----|--------|
| `Space` | Toggle selection |
| `d` | Delete selected |
| `m` | Mark selected as read |
| `u` | Mark selected as unread |
| `f` | Flag selected |
| `x` | Clear selection |
| `v` | Exit multi-select mode |

### Message View
| Key | Action |
|-----|--------|
| `o` | Open full email in browser |
| `r` | Reply |
| `f` | Forward |
| `s` | Save attachments |
| `b` / `Esc` | Back to list |

### Compose Email
| Key | Action |
|-----|--------|
| `Ctrl+S` | Send email |
| `Ctrl+A` | Add attachment |
| `Ctrl+R` | Remove last attachment |
| `Ctrl+D` | Clear all attachments |
| `Ctrl+G` | Toggle signature |
| `Ctrl+Shift+G` | Set signature file |
| `Esc` | Cancel composition |

### Body Editor (Vim-style)
| Key | Action |
|-----|--------|
| `i` | Insert mode |
| `Esc` | Normal mode |
| `h j k l` | Move cursor |
| `w` / `b` | Next/previous word |
| `0` / `$` | Start/end of line |
| `dd` | Delete line |
| `yy` | Yank (copy) line |
| `p` | Paste |
| `x` | Delete character |
| `a` | Append after cursor |
| `I` | Insert at line start |
| `A` | Append at line end |
| `o` | Open line below |
| `O` | Open line above |

## Email Viewing

Kaizen Mail offers a hybrid viewing experience:

### Terminal Preview
- Quick text preview (first 5 lines) shown directly in the terminal
- Fast navigation without leaving the TUI
- Ideal for scanning messages

### Browser View
- Press `o` to open the full email in your default browser
- **Beautiful HTML rendering** with proper styling
- **Inline images** displayed correctly
- **Responsive design** that works on any screen size
- **Light/dark theme** support (configurable)
- **Attachment previews** with file type icons and sizes
- **Temporary files** automatically cleaned up after 24 hours

The browser view generates a standalone HTML file that includes:
- Full email headers (from, to, date)
- Complete HTML content with CSS styling
- Embedded inline images (CID references converted to data URLs)
- Attachment list with file information
- Clean, modern interface

## Configuration

Configuration files are stored in `~/.config/kaizen-mail/`:

- `config.json` - Account settings (encrypted)
- `drafts.json` - Saved drafts (encrypted)

Temporary HTML files are stored in your system's temp directory under `kaizen-mail/`.

## Architecture

### Tech Stack
- **Runtime**: Bun
- **UI Framework**: Ink (React for CLIs)
- **Email Protocol**: ImapFlow (IMAP), Nodemailer (SMTP)
- **Storage**: Conf (encrypted config)
- **Email Parsing**: mailparser
- **Date Formatting**: date-fns

### Key Libraries
- `ink` - Terminal UI framework
- `ink-select-input` - List selection component
- `ink-text-input` - Text input component
- `ink-spinner` - Loading indicators
- `imapflow` - Modern IMAP client
- `nodemailer` - Email sending
- `mailparser` - Email parsing
- `conf` - Encrypted configuration storage
- `zod` - Schema validation

## Stability & Error Handling

Kaizen Mail implements comprehensive error handling and stability features:

- **Automatic retry logic** with exponential backoff
- **Connection state management** with reconnection
- **Graceful error recovery** throughout the app
- **Input validation** with Zod schemas
- **Encrypted credential storage** for security

## Performance Optimizations

### SMTP Connection Pooling
Kaizen Mail uses intelligent connection pooling for sending emails:

- **Persistent connections** - SMTP connections are reused instead of creating new ones
- **Connection pooling** - Up to 5 simultaneous connections with automatic management
- **Rate limiting** - 10 messages per second to prevent server overload
- **Smart caching** - Connections cached for 5 minutes of idle time
- **Auto-cleanup** - Idle connections automatically closed to free resources
- **Fast sending** - First email establishes connection, subsequent sends are nearly instant

**Performance comparison:**
- Without pooling: ~2-3 seconds per email (connection + send)
- With pooling: ~0.2-0.5 seconds per email (send only, connection reused)

**Benefits:**
- 5-10x faster for sending multiple emails
- Reduced server load
- Better user experience
- Automatic connection verification

## Development

### Project Structure
```
kaizen-mail/
├── src/
│   ├── mail/
│   │   ├── imap.ts          # IMAP operations with retry logic
│   │   └── smtp.ts          # SMTP sending
│   ├── ui/
│   │   ├── mail/
│   │   │   ├── MailUI.tsx        # Main email interface
│   │   │   ├── MessageList.tsx   # Message list with batch ops
│   │   │   ├── MessageView.tsx   # Single message viewer
│   │   │   ├── Compose.tsx       # Email composer
│   │   │   ├── SearchPanel.tsx   # Search/filter UI
│   │   │   ├── DraftsPanel.tsx   # Drafts management
│   │   │   ├── MailboxManager.tsx # Folder management
│   │   │   ├── MailboxList.tsx   # Folder navigation
│   │   │   └── MailHelp.tsx      # Keyboard shortcuts help
│   │   ├── settings/
│   │   │   └── Settings.tsx  # App settings
│   │   ├── onboarding/
│   │   │   ├── Onboarding.tsx # Initial setup
│   │   │   └── Unlock.tsx     # Password entry
│   │   ├── shared/
│   │   │   ├── SpinnerLine.tsx # Loading indicator
│   │   │   ├── KeyHint.tsx     # Keyboard hint component
│   │   │   └── Help.tsx        # General help
│   │   └── App.tsx          # Root component
│   ├── utils/
│   │   ├── store.ts         # Config & credentials
│   │   ├── drafts.ts        # Draft management
│   │   ├── format.ts        # Email formatting
│   │   ├── emailRenderer.ts # HTML email generation
│   │   ├── browser.ts       # Browser opening utilities
│   │   └── providers.ts     # Provider presets
│   └── index.tsx            # Entry point
├── package.json
├── tsconfig.json
└── README.md
```

### Build
```bash
bun run build
```

This creates a standalone executable `./kaizen-mail`

## Roadmap

- [ ] Message threading view
- [ ] HTML email rendering
- [ ] Contact management
- [ ] Multiple account switching
- [ ] Email templates
- [ ] Advanced filtering rules
- [ ] Keyboard macro recording
- [ ] Plugin system

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Built with [Ink](https://github.com/vadimdemedes/ink) by Vadim Demedes
- Inspired by terminal email clients like mutt and aerc
- Thanks to the Bun team for an amazing runtime

## Support

For issues, questions, or suggestions, please [open an issue](https://github.com/FujiwaraChoki/kaizen-mail/issues).

---

Made with ❤️ for the terminal
