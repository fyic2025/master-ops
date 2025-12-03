import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// Queue daily winback emails - called by n8n once per day (e.g., 8am Melbourne)
// Spreads emails across send window hours (9am-6pm)

const SEND_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18] // 9am to 6pm Melbourne

export async function POST() {
  try {
    const supabase = createServerClient()

    // Get Melbourne date for tomorrow or today if early morning
    const now = new Date()
    const melbourneNow = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Melbourne' }))
    const currentHour = melbourneNow.getHours()

    // If before 8am, queue for today; otherwise queue for tomorrow
    const targetDate = new Date(melbourneNow)
    if (currentHour >= 8) {
      targetDate.setDate(targetDate.getDate() + 1)
    }
    const targetDateStr = targetDate.toISOString().split('T')[0]

    console.log(`Queueing winback emails for ${targetDateStr}`)

    // Get automation config
    const { data: configData, error: configError } = await supabase
      .from('tlx_automation_config')
      .select('enabled, config')
      .eq('automation_type', 'winback_40')
      .single()

    if (configError || !configData) {
      return NextResponse.json({ error: 'Automation config not found' }, { status: 500 })
    }

    if (!configData.enabled) {
      return NextResponse.json({
        success: true,
        message: 'Automation is disabled',
        queued: 0
      })
    }

    const dailyLimit = configData.config.daily_limit || 40

    // Get unengaged profiles
    const { data: unengaged, error: fetchError } = await supabase
      .from('tlx_klaviyo_unengaged')
      .select('email, klaviyo_profile_id, first_name')
      .limit(500)

    if (fetchError) {
      return NextResponse.json({ error: `Failed to fetch unengaged: ${fetchError.message}` }, { status: 500 })
    }

    if (!unengaged || unengaged.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No unengaged profiles found',
        queued: 0
      })
    }

    // Get already contacted emails
    const { data: contacted } = await supabase
      .from('tlx_winback_emails')
      .select('email')

    const contactedSet = new Set((contacted || []).map(c => c.email.toLowerCase()))

    // Get already queued for target date
    const { data: alreadyQueued } = await supabase
      .from('tlx_winback_queue')
      .select('email')
      .eq('scheduled_date', targetDateStr)

    const queuedSet = new Set((alreadyQueued || []).map(q => q.email.toLowerCase()))

    // Filter eligible
    const eligible = unengaged.filter(p => {
      const email = p.email.toLowerCase()
      return !contactedSet.has(email) && !queuedSet.has(email)
    })

    if (eligible.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No eligible profiles to queue',
        queued: 0,
        alreadyContacted: contactedSet.size,
        alreadyQueued: queuedSet.size
      })
    }

    // Take up to daily limit
    const toQueue = eligible.slice(0, dailyLimit)

    // Build queue entries with distributed hours
    const queueEntries = toQueue.map((profile, index) => ({
      email: profile.email.toLowerCase(),
      klaviyo_profile_id: profile.klaviyo_profile_id,
      first_name: profile.first_name,
      scheduled_date: targetDateStr,
      scheduled_hour: SEND_HOURS[index % SEND_HOURS.length],
      status: 'pending'
    }))

    // Insert into queue
    const { error: insertError } = await supabase
      .from('tlx_winback_queue')
      .upsert(queueEntries, { onConflict: 'email,scheduled_date' })

    if (insertError) {
      return NextResponse.json({ error: `Failed to queue: ${insertError.message}` }, { status: 500 })
    }

    // Calculate hour distribution
    const distribution: Record<number, number> = {}
    queueEntries.forEach(e => {
      distribution[e.scheduled_hour] = (distribution[e.scheduled_hour] || 0) + 1
    })

    return NextResponse.json({
      success: true,
      targetDate: targetDateStr,
      queued: queueEntries.length,
      eligible: eligible.length,
      alreadyContacted: contactedSet.size,
      alreadyQueued: queuedSet.size,
      hourDistribution: distribution
    })

  } catch (error: any) {
    console.error('Queue daily error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET endpoint to check queue status for upcoming days
export async function GET() {
  try {
    const supabase = createServerClient()
    const now = new Date()
    const melbourneNow = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Melbourne' }))
    const today = melbourneNow.toISOString().split('T')[0]

    const tomorrow = new Date(melbourneNow)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    // Get queue counts
    const { count: todayPending } = await supabase
      .from('tlx_winback_queue')
      .select('*', { count: 'exact', head: true })
      .eq('scheduled_date', today)
      .eq('status', 'pending')

    const { count: tomorrowPending } = await supabase
      .from('tlx_winback_queue')
      .select('*', { count: 'exact', head: true })
      .eq('scheduled_date', tomorrowStr)
      .eq('status', 'pending')

    // Get pool stats
    const { count: totalUnengaged } = await supabase
      .from('tlx_klaviyo_unengaged')
      .select('*', { count: 'exact', head: true })

    const { count: totalContacted } = await supabase
      .from('tlx_winback_emails')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      today: {
        date: today,
        pending: todayPending || 0
      },
      tomorrow: {
        date: tomorrowStr,
        pending: tomorrowPending || 0
      },
      pool: {
        total: totalUnengaged || 0,
        contacted: totalContacted || 0,
        available: (totalUnengaged || 0) - (totalContacted || 0)
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
