/**
 * Apply Google Ads Schema via Supabase REST API
 *
 * This approach works around direct DB connection issues by using
 * the Supabase REST API with service role key.
 *
 * Usage: node apply-schema-via-rpc.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_HOST = 'usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SUPABASE_HOST,
      port: 443,
      path,
      method,
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`API Error (${res.statusCode}): ${data}`));
        } else {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function checkTableExists(tableName) {
  try {
    // Try to select from the table - if it doesn't exist, we'll get an error
    await makeRequest('GET', `/rest/v1/${tableName}?limit=0`);
    return true;
  } catch {
    return false;
  }
}

async function createTableViaInsert(tableName, columns) {
  // This won't work for creating tables, just checking
  return false;
}

async function main() {
  console.log('Checking Supabase connection...');

  // First, verify connection works
  try {
    const health = await makeRequest('GET', '/rest/v1/');
    console.log('REST API connected successfully\n');
  } catch (err) {
    console.error('Failed to connect to Supabase REST API:', err.message);
    process.exit(1);
  }

  // Check if tables already exist
  console.log('Checking existing tables...');
  const tablesToCheck = [
    'google_ads_accounts',
    'google_ads_campaign_metrics',
    'google_ads_keyword_metrics',
    'google_ads_search_terms',
    'google_ads_opportunities'
  ];

  let allExist = true;
  for (const table of tablesToCheck) {
    const exists = await checkTableExists(table);
    console.log(`  ${table}: ${exists ? '✓ exists' : '✗ missing'}`);
    if (!exists) allExist = false;
  }

  if (allExist) {
    console.log('\n✓ All required tables exist!\n');

    // Try to get the accounts
    try {
      const accounts = await makeRequest('GET', '/rest/v1/google_ads_accounts?select=business,display_name,customer_id');
      console.log('Current accounts:');
      accounts.forEach(a => {
        const status = a.customer_id ? '✓' : '✗ needs customer_id';
        console.log(`  ${a.business}: ${a.display_name} ${status}`);
      });

      // Update BOO customer ID if missing
      const boo = accounts.find(a => a.business === 'boo');
      if (boo && !boo.customer_id) {
        console.log('\nUpdating BOO customer ID...');
        await makeRequest('PATCH', '/rest/v1/google_ads_accounts?business=eq.boo', {
          customer_id: '5275169559',
          merchant_center_id: '10043678'
        });
        console.log('✓ BOO customer ID updated!');
      }
    } catch (err) {
      console.log('Could not fetch accounts:', err.message);
    }

    return;
  }

  // Tables don't exist - provide instructions
  console.log('\n' + '='.repeat(60));
  console.log('SCHEMA NOT APPLIED YET');
  console.log('='.repeat(60));
  console.log(`
The Google Ads schema needs to be applied to Supabase.

Since direct database connection is not working from this machine,
please apply the schema manually:

1. Go to: https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/sql/new

2. Copy and paste the contents of:
   infra/supabase/migrations/20251126_google_ads_schema.sql

3. Click "Run" to execute the SQL

4. Run this script again to verify and update customer IDs

The schema file is ${fs.statSync(path.join(__dirname, 'migrations', '20251126_google_ads_schema.sql')).size} bytes.
`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
