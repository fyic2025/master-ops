#!/usr/bin/env node

/**
 * DELETE KIK PRODUCTS FROM BIGCOMMERCE
 * Deletes products that are not sellable or not found in Unleashed
 */

const fs = require('fs');
const https = require('https');

// BigCommerce API credentials
const STORE_HASH = 'hhhi';
const ACCESS_TOKEN = 'ttf2mji7i912znhbue9gauvu7fbiiyo';

// Read products to delete
const productsToDelete = JSON.parse(
  fs.readFileSync('kik-products-to-delete.json', 'utf8')
);

console.log('========================================');
console.log('DELETE KIK PRODUCTS FROM BIGCOMMERCE');
console.log('========================================\n');
console.log(`Total products to delete: ${productsToDelete.length}\n`);

// Get product custom URLs first for redirects
async function getProductUrls(productIds) {
  const urls = {};

  console.log('Step 1: Fetching product URLs for redirects...\n');

  for (const id of productIds) {
    try {
      const response = await new Promise((resolve, reject) => {
        const options = {
          hostname: 'api.bigcommerce.com',
          path: `/stores/${STORE_HASH}/v3/catalog/products/${id}`,
          method: 'GET',
          headers: {
            'X-Auth-Token': ACCESS_TOKEN,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        };

        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            if (res.statusCode === 200) {
              resolve(JSON.parse(data));
            } else {
              reject(new Error(`API Error ${res.statusCode}: ${data}`));
            }
          });
        });

        req.on('error', reject);
        req.setTimeout(10000, () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });

        req.end();
      });

      if (response.data && response.data.custom_url && response.data.custom_url.url) {
        urls[id] = response.data.custom_url.url;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 250));
    } catch (error) {
      console.log(`  ⚠ Could not get URL for product ${id}: ${error.message}`);
    }
  }

  console.log(`✓ Retrieved ${Object.keys(urls).length} product URLs\n`);
  return urls;
}

// Delete products from BigCommerce
async function deleteProducts() {
  const productIds = productsToDelete.map(p => p.product_id);

  // Get URLs first
  const productUrls = await getProductUrls(productIds);

  console.log('Step 2: Deleting products from BigCommerce...\n');

  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (const product of productsToDelete) {
    try {
      await new Promise((resolve, reject) => {
        const options = {
          hostname: 'api.bigcommerce.com',
          path: `/stores/${STORE_HASH}/v3/catalog/products/${product.product_id}`,
          method: 'DELETE',
          headers: {
            'X-Auth-Token': ACCESS_TOKEN,
            'Content-Type': 'application/json'
          }
        };

        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            if (res.statusCode === 204) {
              resolve();
            } else {
              reject(new Error(`API Error ${res.statusCode}: ${data}`));
            }
          });
        });

        req.on('error', reject);
        req.setTimeout(10000, () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });

        req.end();
      });

      successCount++;
      results.push({
        product_id: product.product_id,
        sku: product.sku,
        status: 'deleted',
        url: productUrls[product.product_id] || null
      });

      console.log(`✓ Deleted ${successCount}/${productsToDelete.length}: ${product.sku}`);

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 250));
    } catch (error) {
      failCount++;
      results.push({
        product_id: product.product_id,
        sku: product.sku,
        status: 'failed',
        error: error.message
      });

      console.log(`✗ Failed ${product.sku}: ${error.message}`);
    }
  }

  console.log('\n========================================');
  console.log('DELETION SUMMARY');
  console.log('========================================\n');
  console.log(`Total: ${productsToDelete.length}`);
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}\n`);

  // Save deletion report
  fs.writeFileSync(
    'kik-deletion-report.json',
    JSON.stringify(results, null, 2)
  );
  console.log('✓ Saved deletion report: kik-deletion-report.json\n');

  // Create redirects CSV
  console.log('Step 3: Creating 301 redirects CSV...\n');

  const redirects = results
    .filter(r => r.status === 'deleted' && r.url)
    .map(r => ({
      domain: 'www.buyorganicsonline.com.au',
      old_path: r.url,
      new_path: '/'
    }));

  // CSV format for BigCommerce
  const csvHeader = 'Domain,Old Path,Manual URL/Path,Dynamic Target Type,Dynamic Target ID';
  const csvRows = redirects.map(r =>
    `${r.domain},${r.old_path},${r.new_path},,`
  );
  const csv = [csvHeader, ...csvRows].join('\n');

  fs.writeFileSync('kik-redirects.csv', csv);
  console.log(`✓ Created redirects CSV: kik-redirects.csv (${redirects.length} redirects)\n`);

  console.log('========================================');
  console.log('NEXT STEPS');
  console.log('========================================\n');
  console.log('1. Run delete-kik-from-supabase.js to remove from database');
  console.log('2. Upload kik-redirects.csv to BigCommerce Settings → 301 Redirects\n');
}

deleteProducts().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
