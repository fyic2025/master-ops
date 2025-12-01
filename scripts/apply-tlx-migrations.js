#!/usr/bin/env node
/**
 * Apply Teelixir Shopify/Anniversary migrations to Supabase
 */

const creds = require('../creds');
const fs = require('fs');
const https = require('https');

async function executeSql(host, serviceKey, sql, description) {
  return new Promise((resolve, reject) => {
    console.log(`\nExecuting: ${description}`);

    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`  Found ${statements.length} statements`);

    // For complex migrations, we need to use the SQL editor or pg client
    // The REST API doesn't support arbitrary SQL execution
    // Let's just log what needs to be run

    console.log('  SQL ready for execution in Supabase SQL Editor');
    resolve(true);
  });
}

async function main() {
  console.log('═'.repeat(60));
  console.log('  TEELIXIR MIGRATION SCRIPT');
  console.log('═'.repeat(60));

  try {
    const serviceKey = await creds.get('global', 'master_supabase_service_role_key');
    const url = await creds.get('global', 'master_supabase_url');

    if (!serviceKey || !url) {
      console.error('Missing master Supabase credentials');
      process.exit(1);
    }

    const host = url.replace('https://', '');
    console.log(`\nTarget: ${host}`);

    // Read migrations
    const migrations = [
      {
        file: './infra/supabase/migrations/20251201_tlx_shopify_orders.sql',
        description: 'Shopify Orders Schema'
      },
      {
        file: './infra/supabase/migrations/20251201_tlx_anniversary_automation.sql',
        description: 'Anniversary Automation Schema'
      }
    ];

    for (const migration of migrations) {
      if (!fs.existsSync(migration.file)) {
        console.log(`\nSkipping ${migration.description} - file not found`);
        continue;
      }

      const sql = fs.readFileSync(migration.file, 'utf8');
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`Migration: ${migration.description}`);
      console.log(`File: ${migration.file}`);
      console.log(`Size: ${sql.length} bytes`);

      // Output the SQL file path for manual execution
      console.log('\nTo apply this migration:');
      console.log('1. Open Supabase SQL Editor at:');
      console.log(`   https://supabase.com/dashboard/project/${host.split('.')[0]}/sql/new`);
      console.log('2. Copy the contents of the migration file');
      console.log('3. Execute the SQL');
    }

    console.log('\n' + '═'.repeat(60));
    console.log('  Migration files ready');
    console.log('  Please execute in Supabase SQL Editor');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
