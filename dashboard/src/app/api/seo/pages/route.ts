import { NextRequest, NextResponse } from 'next/server'
import { createBooClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const business = searchParams.get('business') || 'boo'
  const limit = parseInt(searchParams.get('limit') || '50')
  const sortBy = searchParams.get('sortBy') || 'clicks'
  const pageType = searchParams.get('pageType')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  try {
    // Only BOO has full GSC page data
    if (business !== 'boo') {
      return NextResponse.json({
        business,
        pages: [],
        total: 0,
        hasData: false,
        message: 'GSC page data only available for BOO',
      })
    }

    const boo = createBooClient()
    const baseUrl = 'https://www.buyorganicsonline.com.au'

    // Fetch category and brand URLs for matching
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

    interface PageData {
      url: string
      page_type: string
      clicks: number
      impressions: number
      avg_position: number
      ctr: number
    }

    let allPages: PageData[] = []

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

      // Convert to page array
      for (const [url, stats] of Object.entries(urlStats)) {
        const avgPosition = stats.impressions > 0 ? stats.positionSum / stats.impressions : 0
        const ctr = stats.impressions > 0 ? (stats.clicks / stats.impressions) * 100 : 0

        allPages.push({
          url,
          page_type: classifyUrl(url),
          clicks: stats.clicks,
          impressions: stats.impressions,
          avg_position: avgPosition,
          ctr,
        })
      }
    } else {
      // No date range - use rolling 30-day aggregates from seo_gsc_pages
      const { data: pages, error } = await boo
        .from('seo_gsc_pages')
        .select('url, impressions_30d, clicks_30d, avg_position, ctr')

      if (error) throw error

      allPages = (pages || []).map(p => ({
        url: p.url,
        page_type: classifyUrl(p.url || ''),
        clicks: p.clicks_30d || 0,
        impressions: p.impressions_30d || 0,
        avg_position: p.avg_position || 0,
        ctr: (p.ctr || 0) * 100,
      }))
    }

    // Sort pages
    const sortField = sortBy === 'clicks_30d' ? 'clicks' : sortBy === 'impressions_30d' ? 'impressions' : sortBy
    allPages.sort((a, b) => {
      const aVal = (a as any)[sortField] || 0
      const bVal = (b as any)[sortField] || 0
      return bVal - aVal
    })

    // Filter by page type if specified
    let filteredPages = allPages
    if (pageType && pageType !== 'all') {
      filteredPages = allPages.filter(p => p.page_type === pageType)
    }

    // Count by type (from all pages, not just filtered)
    const typeCounts: Record<string, number> = {}
    allPages.forEach(p => {
      const t = p.page_type || 'other'
      typeCounts[t] = (typeCounts[t] || 0) + 1
    })

    return NextResponse.json({
      business,
      period: { from, to },
      pages: filteredPages.slice(0, limit),
      total: filteredPages.length,
      typeCounts,
      hasData: true,
    })

  } catch (error: any) {
    console.error('SEO Pages API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pages' },
      { status: 500 }
    )
  }
}
