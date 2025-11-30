import { NextRequest, NextResponse } from 'next/server'
import { createBooClient, createServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const business = searchParams.get('business') || 'boo'
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  try {
    // Only BOO has full GSC performance data
    if (business === 'boo') {
      const boo = createBooClient()
      const baseUrl = 'https://www.buyorganicsonline.com.au'

      // Fetch category and brand URLs for matching (always needed for type classification)
      const [categoriesRes, brandsRes] = await Promise.all([
        boo.from('seo_categories').select('url'),
        boo.from('seo_brands').select('url'),
      ])

      const categoryUrls = new Set(
        (categoriesRes.data || []).map(c => c.url?.toLowerCase()).filter(Boolean)
      )
      const brandUrls = new Set(
        (brandsRes.data || []).map(b => b.url?.toLowerCase()).filter(Boolean)
      )

      // Helper to classify URL type
      const classifyUrl = (url: string) => {
        let path = url.replace(baseUrl, '').toLowerCase()
        if (!path.startsWith('/')) path = '/' + path
        if (!path.endsWith('/')) path = path + '/'

        if (path === '/' || path === '') return 'homepage'
        if (path.startsWith('/blog/')) return 'blog'
        if (brandUrls.has(path)) return 'brand'
        if (categoryUrls.has(path)) return 'category'
        return 'other'
      }

      let totalClicks = 0
      let totalImpressions = 0
      let weightedPosition = 0
      const pageTypes: Record<string, number> = {}
      const uniqueUrls = new Set<string>()

      // If date range provided, use gsc_page_daily_stats for accurate period data
      if (from && to) {
        // Paginate through all daily stats (Supabase default limit is 1000)
        const PAGE_SIZE = 1000
        let offset = 0
        const urlStats: Record<string, { clicks: number; impressions: number; positionSum: number; days: number }> = {}

        while (true) {
          const { data: dailyStats, error: dailyError } = await boo
            .from('gsc_page_daily_stats')
            .select('url, impressions, clicks, avg_position')
            .eq('business', 'boo')
            .gte('stat_date', from)
            .lte('stat_date', to)
            .range(offset, offset + PAGE_SIZE - 1)

          if (dailyError) throw dailyError
          if (!dailyStats || dailyStats.length === 0) break

          // Aggregate by URL
          for (const row of dailyStats) {
            const url = row.url
            if (!urlStats[url]) {
              urlStats[url] = { clicks: 0, impressions: 0, positionSum: 0, days: 0 }
            }
            urlStats[url].clicks += row.clicks || 0
            urlStats[url].impressions += row.impressions || 0
            urlStats[url].positionSum += (row.avg_position || 0) * (row.impressions || 0)
            urlStats[url].days++
          }

          if (dailyStats.length < PAGE_SIZE) break
          offset += PAGE_SIZE
        }

        // Calculate totals and page types
        for (const [url, stats] of Object.entries(urlStats)) {
          totalClicks += stats.clicks
          totalImpressions += stats.impressions
          weightedPosition += stats.positionSum
          uniqueUrls.add(url)

          const type = classifyUrl(url)
          pageTypes[type] = (pageTypes[type] || 0) + 1
        }
      } else {
        // No date range - use rolling 30-day aggregates from seo_gsc_pages
        const { data: pages, error: pagesError } = await boo
          .from('seo_gsc_pages')
          .select('url, impressions_30d, clicks_30d, avg_position, ctr')

        if (pagesError) throw pagesError

        for (const p of pages || []) {
          totalClicks += p.clicks_30d || 0
          totalImpressions += p.impressions_30d || 0
          weightedPosition += (p.avg_position || 0) * (p.impressions_30d || 0)
          uniqueUrls.add(p.url)

          const type = classifyUrl(p.url || '')
          pageTypes[type] = (pageTypes[type] || 0) + 1
        }
      }

      const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
      const avgPosition = totalImpressions > 0 ? weightedPosition / totalImpressions : 0

      // Get issue counts from BOO Supabase (where gsc_issue_urls now lives)
      const { data: issues } = await boo
        .from('gsc_issue_urls')
        .select('severity, status')
        .eq('business', 'boo')
        .eq('status', 'active')

      const criticalIssues = issues?.filter(i => i.severity === 'critical').length || 0
      const warningIssues = issues?.filter(i => i.severity === 'warning').length || 0

      // Get indexed pages count from latest snapshot (if exists)
      const { data: snapshot } = await boo
        .from('gsc_sync_logs')
        .select('pages_synced')
        .eq('business', 'boo')
        .order('sync_date', { ascending: false })
        .limit(1)
        .single()

      return NextResponse.json({
        business,
        period: { from, to },
        metrics: {
          clicks: totalClicks,
          impressions: totalImpressions,
          ctr: avgCtr,
          avgPosition: avgPosition,
          indexedPages: uniqueUrls.size,
          notIndexedPages: 0,
          criticalIssues,
          warningIssues,
          totalIssues: criticalIssues + warningIssues,
        },
        pageTypes,
        totalPages: uniqueUrls.size,
        hasData: true,
      })
    }

    // Other businesses - check if they have issue tracking data
    const main = createServerClient()
    const { data: issues } = await main
      .from('gsc_issue_urls')
      .select('severity, status')
      .eq('business', business)
      .eq('status', 'active')

    const { data: snapshot } = await main
      .from('gsc_issue_snapshots')
      .select('total_indexed, total_not_indexed')
      .eq('business', business)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single()

    const criticalIssues = issues?.filter(i => i.severity === 'critical').length || 0
    const warningIssues = issues?.filter(i => i.severity === 'warning').length || 0

    return NextResponse.json({
      business,
      period: { from, to },
      metrics: {
        clicks: null,
        impressions: null,
        ctr: null,
        avgPosition: null,
        indexedPages: snapshot?.total_indexed || null,
        notIndexedPages: snapshot?.total_not_indexed || null,
        criticalIssues,
        warningIssues,
        totalIssues: criticalIssues + warningIssues,
      },
      hasData: false,
      message: 'GSC performance data not connected. Only issue tracking available.',
    })

  } catch (error: any) {
    console.error('SEO API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch SEO data' },
      { status: 500 }
    )
  }
}
