const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
    'https://usibnysqelovfuctmkqw.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'
);

async function fetchAll(table, select) {
    const allData = [];
    let offset = 0;
    const limit = 1000;
    while (true) {
        const { data, error } = await supabase.from(table).select(select).range(offset, offset + limit - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allData.push(...data);
        if (data.length < limit) break;
        offset += limit;
    }
    return allData;
}

async function check() {
    const allBC = await fetchAll('ecommerce_products', 'id, sku, name, brand');
    const links = await fetchAll('product_supplier_links', 'ecommerce_product_id');
    const linkedSet = new Set(links.map(l => l.ecommerce_product_id));
    const unlinked = allBC.filter(p => !linkedSet.has(p.id));

    // Find products that are NOT OB, UN, GBN, KIK, KAD, UHP prefixed
    const other = unlinked.filter(p => {
        const sku = (p.sku || '').toUpperCase();
        return !sku.startsWith('OB') && !sku.startsWith('UN') && !sku.startsWith('GBN') &&
               !sku.includes('KIK') && !sku.startsWith('KAD') && !sku.startsWith('UHP');
    });

    console.log('='.repeat(60));
    console.log(`UNKNOWN/OTHER UNLINKED PRODUCTS (${other.length} total)`);
    console.log('These may be UN (Unleashed) or UHP products');
    console.log('='.repeat(60));
    console.log('');

    // Group by prefix
    const byPrefix = {};
    other.forEach(p => {
        const sku = p.sku || '';
        let prefix = sku.split(' - ')[0];
        if (!prefix || prefix === sku) prefix = sku.split('-')[0];
        if (!prefix) prefix = 'NO_SKU';
        if (!byPrefix[prefix]) byPrefix[prefix] = [];
        byPrefix[prefix].push(p);
    });

    Object.entries(byPrefix).sort((a, b) => b[1].length - a[1].length).forEach(([prefix, products]) => {
        console.log(`\n${prefix} (${products.length} products):`);
        products.slice(0, 3).forEach(p => {
            console.log(`  [${p.sku}] ${(p.name || '').substring(0, 45)}`);
            console.log(`     Brand: ${p.brand || 'Unknown'}`);
        });
        if (products.length > 3) {
            console.log(`  ... and ${products.length - 3} more`);
        }
    });
}

check().catch(console.error);
