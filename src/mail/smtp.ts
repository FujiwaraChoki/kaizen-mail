import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type { Account } from "../utils/store";

export type Attachment = {
  filename?: string;
  content?: any;
  path?: string;
  contentType?: string;
  cid?: string;
};

// Connection pool to reuse SMTP connections
class SmtpConnectionPool {
  private static instance: SmtpConnectionPool;
  private transporters: Map<string, { transporter: Transporter; lastUsed: number; account: Account }>;
  private readonly maxIdleTime = 5 * 60 * 1000; // 5 minutes
  private readonly cleanupInterval = 60 * 1000; // 1 minute

  private constructor() {
    this.transporters = new Map();
    this.startCleanupTimer();
  }

  static getInstance(): SmtpConnectionPool {
    if (!SmtpConnectionPool.instance) {
      SmtpConnectionPool.instance = new SmtpConnectionPool();
    }
    return SmtpConnectionPool.instance;
  }

  private getConnectionKey(account: Account): string {
    return `${account.smtp.host}:${account.smtp.port}:${account.smtp.user}`;
  }

  private startCleanupTimer() {
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, conn] of this.transporters.entries()) {
      if (now - conn.lastUsed > this.maxIdleTime) {
        conn.transporter.close();
        this.transporters.delete(key);
      }
    }
  }

  async getTransporter(account: Account): Promise<Transporter> {
    const key = this.getConnectionKey(account);
    const existing = this.transporters.get(key);

    if (existing) {
      // Verify connection is still alive
      try {
        await existing.transporter.verify();
        existing.lastUsed = Date.now();
        return existing.transporter;
      } catch {
        // Connection is dead, remove it
        existing.transporter.close();
        this.transporters.delete(key);
      }
    }

    // Create new connection with pooling enabled
    const transporter = nodemailer.createTransport({
      host: account.smtp.host,
      port: account.smtp.port,
      secure: account.smtp.secure,
      auth: { user: account.smtp.user, pass: account.smtp.password },
      pool: true, // Enable connection pooling
      maxConnections: 5, // Maximum number of simultaneous connections
      maxMessages: 100, // Maximum messages per connection
      rateDelta: 1000, // Rate limiting: time window in ms
      rateLimit: 10, // Rate limiting: max messages per rateDelta
      // Performance optimizations
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 5000, // 5 seconds
      socketTimeout: 30000, // 30 seconds
    });

    // Verify connection immediately
    try {
      await transporter.verify();
    } catch (error) {
      transporter.close();
      throw new Error(`SMTP connection failed: ${error}`);
    }

    this.transporters.set(key, {
      transporter,
      lastUsed: Date.now(),
      account,
    });

    return transporter;
  }

  closeAll() {
    for (const conn of this.transporters.values()) {
      conn.transporter.close();
    }
    this.transporters.clear();
  }

  closeForAccount(account: Account) {
    const key = this.getConnectionKey(account);
    const conn = this.transporters.get(key);
    if (conn) {
      conn.transporter.close();
      this.transporters.delete(key);
    }
  }
}

// Singleton instance
const pool = SmtpConnectionPool.getInstance();

/**
 * Send email using connection pooling for better performance
 * Subsequent sends will reuse the existing connection
 */
export async function sendMail(
  account: Account,
  opts: { to: string; subject: string; text?: string; html?: string; attachments?: Attachment[] },
) {
  const transporter = await pool.getTransporter(account);

  const info = await transporter.sendMail({
    from: `${account.displayName} <${account.email}>`,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
    attachments: opts.attachments,
  });

  return info;
}

/**
 * Send email without pooling (for one-off sends)
 * Use this if you don't need connection reuse
 */
export async function sendMailOnce(
  account: Account,
  opts: { to: string; subject: string; text?: string; html?: string; attachments?: Attachment[] },
) {
  const transporter = nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: { user: account.smtp.user, pass: account.smtp.password },
    connectionTimeout: 10000,
    greetingTimeout: 5000,
    socketTimeout: 30000,
  });

  try {
    const info = await transporter.sendMail({
      from: `${account.displayName} <${account.email}>`,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
      attachments: opts.attachments,
    });
    return info;
  } finally {
    transporter.close();
  }
}

/**
 * Get a persistent transporter for sending multiple emails
 * Remember to call transporter.close() when done
 */
export async function createTransporter(account: Account): Promise<Transporter> {
  return pool.getTransporter(account);
}

/**
 * Close all SMTP connections
 */
export function closeAllConnections() {
  pool.closeAll();
}

/**
 * Close SMTP connection for a specific account
 */
export function closeConnection(account: Account) {
  pool.closeForAccount(account);
}

/**
 * Verify SMTP connection without sending
 * Useful for testing credentials
 */
export async function verifySmtpConnection(account: Account): Promise<boolean> {
  try {
    const transporter = await pool.getTransporter(account);
    await transporter.verify();
    return true;
  } catch {
    return false;
  }
}
