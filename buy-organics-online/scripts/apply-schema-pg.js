#!/usr/bin/env node

/**
 * APPLY SUPABASE SCHEMA using node-postgres
 *
 * Connects directly to Supabase PostgreSQL and executes the schema
 */

require('dotenv').config({ path: '../MASTER-CREDENTIALS-COMPLETE.env' });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function applySchema() {
  console.log('========================================');
  console.log('SUPABASE SCHEMA APPLICATION');
  console.log('========================================\n');

  // Connection string from .env
  const connectionString = process.env.BOO_SUPABASE_CONNECTION_STRING;

  if (!connectionString) {
    console.error('❌ Missing BOO_SUPABASE_CONNECTION_STRING in environment');
    process.exit(1);
  }

  console.log('Connecting to Supabase PostgreSQL...');
  console.log(`Connection: ${connectionString.replace(/:[^:@]+@/, ':****@')}\n`);

  // Create PostgreSQL client
  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Connect
    await client.connect();
    console.log('✅ Connected successfully\n');

    // Read schema file
    const schemaPath = path.join(__dirname, 'supabase-schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log(`Loaded schema: ${schemaPath}`);
    console.log(`Schema size: ${(schemaSql.length / 1024).toFixed(2)} KB\n`);

    // Execute the entire schema as one transaction
    console.log('Executing schema (this may take a minute)...\n');

    const result = await client.query(schemaSql);

    console.log('\n✅ Schema applied successfully!\n');

    // Verify by checking schema_version table
    console.log('Verifying schema...');
    const versionResult = await client.query('SELECT * FROM schema_version ORDER BY applied_at DESC LIMIT 1');

    if (versionResult.rows.length > 0) {
      console.log('✅ Schema version verified:');
      console.log(`   Version: ${versionResult.rows[0].version}`);
      console.log(`   Description: ${versionResult.rows[0].description}`);
      console.log(`   Applied at: ${versionResult.rows[0].applied_at}\n`);
    }

    // Count tables
    const tablesResult = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    `);

    console.log(`📊 Tables created: ${tablesResult.rows[0].count}`);

    // Count views
    const viewsResult = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.views
      WHERE table_schema = 'public'
    `);

    console.log(`📊 Views created: ${viewsResult.rows[0].count}\n`);

    // List all tables
    const tableListResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log('Tables:');
    tableListResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    console.log('\n========================================');
    console.log('NEXT STEPS');
    console.log('========================================\n');
    console.log('1. ✅ Schema applied and verified');
    console.log('2. ⏭️  Load BigCommerce products');
    console.log('3. ⏭️  Load supplier feeds');
    console.log('4. ⏭️  Run product matching');
    console.log('5. ⏭️  Generate match reports\n');

  } catch (error) {
    console.error('\n❌ Error applying schema:');
    console.error(error.message);
    console.error('\nDetails:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run
applySchema().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
