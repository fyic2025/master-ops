import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createServerClient()

    const { data: connections, error } = await supabase
      .from('tlx_gmail_connections')
      .select('id, email, display_name, connected_at, last_sync_at, is_active, scopes')
      .order('email')

    if (error) {
      console.error('Error fetching connections:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ connections: connections || [] })
  } catch (err) {
    console.error('Connections API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const supabase = createServerClient()

    const { error } = await supabase
      .from('tlx_gmail_connections')
      .delete()
      .eq('email', email)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete connection error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
