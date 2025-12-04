const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const credsPath = './creds.js';
const creds = require(credsPath);

async function main() {
  await creds.load('teelixir');
  const supabaseKey = await creds.get('global', 'master_supabase_service_role_key');
  const supabase = createClient('https://qcvfxxsnqvdfmpbcgdni.supabase.co', supabaseKey);

  // Get available products with multiple sizes
  const { data, error } = await supabase
    .from('tlx_shopify_variants')
    .select('product_title, product_handle, product_type, variant_title, size_grams, price, image_url, is_available, inventory_quantity')
    .eq('is_available', true)
    .gt('inventory_quantity', 0)
    .in('size_grams', [50, 100])
    .not('product_title', 'ilike', '%gift%')
    .not('product_title', 'ilike', '%100% off%')
    .not('product_title', 'ilike', '%latte%')
    .order('product_type')
    .order('size_grams', { ascending: true });

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log(JSON.stringify(data, null, 2));
}

main();
