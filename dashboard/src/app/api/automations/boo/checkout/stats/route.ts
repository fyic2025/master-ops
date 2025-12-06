import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// GET /api/automations/boo/checkout/stats - Get checkout health stats
export async function GET() {
  try {
    const supabase = createServerClient()

    // Fetch from the boo_checkout_health_stats view
    const { data: stats, error } = await supabase
      .from('boo_checkout_health_stats')
      .select('*')
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Checkout health stats fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Also get the config to show enabled/disabled status
    const { data: configs } = await supabase
      .from('boo_checkout_health_config')
      .select('check_type, enabled, last_run_at, last_run_result')

    // Get open issues count by type
    const { data: issues } = await supabase
      .from('boo_checkout_health_issues')
      .select('check_type, severity')
      .eq('status', 'open')

    const issuesByType: Record<string, { critical: number; warning: number; info: number }> = {}
    issues?.forEach((issue) => {
      if (!issuesByType[issue.check_type]) {
        issuesByType[issue.check_type] = { critical: 0, warning: 0, info: 0 }
      }
      issuesByType[issue.check_type][issue.severity as 'critical' | 'warning' | 'info']++
    })

    return NextResponse.json({
      stats: stats || {
        errors_24h: 0,
        errors_1h: 0,
        unresolved_errors: 0,
        errors_by_type: {},
        last_error_check: null,
        last_inventory_check: null,
        last_shipping_check: null,
        last_api_check: null,
        error_result: null,
        inventory_result: null,
        shipping_result: null,
        api_result: null,
        critical_issues: 0,
        warning_issues: 0,
        total_open_issues: 0,
      },
      configs: configs || [],
      issuesByType,
    })
  } catch (error: unknown) {
    console.error('Checkout health stats error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
