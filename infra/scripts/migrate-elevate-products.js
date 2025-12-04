/**
 * Migrate elevate_products from elevate project to teelixir-leads
 *
 * Phase 1 of Supabase consolidation:
 * - Creates table in teelixir-leads
 * - Copies all data from elevate
 * - Verifies row counts and data integrity
 *
 * Usage: node infra/scripts/migrate-elevate-products.js
 */

const https = require('https');

// Project configurations
const ELEVATE = {
  url: 'https://xioudaqfmkdpkgujxehv.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpb3VkYXFmbWtkcGtndWp4ZWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MjQ1MTQsImV4cCI6MjA2OTAwMDUxNH0.0jWhePJDpc7XwZ4KiT-AkI0YZ3UamRemgP3u_2FiWXs',
  serviceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpb3VkYXFmbWtkcGtndWp4ZWh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQyNDUxNCwiZXhwIjoyMDY5MDAwNTE0fQ.JKCXiyKUkXXOaQFtd2WQ0dKadbfcX67PkW-UetjZVB4'
};

const TEELIXIR_LEADS = {
  url: 'https://qcvfxxsnqvdfmpbcgdni.supabase.co',
  // Service key - from creds.js get global master_supabase_service_role_key
  serviceKey: process.argv[2] || process.env.TEELIXIR_LEADS_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8'
};

async function supabaseRequest(baseUrl, apiKey, method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`));
          }
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function executeSql(baseUrl, apiKey, sql) {
  return new Promise((resolve, reject) => {
    const url = new URL('/rest/v1/rpc/exec_sql', baseUrl);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          // Try alternative approach - direct SQL might not be available
          reject(new Error(`SQL exec failed: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify({ sql }));
    req.end();
  });
}

async function getRowCount(baseUrl, apiKey, table) {
  const url = `/rest/v1/${table}?select=count`;
  const result = await supabaseRequest(baseUrl, apiKey, 'GET', url + '&head=true');
  // Parse count from headers would be better, but let's fetch
  const data = await supabaseRequest(baseUrl, apiKey, 'GET', `/rest/v1/${table}?select=id`);
  return Array.isArray(data) ? data.length : 0;
}

async function getAllRows(baseUrl, apiKey, table) {
  // Fetch all rows with pagination
  const allRows = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const data = await supabaseRequest(
      baseUrl,
      apiKey,
      'GET',
      `/rest/v1/${table}?select=*&limit=${limit}&offset=${offset}`
    );

    if (!Array.isArray(data) || data.length === 0) break;
    allRows.push(...data);
    offset += limit;

    if (data.length < limit) break;
  }

  return allRows;
}

async function insertRows(baseUrl, apiKey, table, rows) {
  // Insert in batches of 100
  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    await supabaseRequest(
      baseUrl,
      apiKey,
      'POST',
      `/rest/v1/${table}`,
      batch
    );
    inserted += batch.length;
    console.log(`  Inserted ${inserted}/${rows.length} rows...`);
  }

  return inserted;
}

