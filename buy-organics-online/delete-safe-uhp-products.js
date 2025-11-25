#!/usr/bin/env node

/**
 * DELETE SAFE UHP PRODUCTS
 * Deletes 627 BC products from discontinued brands (similarity < 60%)
 * 1. Creates 301 redirects
 * 2. Deletes from BigCommerce
 * 3. Removes from Supabase
 * 4. Saves detailed progress report
 */

require('dotenv').config({ path: '../MASTER-CREDENTIALS-COMPLETE.env' });
const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const fs = require('fs');

// BigCommerce API credentials
const STORE_HASH = 'hhhi';
const ACCESS_TOKEN = 'ttf2mji7i912znhbue9gauvu7fbiiyo';

// Redirect URL for deleted products
const REDIRECT_TO = '/';

// Supabase client
const supabase = createClient(
  process.env.BOO_SUPABASE_URL,
  process.env.BOO_SUPABASE_SERVICE_ROLE_KEY
);

const SUPPLIER_NAME = 'uhp';
const SIMILARITY_THRESHOLD = 60; // Only delete brands with < 60% similarity

// API request helper
function makeApiRequest(method, path, body = null) {
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
            statusCode: res.statusCode,
            data: responseData ? JSON.parse(responseData) : null
          });
        } else {
          reject(new Error(`API Error: ${res.statusCode} - ${responseData}`));
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
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

async function deleteSafeUHPProducts() {
  console.log('\n========================================');
  console.log('DELETE SAFE UHP PRODUCTS');
  console.log('========================================\n');

  // Load fuzzy match report to get safe brands
  console.log('Loading fuzzy match report...');
  const fuzzyReport = JSON.parse(fs.readFileSync('reports/uhp-fuzzy-brand-match.json', 'utf8'));

  const safeBrands = fuzzyReport.no_match_brands
    .filter(b => parseFloat(b.similarity) < SIMILARITY_THRESHOLD)
    .map(b => b.bc_brand);

  console.log(`✓ Found ${safeBrands.length} safe brands to delete\n`);

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
  console.log('Filtering to safe brands only...');
  const productsToDelete = unmatchedBcProducts.filter(product => {
    const brand = extractBrandFromName(product.name);
    return safeBrands.includes(brand);
  });

  console.log(`✓ Identified ${productsToDelete.length} products to delete\n`);

  // Verify all have zero stock
  const withStock = productsToDelete.filter(p => p.stock_level > 0);
  if (withStock.length > 0) {
    console.log(`⚠️  WARNING: ${withStock.length} products have stock > 0!`);
    console.log('First 5 products with stock:');
    withStock.slice(0, 5).forEach(p => {
      console.log(`  - ${p.sku}: ${p.name} (Stock: ${p.stock_level})`);
    });
    console.log('\nAborted deletion for safety.\n');
    return;
  }

  console.log('✓ All products have zero stock\n');

  // Create redirects CSV
  console.log('Creating 301 redirects CSV...');
  const redirectRows = [
    ['Domain', 'Old Path', 'Manual URL/Path', 'Dynamic Target Type', 'Dynamic Target ID']
  ];

  productsToDelete.forEach(product => {
    if (product.custom_url) {
      redirectRows.push([
        'buyorganicsonline.com.au',
        product.custom_url,
        REDIRECT_TO,
        '',
        ''
      ]);
    }
  });

  const redirectCsv = redirectRows.map(row => row.join(',')).join('\n');
  const redirectPath = 'reports/uhp-safe-products-redirects.csv';
  fs.mkdirSync('reports', { recursive: true });
  fs.writeFileSync(redirectPath, redirectCsv);
  console.log(`✓ Created ${redirectPath} (${redirectRows.length - 1} redirects)\n`);

  // Display summary
  console.log('========================================');
  console.log('DELETION SUMMARY');
  console.log('========================================\n');
  console.log(`Products to delete: ${productsToDelete.length}`);
  console.log(`All have zero stock: YES`);
  console.log(`Brands (similarity < ${SIMILARITY_THRESHOLD}%): ${safeBrands.length}`);
  console.log(`301 redirects created: ${redirectRows.length - 1}\n`);

  console.log('Sample products to delete (first 20):');
  productsToDelete.slice(0, 20).forEach((p, i) => {
    const brand = extractBrandFromName(p.name);
    console.log(`${i + 1}. [${brand}] ${p.sku} - ${p.name}`);
  });
  console.log();

  // Confirmation
  console.log('⚠️  PROCEEDING WITH DELETION IN 5 SECONDS...\n');
  console.log('This will:');
  console.log('  1. Delete products from BigCommerce');
  console.log('  2. Remove products from Supabase');
  console.log('  3. Save detailed progress report\n');
  console.log('Press Ctrl+C to cancel\n');

  await new Promise(resolve => setTimeout(resolve, 5000));

  // Initialize progress tracking
  const progressReport = {
    timestamp: new Date().toISOString(),
    total_products: productsToDelete.length,
    deleted_from_bc: 0,
    failed_bc: 0,
    deleted_from_supabase: 0,
    redirects_created: redirectRows.length - 1,
    products: []
  };

  // Delete from BigCommerce
  console.log('========================================');
  console.log('DELETING FROM BIGCOMMERCE');
  console.log('========================================\n');

  for (let i = 0; i < productsToDelete.length; i++) {
    const product = productsToDelete[i];
    const progress = `[${i + 1}/${productsToDelete.length}]`;

    try {
      console.log(`${progress} Deleting BC ID ${product.product_id}: ${product.sku}`);

      const response = await makeApiRequest('DELETE', `/v3/catalog/products/${product.product_id}`);

      if (response.success) {
        progressReport.deleted_from_bc++;
        progressReport.products.push({
          bc_id: product.product_id,
          sku: product.sku,
          name: product.name,
          brand: extractBrandFromName(product.name),
          status: 'deleted_from_bc',
          custom_url: product.custom_url
        });
        console.log(`  ✓ Deleted from BC`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Save progress every 50 products
      if ((i + 1) % 50 === 0) {
        const tempPath = 'reports/uhp-deletion-progress-temp.json';
        fs.writeFileSync(tempPath, JSON.stringify(progressReport, null, 2));
        console.log(`  💾 Progress saved (${progressReport.deleted_from_bc} deleted)\n`);
      }

    } catch (error) {
      console.log(`  ✗ Failed to delete from BC: ${error.message}`);
      progressReport.failed_bc++;
      progressReport.products.push({
        bc_id: product.product_id,
        sku: product.sku,
        name: product.name,
        brand: extractBrandFromName(product.name),
        status: 'failed',
        error: error.message
      });
    }
  }

  console.log(`\n✅ Deleted ${progressReport.deleted_from_bc} of ${productsToDelete.length} products from BigCommerce\n`);

  // Delete from Supabase
  console.log('========================================');
  console.log('DELETING FROM SUPABASE');
  console.log('========================================\n');

  const productIds = productsToDelete.map(p => p.id);
  const BATCH_SIZE = 100;
  let deletedFromSupabase = 0;

  for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
    const batch = productIds.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    const { error } = await supabase
      .from('ecommerce_products')
      .delete()
      .in('id', batch);

    if (error) {
      console.error(`✗ Batch ${batchNum} failed:`, error.message);
    } else {
      deletedFromSupabase += batch.length;
      console.log(`✓ Batch ${batchNum}: ${batch.length} products deleted from Supabase`);
    }
  }

  progressReport.deleted_from_supabase = deletedFromSupabase;
  console.log(`\n✅ Deleted ${deletedFromSupabase} of ${productsToDelete.length} products from Supabase\n`);

  // Save final progress report
  const finalReportPath = 'reports/uhp-safe-deletion-report.json';
  fs.writeFileSync(finalReportPath, JSON.stringify(progressReport, null, 2));

  // Summary report
  const summaryPath = 'reports/uhp-safe-deletion-summary.txt';
  const summary = `
========================================
UHP SAFE PRODUCTS DELETION REPORT
========================================

Date: ${new Date().toISOString()}

DELETION CRITERIA:
- Brand similarity to UHP: < ${SIMILARITY_THRESHOLD}%
- Stock level: 0
- Matched to UHP supplier: No

RESULTS:
- Total products deleted: ${productsToDelete.length}
- Deleted from BigCommerce: ${progressReport.deleted_from_bc}
- Deleted from Supabase: ${progressReport.deleted_from_supabase}
- Failed deletions: ${progressReport.failed_bc}
- 301 redirects created: ${progressReport.redirects_created}

BRANDS DELETED (${safeBrands.length} brands):
${safeBrands.map((b, i) => `${i + 1}. ${b}`).join('\n')}

FILES CREATED:
- 301 Redirects CSV: ${redirectPath}
- Detailed Report: ${finalReportPath}
- Summary: ${summaryPath}

NEXT STEPS:
1. Import 301 redirects into BigCommerce
2. Review detailed report for any issues
3. Proceed with manual review of 91 remaining products (60-75% similarity)

========================================
`;

  fs.writeFileSync(summaryPath, summary);

  console.log('========================================');
  console.log('DELETION COMPLETE');
  console.log('========================================\n');
  console.log(`✅ Deleted ${progressReport.deleted_from_bc} products from BigCommerce`);
  console.log(`✅ Deleted ${progressReport.deleted_from_supabase} products from Supabase`);
  console.log(`✅ Created ${progressReport.redirects_created} redirects\n`);
  console.log(`📄 Reports saved:`);
  console.log(`   - ${redirectPath}`);
  console.log(`   - ${finalReportPath}`);
  console.log(`   - ${summaryPath}\n`);
  console.log(`Next steps:`);
  console.log(`1. Import 301 redirects: ${redirectPath}`);
  console.log(`2. Review 91 remaining products (60-75% similarity) manually\n`);
}

deleteSafeUHPProducts().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
