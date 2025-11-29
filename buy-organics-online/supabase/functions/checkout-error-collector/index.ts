// Buy Organics Online - Checkout Error Collector Edge Function
// Receives checkout errors from storefront, logs to Supabase, and sends email notifications
// Endpoints: POST /checkout-error-collector

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const WEBHOOK_SECRET = Deno.env.get('BOO_CHECKOUT_WEBHOOK_SECRET') || ''

// Gmail OAuth2 configuration (preferred - uses existing G Suite)
const GMAIL_CLIENT_ID = Deno.env.get('BOO_GMAIL_CLIENT_ID') || Deno.env.get('GMAIL_CLIENT_ID') || ''
const GMAIL_CLIENT_SECRET = Deno.env.get('BOO_GMAIL_CLIENT_SECRET') || Deno.env.get('GMAIL_CLIENT_SECRET') || ''
const GMAIL_REFRESH_TOKEN = Deno.env.get('BOO_GMAIL_REFRESH_TOKEN') || Deno.env.get('GMAIL_REFRESH_TOKEN') || ''
const GMAIL_USER_EMAIL = Deno.env.get('BOO_GMAIL_USER_EMAIL') || Deno.env.get('GMAIL_USER_EMAIL') || ''
const GMAIL_FROM_NAME = Deno.env.get('BOO_GMAIL_FROM_NAME') || 'Buy Organics Online Alerts'

// Email recipients
const EMAIL_TO = 'sales@buyorganicsonline.com.au'
const EMAIL_CC = 'jayson@fyic.com.au'

// Types
interface CheckoutErrorPayload {
  // Error details
  error_type: 'add_to_cart' | 'shipping_address' | 'shipping_method' | 'payment' | 'validation' | 'unknown'
  error_code?: string
  error_message: string
  error_stack?: string

  // Customer details
  customer_email?: string
  customer_name?: string
  customer_phone?: string

  // Cart contents
  cart_id?: string
  products?: Array<{
    id: number
    name: string
    sku?: string
    quantity: number
    price: number
    variant?: string
  }>
  cart_value?: number
  cart_weight?: number

  // Shipping address
  shipping_address?: {
    first_name?: string
    last_name?: string
    company?: string
    address1?: string
    address2?: string
    city?: string
    state?: string
    postcode?: string
    country?: string
    phone?: string
  }

  // Technical context
  page_url?: string
  user_agent?: string
  session_id?: string
  referrer?: string

  // Webhook auth
  webhook_secret?: string
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Generate correlation ID for tracing
function generateCorrelationId(): string {
  return `err-${Date.now()}-${Math.random().toString(36).substring(7)}`
}

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD'
  }).format(amount)
}

