import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// Force dynamic to prevent caching
export const dynamic = 'force-dynamic'

// GET /api/tasks - List tasks with optional filters
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const searchParams = request.nextUrl.searchParams

    // Build query with filters
    let query = supabase
      .from('tasks')
      .select('*')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false })

    // Apply filters
    const business = searchParams.get('business')
    if (business) {
      query = query.eq('business', business)
    }

    const category = searchParams.get('category')
    if (category) {
      query = query.eq('category', category)
    }

    const status = searchParams.get('status')
    if (status) {
      query = query.eq('status', status)
    }

    const priority = searchParams.get('priority')
    if (priority) {
      query = query.eq('priority', parseInt(priority))
    }

    const executionType = searchParams.get('execution_type')
    if (executionType) {
      query = query.eq('execution_type', executionType)
    }

    // Limit results
    const limit = searchParams.get('limit')
    if (limit) {
      query = query.limit(parseInt(limit))
    } else {
      query = query.limit(100)
    }

    const { data: tasks, error } = await query

    if (error) {
      console.error('Tasks fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group by business.category for UI
    const grouped: Record<string, typeof tasks> = {}
    for (const task of tasks || []) {
      const key = `${task.business || 'overall'}.${task.category || 'general'}`
      if (!grouped[key]) {
        grouped[key] = []
      }
      grouped[key].push(task)
    }

    // Calculate summary
    const allTasks = tasks || []
    const summary = {
      total: allTasks.length,
      pending: allTasks.filter(t => t.status === 'pending').length,
      in_progress: allTasks.filter(t => t.status === 'in_progress').length,
      blocked: allTasks.filter(t => t.status === 'blocked').length,
      completed: allTasks.filter(t => t.status === 'completed').length,
      byPriority: {
        p1: allTasks.filter(t => t.priority === 1).length,
        p2: allTasks.filter(t => t.priority === 2).length,
        p3: allTasks.filter(t => t.priority === 3).length,
        p4: allTasks.filter(t => t.priority === 4).length,
      }
    }

    return NextResponse.json({
      tasks: allTasks,
      grouped,
      summary,
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    })
  } catch (error: any) {
    console.error('Tasks API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()

    // Validate required fields
    if (!body.title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Build task object
    const task = {
      title: body.title,
      description: body.description || null,
      business: body.business || null,
      category: body.category || null,
      priority: body.priority || 2,
      status: body.status || 'pending',
      instructions: body.instructions || null,
      source_file: body.source_file || null,
      needs_research: body.needs_research || false,
      created_by: body.created_by || 'dashboard',
      // Triage workflow fields
      suggested_assignee: body.suggested_assignee || null,
      triage_status: body.triage_status || null,
      assigned_to: body.assigned_to || null,
      automation_notes: body.automation_notes || null,
      // Execution type: manual (default) or auto
      execution_type: body.execution_type || 'manual',
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert(task)
      .select()
      .single()

    if (error) {
      console.error('Task create error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log the creation
    await supabase.from('task_logs').insert({
      task_id: data.id,
      source: task.created_by,
      status: 'info',
      message: `Task created: ${task.title}`,
    })

    return NextResponse.json({ task: data }, { status: 201 })
  } catch (error: any) {
    console.error('Tasks API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

