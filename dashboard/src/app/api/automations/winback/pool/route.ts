import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// GET /api/automations/winback/pool - Get unengaged pool size
export async function GET() {
  try {
    const supabase = createServerClient()

    // Count total unengaged profiles
    const { count, error: countError } = await supabase
      .from('tlx_klaviyo_unengaged')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('Unengaged count error:', countError)
    }

    // Get last sync time
    const { data: latest, error: latestError } = await supabase
      .from('tlx_klaviyo_unengaged')
      .select('synced_at')
      .order('synced_at', { ascending: false })
      .limit(1)
      .single()

    if (latestError && latestError.code !== 'PGRST116') {
      console.error('Latest sync fetch error:', latestError)
    }

    // Get count of already contacted
    const { count: contactedCount, error: contactedError } = await supabase
      .from('tlx_winback_emails')
      .select('*', { count: 'exact', head: true })

    if (contactedError) {
      console.error('Contacted count error:', contactedError)
    }

    return NextResponse.json({
      pool: {
        total: count || 0,
        last_synced: latest?.synced_at || null,
        already_contacted: contactedCount || 0,
        available: Math.max(0, (count || 0) - (contactedCount || 0))
      }
    })
  } catch (error: any) {
    console.error('Winback pool error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
