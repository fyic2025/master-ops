/**
 * Download Product Images from Stores
 *
 * Downloads product images from Shopify/BigCommerce to local folder
 *
 * Usage: node scripts/download-store-images.js <store> [limit]
 *
 * Examples:
 *   node scripts/download-store-images.js teelixir 50
 *   node scripts/download-store-images.js boo 100
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const creds = require('../creds.js');

const OUTPUT_DIR = 'C:\\Users\\jayso\\cloudinary-uploads';

async function downloadImage(url, filePath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filePath);

    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirect
        downloadImage(response.headers.location, filePath).then(resolve).catch(reject);
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(true);
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
}

async function getTeelixirProducts(limit) {
  const token = await creds.get('teelixir', 'shopify_access_token');
  const store = 'teelixir-au.myshopify.com';

  let allProducts = [];
  let url = `https://${store}/admin/api/2024-10/products.json?limit=250`;

  while (url && allProducts.length < limit) {
    const response = await fetch(url, {
      headers: { 'X-Shopify-Access-Token': token }
    });

    const data = await response.json();
    allProducts = allProducts.concat(data.products || []);

    // Check for next page in Link header
    const linkHeader = response.headers.get('link');
    if (linkHeader && linkHeader.includes('rel="next"')) {
      const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      url = match ? match[1] : null;
    } else {
      url = null;
    }
  }

  return allProducts.slice(0, limit);
}

async function getElevateProducts(limit) {
  const token = await creds.get('elevate', 'shopify_access_token');
  const store = 'elevatewholesale.myshopify.com';

  const response = await fetch(`https://${store}/admin/api/2024-10/products.json?limit=${limit}`, {
    headers: { 'X-Shopify-Access-Token': token }
  });

  const data = await response.json();
  return data.products || [];
}

async function getBOOProducts(limit) {
  const storeHash = await creds.get('boo', 'bigcommerce_store_hash');
  const token = await creds.get('boo', 'bigcommerce_access_token');

  const response = await fetch(`https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products?limit=${limit}&include=images`, {
    headers: {
      'X-Auth-Token': token,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();
  return data.data || [];
}

function sanitizeFilename(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

async function downloadStoreImages(store, limit = 50) {
  const storeDir = path.join(OUTPUT_DIR, store);

  // Create directories
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  if (!fs.existsSync(storeDir)) fs.mkdirSync(storeDir, { recursive: true });

  console.log(`\n📦 Downloading ${store} product images (limit: ${limit})...\n`);

  let products = [];

  try {
    if (store === 'teelixir') {
      products = await getTeelixirProducts(limit);
    } else if (store === 'elevate') {
      products = await getElevateProducts(limit);
    } else if (store === 'boo') {
      products = await getBOOProducts(limit);
    } else {
      console.error(`Unknown store: ${store}`);
      process.exit(1);
    }
  } catch (err) {
    console.error('Error fetching products:', err.message);
    process.exit(1);
  }

  console.log(`Found ${products.length} products\n`);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const product of products) {
    let imageUrl, productName;

    // Get image URL based on store type
    if (store === 'boo') {
      // BigCommerce
      productName = product.name;
      imageUrl = product.images?.[0]?.url_standard || product.images?.[0]?.url_thumbnail;
    } else {
      // Shopify
      productName = product.title;
      imageUrl = product.image?.src || product.images?.[0]?.src;
    }

    if (!imageUrl) {
      skipped++;
      continue;
    }

    const fileName = sanitizeFilename(productName) + '.jpg';
    const filePath = path.join(storeDir, fileName);

    // Skip if already exists
    if (fs.existsSync(filePath)) {
      process.stdout.write(`  ${fileName} (exists)\n`);
      skipped++;
      continue;
    }

    process.stdout.write(`  ${fileName}... `);

    try {
      await downloadImage(imageUrl, filePath);
      console.log('✅');
      downloaded++;
    } catch (err) {
      console.log('❌', err.message);
      failed++;
    }
  }

  console.log(`\n✅ Downloaded: ${downloaded}  ⏭️ Skipped: ${skipped}  ❌ Failed: ${failed}`);
  console.log(`\n📁 Images saved to: ${storeDir}`);
  console.log(`\n🚀 To upload to Cloudinary:`);
  console.log(`   node scripts/cloudinary-upload.js "${storeDir}" ${store}`);
}

async function main() {
  const [store, limit = '50'] = process.argv.slice(2);

  if (!store) {
    console.log(`
Download Product Images from Stores

Usage: node scripts/download-store-images.js <store> [limit]

Stores:
  teelixir    Teelixir Shopify store
  elevate     Elevate Wholesale Shopify store
  boo         Buy Organics Online BigCommerce store

Examples:
  node scripts/download-store-images.js teelixir 50
  node scripts/download-store-images.js boo 100
  node scripts/download-store-images.js elevate 25

Images will be saved to: ${OUTPUT_DIR}\\<store>\\
    `);
    process.exit(0);
  }

  await downloadStoreImages(store, parseInt(limit));
}

main().catch(console.error);
