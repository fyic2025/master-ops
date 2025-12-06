import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'


export const dynamic = 'force-dynamic'

// GET /api/xero/chart-of-accounts - List accounts
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const searchParams = request.nextUrl.searchParams

    // Build query
    let query = supabase
      .from('xero_chart_of_accounts')
      .select('*')
      .order('code', { ascending: true })

    // Apply filters
    const business = searchParams.get('business')
    if (business) {
      query = query.eq('business_slug', business)
    }

    const type = searchParams.get('type')
    if (type) {
      query = query.eq('type', type)
    }

    const accountClass = searchParams.get('class')
    if (accountClass) {
      query = query.eq('class', accountClass)
    }

    const status = searchParams.get('status')
    if (status) {
      query = query.eq('status', status)
    } else {
      // Default to active only
      query = query.eq('status', 'ACTIVE')
    }

    const search = searchParams.get('search')
    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`)
    }

    const { data: accounts, error } = await query

    if (error) {
      console.error('Chart of accounts fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group by type for UI
    const grouped = accounts?.reduce((acc: any, account: any) => {
      const type = account.type || 'OTHER'
      if (!acc[type]) {
        acc[type] = []
      }
      acc[type].push(account)
      return acc
    }, {})

    return NextResponse.json({
      accounts: accounts || [],
      grouped: grouped || {},
      total: accounts?.length || 0,
    })
  } catch (error: any) {
    console.error('Chart of accounts API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/xero/chart-of-accounts - Sync from Xero
// TODO: Xero client integration pending - use server-side script for now
export async function POST() {
  return NextResponse.json(
    { error: 'Xero sync not available in dashboard. Use CLI script.' },
    { status: 501 }
  )
}
