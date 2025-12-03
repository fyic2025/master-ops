#!/usr/bin/env node
/**
 * Sync Elevate Shopify products to Supabase
 *
 * This script fetches all products from Elevate Shopify and syncs them
 * to the elevate_products table in Supabase. This creates the base data
 * for RRP tracking - RRPs are populated separately.
 *
 * Usage: node scripts/sync-elevate-products-to-supabase.js
 */

const https = require('https');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load credentials
const credsPath = path.join(__dirname, '..', 'creds.js');
const creds = require(credsPath);

async function getCredentials() {
  const [
    shopifyToken,
    shopifyUrl,
    supabaseUrl,
    supabaseKey
  ] = await Promise.all([
    creds.get('elevate', 'shopify_access_token'),
    creds.get('elevate', 'shopify_store_url'),
    creds.get('elevate', 'supabase_url'),
    creds.get('elevate', 'supabase_service_role_key')
  ]);

  return { shopifyToken, shopifyUrl, supabaseUrl, supabaseKey };
}

function shopifyRequest(shopDomain, accessToken, endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: shopDomain.replace('https://', '').replace('/', ''),
      path: '/admin/api/2024-01' + endpoint,
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ data: JSON.parse(data), headers: res.headers });
        } else {
          reject(new Error(`API Error ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function fetchAllProducts(shopDomain, accessToken) {
  console.log('Fetching products from Elevate Shopify...');

  let allProducts = [];
  let nextPageUrl = null;
  let page = 1;

  while (true) {
    // First page uses limit, subsequent pages use page_info only
    let endpoint;
    if (nextPageUrl) {
      // Extract just the path from the full URL
      const url = new URL(nextPageUrl);
      endpoint = url.pathname + url.search;
      // Remove the /admin/api/2024-01 prefix since shopifyRequest adds it
      endpoint = endpoint.replace('/admin/api/2024-01', '');
    } else {
      endpoint = '/products.json?limit=250';
    }

    const { data, headers } = await shopifyRequest(shopDomain, accessToken, endpoint);
    allProducts = allProducts.concat(data.products);

    console.log(`  Page ${page}: ${data.products.length} products (total: ${allProducts.length})`);

    // Check for pagination - look for rel="next" link
    const linkHeader = headers['link'];
    if (linkHeader) {
      // Parse Link header: <url>; rel="next", <url>; rel="previous"
      const links = linkHeader.split(',');
      nextPageUrl = null;
      for (const link of links) {
        if (link.includes('rel="next"')) {
          const match = link.match(/<([^>]+)>/);
          if (match) {
            nextPageUrl = match[1];
            break;
          }
        }
      }
      if (nextPageUrl) {
        page++;
        await new Promise(r => setTimeout(r, 500)); // Rate limit
        continue;
      }
    }
    break;
  }

  return allProducts;
}

async function syncToSupabase(supabase, products) {
  console.log('\nSyncing to Supabase...');

  let synced = 0;
  let errors = 0;

  for (const product of products) {
    for (const variant of product.variants) {
      const record = {
        elevate_product_id: product.id,
        elevate_variant_id: variant.id,
        sku: variant.sku || null,
        title: product.title,
        variant_title: variant.title !== 'Default Title' ? variant.title : null,
        vendor: product.vendor || null,
        wholesale_price: parseFloat(variant.price) || null,
        last_synced_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('elevate_products')
        .upsert(record, {
          onConflict: 'elevate_variant_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error(`  Error syncing ${variant.sku}: ${error.message}`);
        errors++;
      } else {
        synced++;
      }
    }
  }

  return { synced, errors };
}

async function main() {
  console.log('='.repeat(60));
  console.log('ELEVATE PRODUCTS → SUPABASE SYNC');
  console.log('='.repeat(60));
  console.log();

  try {
    // Get credentials
    const { shopifyToken, shopifyUrl, supabaseUrl, supabaseKey } = await getCredentials();

    if (!shopifyToken || !shopifyUrl) {
      throw new Error('Missing Elevate Shopify credentials');
    }
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Elevate Supabase credentials');
    }

    // Initialize Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch products from Shopify
    const products = await fetchAllProducts(shopifyUrl, shopifyToken);

    // Count variants
    const variantCount = products.reduce((sum, p) => sum + p.variants.length, 0);
    console.log(`\nTotal: ${products.length} products, ${variantCount} variants`);

    // Sync to Supabase
    const { synced, errors } = await syncToSupabase(supabase, products);

    console.log('\n' + '='.repeat(60));
    console.log('SYNC COMPLETE');
    console.log('='.repeat(60));
    console.log(`  Synced: ${synced} variants`);
    console.log(`  Errors: ${errors}`);

    // Show vendor breakdown
    const vendors = {};
    products.forEach(p => {
      vendors[p.vendor || 'Unknown'] = (vendors[p.vendor || 'Unknown'] || 0) + p.variants.length;
    });

    console.log('\nVendor breakdown:');
    Object.entries(vendors)
      .sort((a, b) => b[1] - a[1])
      .forEach(([vendor, count]) => {
        console.log(`  ${vendor}: ${count} variants`);
      });

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
