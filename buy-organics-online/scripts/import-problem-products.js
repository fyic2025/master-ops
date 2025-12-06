/**
 * Import Problem Products to Supabase
 *
 * Run this script after creating the dispatch_problem_products table in Supabase
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

function httpsPost(url, headers, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(data);

    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        ...headers,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: body ? JSON.parse(body) : null });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function importProducts() {
  console.log('=== Importing Problem Products to Supabase ===\n');

  // Read the problem products JSON
  const problemProducts = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'problem-products-for-supabase.json'), 'utf-8')
  );

  console.log(`Found ${problemProducts.length} products to import\n`);

  // Add supplier identification based on SKU prefix
  const supplierMap = {
    'OB': 'Oborne Health Supplies',
    'KAD': 'Kadac',
    'UN': 'Unknown/Direct',
    'GBN': 'Vitalus',
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

  try {
    const result = await httpsPost(
      `${SUPABASE_URL}/rest/v1/dispatch_problem_products`,
      {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      enrichedProducts
    );

    if (result.status === 201 || result.status === 200) {
      const inserted = Array.isArray(result.data) ? result.data.length : enrichedProducts.length;
      console.log(`Successfully imported ${inserted} products!`);
      console.log('\nYou can view them at:');
      console.log('https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/editor/table/dispatch_problem_products');
    } else if (result.data && result.data.message) {
      console.log('Error importing:', result.data.message);
      console.log('Status:', result.status);
      console.log('\nMake sure you have created the table first. See TODO-DISPATCH-ANALYSIS.md for the SQL.');
    } else {
      console.log('Response status:', result.status);
      console.log('Response:', JSON.stringify(result.data, null, 2));
    }
  } catch (err) {
    console.error('Request failed:', err.message);
  }

  // Also save the enriched data
  fs.writeFileSync(
    path.join(__dirname, 'problem-products-enriched.json'),
    JSON.stringify(enrichedProducts, null, 2)
  );
  console.log('\nSaved enriched data to problem-products-enriched.json');
}

importProducts().catch(console.error);
