import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Fetch from v_prospecting_daily_summary view
    const { data: summary, error: summaryError } = await supabase
      .from('v_prospecting_daily_summary')
      .select('*')
      .single()

    if (summaryError && summaryError.code !== 'PGRST116') {
      console.error('Summary fetch error:', summaryError)
    }

    // Fetch funnel data from v_prospecting_funnel view
    const { data: funnel, error: funnelError } = await supabase
      .from('v_prospecting_funnel')
      .select('*')

    if (funnelError) {
      console.error('Funnel fetch error:', funnelError)
    }

    // Fetch weekly stats from v_prospecting_weekly_stats view
    const { data: weeklyStats, error: weeklyError } = await supabase
      .from('v_prospecting_weekly_stats')
      .select('*')
      .order('run_date', { ascending: false })
      .limit(7)

    if (weeklyError) {
      console.error('Weekly stats fetch error:', weeklyError)
    }

    // Fetch current config
    const { data: configRows, error: configError } = await supabase
      .from('system_config')
      .select('key, value')
      .in('key', [
        'prospecting_enabled',
        'prospecting_daily_limit',
        'prospecting_lead_category',
        'prospecting_expiry_days'
      ])

    if (configError) {
      console.error('Config fetch error:', configError)
    }

    // Parse config values
    const config: Record<string, any> = {}
    for (const row of configRows || []) {
      try {
        config[row.key] = JSON.parse(row.value)
      } catch {
        config[row.key] = row.value
      }
    }

    return NextResponse.json({
      summary: summary || {
        date: new Date().toISOString().split('T')[0],
        run_status: null,
        processed_today: 0,
        errors_today: 0,
        pending_in_queue: 0,
        awaiting_login: 0,
        logged_in: 0,
        expired: 0,
        failed: 0
      },
      funnel: funnel || [],
      weeklyStats: weeklyStats || [],
      config: {
        prospecting_enabled: config.prospecting_enabled ?? true,
        prospecting_daily_limit: config.prospecting_daily_limit ?? 5,
        prospecting_lead_category: config.prospecting_lead_category ?? null,
        prospecting_expiry_days: config.prospecting_expiry_days ?? 30
      }
    })
  } catch (error: any) {
    console.error('Prospecting summary error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch prospecting summary' },
      { status: 500 }
    )
  }
}
