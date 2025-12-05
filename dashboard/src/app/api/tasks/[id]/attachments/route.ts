import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// Force dynamic to prevent caching
export const dynamic = 'force-dynamic'

const BUCKET_NAME = 'task-attachments'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const ALLOWED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
]

// GET /api/tasks/[id]/attachments - List attachments for a task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const taskId = parseInt(id)

    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 })
    }

    const supabase = createServerClient()

    const { data: attachments, error } = await supabase
      .from('task_attachments')
      .select('*')
      .eq('task_id', taskId)
      .eq('is_deleted', false)
      .order('uploaded_at', { ascending: false })

    if (error) {
      console.error('Attachments fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ attachments: attachments || [] })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Attachments API error:', errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// POST /api/tasks/[id]/attachments - Upload a new attachment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const taskId = parseInt(id)

    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const description = formData.get('description') as string | null
    const uploadedBy = formData.get('uploaded_by') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type not allowed: ${file.type}` },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Verify task exists
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = `task-${taskId}/${timestamp}-${safeFilename}`

    // Upload to Supabase Storage
    const fileBuffer = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Create attachment record
    const { data: attachment, error: insertError } = await supabase
      .from('task_attachments')
      .insert({
        task_id: taskId,
        filename: `${timestamp}-${safeFilename}`,
        original_filename: file.name,
        file_type: file.type,
        size_bytes: file.size,
        storage_path: storagePath,
        uploaded_by: uploadedBy || 'unknown',
        description: description || null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Attachment insert error:', insertError)
      // Try to clean up uploaded file
      await supabase.storage.from(BUCKET_NAME).remove([storagePath])
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Log the upload
    await supabase.from('task_logs').insert({
      task_id: taskId,
      source: uploadedBy || 'dashboard',
      status: 'info',
      message: `Attachment uploaded: ${file.name}`,
    })

    return NextResponse.json({ attachment }, { status: 201 })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Attachment upload error:', errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
