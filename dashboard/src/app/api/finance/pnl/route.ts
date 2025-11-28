import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

/**
 * GET /api/finance/pnl
 * Query P&L data from Supabase with date range support
 *
 * Query params:
 *   from: Start date (YYYY-MM-DD)
 *   to: End date (YYYY-MM-DD)
 *   business: 'teelixir', 'elevate', or omit for both
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const fromDateStr = searchParams.get('from')
    const toDateStr = searchParams.get('to')
    const business = searchParams.get('business')

    // Default to MTD if no dates provided
    const now = new Date()
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1)
    const fromDate = fromDateStr ? new Date(fromDateStr) : defaultFrom
    const toDate = toDateStr ? new Date(toDateStr) : now

    // Calculate month range
    const startYear = fromDate.getFullYear()
    const startMonth = fromDate.getMonth() + 1
    const endYear = toDate.getFullYear()
    const endMonth = toDate.getMonth() + 1

    const supabase = createServerClient()

    // Build query for monthly snapshots
    let query = supabase
      .from('monthly_pnl_snapshots')
      .select('*')

    // Filter by business if specified
    if (business) {
      query = query.eq('business_key', business)
    }

    // Get all snapshots and filter in JS for complex date logic
    const { data: allSnapshots, error } = await query.order('period_year', { ascending: true })
      .order('period_month', { ascending: true })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Filter to date range
    const snapshots = (allSnapshots || []).filter(snap => {
      const snapDate = snap.period_year * 100 + snap.period_month
      const startDate = startYear * 100 + startMonth
      const endDate = endYear * 100 + endMonth
      return snapDate >= startDate && snapDate <= endDate
    })

    // Aggregate by business
    const byBusiness: Record<string, {
      revenue: number
      cogs: number
      gross_profit: number
      operating_expenses: number
      net_profit: number
      gross_margin_pct: number | null
      net_margin_pct: number | null
      months: number
      income_accounts: any[]
      cogs_accounts: any[]
      expense_accounts: any[]
    }> = {}

    for (const snap of snapshots) {
      if (!byBusiness[snap.business_key]) {
        byBusiness[snap.business_key] = {
          revenue: 0,
          cogs: 0,
          gross_profit: 0,
          operating_expenses: 0,
          net_profit: 0,
          gross_margin_pct: null,
          net_margin_pct: null,
          months: 0,
          income_accounts: [],
          cogs_accounts: [],
          expense_accounts: []
        }
      }

      const biz = byBusiness[snap.business_key]
      biz.revenue += Number(snap.revenue) || 0
      biz.cogs += Number(snap.cogs) || 0
      biz.gross_profit += Number(snap.gross_profit) || 0
      biz.operating_expenses += Number(snap.operating_expenses) || 0
      biz.net_profit += Number(snap.net_profit) || 0
      biz.months++

      // Merge account details (aggregate amounts by name)
      const mergeAccounts = (existing: any[], incoming: any[]) => {
        const map = new Map(existing.map(a => [a.name, a.amount]))
        for (const acc of incoming || []) {
          map.set(acc.name, (map.get(acc.name) || 0) + acc.amount)
        }
        return Array.from(map, ([name, amount]) => ({ name, amount }))
          .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
      }

      biz.income_accounts = mergeAccounts(biz.income_accounts, snap.income_accounts)
      biz.cogs_accounts = mergeAccounts(biz.cogs_accounts, snap.cogs_accounts)
      biz.expense_accounts = mergeAccounts(biz.expense_accounts, snap.expense_accounts)
    }

    // Calculate margins
    for (const biz of Object.values(byBusiness)) {
      biz.gross_margin_pct = biz.revenue > 0
        ? Number(((biz.gross_profit / biz.revenue) * 100).toFixed(2))
        : null
      biz.net_margin_pct = biz.revenue > 0
        ? Number(((biz.net_profit / biz.revenue) * 100).toFixed(2))
        : null
    }

    // Get intercompany eliminations for the period
    const { data: eliminations } = await supabase
      .from('intercompany_transactions')
      .select('source_entity, direction, total, period_year, period_month')

    // Filter eliminations to the same month range
    const filteredEliminations = (eliminations || []).filter(tx => {
      const txDate = tx.period_year * 100 + tx.period_month
      const startDate = startYear * 100 + startMonth
      const endDate = endYear * 100 + endMonth
      return txDate >= startDate && txDate <= endDate
    })

    const eliminationTotals = {
      teelixir_to_elevate: 0,
      elevate_to_teelixir: 0
    }

    for (const tx of filteredEliminations) {
      if (tx.source_entity === 'teelixir' && tx.direction === 'sale') {
        eliminationTotals.teelixir_to_elevate += Number(tx.total) || 0
      }
      if (tx.source_entity === 'elevate' && tx.direction === 'sale') {
        eliminationTotals.elevate_to_teelixir += Number(tx.total) || 0
      }
    }

    const totalEliminations = eliminationTotals.teelixir_to_elevate + eliminationTotals.elevate_to_teelixir

    // Calculate consolidated (Teelixir + Elevate)
    const teelixir = byBusiness.teelixir || { revenue: 0, cogs: 0, gross_profit: 0, operating_expenses: 0, net_profit: 0, income_accounts: [], cogs_accounts: [], expense_accounts: [] }
    const elevate = byBusiness.elevate || { revenue: 0, cogs: 0, gross_profit: 0, operating_expenses: 0, net_profit: 0, income_accounts: [], cogs_accounts: [], expense_accounts: [] }

    const consolidatedRaw = {
      revenue: teelixir.revenue + elevate.revenue,
      cogs: teelixir.cogs + elevate.cogs,
      gross_profit: teelixir.gross_profit + elevate.gross_profit,
      operating_expenses: teelixir.operating_expenses + elevate.operating_expenses,
      net_profit: teelixir.net_profit + elevate.net_profit
    }

    const consolidated = {
      revenue: consolidatedRaw.revenue - totalEliminations,
      cogs: consolidatedRaw.cogs - totalEliminations,
      gross_profit: consolidatedRaw.gross_profit,
      operating_expenses: consolidatedRaw.operating_expenses,
      net_profit: consolidatedRaw.net_profit,
      gross_margin_pct: consolidatedRaw.revenue - totalEliminations > 0
        ? Number(((consolidatedRaw.gross_profit / (consolidatedRaw.revenue - totalEliminations)) * 100).toFixed(2))
        : null,
      net_margin_pct: consolidatedRaw.revenue - totalEliminations > 0
        ? Number(((consolidatedRaw.net_profit / (consolidatedRaw.revenue - totalEliminations)) * 100).toFixed(2))
        : null
    }

    return NextResponse.json({
      period: {
        from: fromDate.toISOString().split('T')[0],
        to: toDate.toISOString().split('T')[0],
        months: snapshots.length ? Math.ceil(snapshots.length / Math.max(Object.keys(byBusiness).length, 1)) : 0
      },
      businesses: byBusiness,
      consolidatedRaw,
      consolidated,
      eliminations: {
        teelixir_to_elevate: eliminationTotals.teelixir_to_elevate,
        elevate_to_teelixir: eliminationTotals.elevate_to_teelixir,
        total: totalEliminations
      },
      dataSource: 'supabase'
    })
  } catch (error: any) {
    console.error('P&L API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
