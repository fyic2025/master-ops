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
        if (filter && filter.column && filter.value) {
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

async function findUnlinked() {
    console.log('Finding BC products NOT linked to any supplier...\n');

    // Get all BC products
    console.log('Fetching BC products...');
    const bcProducts = await fetchAll('ecommerce_products', null,
        'id, product_id, sku, name, brand, barcode, inventory_level, is_visible'
    );
    console.log(`Total BC products: ${bcProducts.length}`);

    // Get all linked BC product IDs
    console.log('Fetching supplier links...');
    const links = await fetchAll('product_supplier_links', null,
        'ecommerce_product_id'
    );
    const linkedIds = new Set(links.map(l => l.ecommerce_product_id));
    console.log(`BC products with supplier links: ${linkedIds.size}`);

    // Find unlinked
    const unlinked = bcProducts.filter(p => !linkedIds.has(p.id));
    console.log(`\nBC products WITHOUT supplier links: ${unlinked.length}`);

    // Group by brand
    console.log('\n' + '='.repeat(60));
    console.log('UNLINKED BC PRODUCTS BY BRAND');
    console.log('='.repeat(60));

    const byBrand = {};
    unlinked.forEach(p => {
        const brand = p.brand || 'Unknown';
        if (!byBrand[brand]) byBrand[brand] = [];
        byBrand[brand].push(p);
    });

    Object.entries(byBrand)
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 30)
        .forEach(([brand, products]) => {
            console.log(`\n${brand}: ${products.length} products`);
            products.slice(0, 3).forEach(p => {
                console.log(`  - [${p.sku}] ${p.name.substring(0, 50)}...`);
            });
            if (products.length > 3) {
                console.log(`  ... and ${products.length - 3} more`);
            }
        });

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total BC products: ${bcProducts.length}`);
    console.log(`Linked to suppliers: ${linkedIds.size}`);
    console.log(`NOT linked (no stock sync): ${unlinked.length}`);
    console.log(`Link rate: ${((linkedIds.size / bcProducts.length) * 100).toFixed(1)}%`);
}

findUnlinked().catch(err => console.error('Error:', err));
