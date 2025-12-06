#!/usr/bin/env node

/**
 * GENERATE UHP REDIRECTS CSV
 * Creates 301 redirects CSV for 627 safe UHP products
 */

require('dotenv').config({ path: '../MASTER-CREDENTIALS-COMPLETE.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const https = require('https');

const supabase = createClient(
  process.env.BOO_SUPABASE_URL,
  process.env.BOO_SUPABASE_SERVICE_ROLE_KEY
);

const SUPPLIER_NAME = 'uhp';
const SIMILARITY_THRESHOLD = 60;
const REDIRECT_TO = '/';

// BigCommerce API credentials
const STORE_HASH = 'hhhi';
const ACCESS_TOKEN = 'ttf2mji7i912znhbue9gauvu7fbiiyo';

// API request helper
function makeApiRequest(method, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.bigcommerce.com',
      path: `/stores/${STORE_HASH}${path}`,
      method: method,
      headers: {
        'X-Auth-Token': ACCESS_TOKEN,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({
            success: true,
            data: responseData ? JSON.parse(responseData) : null
          });
        } else {
          reject(new Error(`API Error: ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Extract brand from product name
function extractBrandFromName(name) {
  if (!name) return 'UNKNOWN';

  const cleanName = name
    .replace(/^\s*UN\s*-\s*[A-Z0-9]+\s*-\s*/i, '')
    .trim();

  const words = cleanName.split(/\s+/);

  const twoWordBrands = [
    'Power Super Foods', 'Protein Supplies', 'Jack N', 'Dr Organic',
    'The Ginger People', 'Tom Organic', 'Lemon Myrtle', 'Pure Food',
    'Naturally Sweet', 'Love Children', 'Schmidt\'s', 'Planet Organic',
    'Organic Times', 'Nirvana Organics', 'Nutritionist Choice', 'Happy Way',
    'Well & Good', 'MACRO MIKE', 'Nutra Organics'
  ];

  const firstTwo = words.slice(0, 2).join(' ');
  for (const brand of twoWordBrands) {
    if (firstTwo.toLowerCase().includes(brand.toLowerCase())) {
      return brand;
    }
  }

  return words[0] || 'UNKNOWN';
}

async function generateRedirects() {
  console.log('\n========================================');
  console.log('GENERATE UHP 301 REDIRECTS');
  console.log('========================================\n');

  // Load fuzzy match report
  console.log('Loading fuzzy match report...');
  const fuzzyReport = JSON.parse(fs.readFileSync('reports/uhp-fuzzy-brand-match.json', 'utf8'));

  const safeBrands = fuzzyReport.no_match_brands
    .filter(b => parseFloat(b.similarity) < SIMILARITY_THRESHOLD)
    .map(b => b.bc_brand);

  console.log(`✓ Found ${safeBrands.length} safe brands\n`);

  // Get matched BC product IDs
  console.log('Loading existing UHP matches...');
  let existingMatches = [];
  let offset = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('product_supplier_links')
      .select('ecommerce_product_id')
      .eq('supplier_name', SUPPLIER_NAME)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    existingMatches = existingMatches.concat(data);
    offset += PAGE_SIZE;
    if (data.length < PAGE_SIZE) break;
  }

  const matchedBcIds = new Set(existingMatches.map(m => m.ecommerce_product_id));
  console.log(`✓ Found ${existingMatches.length} existing matches\n`);

  // Get all BC products with UN prefix
  console.log('Loading BC products with UN prefix...');
  let bcProducts = [];
  let bcOffset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('ecommerce_products')
      .select('*')
      .or('sku.ilike.UN %,sku.ilike.UN-%')
      .range(bcOffset, bcOffset + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    bcProducts = bcProducts.concat(data);
    bcOffset += PAGE_SIZE;
    if (data.length < PAGE_SIZE) break;
  }

  const unmatchedBcProducts = bcProducts.filter(p => !matchedBcIds.has(p.id));
  console.log(`✓ Found ${unmatchedBcProducts.length} unmatched BC products\n`);

  // Filter to only products from safe brands
  console.log('Filtering to safe brands...');
  const productsToRedirect = unmatchedBcProducts.filter(product => {
    const brand = extractBrandFromName(product.name);
    return safeBrands.includes(brand);
  });

  console.log(`✓ Identified ${productsToRedirect.length} products\n`);

  // Fetch URLs from BigCommerce
  console.log('Fetching product URLs from BigCommerce...');
  const redirectRows = [
    ['Domain', 'Old Path', 'Manual URL/Path', 'Dynamic Target Type', 'Dynamic Target ID']
  ];

  let fetchedCount = 0;
  for (let i = 0; i < productsToRedirect.length; i++) {
    const product = productsToRedirect[i];

    try {
      const response = await makeApiRequest('GET', `/v3/catalog/products/${product.product_id}`);

      if (response.success && response.data && response.data.data) {
        const bcProduct = response.data.data;
        if (bcProduct.custom_url && bcProduct.custom_url.url) {
          redirectRows.push([
            'buyorganicsonline.com.au',
            bcProduct.custom_url.url,
            REDIRECT_TO,
            '',
            ''
          ]);
          fetchedCount++;
        }
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

      // Progress indicator
      if ((i + 1) % 50 === 0) {
        console.log(`  Progress: ${i + 1}/${productsToRedirect.length} products checked (${fetchedCount} redirects)`);
      }

    } catch (error) {
      console.log(`  ⚠️  Failed to fetch URL for product ${product.product_id}: ${error.message}`);
    }
  }

  console.log(`✓ Fetched ${fetchedCount} product URLs\n`);

  const redirectCsv = redirectRows.map(row => row.join(',')).join('\n');
  const redirectPath = 'reports/uhp-safe-products-redirects.csv';
  fs.mkdirSync('reports', { recursive: true });
  fs.writeFileSync(redirectPath, redirectCsv);

  console.log('========================================');
  console.log('REDIRECTS CSV CREATED');
  console.log('========================================\n');
  console.log(`Products checked: ${productsToRedirect.length}`);
  console.log(`Redirects created: ${redirectRows.length - 1}`);
  console.log(`File: ${redirectPath}\n`);

  if (redirectRows.length > 1) {
    console.log(`Sample redirects (first 10):\n`);
    redirectRows.slice(1, Math.min(11, redirectRows.length)).forEach((row, i) => {
      console.log(`${i + 1}. ${row[1]} → ${row[2]}`);
    });
  } else {
    console.log(`⚠️  No redirects created (products may not have custom URLs)\n`);
  }

  console.log('\n========================================');
  console.log('NEXT STEPS:');
  console.log('1. Import CSV into BigCommerce (Settings > URL Redirects)');
  console.log('2. Then run deletion script to remove products');
  console.log('========================================\n');
}

generateRedirects().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
