import fs from 'fs'
import path from 'path'
import os from 'os'
import type { ParsedMessage, AttachmentMeta } from '../mail/imap.js'
import { sanitizeForBrowser } from './browser.js'

export interface EmailHtmlOptions {
  includeInlineImages?: boolean
  theme?: 'light' | 'dark'
}

export function generateEmailHtml(message: ParsedMessage, options: EmailHtmlOptions = {}): string {
  const { includeInlineImages = true, theme = 'light' } = options

  const isDark = theme === 'dark'
  const bgColor = isDark ? '#1e1e1e' : '#ffffff'
  const textColor = isDark ? '#e0e0e0' : '#333333'
  const borderColor = isDark ? '#404040' : '#e0e0e0'
  const headerBg = isDark ? '#2d2d2d' : '#f5f5f5'
  const linkColor = isDark ? '#4da6ff' : '#0066cc'

  // Process inline images if present
  let htmlContent = message.html || ''
  const textContent = message.text || ''

  if (!htmlContent && textContent) {
    // Convert plain text to HTML
    htmlContent = `<div style="white-space: pre-wrap; font-family: monospace;">${sanitizeForBrowser(textContent)}</div>`
  }

  // Handle inline images (CID references)
  if (includeInlineImages && message.attachments) {
    for (const att of message.attachments) {
      if (att.cid && att.content) {
        const base64 = att.content.toString('base64')
        const dataUrl = `data:${att.contentType || 'image/png'};base64,${base64}`
        const cidPattern = new RegExp(`cid:${att.cid}`, 'g')
        htmlContent = htmlContent.replace(cidPattern, dataUrl)
      }
    }
  }

  // Build attachment list
  const attachmentsList = message.attachments
    ?.filter((att) => !att.cid) // Exclude inline images
    .map((att) => renderAttachment(att, isDark))
    .join('') || ''

  const inlineImagesList = message.attachments
    ?.filter((att) => att.cid)
    .map((att) => renderAttachment(att, isDark))
    .join('') || ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${sanitizeForBrowser(message.subject || '(no subject)')}</title>
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: ${bgColor};
      color: ${textColor};
      line-height: 1.6;
    }
    .email-container {
      max-width: 900px;
      margin: 0 auto;
      background-color: ${bgColor};
      border: 1px solid ${borderColor};
      border-radius: 8px;
      overflow: hidden;
    }
    .email-header {
      background-color: ${headerBg};
      padding: 20px;
      border-bottom: 2px solid ${borderColor};
    }
    .email-header h1 {
      margin: 0 0 15px 0;
      font-size: 24px;
      font-weight: 600;
      color: ${textColor};
    }
    .email-meta {
      display: grid;
      gap: 8px;
      font-size: 14px;
    }
    .email-meta-row {
      display: flex;
      gap: 8px;
    }
    .email-meta-label {
      font-weight: 600;
      min-width: 60px;
      color: ${isDark ? '#a0a0a0' : '#666666'};
    }
    .email-meta-value {
      color: ${textColor};
      word-break: break-word;
    }
    .email-body {
      padding: 20px;
      min-height: 200px;
    }
    .email-body img {
      max-width: 100%;
      height: auto;
    }
    .email-body a {
      color: ${linkColor};
      text-decoration: underline;
    }
    .attachments-section {
      padding: 20px;
      border-top: 1px solid ${borderColor};
      background-color: ${headerBg};
    }
    .attachments-title {
      margin: 0 0 12px 0;
      font-size: 16px;
      font-weight: 600;
      color: ${textColor};
    }
    .attachment-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px;
      margin-bottom: 8px;
      background-color: ${bgColor};
      border: 1px solid ${borderColor};
      border-radius: 6px;
      font-size: 14px;
    }
    .attachment-icon {
      font-size: 20px;
    }
    .attachment-info {
      flex: 1;
    }
    .attachment-name {
      font-weight: 500;
      color: ${textColor};
    }
    .attachment-size {
      font-size: 12px;
      color: ${isDark ? '#a0a0a0' : '#666666'};
    }
    .footer {
      padding: 15px 20px;
      text-align: center;
      font-size: 12px;
      color: ${isDark ? '#808080' : '#999999'};
      border-top: 1px solid ${borderColor};
    }
    @media (max-width: 600px) {
      body {
        padding: 10px;
      }
      .email-header {
        padding: 15px;
      }
      .email-body {
        padding: 15px;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>${sanitizeForBrowser(message.subject || '(no subject)')}</h1>
      <div class="email-meta">
        <div class="email-meta-row">
          <span class="email-meta-label">From:</span>
          <span class="email-meta-value">${sanitizeForBrowser(message.from || 'Unknown')}</span>
        </div>
        ${message.to ? `
        <div class="email-meta-row">
          <span class="email-meta-label">To:</span>
          <span class="email-meta-value">${sanitizeForBrowser(message.to)}</span>
        </div>
        ` : ''}
        ${message.date ? `
        <div class="email-meta-row">
          <span class="email-meta-label">Date:</span>
          <span class="email-meta-value">${message.date.toLocaleString()}</span>
        </div>
        ` : ''}
      </div>
    </div>
    <div class="email-body">
      ${htmlContent}
    </div>
    ${attachmentsList ? `
    <div class="attachments-section">
      <h2 class="attachments-title">📎 Attachments</h2>
      ${attachmentsList}
    </div>
    ` : ''}
    ${inlineImagesList ? `
    <div class="attachments-section">
      <h2 class="attachments-title">🖼️ Inline Images</h2>
      ${inlineImagesList}
    </div>
    ` : ''}
    <div class="footer">
      Opened with Kaizen Mail
    </div>
  </div>
</body>
</html>`
}

function renderAttachment(att: AttachmentMeta, isDark: boolean): string {
  const name = sanitizeForBrowser(att.filename || 'unnamed')
  const size = att.size ? formatFileSize(att.size) : 'unknown size'
  const type = att.contentType || 'unknown type'
  const icon = getFileIcon(att.filename || '', att.contentType)

  return `
    <div class="attachment-item">
      <span class="attachment-icon">${icon}</span>
      <div class="attachment-info">
        <div class="attachment-name">${name}</div>
        <div class="attachment-size">${size} • ${sanitizeForBrowser(type)}</div>
      </div>
    </div>
  `
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

function getFileIcon(filename: string, contentType?: string): string {
  const ext = path.extname(filename).toLowerCase()
  const type = contentType?.toLowerCase() || ''

  if (type.startsWith('image/')) return '🖼️'
  if (type.startsWith('video/')) return '🎥'
  if (type.startsWith('audio/')) return '🎵'
  if (type.includes('pdf')) return '📄'
  if (type.includes('zip') || type.includes('rar') || type.includes('7z')) return '📦'
  if (type.includes('word') || ext === '.doc' || ext === '.docx') return '📝'
  if (type.includes('excel') || ext === '.xls' || ext === '.xlsx') return '📊'
  if (type.includes('powerpoint') || ext === '.ppt' || ext === '.pptx') return '📽️'
  if (ext === '.txt') return '📄'

  return '📎'
}

export function saveEmailAsHtml(message: ParsedMessage, options: EmailHtmlOptions = {}): string {
  const html = generateEmailHtml(message, options)
  const tempDir = path.join(os.tmpdir(), 'kaizen-mail')

  // Create temp directory if it doesn't exist
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }

  // Create a safe filename
  const safeSubject = (message.subject || 'email')
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase()
    .slice(0, 50)
  const timestamp = Date.now()
  const filename = `${safeSubject}_${timestamp}.html`
  const filepath = path.join(tempDir, filename)

  fs.writeFileSync(filepath, html, 'utf-8')

  return filepath
}

export function cleanupOldEmailFiles(maxAgeMs = 24 * 60 * 60 * 1000): void {
  const tempDir = path.join(os.tmpdir(), 'kaizen-mail')

  if (!fs.existsSync(tempDir)) return

  const now = Date.now()
  const files = fs.readdirSync(tempDir)

  for (const file of files) {
    if (!file.endsWith('.html')) continue

    const filepath = path.join(tempDir, file)
    const stat = fs.statSync(filepath)
    const age = now - stat.mtimeMs

    if (age > maxAgeMs) {
      try {
        fs.unlinkSync(filepath)
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}
