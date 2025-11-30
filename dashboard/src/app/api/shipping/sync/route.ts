import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase()
  
  try {
    const body = await request.json()
    const business = body.business || 'home'

    // For now, return placeholder - full sync logic requires platform API keys
    return NextResponse.json({
      success: true,
      synced: 0,
      errors: 0,
      businesses: business === 'home' ? ['boo', 'teelixir', 'elevate'] : [business],
      message: 'Sync initiated - configure platform API keys for full functionality'
    })
  } catch (error: any) {
    console.error('Sync error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
