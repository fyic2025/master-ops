/**
 * Test Supabase connection and tables
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '../.env' })
dotenv.config({ path: '.env' })

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

console.log('Testing Supabase Connection...')
console.log(`URL: ${supabaseUrl}`)
console.log(`Key: ${supabaseKey.substring(0, 20)}...`)

const supabase = createClient(supabaseUrl, supabaseKey)

async function testTables() {
  const tables = [
    'unleashed_shopify_bundle_mappings',
    'unleashed_shopify_sync_log',
    'unleashed_shopify_synced_orders',
    'unleashed_shopify_sku_mappings',
  ]

  for (const table of tables) {
    console.log(`\nTesting ${table}...`)

    // Try select
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact' })
      .limit(1)

    if (error) {
      console.log(`  ❌ SELECT error: ${error.message}`)
      console.log(`     Code: ${error.code}`)
      console.log(`     Details: ${error.details}`)
    } else {
      console.log(`  ✅ SELECT OK - ${count ?? 0} total rows`)
    }

    // Try insert test row (then delete)
    if (table === 'unleashed_shopify_sync_log') {
      const testRow = {
        store: 'test',
        sync_type: 'inventory',
        status: 'started',
        items_processed: 0,
        items_succeeded: 0,
        items_failed: 0,
        started_at: new Date().toISOString(),
      }

      const { data: insertData, error: insertError } = await supabase
        .from(table)
        .insert(testRow)
        .select('id')
        .single()

      if (insertError) {
        console.log(`  ❌ INSERT error: ${insertError.message}`)
      } else {
        console.log(`  ✅ INSERT OK - ID: ${insertData.id}`)

        // Clean up
        await supabase.from(table).delete().eq('id', insertData.id)
        console.log(`  ✅ DELETE OK (cleanup)`)
      }
    }
  }
}

testTables().catch(console.error)
