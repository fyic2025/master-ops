import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createServerClient()

    const { data: checks, error } = await supabase
      .from('dashboard_health_checks')
      .select('*')
      .order('business', { ascending: true })
      .order('integration', { ascending: true })

    if (error) {
      console.error('Health check fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group by business
    const byBusiness: Record<string, any[]> = {}
    for (const check of checks || []) {
      if (!byBusiness[check.business]) {
        byBusiness[check.business] = []
      }
      byBusiness[check.business].push(check)
    }

    // Calculate summary
    const allChecks = checks || []
    const summary = {
      total: allChecks.length,
      healthy: allChecks.filter(c => c.status === 'healthy').length,
      degraded: allChecks.filter(c => c.status === 'degraded').length,
      down: allChecks.filter(c => c.status === 'down').length,
    }

    return NextResponse.json({
      checks: byBusiness,
      summary,
      lastUpdated: allChecks[0]?.last_check || null,
    })
  } catch (error: any) {
    console.error('Health API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
