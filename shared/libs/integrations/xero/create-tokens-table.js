/**
 * Create xero_tokens table
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../../../.env') })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function main() {
  // Test if table exists by trying to query it
  const { data, error } = await supabase
    .from('xero_tokens')
    .select('*')
    .limit(1)

  if (error && error.code === '42P01') {
    console.log('Table does not exist. Please run this SQL in Supabase Dashboard:')
    console.log(`
CREATE TABLE IF NOT EXISTS xero_tokens (
    business_key TEXT PRIMARY KEY,
    refresh_token TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
`)
  } else if (error) {
    console.log('Error:', error.message)
  } else {
    console.log('Table exists! Current tokens:', data.length)
  }
}

main()
