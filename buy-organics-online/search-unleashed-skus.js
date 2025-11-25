#!/usr/bin/env node

require('dotenv').config({ path: '../MASTER-CREDENTIALS-COMPLETE.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.BOO_SUPABASE_URL || 'https://usibnysqelovfuctmkqw.supabase.co',
  process.env.BOO_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'
);

(async () => {
  // Sample KIK SKUs to search for
  const testSkus = [
    'ECB03-15',
    'ECK02',
    'ECL01-15',
    'ORG108-CO',
    'ORG54',
    'HRR01',
    'KIKI107',
    'KIKI104',
    'KIKI106',
    'KIKI108'
  ];

  console.log('Searching Unleashed for sample KIK SKUs...\n');

  for (const sku of testSkus) {
    const { data } = await supabase
      .from('supplier_products')
      .select('supplier_sku, product_name, supplier_name')
      .eq('supplier_name', 'unleashed')
      .or(`supplier_sku.eq.${sku},supplier_sku.ilike.%${sku}%`);

    if (data && data.length > 0) {
      console.log(`✓ FOUND: ${sku}`);
      data.forEach(p => console.log(`  → ${p.supplier_sku}: ${p.product_name}`));
    } else {
      console.log(`✗ NOT FOUND: ${sku}`);
    }
  }

  console.log('\n\nSearching for "KIKI" in Unleashed product names or SKUs...\n');
  const { data: kikiData } = await supabase
    .from('supplier_products')
    .select('supplier_sku, product_name')
    .eq('supplier_name', 'unleashed')
    .or('supplier_sku.ilike.%kiki%,product_name.ilike.%kiki%,product_name.ilike.%kin kin%')
    .limit(10);

  if (kikiData && kikiData.length > 0) {
    console.log('Found Kin Kin products:');
    kikiData.forEach(p => console.log(`  ${p.supplier_sku}: ${p.product_name}`));
  } else {
    console.log('No Kin Kin products found in Unleashed.');
  }
})();
