import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// Force dynamic to prevent caching
export const dynamic = 'force-dynamic'

const BUCKET_NAME = 'task-attachments'

// GET /api/tasks/[id]/attachments/[attachmentId] - Get signed download URL
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const { id, attachmentId } = await params
    const taskId = parseInt(id)

    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 })
    }

    const supabase = createServerClient()

    // Get attachment record
    const { data: attachment, error } = await supabase
      .from('task_attachments')
      .select('*')
      .eq('id', attachmentId)
      .eq('task_id', taskId)
      .eq('is_deleted', false)
      .single()

    if (error || !attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    // Generate signed URL (valid for 1 hour)
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(attachment.storage_path, 3600)

    if (urlError) {
      console.error('Signed URL error:', urlError)
      return NextResponse.json(
        { error: 'Failed to generate download URL' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      attachment,
      downloadUrl: signedUrl.signedUrl,
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Attachment get error:', errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// DELETE /api/tasks/[id]/attachments/[attachmentId] - Soft delete attachment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const { id, attachmentId } = await params
    const taskId = parseInt(id)

    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 })
    }

    // Get deleted_by from query params or body
    const deletedBy = request.nextUrl.searchParams.get('deleted_by') || 'unknown'

    const supabase = createServerClient()

    // Get attachment record first
    const { data: attachment, error: fetchError } = await supabase
      .from('task_attachments')
      .select('*')
      .eq('id', attachmentId)
      .eq('task_id', taskId)
      .eq('is_deleted', false)
      .single()

    if (fetchError || !attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    // Soft delete the attachment
    const { error: updateError } = await supabase
      .from('task_attachments')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: deletedBy,
      })
      .eq('id', attachmentId)

    if (updateError) {
      console.error('Attachment delete error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Log the deletion
    await supabase.from('task_logs').insert({
      task_id: taskId,
      source: deletedBy,
      status: 'info',
      message: `Attachment deleted: ${attachment.original_filename}`,
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Attachment delete error:', errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// PATCH /api/tasks/[id]/attachments/[attachmentId] - Update attachment metadata
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const { id, attachmentId } = await params
    const taskId = parseInt(id)

    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 })
    }

    const body = await request.json()
    const { description } = body

    const supabase = createServerClient()

    // Update attachment metadata
    const { data: attachment, error } = await supabase
      .from('task_attachments')
      .update({ description })
      .eq('id', attachmentId)
      .eq('task_id', taskId)
      .eq('is_deleted', false)
      .select()
      .single()

    if (error) {
      console.error('Attachment update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    return NextResponse.json({ attachment })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Attachment update error:', errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
