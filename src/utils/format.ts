function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function toHtmlFromText(text: string): string {
  return escapeHtml(text).replace(/\n/g, '<br/>')
}

export function buildHtmlEmail(opts: {
  subject?: string
  bodyText?: string
  bodyHtml?: string
  signatureText?: string
  signatureHtml?: string
}): string {
  const body = opts.bodyHtml ?? (opts.bodyText ? toHtmlFromText(opts.bodyText) : '')
  const sig = opts.signatureHtml ?? (opts.signatureText ? toHtmlFromText(opts.signatureText) : '')
  const sigBlock = sig
    ? `<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/><div class="signature" style="color:#6b7280;white-space:pre-wrap">${sig}</div>`
    : ''
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(opts.subject || '')}</title>
  <style>
    body{margin:0;background:#f9fafb}
    .container{max-width:640px;margin:24px auto;padding:24px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;font:16px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans","Apple Color Emoji","Segoe UI Emoji";color:#111827}
    a{color:#2563eb}
    pre,code{font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace}
  </style>
  </head>
<body>
  <div class="container">${body}${sigBlock}</div>
</body>
</html>`
}

