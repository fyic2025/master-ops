const https = require('https');

const STORE_HASH = process.env.BC_STORE_HASH || 'YOUR_STORE_HASH';
const ACCESS_TOKEN = process.env.BC_ACCESS_TOKEN || 'YOUR_ACCESS_TOKEN';

console.log('Searching for Kalsio calcium supplement product...\n');

// Step 1: Search for the product
const searchOptions = {
  hostname: 'api.bigcommerce.com',
  path: `/stores/${STORE_HASH}/v3/catalog/products?keyword=kalsio`,
  method: 'GET',
  headers: {
    'X-Auth-Token': ACCESS_TOKEN,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

const searchReq = https.request(searchOptions, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      const response = JSON.parse(data);

      if (response.data && response.data.length > 0) {
        const product = response.data[0];
        console.log(`✓ Found product: ${product.name}`);
        console.log(`  Product ID: ${product.id}`);
        console.log(`  SKU: ${product.sku}`);
        console.log(`  Current visibility: ${product.is_visible}`);
        console.log(`  Price: $${product.price}\n`);

        // Step 2: Hide the product
        console.log('Hiding product...\n');

        const updateData = JSON.stringify({
          is_visible: false
        });

        const updateOptions = {
          hostname: 'api.bigcommerce.com',
          path: `/stores/${STORE_HASH}/v3/catalog/products/${product.id}`,
          method: 'PUT',
          headers: {
            'X-Auth-Token': ACCESS_TOKEN,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Content-Length': updateData.length
          }
        };

        const updateReq = https.request(updateOptions, (updateRes) => {
          let updateData = '';

          updateRes.on('data', (chunk) => {
            updateData += chunk;
          });

          updateRes.on('end', () => {
            if (updateRes.statusCode === 200) {
              console.log('✅ SUCCESS! Product hidden from storefront.');
              console.log('   Product is now invisible to customers and Google.');
              console.log('\n📝 Next steps:');
              console.log('   1. Upload invalid-product-fix.csv to BigCommerce redirects');
              console.log('   2. Wait 24 hours for Google to re-crawl');
              console.log('   3. Validate fix in GSC Product snippets\n');
            } else {
              console.log(`❌ Error hiding product: ${updateRes.statusCode}`);
              console.log(updateData);
            }
          });
        });

        updateReq.on('error', (error) => {
          console.error('❌ Request error:', error.message);
        });

        updateReq.write(updateData);
        updateReq.end();

      } else {
        console.log('❌ Product not found. It may already be deleted.');
        console.log('   Check BigCommerce admin to confirm.');
      }
    } else {
      console.log(`❌ API Error: ${res.statusCode}`);
      console.log(data);
    }
  });
});

searchReq.on('error', (error) => {
  console.error('❌ Request error:', error.message);
});

searchReq.end();
