#!/usr/bin/env node

/**
 * FIND PRODUCTS WITH "COPY" IN SKU AND ZERO INVENTORY
 */

require('dotenv').config({ path: '../MASTER-CREDENTIALS-COMPLETE.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function findCopyProducts() {
  console.log('========================================');
  console.log('FINDING PRODUCTS WITH "COPY" IN SKU');
  console.log('========================================\n');

  const supabase = createClient(
    process.env.BOO_SUPABASE_URL,
    process.env.BOO_SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('Searching Supabase for products...\n');

  try {
    // Find products with "copy" in SKU (case insensitive) and zero inventory
    const { data: products, error } = await supabase
      .from('ecommerce_products')
      .select('product_id, sku, name, inventory_level, is_visible, availability')
      .ilike('sku', '%copy%')
      .eq('inventory_level', 0)
      .order('product_id');

    if (error) {
      throw new Error(`Error querying products: ${error.message}`);
    }

    if (!products || products.length === 0) {
      console.log('No products found with "copy" in SKU and zero inventory');
      return;
    }

    console.log(`Found ${products.length} products:\n`);
    console.log('========================================\n');

    products.forEach((product, index) => {
      console.log(`${index + 1}. Product ID: ${product.product_id}`);
      console.log(`   SKU: ${product.sku}`);
      console.log(`   Name: ${product.name}`);
      console.log(`   Inventory: ${product.inventory_level}`);
      console.log(`   Visible: ${product.is_visible}`);
      console.log(`   Availability: ${product.availability}`);
      console.log('');
    });

    console.log('========================================');
    console.log(`Total: ${products.length} products\n`);

    // Save to JSON file
    const outputPath = 'copy-products-to-delete.json';
    fs.writeFileSync(outputPath, JSON.stringify(products, null, 2));
    console.log(`✓ Product list saved to: ${outputPath}`);

    // Save product IDs for easy deletion
    const productIds = products.map(p => p.product_id);
    fs.writeFileSync('copy-product-ids.txt', productIds.join('\n'));
    console.log(`✓ Product IDs saved to: copy-product-ids.txt`);

    console.log('\n========================================');
    console.log('SUMMARY');
    console.log('========================================');
    console.log(`Products to delete: ${products.length}`);
    console.log(`All will redirect to: / (homepage)`);
    console.log('\nNext: Review the list and confirm deletion');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

findCopyProducts();
