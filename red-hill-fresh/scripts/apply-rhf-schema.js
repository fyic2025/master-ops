#!/usr/bin/env node

/**
 * APPLY RED HILL FRESH SCHEMA to BOO Supabase
 */

const dotenvPath = require('path').join(__dirname, '../../.env');
require('dotenv').config({ path: dotenvPath });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function applySchema() {
  console.log('========================================');
  console.log('RED HILL FRESH SCHEMA DEPLOYMENT');
  console.log('========================================\n');

  // BOO Supabase project ref
  const projectRef = 'usibnysqelovfuctmkqw';
  const dbPassword = 'Welcome1A20301qaz';

  // Try different regions and connection formats
  const regions = ['aws-0-ap-southeast-1', 'aws-0-ap-southeast-2'];
  const connectionStrings = [];

  for (const region of regions) {
    // Session mode (port 5432)
    connectionStrings.push({
      str: `postgresql://postgres.${projectRef}:${dbPassword}@${region}.pooler.supabase.com:5432/postgres`,
      desc: `session mode (${region})`
    });
    // Transaction mode (port 6543)
    connectionStrings.push({
      str: `postgresql://postgres.${projectRef}:${dbPassword}@${region}.pooler.supabase.com:6543/postgres`,
      desc: `transaction mode (${region})`
    });
  }

  let client;
  let connected = false;

  for (let i = 0; i < connectionStrings.length; i++) {
    const { str, desc } = connectionStrings[i];
    console.log(`Trying ${desc} (attempt ${i + 1}/${connectionStrings.length})...`);

    client = new Client({
      connectionString: str,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000
    });

    try {
      await client.connect();
      connected = true;
      console.log(`✅ Connected via ${desc}!\n`);
      break;
    } catch (err) {
      console.log(`   Failed: ${err.message}`);
      try { await client.end(); } catch {}
    }
  }

  if (!connected) {
    console.error('❌ Could not connect with any connection string');
    process.exit(1);
  }

  try {

    // Check if pg_trgm extension exists
    console.log('Checking prerequisites...');
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
      console.log('✅ pg_trgm extension enabled');
    } catch (e) {
      console.log('⚠️  pg_trgm extension may already exist');
    }

    // Check if update_updated_at_column function exists
    const funcCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
      ) as exists
    `);

    if (funcCheck.rows[0].exists) {
      console.log('✅ update_updated_at_column function exists');
    } else {
      console.log('Creating update_updated_at_column function...');
      await client.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);
      console.log('✅ update_updated_at_column function created');
    }

    // Check if schema_version table exists
    const versionCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables WHERE table_name = 'schema_version'
      ) as exists
    `);

    if (!versionCheck.rows[0].exists) {
      console.log('Creating schema_version table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_version (
          id SERIAL PRIMARY KEY,
          version VARCHAR(50) NOT NULL,
          description TEXT,
          applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      console.log('✅ schema_version table created');
    }

    // Check if RHF schema already applied
    const rhfCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables WHERE table_name = 'wc_products'
      ) as exists
    `);

    if (rhfCheck.rows[0].exists) {
      console.log('\n⚠️  Red Hill Fresh schema already exists!');
      console.log('Tables wc_products found. Skipping migration.\n');

      // Count existing records
      const productCount = await client.query("SELECT COUNT(*) FROM wc_products WHERE business = 'rhf'");
      const orderCount = await client.query("SELECT COUNT(*) FROM wc_orders WHERE business = 'rhf'");
      console.log(`Current data: ${productCount.rows[0].count} products, ${orderCount.rows[0].count} orders`);
      return;
    }

    // Read and apply schema file
    const schemaPath = path.join(__dirname, '../../buy-organics-online/supabase-migrations/020_red_hill_fresh_schema.sql');
    console.log(`\nLoading schema: ${schemaPath}`);

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log(`Schema size: ${(schemaSql.length / 1024).toFixed(2)} KB\n`);

    console.log('Executing schema (this may take a minute)...\n');
    await client.query(schemaSql);

    console.log('✅ Red Hill Fresh schema applied successfully!\n');

    // Verify tables
    const tableCheck = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE 'wc_%' OR table_name LIKE 'rhf_%'
      ORDER BY table_name
    `);

    console.log('Tables created:');
    tableCheck.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    console.log('\n========================================');
    console.log('NEXT STEPS');
    console.log('========================================');
    console.log('1. ✅ Schema deployed');
    console.log('2. Add WooCommerce credentials to .env:');
    console.log('   RHF_WC_URL=https://redhillfresh.com.au');
    console.log('   RHF_WC_CONSUMER_KEY=ck_...');
    console.log('   RHF_WC_CONSUMER_SECRET=cs_...');
    console.log('3. Run: npx tsx red-hill-fresh/scripts/sync-woocommerce.ts --dry-run');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ Error applying schema:');
    console.error(error.message);

    if (error.message.includes('already exists')) {
      console.log('\n⚠️  Some objects may already exist. This is usually fine.');
    }

    process.exit(1);
  } finally {
    await client.end();
  }
}

applySchema().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
