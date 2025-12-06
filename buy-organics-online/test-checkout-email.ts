#!/usr/bin/env npx tsx
/**
 * Test script for Checkout Error Email Notifications
 *
 * Usage:
 *   npx tsx buy-organics-online/test-checkout-email.ts
 *
 * Required environment variables:
 *   BOO_GMAIL_CLIENT_ID or GMAIL_CLIENT_ID
 *   BOO_GMAIL_CLIENT_SECRET or GMAIL_CLIENT_SECRET
 *   BOO_GMAIL_REFRESH_TOKEN or GMAIL_REFRESH_TOKEN
 *   BOO_GMAIL_USER_EMAIL or GMAIL_USER_EMAIL
 *
 * Or for Elevate's existing credentials:
 *   ELEVATE_GMAIL_CLIENT_ID
 *   ELEVATE_GMAIL_CLIENT_SECRET
 *   ELEVATE_GMAIL_REFRESH_TOKEN
 *   ELEVATE_GMAIL_USER_EMAIL
 */

import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()
dotenv.config({ path: '.env.local' })
dotenv.config({ path: 'MASTER-CREDENTIALS-COMPLETE.env' })

// Configuration - try multiple env var patterns
const GMAIL_CLIENT_ID =
  process.env.BOO_GMAIL_CLIENT_ID ||
  process.env.GMAIL_CLIENT_ID ||
  process.env.ELEVATE_GMAIL_CLIENT_ID || ''

const GMAIL_CLIENT_SECRET =
  process.env.BOO_GMAIL_CLIENT_SECRET ||
  process.env.GMAIL_CLIENT_SECRET ||
  process.env.ELEVATE_GMAIL_CLIENT_SECRET || ''

const GMAIL_REFRESH_TOKEN =
  process.env.BOO_GMAIL_REFRESH_TOKEN ||
  process.env.GMAIL_REFRESH_TOKEN ||
  process.env.ELEVATE_GMAIL_REFRESH_TOKEN || ''

const GMAIL_USER_EMAIL =
  process.env.BOO_GMAIL_USER_EMAIL ||
  process.env.GMAIL_USER_EMAIL ||
  process.env.ELEVATE_GMAIL_USER_EMAIL || ''

const GMAIL_FROM_NAME = process.env.BOO_GMAIL_FROM_NAME || 'Buy Organics Online Alerts'

// Test recipients
const EMAIL_TO = 'sales@buyorganicsonline.com.au'
const EMAIL_CC = 'jayson@fyic.com.au'

console.log('='.repeat(60))
console.log('BOO Checkout Error Email Test')
console.log('='.repeat(60))
console.log('')

// Check configuration
console.log('Configuration Check:')
console.log(`  GMAIL_CLIENT_ID: ${GMAIL_CLIENT_ID ? '✓ Set (' + GMAIL_CLIENT_ID.substring(0, 20) + '...)' : '✗ Missing'}`)
console.log(`  GMAIL_CLIENT_SECRET: ${GMAIL_CLIENT_SECRET ? '✓ Set (hidden)' : '✗ Missing'}`)
console.log(`  GMAIL_REFRESH_TOKEN: ${GMAIL_REFRESH_TOKEN ? '✓ Set (hidden)' : '✗ Missing'}`)
console.log(`  GMAIL_USER_EMAIL: ${GMAIL_USER_EMAIL ? '✓ Set (' + GMAIL_USER_EMAIL + ')' : '✗ Missing'}`)
console.log(`  FROM_NAME: ${GMAIL_FROM_NAME}`)
console.log('')
console.log(`  TO: ${EMAIL_TO}`)
console.log(`  CC: ${EMAIL_CC}`)
console.log('')

if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN || !GMAIL_USER_EMAIL) {
  console.log('❌ Missing required Gmail OAuth2 credentials!')
  console.log('')
  console.log('Please set these environment variables:')
  console.log('  BOO_GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com')
  console.log('  BOO_GMAIL_CLIENT_SECRET=your-client-secret')
  console.log('  BOO_GMAIL_REFRESH_TOKEN=your-refresh-token')
  console.log('  BOO_GMAIL_USER_EMAIL=alerts@buyorganicsonline.com.au')
  console.log('')
  console.log('Or if using Elevate\'s existing credentials:')
  console.log('  ELEVATE_GMAIL_CLIENT_ID')
  console.log('  ELEVATE_GMAIL_CLIENT_SECRET')
  console.log('  ELEVATE_GMAIL_REFRESH_TOKEN')
  console.log('  ELEVATE_GMAIL_USER_EMAIL')
  process.exit(1)
}

// Step 1: Get access token
console.log('Step 1: Refreshing OAuth2 access token...')

