import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createServerClient()

    // Fetch stats from the view
    const { data: stats, error } = await supabase
      .from('tlx_anniversary_stats')
      .select('*')
      .single()

    if (error) {
      console.error('Error fetching anniversary stats:', error)
      return NextResponse.json({ stats: null, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ stats })
  } catch (error: any) {
    console.error('Anniversary stats error:', error)
    return NextResponse.json({ stats: null, error: error.message }, { status: 500 })
  }
}