// Format products for email
function formatProductsHtml(products: CheckoutErrorPayload['products']): string {
  if (!products || products.length === 0) {
    return '<p><em>No products in cart</em></p>'
  }

  const rows = products.map(p => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${p.name}${p.variant ? ` (${p.variant})` : ''}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${p.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(p.price)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(p.price * p.quantity)}</td>
    </tr>
  `).join('')

  return `
    <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
      <thead>
        <tr style="background: #f5f5f5;">
          <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Product</th>
          <th style="padding: 8px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
          <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
          <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `
}

// Format shipping address for email
function formatAddressHtml(address: CheckoutErrorPayload['shipping_address']): string {
  if (!address) {
    return '<p><em>No address provided</em></p>'
  }

  const lines = []
  if (address.first_name || address.last_name) {
    lines.push(`${address.first_name || ''} ${address.last_name || ''}`.trim())
  }
  if (address.company) lines.push(address.company)
  if (address.address1) lines.push(address.address1)
  if (address.address2) lines.push(address.address2)
  if (address.city || address.state || address.postcode) {
    lines.push(`${address.city || ''} ${address.state || ''} ${address.postcode || ''}`.trim())
  }
  if (address.country) lines.push(address.country)
  if (address.phone) lines.push(`Phone: ${address.phone}`)

  return lines.length > 0
    ? `<p style="margin: 0; line-height: 1.6;">${lines.join('<br>')}</p>`
    : '<p><em>No address provided</em></p>'
}

// Get error type label
function getErrorTypeLabel(errorType: string): string {
  const labels: Record<string, string> = {
    'add_to_cart': 'Add to Cart Failed',
    'shipping_address': 'Shipping Address Error',
    'shipping_method': 'Shipping Method Error',
    'payment': 'Payment Error',
    'validation': 'Validation Error',
    'unknown': 'Unknown Error'
  }
  return labels[errorType] || 'Checkout Error'
}

// Get error type color
function getErrorTypeColor(errorType: string): string {
  const colors: Record<string, string> = {
    'add_to_cart': '#e74c3c',
    'shipping_address': '#e67e22',
    'shipping_method': '#f39c12',
    'payment': '#c0392b',
    'validation': '#9b59b6',
    'unknown': '#7f8c8d'
  }
  return colors[errorType] || '#e74c3c'
}

// Build email HTML
function buildEmailHtml(payload: CheckoutErrorPayload, correlationId: string): string {
  const errorColor = getErrorTypeColor(payload.error_type)
  const errorLabel = getErrorTypeLabel(payload.error_type)
  const timestamp = new Date().toLocaleString('en-AU', {
    timeZone: 'Australia/Sydney',
    dateStyle: 'full',
    timeStyle: 'long'
  })

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">

    <!-- Header -->
    <div style="background: ${errorColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
      <h1 style="margin: 0; font-size: 24px;">Checkout Error Alert</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">${errorLabel}</p>
    </div>

    <!-- Content -->
    <div style="background: white; padding: 25px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

      <!-- Error Message -->
      <div style="background: #fff3cd; border-left: 4px solid ${errorColor}; padding: 15px; margin-bottom: 20px;">
        <strong style="color: ${errorColor};">Error Message:</strong>
        <p style="margin: 10px 0 0 0; font-family: monospace; word-break: break-word;">${payload.error_message}</p>
        ${payload.error_code ? `<p style="margin: 10px 0 0 0;"><strong>Error Code:</strong> ${payload.error_code}</p>` : ''}
      </div>

      <!-- Customer Details -->
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0 0 10px 0; font-size: 18px; color: #333; border-bottom: 2px solid #eee; padding-bottom: 5px;">Customer Details</h2>
        <table style="width: 100%;">
          <tr>
            <td style="padding: 5px 0; color: #666; width: 120px;"><strong>Name:</strong></td>
            <td style="padding: 5px 0;">${payload.customer_name || '<em>Not provided</em>'}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #666;"><strong>Email:</strong></td>
            <td style="padding: 5px 0;">${payload.customer_email ? `<a href="mailto:${payload.customer_email}">${payload.customer_email}</a>` : '<em>Not provided</em>'}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #666;"><strong>Phone:</strong></td>
            <td style="padding: 5px 0;">${payload.customer_phone || '<em>Not provided</em>'}</td>
          </tr>
        </table>
      </div>

      <!-- Shipping Address -->
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0 0 10px 0; font-size: 18px; color: #333; border-bottom: 2px solid #eee; padding-bottom: 5px;">Shipping Address</h2>
        ${formatAddressHtml(payload.shipping_address)}
      </div>

      <!-- Cart Contents -->
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0 0 10px 0; font-size: 18px; color: #333; border-bottom: 2px solid #eee; padding-bottom: 5px;">Cart Contents</h2>
        ${formatProductsHtml(payload.products)}
        ${payload.cart_value ? `
          <div style="text-align: right; margin-top: 10px; padding-top: 10px; border-top: 2px solid #333;">
            <strong style="font-size: 18px;">Cart Total: ${formatCurrency(payload.cart_value)}</strong>
          </div>
        ` : ''}
      </div>

      <!-- Technical Details -->
      <div style="margin-bottom: 20px; background: #f8f9fa; padding: 15px; border-radius: 5px;">
        <h2 style="margin: 0 0 10px 0; font-size: 16px; color: #666;">Technical Details</h2>
        <table style="width: 100%; font-size: 13px;">
          <tr>
            <td style="padding: 3px 0; color: #888; width: 100px;"><strong>Cart ID:</strong></td>
            <td style="padding: 3px 0; font-family: monospace;">${payload.cart_id || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0; color: #888;"><strong>Page:</strong></td>
            <td style="padding: 3px 0; word-break: break-all;">${payload.page_url || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0; color: #888;"><strong>Browser:</strong></td>
            <td style="padding: 3px 0; font-size: 12px;">${payload.user_agent || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0; color: #888;"><strong>Session:</strong></td>
            <td style="padding: 3px 0; font-family: monospace;">${payload.session_id || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0; color: #888;"><strong>Referrer:</strong></td>
            <td style="padding: 3px 0;">${payload.referrer || 'N/A'}</td>
          </tr>
        </table>
      </div>

      <!-- Footer -->
      <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #eee; font-size: 12px; color: #888;">
        <p style="margin: 0;"><strong>Timestamp:</strong> ${timestamp}</p>
        <p style="margin: 5px 0 0 0;"><strong>Error ID:</strong> ${correlationId}</p>
        <p style="margin: 15px 0 0 0;">
          This error has been logged to the database.
          <a href="https://app.supabase.com" style="color: #3498db;">View in Supabase Dashboard</a>
        </p>
      </div>

    </div>
  </div>
</body>
</html>
  `
}

// Gmail OAuth2: Refresh access token
async function getGmailAccessToken(): Promise<string | null> {
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
    return null
  }

  try {
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
      console.error('Failed to refresh Gmail access token:', error)
      return null
    }

    const data = await response.json()
    return data.access_token
  } catch (error) {
    console.error('Gmail token refresh error:', error)
    return null
  }
}

