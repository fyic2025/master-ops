#!/usr/bin/env node

require('dotenv').config({ path: '../MASTER-CREDENTIALS-COMPLETE.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.BOO_SUPABASE_URL || 'https://usibnysqelovfuctmkqw.supabase.co',
  process.env.BOO_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'
);

(async () => {
  console.log('KIK Products (First 10):\n');
  const { data: kikProducts } = await supabase
    .from('ecommerce_products')
    .select('sku, name')
    .ilike('sku', '%kik%')
    .eq('inventory_level', 0)
    .limit(10);

  kikProducts.forEach(p => {
    const skuParts = p.sku.split(' - ');
    const extracted = skuParts.length > 1 ? skuParts[1].trim() : p.sku;
    console.log(`BC SKU: ${p.sku}`);
    console.log(`Extracted: ${extracted}`);
    console.log('');
  });

  console.log('\n\nUnleashed Products (First 20):\n');
  const { data: unleashedProducts } = await supabase
    .from('supplier_products')
    .select('supplier_sku, product_name')
    .eq('supplier_name', 'unleashed')
    .limit(20);

  unleashedProducts.forEach(p => {
    console.log(`Unleashed SKU: ${p.supplier_sku} - ${p.product_name}`);
  });
})();
