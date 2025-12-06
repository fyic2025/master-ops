#!/usr/bin/env node

/**
 * DELETE HLB PRODUCTS FROM SUPABASE
 *
 * Removes the deleted BigCommerce products from the Supabase database
 */

require('dotenv').config({ path: '../MASTER-CREDENTIALS-COMPLETE.env' });
const { createClient } = require('@supabase/supabase-js');

// Product IDs that were deleted from BigCommerce
const deletedProductIds = [
  63654, 63643, 63636, 63658, 63656, 63657, 63653,
  33718, 34596, 32140, 32143
];

async function deleteFromSupabase() {
  console.log('========================================');
  console.log('DELETE HLB PRODUCTS FROM SUPABASE');
  console.log('========================================\n');

  const supabase = createClient(
    process.env.BOO_SUPABASE_URL,
    process.env.BOO_SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('Connected to Supabase');
  console.log(`Products to delete: ${deletedProductIds.length}\n`);

  try {
    // First, check which products exist in the database
    console.log('🔍 Checking for products in database...\n');

    const { data: existingProducts, error: checkError } = await supabase
      .from('ecommerce_products')
      .select('product_id, sku, name')
      .in('product_id', deletedProductIds)
      .order('product_id');

    if (checkError) {
      throw new Error(`Error checking products: ${checkError.message}`);
    }

    if (!existingProducts || existingProducts.length === 0) {
      console.log('⚠️  No matching products found in database');
      console.log('   Products may have already been deleted or are in a different table');
      return;
    }

    console.log(`Found ${existingProducts.length} products in ecommerce_products table:\n`);
    existingProducts.forEach(row => {
      console.log(`  • Product ID ${row.product_id}: ${row.name} (${row.sku})`);
    });

    console.log('\n🗑️  Deleting products...\n');

    // Delete the products
    const { data: deletedProducts, error: deleteError } = await supabase
      .from('ecommerce_products')
      .delete()
      .in('product_id', deletedProductIds)
      .select('product_id, sku, name');

    if (deleteError) {
      throw new Error(`Error deleting products: ${deleteError.message}`);
    }

    console.log('✅ Deletion complete!\n');
    console.log('========================================');
    console.log('DELETED PRODUCTS:');
    console.log('========================================\n');

    if (deletedProducts && deletedProducts.length > 0) {
      deletedProducts.forEach(row => {
        console.log(`✓ Product ID ${row.product_id}: ${row.name}`);
        console.log(`  SKU: ${row.sku}\n`);
      });

      console.log('========================================');
      console.log(`Total deleted: ${deletedProducts.length} products`);
      console.log('========================================\n');

      // Check if all products were deleted
      const notDeleted = deletedProductIds.filter(
        id => !deletedProducts.some(row => row.product_id === id)
      );

      if (notDeleted.length > 0) {
        console.log('⚠️  Products not found in database:');
        notDeleted.forEach(id => console.log(`  • Product ID: ${id}`));
      }
    } else {
      console.log('No products were deleted (they may not exist in the database)');
    }

    console.log('\n✅ Database cleanup completed!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

deleteFromSupabase();