// Gmail OAuth2: Build MIME message
function buildMimeMessage(to: string, cc: string, subject: string, html: string): string {
  const boundary = `boundary_${Date.now()}`
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

// Gmail OAuth2: Encode message for Gmail API (base64url)
function encodeMessage(message: string): string {
  // Deno/browser compatible base64url encoding
  const encoder = new TextEncoder()
  const data = encoder.encode(message)
  let base64 = ''

  // Convert to base64
  const bytes = new Uint8Array(data)
  const len = bytes.length
  for (let i = 0; i < len; i++) {
    base64 += String.fromCharCode(bytes[i])
  }
  base64 = btoa(base64)

  // Convert to base64url
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

// Send email via Gmail API or fallback services
async function sendEmailNotification(
  payload: CheckoutErrorPayload,
  correlationId: string
): Promise<boolean> {
  const subject = `[BOO Checkout Error] ${getErrorTypeLabel(payload.error_type)} - ${payload.customer_email || 'Unknown Customer'}`
  const html = buildEmailHtml(payload, correlationId)

  // Option 1: Use Gmail OAuth2 (preferred - uses existing G Suite)
  if (GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET && GMAIL_REFRESH_TOKEN && GMAIL_USER_EMAIL) {
    try {
      const accessToken = await getGmailAccessToken()

      if (accessToken) {
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

        if (response.ok) {
          const result = await response.json()
          console.log(`[${correlationId}] Email sent successfully via Gmail API. Message ID: ${result.id}`)
          return true
        } else {
          const error = await response.text()
          console.error(`[${correlationId}] Gmail API error: ${error}`)
        }
      }
    } catch (error) {
      console.error(`[${correlationId}] Gmail email error:`, error)
    }
  }

  // Option 2: Use Resend API (fallback)
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  const EMAIL_FROM = GMAIL_USER_EMAIL || 'alerts@buyorganicsonline.com.au'

  if (RESEND_API_KEY) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: EMAIL_FROM,
          to: [EMAIL_TO],
          cc: [EMAIL_CC],
          subject,
          html
        })
      })

      if (response.ok) {
        console.log(`[${correlationId}] Email sent successfully via Resend`)
        return true
      } else {
        const error = await response.text()
        console.error(`[${correlationId}] Resend email failed: ${error}`)
      }
    } catch (error) {
      console.error(`[${correlationId}] Resend email error:`, error)
    }
  }

  // Option 3: Use SendGrid API (fallback)
  const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')

  if (SENDGRID_API_KEY) {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: EMAIL_TO }],
            cc: [{ email: EMAIL_CC }]
          }],
          from: { email: EMAIL_FROM },
          subject,
          content: [{ type: 'text/html', value: html }]
        })
      })

      if (response.ok || response.status === 202) {
        console.log(`[${correlationId}] Email sent successfully via SendGrid`)
        return true
      } else {
        const error = await response.text()
        console.error(`[${correlationId}] SendGrid email failed: ${error}`)
      }
    } catch (error) {
      console.error(`[${correlationId}] SendGrid email error:`, error)
    }
  }

  // Option 3: Store for later processing if no email service configured
  console.warn(`[${correlationId}] No email service configured. Error logged to database only.`)

  // Store email content in metadata for manual sending
  await supabase.from('checkout_error_logs').update({
    metadata: {
      email_pending: true,
      email_subject: subject,
      email_to: EMAIL_TO,
      email_cc: EMAIL_CC
    }
  }).eq('cart_id', payload.cart_id)

  return false
}

