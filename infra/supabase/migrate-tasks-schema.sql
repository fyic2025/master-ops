-- ============================================================================
-- MIGRATION: Add dashboard columns to existing tasks table
-- ============================================================================
-- Run this if you already have a tasks table and need to add the new columns
-- ============================================================================

-- Add dashboard organization columns (if they don't exist)
DO $$
BEGIN
  -- business column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'tasks' AND column_name = 'business') THEN
    ALTER TABLE tasks ADD COLUMN business TEXT;
  END IF;

  -- category column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'tasks' AND column_name = 'category') THEN
    ALTER TABLE tasks ADD COLUMN category TEXT;
  END IF;

  -- priority column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'tasks' AND column_name = 'priority') THEN
    ALTER TABLE tasks ADD COLUMN priority INTEGER DEFAULT 2;
  END IF;

  -- instructions column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'tasks' AND column_name = 'instructions') THEN
    ALTER TABLE tasks ADD COLUMN instructions TEXT;
  END IF;

  -- source_file column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'tasks' AND column_name = 'source_file') THEN
    ALTER TABLE tasks ADD COLUMN source_file TEXT;
  END IF;

  -- needs_research column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'tasks' AND column_name = 'needs_research') THEN
    ALTER TABLE tasks ADD COLUMN needs_research BOOLEAN DEFAULT false;
  END IF;

  -- created_by column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'tasks' AND column_name = 'created_by') THEN
    ALTER TABLE tasks ADD COLUMN created_by TEXT;
  END IF;

  -- next_action_after column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'tasks' AND column_name = 'next_action_after') THEN
    ALTER TABLE tasks ADD COLUMN next_action_after TIMESTAMPTZ;
  END IF;
END $$;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_tasks_business ON tasks(business);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_business_category ON tasks(business, category);
CREATE INDEX IF NOT EXISTS idx_tasks_next_action ON tasks(next_action_after) WHERE next_action_after IS NOT NULL;

-- Verify columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'tasks'
ORDER BY ordinal_position;
