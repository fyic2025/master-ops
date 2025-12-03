#!/usr/bin/env node
/**
 * Apply n8n Backup Schema to Supabase
 * Usage: node scripts/apply-n8n-backup-schema.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_HOST = 'usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

function execSql(sql) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ sql_query: sql });

    const options = {
      hostname: SUPABASE_HOST,
      port: 443,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      rejectUnauthorized: false,
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.success || res.statusCode < 400) {
            resolve(json);
          } else {
            reject(new Error(json.message || json.error || data));
          }
        } catch {
          if (res.statusCode < 400) {
            resolve({ success: true, data });
          } else {
            reject(new Error(data));
          }
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Split SQL into individual statements, handling dollar-quoted functions
function splitStatements(sql) {
  const statements = [];
  let current = '';
  let dollarQuote = null;

  const lines = sql.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip pure comment lines
    if (trimmed.startsWith('--') && !current.trim()) continue;

    // Track dollar-quoted strings (functions)
    if (!dollarQuote) {
      const match = line.match(/\$\$|\$[a-zA-Z_]+\$/);
      if (match) {
        dollarQuote = match[0];
      }
    } else {
      // Check for closing dollar quote
      const idx = line.lastIndexOf(dollarQuote);
      if (idx !== -1 && line.indexOf(dollarQuote) !== idx) {
        // Found a different occurrence - closing quote
        dollarQuote = null;
      } else if (idx !== -1) {
        // Check if there are two occurrences
        const firstIdx = line.indexOf(dollarQuote);
        const lastIdx = line.lastIndexOf(dollarQuote);
        if (firstIdx !== lastIdx) {
          dollarQuote = null;
        }
      }
    }

    current += line + '\n';

    // If not in a dollar quote and line ends with semicolon, it's end of statement
    if (!dollarQuote && trimmed.endsWith(';')) {
      const stmt = current.trim();
      if (stmt.length > 1 && !stmt.match(/^--/)) {
        statements.push(stmt);
      }
      current = '';
    }
  }

  return statements;
}

async function main() {
  console.log('='.repeat(60));
  console.log('APPLYING n8n BACKUP SCHEMA');
  console.log('='.repeat(60));
  console.log(`Target: ${SUPABASE_HOST}`);
  console.log('');

  const migrationPath = path.join(__dirname, '../infra/supabase/migrations/20251202_n8n_backup_system.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  const statements = splitStatements(sql);

  console.log(`Total statements: ${statements.length}`);
  console.log('');

  let success = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 50).replace(/\n/g, ' ').trim();

    process.stdout.write(`[${i + 1}/${statements.length}] ${preview}... `);

    try {
      await execSql(stmt);
      console.log('✅');
      success++;
    } catch (err) {
      console.log(`❌ ${err.message.substring(0, 80)}`);
      failed++;
      errors.push({ statement: i + 1, error: err.message, preview });

      // Continue on "already exists" errors
      if (!err.message.includes('already exists')) {
        // For other errors, log but continue
      }
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Success: ${success}`);
  console.log(`❌ Failed: ${failed}`);

  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach(e => {
      console.log(`  Statement ${e.statement}: ${e.error.substring(0, 100)}`);
    });
  }

  // Verify tables were created
  console.log('\n📋 Verifying tables...');

  const tables = ['n8n_workflows', 'n8n_executions', 'n8n_backup_runs'];
  for (const table of tables) {
    try {
      await execSql(`SELECT COUNT(*) FROM ${table}`);
      console.log(`  ✅ ${table} exists`);
    } catch (err) {
      console.log(`  ❌ ${table} missing: ${err.message}`);
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
