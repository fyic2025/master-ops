import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

/**
 * GET /api/cashflow/budgets
 * Get budget entries for a business and period range
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const business = searchParams.get('business') || 'consolidated'
    const periodType = searchParams.get('periodType') || 'monthly'
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const supabase = createServerClient()

    let query = supabase
      .from('cashflow_budgets')
      .select('*, cashflow_line_items(name, item_type)')
      .eq('business_key', business)
      .eq('period_type', periodType)

    if (from) {
      query = query.gte('period_start', from)
    }
    if (to) {
      query = query.lte('period_start', to)
    }

    const { data: budgets, error } = await query.order('period_start', { ascending: true })

    if (error) {
      console.error('Error fetching budgets:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      budgets: budgets || [],
      business,
      periodType,
    })
  } catch (error: any) {
    console.error('Budgets API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/cashflow/budgets
 * Create or update a budget entry (upsert)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { business_key, line_item_id, period_type, period_start, budget_amount, notes } = body

    if (!business_key || !line_item_id || !period_type || !period_start) {
      return NextResponse.json(
        { error: 'Missing required fields: business_key, line_item_id, period_type, period_start' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Upsert the budget entry
    const { data: budget, error } = await supabase
      .from('cashflow_budgets')
      .upsert(
        {
          business_key,
          line_item_id,
          period_type,
          period_start,
          budget_amount: budget_amount !== undefined ? budget_amount : null,
          notes: notes || null,
        },
        {
          onConflict: 'business_key,line_item_id,period_type,period_start',
        }
      )
      .select()
      .single()

    if (error) {
      console.error('Error upserting budget:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ budget })
  } catch (error: any) {
    console.error('Create budget error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/cashflow/budgets
 * Update multiple budget entries at once (batch update)
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { updates } = body // Array of { business_key, line_item_id, period_type, period_start, budget_amount }

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'Missing or empty updates array' }, { status: 400 })
    }

    const supabase = createServerClient()

    // Process updates one by one (could be optimized with bulk upsert)
    const results = []
    const errors = []

    for (const update of updates) {
      const { business_key, line_item_id, period_type, period_start, budget_amount, notes } = update

      if (!business_key || !line_item_id || !period_type || !period_start) {
        errors.push({ update, error: 'Missing required fields' })
        continue
      }

      const { data, error } = await supabase
        .from('cashflow_budgets')
        .upsert(
          {
            business_key,
            line_item_id,
            period_type,
            period_start,
            budget_amount: budget_amount !== undefined ? budget_amount : null,
            notes: notes || null,
          },
          {
            onConflict: 'business_key,line_item_id,period_type,period_start',
          }
        )
        .select()
        .single()

      if (error) {
        errors.push({ update, error: error.message })
      } else {
        results.push(data)
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      updated: results.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error('Batch update budget error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
