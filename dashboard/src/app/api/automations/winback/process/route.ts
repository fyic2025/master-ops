import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// Process queue for current hour - called by n8n hourly
export async function POST() {
  try {
    const supabase = createServerClient()

    // Get current hour in Melbourne timezone
    const now = new Date()
    const melbourneTime = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Melbourne' }))
    const currentHour = melbourneTime.getHours()
    const today = melbourneTime.toISOString().split('T')[0]

    console.log(`Processing queue for ${today} hour ${currentHour}`)

    // Get pending items for this hour
    const { data: pendingItems, error: fetchError } = await supabase
      .from('tlx_winback_queue')
      .select('*')
      .eq('scheduled_date', today)
      .eq('scheduled_hour', currentHour)
      .eq('status', 'pending')
      .limit(10) // Process max 10 per run

    if (fetchError) {
      console.error('Queue fetch error:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!pendingItems || pendingItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No pending emails for hour ${currentHour}`,
        processed: 0,
        date: today,
        hour: currentHour
      })
    }

    console.log(`Found ${pendingItems.length} pending items for hour ${currentHour}`)

    // Get automation config for email template
    const { data: configData } = await supabase
      .from('tlx_automation_config')
      .select('config')
      .eq('automation_type', 'winback_40')
      .single()

    if (!configData) {
      return NextResponse.json({ error: 'Automation config not found' }, { status: 500 })
    }

    const config = configData.config
    const results = { sent: 0, failed: 0, errors: [] as string[] }

    // Process each email
    for (const item of pendingItems) {
      try {
        // Build tracking URLs
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ops.growthcohq.com'
        const emailB64 = Buffer.from(item.email).toString('base64')
        const trackingPixel = `${baseUrl}/api/track/open?e=${emailB64}`
        const shopUrl = `${baseUrl}/api/track/click?e=${emailB64}&r=${encodeURIComponent('https://teelixir.com/collections/all')}`

        // Build email HTML
        const firstName = item.first_name || 'there'
        const discountCode = config.discount_code || 'MISSYOU40'
        const discountPercent = config.discount_percent || 40

        const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
  <div style="background: white; padding: 40px; border-radius: 8px;">
    <p style="font-size: 18px; color: #333;">Hi ${firstName},</p>

    <p style="color: #555; line-height: 1.8;">It's been a while since we've seen you at Teelixir, and we've missed you!</p>

    <p style="color: #555; line-height: 1.8;">As a special thank you for being part of our community, we'd love to offer you <strong>${discountPercent}% off</strong> your next order.</p>

    <div style="background: #f0f7f0; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
      <p style="margin: 0 0 10px 0; color: #666;">Use code at checkout:</p>
      <p style="font-size: 28px; font-weight: bold; color: #2d5a3d; margin: 0; letter-spacing: 2px;">${discountCode}</p>
    </div>

    <p style="text-align: center;">
      <a href="${shopUrl}" style="display: inline-block; background: #2d5a3d; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-size: 16px;">Shop Now</a>
    </p>

    <p style="color: #555; line-height: 1.8; margin-top: 30px;">We're always here to help you on your wellness journey with our medicinal mushrooms and tonic herbs.</p>

    <p style="color: #555;">With gratitude,<br><strong>Colette</strong><br><span style="color: #888;">Teelixir Team</span></p>
  </div>
  <img src="${trackingPixel}" width="1" height="1" style="display:none;" alt="" />
</body>
</html>`

        // Send via GSuite API
        const response = await fetch(`${baseUrl}/api/email/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: item.email,
            from: config.sender_email || 'colette@teelixir.com',
            fromName: config.sender_name || 'Colette from Teelixir',
            subject: config.subject_template?.replace('{first_name}', firstName) || `${firstName}, we miss you! Here's ${discountPercent}% off`,
            html: emailHtml
          })
        })

        if (response.ok) {
          // Update queue status to sent
          await supabase
            .from('tlx_winback_queue')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', item.id)

          // Record in winback_emails table
          await supabase
            .from('tlx_winback_emails')
            .insert({
              email: item.email,
              klaviyo_profile_id: item.klaviyo_profile_id,
              first_name: item.first_name,
              status: 'sent',
              discount_code: discountCode,
              send_hour_melbourne: currentHour
            })

          results.sent++
        } else {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Email send failed')
        }
      } catch (err: any) {
        console.error(`Failed to send to ${item.email}:`, err.message)
        results.failed++
        results.errors.push(`${item.email}: ${err.message}`)

        // Update queue status to failed
        await supabase
          .from('tlx_winback_queue')
          .update({ status: 'failed', error_message: err.message })
          .eq('id', item.id)
      }
    }

    return NextResponse.json({
      success: true,
      date: today,
      hour: currentHour,
      processed: pendingItems.length,
      sent: results.sent,
      failed: results.failed,
      errors: results.errors.length > 0 ? results.errors : undefined
    })

  } catch (error: any) {
    console.error('Process queue error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET endpoint to check queue status
export async function GET() {
  try {
    const supabase = createServerClient()
    const now = new Date()
    const melbourneTime = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Melbourne' }))
    const currentHour = melbourneTime.getHours()
    const today = melbourneTime.toISOString().split('T')[0]

    const { count: pending } = await supabase
      .from('tlx_winback_queue')
      .select('*', { count: 'exact', head: true })
      .eq('scheduled_date', today)
      .eq('scheduled_hour', currentHour)
      .eq('status', 'pending')

    return NextResponse.json({
      date: today,
      hour: currentHour,
      pending: pending || 0,
      nextRun: `${today} ${String(currentHour).padStart(2, '0')}:00 AEST`
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
