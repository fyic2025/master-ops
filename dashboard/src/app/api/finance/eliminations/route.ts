import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year') || new Date().getFullYear()
    const month = searchParams.get('month') || new Date().getMonth() + 1

    const supabase = createServerClient()

    // Get intercompany transactions for the period
    const { data: transactions, error } = await supabase
      .from('intercompany_transactions')
      .select('*')
      .eq('period_year', year)
      .eq('period_month', month)
      .order('invoice_date', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate summary by direction
    const summary = {
      teelixir_to_elevate: {
        count: 0,
        total: 0,
        type: 'Product Sales (eliminate revenue)',
      },
      elevate_to_teelixir: {
        count: 0,
        total: 0,
        type: 'Services/Freight (eliminate expense)',
      },
    }

    for (const tx of transactions || []) {
      if (tx.source_entity === 'teelixir' && tx.direction === 'sale') {
        summary.teelixir_to_elevate.count++
        summary.teelixir_to_elevate.total += Number(tx.total) || 0
      }
      if (tx.source_entity === 'elevate' && tx.direction === 'sale') {
        summary.elevate_to_teelixir.count++
        summary.elevate_to_teelixir.total += Number(tx.total) || 0
      }
    }

    const totalEliminations = summary.teelixir_to_elevate.total + summary.elevate_to_teelixir.total

    // Group transactions by type for detail view
    const byType = {
      revenue_cogs: transactions?.filter(t => t.elimination_type === 'revenue_cogs') || [],
      service_expense: transactions?.filter(t => t.elimination_type === 'service_expense') || [],
    }

    return NextResponse.json({
      period: { year: Number(year), month: Number(month) },
      summary,
      totalEliminations,
      transactionCount: transactions?.length || 0,
      byType: {
        revenue_cogs: {
          count: byType.revenue_cogs.length,
          total: byType.revenue_cogs.reduce((s, t) => s + Number(t.total), 0),
          transactions: byType.revenue_cogs.slice(0, 50), // Limit for UI
        },
        service_expense: {
          count: byType.service_expense.length,
          total: byType.service_expense.reduce((s, t) => s + Number(t.total), 0),
          transactions: byType.service_expense.slice(0, 50),
        },
      },
    })
  } catch (error: any) {
    console.error('Eliminations API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
