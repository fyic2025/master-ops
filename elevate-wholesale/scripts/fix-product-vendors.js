/**
 * Fix Product Vendors for Elevate Wholesale
 *
 * This script:
 * 1. Updates product vendors to proper brand names based on product_type
 * 2. Hides junk products by setting them to draft status
 *
 * Usage:
 *   node fix-product-vendors.js --dry-run   # Preview changes without applying
 *   node fix-product-vendors.js             # Apply changes
 */

const crypto = require('crypto');
const https = require('https');

// Vault decryption
const ENCRYPTION_KEY = 'mstr-ops-vault-2024-secure-key';

function decrypt(encryptedBase64) {
  const encrypted = Buffer.from(encryptedBase64.replace(/\n/g, ''), 'base64');
  const iv = Buffer.alloc(16, 0);
  const keyBuffer = Buffer.alloc(32);
  Buffer.from(ENCRYPTION_KEY).copy(keyBuffer);
  const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
  decipher.setAutoPadding(true);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString('utf8');
}

// Shopify credentials
const SHOPIFY_URL = decrypt('ZCTP5BeTQowS4F5dMQsiuKOx7leHMHnueS4E6U6z//4=');
const SHOPIFY_TOKEN = decrypt('2PZKFyFinfT78bsrHW3ndJXNoc408Wy2rNWhbfDQyQVlbNlDoJdKK4WRPKScLq3Q');

// Brand mapping: product_type -> vendor (brand name)
const BRAND_MAPPING = {
  'Ausganica': 'Ausganica',
  'Ausganica - Export': 'Ausganica',
  'Teelixir': 'Teelixir',
  'Teelixir Samples': 'Teelixir',
  'Kialla Pure Foods': 'Kialla Pure Foods',
  'Biologika': 'Biologika',
  'Exmild': 'Exmild',
  'Base Soaps': 'Base Soaps',
  'Miessence': 'Miessence',
  'EcoLogic': 'EcoLogic',
  'Acacia Aroma Therapy': 'Acacia Aromatherapy',
  'RiceUp': 'RiceUp',
  'Nutrileaf': 'Nutrileaf',
  'Extremely Alive': 'Extremely Alive',
  'Crystal Mines': 'Crystal Mines',
  'Organic Papa': 'Organic Papa',
  'Ylang Ylang Complete Oil': 'Ausganica', // Likely Ausganica product
};

// Junk product types to hide (set to draft)
const JUNK_TYPES = [
  'vvvvv', 'vvvv', 'vvv', 'vv', 'v', 'vvvvvv',
  'yy', 'yyyy', 'yyyyy', 'y',
  'zx', 'zxz', 'xzxzx',
  'xx', 'x', 'xxxxx',
  'zz', 'zzzzz', 'zzzzzz', 'zzzzzzz',
  'No Type'
];