// Log error to Supabase
async function logErrorToDatabase(
  payload: CheckoutErrorPayload,
  correlationId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('checkout_error_logs')
    .insert({
      error_type: payload.error_type,
      error_code: payload.error_code,
      error_message: payload.error_message,
      error_stack: payload.error_stack,
      cart_id: payload.cart_id,
      customer_email: payload.customer_email,
      shipping_address: payload.shipping_address,
      shipping_address_country: payload.shipping_address?.country,
      shipping_address_state: payload.shipping_address?.state,
      shipping_address_postcode: payload.shipping_address?.postcode,
      shipping_address_city: payload.shipping_address?.city,
      products: payload.products,
      cart_value: payload.cart_value,
      cart_weight: payload.cart_weight,
      user_agent: payload.user_agent,
      session_id: payload.session_id,
      referrer: payload.referrer,
      metadata: {
        correlation_id: correlationId,
        customer_name: payload.customer_name,
        customer_phone: payload.customer_phone,
        page_url: payload.page_url
      }
    })
    .select('id')
    .single()

  if (error) {
    console.error(`[${correlationId}] Failed to log error to database:`, error)
    return null
  }

  return data.id
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

// Main handler
serve(async (req) => {
  const correlationId = generateCorrelationId()

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const payload: CheckoutErrorPayload = await req.json()

    // Validate webhook secret if configured
    if (WEBHOOK_SECRET) {
      const providedSecret = payload.webhook_secret || req.headers.get('x-webhook-secret')
      if (providedSecret !== WEBHOOK_SECRET) {
        console.warn(`[${correlationId}] Invalid webhook secret`)
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Validate required fields
    if (!payload.error_type || !payload.error_message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: error_type, error_message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[${correlationId}] Processing checkout error: ${payload.error_type}`)
    console.log(`[${correlationId}] Customer: ${payload.customer_email || 'Unknown'}`)
    console.log(`[${correlationId}] Cart value: ${payload.cart_value || 'Unknown'}`)

    // Step 1: Log to database
    const errorId = await logErrorToDatabase(payload, correlationId)
    if (!errorId) {
      throw new Error('Failed to log error to database')
    }
    console.log(`[${correlationId}] Error logged to database: ${errorId}`)

    // Step 2: Send email notification
    const emailSent = await sendEmailNotification(payload, correlationId)
    console.log(`[${correlationId}] Email sent: ${emailSent}`)

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        error_id: errorId,
        email_sent: emailSent,
        correlation_id: correlationId,
        message: 'Error logged and notification sent'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error(`[${correlationId}] Error:`, error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        correlation_id: correlationId
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
