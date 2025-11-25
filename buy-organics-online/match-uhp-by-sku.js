#!/usr/bin/env node

/**
 * MATCH BC PRODUCTS WITH UHP SUPPLIER BY SKU
 *
 * Performs direct SKU matching between BigCommerce products and UHP supplier products
 */

require('dotenv').config({ path: '../MASTER-CREDENTIALS-COMPLETE.env' });
const { createClient } = require('@supabase/supabase-js');

const SUPPLIER_NAME = 'uhp';

async function matchUHPBySKU() {
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
    const { data: bcProducts, error: bcError } = await supabase
      .from('bigcommerce_products')
      .select('id, sku, name, bigcommerce_id');

    if (bcError) throw bcError;
    console.log(`✓ Loaded ${bcProducts.length} BC products\n`);

    // Step 2: Get all UHP supplier products
    console.log(`Loading ${SUPPLIER_NAME} supplier products...`);
    const { data: uhpProducts, error: uhpError } = await supabase
      .from('supplier_products')
      .select('id, supplier_sku, product_name, barcode, supplier_name')
      .eq('supplier_name', SUPPLIER_NAME);

    if (uhpError) throw uhpError;
    console.log(`✓ Loaded ${uhpProducts.length} UHP products\n`);

    if (uhpProducts.length === 0) {
      console.log('⚠️  No UHP products found in database.');
      console.log('   Run: node load-uhp-products.js\n');
      return;
    }

    // Step 3: Create SKU lookup map for UHP products
    console.log('Building SKU lookup map...');
    const uhpBySku = new Map();
    uhpProducts.forEach(product => {
      if (product.supplier_sku) {
        const sku = product.supplier_sku.trim().toUpperCase();
        uhpBySku.set(sku, product);
      }
    });
    console.log(`✓ Indexed ${uhpBySku.size} unique UHP SKUs\n`);

    // Step 4: Match BC products with UHP by SKU
    console.log('Matching BC products with UHP by SKU...');
    const matched = [];
    const unmatched = [];

    bcProducts.forEach(bcProduct => {
      if (!bcProduct.sku) {
        unmatched.push({ ...bcProduct, reason: 'No SKU in BC' });
        return;
      }

      const bcSku = bcProduct.sku.trim().toUpperCase();
      const uhpProduct = uhpBySku.get(bcSku);

      if (uhpProduct) {
        matched.push({
          bc_product_id: bcProduct.id,
          bc_bigcommerce_id: bcProduct.bigcommerce_id,
          bc_sku: bcProduct.sku,
          bc_name: bcProduct.name,
          uhp_supplier_product_id: uhpProduct.id,
          uhp_sku: uhpProduct.supplier_sku,
          uhp_name: uhpProduct.product_name,
          uhp_barcode: uhpProduct.barcode
        });
      } else {
        unmatched.push({
          ...bcProduct,
          reason: 'No UHP match found'
        });
      }
    });

    console.log(`✓ Matching complete\n`);

    // Step 5: Results
    console.log('========================================');
    console.log('MATCHING RESULTS');
    console.log('========================================\n');
    console.log(`Total BC products:     ${bcProducts.length}`);
    console.log(`Total UHP products:    ${uhpProducts.length}`);
    console.log(`✅ Matched by SKU:     ${matched.length} (${((matched.length / bcProducts.length) * 100).toFixed(1)}%)`);
    console.log(`❌ Unmatched BC:       ${unmatched.length} (${((unmatched.length / bcProducts.length) * 100).toFixed(1)}%)\n`);

    // Show sample matches
    if (matched.length > 0) {
      console.log('Sample matches (first 10):');
      console.log('─'.repeat(80));
      matched.slice(0, 10).forEach((match, idx) => {
        console.log(`${idx + 1}. SKU: ${match.bc_sku}`);
        console.log(`   BC:  ${match.bc_name}`);
        console.log(`   UHP: ${match.uhp_name}`);
        console.log('');
      });
    }

    // Show sample unmatched
    if (unmatched.length > 0) {
      console.log('\nUnmatched BC products (first 20):');
      console.log('─'.repeat(80));
      unmatched.slice(0, 20).forEach((product, idx) => {
        console.log(`${idx + 1}. SKU: ${product.sku || 'NO SKU'}`);
        console.log(`   Name: ${product.name}`);
        console.log(`   BC ID: ${product.bigcommerce_id}`);
        console.log(`   Reason: ${product.reason}`);
        console.log('');
      });

      if (unmatched.length > 20) {
        console.log(`... and ${unmatched.length - 20} more unmatched products\n`);
      }
    }

    // Breakdown of unmatched reasons
    const unmatchedReasons = {};
    unmatched.forEach(product => {
      unmatchedReasons[product.reason] = (unmatchedReasons[product.reason] || 0) + 1;
    });

    if (Object.keys(unmatchedReasons).length > 0) {
      console.log('\nUnmatched breakdown:');
      console.log('─'.repeat(80));
      Object.entries(unmatchedReasons).forEach(([reason, count]) => {
        console.log(`${reason}: ${count} products`);
      });
      console.log('');
    }

    console.log('========================================\n');

    // Save results
    const results = {
      timestamp: new Date().toISOString(),
      summary: {
        total_bc_products: bcProducts.length,
        total_uhp_products: uhpProducts.length,
        matched_count: matched.length,
        unmatched_count: unmatched.length,
        match_percentage: ((matched.length / bcProducts.length) * 100).toFixed(2)
      },
      matched: matched,
      unmatched: unmatched
    };

    const fs = require('fs');
    const reportPath = 'uhp-sku-match-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`📄 Full report saved to: ${reportPath}\n`);

    return results;

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

// Run
matchUHPBySKU().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
