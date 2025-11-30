/**
 * Apply SQL Migration to Supabase
 * Usage: node apply-migration.js <migration-file>
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), override: true });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function applyMigration(filePath) {
  console.log('='.repeat(60));
  console.log('APPLYING MIGRATION');
  console.log('='.repeat(60));
  console.log(`File: ${filePath}`);
  console.log(`Target: ${SUPABASE_URL}`);
  console.log('');

  // Read SQL file
  const fullPath = path.resolve(__dirname, filePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`File not found: ${fullPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(fullPath, 'utf8');
  console.log(`SQL length: ${sql.length} characters`);

  // Split into statements (simple approach - split on semicolons not in strings)
  // For complex migrations, each statement should be run separately
  const statements = sql
    .split(/;\s*$/m)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Statements to execute: ${statements.length}`);
  console.log('');

  let success = 0;
  let failed = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 80).replace(/\n/g, ' ');

    console.log(`[${i + 1}/${statements.length}] ${preview}...`);

    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: stmt + ';' });

      if (error) {
        // Try direct query for DDL statements
        const { error: directError } = await supabase.from('_exec').select('*').limit(0);

        // For Supabase, we need to use the SQL editor or pg connection
        // The REST API doesn't support DDL directly
        console.log(`  ⚠️  REST API doesn't support DDL. Use SQL Editor.`);
        failed++;
      } else {
        console.log(`  ✅ Success`);
        success++;
      }
    } catch (err) {
      console.log(`  ❌ ${err.message}`);
      failed++;
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Success: ${success}`);
  console.log(`Failed: ${failed}`);
  console.log('');
  console.log('NOTE: DDL statements (CREATE TABLE, etc.) must be run via:');
  console.log('  1. Supabase Dashboard SQL Editor');
  console.log('  2. Direct PostgreSQL connection (psql)');
  console.log('  3. Supabase CLI migrations');
}

// CLI
const migrationFile = process.argv[2] || 'migrations/20251130_gsc_issues_tracking.sql';
applyMigration(migrationFile);
