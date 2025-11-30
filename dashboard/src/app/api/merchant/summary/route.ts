import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

interface MerchantSummary {
  business: string
  lastSynced: string | null
  products: {
    total: number
    approved: number
    disapproved: number
    pending: number
  }
  issues: {
    total: number
    errors: number
    warnings: number
    suggestions: number
    byCode: Record<string, { count: number; severity: string; description: string }>
  }
  performance: {
    impressions30d: number
    clicks30d: number
    ctr: number
  }
  approvalRate: number
  hasData: boolean
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const business = searchParams.get('business') || 'boo'

  try {
    const supabase = createServerClient()

    // Get the account for this business
    const { data: account, error: accountError } = await supabase
      .from('google_ads_accounts')
      .select('id, merchant_center_id')
      .eq('business', business)
      .single()

    if (accountError || !account) {
      return NextResponse.json({
        business,
        hasData: false,
        message: 'Google Merchant Center not configured for this business',
      })
    }

    // Fetch all products for this account
    const { data: products, error: productsError } = await supabase
      .from('google_merchant_products')
      .select('product_id, approval_status, item_issues, impressions_30d, clicks_30d, last_synced_at')
      .eq('account_id', account.id)

    if (productsError) throw productsError

    if (!products || products.length === 0) {
      return NextResponse.json({
        business,
        hasData: false,
        message: 'No products synced yet. Run the GMC sync script first.',
      })
    }

    // Calculate product counts
    const productCounts = {
      total: products.length,
      approved: products.filter(p => p.approval_status === 'approved').length,
      disapproved: products.filter(p => p.approval_status === 'disapproved').length,
      pending: products.filter(p => p.approval_status === 'pending').length,
    }

    // Calculate issue counts
    let totalErrors = 0
    let totalWarnings = 0
    let totalSuggestions = 0
    const issuesByCode: Record<string, { count: number; severity: string; description: string }> = {}

    for (const product of products) {
      if (product.item_issues && Array.isArray(product.item_issues)) {
        for (const issue of product.item_issues) {
          const severity = issue.severity || 'warning'
          const code = issue.code || 'unknown'
          const description = issue.description || issue.detail || ''

          if (severity === 'error') totalErrors++
          else if (severity === 'warning') totalWarnings++
          else totalSuggestions++

          if (!issuesByCode[code]) {
            issuesByCode[code] = { count: 0, severity, description }
          }
          issuesByCode[code].count++
        }
      }
    }

    // Calculate performance totals
    const totalImpressions = products.reduce((sum, p) => sum + (p.impressions_30d || 0), 0)
    const totalClicks = products.reduce((sum, p) => sum + (p.clicks_30d || 0), 0)
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0

    // Get last sync time
    const lastSynced = products.length > 0
      ? products.reduce((latest, p) => {
          if (!p.last_synced_at) return latest
          return !latest || new Date(p.last_synced_at) > new Date(latest)
            ? p.last_synced_at
            : latest
        }, null as string | null)
      : null

    const summary: MerchantSummary = {
      business,
      lastSynced,
      products: productCounts,
      issues: {
        total: totalErrors + totalWarnings + totalSuggestions,
        errors: totalErrors,
        warnings: totalWarnings,
        suggestions: totalSuggestions,
        byCode: issuesByCode,
      },
      performance: {
        impressions30d: totalImpressions,
        clicks30d: totalClicks,
        ctr,
      },
      approvalRate: productCounts.total > 0
        ? (productCounts.approved / productCounts.total) * 100
        : 0,
      hasData: true,
    }

    return NextResponse.json(summary)

  } catch (error: any) {
    console.error('Merchant summary API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch merchant data' },
      { status: 500 }
    )
  }
}
