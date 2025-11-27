const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkSuppliers() {
    console.log('CHECKING ALL SUPPLIER DATA\n');

    // Get distinct supplier names with counts
    const { data, error } = await supabase.rpc('get_supplier_counts');

    if (error) {
        console.log('RPC error, trying raw query...\n');

        // Raw query approach
        const { data: allProducts, error: allErr } = await supabase
            .from('supplier_products')
            .select('supplier_name, id')
            .limit(50000);

        if (allErr) {
            console.log('Error:', allErr.message);
            return;
        }

        const counts = {};
        allProducts.forEach(p => {
            counts[p.supplier_name] = (counts[p.supplier_name] || 0) + 1;
        });

        console.log('Supplier Products by Name:');
        Object.keys(counts).sort().forEach(name => {
            console.log(`  ${name}: ${counts[name]}`);
        });
        console.log(`\nTOTAL: ${allProducts.length} supplier products`);
    }

    // Sample from each supplier
    console.log('\n\nSample products from each supplier:\n');

    const suppliers = ['kadac', 'oborne', 'uhp', 'UHP', 'unleashed', 'Unleashed'];

    for (const supplier of suppliers) {
        const { data: sample, error: sampleErr } = await supabase
            .from('supplier_products')
            .select('supplier_name, supplier_sku, product_name')
            .eq('supplier_name', supplier)
            .limit(2);

        if (sample && sample.length > 0) {
            console.log(`${supplier}:`);
            sample.forEach(p => {
                console.log(`  - ${p.supplier_sku}: ${p.product_name?.substring(0, 50)}...`);
            });
        }
    }
}

checkSuppliers().catch(err => console.error('Error:', err.message));
