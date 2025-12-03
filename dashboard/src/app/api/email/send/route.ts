import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

// Gmail OAuth2 configuration
const GMAIL_CLIENT_ID = process.env.TEELIXIR_GMAIL_CLIENT_ID || process.env.GMAIL_CLIENT_ID
const GMAIL_CLIENT_SECRET = process.env.TEELIXIR_GMAIL_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET
const GMAIL_REFRESH_TOKEN = process.env.TEELIXIR_GMAIL_REFRESH_TOKEN || process.env.GMAIL_REFRESH_TOKEN

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

// Create Gmail OAuth2 client
function createGmailClient() {
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
    throw new Error('Gmail OAuth credentials not configured')
  }

  const oauth2Client = new google.auth.OAuth2(
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  )

  oauth2Client.setCredentials({
    refresh_token: GMAIL_REFRESH_TOKEN
  })

  return google.gmail({ version: 'v1', auth: oauth2Client })
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

    const gmail = createGmailClient()
    const raw = buildRawEmail(body)

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw
      }
    })

    return NextResponse.json({
      success: true,
      messageId: response.data.id,
      threadId: response.data.threadId
    })

  } catch (error: any) {
    console.error('Email send error:', error)

    // Check for specific Gmail API errors
    if (error.code === 401 || error.message?.includes('invalid_grant')) {
      return NextResponse.json(
        { error: 'Gmail authentication failed - token may need refresh' },
        { status: 401 }
      )
    }

    if (error.code === 403) {
      return NextResponse.json(
        { error: 'Gmail API access denied - check OAuth scopes' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    )
  }
}
