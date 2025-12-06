import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/dashboard-pages - List all dashboard pages with health summary
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Use the v_page_health_summary view for comprehensive data
    const { data: pages, error } = await supabase
      .from('v_page_health_summary')
      .select('*')
      .order('category')
      .order('page_name')

    if (error) {
      console.error('Dashboard pages fetch error:', error)

      // Fallback to basic query if view doesn't exist
      const { data: basicPages, error: basicError } = await supabase
        .from('dashboard_pages')
        .select('*')
        .order('category')
        .order('page_name')

      if (basicError) {
        return NextResponse.json({ error: basicError.message }, { status: 500 })
      }

      // Transform basic pages to match expected format
      const transformed = (basicPages || []).map((p: any) => ({
        ...p,
        total_analyses: 0,
        pending_improvements: 0,
        completed_improvements: 0,
        analysis_freshness: p.last_analyzed_at
          ? new Date(p.last_analyzed_at) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            ? 'stale'
            : 'recent'
          : 'never',
      }))

      const stats = calculateStats(transformed)

      return NextResponse.json({ pages: transformed, stats })
    }

    const stats = calculateStats(pages || [])

    return NextResponse.json({ pages: pages || [], stats })
  } catch (error: any) {
    console.error('Dashboard pages API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function calculateStats(pages: any[]) {
  const implemented = pages.filter((p) => p.implementation_status === 'implemented').length
  const coming_soon = pages.filter((p) => p.implementation_status === 'coming_soon').length
  const placeholder = pages.filter((p) => p.implementation_status === 'placeholder').length

  const pagesWithScore = pages.filter((p) => p.improvement_score !== null)
  const avgScore = pagesWithScore.length > 0
    ? Math.round(pagesWithScore.reduce((sum, p) => sum + p.improvement_score, 0) / pagesWithScore.length)
    : null

  const pendingImprovements = pages.reduce((sum, p) => sum + (p.pending_improvements || 0), 0)

  return {
    total: pages.length,
    implemented,
    coming_soon,
    placeholder,
    avgScore,
    pendingImprovements,
  }
}
