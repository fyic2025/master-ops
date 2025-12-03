import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// GET /api/tasks/[id] - Get a single task with logs
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const { id } = params

    // Get task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single()

    if (taskError) {
      if (taskError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }
      return NextResponse.json({ error: taskError.message }, { status: 500 })
    }

    // Get task logs
    const { data: logs } = await supabase
      .from('task_logs')
      .select('*')
      .eq('task_id', id)
      .order('created_at', { ascending: false })
      .limit(50)

    return NextResponse.json({
      task,
      logs: logs || [],
    })
  } catch (error: any) {
    console.error('Task GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/tasks/[id] - Update a task
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const { id } = params
    const body = await request.json()

    // Get current task for logging
    const { data: currentTask } = await supabase
      .from('tasks')
      .select('status, title')
      .eq('id', id)
      .single()

    if (!currentTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Build update object (only include provided fields)
    const updates: Record<string, any> = {}
    const allowedFields = [
      'title', 'description', 'business', 'category', 'priority',
      'status', 'instructions', 'source_file', 'needs_research',
      'plan_json', 'current_step', 'supervisor_summary',
      'supervisor_recommendation', 'repair_instruction',
      'retry_count', 'next_action_after',
      'clarification_request', 'clarification_response'
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Perform update
    const { data: task, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log significant changes
    if (body.status && body.status !== currentTask.status) {
      await supabase.from('task_logs').insert({
        task_id: id,
        source: body.updated_by || 'dashboard',
        status: 'info',
        message: `Status changed: ${currentTask.status} → ${body.status}`,
      })
    }

    // Log clarification request
    if (body.clarification_request) {
      await supabase.from('task_logs').insert({
        task_id: id,
        source: body.updated_by || 'claude',
        status: 'info',
        message: `Clarification requested: ${body.clarification_request.slice(0, 200)}${body.clarification_request.length > 200 ? '...' : ''}`,
      })
    }

    // Log clarification response
    if (body.clarification_response) {
      await supabase.from('task_logs').insert({
        task_id: id,
        source: body.updated_by || 'user',
        status: 'info',
        message: `Clarification provided: ${body.clarification_response.slice(0, 200)}${body.clarification_response.length > 200 ? '...' : ''}`,
      })
    }

    return NextResponse.json({ task })
  } catch (error: any) {
    console.error('Task PATCH error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/tasks/[id] - Delete a task
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const { id } = params

    // Get task title for confirmation
    const { data: task } = await supabase
      .from('tasks')
      .select('title')
      .eq('id', id)
      .single()

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Delete task (logs will be cascade deleted)
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Task "${task.title}" deleted`,
    })
  } catch (error: any) {
    console.error('Task DELETE error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
