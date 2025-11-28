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
    console.log('='.repeat(60));
    console.log('BOO PRODUCT PAIRING - FULL STATUS REPORT');
    console.log('='.repeat(60));
    console.log('');

    // Get all BC products
    const bcProducts = await fetchAll('ecommerce_products', 'id, sku, name, brand');
    console.log(`Total BC Products: ${bcProducts.length}`);

    // Get all links
    const links = await fetchAll('product_supplier_links', 'ecommerce_product_id, supplier_name, is_active, match_type');
    const linkedIds = new Set(links.map(l => l.ecommerce_product_id));
    const unlinked = bcProducts.filter(p => !linkedIds.has(p.id));

    console.log(`Linked BC Products: ${linkedIds.size}`);
    console.log(`Unlinked BC Products: ${unlinked.length}`);
    console.log(`Link Rate: ${((linkedIds.size / bcProducts.length) * 100).toFixed(1)}%`);

    // Links by supplier
    console.log('\n' + '-'.repeat(60));
    console.log('LINKS BY SUPPLIER:');
    console.log('-'.repeat(60));
    const bySupplier = {};
    links.forEach(l => {
        bySupplier[l.supplier_name] = (bySupplier[l.supplier_name] || 0) + 1;
    });
    Object.entries(bySupplier).sort((a, b) => b[1] - a[1]).forEach(([s, c]) => {
        console.log(`  ${s.padEnd(15)}: ${c}`);
    });

    // Unlinked by SKU prefix (indicates likely supplier)
    console.log('\n' + '-'.repeat(60));
    console.log('UNLINKED BY SKU PREFIX (Top 25):');
    console.log('-'.repeat(60));
    const byPrefix = {};
    unlinked.forEach(p => {
        const sku = p.sku || '';
        let prefix = sku.split(' - ')[0];
        if (!prefix || prefix === sku) prefix = sku.split('-')[0];
        if (!prefix) prefix = 'NO_SKU';
        byPrefix[prefix] = (byPrefix[prefix] || 0) + 1;
    });
    Object.entries(byPrefix).sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([p, c]) => {
        console.log(`  ${p.padEnd(20)}: ${c}`);
    });

    // Map prefixes to suppliers
    console.log('\n' + '-'.repeat(60));
    console.log('SUPPLIER ANALYSIS:');
    console.log('-'.repeat(60));

    const prefixMap = {
        'UN': 'Unleashed',
        'OB': 'Oborne',
        'KIK': 'Kikai',
        'KAD': 'Kadac',
        'UHP': 'UHP'
        // GBN is NOT Kadac - separate supplier
    };

    const supplierUnlinked = {};
    unlinked.forEach(p => {
        const sku = p.sku || '';
        let prefix = sku.split(' - ')[0];
        if (!prefix || prefix === sku) prefix = sku.split('-')[0];

        let supplier = 'Unknown';
        for (const [pre, sup] of Object.entries(prefixMap)) {
            if (prefix.startsWith(pre) || prefix === pre) {
                supplier = sup;
                break;
            }
        }
        supplierUnlinked[supplier] = (supplierUnlinked[supplier] || 0) + 1;
    });

    Object.entries(supplierUnlinked).sort((a, b) => b[1] - a[1]).forEach(([s, c]) => {
        console.log(`  ${s.padEnd(15)}: ${c} unlinked`);
    });

    // Sample unlinked by likely supplier
    console.log('\n' + '-'.repeat(60));
    console.log('SAMPLE UNLINKED PRODUCTS:');
    console.log('-'.repeat(60));

    // KADAC (KAD prefix only)
    const kadacUnlinked = unlinked.filter(p => (p.sku || '').startsWith('KAD'));
    console.log(`\nKADAC - KAD prefix (${kadacUnlinked.length} unlinked):`);
    kadacUnlinked.slice(0, 5).forEach(p => {
        console.log(`  [${p.sku}] ${(p.name || '').substring(0, 50)}`);
    });

    // Kikai samples
    const kikaiUnlinked = unlinked.filter(p => (p.sku || '').includes('KIK'));
    console.log(`\nKIKAI - KIK prefix (${kikaiUnlinked.length} unlinked):`);
    kikaiUnlinked.slice(0, 5).forEach(p => {
        console.log(`  [${p.sku}] ${(p.name || '').substring(0, 50)}`);
    });

    // UHP samples
    const uhpUnlinked = unlinked.filter(p => (p.sku || '').startsWith('UHP'));
    console.log(`\nUHP prefix (${uhpUnlinked.length} unlinked):`);
    uhpUnlinked.slice(0, 5).forEach(p => {
        console.log(`  [${p.sku}] ${(p.name || '').substring(0, 50)}`);
    });

    // Unleashed samples
    const unUnlinked = unlinked.filter(p => (p.sku || '').startsWith('UN'));
    console.log(`\nUNLEASHED - UN prefix (${unUnlinked.length} unlinked):`);
    unUnlinked.slice(0, 5).forEach(p => {
        console.log(`  [${p.sku}] ${(p.name || '').substring(0, 50)}`);
    });

    // GBN samples (NOT Kadac)
    const gbnUnlinked = unlinked.filter(p => (p.sku || '').startsWith('GBN'));
    console.log(`\nGBN prefix - NOT KADAC (${gbnUnlinked.length} unlinked):`);
    gbnUnlinked.slice(0, 5).forEach(p => {
        console.log(`  [${p.sku}] ${(p.name || '').substring(0, 50)}`);
    });

    // Oborne samples
    const obUnlinked = unlinked.filter(p => (p.sku || '').startsWith('OB'));
    console.log(`\nOBORNE - OB prefix (${obUnlinked.length} unlinked):`);
    obUnlinked.slice(0, 5).forEach(p => {
        console.log(`  [${p.sku}] ${(p.name || '').substring(0, 50)}`);
    });

    console.log('\n' + '='.repeat(60));
}

check().catch(console.error);
