import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// POST /api/tasks/[id]/complete - Mark task as completed with notes
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const { id } = params
    const body = await request.json()

    // Get current task
    const { data: currentTask, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !currentTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Update task to completed
    const { data: task, error: updateError } = await supabase
      .from('tasks')
      .update({
        status: 'completed',
        completion_notes: body.completion_notes || 'Completed manually',
        completed_at: new Date().toISOString(),
        time_on_task_mins: body.time_on_task_mins || null,
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Log completion
    await supabase.from('task_logs').insert({
      task_id: id,
      source: body.completed_by || 'manual_local',
      status: 'success',
      message: `Task completed manually. ${body.completion_notes ? `Notes: ${body.completion_notes.slice(0, 200)}` : ''}`,
      details_json: {
        time_on_task_mins: body.time_on_task_mins,
        completed_by: body.completed_by || 'local_claude',
      }
    })

    return NextResponse.json({
      success: true,
      task,
      message: `Task "${currentTask.title}" marked as completed`
    })
  } catch (error: any) {
    console.error('Task complete error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
