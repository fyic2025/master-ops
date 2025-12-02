import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createServerClient()

    // Fetch recent anniversary emails
    const { data: emails, error } = await supabase
      .from('tlx_anniversary_discounts')
      .select('id, email, first_name, status, created_at, converted_order_total, original_product_type, original_product_size, is_largest_size, upsell_savings_percent')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Error fetching anniversary recent:', error)
      return NextResponse.json({ emails: [], error: error.message }, { status: 500 })
    }

    return NextResponse.json({ emails: emails || [] })
  } catch (error: any) {
    console.error('Anniversary recent error:', error)
    return NextResponse.json({ emails: [], error: error.message }, { status: 500 })
  }
}
