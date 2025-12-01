import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import https from 'https'
import crypto from 'crypto'

// Email template
function getEmailHtml(firstName: string, discountCode: string, discountPercent: number): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,sans-serif;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:40px 0;">
        <table role="presentation" style="width:600px;max-width:100%;background:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="padding:40px;text-align:center;">
              <h1 style="color:#1a1a2e;margin:0 0 20px;font-size:28px;">We miss you, ${firstName}!</h1>
              <p style="color:#666;font-size:16px;line-height:1.6;margin:0 0 30px;">
                It's been a while since we've seen you at Teelixir. We'd love to welcome you back with a special offer.
              </p>
              <div style="background:#f8f4ff;border-radius:8px;padding:30px;margin:0 0 30px;">
                <p style="color:#666;font-size:14px;margin:0 0 10px;">Your exclusive discount code:</p>
                <p style="color:#7c3aed;font-size:32px;font-weight:bold;margin:0 0 10px;letter-spacing:2px;">${discountCode}</p>
                <p style="color:#1a1a2e;font-size:24px;font-weight:bold;margin:0;">${discountPercent}% OFF</p>
              </div>
              <a href="https://teelixir.com.au?discount=${discountCode}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:6px;font-weight:bold;font-size:16px;">
                Shop Now
              </a>
              <p style="color:#999;font-size:12px;margin:30px 0 0;">
                This is our maximum discount and can't be combined with other offers. One use per customer.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()
}

function getEmailText(firstName: string, discountCode: string, discountPercent: number): string {
  return `
Hi ${firstName},

We miss you at Teelixir!

It's been a while since your last visit, and we'd love to welcome you back with a special offer.

Your exclusive discount code: ${discountCode}
Save ${discountPercent}% on your next order!

Shop now: https://teelixir.com.au?discount=${discountCode}

This is our maximum discount and can't be combined with other offers. One use per customer.

Looking forward to seeing you back!

Colette
Teelixir Team
`.trim()
}

// Vault configuration
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

