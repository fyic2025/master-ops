#!/usr/bin/env npx tsx
/**
 * Gmail OAuth Flow - Get refresh token for colette@teelixir.com
 *
 * Usage: npx tsx scripts/gmail-oauth-flow.ts
 *
 * This will:
 * 1. Start a local server on port 3456
 * 2. Open your browser to Google's OAuth consent
 * 3. Capture the auth code and exchange for tokens
 * 4. Display the refresh token to save
 */

import http from 'http'
import { URL } from 'url'
import path from 'path'

const REDIRECT_URI = 'http://localhost:3456/oauth/callback'
const TARGET_EMAIL = 'colette@teelixir.com'

// Scopes needed for sending emails
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
]

// OAuth Configuration - load from environment or creds.js vault (async)
async function getOAuthConfig(): Promise<{ clientId: string; clientSecret: string }> {
  // Try environment variables first
  if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET) {
    return {
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET
    }
  }

  // Also check TEELIXIR_ prefixed vars
  if (process.env.TEELIXIR_GMAIL_CLIENT_ID && process.env.TEELIXIR_GMAIL_CLIENT_SECRET) {
    return {
      clientId: process.env.TEELIXIR_GMAIL_CLIENT_ID,
      clientSecret: process.env.TEELIXIR_GMAIL_CLIENT_SECRET
    }
  }

  // Fallback to creds.js vault (async API)
  try {
    const credsPath = path.join(__dirname, '..', 'creds.js')
    const creds = require(credsPath)
    const clientId = await creds.get('teelixir', 'gmail_client_id')
    const clientSecret = await creds.get('teelixir', 'gmail_client_secret')

    if (clientId && clientSecret) {
      return { clientId, clientSecret }
    }
  } catch (e) {
    // creds.js not found or invalid
  }

  throw new Error('Gmail OAuth credentials not found. Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET environment variables or store in vault')
}

async function exchangeCodeForTokens(code: string, clientId: string, clientSecret: string): Promise<any> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token exchange failed: ${error}`)
  }

  return response.json()
}

async function getUserInfo(accessToken: string): Promise<any> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return response.json()
}

function startServer(): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url!, `http://localhost:3456`)

      if (url.pathname === '/oauth/callback') {
        const code = url.searchParams.get('code')
        const error = url.searchParams.get('error')

        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html' })
          res.end(`<h1>Error: ${error}</h1><p>Please try again.</p>`)
          server.close()
          reject(new Error(error))
          return
        }

        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end(`
            <html>
              <head><title>OAuth Success</title></head>
              <body style="font-family: sans-serif; padding: 40px; text-align: center;">
                <h1 style="color: green;">✅ Authorization Successful!</h1>
                <p>You can close this window and return to the terminal.</p>
              </body>
            </html>
          `)
          server.close()
          resolve(code)
          return
        }
      }

      res.writeHead(404)
      res.end('Not found')
    })

    server.listen(3456, () => {
      console.log('🌐 Local server started on http://localhost:3456')
    })

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error('Port 3456 is already in use. Please close other applications using it.'))
      } else {
        reject(err)
      }
    })

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close()
      reject(new Error('Timeout waiting for OAuth callback'))
    }, 5 * 60 * 1000)
  })
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════════════╗')
  console.log('║  GMAIL OAUTH FLOW - Get Refresh Token                                ║')
  console.log('║  Target: colette@teelixir.com                                        ║')
  console.log('╚══════════════════════════════════════════════════════════════════════╝')

  // Load credentials
  console.log('\n🔐 Loading OAuth credentials...')
  const { clientId, clientSecret } = await getOAuthConfig()
  console.log('   ✅ Credentials loaded from vault')

  // Build authorization URL
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', SCOPES.join(' '))
  authUrl.searchParams.set('access_type', 'offline')
  authUrl.searchParams.set('prompt', 'consent')
  authUrl.searchParams.set('login_hint', TARGET_EMAIL)

  console.log('\n📋 Steps:')
  console.log('   1. A browser window will open')
  console.log(`   2. Sign in as ${TARGET_EMAIL}`)
  console.log('   3. Grant the requested permissions')
  console.log('   4. You\'ll be redirected back here\n')

  // Start server first
  const codePromise = startServer()

  // Open browser
  console.log('🔗 Opening browser...')
  console.log(`\n   If browser doesn't open, visit:\n   ${authUrl.toString()}\n`)

  // Try to open browser (works on Windows)
  const { exec } = await import('child_process')
  exec(`start "" "${authUrl.toString()}"`)

  try {
    // Wait for authorization code
    console.log('⏳ Waiting for authorization...\n')
    const code = await codePromise

    console.log('✅ Authorization code received!')
    console.log('\n🔄 Exchanging code for tokens...')

    // Exchange for tokens
    const tokens = await exchangeCodeForTokens(code, clientId, clientSecret)

    // Get user info to verify
    const userInfo = await getUserInfo(tokens.access_token)

    console.log('\n' + '═'.repeat(70))
    console.log('🎉 SUCCESS! OAuth tokens obtained')
    console.log('═'.repeat(70))
    console.log(`\n📧 Authorized email: ${userInfo.email}`)
    console.log(`👤 Name: ${userInfo.name || 'N/A'}`)

    console.log('\n┌─────────────────────────────────────────────────────────────────────┐')
    console.log('│ CREDENTIALS TO SAVE                                                 │')
    console.log('├─────────────────────────────────────────────────────────────────────┤')
    console.log(`│ TEELIXIR_GMAIL_CLIENT_ID=${clientId}`)
    console.log(`│ TEELIXIR_GMAIL_CLIENT_SECRET=${clientSecret}`)
    console.log(`│ TEELIXIR_GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`)
    console.log('└─────────────────────────────────────────────────────────────────────┘')

    console.log('\n💡 Store in vault:')
    console.log(`   node creds.js store teelixir gmail_refresh_token "${tokens.refresh_token}"`)
    console.log('\n📝 Refresh token (copy this):')
    console.log(`\n${tokens.refresh_token}\n`)

  } catch (error: any) {
    console.error('\n❌ OAuth flow failed:', error.message)
    process.exit(1)
  }
}

main().catch(console.error)
