const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://usibnysqelovfuctmkqw.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'
);

async function cleanup() {
    // Get all Nutra Organics product IDs
    const { data: products, error } = await supabase
        .from('ecommerce_products')
        .select('id')
        .ilike('brand', '%Nutra Organics%');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${products.length} Nutra Organics products to clean up`);
    const ids = products.map(p => p.id);

    // Delete from seo_products first
    console.log('Deleting from seo_products...');
    const { error: seoErr } = await supabase
        .from('seo_products')
        .delete()
        .in('ecommerce_product_id', ids);
    if (seoErr) console.log('seo_products error:', seoErr.message);
    else console.log('  Done');

    // Delete from product_supplier_links
    console.log('Deleting from product_supplier_links...');
    const { error: linkErr } = await supabase
        .from('product_supplier_links')
        .delete()
        .in('ecommerce_product_id', ids);
    if (linkErr) console.log('product_supplier_links error:', linkErr.message);
    else console.log('  Done');

    // Delete from ecommerce_products
    console.log('Deleting from ecommerce_products...');
    const { error: prodErr } = await supabase
        .from('ecommerce_products')
        .delete()
        .in('id', ids);
    if (prodErr) console.log('ecommerce_products error:', prodErr.message);
    else console.log('  Done');

    console.log('\nCleanup complete!');
}

cleanup().catch(err => console.error('Error:', err));
