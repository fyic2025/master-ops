import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// GET /api/automations/winback/recent - Get recent winback emails
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    const supabase = createServerClient()

    const { data: emails, error } = await supabase
      .from('tlx_winback_emails')
      .select('id, email, first_name, status, sent_at, order_total')
      .order('sent_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Winback recent fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ emails: emails || [] })
  } catch (error: any) {
    console.error('Winback recent error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
