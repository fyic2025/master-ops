/**
 * Apply Google Ads Schema to BOO Supabase
 *
 * Usage: node apply-schema.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { getCredential } = require('../../shared/libs/load-vault-credentials');

async function applySchema() {
  console.log('Loading credentials from vault...');

  const dbPassword = await getCredential('boo', 'supabase_db_password');
  const supabaseUrl = await getCredential('boo', 'supabase_url');

  // Extract project ref from URL (https://xxxxx.supabase.co -> xxxxx)
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

  if (!projectRef) {
    throw new Error('Could not extract project ref from Supabase URL');
  }

  console.log(`Connecting to project: ${projectRef}`);

  // ap-southeast-1 found the tenant, focus on that region
  const region = 'aws-0-ap-southeast-1';

  // Try different password formats
  const passwordFormats = [
    dbPassword,  // Raw
    encodeURIComponent(dbPassword),  // URL encoded
    dbPassword.replace(/[^a-zA-Z0-9]/g, c => '%' + c.charCodeAt(0).toString(16)),  // Manual encode
  ];

  const connectionStrings = [];
  const descriptions = [];

  for (const pwd of passwordFormats) {
    // Session mode (port 5432)
    connectionStrings.push(`postgresql://postgres.${projectRef}:${pwd}@${region}.pooler.supabase.com:5432/postgres`);
    descriptions.push('session mode');
    // Transaction mode (port 6543)
    connectionStrings.push(`postgresql://postgres.${projectRef}:${pwd}@${region}.pooler.supabase.com:6543/postgres`);
    descriptions.push('transaction mode');
  }

  // Also try without the pooler - direct connection
  connectionStrings.push(`postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`);
  descriptions.push('direct connection');

  const regions = Array(connectionStrings.length).fill(region);

  let client;
  let connected = false;

  for (let i = 0; i < connectionStrings.length; i++) {
    const connStr = connectionStrings[i];
    const desc = descriptions[i];
    console.log(`Trying ${desc} (attempt ${i + 1}/${connectionStrings.length})...`);

    client = new Client({
      connectionString: connStr,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000
    });

    try {
      await client.connect();
      connected = true;
      console.log(`Connected via ${desc}!`);
      break;
    } catch (err) {
      console.log(`  Failed: ${err.message}`);
      try { await client.end(); } catch {}
    }
  }

  if (!connected) {
    throw new Error('Could not connect with any connection string');
  }

  try {
    // Read the schema file
    const schemaPath = path.join(__dirname, 'migrations', '20251126_google_ads_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('Applying schema...');
    await client.query(schema);

    console.log('Schema applied successfully!');

    // Verify tables were created
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE 'google%'
      ORDER BY table_name;
    `);

    console.log('\nCreated tables:');
    result.rows.forEach(row => console.log(`  - ${row.table_name}`));

    // Verify views
    const views = await client.query(`
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'public'
        AND table_name LIKE 'v_google%'
      ORDER BY table_name;
    `);

    console.log('\nCreated views:');
    views.rows.forEach(row => console.log(`  - ${row.table_name}`));

    // Check default accounts
    const accounts = await client.query('SELECT business, display_name FROM google_ads_accounts');
    console.log('\nDefault accounts:');
    accounts.rows.forEach(row => console.log(`  - ${row.business}: ${row.display_name}`));

  } catch (err) {
    console.error('Error applying schema:', err.message);
    throw err;
  } finally {
    await client.end();
    console.log('\nConnection closed');
  }
}

applySchema().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
