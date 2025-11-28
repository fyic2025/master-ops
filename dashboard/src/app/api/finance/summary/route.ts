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

    // Get MTD intercompany eliminations
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1
    const { data: eliminations } = await supabase
      .from('intercompany_transactions')
      .select('source_entity, direction, total')
      .eq('period_year', currentYear)
      .eq('period_month', currentMonth)

    // Calculate elimination totals
    const eliminationTotals = {
      teelixir_to_elevate: 0, // Revenue to eliminate
      elevate_to_teelixir: 0, // Service revenue to eliminate
    }
    for (const tx of eliminations || []) {
      if (tx.source_entity === 'teelixir' && tx.direction === 'sale') {
        eliminationTotals.teelixir_to_elevate += Number(tx.total) || 0
      }
      if (tx.source_entity === 'elevate' && tx.direction === 'sale') {
        eliminationTotals.elevate_to_teelixir += Number(tx.total) || 0
      }
    }

    // Consolidated Teelixir + Elevate (before eliminations)
    const consolidatedKeys = ['teelixir', 'elevate']
    const consolidatedRaw = {
      revenue: 0,
      cogs: 0,
      gross_profit: 0,
      operating_expenses: 0,
      net_profit: 0,
    }
    for (const key of consolidatedKeys) {
      const biz = latestByBusiness[key]
      if (biz) {
        consolidatedRaw.revenue += Number(biz.revenue) || 0
        consolidatedRaw.cogs += Number(biz.cogs) || 0
        consolidatedRaw.gross_profit += Number(biz.gross_profit) || 0
        consolidatedRaw.operating_expenses += Number(biz.operating_expenses) || 0
        consolidatedRaw.net_profit += Number(biz.net_profit) || 0
      }
    }

    // Apply eliminations (revenue and matching COGS cancel out)
    const totalRevElim = eliminationTotals.teelixir_to_elevate + eliminationTotals.elevate_to_teelixir
    const consolidated = {
      revenue: consolidatedRaw.revenue - totalRevElim,
      cogs: consolidatedRaw.cogs - totalRevElim, // Corresponding COGS eliminated
      gross_profit: consolidatedRaw.gross_profit, // GP unchanged (rev - cogs both reduced)
      operating_expenses: consolidatedRaw.operating_expenses,
      net_profit: consolidatedRaw.net_profit,
    }

    return NextResponse.json({
      businesses: latestByBusiness,
      totals,
      consolidatedRaw, // Before eliminations
      consolidated,    // After eliminations
      eliminations: {
        teelixir_to_elevate: eliminationTotals.teelixir_to_elevate,
        elevate_to_teelixir: eliminationTotals.elevate_to_teelixir,
        total: totalRevElim,
      },
      syncedAt: businesses[0]?.synced_at || null,
    })
  } catch (error: any) {
    console.error('Finance API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
