import { NextRequest, NextResponse } from 'next/server'
import https from 'https'
import crypto from 'crypto'

interface EmailRequest {
  to: string
  from: string
  fromName?: string
  replyTo?: string
  subject: string
  html: string
  text?: string
  bcc?: string
}

// Vault configuration for fetching Gmail credentials
const VAULT_CONFIG = {
  host: 'usibnysqelovfuctmkqw.supabase.co',
  serviceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s',
  encryptionKey: 'mstr-ops-vault-2024-secure-key'
}

// Decrypt vault value
function decryptVaultValue(encryptedValue: string): string | null {
  try {
    const buffer = Buffer.from(encryptedValue, 'base64')
    const iv = buffer.subarray(0, 16)
    const encrypted = buffer.subarray(16)
    const key = crypto.createHash('sha256').update(VAULT_CONFIG.encryptionKey).digest()
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    let decrypted = decipher.update(encrypted)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    return decrypted.toString('utf8')
  } catch (e) {
    return null
  }
}

// Fetch credential from vault
function fetchVaultCred(name: string): Promise<string | null> {
  return new Promise((resolve) => {
    const options = {
      hostname: VAULT_CONFIG.host,
      port: 443,
      path: `/rest/v1/secure_credentials?project=eq.teelixir&name=eq.${name}&select=encrypted_value`,
      method: 'GET',
      headers: {
        'apikey': VAULT_CONFIG.serviceKey,
        'Authorization': `Bearer ${VAULT_CONFIG.serviceKey}`,
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        try {
          const rows = JSON.parse(data)
          if (rows.length > 0 && rows[0].encrypted_value) {
            resolve(decryptVaultValue(rows[0].encrypted_value))
          } else {
            resolve(null)
          }
        } catch (e) {
          resolve(null)
        }
      })
    })

    req.on('error', () => resolve(null))
    req.end()
  })
}

// Get Gmail credentials - try env vars first, fallback to vault
async function getGmailCredentials(): Promise<{ clientId: string; clientSecret: string; refreshToken: string } | null> {
  // Try environment variables first
  const envClientId = process.env.TEELIXIR_GMAIL_CLIENT_ID || process.env.GMAIL_CLIENT_ID
  const envClientSecret = process.env.TEELIXIR_GMAIL_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET
  const envRefreshToken = process.env.TEELIXIR_GMAIL_REFRESH_TOKEN || process.env.GMAIL_REFRESH_TOKEN

  if (envClientId && envClientSecret && envRefreshToken) {
    return { clientId: envClientId, clientSecret: envClientSecret, refreshToken: envRefreshToken }
  }

  // Fallback to vault
  const [clientId, clientSecret, refreshToken] = await Promise.all([
    fetchVaultCred('gmail_client_id'),
    fetchVaultCred('gmail_client_secret'),
    fetchVaultCred('gmail_refresh_token')
  ])

  if (clientId && clientSecret && refreshToken) {
    return { clientId, clientSecret, refreshToken }
  }
  return null
}

// Build RFC 2822 email message
function buildRawEmail(email: EmailRequest): string {
  const boundary = `----=_Part_${Date.now()}`

  const headers = [
    `From: ${email.fromName ? `"${email.fromName}" <${email.from}>` : email.from}`,
    `To: ${email.to}`,
    `Subject: ${email.subject}`,
    email.replyTo ? `Reply-To: ${email.replyTo}` : null,
    email.bcc ? `Bcc: ${email.bcc}` : null,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].filter(Boolean).join('\r\n')

  const textPart = email.text || email.html.replace(/<[^>]*>/g, '')

  const body = [
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    textPart,
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    '',
    email.html,
    `--${boundary}--`,
  ].join('\r\n')

  const fullEmail = `${headers}\r\n\r\n${body}`

  // Base64url encode
  return Buffer.from(fullEmail)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

// Send email via Gmail API using OAuth2
async function sendGmailEmail(
  creds: { clientId: string; clientSecret: string; refreshToken: string },
  email: EmailRequest
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Get access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        refresh_token: creds.refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text()
      return { success: false, error: `Token refresh failed: ${error}` }
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Build raw email
    const raw = buildRawEmail(email)

    // Send via Gmail API
    const sendResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    })

    if (!sendResponse.ok) {
      const errorBody = await sendResponse.text()
      return { success: false, error: `Gmail API error (${sendResponse.status}): ${errorBody}` }
    }

    const result = await sendResponse.json()
    return { success: true, messageId: result.id }

  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: EmailRequest = await request.json()

    // Validate required fields
    if (!body.to || !body.from || !body.subject || !body.html) {
      return NextResponse.json(
        { error: 'Missing required fields: to, from, subject, html' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.to)) {
      return NextResponse.json(
        { error: 'Invalid recipient email address' },
        { status: 400 }
      )
    }

    // Get Gmail credentials (env vars or vault)
    const creds = await getGmailCredentials()
    if (!creds) {
      return NextResponse.json(
        { error: 'Gmail OAuth credentials not configured' },
        { status: 500 }
      )
    }

    const result = await sendGmailEmail(creds, body)

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId
      })
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('Email send error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    )
  }
}
