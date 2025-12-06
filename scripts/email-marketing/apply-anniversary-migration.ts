#!/usr/bin/env npx tsx
/**
 * Apply Anniversary Upsell Migration to Supabase
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const creds = require('../creds')

async function main() {
  console.log('\n📦 Applying Anniversary Upsell Migration...\n')

  // Load credentials
  const supabaseUrl = await creds.get('global', 'master_supabase_url')
  const supabaseKey = await creds.get('global', 'master_supabase_service_role_key')

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Read migration file
  const migrationPath = path.join(__dirname, '../infra/supabase/migrations/20251203_anniversary_upsell.sql')
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

  // Split into individual statements (naive split - good enough for this migration)
  const statements = migrationSQL
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`Found ${statements.length} SQL statements to execute\n`)

  let success = 0
  let failed = 0

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    const preview = stmt.substring(0, 80).replace(/\n/g, ' ')

    process.stdout.write(`[${i + 1}/${statements.length}] ${preview}... `)

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' })

      if (error) {
        // Try direct query for DDL statements
        const { error: directError } = await supabase.from('_migrations').select('*').limit(0)
        // Fallback: just report the statement for manual execution
        console.log('⚠️  (may need manual execution)')
        failed++
      } else {
        console.log('✅')
        success++
      }
    } catch (e: any) {
      console.log('⚠️')
      failed++
    }
  }

  console.log(`\n${'─'.repeat(50)}`)
  console.log(`✅ Successful: ${success}`)
  console.log(`⚠️  Need review: ${failed}`)
  console.log(`\nNote: DDL statements may need to be run directly in Supabase SQL Editor.`)
  console.log(`Migration file: ${migrationPath}`)
}

main().catch(console.error)
