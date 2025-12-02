#!/usr/bin/env node
/**
 * Run Anniversary Upsell Migration
 * Executes the migration SQL against Supabase
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

async function main() {
  console.log('\n📦 Running Anniversary Upsell Migration...\n')

  // Load credentials
  const creds = require('../creds')
  const supabaseUrl = await creds.get('global', 'master_supabase_url')
  const supabaseKey = await creds.get('global', 'master_supabase_service_role_key')

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials')
    process.exit(1)
  }

  console.log('✅ Credentials loaded')
  console.log(`   URL: ${supabaseUrl}`)

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Read migration file
  const migrationPath = path.join(__dirname, '../infra/supabase/migrations/20251203_anniversary_upsell.sql')
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

  console.log(`\n📄 Migration file: ${migrationPath}`)
  console.log(`   Size: ${migrationSQL.length} characters\n`)

  // Execute the migration using Supabase's SQL endpoint
  // Since we can't run raw DDL via the JS client, we'll need to use the REST API
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    },
    body: JSON.stringify({})
  })

  // The Supabase JS client doesn't support raw SQL execution for DDL
  // We need to guide the user to run it in the SQL Editor
  console.log('─'.repeat(60))
  console.log('⚠️  DDL migrations must be run in Supabase SQL Editor')
  console.log('─'.repeat(60))
  console.log('\nSteps:')
  console.log('1. Go to: https://supabase.com/dashboard/project/qcvfxxsnqvdfmpbcgdni/sql/new')
  console.log('2. Copy the migration SQL from:')
  console.log(`   ${migrationPath}`)
  console.log('3. Paste and run in the SQL Editor')
  console.log('\nAlternatively, I can verify if tables already exist...\n')

  // Check if tables exist
  console.log('Checking existing tables...')

  const { data: variants, error: variantsErr } = await supabase
    .from('tlx_shopify_variants')
    .select('id')
    .limit(1)

  if (variantsErr && variantsErr.code === '42P01') {
    console.log('   ❌ tlx_shopify_variants - does not exist')
  } else {
    console.log('   ✅ tlx_shopify_variants - exists')
  }

  const { data: queue, error: queueErr } = await supabase
    .from('tlx_anniversary_queue')
    .select('id')
    .limit(1)

  if (queueErr && queueErr.code === '42P01') {
    console.log('   ❌ tlx_anniversary_queue - does not exist')
  } else {
    console.log('   ✅ tlx_anniversary_queue - exists')
  }

  // Check if anniversary_upsell config exists
  const { data: config, error: configErr } = await supabase
    .from('tlx_automation_config')
    .select('*')
    .eq('automation_type', 'anniversary_upsell')
    .single()

  if (configErr || !config) {
    console.log('   ❌ anniversary_upsell config - does not exist')
  } else {
    console.log('   ✅ anniversary_upsell config - exists')
  }

  // Check for upsell columns in anniversary_discounts
  const { data: discounts, error: discountsErr } = await supabase
    .from('tlx_anniversary_discounts')
    .select('upsell_variant_id')
    .limit(1)

  if (discountsErr && discountsErr.message.includes('upsell_variant_id')) {
    console.log('   ❌ upsell columns in tlx_anniversary_discounts - do not exist')
  } else {
    console.log('   ✅ upsell columns in tlx_anniversary_discounts - exist')
  }

  console.log('\n' + '─'.repeat(60))
  console.log('Migration file ready at:')
  console.log(migrationPath)
  console.log('─'.repeat(60))
}

main().catch(console.error)
