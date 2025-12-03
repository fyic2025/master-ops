#!/usr/bin/env node
/**
 * Sync Teelixir RRPs to Elevate Products in Supabase
 *
 * This script reads prices from Teelixir Shopify (which are RRPs)
 * and updates the elevate_products table to populate RRP for Teelixir products.
 *
 * IMPORTANT: This only READS from Teelixir - no writes to Teelixir store.
 *
 * Usage: node scripts/sync-teelixir-rrp-to-supabase.js
 */

const https = require('https');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load credentials
const credsPath = path.join(__dirname, '..', 'creds.js');
const creds = require(credsPath);

// Teelixir Shopify credentials (hardcoded as in shopify-rrp-check.js)
const TEELIXIR_SHOP_DOMAIN = 'teelixir-au.myshopify.com';
const TEELIXIR_ACCESS_TOKEN = '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';

async function getSupabaseCredentials() {
  const [supabaseUrl, supabaseKey] = await Promise.all([
    creds.get('elevate', 'supabase_url'),
    creds.get('elevate', 'supabase_service_role_key')
  ]);
  return { supabaseUrl, supabaseKey };
}

function shopifyRequest(shopDomain, accessToken, endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: shopDomain,
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

async function fetchTeelixirProducts() {
  console.log('Fetching products from Teelixir Shopify (READ ONLY)...');

  let allProducts = [];
  let pageInfo = null;
  let page = 1;

  while (true) {
    let endpoint = '/products.json?limit=250';
    if (pageInfo) {
      endpoint += `&page_info=${pageInfo}`;
    }

    const { data, headers } = await shopifyRequest(TEELIXIR_SHOP_DOMAIN, TEELIXIR_ACCESS_TOKEN, endpoint);
    allProducts = allProducts.concat(data.products);

    console.log(`  Page ${page}: ${data.products.length} products (total: ${allProducts.length})`);

    // Check for pagination
    const linkHeader = headers['link'];
    if (linkHeader && linkHeader.includes('rel="next"')) {
      const match = linkHeader.match(/page_info=([^>&]+).*rel="next"/);
      if (match) {
        pageInfo = match[1];
        page++;
        await new Promise(r => setTimeout(r, 500)); // Rate limit
        continue;
      }
    }
    break;
  }

  return allProducts;
}

function buildTeelixirSkuPriceMap(products) {
  // Build a map of SKU -> price from Teelixir products
  // The Teelixir Shopify prices ARE the RRP
  const skuPriceMap = {};

  for (const product of products) {
    for (const variant of product.variants) {
      if (variant.sku && variant.price) {
        const price = parseFloat(variant.price);
        if (price > 0) {
          skuPriceMap[variant.sku] = {
            price,
            title: product.title,
            variantTitle: variant.title
          };
        }
      }
    }
  }

  return skuPriceMap;
}

async function updateElevateRRPs(supabase, skuPriceMap) {
  console.log('\nUpdating RRPs in elevate_products table...');

  // Get all Elevate products that have SKUs
  const { data: elevateProducts, error: fetchError } = await supabase
    .from('elevate_products')
    .select('id, sku, title, rrp, rrp_source')
    .not('sku', 'is', null);

  if (fetchError) {
    throw new Error(`Error fetching Elevate products: ${fetchError.message}`);
  }

  console.log(`  Found ${elevateProducts.length} Elevate products with SKUs`);

  let matched = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const elevateProduct of elevateProducts) {
    const sku = elevateProduct.sku;
    const teelixirData = skuPriceMap[sku];

    if (teelixirData) {
      matched++;

      // Check if RRP needs update
      const currentRRP = elevateProduct.rrp ? parseFloat(elevateProduct.rrp) : null;
      const newRRP = teelixirData.price;

      // Only update if RRP is different or not set
      if (currentRRP !== newRRP) {
        const { error } = await supabase
          .from('elevate_products')
          .update({
            rrp: newRRP,
            rrp_source: 'teelixir_shopify'
          })
          .eq('id', elevateProduct.id);

        if (error) {
          console.error(`  Error updating ${sku}: ${error.message}`);
          errors++;
        } else {
          updated++;
          console.log(`  ✓ ${sku}: $${currentRRP || 'null'} → $${newRRP.toFixed(2)}`);
        }
      } else {
        skipped++;
      }
    }
  }

  return { matched, updated, skipped, errors };
}

async function main() {
  console.log('='.repeat(60));
  console.log('TEELIXIR RRP → ELEVATE SUPABASE SYNC');
  console.log('='.repeat(60));
  console.log('NOTE: Only READING from Teelixir Shopify');
  console.log();

  try {
    // Get Supabase credentials
    const { supabaseUrl, supabaseKey } = await getSupabaseCredentials();

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Elevate Supabase credentials');
    }

    // Initialize Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch Teelixir products (READ ONLY)
    const teelixirProducts = await fetchTeelixirProducts();

    // Build SKU -> price map
    const skuPriceMap = buildTeelixirSkuPriceMap(teelixirProducts);
    console.log(`\nBuilt price map: ${Object.keys(skuPriceMap).length} SKUs`);

    // Show sample
    console.log('\nSample Teelixir RRPs:');
    Object.entries(skuPriceMap).slice(0, 5).forEach(([sku, data]) => {
      console.log(`  ${sku}: $${data.price.toFixed(2)} (${data.title})`);
    });

    // Update Elevate products with RRPs
    const { matched, updated, skipped, errors } = await updateElevateRRPs(supabase, skuPriceMap);

    console.log('\n' + '='.repeat(60));
    console.log('SYNC COMPLETE');
    console.log('='.repeat(60));
    console.log(`  Matched SKUs:    ${matched}`);
    console.log(`  Updated RRPs:    ${updated}`);
    console.log(`  Skipped (same):  ${skipped}`);
    console.log(`  Errors:          ${errors}`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
