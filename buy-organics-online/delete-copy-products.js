const https = require('https');
const fs = require('fs');

const STORE_HASH = 'hhhi';
const ACCESS_TOKEN = 'ttf2mji7i912znhbue9gauvu7fbiiyo';

// Load products from the JSON file
const products = JSON.parse(fs.readFileSync('copy-products-to-delete.json', 'utf8'));

console.log(`Loaded ${products.length} products to delete\n`);

// API request helper
function makeApiRequest(method, path, data = null) {
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

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Get product URL by product ID
async function getProductUrl(productId) {
  try {
    const response = await makeApiRequest('GET', `/v3/catalog/products/${productId}`);
    if (response.success && response.data && response.data.data) {
      return response.data.data.custom_url?.url || null;
    }
    return null;
  } catch (error) {
    console.error(`  ✗ Error fetching URL for product ${productId}:`, error.message);
    return null;
  }
}

// Delete a product
async function deleteProduct(productId) {
  try {
    await makeApiRequest('DELETE', `/v3/catalog/products/${productId}`);
    return true;
  } catch (error) {
    console.error(`  ✗ Error deleting product:`, error.message);
    return false;
  }
}

// Main execution
async function processProductDeletions() {
  console.log('🗑️  Starting COPY Products Deletion\n');
  console.log('═══════════════════════════════════════════════════\n');

  const results = {
    redirectsNeeded: [],
    productsDeleted: [],
    productDeletesFailed: []
  };

  let count = 0;
  for (const product of products) {
    count++;
    console.log(`\n[${count}/${products.length}] Processing: ${product.name}`);
    console.log(`   SKU: ${product.sku}`);
    console.log(`   Product ID: ${product.product_id}`);

    // Step 1: Get the product's current URL for redirect record
    const productUrl = await getProductUrl(product.product_id);

    if (productUrl) {
      console.log(`   URL: ${productUrl}`);
      results.redirectsNeeded.push({
        product_id: product.product_id,
        sku: product.sku,
        from: productUrl,
        to: '/'
      });
    } else {
      console.log('   ⚠ Could not retrieve product URL');
    }

    // Step 2: Delete the product
    console.log('   Deleting product from BigCommerce...');
    const productDeleted = await deleteProduct(product.product_id);

    if (productDeleted) {
      console.log('   ✓ Deleted');
      results.productsDeleted.push({
        product_id: product.product_id,
        sku: product.sku,
        name: product.name
      });
    } else {
      console.log('   ✗ Failed to delete');
      results.productDeletesFailed.push({
        product_id: product.product_id,
        sku: product.sku,
        name: product.name
      });
    }

    // Rate limiting - wait between requests (250ms)
    await new Promise(resolve => setTimeout(resolve, 250));
  }

  // Generate summary report
  console.log('\n\n═══════════════════════════════════════════════════');
  console.log('📊 DELETION SUMMARY');
  console.log('═══════════════════════════════════════════════════\n');

  console.log(`✓ Products Deleted: ${results.productsDeleted.length}`);
  console.log(`✗ Product Deletions Failed: ${results.productDeletesFailed.length}`);
  console.log(`📝 Redirects Needed: ${results.redirectsNeeded.length}`);

  // Save detailed results
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      productsDeleted: results.productsDeleted.length,
      productDeletesFailed: results.productDeletesFailed.length,
      redirectsNeeded: results.redirectsNeeded.length
    },
    details: results
  };

  const reportPath = 'copy-deletion-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  console.log(`\n✓ Detailed report saved to: ${reportPath}`);

  // Create CSV for redirects
  const csvRows = ['Domain,Old Path,Manual URL/Path,Dynamic Target Type,Dynamic Target ID'];
  results.redirectsNeeded.forEach(r => {
    csvRows.push(`www.buyorganicsonline.com.au,${r.from},/,,`);
  });

  fs.writeFileSync('copy-redirects.csv', csvRows.join('\n'));
  console.log(`✓ Redirects CSV saved to: copy-redirects.csv`);

  // Output product IDs for Supabase deletion
  const productIdsForSupabase = results.productsDeleted.map(p => p.product_id);
  console.log('\n\n═══════════════════════════════════════════════════');
  console.log('🗄️  PRODUCT IDs FOR SUPABASE DELETION');
  console.log('═══════════════════════════════════════════════════\n');
  console.log(`${productIdsForSupabase.length} products`);

  fs.writeFileSync('copy-product-ids-for-supabase.txt', productIdsForSupabase.join('\n'));
  console.log('\n✓ Product IDs saved to: copy-product-ids-for-supabase.txt');

  console.log('\n\n✅ Process completed!');
}

// Run the script
processProductDeletions().catch(error => {
  console.error('\n❌ Fatal Error:', error.message);
  process.exit(1);
});
