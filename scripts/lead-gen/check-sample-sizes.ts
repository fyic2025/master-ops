#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js'
const creds = require('../creds')

async function main() {
  const url = await creds.get('global', 'master_supabase_url')
  const key = await creds.get('global', 'master_supabase_service_role_key')
  const supabase = createClient(url, key)

  const { data: timing } = await supabase
    .from('tlx_reorder_timing')
    .select('*')
    .not('product_type', 'is', null)
    .not('product_size_grams', 'is', null)
    .order('sample_size', { ascending: false })

  const at20 = (timing || []).filter(t => t.sample_size >= 20).length
  const at15 = (timing || []).filter(t => t.sample_size >= 15).length
  const at10 = (timing || []).filter(t => t.sample_size >= 10).length

  console.log('Product+Size combinations by sample threshold:')
  console.log('  >= 20 samples: ' + at20 + ' matches')
  console.log('  >= 15 samples: ' + at15 + ' matches')
  console.log('  >= 10 samples: ' + at10 + ' matches')

  console.log('\nAt sample >= 15 but < 20 (would be added with threshold 15):')
  for (const t of (timing || []).filter(t => t.sample_size >= 15 && t.sample_size < 20)) {
    console.log('  ' + (t.product_type || '').padEnd(25) + (t.product_size_grams + 'g').padStart(5) +
      '  n=' + String(t.sample_size).padStart(2) + '  Day ' + t.email_send_day)
  }

  console.log('\nAt sample >= 10 but < 15 (would be added with threshold 10):')
  for (const t of (timing || []).filter(t => t.sample_size >= 10 && t.sample_size < 15)) {
    console.log('  ' + (t.product_type || '').padEnd(25) + (t.product_size_grams + 'g').padStart(5) +
      '  n=' + String(t.sample_size).padStart(2) + '  Day ' + t.email_send_day)
  }
}

main().catch(console.error)
