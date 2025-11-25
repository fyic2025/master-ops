/**
 * Simple table check using axios
 */

const axios = require('axios');

const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

async function checkTable(tableName) {
  try {
    const response = await axios.get(
      `${SUPABASE_URL}/rest/v1/${tableName}?select=id&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        },
        validateStatus: () => true // Don't throw on any status
      }
    );

    console.log(`${tableName}: Status ${response.status}`);

    if (response.status === 200) {
      console.log(`  Data: ${JSON.stringify(response.data).substring(0, 100)}`);
      return true;
    } else {
      console.log(`  Response: ${JSON.stringify(response.data).substring(0, 200)}`);
      return false;
    }
  } catch (error) {
    console.log(`${tableName}: ERROR - ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('=== Checking Supabase Tables ===\n');

  await checkTable('bc_categories');
  await checkTable('product_category_links');
  await checkTable('category_analysis');
  await checkTable('bc_products'); // This one we know exists

  console.log('\n=== Done ===');
}

main();
