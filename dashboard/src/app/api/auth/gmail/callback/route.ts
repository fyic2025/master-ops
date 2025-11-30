import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Handle errors from Google
  if (error) {
    return NextResponse.redirect(
      new URL(`/teelixir/distributors/admin?error=${encodeURIComponent(error)}`, request.nextUrl.origin)
    )
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/teelixir/distributors/admin?error=no_code', request.nextUrl.origin)
    )
  }

  // Get environment variables
  const clientId = process.env.TEELIXIR_GMAIL_CLIENT_ID
  const clientSecret = process.env.TEELIXIR_GMAIL_CLIENT_SECRET
  const redirectUri = process.env.TEELIXIR_GMAIL_REDIRECT_URI ||
    `${request.nextUrl.origin}/api/auth/gmail/callback`

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL('/teelixir/distributors/admin?error=missing_credentials', request.nextUrl.origin)
    )
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Token exchange failed:', errorData)
      return NextResponse.redirect(
        new URL('/teelixir/distributors/admin?error=token_exchange_failed', request.nextUrl.origin)
      )
    }

    const tokens = await tokenResponse.json()

    // Get user info to identify the email
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    if (!userInfoResponse.ok) {
      return NextResponse.redirect(
        new URL('/teelixir/distributors/admin?error=userinfo_failed', request.nextUrl.origin)
      )
    }

    const userInfo = await userInfoResponse.json()
    const email = userInfo.email
    const displayName = userInfo.name || email

    // Store in database
    const supabase = createServerClient()

    const { error: upsertError } = await supabase
      .from('tlx_gmail_connections')
      .upsert({
        email,
        display_name: displayName,
        refresh_token: tokens.refresh_token,
        access_token: tokens.access_token,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        scopes: tokens.scope?.split(' ') || [],
        connected_at: new Date().toISOString(),
        is_active: true,
      }, {
        onConflict: 'email',
      })

    if (upsertError) {
      console.error('Database error:', upsertError)
      return NextResponse.redirect(
        new URL('/teelixir/distributors/admin?error=database_error', request.nextUrl.origin)
      )
    }

    // Success - redirect back to admin page
    return NextResponse.redirect(
      new URL(`/teelixir/distributors/admin?success=connected&email=${encodeURIComponent(email)}`, request.nextUrl.origin)
    )
  } catch (err) {
    console.error('OAuth callback error:', err)
    return NextResponse.redirect(
      new URL('/teelixir/distributors/admin?error=unknown', request.nextUrl.origin)
    )
  }
}
