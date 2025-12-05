-- Migration: Task Attachments
-- Description: Add document/file attachment support for tasks
-- Run in: Supabase SQL Editor (shared instance: qcvfxxsnqvdfmpbcgdni)

-- Table: task_attachments
-- Stores metadata for files attached to tasks
CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,  -- User's original filename
  file_type TEXT,                   -- MIME type (e.g., application/pdf)
  size_bytes INTEGER,
  storage_path TEXT NOT NULL,       -- Path in Supabase storage
  uploaded_by TEXT,                 -- Email of uploader
  description TEXT,                 -- Optional description
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_uploaded_by ON task_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_task_attachments_not_deleted ON task_attachments(task_id) WHERE is_deleted = false;

-- RLS Policies
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

-- Anyone can read attachments (dashboard has its own auth)
CREATE POLICY "Allow read access to task attachments"
  ON task_attachments FOR SELECT
  USING (true);

-- Anyone can insert attachments (dashboard handles auth)
CREATE POLICY "Allow insert task attachments"
  ON task_attachments FOR INSERT
  WITH CHECK (true);

-- Anyone can update attachments (for soft delete)
CREATE POLICY "Allow update task attachments"
  ON task_attachments FOR UPDATE
  USING (true);

-- Storage bucket for task attachments
-- Note: Run this in Supabase dashboard Storage section or via SQL:
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'task-attachments',
--   'task-attachments',
--   false,
--   10485760,  -- 10MB limit
--   ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp',
--         'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
--         'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
--         'text/plain', 'text/csv']
-- );

-- View for task with attachment count
CREATE OR REPLACE VIEW v_tasks_with_attachments AS
SELECT
  t.*,
  COALESCE(a.attachment_count, 0) as attachment_count
FROM tasks t
LEFT JOIN (
  SELECT task_id, COUNT(*) as attachment_count
  FROM task_attachments
  WHERE is_deleted = false
  GROUP BY task_id
) a ON t.id = a.task_id;

-- Function to get attachments for a task
CREATE OR REPLACE FUNCTION get_task_attachments(p_task_id INTEGER)
RETURNS TABLE (
  id UUID,
  filename TEXT,
  original_filename TEXT,
  file_type TEXT,
  size_bytes INTEGER,
  storage_path TEXT,
  uploaded_by TEXT,
  description TEXT,
  uploaded_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ta.id,
    ta.filename,
    ta.original_filename,
    ta.file_type,
    ta.size_bytes,
    ta.storage_path,
    ta.uploaded_by,
    ta.description,
    ta.uploaded_at
  FROM task_attachments ta
  WHERE ta.task_id = p_task_id
    AND ta.is_deleted = false
  ORDER BY ta.uploaded_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE task_attachments IS 'Stores file attachments for tasks in the ops dashboard';
