const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://usibnysqelovfuctmkqw.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'
);

const BRAND = process.argv[2] || 'Switch Nutrition';

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

async function showBrand() {
    console.log(`UNPAIRED UHP PRODUCTS: ${BRAND}`);
    console.log('='.repeat(50));

    // Get all UHP supplier products for this brand
    const uhpProducts = await fetchAll('supplier_products',
        { column: 'supplier_name', value: 'uhp' },
        'id, supplier_sku, product_name, barcode, brand'
    );

    // Filter by brand
    const brandProducts = uhpProducts.filter(p => p.brand === BRAND);
    console.log(`Total ${BRAND} products in UHP: ${brandProducts.length}`);

    // Get linked product IDs
    const links = await fetchAll('product_supplier_links',
        { column: 'supplier_name', value: 'uhp' },
        'supplier_product_id'
    );
    const linkedIds = new Set(links.map(l => l.supplier_product_id));

    // Find unpaired
    const unpaired = brandProducts.filter(p => !linkedIds.has(p.id));
    console.log(`Unpaired: ${unpaired.length}\n`);

    // Show all unpaired
    unpaired.forEach((p, i) => {
        console.log(`${i+1}. [${p.supplier_sku}] ${p.product_name}`);
        console.log(`   Barcode: ${p.barcode || 'N/A'}`);
    });
}

showBrand().catch(err => console.error('Error:', err));
