/**
 * Create API Usage Table in Master Hub Supabase
 * Uses direct REST API to execute SQL
 */

const https = require('https');

// Master Hub Supabase credentials
const PROJECT_REF = 'qcvfxxsnqvdfmpbcgdni';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8';

// SQL to execute
const SQL = `
-- Create table
CREATE TABLE IF NOT EXISTS api_usage_daily (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service TEXT NOT NULL,
  usage_date DATE NOT NULL,
  call_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(service, usage_date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_api_usage_date ON api_usage_daily(usage_date);
CREATE INDEX IF NOT EXISTS idx_api_usage_service ON api_usage_daily(service);

-- Create increment function
CREATE OR REPLACE FUNCTION increment_api_usage(
  p_service TEXT,
  p_date DATE,
  p_calls INTEGER,
  p_errors INTEGER DEFAULT 0
) RETURNS void AS $$
BEGIN
  INSERT INTO api_usage_daily (service, usage_date, call_count, error_count)
  VALUES (p_service, p_date, p_calls, p_errors)
  ON CONFLICT (service, usage_date)
  DO UPDATE SET
    call_count = api_usage_daily.call_count + p_calls,
    error_count = api_usage_daily.error_count + p_errors,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
`;

async function executeSQL() {
  console.log('Creating api_usage_daily table in Master Hub Supabase...\n');

  const postData = JSON.stringify({ query: SQL });

  const options = {
    hostname: `${PROJECT_REF}.supabase.co`,
    port: 443,
    path: '/rest/v1/rpc/exec_sql',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Prefer': 'return=representation'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('SQL executed successfully!');
          resolve(data);
        } else {
          console.log('RPC method not available. Trying alternative...');
          // RPC doesn't exist, try alternative approach
          createTableAlternative().then(resolve).catch(reject);
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function createTableAlternative() {
  // Use the Supabase client to do upsert which will work if table exists
  // If table doesn't exist, we'll need manual SQL execution via dashboard
  const { createClient } = require('@supabase/supabase-js');

  const supabase = createClient(
    `https://${PROJECT_REF}.supabase.co`,
    SERVICE_KEY
  );

  console.log('\nAttempting table creation via REST API...');

  // Try inserting a test record - this will tell us if the table exists
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('api_usage_daily')
    .upsert({
      service: 'system_test',
      usage_date: today,
      call_count: 0,
      error_count: 0
    }, { onConflict: 'service,usage_date' })
    .select();

  if (error) {
    if (error.code === '42P01') {
      console.log('\n========================================');
      console.log('TABLE DOES NOT EXIST');
      console.log('========================================');
      console.log('\nPlease create the table manually:');
      console.log('1. Go to: https://supabase.com/dashboard/project/qcvfxxsnqvdfmpbcgdni/sql/new');
      console.log('2. Paste the contents of: infra/supabase/migrations/20251130_api_usage.sql');
      console.log('3. Click "Run"');
      console.log('\nSQL to execute:\n');
      console.log(SQL);
      return;
    }
    throw error;
  }

  console.log('Table exists! Test record created:', data);

  // Clean up test record
  await supabase
    .from('api_usage_daily')
    .delete()
    .eq('service', 'system_test');

  console.log('\nTable verified and ready for use!');
}

executeSQL().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
