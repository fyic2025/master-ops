/**
 * Apply database schema to Supabase
 *
 * This script verifies the schema exists and provides instructions
 * to apply it manually via Supabase SQL Editor if needed.
 *
 * Usage: npx tsx scripts/apply-schema.ts
 */

import * as dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import path from 'path'
import { fileURLToPath } from 'url'

// Load environment variables
dotenv.config({ path: '../.env' })
dotenv.config({ path: '.env' })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkSchema() {
  console.log('📦 Checking Unleashed-Shopify Sync Schema...')
  console.log(`   URL: ${supabaseUrl}`)
  console.log('')

  const tables = [
    'unleashed_shopify_bundle_mappings',
    'unleashed_shopify_sync_log',
    'unleashed_shopify_synced_orders',
    'unleashed_shopify_sku_mappings',
  ]

  let allExist = true

  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.log(`   ❌ ${table} - NOT FOUND`)
        allExist = false
      } else {
        console.log(`   ✅ ${table} - exists (${count ?? 0} rows)`)
      }
    } catch (err) {
      console.log(`   ❌ ${table} - Error: ${(err as Error).message}`)
      allExist = false
    }
  }

  if (allExist) {
    console.log('\n✅ All tables exist! Schema is ready.')
    return true
  }

  console.log('\n' + '='.repeat(60))
  console.log('Schema needs to be applied. Follow these steps:')
  console.log('='.repeat(60))
  console.log('')
  console.log('1. Go to Supabase Dashboard:')
  console.log(`   ${supabaseUrl.replace('.supabase.co', '.supabase.co/project/').replace('https://', 'https://supabase.com/dashboard/project/')}`)
  console.log('')
  console.log('2. Navigate to SQL Editor (left sidebar)')
  console.log('')
  console.log('3. Copy and paste the contents of:')
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  console.log(`   ${path.resolve(__dirname, '../supabase/migrations/001_sync_tables.sql')}`)
  console.log('')
  console.log('4. Click "Run" to execute')
  console.log('')
  console.log('5. Run this script again to verify')

  return false
}

checkSchema().catch((err) => {
  console.error('❌ Fatal error:', err.message)
  process.exit(1)
})
