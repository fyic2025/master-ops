import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

interface ProductWithIssue {
  product_id: string
  offer_id: string
  title: string
  approval_status: string
  impressions_30d: number
  clicks_30d: number
}

interface IssueAudit {
  issue_code: string
  severity: string
  description: string
  resolution: string | null
  product_count: number
  total_impressions: number
  total_clicks: number
  fixability: 'auto' | 'semi-auto' | 'manual' | 'unknown'
  status: 'pending' | 'in_progress' | 'fixed' | 'verified'
  products: ProductWithIssue[]
}

// Map issue codes to fixability
const ISSUE_FIXABILITY: Record<string, 'auto' | 'semi-auto' | 'manual'> = {
  // Auto-fixable (can sync/resync)
  'price_mismatch': 'auto',
  'incorrect_price': 'auto',
  'sale_price_mismatch': 'auto',
  'out_of_stock': 'auto',
  'availability_mismatch': 'auto',
  'missing_availability': 'auto',
  'missing_condition': 'auto',

  // Semi-auto (need data lookup)
  'missing_gtin': 'semi-auto',
  'invalid_gtin': 'semi-auto',
  'gtin_mismatch': 'semi-auto',
  'missing_description': 'semi-auto',
  'description_too_short': 'semi-auto',
  'missing_brand': 'semi-auto',
  'title_too_long': 'semi-auto',
  'shipping_weight_missing': 'semi-auto',

  // Manual review required
  'image_too_small': 'manual',
  'image_overlay': 'manual',
  'image_watermark': 'manual',
  'image_generic': 'manual',
  'missing_image_link': 'manual',
  'image_link_broken': 'manual',
  'product_policy_violation': 'manual',
  'adult_content': 'manual',
  'prohibited_product': 'manual',
  'counterfeit_goods': 'manual',
  'brand_gtin_mismatch': 'manual',
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const business = searchParams.get('business') || 'boo'
  const includeProducts = searchParams.get('includeProducts') !== 'false'
  const issueCode = searchParams.get('issueCode') // Filter by specific issue

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
        hasData: false,
        message: 'Google Merchant Center not configured for this business',
      })
    }

    // Fetch all products with issues
    const { data: products, error: productsError } = await supabase
      .from('google_merchant_products')
      .select('product_id, offer_id, title, approval_status, item_issues, impressions_30d, clicks_30d')
      .eq('account_id', account.id)
      .not('item_issues', 'is', null)

    if (productsError) throw productsError

    if (!products || products.length === 0) {
      return NextResponse.json({
        hasData: true,
        issues: [],
        message: 'No products with issues found',
      })
    }

    // Try to get resolution statuses (table may not exist yet)
    let resolutionStatuses: Record<string, { status: string; fix_notes: string | null }> = {}
    try {
      const { data: resolutions } = await supabase
        .from('gmc_issue_resolution')
        .select('issue_code, status, fix_notes')
        .eq('account_id', account.id)

      if (resolutions) {
        resolutions.forEach(r => {
          resolutionStatuses[r.issue_code] = { status: r.status, fix_notes: r.fix_notes }
        })
      }
    } catch {
      // Table doesn't exist yet, continue without resolution statuses
    }

    // Aggregate issues by code
    const issueMap: Record<string, {
      severity: string
      description: string
      resolution: string | null
      products: ProductWithIssue[]
    }> = {}

    for (const product of products) {
      if (!product.item_issues || !Array.isArray(product.item_issues)) continue

      for (const issue of product.item_issues) {
        const code = issue.code || 'unknown'

        // If filtering by specific issue code, skip others
        if (issueCode && code !== issueCode) continue

        if (!issueMap[code]) {
          issueMap[code] = {
            severity: issue.severity || 'warning',
            description: issue.description || issue.detail || '',
            resolution: issue.resolution || null,
            products: [],
          }
        }

        // Add product to this issue's list
        issueMap[code].products.push({
          product_id: product.product_id,
          offer_id: product.offer_id || '',
          title: product.title || '',
          approval_status: product.approval_status || 'pending',
          impressions_30d: product.impressions_30d || 0,
          clicks_30d: product.clicks_30d || 0,
        })
      }
    }

    // Build audit response
    const issues: IssueAudit[] = Object.entries(issueMap)
      .map(([code, data]) => ({
        issue_code: code,
        severity: data.severity,
        description: data.description,
        resolution: data.resolution,
        product_count: data.products.length,
        total_impressions: data.products.reduce((sum, p) => sum + p.impressions_30d, 0),
        total_clicks: data.products.reduce((sum, p) => sum + p.clicks_30d, 0),
        fixability: ISSUE_FIXABILITY[code] || 'unknown',
        status: (resolutionStatuses[code]?.status as IssueAudit['status']) || 'pending',
        // Only include products if requested (can be large)
        products: includeProducts ? data.products : [],
      }))
      // Sort by: severity (errors first), then by product count
      .sort((a, b) => {
        const severityOrder = { error: 0, warning: 1, suggestion: 2 }
        const aSev = severityOrder[a.severity as keyof typeof severityOrder] ?? 3
        const bSev = severityOrder[b.severity as keyof typeof severityOrder] ?? 3
        if (aSev !== bSev) return aSev - bSev
        return b.product_count - a.product_count
      })

    // Summary stats
    const summary = {
      total_issues: issues.length,
      total_affected_products: new Set(products.map(p => p.product_id)).size,
      by_severity: {
        error: issues.filter(i => i.severity === 'error').reduce((sum, i) => sum + i.product_count, 0),
        warning: issues.filter(i => i.severity === 'warning').reduce((sum, i) => sum + i.product_count, 0),
        suggestion: issues.filter(i => i.severity === 'suggestion').reduce((sum, i) => sum + i.product_count, 0),
      },
      by_fixability: {
        auto: issues.filter(i => i.fixability === 'auto').length,
        'semi-auto': issues.filter(i => i.fixability === 'semi-auto').length,
        manual: issues.filter(i => i.fixability === 'manual').length,
        unknown: issues.filter(i => i.fixability === 'unknown').length,
      },
      by_status: {
        pending: issues.filter(i => i.status === 'pending').length,
        in_progress: issues.filter(i => i.status === 'in_progress').length,
        fixed: issues.filter(i => i.status === 'fixed').length,
        verified: issues.filter(i => i.status === 'verified').length,
      },
    }

    return NextResponse.json({
      hasData: true,
      business,
      summary,
      issues,
    })

  } catch (error: any) {
    console.error('Merchant audit API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch audit data' },
      { status: 500 }
    )
  }
}
