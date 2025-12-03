/**
 * Deploy Task Schema to Master Hub Supabase
 *
 * Usage: node deploy-tasks-schema.js [--check] [--copy]
 *
 * Options:
 *   --check  Only verify if tables exist
 *   --copy   Copy SQL to clipboard for manual execution
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Master Hub Supabase (used by dashboard)
const SUPABASE_URL = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8'

async function checkTables() {
  console.log('Checking task tables in Master Hub Supabase...')
  console.log('URL:', SUPABASE_URL)
  console.log('')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Check tasks table
  const { data: tasks, error: tasksErr } = await supabase
    .from('tasks')
    .select('id, title, business, category, status')
    .limit(5)

  if (tasksErr) {
    if (tasksErr.code === '42P01' || tasksErr.message?.includes('does not exist')) {
      console.log('Tasks table: NOT FOUND - needs creation')
      return false
    }
    console.log('Tasks table: ERROR -', tasksErr.message)
    return false
  }

  console.log('Tasks table: OK')
  console.log(`  Found ${tasks?.length || 0} existing tasks`)

  // Check task_logs table
  const { data: logs, error: logsErr } = await supabase
    .from('task_logs')
    .select('id')
    .limit(1)

  if (logsErr) {
    if (logsErr.code === '42P01' || logsErr.message?.includes('does not exist')) {
      console.log('Task_logs table: NOT FOUND - needs creation')
      return false
    }
    console.log('Task_logs table: ERROR -', logsErr.message)
    return false
  }

  console.log('Task_logs table: OK')
  return true
}

async function copySchemaToClipboard() {
  const schemaPath = path.join(__dirname, 'schema-tasks.sql')
  const schema = fs.readFileSync(schemaPath, 'utf8')

  try {
    const { execSync } = require('child_process')
    // Try Windows clip command
    execSync('clip', { input: schema })
    console.log('Schema SQL copied to clipboard!')
    console.log('')
    console.log('Next steps:')
    console.log('1. Go to https://supabase.com/dashboard/project/qcvfxxsnqvdfmpbcgdni/sql')
    console.log('2. Paste the SQL and click Run')
    console.log('3. Run this script again with --check to verify')
  } catch (err) {
    console.log('Could not copy to clipboard. Schema file location:')
    console.log(schemaPath)
  }
}

async function insertSampleTask() {
  console.log('\nInserting sample task to verify schema...')
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: 'Test task from deployment script',
      description: 'This task was created to verify the schema deployment worked.',
      business: 'overall',
      category: 'systemChecks',
      priority: 4,
      status: 'completed',
      created_by: 'deployment_script'
    })
    .select()
    .single()

  if (error) {
    console.log('Insert failed:', error.message)
    return false
  }

  console.log('Sample task created:', data.id)

  // Clean up
  await supabase.from('tasks').delete().eq('id', data.id)
  console.log('Sample task cleaned up')
  return true
}

async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--copy')) {
    await copySchemaToClipboard()
    return
  }

  const tablesExist = await checkTables()

  if (!tablesExist) {
    console.log('')
    console.log('=== Tables need to be created ===')
    console.log('')
    console.log('Option 1: Copy SQL to clipboard')
    console.log('  node deploy-tasks-schema.js --copy')
    console.log('')
    console.log('Option 2: Manual deployment')
    console.log('  1. Open: https://supabase.com/dashboard/project/qcvfxxsnqvdfmpbcgdni/sql')
    console.log('  2. Copy contents of: infra/supabase/schema-tasks.sql')
    console.log('  3. Paste and click Run')
    console.log('')
    console.log('After creating tables, run: node deploy-tasks-schema.js --check')
    return
  }

  if (args.includes('--check')) {
    console.log('\nAll tables exist!')
    return
  }

  // Verify with sample insert
  const verified = await insertSampleTask()
  if (verified) {
    console.log('\nSchema is fully functional!')
  }
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
