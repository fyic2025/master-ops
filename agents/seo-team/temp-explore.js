const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://usibnysqelovfuctmkqw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s');

async function explore() {
    // Get Kadac products
    const { data: kadac } = await supabase
        .from('supplier_products')
        .select('*')
        .ilike('supplier_name', '%kadac%')
        .limit(3);

    console.log('='.repeat(60));
    console.log('KADAC SUPPLIER DATA');
    console.log('='.repeat(60));
    console.log('Products found:', kadac?.length || 0);
    if (kadac?.length > 0) {
        kadac.forEach((p, i) => {
            console.log(`\n--- Kadac Product ${i+1}: ${p.product_name} ---`);
            console.log('Brand:', p.brand);
            console.log('Size:', p.size);
            console.log('Category:', p.category);
            console.log('Barcode:', p.barcode);
            console.log('Cost:', p.cost_price, '| RRP:', p.rrp);
            console.log('Metadata keys:', p.metadata ? Object.keys(p.metadata) : 'none');
            if (p.metadata) {
                console.log('Full metadata:', JSON.stringify(p.metadata, null, 2));
            }
        });
    }

    // Get Oborne products
    const { data: oborne } = await supabase
        .from('supplier_products')
        .select('*')
        .ilike('supplier_name', '%oborne%')
        .limit(3);

    console.log('\n' + '='.repeat(60));
    console.log('OBORNE SUPPLIER DATA');
    console.log('='.repeat(60));
    console.log('Products found:', oborne?.length || 0);
    if (oborne?.length > 0) {
        oborne.forEach((p, i) => {
            console.log(`\n--- Oborne Product ${i+1}: ${p.product_name} ---`);
            console.log('Brand:', p.brand);
            console.log('Size:', p.size);
            console.log('Category:', p.category);
            console.log('Barcode:', p.barcode);
            console.log('Cost:', p.cost_price, '| RRP:', p.rrp);
            console.log('Metadata keys:', p.metadata ? Object.keys(p.metadata) : 'none');
            if (p.metadata) {
                console.log('Full metadata:', JSON.stringify(p.metadata, null, 2));
            }
        });
    }

    // Count by supplier
    const { data: counts } = await supabase
        .from('supplier_products')
        .select('supplier_name');

    const supplierCounts = {};
    counts?.forEach(p => {
        supplierCounts[p.supplier_name] = (supplierCounts[p.supplier_name] || 0) + 1;
    });

    console.log('\n' + '='.repeat(60));
    console.log('SUPPLIER PRODUCT COUNTS');
    console.log('='.repeat(60));
    Object.entries(supplierCounts).forEach(([name, count]) => {
        console.log(`${name}: ${count} products`);
    });
}

explore();
