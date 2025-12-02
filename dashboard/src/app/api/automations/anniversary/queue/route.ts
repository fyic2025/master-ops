import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// GET /api/automations/anniversary/queue?date=YYYY-MM-DD
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') ||
      new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Melbourne' })

    const supabase = createServerClient()

    // Fetch queue for the date
    const { data: queue, error } = await supabase
      .from('tlx_anniversary_queue')
      .select('scheduled_hour, status')
      .eq('scheduled_date', date)

    if (error) {
      console.error('Error fetching anniversary queue:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate summary and hourly breakdown
    const summary = {
      total: queue?.length || 0,
      pending: queue?.filter(q => q.status === 'pending').length || 0,
      sent: queue?.filter(q => q.status === 'sent').length || 0,
      failed: queue?.filter(q => q.status === 'failed').length || 0
    }

    const byHour: Record<number, { pending: number; sent: number; failed: number }> = {}
    for (const item of queue || []) {
      if (!byHour[item.scheduled_hour]) {
        byHour[item.scheduled_hour] = { pending: 0, sent: 0, failed: 0 }
      }
      if (item.status === 'pending') byHour[item.scheduled_hour].pending++
      else if (item.status === 'sent') byHour[item.scheduled_hour].sent++
      else if (item.status === 'failed') byHour[item.scheduled_hour].failed++
    }

    return NextResponse.json({ date, summary, byHour })
  } catch (error: any) {
    console.error('Anniversary queue error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/automations/anniversary/queue - Trigger queueing for today
export async function POST() {
  try {
    const supabase = createServerClient()

    // Check if automation is enabled
    const { data: config } = await supabase
      .from('tlx_automation_config')
      .select('enabled')
      .eq('automation_type', 'anniversary_upsell')
      .single()

    if (!config?.enabled) {
      return NextResponse.json({
        error: 'Anniversary automation is disabled',
        queued: 0
      }, { status: 400 })
    }

    // This would typically trigger the queue script via n8n or cron
    // For now, return a message indicating manual action needed
    return NextResponse.json({
      message: 'Run queue-anniversary-emails.ts to queue emails',
      date: new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Melbourne' })
    })
  } catch (error: any) {
    console.error('Anniversary queue POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
