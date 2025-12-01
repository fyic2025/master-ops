import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// GET /api/automations/winback/stats - Get winback campaign stats
export async function GET() {
  try {
    const supabase = createServerClient()

    // Fetch from the tlx_winback_stats view
    const { data: stats, error } = await supabase
      .from('tlx_winback_stats')
      .select('*')
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Winback stats fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      stats: stats || {
        total_sent: 0,
        total_opened: 0,
        total_clicked: 0,
        total_converted: 0,
        total_bounced: 0,
        total_failed: 0,
        total_revenue: 0,
        sent_today: 0,
        sent_this_week: 0,
        open_rate_percent: 0,
        click_rate_percent: 0,
        conversion_rate_percent: 0,
      }
    })
  } catch (error: any) {
    console.error('Winback stats error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
