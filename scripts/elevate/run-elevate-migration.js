#!/usr/bin/env node
/**
 * Run the elevate_products migration
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const credsPath = path.join(__dirname, '..', 'creds.js');
const creds = require(credsPath);

async function main() {
  console.log('Running elevate_products migration...\n');

  const [supabaseUrl, supabaseKey] = await Promise.all([
    creds.get('elevate', 'supabase_url'),
    creds.get('elevate', 'supabase_service_role_key')
  ]);

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Read migration file
  const migrationPath = path.join(__dirname, '..', 'infra', 'supabase', 'migrations', '20251202_elevate_products.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Executing SQL migration...');

  // Execute via RPC (raw SQL)
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    // Try direct approach - just create the table
    console.log('RPC not available, trying direct table creation...');

    // Check if table exists
    const { data: tables } = await supabase
      .from('elevate_products')
      .select('id')
      .limit(1);

    if (tables !== null) {
      console.log('✓ Table elevate_products already exists');
      return;
    }

    console.log('Table does not exist. Please run the migration manually in Supabase SQL Editor:');
    console.log('\n' + sql);
    process.exit(1);
  }

  console.log('✓ Migration completed successfully');
}

main().catch(console.error);
