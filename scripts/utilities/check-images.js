const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  'https://usibnysqelovfuctmkqw.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkImages() {
  const { data: all } = await supabase
    .from('ecommerce_products')
    .select('bc_product_id, sku, name, image_url')
    .eq('store', 'boo');

  if (all) {
    const total = all.length;
    const withImages = all.filter(p => p.image_url && p.image_url.trim() !== '').length;
    const withoutImages = total - withImages;

    console.log('=== BOO Product Images ===');
    console.log('Total products:', total);
    console.log('Products WITH images:', withImages);
    console.log('Products WITHOUT images:', withoutImages);
    console.log('Missing image %:', ((withoutImages / total) * 100).toFixed(1) + '%');

    const noImageSample = all.filter(p => !p.image_url || p.image_url.trim() === '').slice(0, 15);
    if (noImageSample.length > 0) {
      console.log('');
      console.log('Sample products without images:');
      noImageSample.forEach(p => console.log('  -', p.sku || 'no-sku', '-', (p.name || 'no-name').substring(0, 50)));
    }
  }
}

checkImages();
