/**
 * Run the cashflow schema migration
 * Usage: node infra/supabase/run-cashflow-migration.js
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const SUPABASE_URL = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8'

async function runMigration() {
  console.log('Connecting to Supabase...')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Read the migration file
  const migrationPath = path.join(__dirname, 'migrations', '20251204_cashflow_schema.sql')
  const sql = fs.readFileSync(migrationPath, 'utf8')

  console.log('Migration file loaded:', migrationPath)
  console.log('SQL length:', sql.length, 'characters')

  // Split into individual statements (simple split on semicolons followed by newlines)
  const statements = sql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`\nExecuting ${statements.length} SQL statements...\n`)

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]

    // Skip comments and empty statements
    if (!stmt || stmt.startsWith('--')) continue

    // Truncate for display
    const displayStmt = stmt.length > 100 ? stmt.substring(0, 100) + '...' : stmt
    console.log(`[${i + 1}/${statements.length}] ${displayStmt}`)

    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: stmt + ';' })

      if (error) {
        // Try direct query if RPC doesn't exist
        const { error: directError } = await supabase.from('_exec').select('*').limit(0)

        // If we can't execute directly, log the error but continue
        // Some statements may fail due to "already exists" which is OK
        if (error.message.includes('already exists') ||
            error.message.includes('duplicate key') ||
            error.message.includes('does not exist')) {
          console.log(`  ⚠ Skipped (already exists or not applicable)`)
          successCount++
        } else {
          console.log(`  ❌ Error: ${error.message}`)
          errorCount++
        }
      } else {
        console.log(`  ✓ Success`)
        successCount++
      }
    } catch (err) {
      // For statements we can't execute via RPC, we need to run them in the dashboard
      console.log(`  ⚠ Needs manual execution in Supabase Dashboard`)
      errorCount++
    }
  }

  console.log(`\n${'='.repeat(50)}`)
  console.log(`Migration Summary:`)
  console.log(`  Successful: ${successCount}`)
  console.log(`  Failed/Manual: ${errorCount}`)
  console.log(`${'='.repeat(50)}`)

  if (errorCount > 0) {
    console.log(`\n⚠️  Some statements need manual execution.`)
    console.log(`   Please run the full SQL in Supabase Dashboard SQL Editor:`)
    console.log(`   https://supabase.com/dashboard/project/qcvfxxsnqvdfmpbcgdni/sql`)
    console.log(`\n   File: ${migrationPath}`)
  }
}

runMigration().catch(console.error)
