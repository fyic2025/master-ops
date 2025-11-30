import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

interface TrendDataPoint {
  date: string
  products_total: number
  products_approved: number
  products_disapproved: number
  products_pending: number
  impressions: number
  clicks: number
  approval_rate: number
  errors: number
  warnings: number
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const business = searchParams.get('business') || 'boo'
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const days = parseInt(searchParams.get('days') || '30')

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
        data: [],
        hasData: false,
        message: 'Google Merchant Center not configured',
      })
    }

    // Build query for snapshots
    let query = supabase
      .from('google_merchant_account_snapshots')
      .select('*')
      .eq('account_id', account.id)
      .order('snapshot_date', { ascending: true })

    // Apply date range
    if (from && to) {
      query = query.gte('snapshot_date', from).lte('snapshot_date', to)
    } else {
      // Default to last N days
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      query = query.gte('snapshot_date', startDate.toISOString().split('T')[0])
    }

    const { data: snapshots, error: snapshotsError } = await query

    if (snapshotsError) throw snapshotsError

    // Transform to trend data points
    const trendData: TrendDataPoint[] = (snapshots || []).map(s => ({
      date: s.snapshot_date,
      products_total: s.products_total || 0,
      products_approved: s.products_active || 0,
      products_disapproved: s.products_disapproved || 0,
      products_pending: s.products_pending || 0,
      impressions: s.total_impressions_30d || 0,
      clicks: s.total_clicks_30d || 0,
      approval_rate: s.approval_rate || 0,
      errors: s.total_errors || 0,
      warnings: s.total_warnings || 0,
    }))

    // Calculate aggregates
    const aggregates = trendData.length > 0 ? {
      avg_approval_rate: trendData.reduce((sum, d) => sum + d.approval_rate, 0) / trendData.length,
      total_impressions: trendData.length > 0 ? trendData[trendData.length - 1].impressions : 0,
      total_clicks: trendData.length > 0 ? trendData[trendData.length - 1].clicks : 0,
      trend_direction: trendData.length >= 2
        ? (trendData[trendData.length - 1].approval_rate > trendData[0].approval_rate ? 'up' : 'down')
        : 'stable',
    } : null

    return NextResponse.json({
      data: trendData,
      aggregates,
      hasData: trendData.length > 0,
      message: trendData.length === 0
        ? 'No historical data yet. Trends will appear after daily syncs run.'
        : undefined,
    })

  } catch (error: any) {
    console.error('Merchant trends API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch trend data' },
      { status: 500 }
    )
  }
}
