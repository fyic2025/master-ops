import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabase
      .from('prospecting_queue')
      .select(`
        id,
        hubspot_contact_id,
        email,
        company_name,
        lead_category,
        queue_status,
        queued_at,
        processed_at,
        approved_tag_added_at,
        first_login_at,
        shopify_customer_id,
        batch_date,
        last_error,
        retry_count
      `)
      .order('queued_at', { ascending: false })
      .limit(limit)

    if (status !== 'all') {
      query = query.eq('queue_status', status)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({ queue: data || [] })
  } catch (error: any) {
    console.error('Queue fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch queue' },
      { status: 500 }
    )
  }
}
