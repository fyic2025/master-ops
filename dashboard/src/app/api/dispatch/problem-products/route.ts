import { NextResponse } from 'next/server'
import { createBooClient } from '@/lib/supabase'

export interface DispatchProblemProduct {
  id: number
  product_id: number
  product_name: string
  sku: string
  supplier_name: string
  slow_order_count: number
  fast_order_count: number
  slow_rate_percent: number
  avg_dispatch_days: number
  impact_score: number
  needs_review: boolean
  review_status: string
  avg_units_per_order: number | null
  recommended_stock: number | null
  analysis_date: string
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const minSlowRate = searchParams.get('minSlowRate') || '80'
    const needsReview = searchParams.get('needsReview')
    const limit = searchParams.get('limit') || '50'

    const supabase = createBooClient()

    let query = supabase
      .from('dispatch_problem_products')
      .select('*')
      .gte('slow_rate_percent', parseFloat(minSlowRate))
      .order('impact_score', { ascending: false })
      .limit(parseInt(limit))

    if (needsReview === 'true') {
      query = query.eq('needs_review', true)
    }

    const { data: products, error } = await query

    if (error) {
      console.error('Dispatch problem products fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Analysis period: 20,000 orders over ~13 weeks
    const ANALYSIS_PERIOD_WEEKS = 13
    const SAFETY_FACTOR = 1.5

    // Calculate recommended stock for each product
    const enrichedProducts = (products || []).map(p => {
      const totalOrders = p.slow_order_count + (p.fast_order_count || 0)
      const ordersPerWeek = Math.round((totalOrders / ANALYSIS_PERIOD_WEEKS) * 10) / 10
      const weeksBuffer = Math.max(2, Math.ceil(p.avg_dispatch_days / 7) * SAFETY_FACTOR)
      const calculatedStock = Math.ceil(ordersPerWeek * weeksBuffer)

      return {
        ...p,
        orders_per_week: ordersPerWeek,
        calculated_stock: calculatedStock,
        // Use saved recommended_stock if set, otherwise use calculated
        recommended_stock: p.recommended_stock || calculatedStock
      }
    })

    // Calculate summary stats
    const summary = {
      total: enrichedProducts.length,
      needsReview: enrichedProducts.filter(p => p.needs_review).length || 0,
      resolved: enrichedProducts.filter(p => p.review_status === 'resolved').length || 0,
      avgSlowRate: enrichedProducts.length
        ? Math.round(enrichedProducts.reduce((acc, p) => acc + p.slow_rate_percent, 0) / enrichedProducts.length * 10) / 10
        : 0,
      bySupplier: {} as Record<string, number>
    }

    // Group by supplier
    for (const product of enrichedProducts) {
      const supplier = product.supplier_name || 'Unknown'
      summary.bySupplier[supplier] = (summary.bySupplier[supplier] || 0) + 1
    }

    return NextResponse.json({
      products: enrichedProducts,
      summary,
      lastUpdated: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Dispatch API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH - Update product review status
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, review_status, review_notes, recommended_stock } = body

    if (!id) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
    }

    const supabase = createBooClient()

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (review_status !== undefined) {
      updateData.review_status = review_status
      if (review_status === 'resolved' || review_status === 'dismissed') {
        updateData.needs_review = false
      }
    }

    if (review_notes !== undefined) {
      updateData.review_notes = review_notes
    }

    if (recommended_stock !== undefined) {
      updateData.recommended_stock = recommended_stock
    }

    const { data, error } = await supabase
      .from('dispatch_problem_products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ product: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
