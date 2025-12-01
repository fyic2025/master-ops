import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// 1x1 transparent GIF pixel
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

// Melbourne timezone for hour tracking
function getMelbourneHour(): number {
  const now = new Date()
  const melbourneTime = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Melbourne' }))
  return melbourneTime.getHours()
}

// GET /api/track/open?id=<base64_email>
// Records email open and returns tracking pixel
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const encodedId = searchParams.get('id')

    if (encodedId) {
      // Decode the email from base64
      const email = Buffer.from(encodedId, 'base64').toString('utf-8')

      if (email && email.includes('@')) {
        const supabase = createServerClient()
        const openHour = getMelbourneHour()

        // Update the record - only set opened_at if not already set (first open)
        await supabase
          .from('tlx_winback_emails')
          .update({
            opened_at: new Date().toISOString(),
            first_open_hour_melbourne: openHour,
          })
          .eq('email', email.toLowerCase())
          .is('opened_at', null) // Only update if not already opened

        // Also update any record regardless of opened_at for status tracking
        // This ensures we capture the event even if opened_at was set
        console.log(`[Track] Open recorded: ${email.substring(0, 3)}***@*** at ${openHour}:00 Melbourne`)
      }
    }

    // Always return the tracking pixel, even if tracking fails
    return new NextResponse(TRACKING_PIXEL, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Content-Length': String(TRACKING_PIXEL.length),
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    console.error('[Track] Open error:', error)
    // Still return pixel on error
    return new NextResponse(TRACKING_PIXEL, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store',
      },
    })
  }
}
