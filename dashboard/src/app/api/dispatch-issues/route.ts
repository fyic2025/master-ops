import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// BOO Supabase
const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co'
const SUPABASE_KEY = process.env.BOO_SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    const { searchParams } = new URL(request.url)

    const supplier = searchParams.get('supplier')
    const status = searchParams.get('status')
    const sortBy = searchParams.get('sortBy') || 'impact_score'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    let query = supabase
      .from('dispatch_problem_products')
      .select('*')

    if (supplier && supplier !== 'all') {
      query = query.eq('supplier_name', supplier)
    }

    if (status && status !== 'all') {
      query = query.eq('review_status', status)
    }

    // Sort
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    const { data, error } = await query

    if (error) {
      console.error('Dispatch issues fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Analysis period: 20,000 orders over ~90 days (approx 3 months of data)
    const ANALYSIS_PERIOD_WEEKS = 13

    // Stock Logic:
    // - Supplier lead time is ~7 days (order placed → stock arrives)
    // - Keep 1 week of orders on hand to ship same-day while waiting for restock
    // - Add small buffer (1.2x) for demand spikes
    const SUPPLIER_LEAD_TIME_WEEKS = 1
    const DEMAND_BUFFER = 1.2

    // Enrich with calculated metrics
    const enrichedData = (data || []).map(item => {
      const totalOrders = item.slow_order_count + item.fast_order_count
      const ordersPerWeek = Math.round((totalOrders / ANALYSIS_PERIOD_WEEKS) * 10) / 10

      // Stock = 1 week of demand × buffer (enough to cover supplier lead time)
      const weeksBuffer = SUPPLIER_LEAD_TIME_WEEKS
      const recommendedStock = Math.ceil(ordersPerWeek * weeksBuffer * DEMAND_BUFFER)

      return {
        ...item,
        total_orders: totalOrders,
        orders_per_week: ordersPerWeek,
        weeks_buffer: weeksBuffer,
        recommended_stock: recommendedStock,
      }
    })

    // Get unique suppliers for filter
    const suppliers = [...new Set((data || []).map(d => d.supplier_name))].filter(Boolean).sort()

    // Summary stats
    const summary = {
      total_products: enrichedData.length,
      needs_review: enrichedData.filter(d => d.review_status === 'pending').length,
      by_supplier: suppliers.map(s => ({
        name: s,
        count: enrichedData.filter(d => d.supplier_name === s).length,
        total_orders: enrichedData.filter(d => d.supplier_name === s).reduce((sum, d) => sum + d.total_orders, 0),
      })),
    }

    return NextResponse.json({
      products: enrichedData,
      suppliers,
      summary,
      analysis_period: {
        weeks: ANALYSIS_PERIOD_WEEKS,
        orders_analyzed: 20000,
        analysis_date: data?.[0]?.analysis_date || null,
      }
    })
  } catch (err: any) {
    console.error('Dispatch issues API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    const body = await request.json()
    const { id, review_status, review_notes } = body

    if (!id) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('dispatch_problem_products')
      .update({
        review_status,
        review_notes,
        needs_review: review_status === 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ product: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
