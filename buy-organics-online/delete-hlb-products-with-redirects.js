const https = require('https');
const fs = require('fs');

const STORE_HASH = 'hhhi';
const ACCESS_TOKEN = 'ttf2mji7i912znhbue9gauvu7fbiiyo';

// Category redirect URLs
const CATEGORY_URLS = {
  noodles: '/noodles/',
  oils: '/plant-animal-oils/',
  homepage: '/'
};

// Product mapping from the JSON file
const productsToDelete = [
  // King Soba Noodles/Ramen - redirect to noodles category
  { product_id: 63654, sku: 'HLB - KHA', name: 'King Soba Organic Tom Kha Noodle Cup', redirect_to: CATEGORY_URLS.noodles },
  { product_id: 63643, sku: 'HLB - KS5', name: 'King Soba Brown Rice Ramen 280g', redirect_to: CATEGORY_URLS.noodles },
  { product_id: 63636, sku: 'HLB - KS6', name: 'King Soba Buckwheat Ramen 280g', redirect_to: CATEGORY_URLS.noodles },
  { product_id: 63658, sku: 'HLB - LAKSA', name: 'King Soba Organic Laksa Curry Ramen Noodles', redirect_to: CATEGORY_URLS.noodles },
  { product_id: 63656, sku: 'HLB - TAHINI', name: 'King Soba Organic Coconut Tahini Ramen Noodles', redirect_to: CATEGORY_URLS.noodles },
  { product_id: 63657, sku: 'HLB - Tom', name: 'King Soba Organic Tom Yum Noodle Cup', redirect_to: CATEGORY_URLS.noodles },
  { product_id: 63653, sku: 'HLB - YUM', name: 'King Soba Organic Tom Yum Noodle Cup 80g', redirect_to: CATEGORY_URLS.noodles },

  // Every Bit Organic Oils - redirect to oils category
  { product_id: 33718, sku: 'HLB - RAW00', name: 'Every Bit Organic Raw Sweet Almond Oil 500ml', redirect_to: CATEGORY_URLS.oils },
  { product_id: 34596, sku: 'HLB - RAW24', name: 'Every Bit Organic Raw Rosehip Oil 25ml', redirect_to: CATEGORY_URLS.oils },
  { product_id: 32140, sku: 'HLB - RAW84', name: 'Every Bit Organic Raw Refined Coconut Oil 1kg', redirect_to: CATEGORY_URLS.oils },

  // Himalayan Salt - redirect to homepage
  { product_id: 32143, sku: 'HLB - RS02', name: 'Himalayan Fine Salt 1kg Every Bit Organic Raw', redirect_to: CATEGORY_URLS.homepage }
];

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

// Create a 301 redirect
async function createRedirect(fromPath, toPath) {
  try {
    const redirectData = {
      from_path: fromPath,
      to_path: toPath,
      to_type: 'manual'
    };

    await makeApiRequest('POST', '/v3/storefront/redirects', redirectData);
    return true;
  } catch (error) {
    console.error(`  ✗ Error creating redirect:`, error.message);
    return false;
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
  console.log('🗑️  Starting HLB Product Deletion with 301 Redirects\n');
  console.log('═══════════════════════════════════════════════════\n');

  const results = {
    redirectsCreated: [],
    redirectsFailed: [],
    productsDeleted: [],
    productDeletesFailed: []
  };

  for (const product of productsToDelete) {
    console.log(`\n📦 Processing: ${product.name}`);
    console.log(`   SKU: ${product.sku}`);
    console.log(`   Product ID: ${product.product_id}`);

    // Step 1: Get the product's current URL
    const productUrl = await getProductUrl(product.product_id);

    if (productUrl) {
      console.log(`   Current URL: ${productUrl}`);
      console.log(`   Redirect to: ${product.redirect_to}`);

      // Step 2: Create 301 redirect
      console.log('   Creating 301 redirect...');
      const redirectCreated = await createRedirect(productUrl, product.redirect_to);

      if (redirectCreated) {
        console.log('   ✓ Redirect created successfully');
        results.redirectsCreated.push({
          product_id: product.product_id,
          sku: product.sku,
          from: productUrl,
          to: product.redirect_to
        });
      } else {
        console.log('   ✗ Failed to create redirect');
        results.redirectsFailed.push({
          product_id: product.product_id,
          sku: product.sku,
          from: productUrl,
          to: product.redirect_to
        });
      }
    } else {
      console.log('   ⚠ Could not retrieve product URL (product may already be deleted)');
    }

    // Step 3: Delete the product
    console.log('   Deleting product from BigCommerce...');
    const productDeleted = await deleteProduct(product.product_id);

    if (productDeleted) {
      console.log('   ✓ Product deleted successfully');
      results.productsDeleted.push({
        product_id: product.product_id,
        sku: product.sku,
        name: product.name
      });
    } else {
      console.log('   ✗ Failed to delete product');
      results.productDeletesFailed.push({
        product_id: product.product_id,
        sku: product.sku,
        name: product.name
      });
    }

    // Rate limiting - wait between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Generate summary report
  console.log('\n\n═══════════════════════════════════════════════════');
  console.log('📊 DELETION SUMMARY');
  console.log('═══════════════════════════════════════════════════\n');

  console.log(`✓ Redirects Created: ${results.redirectsCreated.length}`);
  console.log(`✗ Redirects Failed: ${results.redirectsFailed.length}`);
  console.log(`✓ Products Deleted: ${results.productsDeleted.length}`);
  console.log(`✗ Product Deletions Failed: ${results.productDeletesFailed.length}`);

  // Save detailed results
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      redirectsCreated: results.redirectsCreated.length,
      redirectsFailed: results.redirectsFailed.length,
      productsDeleted: results.productsDeleted.length,
      productDeletesFailed: results.productDeletesFailed.length
    },
    details: results
  };

  const reportPath = 'hlb-deletion-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  console.log(`\n✓ Detailed report saved to: ${reportPath}`);

  // Output product IDs for Supabase deletion
  const productIdsForSupabase = results.productsDeleted.map(p => p.product_id);
  console.log('\n\n═══════════════════════════════════════════════════');
  console.log('🗄️  PRODUCT IDs FOR SUPABASE DELETION');
  console.log('═══════════════════════════════════════════════════\n');
  console.log(productIdsForSupabase.join(', '));

  fs.writeFileSync('hlb-product-ids-for-supabase.txt', productIdsForSupabase.join('\n'));
  console.log('\n✓ Product IDs saved to: hlb-product-ids-for-supabase.txt');

  console.log('\n\n✅ Process completed!');
}

// Run the script
processProductDeletions().catch(error => {
  console.error('\n❌ Fatal Error:', error.message);
  process.exit(1);
});
