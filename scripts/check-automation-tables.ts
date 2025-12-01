#!/usr/bin/env npx tsx
/**
 * Check if automation tables exist in Supabase
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8'

async function checkTables() {
  console.log('\n🔍 Checking Supabase automation tables...\n')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  const tables = [
    'tlx_klaviyo_unengaged',
    'tlx_winback_emails',
    'tlx_automation_config'
  ]

  const results: Record<string, { exists: boolean; count?: number; error?: string }> = {}

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (error) {
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          results[table] = { exists: false }
        } else {
          results[table] = { exists: false, error: error.message }
        }
      } else {
        results[table] = { exists: true, count: count || 0 }
      }
    } catch (err: any) {
      results[table] = { exists: false, error: err.message }
    }
  }

  // Also check the view
  try {
    const { data, error } = await supabase
      .from('tlx_winback_stats')
      .select('*')
      .single()

    if (error && error.code !== 'PGRST116') {
      results['tlx_winback_stats (view)'] = { exists: false, error: error.message }
    } else {
      results['tlx_winback_stats (view)'] = { exists: true }
    }
  } catch (err: any) {
    results['tlx_winback_stats (view)'] = { exists: false, error: err.message }
  }

  // Display results
  console.log('Table Status:')
  console.log('─'.repeat(60))

  let allExist = true
  for (const [table, status] of Object.entries(results)) {
    if (status.exists) {
      console.log(`  ✅ ${table.padEnd(30)} EXISTS (${status.count ?? 'view'} rows)`)
    } else {
      allExist = false
      console.log(`  ❌ ${table.padEnd(30)} MISSING`)
      if (status.error) {
        console.log(`     Error: ${status.error}`)
      }
    }
  }

  console.log('─'.repeat(60))

  if (allExist) {
    console.log('\n✅ All automation tables exist! Migration already applied.')

    // Show current config
    const { data: config } = await supabase
      .from('tlx_automation_config')
      .select('*')
      .eq('automation_type', 'winback_40')
      .single()

    if (config) {
      console.log('\n📋 Current winback_40 config:')
      console.log(`   Enabled: ${config.enabled}`)
      console.log(`   Daily limit: ${config.config?.daily_limit || 20}`)
      console.log(`   Discount code: ${config.config?.discount_code || 'MISSYOU40'}`)
      console.log(`   Sender: ${config.config?.sender_email || 'colette@teelixir.com'}`)
      console.log(`   Last run: ${config.last_run_at || 'Never'}`)
    }
  } else {
    console.log('\n❌ Some tables are missing. Please run the migration:')
    console.log('')
    console.log('   1. Open: https://supabase.com/dashboard/project/qcvfxxsnqvdfmpbcgdni/sql')
    console.log('   2. Copy and paste the contents of:')
    console.log('      infra/supabase/migrations/20251201_teelixir_automations.sql')
    console.log('   3. Click "Run"')
    console.log('')
  }
}

checkTables().catch(console.error)
