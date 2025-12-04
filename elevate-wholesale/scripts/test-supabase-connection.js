/**
 * Test Supabase connection for elevate-wholesale after migration
 * Verifies connection to teelixir-leads project
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Read env file directly to avoid dotenv issues
const envContent = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const parseEnv = (content, key) => {
  const match = content.match(new RegExp(`^${key}=(.+)$`, 'm'));
  return match ? match[1].trim() : '';
};

const SUPABASE_URL = parseEnv(envContent, 'SUPABASE_URL');
const SUPABASE_ANON_KEY = parseEnv(envContent, 'SUPABASE_ANON_KEY');

console.log('='.repeat(60));
console.log('ELEVATE-WHOLESALE SUPABASE CONNECTION TEST');
console.log('='.repeat(60));
console.log('');
console.log('Configuration:');
console.log(`  SUPABASE_URL: ${SUPABASE_URL}`);
console.log(`  SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY?.substring(0, 30)}...`);
console.log('');

async function testConnection() {
  return new Promise((resolve, reject) => {
    const url = new URL('/rest/v1/elevate_products?select=id,sku,title&limit=5', SUPABASE_URL);

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    console.log('Testing: Fetch 5 products from elevate_products...');

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const products = JSON.parse(data);
          console.log(`  ✅ SUCCESS - Found ${products.length} products`);
          console.log('');
          console.log('Sample products:');
          products.forEach((p, i) => {
            console.log(`  ${i + 1}. ${p.sku} - ${p.title?.substring(0, 40)}`);
          });
          resolve(products);
        } else {
          console.log(`  ❌ FAILED - HTTP ${res.statusCode}`);
          console.log(`  Response: ${data}`);
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function countProducts() {
  return new Promise((resolve, reject) => {
    const url = new URL('/rest/v1/elevate_products?select=id', SUPABASE_URL);

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    console.log('');
    console.log('Testing: Count total products...');

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const products = JSON.parse(data);
          console.log(`  ✅ Total products in database: ${products.length}`);
          resolve(products.length);
        } else {
          console.log(`  ❌ FAILED - HTTP ${res.statusCode}`);
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  try {
    await testConnection();
    const count = await countProducts();

    console.log('');
    console.log('='.repeat(60));
    if (count === 1213) {
      console.log('✅ ALL TESTS PASSED - Migration verified!');
    } else {
      console.log(`⚠️  WARNING: Expected 1213 products, found ${count}`);
    }
    console.log('='.repeat(60));
  } catch (error) {
    console.error('');
    console.error('❌ TEST FAILED:', error.message);
    process.exit(1);
  }
}

main();
