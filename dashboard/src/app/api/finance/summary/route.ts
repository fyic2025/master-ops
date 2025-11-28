import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createServerClient()

    // Get latest MTD snapshots for each business
    const { data: snapshots, error } = await supabase
      .from('financial_snapshots')
      .select('*')
      .eq('period_type', 'mtd')
      .order('synced_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group by business_key and take the most recent for each
    const latestByBusiness: Record<string, any> = {}
    for (const snapshot of snapshots || []) {
      if (!latestByBusiness[snapshot.business_key]) {
        latestByBusiness[snapshot.business_key] = snapshot
      }
    }

    // Calculate totals
    const businesses = Object.values(latestByBusiness)
    const totals = {
      revenue: businesses.reduce((sum, b) => sum + (Number(b.revenue) || 0), 0),
      cogs: businesses.reduce((sum, b) => sum + (Number(b.cogs) || 0), 0),
      gross_profit: businesses.reduce((sum, b) => sum + (Number(b.gross_profit) || 0), 0),
      operating_expenses: businesses.reduce((sum, b) => sum + (Number(b.operating_expenses) || 0), 0),
      net_profit: businesses.reduce((sum, b) => sum + (Number(b.net_profit) || 0), 0),
    }

    // Consolidated Teelixir + Elevate
    const consolidatedKeys = ['teelixir', 'elevate']
    const consolidated = {
      revenue: 0,
      cogs: 0,
      gross_profit: 0,
      operating_expenses: 0,
      net_profit: 0,
    }
    for (const key of consolidatedKeys) {
      const biz = latestByBusiness[key]
      if (biz) {
        consolidated.revenue += Number(biz.revenue) || 0
        consolidated.cogs += Number(biz.cogs) || 0
        consolidated.gross_profit += Number(biz.gross_profit) || 0
        consolidated.operating_expenses += Number(biz.operating_expenses) || 0
        consolidated.net_profit += Number(biz.net_profit) || 0
      }
    }

    return NextResponse.json({
      businesses: latestByBusiness,
      totals,
      consolidated,
      syncedAt: businesses[0]?.synced_at || null,
    })
  } catch (error: any) {
    console.error('Finance API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
