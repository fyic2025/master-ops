/**
 * Run SQL Migration via Supabase RPC exec_sql
 * Usage: node run-migration-rpc.js <migration-file>
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), override: true });

const SUPABASE_URL = process.env.BOO_SUPABASE_URL;
const SUPABASE_KEY = process.env.BOO_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing BOO_SUPABASE_URL or BOO_SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Split SQL into individual statements
function splitStatements(sql) {
  const statements = [];
  let current = '';
  let inFunction = false;
  let dollarQuote = null;

  const lines = sql.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments
    if (trimmed.startsWith('--')) continue;

    // Track dollar-quoted strings (functions)
    if (!dollarQuote) {
      const match = line.match(/\$\$|\$[a-zA-Z_]+\$/);
      if (match) {
        dollarQuote = match[0];
        inFunction = true;
      }
    } else if (line.includes(dollarQuote)) {
      // Check if it's the closing quote
      const parts = line.split(dollarQuote);
      if (parts.length >= 2) {
        // Found closing quote
        dollarQuote = null;
        inFunction = false;
      }
    }

    current += line + '\n';

    // If not in a function and line ends with semicolon, it's end of statement
    if (!inFunction && trimmed.endsWith(';')) {
      const stmt = current.trim();
      if (stmt.length > 1) {
        statements.push(stmt);
      }
      current = '';
    }
  }

  // Any remaining content
  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements;
}

async function runMigration(filePath) {
  console.log('='.repeat(60));
  console.log('RUNNING MIGRATION via RPC');
  console.log('='.repeat(60));
  console.log(`File: ${filePath}`);
  console.log(`Target: ${SUPABASE_URL}`);
  console.log('');

  const fullPath = path.resolve(__dirname, filePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`File not found: ${fullPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(fullPath, 'utf8');
  const statements = splitStatements(sql);

  console.log(`Total statements: ${statements.length}`);
  console.log('');

  let success = 0;
  let failed = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 60).replace(/\n/g, ' ').trim();

    console.log(`[${i + 1}/${statements.length}] ${preview}...`);

    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: stmt
      });

      if (error) {
        console.log(`  ❌ ${error.message}`);
        failed++;

        // Stop on critical errors
        if (error.message.includes('syntax error')) {
          console.log('\nStopping due to syntax error');
          break;
        }
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
}

// CLI
const migrationFile = process.argv[2] || 'migrations/20251130_gsc_issues_tracking.sql';
runMigration(migrationFile);
