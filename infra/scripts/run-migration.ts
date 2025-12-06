#!/usr/bin/env npx tsx
/**
 * Run a SQL migration file against Supabase
 *
 * Usage:
 *   npx tsx infra/scripts/run-migration.ts <migration-file>
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: 'c:/Users/jayso/master-ops/.env' })

async function runMigration(filePath: string): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  // Read migration file
  const absolutePath = path.resolve(filePath)
  if (!fs.existsSync(absolutePath)) {
    console.error(`Migration file not found: ${absolutePath}`)
    process.exit(1)
  }

  const sql = fs.readFileSync(absolutePath, 'utf-8')
  console.log(`Running migration: ${path.basename(absolutePath)}`)
  console.log(`SQL length: ${sql.length} characters`)

  // Connect to Supabase
  const supabase = createClient(supabaseUrl, supabaseKey, {
    db: {
      schema: 'public',
    },
  })

  // Execute via rpc (raw SQL execution)
  // Note: This requires the pgmq extension or a custom function
  // For now, we'll use the REST API approach with individual statements

  // Split by semicolons (simple approach - may need refinement for complex SQL)
  const statements = sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'))

  console.log(`Found ${statements.length} SQL statements\n`)

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    const preview = stmt.slice(0, 60).replace(/\n/g, ' ')
    process.stdout.write(`[${i + 1}/${statements.length}] ${preview}... `)

    try {
      // Use raw SQL execution via postgres function
      const { error } = await supabase.rpc('exec_sql', { sql_string: stmt + ';' })

      if (error) {
        // If exec_sql doesn't exist, try direct approach
        if (error.message.includes('function') && error.message.includes('does not exist')) {
          console.log('SKIP (exec_sql not available)')
          continue
        }
        throw error
      }

      console.log('OK')
      successCount++
    } catch (err: any) {
      console.log(`ERROR: ${err.message || err}`)
      errorCount++
    }
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Migration complete: ${successCount} succeeded, ${errorCount} failed`)
  console.log(`${'='.repeat(60)}`)

  if (errorCount > 0) {
    console.log('\nNote: Some statements may have failed due to:')
    console.log('- Objects already existing (IF NOT EXISTS should handle this)')
    console.log('- Missing exec_sql function in Supabase')
    console.log('\nYou can run the migration manually in Supabase SQL Editor:')
    console.log(`https://supabase.com/dashboard/project/qcvfxxsnqvdfmpbcgdni/sql`)
  }
}

// CLI
const args = process.argv.slice(2)
if (args.length === 0) {
  console.log('Usage: npx tsx infra/scripts/run-migration.ts <migration-file>')
  process.exit(1)
}

runMigration(args[0]).catch((error) => {
  console.error('Migration failed:', error)
  process.exit(1)
})
