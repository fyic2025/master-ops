#!/usr/bin/env node

/**
 * MATCH UHP PRODUCTS BY BARCODE
 * Matches remaining unmatched BC UN products to UHP supplier products using barcode/UPC/EAN
 */

require('dotenv').config({ path: '../MASTER-CREDENTIALS-COMPLETE.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.BOO_SUPABASE_URL,
  process.env.BOO_SUPABASE_SERVICE_ROLE_KEY
);

const SUPPLIER_NAME = 'uhp';
const BC_SKU_PREFIXES = ['UN'];

function normalizeBarcode(barcode) {
  if (!barcode) return '';
  // Remove spaces, dashes, and leading zeros
  return barcode.toString().replace(/[\s-]/g, '').replace(/^0+/, '').toUpperCase();
}

async function matchUHPByBarcode() {
  console.log('\n========================================');
  console.log('UHP BARCODE MATCHING');
  console.log('========================================\n');

  // Get already matched BC product IDs to exclude
  console.log('Loading existing matches...');
  let existingMatches = [];
  let offset = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('product_supplier_links')
      .select('ecommerce_product_id, supplier_product_id')
      .eq('supplier_name', SUPPLIER_NAME)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    existingMatches = existingMatches.concat(data);
    offset += PAGE_SIZE;
    if (data.length < PAGE_SIZE) break;
  }

  const matchedBcIds = new Set(existingMatches?.map(m => m.ecommerce_product_id) || []);
  const matchedSupplierIds = new Set(existingMatches?.map(m => m.supplier_product_id) || []);

  console.log(`✓ Found ${existingMatches?.length || 0} existing matches\n`);

  // Get all BC products with UN prefix using pagination
  console.log('Loading unmatched BC products with UN prefix...');
  let bcProducts = [];
  let bcOffset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('ecommerce_products')
      .select('*')
      .or('sku.ilike.UN %,sku.ilike.UN-%')
      .range(bcOffset, bcOffset + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    bcProducts = bcProducts.concat(data);
    bcOffset += PAGE_SIZE;
    if (data.length < PAGE_SIZE) break;
  }

  // Filter to only unmatched products
  const unmatchedBcProducts = bcProducts.filter(p => !matchedBcIds.has(p.id));
  console.log(`✓ Loaded ${unmatchedBcProducts.length} unmatched BC products with UN prefix\n`);

  // Get all UHP supplier products using pagination
  console.log('Loading unmatched UHP supplier products...');
  let uhpProducts = [];
  let uhpOffset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('supplier_products')
      .select('*')
      .eq('supplier_name', SUPPLIER_NAME)
      .range(uhpOffset, uhpOffset + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    uhpProducts = uhpProducts.concat(data);
    uhpOffset += PAGE_SIZE;
    if (data.length < PAGE_SIZE) break;
  }

  // Filter to only unmatched supplier products
  const unmatchedUhpProducts = uhpProducts.filter(p => !matchedSupplierIds.has(p.id));
  console.log(`✓ Loaded ${unmatchedUhpProducts.length} unmatched UHP supplier products\n`);

  if (unmatchedUhpProducts.length === 0) {
    console.log('❌ No unmatched UHP products found\n');
    return;
  }

  // Build barcode lookup for UHP products
  console.log('Building UHP barcode lookup...');
  const uhpByBarcode = new Map();

  unmatchedUhpProducts.forEach(product => {
    const barcodes = [
      product.barcode,
      product.upc,
      product.ean,
      product.gtin
    ].filter(Boolean);

    barcodes.forEach(barcode => {
      const normalized = normalizeBarcode(barcode);
      if (normalized) {
        if (!uhpByBarcode.has(normalized)) {
          uhpByBarcode.set(normalized, []);
        }
        uhpByBarcode.get(normalized).push(product);
      }
    });
  });

  console.log(`✓ Indexed ${uhpByBarcode.size} unique UHP barcodes\n`);

  // Match BC products to UHP by barcode
  console.log('Matching by barcode...\\n');
  const newMatches = [];
  const matched = [];
  const unmatched = [];

  unmatchedBcProducts.forEach(bc => {
    const bcBarcodes = [
      bc.barcode,
      bc.upc,
      bc.ean,
      bc.gtin
    ].filter(Boolean);

    let uhpMatched = false;

    for (const barcode of bcBarcodes) {
      const normalized = normalizeBarcode(barcode);
      if (!normalized) continue;

      const uhpCandidates = uhpByBarcode.get(normalized);

      if (uhpCandidates && uhpCandidates.length > 0) {
        const uhp = uhpCandidates[0];
        newMatches.push({
          ecommerce_product_id: bc.id,
          supplier_product_id: uhp.id,
          supplier_name: SUPPLIER_NAME,
          match_type: 'barcode'
        });
        matched.push({
          bc,
          uhp,
          barcode: normalized,
          match_type: 'barcode'
        });
        uhpMatched = true;
        break;
      }
    }

    if (!uhpMatched) {
      unmatched.push({
        bc,
        reason: bcBarcodes.length > 0 ? 'no_barcode_match' : 'no_barcode_in_bc'
      });
    }
  });

  // Results
  console.log('========================================');
  console.log('BARCODE MATCHING RESULTS');
  console.log('========================================\n');

  console.log(`Unmatched BC products checked: ${unmatchedBcProducts.length}`);
  console.log(`Unmatched UHP products checked: ${unmatchedUhpProducts.length}`);
  console.log(`New barcode matches found: ${newMatches.length}`);
  console.log(`Still unmatched: ${unmatched.length}\n`);

  // Show sample matches
  if (matched.length > 0) {
    console.log('Sample barcode matches (first 10):\n');
    matched.slice(0, 10).forEach((m, i) => {
      console.log(`${i + 1}. Barcode: ${m.barcode}`);
      console.log(`   BC:  ${m.bc.sku} - ${m.bc.name}`);
      console.log(`   UHP: ${m.uhp.supplier_sku} - ${m.uhp.product_name}`);
      console.log();
    });
  }

  // Insert new matches
  if (newMatches.length > 0) {
    console.log(`\nInserting ${newMatches.length} new barcode matches...\n`);

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

    console.log(`\n✅ Inserted ${inserted} new UHP barcode matches\n`);
  } else {
    console.log('\nℹ️  No new barcode matches found\n');
  }

  // Overall UHP matching stats
  console.log('========================================');
  console.log('OVERALL UHP MATCHING STATS');
  console.log('========================================\n');

  const totalExisting = existingMatches?.length || 0;
  const totalNow = totalExisting + newMatches.length;
  const totalBcProducts = bcProducts.length;
  const matchRate = ((totalNow / totalBcProducts) * 100).toFixed(1);

  console.log(`Total BC products (UN prefix): ${totalBcProducts}`);
  console.log(`Total matched (SKU + Barcode): ${totalNow}`);
  console.log(`Match rate: ${matchRate}%`);
  console.log(`Still unmatched: ${totalBcProducts - totalNow}\n`);

  console.log('========================================\n');
}

matchUHPByBarcode().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
