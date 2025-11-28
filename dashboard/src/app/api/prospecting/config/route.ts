import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const ALLOWED_KEYS = [
  'prospecting_enabled',
  'prospecting_daily_limit',
  'prospecting_lead_category'
]

export async function PATCH(request: NextRequest) {
  try {
    const updates = await request.json()

    for (const [key, value] of Object.entries(updates)) {
      if (!ALLOWED_KEYS.includes(key)) {
        continue
      }

      const { error } = await supabase
        .from('system_config')
        .upsert({
          key,
          value: JSON.stringify(value),
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' })

      if (error) {
        console.error(`Error updating ${key}:`, error)
        throw error
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Config update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update config' },
      { status: 500 }
    )
  }
}