async function getAccessToken(): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      refresh_token: GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to refresh access token: ${error}`)
  }

  const data = await response.json() as any
  return data.access_token
}

// Step 2: Build and send test email
function buildMimeMessage(to: string, cc: string, subject: string, html: string): string {
  const fromHeader = GMAIL_FROM_NAME ? `${GMAIL_FROM_NAME} <${GMAIL_USER_EMAIL}>` : GMAIL_USER_EMAIL

  const headers = [
    `From: ${fromHeader}`,
    `To: ${to}`,
    `Cc: ${cc}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset="UTF-8"',
  ]

  return [...headers, '', html].join('\r\n')
}

function encodeMessage(message: string): string {
  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function sendTestEmail(accessToken: string): Promise<void> {
  const timestamp = new Date().toLocaleString('en-AU', {
    timeZone: 'Australia/Sydney',
    dateStyle: 'full',
    timeStyle: 'long'
  })

  const subject = `[TEST] BOO Checkout Error Alert - ${new Date().toISOString()}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">

    <!-- Header -->
    <div style="background: #28a745; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
      <h1 style="margin: 0; font-size: 24px;">✅ Test Email - Checkout Error Tracking</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">This is a test email to verify the system is working</p>
    </div>

    <!-- Content -->
    <div style="background: white; padding: 25px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

      <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin-bottom: 20px;">
        <strong style="color: #28a745;">Success!</strong>
        <p style="margin: 10px 0 0 0;">The checkout error tracking email system is working correctly.</p>
      </div>

      <h2 style="margin: 0 0 10px 0; font-size: 18px; color: #333; border-bottom: 2px solid #eee; padding-bottom: 5px;">Test Details</h2>

      <table style="width: 100%;">
        <tr>
          <td style="padding: 5px 0; color: #666; width: 150px;"><strong>Sent From:</strong></td>
          <td style="padding: 5px 0;">${GMAIL_USER_EMAIL}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #666;"><strong>Sent To:</strong></td>
          <td style="padding: 5px 0;">${EMAIL_TO}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #666;"><strong>CC:</strong></td>
          <td style="padding: 5px 0;">${EMAIL_CC}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #666;"><strong>Timestamp:</strong></td>
          <td style="padding: 5px 0;">${timestamp}</td>
        </tr>
      </table>

      <h2 style="margin: 20px 0 10px 0; font-size: 18px; color: #333; border-bottom: 2px solid #eee; padding-bottom: 5px;">What Happens Next</h2>

      <p>When a real checkout error occurs, you'll receive an email like this with:</p>
      <ul>
        <li><strong>Error Details</strong> - The exact error message</li>
        <li><strong>Customer Info</strong> - Name, email, phone (if available)</li>
        <li><strong>Cart Contents</strong> - All products with prices</li>
        <li><strong>Shipping Address</strong> - The address they entered</li>
        <li><strong>Technical Details</strong> - Page URL, browser, session ID</li>
      </ul>

      <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #eee; font-size: 12px; color: #888;">
        <p style="margin: 0;">This is a test email from the Buy Organics Online checkout error tracking system.</p>
      </div>

    </div>
  </div>
</body>
</html>
  `

  const mimeMessage = buildMimeMessage(EMAIL_TO, EMAIL_CC, subject, html)
  const encodedMessage = encodeMessage(mimeMessage)

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
    const error = await response.text()
    throw new Error(`Gmail API error: ${error}`)
  }

  const result = await response.json()
  return result
}

// Run the test
async function main() {
  try {
    const accessToken = await getAccessToken()
    console.log('  ✓ Access token obtained successfully')
    console.log('')

    console.log('Step 2: Sending test email...')
    const result = await sendTestEmail(accessToken) as { id: string; threadId: string }
    console.log('  ✓ Email sent successfully!')
    console.log(`  Message ID: ${result.id}`)
    console.log(`  Thread ID: ${result.threadId}`)
    console.log('')

    console.log('='.repeat(60))
    console.log('✅ TEST PASSED - Email system is working!')
    console.log('='.repeat(60))
    console.log('')
    console.log(`Check the inbox of ${EMAIL_TO} for the test email.`)
    console.log(`(Also CC'd to ${EMAIL_CC})`)
    console.log('')

  } catch (error) {
    console.log('')
    console.log('='.repeat(60))
    console.log('❌ TEST FAILED')
    console.log('='.repeat(60))
    console.log('')
    console.error('Error:', error instanceof Error ? error.message : error)
    console.log('')
    console.log('Troubleshooting:')
    console.log('1. Verify your Gmail OAuth2 credentials are correct')
    console.log('2. Ensure the Gmail API is enabled in Google Cloud Console')
    console.log('3. Check that the refresh token has the gmail.send scope')
    console.log('4. Make sure the OAuth consent screen is configured')
    process.exit(1)
  }
}

main()
