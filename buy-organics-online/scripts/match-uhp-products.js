#!/usr/bin/env node

/**
 * MATCH UHP PRODUCTS
 * Matches BC products with UN prefix to UHP supplier products
 */

require('dotenv').config({ path: '../MASTER-CREDENTIALS-COMPLETE.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.BOO_SUPABASE_URL,
  process.env.BOO_SUPABASE_SERVICE_ROLE_KEY
);

const SUPPLIER_NAME = 'uhp';
const BC_SKU_PREFIXES = ['UN'];

function normalizeSkuForMatch(sku) {
  if (!sku) return '';
  return sku.toUpperCase().replace(/[-_\s]/g, '');
}

async function matchUHPProducts() {
  console.log('\n========================================');
  console.log('UHP PRODUCT MATCHING');
  console.log('========================================\n');

  // Get all BC products with UN prefix
  console.log('Loading BC products with UN prefix...');
  let bcProducts = [];
  let offset = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('ecommerce_products')
      .select('*')
      .or('sku.ilike.UN %,sku.ilike.UN-%')
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    bcProducts = bcProducts.concat(data);
    offset += PAGE_SIZE;
    if (data.length < PAGE_SIZE) break;
  }

  console.log(`✓ Loaded ${bcProducts.length} BC products with UN prefix\n`);

  // Get all UHP supplier products with pagination
  console.log('Loading UHP supplier products...');
  let uhpProducts = [];
  offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('supplier_products')
      .select('*')
      .eq('supplier_name', SUPPLIER_NAME)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    uhpProducts = uhpProducts.concat(data);
    offset += PAGE_SIZE;
    if (data.length < PAGE_SIZE) break;
  }

  console.log(`✓ Loaded ${uhpProducts.length} UHP supplier products\n`);

  if (uhpProducts.length === 0) {
    console.log('❌ No UHP products found in database\n');
    console.log('   Run: node load-uhp-products.js\n');
    return;
  }

  // Get already matched products to avoid duplicates
  console.log('Checking existing matches...');
  const { data: existingMatches } = await supabase
    .from('product_supplier_links')
    .select('ecommerce_product_id, supplier_product_id')
    .eq('supplier_name', SUPPLIER_NAME);

  const matchedBcIds = new Set(existingMatches?.map(m => m.ecommerce_product_id) || []);
  const matchedSupplierIds = new Set(existingMatches?.map(m => m.supplier_product_id) || []);

  console.log(`✓ Found ${existingMatches?.length || 0} existing matches\n`);

  // Build UHP product lookup by SKU
  console.log('Building UHP SKU lookup...');
  const uhpBySku = new Map();
  uhpProducts.forEach(product => {
    if (product.supplier_sku && !matchedSupplierIds.has(product.id)) {
      const sku = normalizeSkuForMatch(product.supplier_sku);
      if (!uhpBySku.has(sku)) {
        uhpBySku.set(sku, []);
      }
      uhpBySku.get(sku).push(product);
    }
  });

  console.log(`✓ Indexed ${uhpBySku.size} unique UHP SKUs\n`);

  // Match BC products to UHP by SKU
  console.log('Matching by SKU prefix pattern...\n');
  const newMatches = [];
  const matched = [];
  const unmatched = [];

  bcProducts.forEach(bc => {
    if (matchedBcIds.has(bc.id)) {
      matched.push({ bc, reason: 'already_matched' });
      return;
    }

    if (!bc.sku) {
      unmatched.push({ bc, reason: 'no_sku' });
      return;
    }

    const bcSkuUpper = bc.sku.toUpperCase();
    let uhpMatched = false;

    // Try each prefix pattern
    for (const prefix of BC_SKU_PREFIXES) {
      if (bcSkuUpper.startsWith(prefix)) {
        // Extract supplier SKU by removing prefix and spaces/dashes
        const bcSkuClean = normalizeSkuForMatch(bcSkuUpper.replace(prefix, ''));

        // Try exact match
        const uhpCandidates = uhpBySku.get(bcSkuClean);

        if (uhpCandidates && uhpCandidates.length > 0) {
          const uhp = uhpCandidates[0];
          newMatches.push({
            ecommerce_product_id: bc.id,
            supplier_product_id: uhp.id,
            supplier_name: SUPPLIER_NAME,
            match_type: 'sku_prefix'
          });
          matched.push({ bc, uhp, match_type: 'sku_prefix' });
          uhpMatched = true;
          break;
        }
      }
    }

    if (!uhpMatched) {
      unmatched.push({ bc, reason: 'no_match' });
    }
  });

  // Results
  console.log('========================================');
  console.log('MATCHING RESULTS');
  console.log('========================================\n');

  console.log(`Total BC products (UN prefix): ${bcProducts.length}`);
  console.log(`Total UHP supplier products: ${uhpProducts.length}`);
  console.log(`Already matched: ${existingMatches?.length || 0}`);
  console.log(`New matches found: ${newMatches.length}`);
  console.log(`Unmatched BC products: ${unmatched.length}\n`);

  const matchRate = ((matched.length / bcProducts.length) * 100).toFixed(1);
  console.log(`Match rate: ${matchRate}%\n`);

  // Show sample matches
  if (matched.length > 0) {
    console.log('Sample matches (first 10):\n');
    matched.slice(0, 10).forEach((m, i) => {
      console.log(`${i + 1}. ${m.bc.sku} - ${m.bc.name}`);
      if (m.uhp) {
        console.log(`   → ${m.uhp.supplier_sku} - ${m.uhp.product_name}`);
      }
      console.log();
    });
  }

  // Insert new matches
  if (newMatches.length > 0) {
    console.log(`\nInserting ${newMatches.length} new matches...\n`);

    const BATCH_SIZE = 500;
    let inserted = 0;

    for (let i = 0; i < newMatches.length; i += BATCH_SIZE) {
      const batch = newMatches.slice(i, i + BATCH_SIZE);

      const { error } = await supabase
        .from('product_supplier_links')
        .insert(batch);

      if (error) {
        console.error(`✗ Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, error.message);
      } else {
        inserted += batch.length;
        console.log(`✓ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} matches inserted`);
      }
    }

    console.log(`\n✅ Inserted ${inserted} new UHP matches\n`);
  }

  // Show unmatched breakdown
  if (unmatched.length > 0) {
    const reasons = {};
    unmatched.forEach(u => {
      reasons[u.reason] = (reasons[u.reason] || 0) + 1;
    });

    console.log('Unmatched breakdown:');
    Object.entries(reasons).forEach(([reason, count]) => {
      console.log(`  ${reason}: ${count}`);
    });
    console.log();

    console.log('Sample unmatched (first 10):\n');
    unmatched.slice(0, 10).forEach((u, i) => {
      console.log(`${i + 1}. ${u.bc.sku} - ${u.bc.name}`);
      console.log(`   Reason: ${u.reason}\n`);
    });
  }

  console.log('========================================\n');
}

matchUHPProducts().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
