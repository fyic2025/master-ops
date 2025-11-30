import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

interface ProductIssue {
  code: string
  severity: 'error' | 'warning' | 'suggestion'
  description: string
  detail?: string
  resolution?: string
  attribute?: string
}

interface MerchantProduct {
  product_id: string
  offer_id: string
  title: string
  approval_status: string
  availability: string
  brand: string | null
  category: string | null
  impressions_30d: number
  clicks_30d: number
  issues: ProductIssue[]
  issue_count: number
  error_count: number
  warning_count: number
  last_synced_at: string
}

type SortField = 'impressions' | 'clicks' | 'issues' | 'status' | 'title'
type StatusFilter = 'all' | 'approved' | 'disapproved' | 'pending' | 'has_issues'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const business = searchParams.get('business') || 'boo'
  const status = (searchParams.get('status') || 'all') as StatusFilter
  const sortBy = (searchParams.get('sortBy') || 'impressions') as SortField
  const limit = parseInt(searchParams.get('limit') || '100')
  const offset = parseInt(searchParams.get('offset') || '0')
  const search = searchParams.get('search') || ''

  try {
    const supabase = createServerClient()

    // Get the account for this business
    const { data: account, error: accountError } = await supabase
      .from('google_ads_accounts')
      .select('id')
      .eq('business', business)
      .single()

    if (accountError || !account) {
      return NextResponse.json({
        products: [],
        total: 0,
        hasData: false,
        message: 'Google Merchant Center not configured',
      })
    }

    // Build query
    let query = supabase
      .from('google_merchant_products')
      .select('*', { count: 'exact' })
      .eq('account_id', account.id)

    // Apply status filter
    if (status === 'approved') {
      query = query.eq('approval_status', 'approved')
    } else if (status === 'disapproved') {
      query = query.eq('approval_status', 'disapproved')
    } else if (status === 'pending') {
      query = query.eq('approval_status', 'pending')
    } else if (status === 'has_issues') {
      query = query.not('item_issues', 'is', null)
    }

    // Apply search filter
    if (search) {
      query = query.or(`title.ilike.%${search}%,offer_id.ilike.%${search}%`)
    }

    // Apply sorting
    if (sortBy === 'impressions') {
      query = query.order('impressions_30d', { ascending: false, nullsFirst: false })
    } else if (sortBy === 'clicks') {
      query = query.order('clicks_30d', { ascending: false, nullsFirst: false })
    } else if (sortBy === 'status') {
      query = query.order('approval_status', { ascending: true })
    } else if (sortBy === 'title') {
      query = query.order('title', { ascending: true })
    }
    // For 'issues' sort, we'll sort client-side after fetching

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: rawProducts, error: productsError, count } = await query

    if (productsError) throw productsError

    // Transform products
    const products: MerchantProduct[] = (rawProducts || []).map(p => {
      const issues: ProductIssue[] = []
      let errorCount = 0
      let warningCount = 0

      if (p.item_issues && Array.isArray(p.item_issues)) {
        for (const issue of p.item_issues) {
          const severity = issue.severity || 'warning'
          issues.push({
            code: issue.code || 'unknown',
            severity: severity as 'error' | 'warning' | 'suggestion',
            description: issue.description || '',
            detail: issue.detail,
            resolution: issue.resolution,
            attribute: issue.attribute,
          })

          if (severity === 'error') errorCount++
          else if (severity === 'warning') warningCount++
        }
      }

      return {
        product_id: p.product_id,
        offer_id: p.offer_id || '',
        title: p.title || '',
        approval_status: p.approval_status || 'pending',
        availability: p.availability || '',
        brand: p.brand,
        category: p.category,
        impressions_30d: p.impressions_30d || 0,
        clicks_30d: p.clicks_30d || 0,
        issues,
        issue_count: issues.length,
        error_count: errorCount,
        warning_count: warningCount,
        last_synced_at: p.last_synced_at,
      }
    })

    // Sort by issues if requested (client-side sort)
    if (sortBy === 'issues') {
      products.sort((a, b) => b.issue_count - a.issue_count)
    }

    // Get counts for filter tabs
    const { data: statusCounts } = await supabase
      .from('google_merchant_products')
      .select('approval_status, item_issues')
      .eq('account_id', account.id)

    const tabCounts = {
      all: statusCounts?.length || 0,
      approved: statusCounts?.filter(p => p.approval_status === 'approved').length || 0,
      disapproved: statusCounts?.filter(p => p.approval_status === 'disapproved').length || 0,
      pending: statusCounts?.filter(p => p.approval_status === 'pending').length || 0,
      has_issues: statusCounts?.filter(p => p.item_issues && Array.isArray(p.item_issues) && p.item_issues.length > 0).length || 0,
    }

    return NextResponse.json({
      products,
      total: count || 0,
      tabCounts,
      hasData: true,
    })

  } catch (error: any) {
    console.error('Merchant products API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch products' },
      { status: 500 }
    )
  }
}
