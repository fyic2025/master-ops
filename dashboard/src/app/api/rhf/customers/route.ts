import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const segment = searchParams.get('segment')
  const search = searchParams.get('search')
  const sortBy = searchParams.get('sort') || 'total_spent'
  const order = searchParams.get('order') || 'desc'

  try {
    // Build query
    let query = supabase
      .from('rhf_customers')
      .select('*')
      .gt('order_count', 0)

    if (segment && segment !== 'all') {
      query = query.eq('customer_segment', segment)
    }

    if (search) {
      query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
    }

    query = query.order(sortBy, { ascending: order === 'asc' })
    query = query.limit(100)

    const { data: customers, error } = await query

    if (error) {
      console.error('Error fetching customers:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get segment summary
    const { data: allCustomers } = await supabase
      .from('rhf_customers')
      .select('customer_segment, total_spent')
      .gt('order_count', 0)

    const segments: Record<string, { count: number; revenue: number }> = {
      champions: { count: 0, revenue: 0 },
      loyal: { count: 0, revenue: 0 },
      regular: { count: 0, revenue: 0 },
      new: { count: 0, revenue: 0 },
      at_risk: { count: 0, revenue: 0 },
      lost: { count: 0, revenue: 0 }
    }

    allCustomers?.forEach(c => {
      if (c.customer_segment && segments[c.customer_segment]) {
        segments[c.customer_segment].count++
        segments[c.customer_segment].revenue += Number(c.total_spent) || 0
      }
    })

    // Calculate totals
    const totalCustomers = allCustomers?.length || 0
    const totalRevenue = allCustomers?.reduce((sum, c) => sum + (Number(c.total_spent) || 0), 0) || 0

    return NextResponse.json({
      customers,
      segments,
      summary: {
        total_customers: totalCustomers,
        total_revenue: totalRevenue
      }
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
  }
}

// Trigger sync
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    if (action === 'recalculate_rfm') {
      const { error } = await supabase.rpc('rhf_calculate_rfm')
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ success: true, message: 'RFM recalculated' })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 })
  }
}
