/**
 * Apply BC Orders Schema to BOO Supabase
 * Run: node buy-organics-online/apply-bc-orders-schema.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const BOO_SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co';
const BOO_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

function httpsRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, data }));
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function checkTableExists() {
  const url = new URL(`${BOO_SUPABASE_URL}/rest/v1/bc_orders?select=id&limit=1`);

  const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'GET',
    headers: {
      'apikey': BOO_SUPABASE_KEY,
      'Authorization': `Bearer ${BOO_SUPABASE_KEY}`,
    },
  };

  const response = await httpsRequest(options);
  return response.statusCode === 200;
}

async function main() {
  console.log('Checking bc_orders table in BOO Supabase...\n');

  const exists = await checkTableExists();

  if (exists) {
    console.log('✅ bc_orders table already exists!\n');
    return;
  }

  console.log('❌ bc_orders table does not exist.\n');
  console.log('To create it, run this SQL in Supabase SQL Editor:');
  console.log('https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/sql/new\n');

  // Read and print the SQL file
  const sqlPath = path.join(__dirname, '../infra/supabase/migrations/20251130_bc_orders_schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('========== SQL TO RUN ==========\n');
  console.log(sql);
  console.log('\n================================\n');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
