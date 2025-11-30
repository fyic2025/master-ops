/**
 * Run SQL Migration via PostgreSQL direct connection
 * Usage: node run-migration.js <migration-file>
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), override: true });

// Use BOO connection - try pooler with correct username format
const directConnection = process.env.BOO_SUPABASE_CONNECTION_STRING;
// Pooler requires username format: postgres.PROJECT_REF
const connectionString = directConnection
  ?.replace('postgres:', 'postgres.usibnysqelovfuctmkqw:')
  ?.replace('db.usibnysqelovfuctmkqw.supabase.co:5432', 'aws-0-ap-southeast-2.pooler.supabase.com:6543')
  || directConnection;

if (!connectionString) {
  console.error('Missing BOO_SUPABASE_CONNECTION_STRING in .env');
  process.exit(1);
}

async function runMigration(filePath) {
  console.log('='.repeat(60));
  console.log('RUNNING MIGRATION via PostgreSQL');
  console.log('='.repeat(60));
  console.log(`File: ${filePath}`);
  console.log('');

  const fullPath = path.resolve(__dirname, filePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`File not found: ${fullPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(fullPath, 'utf8');
  console.log(`SQL length: ${sql.length} characters`);
  console.log('');

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL');
    console.log('');

    // Run the entire migration as a single transaction
    console.log('Executing migration...');
    await client.query(sql);
    console.log('✅ Migration completed successfully!');

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    if (err.detail) console.error('Detail:', err.detail);
    if (err.hint) console.error('Hint:', err.hint);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// CLI
const migrationFile = process.argv[2] || 'migrations/20251130_gsc_issues_tracking.sql';
runMigration(migrationFile);
