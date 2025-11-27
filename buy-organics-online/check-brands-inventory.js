const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://usibnysqelovfuctmkqw.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'
);

const BRANDS = [
    'Unknown',
    'Alaffia',
    'Acure',
    'Weleda',
    'Miessence',
    'Simply Clean',
    'Eclipse Organics',
    'Onya For Life',
    'Food To Nourish',
    'Saltco',
    'Mount Romance',
    'Aotearoad',
    'Oil Garden',
    'Giovanni',
    'Locako',
    'Dr Organic',
    'Retrokitchen',
    'The Carob Kitchen',
    'Organic India',
    'Slendier',
    'Happy Way'
];

async function fetchAll(table, filter, select) {
    const allData = [];
    let offset = 0;
    const limit = 1000;

    while (true) {
        let query = supabase.from(table).select(select).range(offset, offset + limit - 1);
        if (filter && filter.column && filter.value) {
            if (filter.op === 'ilike') {
                query = query.ilike(filter.column, filter.value);
            } else if (filter.op === 'is') {
                query = query.is(filter.column, filter.value);
            } else {
                query = query.eq(filter.column, filter.value);
            }
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

async function checkBrands() {
    // Get all supplier links
    const links = await fetchAll('product_supplier_links', null, 'ecommerce_product_id');
    const linkedIds = new Set(links.map(l => l.ecommerce_product_id));

    console.log('UNLINKED BRAND INVENTORY BREAKDOWN');
    console.log('='.repeat(70));
    console.log('');

    for (const brand of BRANDS) {
        // Handle "Unknown" specially - look for null/empty brand
        let products;
        if (brand === 'Unknown') {
            const allProducts = await fetchAll('ecommerce_products', null,
                'id, product_id, sku, name, brand, inventory_level, is_visible'
            );
            products = allProducts.filter(p => !p.brand || p.brand.trim() === '');
        } else {
            products = await fetchAll('ecommerce_products',
                { column: 'brand', value: `%${brand}%`, op: 'ilike' },
                'id, product_id, sku, name, brand, inventory_level, is_visible'
            );
        }

        // Filter to unlinked
        const unlinked = products.filter(p => !linkedIds.has(p.id));

        if (unlinked.length === 0) continue;

        // Group by inventory
        const inv0 = unlinked.filter(p => p.inventory_level === 0);
        const inv1000 = unlinked.filter(p => p.inventory_level === 1000);
        const invOther = unlinked.filter(p => p.inventory_level !== 0 && p.inventory_level !== 1000);

        console.log(`${brand.padEnd(25)} | Total: ${unlinked.length.toString().padStart(3)} | 0inv: ${inv0.length.toString().padStart(3)} | 1000inv: ${inv1000.length.toString().padStart(3)} | Other: ${invOther.length.toString().padStart(3)}`);

        if (invOther.length > 0 && invOther.length <= 5) {
            invOther.forEach(p => {
                console.log(`  -> inv=${p.inventory_level}: [${p.sku}] ${p.name.substring(0, 40)}...`);
            });
        } else if (invOther.length > 5) {
            invOther.slice(0, 3).forEach(p => {
                console.log(`  -> inv=${p.inventory_level}: [${p.sku}] ${p.name.substring(0, 40)}...`);
            });
            console.log(`  -> ... and ${invOther.length - 3} more with stock`);
        }
    }

    console.log('');
    console.log('='.repeat(70));
    console.log('0inv = ready to delete | 1000inv = placeholder stock | Other = real stock');
}

checkBrands().catch(err => console.error('Error:', err));
