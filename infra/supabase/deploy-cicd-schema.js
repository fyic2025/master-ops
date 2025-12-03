/**
 * Deploy CI/CD Issues Schema to Master Supabase (dashboard)
 * Run: node infra/supabase/deploy-cicd-schema.js
 */

const fs = require('fs');
const path = require('path');

// Master Supabase credentials (dashboard)
const SUPABASE_URL = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8';

async function deploySchema() {
  console.log('Deploying CI/CD Issues Schema');
  console.log('============================\n');

  // Read the migration file
  const migrationPath = path.join(__dirname, 'migrations', '20251203_cicd_issues.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log(`Migration file: ${migrationPath}`);
  console.log(`SQL length: ${sql.length} characters\n`);

  // Check if tables already exist
  console.log('Checking existing tables...');

  const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/cicd_issues?limit=1`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });

  if (checkResponse.ok) {
    console.log('Table cicd_issues already exists\n');
  } else if (checkResponse.status === 404 || checkResponse.status === 400) {
    console.log('Table does not exist yet - needs to be created\n');
  }

  // Provide manual deployment instructions
  console.log('========================================');
  console.log('MANUAL DEPLOYMENT REQUIRED');
  console.log('========================================\n');
  console.log('Supabase REST API does not support raw SQL execution.');
  console.log('Please run the migration manually:\n');
  console.log('1. Go to: https://supabase.com/dashboard/project/qcvfxxsnqvdfmpbcgdni/sql/new');
  console.log('2. Copy and paste the contents of:');
  console.log(`   ${migrationPath}`);
  console.log('3. Click "Run"\n');
  console.log('========================================\n');

  // Output the SQL for easy copying
  console.log('Or copy this SQL directly:\n');
  console.log('--- BEGIN SQL ---');
  console.log(sql);
  console.log('--- END SQL ---\n');

  // Also save to clipboard-friendly file
  const clipboardPath = path.join(__dirname, 'temp-cicd-migration.sql');
  fs.writeFileSync(clipboardPath, sql);
  console.log(`Full SQL saved to: ${clipboardPath}`);
}

deploySchema().catch(console.error);