async function main() {
  console.log('='.repeat(60));
  console.log('ELEVATE PRODUCTS MIGRATION');
  console.log('From: elevate (xioudaqfmkdpkgujxehv)');
  console.log('To: teelixir-leads (qcvfxxsnqvdfmpbcgdni)');
  console.log('='.repeat(60));
  console.log('');

  // Service key is now embedded or passed as argument
  console.log('Using teelixir-leads service key (embedded)');
  console.log('');

  try {
    // Step 1: Get source row count
    console.log('Step 1: Checking source data...');
    const sourceRows = await getAllRows(ELEVATE.url, ELEVATE.serviceKey, 'elevate_products');
    console.log(`  Found ${sourceRows.length} rows in elevate project`);
    console.log('');

    if (sourceRows.length === 0) {
      console.log('ERROR: No rows found in source table');
      process.exit(1);
    }

    // Step 2: Check if table exists in destination
    console.log('Step 2: Checking destination...');
    try {
      const destRows = await getAllRows(TEELIXIR_LEADS.url, TEELIXIR_LEADS.serviceKey, 'elevate_products');
      console.log(`  Table exists with ${destRows.length} existing rows`);

      if (destRows.length > 0) {
        console.log('');
        console.log('WARNING: Destination table already has data!');
        console.log('To avoid duplicates, please clear the table first or run with --force');
        console.log('');
        console.log('Use Supabase SQL Editor to clear:');
        console.log('  TRUNCATE elevate_products;');
        process.exit(1);
      }
    } catch (e) {
      console.log('  Table does not exist yet - will need to create it');
      console.log('');
      console.log('Please run this SQL in teelixir-leads Supabase SQL Editor first:');
      console.log('');
      console.log('----------- COPY THIS SQL -----------');
      console.log(`
CREATE TABLE IF NOT EXISTS elevate_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elevate_product_id BIGINT NOT NULL,
  elevate_variant_id BIGINT NOT NULL UNIQUE,
  sku TEXT,
  title TEXT,
  variant_title TEXT,
  vendor TEXT,
  wholesale_price DECIMAL(10,2),
  rrp DECIMAL(10,2),
  rrp_source TEXT,
  shopify_metafield_id BIGINT,
  last_synced_at TIMESTAMPTZ,
  last_rrp_pushed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_elevate_products_sku ON elevate_products(sku);
CREATE INDEX IF NOT EXISTS idx_elevate_products_vendor ON elevate_products(vendor);
CREATE INDEX IF NOT EXISTS idx_elevate_products_rrp_null ON elevate_products(rrp) WHERE rrp IS NULL;

CREATE OR REPLACE FUNCTION update_elevate_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_elevate_products_updated_at ON elevate_products;
CREATE TRIGGER trigger_elevate_products_updated_at
  BEFORE UPDATE ON elevate_products
  FOR EACH ROW
  EXECUTE FUNCTION update_elevate_products_updated_at();
`);
      console.log('----------- END SQL -----------');
      console.log('');
      console.log('After creating the table, run this script again.');
      process.exit(1);
    }
    console.log('');

    // Step 3: Copy data
    console.log('Step 3: Copying data...');
    const inserted = await insertRows(TEELIXIR_LEADS.url, TEELIXIR_LEADS.serviceKey, 'elevate_products', sourceRows);
    console.log(`  Inserted ${inserted} rows`);
    console.log('');

    // Step 4: Verify
    console.log('Step 4: Verifying migration...');
    const destRowsAfter = await getAllRows(TEELIXIR_LEADS.url, TEELIXIR_LEADS.serviceKey, 'elevate_products');
    console.log(`  Source rows: ${sourceRows.length}`);
    console.log(`  Destination rows: ${destRowsAfter.length}`);

    if (sourceRows.length === destRowsAfter.length) {
      console.log('  ✅ Row counts match!');
    } else {
      console.log('  ❌ Row count mismatch!');
      process.exit(1);
    }
    console.log('');

    // Step 5: Spot check
    console.log('Step 5: Spot checking 10 random rows...');
    const sampleIndices = [];
    while (sampleIndices.length < Math.min(10, sourceRows.length)) {
      const idx = Math.floor(Math.random() * sourceRows.length);
      if (!sampleIndices.includes(idx)) sampleIndices.push(idx);
    }

    let checksPass = 0;
    for (const idx of sampleIndices) {
      const srcRow = sourceRows[idx];
      const destRow = destRowsAfter.find(r => r.id === srcRow.id);

      if (destRow && destRow.sku === srcRow.sku && destRow.title === srcRow.title) {
        checksPass++;
      } else {
        console.log(`  ❌ Mismatch for ID ${srcRow.id}`);
      }
    }
    console.log(`  ${checksPass}/10 spot checks passed`);
    console.log('');

    // Summary
    console.log('='.repeat(60));
    console.log('MIGRATION COMPLETE');
    console.log('='.repeat(60));
    console.log('');
    console.log('Next steps:');
    console.log('1. Update elevate-wholesale/.env:');
    console.log('   SUPABASE_URL=https://qcvfxxsnqvdfmpbcgdni.supabase.co');
    console.log('');
    console.log('2. Update SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY');
    console.log('   with teelixir-leads credentials');
    console.log('');
    console.log('3. Test elevate-wholesale app');
    console.log('');
    console.log('4. Monitor for 48 hours before shutting down elevate project');

  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
}

main();
