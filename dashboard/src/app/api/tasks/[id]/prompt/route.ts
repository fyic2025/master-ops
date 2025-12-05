import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// GET /api/tasks/[id]/prompt - Get task prompt for manual handling
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const { id } = params

    // Get task
    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Build prompt (matching process-task.sh format)
    const prompt = `You are working on the master-ops codebase.

# Task: ${task.title}

## Task ID
${task.id}

## Business Context
${task.business || 'general'}

## Priority
${task.priority || 2}

## Description
${task.description || 'No description'}

## Instructions
${task.instructions || 'No specific instructions'}

## Additional Context
${task.context || ''}

---

**REQUIREMENTS**:
1. Complete this task according to the instructions above
2. Check CLAUDE.md for applicable skills and use them if relevant
3. Report exactly what actions you took
4. Note any issues or blockers encountered
5. Provide a clear summary of the outcome

Execute this task now.`

    // Generate copy-paste command
    const escapedPrompt = prompt.replace(/"/g, '\\"').replace(/\n/g, '\\n')
    const command = `claude -p "${escapedPrompt}" --output-format json`

    return NextResponse.json({
      task,
      prompt,
      command,
      // Simpler prompt for clipboard
      simplePrompt: `Task #${task.id}: ${task.title}\n\n${task.description || ''}\n\nInstructions: ${task.instructions || 'Complete this task'}`
    })
  } catch (error: any) {
    console.error('Task prompt error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
