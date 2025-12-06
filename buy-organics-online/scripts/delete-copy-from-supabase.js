#!/usr/bin/env node

/**
 * DELETE COPY PRODUCTS FROM SUPABASE
 */

require('dotenv').config({ path: '../MASTER-CREDENTIALS-COMPLETE.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function deleteFromSupabase() {
  console.log('========================================');
  console.log('DELETE COPY PRODUCTS FROM SUPABASE');
  console.log('========================================\n');

  const supabase = createClient(
    process.env.BOO_SUPABASE_URL,
    process.env.BOO_SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('Reading product IDs from file...\n');

  try {
    // Check if the file exists
    let productIds;
    if (fs.existsSync('copy-product-ids-for-supabase.txt')) {
      const fileContent = fs.readFileSync('copy-product-ids-for-supabase.txt', 'utf8');
      productIds = fileContent.split('\n').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    } else {
      // Fallback to the original list if the BC deletion hasn't completed yet
      const products = JSON.parse(fs.readFileSync('copy-products-to-delete.json', 'utf8'));
      productIds = products.map(p => p.product_id);
    }

    console.log(`Products to delete from Supabase: ${productIds.length}\n`);

    // Check which products exist in the database
    console.log('🔍 Checking for products in database...\n');

    const { data: existingProducts, error: checkError } = await supabase
      .from('ecommerce_products')
      .select('product_id, sku, name')
      .in('product_id', productIds)
      .order('product_id');

    if (checkError) {
      throw new Error(`Error checking products: ${checkError.message}`);
    }

    if (!existingProducts || existingProducts.length === 0) {
      console.log('⚠️  No matching products found in database');
      console.log('   Products may have already been deleted');
      return;
    }

    console.log(`Found ${existingProducts.length} products in ecommerce_products table\n`);

    console.log('🗑️  Deleting products...\n');

    // Delete the products
    const { data: deletedProducts, error: deleteError } = await supabase
      .from('ecommerce_products')
      .delete()
      .in('product_id', productIds)
      .select('product_id, sku, name');

    if (deleteError) {
      throw new Error(`Error deleting products: ${deleteError.message}`);
    }

    console.log('✅ Deletion complete!\n');
    console.log('========================================');
    console.log(`Total deleted: ${deletedProducts ? deletedProducts.length : 0} products`);
    console.log('========================================\n');

    // Save deletion log
    const logData = {
      timestamp: new Date().toISOString(),
      totalDeleted: deletedProducts ? deletedProducts.length : 0,
      productIds: deletedProducts ? deletedProducts.map(p => p.product_id) : []
    };

    fs.writeFileSync('copy-supabase-deletion-log.json', JSON.stringify(logData, null, 2));
    console.log('✓ Deletion log saved to: copy-supabase-deletion-log.json');

    console.log('\n✅ Database cleanup completed!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

deleteFromSupabase();
