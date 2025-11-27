const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://usibnysqelovfuctmkqw.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'
);

async function fetchAll(table, filter, select) {
    const allData = [];
    let offset = 0;
    const limit = 1000;

    while (true) {
        let query = supabase.from(table).select(select).range(offset, offset + limit - 1);
        if (filter.column && filter.value) {
            query = query.eq(filter.column, filter.value);
        }
        const { data, error } = await query;
        if (error) throw error;
        if (!data || data.length === 0) break;
        allData.push(...data);
        if (data.length < limit) break;
        offset += limit;
    }
    return allData;
}

async function findUnpaired() {
    console.log('Fetching UHP products...');
    const uhpProducts = await fetchAll('supplier_products',
        { column: 'supplier_name', value: 'uhp' },
        'id, supplier_sku, product_name, barcode, brand'
    );

    console.log('Fetching UHP links...');
    const links = await fetchAll('product_supplier_links',
        { column: 'supplier_name', value: 'uhp' },
        'supplier_product_id'
    );

    const linkedIds = new Set(links.map(l => l.supplier_product_id));
    const unpaired = uhpProducts.filter(p => !linkedIds.has(p.id));

    console.log('\nUHP UNPAIRED PRODUCTS');
    console.log('=====================');
    console.log('Total UHP products:', uhpProducts.length);
    console.log('Linked UHP products:', linkedIds.size);
    console.log('Unpaired:', unpaired.length);
    console.log('');

    // Group by brand
    console.log('Unpaired by Brand:');
    const byBrand = {};
    unpaired.forEach(p => {
        const brand = p.brand || 'Unknown';
        byBrand[brand] = (byBrand[brand] || 0) + 1;
    });
    Object.entries(byBrand)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .forEach(([brand, count]) => {
            console.log(`  ${brand}: ${count}`);
        });

    console.log('\nSample unpaired (first 30):');
    unpaired.slice(0, 30).forEach((p, i) => {
        console.log(`${i+1}. [${p.supplier_sku}] ${p.product_name}`);
        console.log(`   Barcode: ${p.barcode || 'N/A'} | Brand: ${p.brand || 'N/A'}`);
    });
}

findUnpaired().catch(err => console.error('Error:', err));
