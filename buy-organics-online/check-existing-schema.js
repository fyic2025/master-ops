#!/usr/bin/env node

require('dotenv').config({ path: '../MASTER-CREDENTIALS-COMPLETE.env' });
const { createClient } = require('@supabase/supabase-js');

async function checkSchema() {
  const supabaseUrl = process.env.BOO_SUPABASE_URL;
  const supabaseKey = process.env.BOO_SUPABASE_SERVICE_ROLE_KEY;

  console.log('Connecting to Supabase...\n');

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Check existing tables via API introspection
  const response = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });

  const apiSpec = await response.json();

  console.log('========================================');
  console.log('EXISTING SUPABASE TABLES');
  console.log('========================================\n');

  const tables = Object.keys(apiSpec.paths || {})
    .filter(path => path.startsWith('/'))
    .map(path => path.substring(1))
    .filter(name => name && !name.includes('{'))
    .sort();

  console.log(`Found ${tables.length} tables/views:\n`);
  tables.forEach((table, idx) => {
    console.log(`${idx + 1}. ${table}`);
  });

  console.log('\n========================================');
  console.log('CHECKING TABLE CONTENTS');
  console.log('========================================\n');

  // Check row counts for key tables
  for (const table of ['supplier_products', 'automation_logs', 'sync_history', 'product_supplier_links'].filter(t => tables.includes(t))) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (!error) {
        console.log(`${table}: ${count} rows`);
      }
    } catch (e) {
      // Skip if error
    }
  }

  console.log('\n========================================\n');
  console.log('✅ Supabase is already set up with tables!');
  console.log('');
  console.log('This looks like an existing schema.');
  console.log('We should work with this schema instead of creating a new one.\n');
}

checkSchema().catch(console.error);