// API helper
function shopifyRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SHOPIFY_URL,
      port: 443,
      path: `/admin/api/2024-10${path}`,
      method: method,
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_TOKEN,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      const linkHeader = res.headers['link'];
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`API Error (${res.statusCode}): ${responseData}`));
        } else {
          try {
            resolve({ data: JSON.parse(responseData), link: linkHeader, status: res.statusCode });
          } catch (e) {
            resolve({ data: responseData, link: linkHeader, status: res.statusCode });
          }
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

// Fetch all products with pagination
async function fetchAllProducts() {
  let allProducts = [];
  let path = '/products.json?limit=250&fields=id,title,vendor,product_type,status';

  while (path) {
    const result = await shopifyRequest('GET', path);
    allProducts = allProducts.concat(result.data.products || []);

    // Parse next page
    if (result.link) {
      const nextMatch = result.link.match(/<([^>]+)>;\s*rel="next"/);
      if (nextMatch) {
        path = nextMatch[1].replace(`https://${SHOPIFY_URL}/admin/api/2024-10`, '');
      } else {
        path = null;
      }
    } else {
      path = null;
    }

    console.log(`  Fetched ${allProducts.length} products...`);
  }

  return allProducts;
}

// Update a single product
async function updateProduct(productId, updates) {
  return shopifyRequest('PUT', `/products/${productId}.json`, { product: updates });
}

// Rate limiting helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main execution
async function main() {
  const dryRun = process.argv.includes('--dry-run');

  console.log('='.repeat(60));
  console.log('Elevate Wholesale - Fix Product Vendors');
  console.log('='.repeat(60));
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (changes will be applied)'}`);
  console.log('');

  // Fetch all products
  console.log('Fetching all products...');
  const products = await fetchAllProducts();
  console.log(`Total products: ${products.length}\n`);

  // Categorize products
  const toUpdateVendor = [];
  const toHide = [];
  const alreadyCorrect = [];
  const unknown = [];

  for (const product of products) {
    const productType = product.product_type || 'No Type';

    if (JUNK_TYPES.includes(productType)) {
      // Junk product - hide it
      if (product.status !== 'draft') {
        toHide.push({
          id: product.id,
          title: product.title,
          product_type: productType,
          current_status: product.status
        });
      }
    } else if (BRAND_MAPPING[productType]) {
      // Known brand - check if vendor needs update
      const correctVendor = BRAND_MAPPING[productType];
      if (product.vendor !== correctVendor) {
        toUpdateVendor.push({
          id: product.id,
          title: product.title,
          product_type: productType,
          current_vendor: product.vendor,
          new_vendor: correctVendor
        });
      } else {
        alreadyCorrect.push(product);
      }
    } else {
      // Unknown product type
      unknown.push({
        id: product.id,
        title: product.title,
        product_type: productType,
        vendor: product.vendor
      });
    }
  }

  // Report
  console.log('Analysis Results:');
  console.log('-'.repeat(60));
  console.log(`  Products with correct vendor: ${alreadyCorrect.length}`);
  console.log(`  Products needing vendor update: ${toUpdateVendor.length}`);
  console.log(`  Junk products to hide: ${toHide.length}`);
  console.log(`  Unknown product types: ${unknown.length}`);
  console.log('');

  if (unknown.length > 0) {
    console.log('Unknown product types (need manual review):');
    const unknownTypes = [...new Set(unknown.map(p => p.product_type))];
    unknownTypes.forEach(t => {
      const count = unknown.filter(p => p.product_type === t).length;
      console.log(`  - "${t}" (${count} products)`);
    });
    console.log('');
  }

  if (dryRun) {
    console.log('DRY RUN - Preview of changes:');
    console.log('-'.repeat(60));

    console.log('\nVendor updates (first 10):');
    toUpdateVendor.slice(0, 10).forEach(p => {
      console.log(`  [${p.id}] "${p.title.substring(0, 40)}..."`);
      console.log(`         ${p.current_vendor} -> ${p.new_vendor}`);
    });
    if (toUpdateVendor.length > 10) {
      console.log(`  ... and ${toUpdateVendor.length - 10} more`);
    }

    console.log('\nProducts to hide (first 10):');
    toHide.slice(0, 10).forEach(p => {
      console.log(`  [${p.id}] "${p.title.substring(0, 40)}..." (type: ${p.product_type})`);
    });
    if (toHide.length > 10) {
      console.log(`  ... and ${toHide.length - 10} more`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('Run without --dry-run to apply these changes');
    return;
  }

  // Apply changes
  console.log('Applying changes...\n');

  // Update vendors
  let vendorUpdated = 0;
  let vendorErrors = 0;

  console.log('Updating vendors...');
  for (const product of toUpdateVendor) {
    try {
      await updateProduct(product.id, { vendor: product.new_vendor });
      vendorUpdated++;
      if (vendorUpdated % 50 === 0) {
        console.log(`  Updated ${vendorUpdated}/${toUpdateVendor.length} vendors`);
      }
      // Rate limiting - Shopify allows 2 requests/second for REST API
      await sleep(500);
    } catch (error) {
      console.error(`  Error updating ${product.id}: ${error.message}`);
      vendorErrors++;
    }
  }
  console.log(`  Vendor updates complete: ${vendorUpdated} success, ${vendorErrors} errors\n`);

  // Hide junk products
  let hidden = 0;
  let hideErrors = 0;

  console.log('Hiding junk products...');
  for (const product of toHide) {
    try {
      await updateProduct(product.id, { status: 'draft' });
      hidden++;
      if (hidden % 20 === 0) {
        console.log(`  Hidden ${hidden}/${toHide.length} products`);
      }
      await sleep(500);
    } catch (error) {
      console.error(`  Error hiding ${product.id}: ${error.message}`);
      hideErrors++;
    }
  }
  console.log(`  Hiding complete: ${hidden} success, ${hideErrors} errors\n`);

  // Summary
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`  Vendors updated: ${vendorUpdated}`);
  console.log(`  Products hidden: ${hidden}`);
  console.log(`  Errors: ${vendorErrors + hideErrors}`);
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
