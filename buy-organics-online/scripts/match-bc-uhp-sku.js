#!/usr/bin/env node

/**
 * MATCH BC PRODUCTS WITH UHP SUPPLIER BY SKU
 *
 * Performs direct SKU matching between BigCommerce products and UHP supplier products
 */

require('dotenv').config({ path: '../MASTER-CREDENTIALS-COMPLETE.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPPLIER_NAME = 'uhp';

async function matchBCUHPBySKU() {
  console.log('========================================');
  console.log('BC → UHP SKU MATCHING ANALYSIS');
  console.log('========================================\n');

  // Initialize Supabase
  const supabase = createClient(
    process.env.BOO_SUPABASE_URL,
    process.env.BOO_SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Step 1: Get all BC products
    console.log('Loading BC products...');
    let bcProducts = [];
    let offset = 0;
    const PAGE_SIZE = 1000;

    while (true) {
      const { data, error } = await supabase
        .from('ecommerce_products')
        .select('id, product_id, sku, name, barcode')
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      bcProducts = bcProducts.concat(data);
      offset += PAGE_SIZE;
      if (data.length < PAGE_SIZE) break;
    }

    console.log(`✓ Loaded ${bcProducts.length} BC products\n`);

    // Step 2: Get all UHP supplier products
    console.log(`Loading ${SUPPLIER_NAME} supplier products...`);
    let uhpProducts = [];
    offset = 0;

    while (true) {
      const { data, error } = await supabase
        .from('supplier_products')
        .select('id, supplier_sku, product_name, barcode, cost_price, rrp, stock_level, availability')
        .eq('supplier_name', SUPPLIER_NAME)
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      uhpProducts = uhpProducts.concat(data);
      offset += PAGE_SIZE;
      if (data.length < PAGE_SIZE) break;
    }

    console.log(`✓ Loaded ${uhpProducts.length} UHP products\n`);

    if (uhpProducts.length === 0) {
      console.log('⚠️  No UHP products found in database.');
      console.log('   Run: node load-uhp-products.js\n');
      return;
    }

    // Step 3: Create SKU lookup map for UHP products (normalize SKUs)
    console.log('Building SKU lookup map...');
    const uhpBySku = new Map();
    const uhpByBarcode = new Map();

    uhpProducts.forEach(product => {
      if (product.supplier_sku) {
        // Normalize SKU: remove spaces, hyphens, convert to uppercase
        const normalizedSku = product.supplier_sku.trim().toUpperCase().replace(/[\s\-]/g, '');
        uhpBySku.set(normalizedSku, product);
      }
      if (product.barcode) {
        uhpByBarcode.set(product.barcode.trim(), product);
      }
    });

    console.log(`✓ Indexed ${uhpBySku.size} unique UHP SKUs`);
    console.log(`✓ Indexed ${uhpByBarcode.size} unique UHP barcodes\n`);

    // Step 4: Match BC products with UHP by SKU (and barcode as fallback)
    console.log('Matching BC products with UHP...');
    const matched = [];
    const unmatched = [];
    const matchedBySku = [];
    const matchedByBarcode = [];

    bcProducts.forEach(bcProduct => {
      let uhpProduct = null;
      let matchType = null;

      // Try SKU match first
      if (bcProduct.sku) {
        const bcSku = bcProduct.sku.trim().toUpperCase().replace(/[\s\-]/g, '');
        uhpProduct = uhpBySku.get(bcSku);
        if (uhpProduct) {
          matchType = 'SKU';
          matchedBySku.push(bcProduct);
        }
      }

      // Try barcode match as fallback
      if (!uhpProduct && bcProduct.barcode) {
        uhpProduct = uhpByBarcode.get(bcProduct.barcode.trim());
        if (uhpProduct) {
          matchType = 'BARCODE';
          matchedByBarcode.push(bcProduct);
        }
      }

      if (uhpProduct) {
        matched.push({
          match_type: matchType,
          bc_id: bcProduct.id,
          bc_product_id: bcProduct.product_id,
          bc_sku: bcProduct.sku,
          bc_name: bcProduct.name,
          bc_barcode: bcProduct.barcode,
          uhp_id: uhpProduct.id,
          uhp_sku: uhpProduct.supplier_sku,
          uhp_name: uhpProduct.product_name,
          uhp_barcode: uhpProduct.barcode,
          uhp_cost_price: uhpProduct.cost_price,
          uhp_rrp: uhpProduct.rrp,
          uhp_stock_level: uhpProduct.stock_level,
          uhp_availability: uhpProduct.availability
        });
      } else {
        unmatched.push({
          id: bcProduct.id,
          product_id: bcProduct.product_id,
          sku: bcProduct.sku || 'NO_SKU',
          name: bcProduct.name,
          barcode: bcProduct.barcode,
          reason: !bcProduct.sku ? 'No SKU in BC' : 'No UHP match found'
        });
      }
    });

    console.log(`✓ Matching complete\n`);

    // Step 5: Results Summary
    console.log('========================================');
    console.log('MATCHING RESULTS');
    console.log('========================================\n');
    console.log(`Total BC products:       ${bcProducts.length}`);
    console.log(`Total UHP products:      ${uhpProducts.length}\n`);
    console.log(`✅ MATCHED:              ${matched.length} (${((matched.length / bcProducts.length) * 100).toFixed(1)}%)`);
    console.log(`   - By SKU:             ${matchedBySku.length}`);
    console.log(`   - By Barcode:         ${matchedByBarcode.length}\n`);
    console.log(`❌ UNMATCHED BC:         ${unmatched.length} (${((unmatched.length / bcProducts.length) * 100).toFixed(1)}%)\n`);

    // Step 6: Show sample matches
    if (matched.length > 0) {
      console.log('Sample matches (first 15):');
      console.log('─'.repeat(100));
      matched.slice(0, 15).forEach((match, idx) => {
        console.log(`${idx + 1}. [${match.match_type}] SKU: ${match.bc_sku}`);
        console.log(`   BC:  ${match.bc_name}`);
        console.log(`   UHP: ${match.uhp_name}`);
        console.log(`   Cost: $${match.uhp_cost_price || 'N/A'} | RRP: $${match.uhp_rrp || 'N/A'} | Stock: ${match.uhp_stock_level}`);
        console.log('');
      });
    }

    // Step 7: Show sample unmatched
    if (unmatched.length > 0) {
      console.log('\nUnmatched BC products (first 30):');
      console.log('─'.repeat(100));
      unmatched.slice(0, 30).forEach((product, idx) => {
        console.log(`${idx + 1}. SKU: ${product.sku}`);
        console.log(`   Name: ${product.name}`);
        console.log(`   Barcode: ${product.barcode || 'None'}`);
        console.log(`   BC Product ID: ${product.product_id}`);
        console.log('');
      });

      if (unmatched.length > 30) {
        console.log(`... and ${unmatched.length - 30} more unmatched products\n`);
      }
    }

    // Step 8: Unmatched breakdown
    const unmatchedReasons = {};
    unmatched.forEach(product => {
      unmatchedReasons[product.reason] = (unmatchedReasons[product.reason] || 0) + 1;
    });

    if (Object.keys(unmatchedReasons).length > 0) {
      console.log('\nUnmatched breakdown:');
      console.log('─'.repeat(80));
      Object.entries(unmatchedReasons).forEach(([reason, count]) => {
        console.log(`${reason}: ${count} products (${((count / unmatched.length) * 100).toFixed(1)}%)`);
      });
      console.log('');
    }

    console.log('========================================\n');

    // Step 9: Save detailed results
    const results = {
      timestamp: new Date().toISOString(),
      summary: {
        total_bc_products: bcProducts.length,
        total_uhp_products: uhpProducts.length,
        matched_count: matched.length,
        matched_by_sku: matchedBySku.length,
        matched_by_barcode: matchedByBarcode.length,
        unmatched_count: unmatched.length,
        match_percentage: ((matched.length / bcProducts.length) * 100).toFixed(2)
      },
      matched: matched,
      unmatched: unmatched
    };

    const reportPath = 'uhp-bc-sku-match-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`📄 Full report saved to: ${reportPath}`);

    // Save CSV of unmatched for easy review
    const unmatchedCsv = [
      'BC Product ID,SKU,Name,Barcode,Reason',
      ...unmatched.map(p => `${p.product_id},"${p.sku}","${p.name.replace(/"/g, '""')}","${p.barcode || ''}","${p.reason}"`)
    ].join('\n');

    fs.writeFileSync('uhp-bc-unmatched.csv', unmatchedCsv);
    console.log(`📄 Unmatched CSV saved to: uhp-bc-unmatched.csv\n`);

    return results;

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

// Run
matchBCUHPBySKU().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
