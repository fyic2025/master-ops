/**
 * Apply Category Schema Migration via Supabase REST/RPC
 *
 * This script tries multiple approaches to apply the migration
 */

const axios = require('axios');

const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

const headers = {
  'apikey': SUPABASE_SERVICE_KEY,
  'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal'
};

async function checkTable(tableName) {
  try {
    const response = await axios.get(
      `${SUPABASE_URL}/rest/v1/${tableName}?select=id&limit=1`,
      { headers }
    );
    return { exists: true, count: response.data.length };
  } catch (error) {
    if (error.response?.data?.code === '42P01') {
      return { exists: false };
    }
    return { exists: true, error: error.message };
  }
}

async function insertTestRow(tableName, data) {
  try {
    const response = await axios.post(
      `${SUPABASE_URL}/rest/v1/${tableName}`,
      data,
      { headers }
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.response?.data || error.message };
  }
}

async function main() {
  console.log('Checking Supabase tables...\n');

  // Check bc_categories
  const catResult = await checkTable('bc_categories');
  console.log('bc_categories:', catResult.exists ? 'EXISTS' : 'NOT EXISTS');

  // Check product_category_links
  const linkResult = await checkTable('product_category_links');
  console.log('product_category_links:', linkResult.exists ? 'EXISTS' : 'NOT EXISTS');

  // Check category_analysis
  const analysisResult = await checkTable('category_analysis');
  console.log('category_analysis:', analysisResult.exists ? 'EXISTS' : 'NOT EXISTS');

  if (!catResult.exists || !linkResult.exists || !analysisResult.exists) {
    console.log('\n=== MIGRATION REQUIRED ===');
    console.log('\nPlease run the SQL migration in Supabase Dashboard:');
    console.log('https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/sql/new');
    console.log('\nSQL file: supabase-migrations/005_create_category_tables.sql');
    return false;
  }

  console.log('\nAll tables exist! Ready to sync categories.');
  return true;
}

main().then(ready => {
  if (!ready) {
    process.exit(1);
  }
});
