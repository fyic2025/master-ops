import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// BOO Supabase
const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co'
const SUPABASE_KEY = process.env.BOO_SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'

// Date range to weeks mapping
const DATE_RANGE_WEEKS: Record<string, number> = {
  '30d': 4,
  '3m': 13,
  '6m': 26,
  '12m': 52,
  'all': 52, // Cap at 52 weeks for calculations
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    const { searchParams } = new URL(request.url)

    const supplier = searchParams.get('supplier')
    const status = searchParams.get('status')
    const sortBy = searchParams.get('sortBy') || 'impact_score'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const dateRange = searchParams.get('dateRange') || '3m'
    const smartFilters = searchParams.get('smartFilters') !== 'false' // Default ON

    // Fetch dispatch problem products
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

    const { data: dispatchData, error: dispatchError } = await query

    if (dispatchError) {
      console.error('Dispatch issues fetch error:', dispatchError)
      return NextResponse.json({ error: dispatchError.message }, { status: 500 })
    }

    // Fetch product catalog for validity checking
    const productIds = [...new Set((dispatchData || []).map(d => d.product_id).filter(Boolean))]
    let productMap: Record<number, any> = {}

    if (productIds.length > 0) {
      const { data: products, error: productsError } = await supabase
        .from('ecommerce_products')
        .select('product_id, is_visible, availability, inventory_level')
        .in('product_id', productIds)

      if (!productsError && products) {
        productMap = products.reduce((acc, p) => {
          acc[p.product_id] = p
          return acc
        }, {} as Record<number, any>)
      }
    }

    // Analysis period based on date range
    const ANALYSIS_PERIOD_WEEKS = DATE_RANGE_WEEKS[dateRange] || 13

    // Stock Logic:
    // - Supplier lead time is ~7 days (order placed → stock arrives)
    // - Keep 1 week of orders on hand to ship same-day while waiting for restock
    // - Add small buffer (1.2x) for demand spikes
    const SUPPLIER_LEAD_TIME_WEEKS = 1
    const DEMAND_BUFFER = 1.2

    // Track items hidden by smart filters
    let hiddenBySmartFilters = 0

    // Enrich with calculated metrics and product validity
    let enrichedData = (dispatchData || []).map(item => {
      const totalOrders = item.slow_order_count + item.fast_order_count
      const ordersPerWeek = Math.round((totalOrders / ANALYSIS_PERIOD_WEEKS) * 10) / 10

      // Stock = 1 week of demand × buffer (enough to cover supplier lead time)
      const weeksBuffer = SUPPLIER_LEAD_TIME_WEEKS
      const recommendedStock = Math.ceil(ordersPerWeek * weeksBuffer * DEMAND_BUFFER)

      // Check product validity
      const product = productMap[item.product_id]
      let validityIssue: string | null = null

      if (!product) {
        validityIssue = 'not_found' // Product doesn't exist in catalog
      } else if (product.availability === 'disabled' || product.availability === 'preorder') {
        validityIssue = 'discontinued'
      } else if (product.inventory_level === 0) {
        validityIssue = 'out_of_stock'
      } else if (product.is_visible === false) {
        validityIssue = 'hidden'
      }

      return {
        ...item,
        total_orders: totalOrders,
        orders_per_week: ordersPerWeek,
        weeks_buffer: weeksBuffer,
        recommended_stock: recommendedStock,
        validity_issue: validityIssue,
        is_valid_product: validityIssue === null,
        product_inventory: product?.inventory_level ?? null,
        product_visible: product?.is_visible ?? null,
      }
    })

    // Apply smart filters if enabled
    if (smartFilters) {
      const beforeCount = enrichedData.length
      enrichedData = enrichedData.filter(item => {
        // Always exclude Kadac (quickest supplier = noise)
        if (item.supplier_name?.toLowerCase() === 'kadac') return false

        // Exclude Oborne single orders (noise)
        if (item.supplier_name?.toLowerCase() === 'oborne' && item.slow_order_count <= 1) return false

        return true
      })
      hiddenBySmartFilters = beforeCount - enrichedData.length
    }

    // Get unique suppliers for filter (from all data, not filtered)
    const allSuppliers = [...new Set((dispatchData || []).map(d => d.supplier_name))].filter(Boolean).sort()

    // Summary stats (from filtered data)
    const filteredSuppliers = [...new Set(enrichedData.map(d => d.supplier_name))].filter(Boolean).sort()
    const summary = {
      total_products: enrichedData.length,
      needs_review: enrichedData.filter(d => d.review_status === 'pending').length,
      invalid_products: enrichedData.filter(d => d.validity_issue !== null).length,
      hidden_by_smart_filters: hiddenBySmartFilters,
      by_supplier: filteredSuppliers.map(s => ({
        name: s,
        count: enrichedData.filter(d => d.supplier_name === s).length,
        total_orders: enrichedData.filter(d => d.supplier_name === s).reduce((sum, d) => sum + d.total_orders, 0),
        invalid_count: enrichedData.filter(d => d.supplier_name === s && d.validity_issue !== null).length,
      })),
    }

    return NextResponse.json({
      products: enrichedData,
      suppliers: allSuppliers,
      summary,
      analysis_period: {
        weeks: ANALYSIS_PERIOD_WEEKS,
        orders_analyzed: 20000,
        analysis_date: dispatchData?.[0]?.analysis_date || null,
      },
      smart_filters: {
        enabled: smartFilters,
        hidden_count: hiddenBySmartFilters,
        rules: ['Kadac excluded (quickest supplier)', 'Oborne single orders excluded'],
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
