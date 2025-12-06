#!/usr/bin/env npx tsx
/**
 * Quick migration runner - applies SQL to Supabase
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const SUPABASE_URL = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8'

async function runMigration() {
  const migrationFile = process.argv[2]

  if (!migrationFile) {
    console.log('Usage: npx tsx scripts/apply-migration.ts <migration-file.sql>')
    console.log('Example: npx tsx scripts/apply-migration.ts infra/supabase/migrations/20251201_teelixir_automations.sql')
    process.exit(1)
  }

  const fullPath = path.resolve(migrationFile)

  if (!fs.existsSync(fullPath)) {
    console.error(`File not found: ${fullPath}`)
    process.exit(1)
  }

  console.log(`\n📄 Reading migration: ${migrationFile}`)
  const sql = fs.readFileSync(fullPath, 'utf-8')

  console.log(`\n📊 Migration size: ${sql.length} characters`)

  // Split into statements (basic split on semicolons outside quotes)
  const statements = sql
    .split(/;(?=(?:[^']*'[^']*')*[^']*$)/m)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`\n📝 Found ${statements.length} SQL statements`)

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  console.log('\n🚀 Applying migration...\n')

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    const preview = stmt.substring(0, 60).replace(/\n/g, ' ')

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: stmt })

      if (error) {
        // Try direct query for DDL statements
        const { error: error2 } = await supabase.from('_dummy_').select('*').limit(0)

        // For DDL, we need to use the REST API or SQL editor
        // Let's just report what we're trying to do
        console.log(`   [${i + 1}/${statements.length}] ${preview}...`)
        console.log(`       ⚠️  Cannot execute DDL via client. Use Supabase SQL Editor.`)
        errorCount++
      } else {
        console.log(`   [${i + 1}/${statements.length}] ✅ ${preview}...`)
        successCount++
      }
    } catch (err: any) {
      console.log(`   [${i + 1}/${statements.length}] ${preview}...`)
      console.log(`       ❌ Error: ${err.message}`)
      errorCount++
    }
  }

  console.log(`\n📊 Results: ${successCount} succeeded, ${errorCount} need manual execution`)

  if (errorCount > 0) {
    console.log('\n⚠️  Some statements require manual execution in Supabase SQL Editor.')
    console.log('   Go to: https://supabase.com/dashboard/project/qcvfxxsnqvdfmpbcgdni/sql')
    console.log(`   Paste the contents of: ${migrationFile}`)
  }
}

runMigration().catch(console.error)
