import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'


export const dynamic = 'force-dynamic'

// GET /api/xero/bank-statements - List unreconciled bank statements
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const searchParams = request.nextUrl.searchParams

    // Build query
    let query = supabase
      .from('xero_bank_statements')
      .select('*')
      .order('date', { ascending: false })

    // Apply filters
    const business = searchParams.get('business')
    if (business) {
      query = query.eq('business_slug', business)
    }

    const reconciled = searchParams.get('reconciled')
    if (reconciled !== null) {
      query = query.eq('is_reconciled', reconciled === 'true')
    }

    const fromDate = searchParams.get('from')
    if (fromDate) {
      query = query.gte('date', fromDate)
    }

    const toDate = searchParams.get('to')
    if (toDate) {
      query = query.lte('date', toDate)
    }

    const limit = searchParams.get('limit')
    if (limit) {
      query = query.limit(parseInt(limit))
    } else {
      query = query.limit(100)
    }

    const { data: statements, error } = await query

    if (error) {
      console.error('Bank statements fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate summary stats
    const summary = {
      total: statements?.length || 0,
      unreconciled: statements?.filter(s => !s.is_reconciled).length || 0,
      reconciled: statements?.filter(s => s.is_reconciled).length || 0,
      totalAmount: statements?.reduce((sum, s) => sum + Number(s.amount), 0) || 0,
    }

    return NextResponse.json({
      statements: statements || [],
      summary,
    })
  } catch (error: any) {
    console.error('Bank statements API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/xero/bank-statements - Import bank statements from Xero
// TODO: Xero client integration pending - use server-side script for now
export async function POST() {
  return NextResponse.json(
    { error: 'Xero import not available in dashboard. Use CLI script: npx tsx scripts/financials/sync-xero-to-supabase.ts' },
    { status: 501 }
  )
}
