import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// GET /api/automations/config - Get all automation configs
export async function GET() {
  try {
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('tlx_automation_config')
      .select('*')
      .order('automation_type')

    if (error) {
      console.error('Automation config fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ automations: data || [] })
  } catch (error: any) {
    console.error('Automation config error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/automations/config - Update automation config
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { automation_type, enabled, config } = body

    if (!automation_type) {
      return NextResponse.json({ error: 'automation_type is required' }, { status: 400 })
    }

    const supabase = createServerClient()

    // Build update object
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() }

    if (typeof enabled === 'boolean') {
      updateData.enabled = enabled
    }

    if (config) {
      // Merge with existing config
      const { data: existing } = await supabase
        .from('tlx_automation_config')
        .select('config')
        .eq('automation_type', automation_type)
        .single()

      updateData.config = { ...(existing?.config || {}), ...config }
    }

    const { data, error } = await supabase
      .from('tlx_automation_config')
      .update(updateData)
      .eq('automation_type', automation_type)
      .select()
      .single()

    if (error) {
      console.error('Automation config update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ automation: data })
  } catch (error: any) {
    console.error('Automation config update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
