#!/usr/bin/env node

/**
 * ADD STOCK COLUMNS TO PRODUCT_SUPPLIER_LINKS
 *
 * Adds supplier_stock_level, supplier_availability, and last_stock_sync columns
 */

require('dotenv').config({ path: '../MASTER-CREDENTIALS-COMPLETE.env' });
const { Client } = require('pg');

async function addColumns() {
  console.log('========================================');
  console.log('ADD STOCK COLUMNS TO LINKS TABLE');
  console.log('========================================\n');

  const connectionString = process.env.BOO_SUPABASE_CONNECTION_STRING;

  if (!connectionString) {
    console.error('Missing BOO_SUPABASE_CONNECTION_STRING');
    process.exit(1);
  }

  console.log('Connecting to database...');

  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected\n');

    // Add columns
    console.log('Adding columns...');

    await client.query(`
      ALTER TABLE product_supplier_links
      ADD COLUMN IF NOT EXISTS supplier_stock_level INTEGER DEFAULT 0
    `);
    console.log('  + supplier_stock_level');

    await client.query(`
      ALTER TABLE product_supplier_links
      ADD COLUMN IF NOT EXISTS supplier_availability VARCHAR(50) DEFAULT 'unknown'
    `);
    console.log('  + supplier_availability');

    await client.query(`
      ALTER TABLE product_supplier_links
      ADD COLUMN IF NOT EXISTS last_stock_sync TIMESTAMPTZ
    `);
    console.log('  + last_stock_sync');

    // Verify
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'product_supplier_links'
      ORDER BY ordinal_position
    `);

    console.log('\nAll columns:');
    result.rows.forEach(r => {
      console.log(`  ${r.column_name.padEnd(25)} ${r.data_type}`);
    });

    console.log('\nColumns added successfully!');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

addColumns();
