import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

/**
 * GET /api/cashflow/line-items
 * Get all line items for a business, optionally with budget data
 *
 * Query params:
 *   business: 'teelixir', 'elevate', or 'consolidated'
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const business = searchParams.get('business') || 'consolidated'

    const supabase = createServerClient()

    // Get line items for the business
    const { data: lineItems, error } = await supabase
      .from('cashflow_line_items')
      .select('*')
      .eq('business_key', business)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching line items:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      lineItems: lineItems || [],
      business,
    })
  } catch (error: any) {
    console.error('Line items API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/cashflow/line-items
 * Create a new line item
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { business_key, parent_id, name, item_type, xero_account_code } = body

    if (!business_key || !name || !item_type) {
      return NextResponse.json(
        { error: 'Missing required fields: business_key, name, item_type' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Get max sort_order for siblings
    let query = supabase
      .from('cashflow_line_items')
      .select('sort_order')
      .eq('business_key', business_key)

    if (parent_id) {
      query = query.eq('parent_id', parent_id)
    } else {
      query = query.is('parent_id', null)
    }

    const { data: siblings } = await query.order('sort_order', { ascending: false }).limit(1)
    const maxSortOrder = siblings?.[0]?.sort_order || 0

    // Insert new line item
    const { data: newItem, error } = await supabase
      .from('cashflow_line_items')
      .insert({
        business_key,
        parent_id,
        name,
        item_type,
        xero_account_code,
        sort_order: maxSortOrder + 10,
        is_system: false,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating line item:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ lineItem: newItem })
  } catch (error: any) {
    console.error('Create line item error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/cashflow/line-items
 * Update a line item
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, name, sort_order, is_active } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 })
    }

    const supabase = createServerClient()

    const updates: Record<string, any> = {}
    if (name !== undefined) updates.name = name
    if (sort_order !== undefined) updates.sort_order = sort_order
    if (is_active !== undefined) updates.is_active = is_active

    const { data: updatedItem, error } = await supabase
      .from('cashflow_line_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating line item:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ lineItem: updatedItem })
  } catch (error: any) {
    console.error('Update line item error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/cashflow/line-items
 * Soft delete a line item (set is_active = false)
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 })
    }

    const supabase = createServerClient()

    // Soft delete - set is_active to false
    const { error } = await supabase
      .from('cashflow_line_items')
      .update({ is_active: false })
      .eq('id', id)
      .eq('is_system', false) // Only allow deleting non-system items

    if (error) {
      console.error('Error deleting line item:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete line item error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
