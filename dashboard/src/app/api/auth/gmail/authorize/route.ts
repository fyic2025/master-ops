import { NextRequest, NextResponse } from 'next/server'

// Gmail OAuth2 scopes needed for reading emails
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
]

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const email = searchParams.get('email')

  // Validate required env vars
  const clientId = process.env.TEELIXIR_GMAIL_CLIENT_ID
  const redirectUri = process.env.TEELIXIR_GMAIL_REDIRECT_URI ||
    `${request.nextUrl.origin}/api/auth/gmail/callback`

  if (!clientId) {
    return NextResponse.json(
      { error: 'TEELIXIR_GMAIL_CLIENT_ID not configured' },
      { status: 500 }
    )
  }

  // Build Google OAuth2 authorization URL
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', SCOPES.join(' '))
  authUrl.searchParams.set('access_type', 'offline')
  authUrl.searchParams.set('prompt', 'consent') // Force consent to get refresh token

  // Pass email hint if provided
  if (email) {
    authUrl.searchParams.set('login_hint', email)
    // Store email in state for callback
    authUrl.searchParams.set('state', Buffer.from(JSON.stringify({ email })).toString('base64'))
  }

  return NextResponse.json({
    authUrl: authUrl.toString(),
    message: 'Redirect user to this URL to authorize Gmail access'
  })
}
