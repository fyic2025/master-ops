/**
 * Run Task Routing Migration on Master Hub Supabase
 *
 * Usage: node run-task-routing-migration.js
 */

const { createClient } = require('@supabase/supabase-js')

// Master Hub Supabase (used by dashboard - same as tasks table)
const SUPABASE_URL = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8'

async function runMigration() {
  console.log('='.repeat(60))
  console.log('TASK ROUTING MIGRATION')
  console.log('='.repeat(60))
  console.log('Target: Master Hub Supabase')
  console.log('URL:', SUPABASE_URL)
  console.log('')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Check current columns on tasks table
  console.log('Checking existing columns...')
  const { data: sample, error: sampleErr } = await supabase
    .from('tasks')
    .select('*')
    .limit(1)

  if (sampleErr) {
    console.error('Error accessing tasks table:', sampleErr.message)
    process.exit(1)
  }

  const existingColumns = sample?.[0] ? Object.keys(sample[0]) : []
  console.log('Existing columns:', existingColumns.length)

  // Check if new columns already exist
  const hasTriageColumns = existingColumns.includes('triage_status')
  if (hasTriageColumns) {
    console.log('')
    console.log('✅ Triage columns already exist!')
    console.log('   - suggested_assignee:', existingColumns.includes('suggested_assignee') ? 'YES' : 'NO')
    console.log('   - triage_status:', existingColumns.includes('triage_status') ? 'YES' : 'NO')
    console.log('   - automation_notes:', existingColumns.includes('automation_notes') ? 'YES' : 'NO')
    console.log('')
    console.log('Migration already applied. No action needed.')
    return
  }

  console.log('')
  console.log('New columns needed. Copy the following SQL to Supabase SQL Editor:')
  console.log('')
  console.log('='.repeat(60))

  const migrationSQL = `
-- Add routing fields to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS suggested_assignee TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS triage_status TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS automation_notes TEXT;

-- Create index for triage queue queries
CREATE INDEX IF NOT EXISTS idx_tasks_triage_status ON tasks(triage_status)
WHERE triage_status = 'pending_triage';
  `.trim()

  console.log(migrationSQL)
  console.log('')
  console.log('='.repeat(60))
  console.log('')
  console.log('Copy the SQL above and run it at:')
  console.log('https://supabase.com/dashboard/project/qcvfxxsnqvdfmpbcgdni/sql/new')
  console.log('')

  // Try to copy to clipboard
  try {
    const { execSync } = require('child_process')
    execSync('clip', { input: migrationSQL })
    console.log('✅ SQL copied to clipboard!')
  } catch (err) {
    console.log('(Could not copy to clipboard automatically)')
  }
}

runMigration().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
