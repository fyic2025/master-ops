import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const supplierId = searchParams.get('supplier_id')
  const category = searchParams.get('category')
  const search = searchParams.get('search')
  const unmatchedOnly = searchParams.get('unmatched') === 'true'

  try {
    // Get suppliers
    const { data: suppliers } = await getSupabase()
      .from('rhf_suppliers')
      .select('id, name, code')
      .eq('active', true)
      .order('name')

    // Build supplier products query - get latest products from most recent pricelist
    let query = getSupabase()
      .from('rhf_supplier_products')
      .select(`
        id,
        supplier_id,
        supplier_code,
        name,
        unit,
        unit_size,
        cost_price,
        category,
        is_available,
        quality_days,
        last_seen_at,
        weight_kg,
        rhf_suppliers!inner(name, code)
      `)
      .eq('is_available', true)
      .order('last_seen_at', { ascending: false })
      .order('name')

    if (supplierId && supplierId !== 'all') {
      query = query.eq('supplier_id', supplierId)
    }

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data: products, error } = await query.limit(500)

    if (error) {
      console.error('Error fetching products:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get existing mappings
    const { data: mappings } = await getSupabase()
      .from('rhf_product_mappings')
      .select('supplier_product_id')

    const mappedProductIds = new Set(mappings?.map(m => m.supplier_product_id) || [])

    // Deduplicate products by name+supplier (keep most recent)
    const seen = new Map<string, typeof products[0]>()
    for (const p of products || []) {
      const key = `${p.supplier_id}-${p.name.toLowerCase()}`
      if (!seen.has(key)) {
        seen.set(key, p)
      }
    }
    const deduped = Array.from(seen.values())

    // Add mapping status to products
    const enrichedProducts = deduped.map(p => ({
      ...p,
      is_mapped: mappedProductIds.has(p.id),
      supplier_name: (p.rhf_suppliers as any)?.name || 'Unknown',
      supplier_code: (p.rhf_suppliers as any)?.code || ''
    }))

    // Filter by unmatched if requested
    const finalProducts = unmatchedOnly
      ? enrichedProducts.filter(p => !p.is_mapped)
      : enrichedProducts

    // Get categories for filter
    const categories = [...new Set(finalProducts.map(p => p.category).filter(Boolean))]

    // Get summary stats
    const summary = {
      total: finalProducts.length,
      mapped: finalProducts.filter(p => p.is_mapped).length,
      unmapped: finalProducts.filter(p => !p.is_mapped).length,
      by_supplier: suppliers?.map(s => ({
        id: s.id,
        name: s.name,
        code: s.code,
        count: finalProducts.filter(p => p.supplier_id === s.id).length,
        unmapped: finalProducts.filter(p => p.supplier_id === s.id && !p.is_mapped).length
      })) || []
    }

    return NextResponse.json({
      products: finalProducts,
      suppliers,
      categories,
      summary
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

// Create or update product mapping
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      supplier_product_id,
      woo_product_id,
      supplier_unit_type,
      supplier_unit_kg,
      sell_unit,
      is_primary,
      notes
    } = body

    // Calculate cost per sell unit if we have the data
    let cost_per_sell_unit = null
    if (supplier_unit_kg && supplier_unit_kg > 0) {
      // Get supplier product price
      const { data: sp } = await getSupabase()
        .from('rhf_supplier_products')
        .select('cost_price')
        .eq('id', supplier_product_id)
        .single()

      if (sp) {
        cost_per_sell_unit = Number(sp.cost_price) / Number(supplier_unit_kg)
      }
    }

    // Upsert the mapping
    const { data, error } = await getSupabase()
      .from('rhf_product_mappings')
      .upsert({
        supplier_product_id,
        woo_product_id,
        supplier_unit_type: supplier_unit_type || 'box',
        supplier_unit_kg: supplier_unit_kg || null,
        sell_unit: sell_unit || 'kg',
        cost_per_sell_unit,
        is_primary: is_primary ?? true,
        notes,
        created_by: 'dashboard'
      }, {
        onConflict: 'woo_product_id,supplier_product_id'
      })
      .select()

    if (error) {
      console.error('Error creating mapping:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, mapping: data })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to create mapping' }, { status: 500 })
  }
}

// Delete product mapping
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mappingId = searchParams.get('id')

  if (!mappingId) {
    return NextResponse.json({ error: 'Missing mapping id' }, { status: 400 })
  }

  try {
    const { error } = await getSupabase()
      .from('rhf_product_mappings')
      .delete()
      .eq('id', mappingId)

    if (error) {
      console.error('Error deleting mapping:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to delete mapping' }, { status: 500 })
  }
}
