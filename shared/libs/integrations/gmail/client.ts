/**
 * Gmail OAuth2 Connector for Elevate Wholesale Prospecting
 *
 * Provides email sending capabilities via Gmail API with OAuth2 authentication.
 * Used for outbound prospecting email sequences.
 *
 * Usage:
 * ```typescript
 * import { gmailClient } from '@/shared/libs/integrations/gmail'
 *
 * // Send welcome email
 * const result = await gmailClient.send({
 *   to: 'customer@example.com',
 *   subject: 'Welcome to Elevate Wholesale',
 *   html: '<p>Hello...</p>',
 * })
 *
 * // Health check
 * const health = await gmailClient.healthCheck()
 * ```
 */

import { BaseConnector } from '../base/base-connector'
import * as dotenv from 'dotenv'

dotenv.config()

// ============================================================================
// Types
// ============================================================================

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  replyTo?: string
  cc?: string[]
  bcc?: string[]
}

export interface SendEmailResult {
  success: boolean
  messageId?: string
  threadId?: string
  error?: string
}

export interface GmailHealthCheck {
  status: 'healthy' | 'unhealthy'
  email?: string
  error?: string
}

// ============================================================================
// Gmail Connector
// ============================================================================

export class GmailConnector extends BaseConnector {
  private readonly clientId: string
  private readonly clientSecret: string
  private readonly refreshToken: string
  private readonly userEmail: string
  private readonly fromName: string
  private accessToken?: string
  private tokenExpiresAt?: number

  constructor() {
    super('gmail', {
      rateLimiter: {
        maxRequests: 100, // Gmail daily limit is higher but we want to be safe
        windowMs: 86400000, // 24 hours
      },
      retry: {
        maxRetries: 3,
        retryableStatusCodes: [429, 500, 502, 503, 504],
      },
      timeout: 30000,
    })

    this.clientId = process.env.ELEVATE_GMAIL_CLIENT_ID || ''
    this.clientSecret = process.env.ELEVATE_GMAIL_CLIENT_SECRET || ''
    this.refreshToken = process.env.ELEVATE_GMAIL_REFRESH_TOKEN || ''
    this.userEmail = process.env.ELEVATE_GMAIL_USER_EMAIL || ''
    this.fromName = process.env.ELEVATE_GMAIL_FROM_NAME || 'Elevate Wholesale'

    if (!this.clientId || !this.clientSecret || !this.refreshToken || !this.userEmail) {
      console.warn('Gmail OAuth2 credentials not fully configured. Check environment variables.')
    }
  }

  /**
   * Check if credentials are configured
   */
  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret && this.refreshToken && this.userEmail)
  }

  /**
   * Refresh OAuth2 access token
   */
  private async refreshAccessToken(): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Gmail OAuth2 credentials not configured')
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to refresh Gmail access token: ${error}`)
    }

    const data = await response.json() as { access_token: string; expires_in: number }
    this.accessToken = data.access_token
    // Refresh 5 minutes before expiry
    this.tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000
  }

  /**
   * Get valid access token
   */
  private async getAccessToken(): Promise<string> {
    if (!this.accessToken || !this.tokenExpiresAt || Date.now() >= this.tokenExpiresAt) {
      await this.refreshAccessToken()
    }
    return this.accessToken!
  }

  /**
   * Build MIME message for Gmail API
   */
  private buildMimeMessage(options: SendEmailOptions): string {
    const boundary = `boundary_${Date.now()}`

    const headers = [
      `From: ${this.fromName} <${this.userEmail}>`,
      `To: ${options.to}`,
      `Subject: ${options.subject}`,
      'MIME-Version: 1.0',
    ]

    if (options.replyTo) {
      headers.push(`Reply-To: ${options.replyTo}`)
    }

    if (options.cc?.length) {
      headers.push(`Cc: ${options.cc.join(', ')}`)
    }

    if (options.bcc?.length) {
      headers.push(`Bcc: ${options.bcc.join(', ')}`)
    }

    // If we have both HTML and text, use multipart/alternative
    if (options.text && options.html) {
      headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`)

      const body = [
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset="UTF-8"',
        'Content-Transfer-Encoding: quoted-printable',
        '',
        options.text,
        `--${boundary}`,
        'Content-Type: text/html; charset="UTF-8"',
        'Content-Transfer-Encoding: quoted-printable',
        '',
        options.html,
        `--${boundary}--`,
      ].join('\r\n')

      return [...headers, body].join('\r\n')
    }

    // HTML only
    headers.push('Content-Type: text/html; charset="UTF-8"')
    return [...headers, '', options.html].join('\r\n')
  }

  /**
   * Encode message for Gmail API (base64url)
   */
  private encodeMessage(message: string): string {
    return Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  }

  /**
   * Send an email via Gmail API
   */
  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    return this.execute('gmail.send', async () => {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'Gmail OAuth2 credentials not configured',
        }
      }

      try {
        const accessToken = await this.getAccessToken()
        const mimeMessage = this.buildMimeMessage(options)
        const encodedMessage = this.encodeMessage(mimeMessage)

        const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            raw: encodedMessage,
          }),
        })

        if (!response.ok) {
          const errorBody = await response.text()
          throw new Error(`Gmail API error (${response.status}): ${errorBody}`)
        }

        const result = await response.json() as { id: string; threadId: string }

        return {
          success: true,
          messageId: result.id,
          threadId: result.threadId,
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        }
      }
    })
  }

  /**
   * Send a templated email with variable replacement
   */
  async sendTemplated(
    template: { subject: string; html: string; text?: string },
    variables: Record<string, string>,
    to: string
  ): Promise<SendEmailResult> {
    // Replace {{variable}} patterns
    const replaceVars = (str: string) => {
      return str.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || `{{${key}}}`)
    }

    return this.send({
      to,
      subject: replaceVars(template.subject),
      html: replaceVars(template.html),
      text: template.text ? replaceVars(template.text) : undefined,
    })
  }

  /**
   * Health check
   */
  protected async performHealthCheck(): Promise<void> {
    const accessToken = await this.getAccessToken()
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    })

    if (!response.ok) {
      throw new Error(`Gmail API health check failed: ${response.status}`)
    }
  }

  async healthCheck(): Promise<GmailHealthCheck> {
    if (!this.isConfigured()) {
      return {
        status: 'unhealthy',
        error: 'Gmail OAuth2 credentials not configured',
      }
    }

    try {
      const accessToken = await this.getAccessToken()
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      })

      if (!response.ok) {
        throw new Error(`Gmail API error: ${response.status}`)
      }

      const profile = await response.json() as { emailAddress: string }

      return {
        status: 'healthy',
        email: profile.emailAddress,
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Get connector info
   */
  getInfo() {
    return {
      userEmail: this.userEmail,
      fromName: this.fromName,
      isConfigured: this.isConfigured(),
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let _gmailClient: GmailConnector | null = null

export const gmailClient = new Proxy({} as GmailConnector, {
  get(_, prop) {
    if (!_gmailClient) _gmailClient = new GmailConnector()
    return (_gmailClient as any)[prop]
  },
})

// Factory function
export function createGmailConnector(): GmailConnector {
  return new GmailConnector()
}
