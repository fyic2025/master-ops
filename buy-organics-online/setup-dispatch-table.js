/**
 * Setup Order Dispatch Analysis Table in Supabase
 * Uses the Supabase Management API to create the table
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function createTable() {
  console.log('Setting up order_dispatch_analysis table...\n');

  // Try to create the table using RPC (if a function exists) or direct SQL
  // Since we're using service role, we can execute SQL via pg functions

  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS order_dispatch_analysis (
      id SERIAL PRIMARY KEY,
      order_id INTEGER UNIQUE NOT NULL,
      order_date TIMESTAMP WITH TIME ZONE,
      shipped_date TIMESTAMP WITH TIME ZONE,
      days_to_dispatch NUMERIC(10,2),
      status VARCHAR(50),
      status_id INTEGER,
      customer_id INTEGER,
      total_inc_tax NUMERIC(15,2),
      total_ex_tax NUMERIC(15,2),
      items_total INTEGER,
      shipping_method VARCHAR(255),
      payment_method VARCHAR(100),
      billing_state VARCHAR(100),
      billing_postcode VARCHAR(20),
      products JSONB,
      brands TEXT[],
      skus TEXT[],
      categories TEXT[],
      is_slow_dispatch BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  // Try using the exec_sql RPC function if it exists
  const { data, error } = await supabase.rpc('exec_sql', { sql: createTableSQL });

  if (error) {
    console.log('Note: exec_sql RPC not available. Checking if table exists...');

    // Try to query the table to see if it exists
    const { error: checkError } = await supabase
      .from('order_dispatch_analysis')
      .select('order_id')
      .limit(1);

    if (checkError && checkError.code === '42P01') {
      console.log('\n*** TABLE NEEDS TO BE CREATED ***\n');
      console.log('Please run this SQL in Supabase SQL Editor:');
      console.log('https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/sql/new\n');
      console.log(createTableSQL);
      console.log('\n--- Indexes ---\n');
      console.log(`
CREATE INDEX IF NOT EXISTS idx_order_dispatch_order_date ON order_dispatch_analysis(order_date);
CREATE INDEX IF NOT EXISTS idx_order_dispatch_days ON order_dispatch_analysis(days_to_dispatch);
CREATE INDEX IF NOT EXISTS idx_order_dispatch_brands ON order_dispatch_analysis USING GIN(brands);
CREATE INDEX IF NOT EXISTS idx_order_dispatch_slow ON order_dispatch_analysis(is_slow_dispatch);
      `);
      return false;
    } else if (checkError) {
      console.log('Error checking table:', checkError.message);
      return false;
    } else {
      console.log('Table order_dispatch_analysis already exists!');
      return true;
    }
  } else {
    console.log('Table created successfully!');
    return true;
  }
}

createTable().then(success => {
  if (success) {
    console.log('\nReady to run the analysis script.');
  } else {
    console.log('\nPlease create the table manually, then run the analysis script.');
  }
});
