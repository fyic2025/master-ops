-- Migration: Add clarification columns to tasks table
-- Date: 2025-12-03
-- Purpose: Enable Claude Code to request clarifications from task creators via dashboard

-- Add clarification_request column
-- Used by Claude to ask questions about a task
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS clarification_request TEXT;

-- Add clarification_response column
-- Used by task creator (e.g., Peter) to respond to clarification requests
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS clarification_response TEXT;

-- Add comment explaining the columns
COMMENT ON COLUMN tasks.clarification_request IS 'Question from Claude Code needing clarification from task creator';
COMMENT ON COLUMN tasks.clarification_response IS 'Response from task creator to the clarification request';

-- Update status enum to include 'awaiting_clarification'
-- Note: PostgreSQL doesn't have native enum types in this schema, status is TEXT
-- Just documenting the new valid value here for reference:
-- Status values: 'pending', 'pending_input', 'scheduled', 'in_progress', 'failed',
--                'needs_fix', 'completed', 'cancelled', 'blocked', 'awaiting_clarification'
