import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// Send hours (Melbourne time) - spread across business hours
const SEND_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18]

// GET /api/automations/winback/queue - Get today's queue status
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')

    // Default to today in Melbourne timezone
    const targetDate = dateParam || new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Melbourne' })

    // Get queue items for the date
    const { data: queueItems, error } = await supabase
      .from('tlx_winback_queue')
      .select('*')
      .eq('scheduled_date', targetDate)
      .order('scheduled_hour', { ascending: true })

    if (error) {
      console.error('Queue fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group by hour and status
    const byHour: Record<number, { pending: number; sent: number; failed: number }> = {}
    for (const hour of SEND_HOURS) {
      byHour[hour] = { pending: 0, sent: 0, failed: 0 }
    }

    for (const item of queueItems || []) {
      const hour = item.scheduled_hour
      if (!byHour[hour]) byHour[hour] = { pending: 0, sent: 0, failed: 0 }
      if (item.status === 'pending') byHour[hour].pending++
      else if (item.status === 'sent') byHour[hour].sent++
      else if (item.status === 'failed') byHour[hour].failed++
    }

    // Summary
    const summary = {
      total: queueItems?.length || 0,
      pending: queueItems?.filter(q => q.status === 'pending').length || 0,
      sent: queueItems?.filter(q => q.status === 'sent').length || 0,
      failed: queueItems?.filter(q => q.status === 'failed').length || 0,
    }

    return NextResponse.json({
      date: targetDate,
      queue: queueItems || [],
      byHour,
      summary
    })

  } catch (error: any) {
    console.error('Queue API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/automations/winback/queue - Queue emails for spread delivery
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json().catch(() => ({}))
    const limitOverride = body.limit as number | undefined

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
    const dailyLimit = limitOverride || config.daily_limit || 20

    // Get today's date in Melbourne timezone
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Melbourne' })

    // Check how many already queued today
    const { count: queuedToday } = await supabase
      .from('tlx_winback_queue')
      .select('*', { count: 'exact', head: true })
      .eq('scheduled_date', today)

    if ((queuedToday || 0) >= dailyLimit) {
      return NextResponse.json({
        error: `Already queued ${queuedToday} emails for today (limit: ${dailyLimit})`,
        queued: 0
      }, { status: 400 })
    }

    const remaining = dailyLimit - (queuedToday || 0)

    // Get emails already sent or queued (to exclude them)
    const [{ data: alreadySent }, { data: alreadyQueued }] = await Promise.all([
      supabase.from('tlx_winback_emails').select('email'),
      supabase.from('tlx_winback_queue').select('email').eq('scheduled_date', today)
    ])

    const excludeEmails = new Set([
      ...((alreadySent || []).map(r => r.email.toLowerCase())),
      ...((alreadyQueued || []).map(r => r.email.toLowerCase()))
    ])

    // Get eligible profiles
    const { data: allProfiles, error: profilesError } = await supabase
      .from('tlx_klaviyo_unengaged')
      .select('*')
      .order('last_order_date', { ascending: true })

    if (profilesError) {
      return NextResponse.json({ error: `Failed to fetch profiles: ${profilesError.message}` }, { status: 500 })
    }

    // Filter out already-contacted profiles
    const profiles = (allProfiles || [])
      .filter(p => !excludeEmails.has(p.email.toLowerCase()))
      .slice(0, remaining)

    if (profiles.length === 0) {
      return NextResponse.json({ message: 'No eligible profiles to queue', queued: 0 })
    }

    // Assign random hours (round-robin for even distribution)
    const queueEntries = profiles.map((profile, index) => {
      const hour = SEND_HOURS[index % SEND_HOURS.length]
      return {
        email: profile.email.toLowerCase(),
        klaviyo_profile_id: profile.klaviyo_profile_id,
        first_name: profile.first_name,
        scheduled_date: today,
        scheduled_hour: hour,
        status: 'pending',
      }
    })

    // Insert into queue
    const { error: insertError } = await supabase
      .from('tlx_winback_queue')
      .upsert(queueEntries, { onConflict: 'email,scheduled_date' })

    if (insertError) {
      return NextResponse.json({ error: `Failed to queue: ${insertError.message}` }, { status: 500 })
    }

    // Count by hour for response
    const hourDistribution: Record<number, number> = {}
    for (const entry of queueEntries) {
      hourDistribution[entry.scheduled_hour] = (hourDistribution[entry.scheduled_hour] || 0) + 1
    }

    return NextResponse.json({
      success: true,
      message: `Queued ${queueEntries.length} emails for ${today}`,
      queued: queueEntries.length,
      date: today,
      hourDistribution
    })

  } catch (error: any) {
    console.error('Queue POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
