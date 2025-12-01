/**
 * Deploy SQL Schema to Supabase
 *
 * Usage: node deploy-schema.js <schema-file>
 */

const creds = require('../creds');
const https = require('https');
const fs = require('fs');
const path = require('path');

async function execSQL(sql, key) {
  const url = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co';

  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });
    const options = {
      hostname: 'qcvfxxsnqvdfmpbcgdni.supabase.co',
      port: 443,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': 'Bearer ' + key
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, body });
        } else {
          reject({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  const schemaFile = process.argv[2];

  if (!schemaFile) {
    console.log('Usage: node deploy-schema.js <schema-file>');
    console.log('Example: node deploy-schema.js ../infra/supabase/schema-business-views.sql');
    process.exit(1);
  }

  const fullPath = path.resolve(__dirname, schemaFile);

  if (!fs.existsSync(fullPath)) {
    console.error('File not found:', fullPath);
    process.exit(1);
  }

  console.log('Loading credentials...');
  const key = await creds.get('global', 'master_supabase_service_role_key');

  console.log('Reading schema file:', fullPath);
  const sql = fs.readFileSync(fullPath, 'utf8');

  // Split by statement (simple approach - may need adjustment for complex schemas)
  const statements = sql
    .split(/;\s*$/m)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} statements to execute\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 60).replace(/\n/g, ' ');
    process.stdout.write(`[${i + 1}/${statements.length}] ${preview}... `);

    try {
      const result = await execSQL(stmt, key);
      success++;
      console.log('✓');
    } catch (err) {
      failed++;
      console.log('✗');
      console.log('  Error:', typeof err.body === 'string' ? err.body.substring(0, 200) : err);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('DEPLOYMENT COMPLETE');
  console.log('='.repeat(50));
  console.log(`Success: ${success}`);
  console.log(`Failed: ${failed}`);
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
