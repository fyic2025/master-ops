import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// GET /api/automations/boo/checkout/recent - Get recent checkout errors and issues
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'errors' // 'errors' or 'issues'
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const supabase = createServerClient()

    if (type === 'issues') {
      // Get recent health issues
      const { data: issues, error } = await supabase
        .from('boo_checkout_health_issues')
        .select('*')
        .order('detected_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Checkout issues fetch error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ issues: issues || [] })
    }

    // Default: Get recent checkout errors
    const { data: errors, error } = await supabase
      .from('boo_recent_checkout_errors')
      .select('*')
      .limit(limit)

    if (error && error.code !== 'PGRST116') {
      // View might not exist yet, try direct query
      const { data: fallbackErrors, error: fallbackError } = await supabase
        .from('checkout_error_logs')
        .select(
          'id, error_type, error_message, customer_email, shipping_address_postcode, shipping_address_state, cart_value, occurred_at, resolved, resolution_notes'
        )
        .gte('occurred_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('occurred_at', { ascending: false })
        .limit(limit)

      if (fallbackError) {
        console.error('Checkout errors fetch error:', fallbackError)
        return NextResponse.json({ error: fallbackError.message }, { status: 500 })
      }

      return NextResponse.json({ errors: fallbackErrors || [] })
    }

    return NextResponse.json({ errors: errors || [] })
  } catch (error: unknown) {
    console.error('Checkout recent error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST /api/automations/boo/checkout/recent - Resolve an error
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, id, notes } = body

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }

    const supabase = createServerClient()

    if (action === 'resolve_error') {
      const { error } = await supabase
        .from('checkout_error_logs')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolution_notes: notes || 'Resolved via dashboard',
        })
        .eq('id', id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    if (action === 'resolve_issue') {
      const { error } = await supabase
        .from('boo_checkout_health_issues')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolution_notes: notes || 'Resolved via dashboard',
        })
        .eq('id', id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    if (action === 'acknowledge_issue') {
      const { error } = await supabase
        .from('boo_checkout_health_issues')
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: unknown) {
    console.error('Checkout recent POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
