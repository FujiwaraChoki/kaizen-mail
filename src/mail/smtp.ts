import nodemailer from 'nodemailer'
import type {Account} from '../utils/store'

export type Attachment = {
  filename?: string
  content?: any
  path?: string
  contentType?: string
  cid?: string
}

export async function sendMail(account: Account, opts: {to: string; subject: string; text?: string; html?: string; attachments?: Attachment[]}) {
  const transporter = nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: {user: account.smtp.user, pass: account.smtp.password},
  })

  const info = await transporter.sendMail({
    from: `${account.displayName} <${account.email}>`,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
    attachments: opts.attachments,
  })
  return info
}
