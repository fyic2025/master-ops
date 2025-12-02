#!/usr/bin/env node
/**
 * Sync GST status from Unleashed to Supabase and then to Shopify
 *
 * Step 1: Pull all products from Unleashed with tax info
 * Step 2: Update has_gst in elevate_products table
 * Step 3: Push has_gst metafield to Shopify (active products first)
 */
const https = require('https');
const crypto = require('crypto');
const path = require('path');
const creds = require(path.join(__dirname, '..', 'creds.js'));
const { createClient } = require('@supabase/supabase-js');

// Unleashed API credentials (Elevate uses same Unleashed as BOO)
const API_ID = '336a6015-eae0-43ab-83eb-e08121e7655d';
const API_KEY = 'SNX5bNJMLV3VaTbMK1rXMAiEUFdO96bLT5epp6ph8DJvc1WH5aJMRLihc2J0OyzVfKsA3xXpQgWIQANLxkQ==';
const API_BASE = 'api.unleashedsoftware.com';

// Unleashed API request
function makeUnleashedRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const queryString = '';
    const signature = crypto
      .createHmac('sha256', API_KEY)
      .update(queryString)
      .digest('base64');

    const options = {
      hostname: API_BASE,
      path: endpoint,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'api-auth-id': API_ID,
        'api-auth-signature': signature
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
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

// Check if product has GST based on Unleashed tax fields
// Unleashed uses: TaxableSales, XeroSalesTaxCode, XeroSalesTaxRate
function hasGST(product) {
  // Primary check: TaxableSales boolean
  if (product.TaxableSales === false) {
    return false;
  }

  // Secondary check: XeroSalesTaxRate (0.1 = 10% GST)
  if (product.XeroSalesTaxRate === 0 || product.XeroSalesTaxRate === null) {
    return false;
  }

  // Check XeroSalesTaxCode for GST-free indicators
  const taxCode = product.XeroSalesTaxCode || '';
  const taxCodeUpper = taxCode.toUpperCase();

  // GST-free codes typically contain: FREE, FRE, EXEMPT, ZERO, N/A
  const gstFreePatterns = ['FREE', 'FRE', 'EXEMPT', 'ZERO', 'N/A', 'NONE', 'NIL', 'BAS EXCLUDED'];

  for (const pattern of gstFreePatterns) {
    if (taxCodeUpper.includes(pattern)) {
      return false;
    }
  }

  // If TaxableSales is true and has tax rate, it has GST
  return product.TaxableSales === true;
}

async function main() {
  const args = process.argv.slice(2);
  const activeOnly = args.includes('--active-only');
  const dryRun = args.includes('--dry-run');
  const checkOnly = args.includes('--check');

  console.log('='.repeat(60));
  console.log('SYNC GST STATUS FROM UNLEASHED');
  console.log('='.repeat(60));
  console.log();

  if (checkOnly) {
    // Just check what fields are available
    console.log('Checking Unleashed product structure...\n');
    const response = await makeUnleashedRequest('/Products/1');
    if (response.Items && response.Items.length > 0) {
      const sample = response.Items[0];
      console.log('Sample product fields:');
      Object.keys(sample).forEach(key => {
        const value = sample[key];
        const display = typeof value === 'object' ? JSON.stringify(value).slice(0, 60) : value;
        console.log(`  ${key}: ${display}`);
      });
    }
    return;
  }

  const [token, shopifyUrl, supabaseUrl, supabaseKey] = await Promise.all([
    creds.get('elevate', 'shopify_access_token'),
    creds.get('elevate', 'shopify_store_url'),
    creds.get('elevate', 'supabase_url'),
    creds.get('elevate', 'supabase_service_role_key')
  ]);

  const supabase = createClient(supabaseUrl, supabaseKey);
  const hostname = shopifyUrl.replace('https://', '').replace('/', '');

  // Step 1: Fetch all products from Unleashed
  console.log('Step 1: Fetching products from Unleashed...\n');

  let allProducts = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await makeUnleashedRequest(`/Products/${page}`);
    if (response.Items && response.Items.length > 0) {
      console.log(`  Page ${page}: ${response.Items.length} products`);
      allProducts = allProducts.concat(response.Items);
      page++;
      hasMore = response.Pagination && response.Pagination.NumberOfPages > page - 1;
    } else {
      hasMore = false;
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log(`\nFetched ${allProducts.length} products from Unleashed\n`);

  // Create SKU -> GST mapping
  const gstMap = new Map();
  let withGST = 0;
  let withoutGST = 0;

  for (const product of allProducts) {
    const sku = product.ProductCode;
    const productHasGST = hasGST(product);
    gstMap.set(sku, productHasGST);
    if (productHasGST) withGST++;
    else withoutGST++;
  }

  console.log(`GST Status:`);
  console.log(`  With GST: ${withGST}`);
  console.log(`  GST-free: ${withoutGST}`);
  console.log();

  if (dryRun) {
    console.log('DRY RUN - Not updating database');
    return;
  }

  // Step 2: Update Supabase with GST status
  console.log('Step 2: Updating Supabase with GST status...\n');

  // Get all products from elevate_products
  const { data: elevateProducts, error: fetchError } = await supabase
    .from('elevate_products')
    .select('id, sku, has_gst')
    .not('sku', 'is', null);

  if (fetchError) {
    console.error('Error fetching products:', fetchError.message);
    process.exit(1);
  }

  console.log(`Found ${elevateProducts.length} products in elevate_products\n`);

  let updated = 0;
  let matched = 0;
  let notFound = 0;

  for (const product of elevateProducts) {
    // Try to match SKU (handle KIK - prefix variations)
    let productHasGST = null;

    // Try exact match first
    if (gstMap.has(product.sku)) {
      productHasGST = gstMap.get(product.sku);
      matched++;
    } else {
      // Try without KIK prefix
      const skuWithoutPrefix = product.sku.replace(/^KIK\s*-\s*/, '');
      if (gstMap.has(skuWithoutPrefix)) {
        productHasGST = gstMap.get(skuWithoutPrefix);
        matched++;
      } else {
        notFound++;
        continue;
      }
    }

    // Update if different from current value
    if (productHasGST !== product.has_gst) {
      const { error: updateError } = await supabase
        .from('elevate_products')
        .update({ has_gst: productHasGST })
        .eq('id', product.id);

      if (!updateError) {
        updated++;
      }
    }
  }

  console.log(`Supabase update complete:`);
  console.log(`  Matched: ${matched}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Not found in Unleashed: ${notFound}`);
  console.log();

  // Step 3: Push to Shopify (active products only if flag set)
  console.log('Step 3: Pushing has_gst to Shopify...\n');

  // Get products that need GST metafield pushed
  let query = supabase
    .from('elevate_products')
    .select('id, sku, elevate_variant_id, has_gst')
    .not('elevate_variant_id', 'is', null)
    .not('has_gst', 'is', null);

  const { data: productsToSync, error: syncError } = await query;

  if (syncError) {
    console.error('Error:', syncError.message);
    process.exit(1);
  }

  console.log(`Products to sync: ${productsToSync.length}`);

  // If active-only, we need to filter by Shopify product status
  // We'll get the list of active variant IDs from Shopify first
  let activeVariantIds = new Set();

  if (activeOnly) {
    console.log('Fetching active products from Shopify...');

    // Get all active products
    let cursor = null;
    let hasNextPage = true;

    while (hasNextPage) {
      const gqlQuery = `{
        products(first: 250, query: "status:active"${cursor ? `, after: "${cursor}"` : ''}) {
          edges {
            node {
              variants(first: 100) {
                edges {
                  node {
                    legacyResourceId
                  }
                }
              }
            }
            cursor
          }
          pageInfo {
            hasNextPage
          }
        }
      }`;

      const result = await new Promise((resolve, reject) => {
        const data = JSON.stringify({ query: gqlQuery });
        const options = {
          hostname,
          path: '/admin/api/2024-01/graphql.json',
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': token,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
          }
        };

        const req = https.request(options, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => resolve(JSON.parse(body)));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
      });

      if (result.data?.products?.edges) {
        for (const edge of result.data.products.edges) {
          cursor = edge.cursor;
          for (const variant of edge.node.variants.edges) {
            activeVariantIds.add(variant.node.legacyResourceId);
          }
        }
        hasNextPage = result.data.products.pageInfo.hasNextPage;
      } else {
        hasNextPage = false;
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`Found ${activeVariantIds.size} active variants\n`);
  }

  // Filter products if active-only
  const filteredProducts = activeOnly
    ? productsToSync.filter(p => activeVariantIds.has(String(p.elevate_variant_id)))
    : productsToSync;

  console.log(`Syncing ${filteredProducts.length} products to Shopify...\n`);

  let synced = 0;
  let errors = 0;

  for (const product of filteredProducts) {
    const mutation = `
      mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { id }
          userErrors { field message }
        }
      }
    `;

    const variables = {
      metafields: [{
        ownerId: `gid://shopify/ProductVariant/${product.elevate_variant_id}`,
        namespace: 'custom',
        key: 'has_gst',
        type: 'boolean',
        value: String(product.has_gst)
      }]
    };

    const result = await new Promise((resolve, reject) => {
      const data = JSON.stringify({ query: mutation, variables });
      const options = {
        hostname,
        path: '/admin/api/2024-01/graphql.json',
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': token,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve(JSON.parse(body)));
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });

    if (result.data?.metafieldsSet?.userErrors?.length > 0) {
      errors++;
      console.log(`  x ${product.sku}: ${result.data.metafieldsSet.userErrors[0].message}`);
    } else if (result.errors) {
      errors++;
    } else {
      synced++;
      const gstLabel = product.has_gst ? 'Yes' : 'No';
      console.log(`  ✓ ${product.sku}: GST=${gstLabel}`);
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n' + '='.repeat(60));
  console.log('COMPLETE');
  console.log('='.repeat(60));
  console.log(`  Synced to Shopify: ${synced}`);
  console.log(`  Errors: ${errors}`);
}

main().catch(console.error);