// Get Gmail credentials from vault
async function getGmailCredentials(): Promise<{ clientId: string; clientSecret: string; refreshToken: string } | null> {
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

// Send email via Gmail API
async function sendGmailEmail(
  creds: { clientId: string; clientSecret: string; refreshToken: string },
  config: { senderEmail: string; senderName: string; replyTo: string; bccEmail: string | null },
  to: string,
  subject: string,
  html: string,
  text: string
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

    // Build MIME message
    const boundary = `boundary_${Date.now()}`
    const headers = [
      `From: ${config.senderName} <${config.senderEmail}>`,
      `To: ${to}`,
      `Reply-To: ${config.replyTo}`,
    ]

    if (config.bccEmail) {
      headers.push(`Bcc: ${config.bccEmail}`)
    }

    headers.push(
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
    )

    const body = [
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      '',
      text,
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      '',
      html,
      `--${boundary}--`,
    ].join('\r\n')

    const mimeMessage = [...headers, body].join('\r\n')
    const encodedMessage = Buffer.from(mimeMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    // Send via Gmail API
    const sendResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedMessage }),
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

// POST /api/automations/winback/send - Send winback emails
export async function POST() {
  const startTime = Date.now()

  try {
    const supabase = createServerClient()

    // Get automation config
    const { data: configData, error: configError } = await supabase
      .from('tlx_automation_config')
      .select('enabled, config')
      .eq('automation_type', 'winback_40')
      .single()

    if (configError || !configData) {
      return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 })
    }

    if (!configData.enabled) {
      return NextResponse.json({ error: 'Automation is disabled' }, { status: 400 })
    }

    const config = configData.config
    const dailyLimit = config.daily_limit || 20

    // Check sent today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { count: sentToday } = await supabase
      .from('tlx_winback_emails')
      .select('*', { count: 'exact', head: true })
      .gte('sent_at', today.toISOString())

    const remaining = Math.max(0, dailyLimit - (sentToday || 0))

    if (remaining === 0) {
      return NextResponse.json({ error: `Daily limit reached (${dailyLimit})` }, { status: 400 })
    }

    // Get Gmail credentials from vault
    const gmailCreds = await getGmailCredentials()
    if (!gmailCreds) {
      return NextResponse.json({ error: 'Gmail credentials not configured in vault' }, { status: 500 })
    }

    // Get emails already sent (to exclude them)
    const { data: alreadySent } = await supabase
      .from('tlx_winback_emails')
      .select('email')

    const sentEmails = new Set((alreadySent || []).map(r => r.email.toLowerCase()))

    // Get eligible profiles from Klaviyo unengaged pool (not yet emailed)
    const { data: allProfiles, error: profilesError } = await supabase
      .from('tlx_klaviyo_unengaged')
      .select('*')
      .order('last_order_date', { ascending: true })

    if (profilesError) {
      console.error('Profile fetch error:', profilesError)
      return NextResponse.json({ error: `Failed to fetch profiles: ${profilesError.message}` }, { status: 500 })
    }

    // Filter out already-emailed profiles
    const profiles = (allProfiles || [])
      .filter(p => !sentEmails.has(p.email.toLowerCase()))
      .slice(0, remaining)

    if (profiles.length === 0) {
      return NextResponse.json({ message: 'No eligible profiles to email', emails_sent: 0 })
    }

    // Send emails
    let sentCount = 0
    let failedCount = 0

    const emailConfig = {
      senderEmail: config.sender_email || 'colette@teelixir.com',
      senderName: config.sender_name || 'Colette from Teelixir',
      replyTo: config.reply_to_email || 'sales@teelixir.com',
      bccEmail: config.bcc_email || null
    }

    for (const profile of profiles) {
      const firstName = profile.first_name || config.default_name || 'there'
      const subject = (config.subject_template || '{{ first_name }}, we miss you! Here\'s 40% off')
        .replace('{{ first_name }}', firstName)

      const html = getEmailHtml(firstName, config.discount_code, config.discount_percent)
      const text = getEmailText(firstName, config.discount_code, config.discount_percent)

      const result = await sendGmailEmail(gmailCreds, emailConfig, profile.email, subject, html, text)

      if (result.success) {
        sentCount++

        // Record in database
        await supabase.from('tlx_winback_emails').insert({
          klaviyo_profile_id: profile.klaviyo_profile_id,
          email: profile.email,
          first_name: profile.first_name,
          discount_code: config.discount_code,
          status: 'sent',
          sent_at: new Date().toISOString()
        })

        console.log(`[Winback] Sent to ${profile.email}`)
      } else {
        failedCount++

        // Record failed attempt
        await supabase.from('tlx_winback_emails').insert({
          klaviyo_profile_id: profile.klaviyo_profile_id,
          email: profile.email,
          first_name: profile.first_name,
          discount_code: config.discount_code,
          status: 'failed',
          error_message: result.error,
          sent_at: new Date().toISOString()
        })

        console.error(`[Winback] Failed to send to ${profile.email}: ${result.error}`)
      }

      // Small delay between emails (500ms)
      await new Promise(r => setTimeout(r, 500))
    }

    // Update job status
    await supabase
      .from('dashboard_job_status')
      .update({
        last_run_at: new Date().toISOString(),
        last_success_at: sentCount > 0 ? new Date().toISOString() : undefined,
        status: failedCount === 0 ? 'healthy' : 'warning',
        error_message: failedCount > 0 ? `${failedCount} emails failed` : null,
        updated_at: new Date().toISOString()
      })
      .eq('job_name', 'winback-email-send')
      .eq('business', 'teelixir')

    return NextResponse.json({
      success: true,
      message: `Sent ${sentCount} emails${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      emails_sent: sentCount,
      emails_failed: failedCount,
      duration_ms: Date.now() - startTime
    })

  } catch (error: any) {
    console.error('Winback send error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
