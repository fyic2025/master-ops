const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function verify() {
    console.log('VERIFYING SUPPLIER PRODUCT COUNTS\n');

    // Use count directly
    const { count: totalCount, error: countErr } = await supabase
        .from('supplier_products')
        .select('*', { count: 'exact', head: true });

    console.log(`Total supplier_products: ${totalCount}`);

    // Count by supplier using filter
    const suppliers = ['kadac', 'oborne', 'uhp', 'unleashed', 'test'];

    for (const supplier of suppliers) {
        const { count, error } = await supabase
            .from('supplier_products')
            .select('*', { count: 'exact', head: true })
            .eq('supplier_name', supplier);

        if (!error) {
            console.log(`  ${supplier}: ${count}`);
        } else {
            console.log(`  ${supplier}: ERROR - ${error.message}`);
        }
    }

    // Also check ecommerce_products
    const { count: bcCount, error: bcErr } = await supabase
        .from('ecommerce_products')
        .select('*', { count: 'exact', head: true });

    console.log(`\nTotal ecommerce_products: ${bcCount}`);

    // And product_supplier_links
    const { count: linkCount, error: linkErr } = await supabase
        .from('product_supplier_links')
        .select('*', { count: 'exact', head: true });

    console.log(`Total product_supplier_links: ${linkCount}`);
}

verify().catch(err => console.error('Error:', err.message));
