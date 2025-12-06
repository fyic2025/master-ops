#!/usr/bin/env node

/**
 * MATCH KIK PRODUCTS TO UNLEASHED SUPPLIER DATA
 *
 * Finds KIK products with 0 inventory in BC and checks against Unleashed
 * to identify which products are not sellable or not found in Unleashed
 */

require('dotenv').config({ path: '../MASTER-CREDENTIALS-COMPLETE.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.BOO_SUPABASE_URL || 'https://usibnysqelovfuctmkqw.supabase.co',
  process.env.BOO_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'
);

async function matchKikToUnleashed() {
  console.log('========================================');
  console.log('MATCH KIK PRODUCTS TO UNLEASHED');
  console.log('========================================\n');

  try {
    // Step 1: Get all KIK products with 0 inventory from BC
    console.log('Step 1: Fetching KIK products with 0 inventory from BigCommerce...\n');

    const { data: kikProducts, error: kikError } = await supabase
      .from('ecommerce_products')
      .select('product_id, sku, name, inventory_level, is_visible, availability')
      .ilike('sku', '%kik%')
      .eq('inventory_level', 0)
      .order('sku');

    if (kikError) throw kikError;

    console.log(`✓ Found ${kikProducts.length} KIK products with 0 inventory\n`);

    // Step 2: Get all Unleashed supplier products
    console.log('Step 2: Fetching Unleashed supplier data...\n');

    const { data: unleashedProducts, error: unleashedError } = await supabase
      .from('supplier_products')
      .select('supplier_sku, product_name, availability, stock_level, metadata')
      .eq('supplier_name', 'unleashed');

    if (unleashedError) throw unleashedError;

    console.log(`✓ Found ${unleashedProducts.length} Unleashed products\n`);

    // Step 3: Match KIK SKUs to Unleashed SKUs
    console.log('Step 3: Matching KIK products to Unleashed data...\n');

    const toDelete = [];
    const matched = [];
    const notFound = [];

    for (const kikProduct of kikProducts) {
      // For KIK products, try both direct match and partial match
      // BC SKU: "KIK - ECB03-15" should match Unleashed SKU: "KIK - ECB03-15"
      const bcSku = kikProduct.sku.trim();

      // Extract just the code part for partial matching
      const skuParts = bcSku.split(' - ');
      const codeOnly = skuParts.length > 1 ? skuParts[1].trim() : bcSku;

      // Find matching Unleashed product (try direct match first, then partial)
      let unleashedMatch = unleashedProducts.find(up =>
        up.supplier_sku.trim() === bcSku ||
        up.supplier_sku.trim().toLowerCase() === bcSku.toLowerCase()
      );

      // If no direct match, try matching just the code part
      if (!unleashedMatch) {
        unleashedMatch = unleashedProducts.find(up =>
          up.supplier_sku.includes(codeOnly) ||
          up.supplier_sku.toLowerCase().includes(codeOnly.toLowerCase())
        );
      }

      if (unleashedMatch) {
        matched.push({
          bc_product: kikProduct,
          unleashed_product: unleashedMatch
        });

        // Check if product is not sellable or has no stock
        const isSellable = unleashedMatch.metadata?.is_sellable !== false &&
                          unleashedMatch.availability !== 'not_sellable';
        const isObsolete = unleashedMatch.metadata?.is_obsolete === true;
        const hasStock = unleashedMatch.stock_level > 0;

        if (!isSellable || isObsolete) {
          toDelete.push({
            ...kikProduct,
            reason: !isSellable ? 'not_sellable' : 'obsolete',
            unleashed_sku: unleashedMatch.supplier_sku,
            unleashed_stock: unleashedMatch.stock_level
          });
        }
      } else {
        notFound.push({
          ...kikProduct,
          extracted_code: codeOnly
        });

        // Also mark for deletion if not found in Unleashed
        toDelete.push({
          ...kikProduct,
          reason: 'not_in_unleashed',
          extracted_code: codeOnly
        });
      }
    }

    console.log('========================================');
    console.log('MATCHING RESULTS');
    console.log('========================================\n');
    console.log(`Total KIK products analyzed: ${kikProducts.length}`);
    console.log(`Matched to Unleashed: ${matched.length}`);
    console.log(`Not found in Unleashed: ${notFound.length}`);
    console.log(`\nProducts to DELETE: ${toDelete.length}`);
    console.log(`  - Not sellable: ${toDelete.filter(p => p.reason === 'not_sellable').length}`);
    console.log(`  - Obsolete: ${toDelete.filter(p => p.reason === 'obsolete').length}`);
    console.log(`  - Not in Unleashed: ${toDelete.filter(p => p.reason === 'not_in_unleashed').length}`);

    // Save results
    console.log('\n========================================');
    console.log('SAVING RESULTS');
    console.log('========================================\n');

    fs.writeFileSync(
      'kik-products-to-delete.json',
      JSON.stringify(toDelete, null, 2)
    );
    console.log(`✓ Saved ${toDelete.length} products to delete: kik-products-to-delete.json`);

    fs.writeFileSync(
      'kik-product-ids.txt',
      toDelete.map(p => p.product_id).join('\n')
    );
    console.log(`✓ Saved product IDs: kik-product-ids.txt`);

    fs.writeFileSync(
      'kik-matched-products.json',
      JSON.stringify(matched, null, 2)
    );
    console.log(`✓ Saved matched products: kik-matched-products.json`);

    fs.writeFileSync(
      'kik-not-found.json',
      JSON.stringify(notFound, null, 2)
    );
    console.log(`✓ Saved not found products: kik-not-found.json`);

    // Show sample products to delete
    if (toDelete.length > 0) {
      console.log('\n========================================');
      console.log('SAMPLE PRODUCTS TO DELETE (First 10)');
      console.log('========================================\n');

      toDelete.slice(0, 10).forEach((product, i) => {
        console.log(`${i + 1}. SKU: ${product.sku}`);
        console.log(`   Name: ${product.name}`);
        console.log(`   Reason: ${product.reason}`);
        console.log(`   Product ID: ${product.product_id}`);
        console.log('');
      });
    }

    console.log('========================================');
    console.log('NEXT STEPS');
    console.log('========================================\n');
    console.log('1. Review kik-products-to-delete.json to confirm deletion list');
    console.log('2. Run delete-kik-products.js to remove from BigCommerce');
    console.log('3. Run delete-kik-from-supabase.js to remove from database');
    console.log('4. Upload kik-redirects.csv to BigCommerce 301 Redirects\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

matchKikToUnleashed();
