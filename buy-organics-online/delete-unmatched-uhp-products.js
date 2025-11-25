#!/usr/bin/env node

/**
 * DELETE UNMATCHED UHP PRODUCTS FROM BC & SUPABASE
 * Deletes all BC products with UN prefix that don't match UHP supplier feed
 * All 1,150 products have zero stock
 */

require('dotenv').config({ path: '../MASTER-CREDENTIALS-COMPLETE.env' });
const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const fs = require('fs');
const path = require('path');

// BigCommerce API credentials
const STORE_HASH = 'hhhi';
const ACCESS_TOKEN = 'ttf2mji7i912znhbue9gauvu7fbiiyo';

// Redirect URL for all UN products (health products category)
const REDIRECT_TO = '/';

// Supabase client
const supabase = createClient(
  process.env.BOO_SUPABASE_URL,
  process.env.BOO_SUPABASE_SERVICE_ROLE_KEY
);

const SUPPLIER_NAME = 'uhp';

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

async function deleteUnmatchedUHPProducts() {
  console.log('\n========================================');
  console.log('DELETE UNMATCHED UHP PRODUCTS');
  console.log('========================================\n');

  // Get already matched BC product IDs
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

  // Filter to unmatched products
  const productsToDelete = bcProducts.filter(p => !matchedBcIds.has(p.id));
  console.log(`✓ Found ${productsToDelete.length} unmatched BC products to delete\n`);

  if (productsToDelete.length === 0) {
    console.log('No products to delete.\n');
    return;
  }

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
  console.log('Creating redirects CSV...');
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
  const redirectPath = 'reports/uhp-products-redirects-import.csv';
  fs.mkdirSync('reports', { recursive: true });
  fs.writeFileSync(redirectPath, redirectCsv);
  console.log(`✓ Created ${redirectPath} (${redirectRows.length - 1} redirects)\n`);

  // Summary before deletion
  console.log('========================================');
  console.log('DELETION SUMMARY');
  console.log('========================================\n');
  console.log(`Total products to delete: ${productsToDelete.length}`);
  console.log(`All have zero stock: YES`);
  console.log(`Redirects created: ${redirectRows.length - 1}\n`);

  console.log('Sample products to delete (first 20):');
  productsToDelete.slice(0, 20).forEach((p, i) => {
    console.log(`${i + 1}. ${p.sku} - ${p.name}`);
  });
  console.log();

  // Ask for confirmation (in production, you might want to add a flag)
  console.log('⚠️  PROCEEDING WITH DELETION IN 5 SECONDS...\n');
  console.log('Press Ctrl+C to cancel\n');

  await new Promise(resolve => setTimeout(resolve, 5000));

  // Delete from BigCommerce
  console.log('Deleting from BigCommerce...\n');
  let deletedFromBC = 0;
  const deletionReport = [];

  for (const product of productsToDelete) {
    try {
      console.log(`Deleting BC ID ${product.product_id}: ${product.sku}`);

      const response = await makeApiRequest('DELETE', `/v3/catalog/products/${product.product_id}`);

      if (response.success) {
        deletedFromBC++;
        deletionReport.push({
          bc_id: product.product_id,
          sku: product.sku,
          name: product.name,
          status: 'deleted_from_bc',
          custom_url: product.custom_url
        });
        console.log(`  ✓ Deleted from BC`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.log(`  ✗ Failed to delete from BC: ${error.message}`);
      deletionReport.push({
        bc_id: product.product_id,
        sku: product.sku,
        name: product.name,
        status: 'failed',
        error: error.message
      });
    }
  }

  console.log(`\n✅ Deleted ${deletedFromBC} of ${productsToDelete.length} products from BigCommerce\n`);

  // Delete from Supabase
  console.log('Deleting from Supabase...\n');

  const productIds = productsToDelete.map(p => p.id);
  const BATCH_SIZE = 100;
  let deletedFromSupabase = 0;

  for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
    const batch = productIds.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from('ecommerce_products')
      .delete()
      .in('id', batch);

    if (error) {
      console.error(`✗ Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, error.message);
    } else {
      deletedFromSupabase += batch.length;
      console.log(`✓ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} products deleted from Supabase`);
    }
  }

  console.log(`\n✅ Deleted ${deletedFromSupabase} of ${productsToDelete.length} products from Supabase\n`);

  // Save deletion report
  const reportPath = 'reports/unmatched-uhp-deletion-report.json';
  const report = {
    timestamp: new Date().toISOString(),
    total_products: productsToDelete.length,
    deleted_from_bc: deletedFromBC,
    deleted_from_supabase: deletedFromSupabase,
    redirects_created: redirectRows.length - 1,
    products: deletionReport
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Deletion report saved to: ${reportPath}\n`);

  console.log('========================================');
  console.log('DELETION COMPLETE');
  console.log('========================================\n');
  console.log(`✅ Deleted ${deletedFromBC} products from BigCommerce`);
  console.log(`✅ Deleted ${deletedFromSupabase} products from Supabase`);
  console.log(`✅ Created ${redirectRows.length - 1} redirects\n`);
  console.log(`Next steps:`);
  console.log(`1. Import redirects: ${redirectPath}`);
  console.log(`2. Review deletion report: ${reportPath}\n`);
}

deleteUnmatchedUHPProducts().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
