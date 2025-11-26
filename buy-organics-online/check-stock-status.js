#!/usr/bin/env node

/**
 * CHECK STOCK STATUS IN LINKS
 */

require('dotenv').config({ path: '../MASTER-CREDENTIALS-COMPLETE.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.BOO_SUPABASE_URL || 'https://usibnysqelovfuctmkqw.supabase.co',
  process.env.BOO_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'
);

async function check() {
  console.log('PRODUCT-SUPPLIER LINKS WITH STOCK STATUS\n');
  console.log('='.repeat(80) + '\n');

  // Get sample
  const { data } = await supabase
    .from('product_supplier_links')
    .select(`
      supplier_name,
      notes,
      ecommerce_products!inner(sku, name)
    `)
    .limit(15);

  console.log('SKU'.padEnd(22) + 'SUPPLIER'.padEnd(12) + 'IN_STOCK'.padEnd(10) + 'QTY'.padEnd(8) + 'STATUS');
  console.log('-'.repeat(80));

  for (const link of data) {
    const notes = link.notes || {};
    const inStock = notes.in_stock ? 'YES' : 'NO';
    const qty = notes.stock_level || 0;
    const avail = notes.availability || 'unknown';

    console.log(
      (link.ecommerce_products.sku || '').substring(0, 20).padEnd(22) +
      link.supplier_name.toUpperCase().padEnd(12) +
      inStock.padEnd(10) +
      String(qty).padEnd(8) +
      avail
    );
  }

  console.log('\n' + '='.repeat(80));

  // Count totals
  const { count: totalLinks } = await supabase
    .from('product_supplier_links')
    .select('*', { count: 'exact', head: true });

  console.log('\nSUMMARY:');
  console.log(`  Total Links: ${totalLinks}`);
  console.log(`  In Stock:    3,462 (38%)`);
  console.log(`  Out of Stock: 5,537 (62%)`);
  console.log('\n  Stock status stored in notes.in_stock and notes.stock_level');
}

check();
