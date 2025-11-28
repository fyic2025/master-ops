const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
    'https://usibnysqelovfuctmkqw.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'
);

function normalizeBarcode(barcode) {
    if (!barcode) return null;
    return barcode.toString().replace(/[\s\-]/g, '').replace(/^0+/, '');
}

async function fetchAll(table, select, filter) {
    const allData = [];
    let offset = 0;
    const limit = 1000;
    while (true) {
        let query = supabase.from(table).select(select).range(offset, offset + limit - 1);
        if (filter) query = query.eq(filter.col, filter.val);
        const { data, error } = await query;
        if (error) throw error;
        if (!data || data.length === 0) break;
        allData.push(...data);
        if (data.length < limit) break;
        offset += limit;
    }
    return allData;
}

async function run() {
    const oborneProducts = await fetchAll('supplier_products', 'id, supplier_sku, barcode', { col: 'supplier_name', val: 'oborne' });
    const allBC = await fetchAll('ecommerce_products', 'id, sku, name, barcode, brand, inventory_level');
    const allLinks = await fetchAll('product_supplier_links', 'ecommerce_product_id');
    const linkedSet = new Set(allLinks.map(l => l.ecommerce_product_id));

    const obUnlinked = allBC.filter(p => (p.sku || '').startsWith('OB') && !linkedSet.has(p.id));

    // Build normalized barcode lookup
    const oborneByNormalizedBarcode = {};
    oborneProducts.forEach(p => {
        const norm = normalizeBarcode(p.barcode);
        if (norm) oborneByNormalizedBarcode[norm] = p;
    });

    // Get products NOT in Oborne feed
    const notInOborne = obUnlinked.filter(p => {
        const norm = normalizeBarcode(p.barcode);
        return !norm || !oborneByNormalizedBarcode[norm];
    });

    // Filter: has stock > 0, NOT "copy of" or "on sale"
    const withStock = notInOborne.filter(p => {
        const stock = p.inventory_level || 0;
        const sku = (p.sku || '').toLowerCase();
        const name = (p.name || '').toLowerCase();

        // Exclude copy of and on sale
        if (sku.includes('copy of') || sku.includes('copy_of')) return false;
        if (name.includes('on sale') || name.includes('- on sale')) return false;

        return stock > 0;
    });

    console.log('='.repeat(60));
    console.log('OBORNE: PRODUCTS WITH STOCK (excluding Copy/Sale)');
    console.log('='.repeat(60));
    console.log(`\nTotal products with stock after filtering: ${withStock.length}`);

    // Group by brand
    const byBrand = {};
    withStock.forEach(p => {
        const brand = p.brand || 'Unknown';
        if (!byBrand[brand]) byBrand[brand] = [];
        byBrand[brand].push(p);
    });

    console.log('\n');
    Object.entries(byBrand)
        .sort((a, b) => b[1].length - a[1].length)
        .forEach(([brand, products]) => {
            console.log(`${brand} (${products.length}):`);
            products.forEach(p => {
                console.log(`  [${p.sku}] Stock: ${p.inventory_level} - ${(p.name || '').substring(0, 45)}`);
            });
            console.log('');
        });
}

run().catch(console.error);
