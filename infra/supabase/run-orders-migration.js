const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://qcvfxxsnqvdfmpbcgdni.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8'
);

async function runMigration() {
  const sql = fs.readFileSync('infra/supabase/migrations/20251204_unleashed_orders.sql', 'utf8');

  // Split into individual statements
  const statements = sql
    .split(/;\s*$/m)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Running ${statements.length} statements...`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (!stmt || stmt.startsWith('--')) continue;

    // Use the SQL function from Supabase
    const { error } = await supabase.rpc('exec_sql', { query: stmt });

    if (error) {
      // Try alternative - some statements might already exist
      if (error.message.includes('already exists') || error.message.includes('does not exist')) {
        console.log(`  [${i + 1}] Skipped (already exists)`);
      } else {
        console.log(`  [${i + 1}] Error: ${error.message.slice(0, 100)}`);
      }
    } else {
      console.log(`  [${i + 1}] OK`);
    }
  }

  // Verify tables exist
  const { data, error } = await supabase.from('unleashed_orders').select('id').limit(1);
  if (error && error.code === '42P01') {
    console.log('\\n❌ Tables not created - may need to run via Supabase dashboard');
    console.log('Migration file: infra/supabase/migrations/20251204_unleashed_orders.sql');
  } else if (error) {
    console.log('Check error:', error.message);
  } else {
    console.log('\\n✅ unleashed_orders table ready');
  }
}

runMigration();
