#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const creds = require(path.join(__dirname, '..', 'creds.js'));

async function main() {
  const [url, key] = await Promise.all([
    creds.get('elevate', 'supabase_url'),
    creds.get('elevate', 'supabase_service_role_key')
  ]);
  const supabase = createClient(url, key);

  // Get one row to see columns
  const { data, error } = await supabase
    .from('elevate_products')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error.message);
  } else if (data && data[0]) {
    console.log('Columns:', Object.keys(data[0]).join(', '));
    console.log('\nSample row:');
    Object.entries(data[0]).forEach(([k, v]) => {
      console.log(`  ${k}: ${v}`);
    });
  }
}
main().catch(console.error);
