import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// GET /api/task-suggestions - List suggestions
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const searchParams = request.nextUrl.searchParams

    let query = supabase
      .from('task_suggestions')
      .select('*')
      .order('created_at', { ascending: false })

    const status = searchParams.get('status')
    if (status) {
      query = query.eq('status', status)
    }

    const suggested_by = searchParams.get('suggested_by')
    if (suggested_by) {
      query = query.eq('suggested_by', suggested_by)
    }

    const { data, error } = await query.limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ suggestions: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/task-suggestions - Create suggestion
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()

    if (!body.title || !body.suggested_by) {
      return NextResponse.json(
        { error: 'Title and suggested_by are required' },
        { status: 400 }
      )
    }

    const suggestion = {
      title: body.title,
      description: body.description || null,
      business: body.business || null,
      automation_potential: body.automation_potential || null,
      time_saved_estimate_mins: body.time_saved_estimate_mins || null,
      frequency: body.frequency || null,
      suggested_by: body.suggested_by,
      status: 'pending',
    }

    const { data, error } = await supabase
      .from('task_suggestions')
      .insert(suggestion)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ suggestion: data }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
