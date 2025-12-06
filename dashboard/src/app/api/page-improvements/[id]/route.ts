import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/page-improvements/[id] - Get single improvement
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()

    const { data: improvement, error } = await supabase
      .from('dashboard_page_improvements')
      .select(`
        *,
        dashboard_pages (
          page_name,
          route,
          category,
          skills_required
        ),
        dashboard_page_analysis (
          analysis_type,
          findings,
          skills_used
        )
      `)
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('Get improvement error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!improvement) {
      return NextResponse.json({ error: 'Improvement not found' }, { status: 404 })
    }

    return NextResponse.json({ improvement })
  } catch (error: any) {
    console.error('Get improvement API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/page-improvements/[id] - Approve or reject improvement
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const body = await request.json()
    const { action, execution_type, rejection_reason, reviewed_by = 'jayson' } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    // Get the improvement first
    const { data: improvement, error: fetchError } = await supabase
      .from('dashboard_page_improvements')
      .select(`
        *,
        dashboard_pages (
          page_name,
          route,
          category
        )
      `)
      .eq('id', params.id)
      .single()

    if (fetchError || !improvement) {
      return NextResponse.json({ error: 'Improvement not found' }, { status: 404 })
    }

    if (improvement.status !== 'pending_review') {
      return NextResponse.json(
        { error: 'Improvement has already been reviewed' },
        { status: 400 }
      )
    }

    if (action === 'reject') {
      // Reject the improvement
      const { error: updateError } = await supabase
        .from('dashboard_page_improvements')
        .update({
          status: 'rejected',
          reviewed_by,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejection_reason || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.id)

      if (updateError) {
        console.error('Reject improvement error:', updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Improvement rejected',
      })
    }

    // Approve the improvement - create a task
    if (!execution_type || !['auto', 'manual'].includes(execution_type)) {
      return NextResponse.json(
        { error: 'execution_type is required for approval. Must be "auto" or "manual"' },
        { status: 400 }
      )
    }

    // Calculate priority based on score
    const priority = improvement.priority_score >= 8 ? 1 : improvement.priority_score >= 5 ? 2 : 3

    // Create task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title: improvement.title,
        description: `**Page:** ${improvement.dashboard_pages?.page_name || 'Unknown'} (${improvement.dashboard_pages?.route || ''})

${improvement.description}

---
**Improvement Type:** ${improvement.improvement_type}
**Estimated Effort:** ${improvement.estimated_effort}
**Suggested By:** ${improvement.suggested_by}
**Priority Score:** ${improvement.priority_score}/10`,
        business: 'overall',
        category: 'dashboard',
        priority,
        status: 'pending',
        execution_type,
      })
      .select('id')
      .single()

    if (taskError) {
      console.error('Create task error:', taskError)
      return NextResponse.json({ error: `Failed to create task: ${taskError.message}` }, { status: 500 })
    }

    // Update improvement with approval status and task reference
    const status = execution_type === 'auto' ? 'approved_auto' : 'approved_manual'

    const { error: updateError } = await supabase
      .from('dashboard_page_improvements')
      .update({
        status,
        execution_type,
        reviewed_by,
        reviewed_at: new Date().toISOString(),
        task_id: task.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)

    if (updateError) {
      console.error('Update improvement error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Improvement approved as ${execution_type}`,
      task_id: task.id,
    })
  } catch (error: any) {
    console.error('Approve/reject API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/page-improvements/[id] - Delete an improvement (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()

    const { error } = await supabase
      .from('dashboard_page_improvements')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Delete improvement error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete improvement API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
