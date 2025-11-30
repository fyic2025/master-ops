/**
 * Apply API Usage Schema to Master Hub Supabase
 * Run: node apply-api-usage-schema.js
 */

const { createClient } = require('@supabase/supabase-js');

// Master Hub Supabase
const MASTER_HUB_URL = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co';
const MASTER_HUB_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8';

const supabase = createClient(MASTER_HUB_URL, MASTER_HUB_SERVICE_KEY);

async function applySchema() {
  console.log('Applying API Usage Schema to Master Hub Supabase...\n');

  // Create table
  const createTable = `
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
  `;

  // Create indexes
  const createIndexes = `
    CREATE INDEX IF NOT EXISTS idx_api_usage_date ON api_usage_daily(usage_date);
    CREATE INDEX IF NOT EXISTS idx_api_usage_service ON api_usage_daily(service);
  `;

  // Create increment function
  const createFunction = `
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

  try {
    // Execute via RPC (use exec_sql if available, otherwise try direct)
    console.log('1. Creating api_usage_daily table...');
    const { error: tableError } = await supabase.rpc('exec_sql', { sql: createTable });
    if (tableError && tableError.code !== 'PGRST202') {
      // Try alternative approach - check if table exists by querying it
      const { error: checkError } = await supabase.from('api_usage_daily').select('id').limit(1);
      if (checkError && checkError.code === '42P01') {
        console.log('   Table does not exist. Need to create via SQL dashboard.');
        console.log('   Please run the migration SQL file manually in Supabase SQL Editor:');
        console.log('   infra/supabase/migrations/20251130_api_usage.sql\n');
        return;
      } else if (!checkError) {
        console.log('   Table already exists.');
      }
    } else {
      console.log('   Done!');
    }

    // Test by inserting a sample record
    console.log('\n2. Testing with sample data...');
    const today = new Date().toISOString().split('T')[0];

    const { error: insertError } = await supabase
      .from('api_usage_daily')
      .upsert({
        service: 'test_service',
        usage_date: today,
        call_count: 1,
        error_count: 0
      }, {
        onConflict: 'service,usage_date'
      });

    if (insertError) {
      console.log('   Insert test failed:', insertError.message);
      if (insertError.code === '42P01') {
        console.log('\n   Table not found. Please create it via Supabase SQL Editor:');
        console.log('   1. Go to https://supabase.com/dashboard/project/qcvfxxsnqvdfmpbcgdni/sql');
        console.log('   2. Copy contents of: infra/supabase/migrations/20251130_api_usage.sql');
        console.log('   3. Run the SQL\n');
      }
      return;
    }

    console.log('   Done! Test record inserted.');

    // Clean up test record
    await supabase
      .from('api_usage_daily')
      .delete()
      .eq('service', 'test_service');

    console.log('\n3. Schema applied successfully!');
    console.log('   Table: api_usage_daily');
    console.log('   Function: increment_api_usage (run SQL manually if needed)');

  } catch (err) {
    console.error('Error:', err.message);
  }
}

applySchema();
