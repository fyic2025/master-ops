import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// Melbourne timezone for hour tracking
function getMelbourneHour(): number {
  const now = new Date()
  const melbourneTime = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Melbourne' }))
  return melbourneTime.getHours()
}

// GET /api/track/click?id=<base64_email>&url=<base64_url>&t=<type>
// Records click and redirects to target URL
// Types: winback (default), anniversary
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const encodedId = searchParams.get('id')
  const encodedUrl = searchParams.get('url')
  const trackType = searchParams.get('t') || 'winback'

  // Default fallback URL
  const fallbackUrl = 'https://teelixir.com.au/collections/all'

  // Decode the target URL
  let targetUrl = fallbackUrl
  if (encodedUrl) {
    try {
      targetUrl = Buffer.from(encodedUrl, 'base64').toString('utf-8')
      // Validate it's a proper URL
      new URL(targetUrl)
    } catch {
      targetUrl = fallbackUrl
    }
  }

  try {
    if (encodedId) {
      // Decode the email from base64
      const email = Buffer.from(encodedId, 'base64').toString('utf-8')

      if (email && email.includes('@')) {
        const supabase = createServerClient()
        const clickHour = getMelbourneHour()

        // Determine target table based on type
        const tableName = trackType === 'anniversary'
          ? 'tlx_anniversary_discounts'
          : 'tlx_winback_emails'

        // Update the record - set clicked_at and update status
        const { error } = await supabase
          .from(tableName)
          .update({
            clicked_at: new Date().toISOString(),
            first_click_hour_melbourne: clickHour,
            status: 'clicked',
          })
          .eq('email', email.toLowerCase())
          .is('clicked_at', null) // Only update if not already clicked

        if (!error) {
          console.log(`[Track] Click recorded (${trackType}): ${email.substring(0, 3)}***@*** at ${clickHour}:00 Melbourne`)
        }
      }
    }
  } catch (error) {
    console.error('[Track] Click error:', error)
    // Continue to redirect even if tracking fails
  }

  // Always redirect to target URL
  return NextResponse.redirect(targetUrl, { status: 302 })
}
