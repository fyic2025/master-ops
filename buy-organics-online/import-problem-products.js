/**
 * Import Problem Products to Supabase
 *
 * Run this script after creating the dispatch_problem_products table in Supabase
 */

const { execSync } = require('child_process');
const fs = require('fs');

const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

function curlPost(url, headers, data) {
  const headerArgs = Object.entries(headers)
    .map(([k, v]) => `-H "${k}: ${v}"`)
    .join(' ');
  const jsonData = JSON.stringify(data).replace(/'/g, "'\\''");
  const cmd = `curl -s -X POST "${url}" ${headerArgs} -d '${jsonData}'`;
  try {
    const result = execSync(cmd, { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
    return result ? JSON.parse(result) : null;
  } catch (e) {
    console.error('Error:', e.message);
    return null;
  }
}

async function importProducts() {
  console.log('=== Importing Problem Products to Supabase ===\n');

  // Read the problem products JSON
  const problemProducts = JSON.parse(
    fs.readFileSync('/home/user/master-ops/buy-organics-online/problem-products-for-supabase.json', 'utf-8')
  );

  console.log(`Found ${problemProducts.length} products to import\n`);

  // Add supplier identification based on SKU prefix
  const supplierMap = {
    'OB': 'Oborne Health Supplies',
    'KAD': 'Kadac',
    'UN': 'Unknown/Direct',
    'GBN': 'Green Beauty Network',
    'KIK': 'Teelixir'
  };

  const enrichedProducts = problemProducts.map(p => {
    const skuPrefix = (p.sku || '').split(' ')[0].replace(' -', '');
    return {
      ...p,
      supplier_name: supplierMap[skuPrefix] || 'Unknown'
    };
  });

  // Insert into Supabase
  console.log('Inserting into dispatch_problem_products table...\n');

  const result = curlPost(
    `${SUPABASE_URL}/rest/v1/dispatch_problem_products`,
    {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    enrichedProducts
  );

  if (result && !result.error) {
    console.log(`Successfully imported ${enrichedProducts.length} products!`);
    console.log('\nYou can view them at:');
    console.log('https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/editor/table/dispatch_problem_products');
  } else if (result && result.error) {
    console.log('Error importing:', result.message || result.error);
    console.log('\nMake sure you have created the table first. See TODO-DISPATCH-ANALYSIS.md for the SQL.');
  } else {
    console.log('Import completed (check Supabase for results)');
  }

  // Also save the enriched data
  fs.writeFileSync(
    '/home/user/master-ops/buy-organics-online/problem-products-enriched.json',
    JSON.stringify(enrichedProducts, null, 2)
  );
  console.log('\nSaved enriched data to problem-products-enriched.json');
}

importProducts().catch(console.error);
