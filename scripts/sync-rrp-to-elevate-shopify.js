#!/usr/bin/env node
/**
 * Sync RRPs from Supabase to Elevate Shopify Metafields
 *
 * This script reads RRP data from Supabase and pushes it to
 * Elevate Shopify as variant metafields.
 *
 * IMPORTANT: This is the script that WRITES to Elevate Shopify.
 * Run with --dry-run first to preview changes.
 *
 * Usage:
 *   node scripts/sync-rrp-to-elevate-shopify.js           # Actual sync
 *   node scripts/sync-rrp-to-elevate-shopify.js --dry-run # Preview only
 */

const https = require('https');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load credentials
const credsPath = path.join(__dirname, '..', 'creds.js');
const creds = require(credsPath);

const DRY_RUN = process.argv.includes('--dry-run');
const SINGLE = process.argv.includes('--single');
const LIMIT_ONE = process.argv.find(a => a.startsWith('--sku='));

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

function shopifyGraphQL(shopDomain, accessToken, query, variables = {}) {
  return new Promise((resolve, reject) => {
    const hostname = shopDomain.replace('https://', '').replace('/', '');
    const data = JSON.stringify({ query, variables });

    const options = {
      hostname,
      path: '/admin/api/2024-01/graphql.json',
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (result.errors) {
            reject(new Error(result.errors.map(e => e.message).join(', ')));
          } else {
            resolve(result.data);
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function setVariantMetafields(shopDomain, accessToken, variantId, rrp, hasGst) {
  // Convert to Shopify GID format
  const gid = `gid://shopify/ProductVariant/${variantId}`;

  const mutation = `
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          id
          namespace
          key
          value
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const metafields = [{
    ownerId: gid,
    namespace: 'custom',
    key: 'rrp',
    type: 'number_decimal',
    value: rrp.toString()
  }];

  // Add GST metafield if we have the data
  if (hasGst !== null && hasGst !== undefined) {
    metafields.push({
      ownerId: gid,
      namespace: 'custom',
      key: 'has_gst',
      type: 'boolean',
      value: hasGst ? 'true' : 'false'
    });
  }

  const variables = { metafields };

  const result = await shopifyGraphQL(shopDomain, accessToken, mutation, variables);

  if (result.metafieldsSet.userErrors.length > 0) {
    throw new Error(result.metafieldsSet.userErrors.map(e => e.message).join(', '));
  }

  return result.metafieldsSet.metafields;
}

async function main() {
  console.log('='.repeat(60));
  console.log('SYNC RRP → ELEVATE SHOPIFY METAFIELDS');
  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
  }
  if (SINGLE) {
    console.log('🎯 SINGLE PRODUCT MODE - Only first product will be synced');
  }
  if (LIMIT_ONE) {
    console.log(`🎯 SKU MODE - Only syncing ${LIMIT_ONE.split('=')[1]}`);
  }
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

    // Get products with RRP that haven't been pushed, or need update
    console.log('Querying products with RRP...');

    let query = supabase
      .from('elevate_products')
      .select('id, elevate_variant_id, sku, title, vendor, rrp, last_rrp_pushed_at, updated_at')
      .not('rrp', 'is', null)
      .order('vendor', { ascending: true });

    // Filter by specific SKU if provided
    if (LIMIT_ONE) {
      const targetSku = LIMIT_ONE.split('=')[1];
      query = query.eq('sku', targetSku);
    }

    const { data: products, error } = await query;

    if (error) {
      throw new Error(`Error querying: ${error.message}`);
    }

    // Filter to products that need pushing
    // (never pushed, or updated since last push)
    let needsPush = products.filter(p => {
      if (!p.last_rrp_pushed_at) return true;
      return new Date(p.updated_at) > new Date(p.last_rrp_pushed_at);
    });

    // If SINGLE mode, only take the first product
    if (SINGLE && needsPush.length > 0) {
      needsPush = [needsPush[0]];
    }

    console.log(`Found ${products.length} products with RRP`);
    console.log(`Need to push: ${needsPush.length} products\n`);

    if (needsPush.length === 0) {
      console.log('All RRPs are up to date in Shopify!');
      return;
    }

    let pushed = 0;
    let skipped = 0;
    let errors = 0;

    for (const product of needsPush) {
      const rrp = parseFloat(product.rrp);
      const hasGst = product.has_gst;
      const gstLabel = hasGst === true ? '(inc GST)' : hasGst === false ? '(GST-free)' : '';

      if (DRY_RUN) {
        console.log(`  [DRY RUN] ${product.vendor} | ${product.sku}`);
        console.log(`            "${product.title}"`);
        console.log(`            RRP: $${rrp.toFixed(2)} ${gstLabel}`);
        console.log();
        pushed++;
        continue;
      }

      try {
        await setVariantMetafields(shopifyUrl, shopifyToken, product.elevate_variant_id, rrp, hasGst);

        // Update Supabase with push timestamp
        await supabase
          .from('elevate_products')
          .update({ last_rrp_pushed_at: new Date().toISOString() })
          .eq('id', product.id);

        console.log(`  ✓ ${product.sku}: $${rrp.toFixed(2)} ${gstLabel}`);
        pushed++;

        // Rate limit
        await new Promise(r => setTimeout(r, 250));

      } catch (err) {
        console.error(`  ✗ ${product.sku}: ${err.message}`);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('SYNC COMPLETE');
    console.log('='.repeat(60));
    console.log(`  Pushed:  ${pushed}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Errors:  ${errors}`);

    if (DRY_RUN && pushed > 0) {
      console.log('\n📝 To actually push these changes:');
      console.log('  node scripts/sync-rrp-to-elevate-shopify.js');
    }

    if (!DRY_RUN && pushed > 0) {
      console.log('\n📝 Next steps:');
      console.log('  1. Check Elevate Shopify Admin → Products → [any product] → Metafields');
      console.log('  2. Update your theme to display {{ variant.metafields.custom.rrp }}');
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
