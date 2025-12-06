#!/usr/bin/env node

/**
 * DELETE KIK PRODUCTS FROM SUPABASE
 * Removes KIK products that were deleted from BigCommerce
 */

require('dotenv').config({ path: '../MASTER-CREDENTIALS-COMPLETE.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.BOO_SUPABASE_URL || 'https://usibnysqelovfuctmkqw.supabase.co',
  process.env.BOO_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'
);

async function deleteFromSupabase() {
  console.log('========================================');
  console.log('DELETE KIK PRODUCTS FROM SUPABASE');
  console.log('========================================\n');

  try {
    // Read the product IDs to delete
    const productIds = fs.readFileSync('kik-product-ids.txt', 'utf8')
      .split('\n')
      .filter(id => id.trim())
      .map(id => parseInt(id.trim()));

    console.log(`Products to delete: ${productIds.length}\n`);

    // Delete from ecommerce_products table
    console.log('Deleting from ecommerce_products table...\n');

    const { data: deletedProducts, error: deleteError } = await supabase
      .from('ecommerce_products')
      .delete()
      .in('product_id', productIds)
      .select('product_id, sku, name');

    if (deleteError) {
      throw new Error(`Delete error: ${deleteError.message}`);
    }

    console.log(`✓ Deleted ${deletedProducts.length} products from Supabase\n`);

    // Save deletion log
    const deletionLog = {
      timestamp: new Date().toISOString(),
      total_deleted: deletedProducts.length,
      deleted_products: deletedProducts
    };

    fs.writeFileSync(
      'kik-supabase-deletion-log.json',
      JSON.stringify(deletionLog, null, 2)
    );

    console.log('✓ Saved deletion log: kik-supabase-deletion-log.json\n');

    console.log('========================================');
    console.log('DELETION SUMMARY');
    console.log('========================================\n');
    console.log(`Total products deleted: ${deletedProducts.length}`);
    console.log('\nSample deleted products:');
    deletedProducts.slice(0, 10).forEach(p => {
      console.log(`  - ${p.sku}: ${p.name}`);
    });

    console.log('\n✓ KIK products successfully removed from Supabase!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

deleteFromSupabase();
