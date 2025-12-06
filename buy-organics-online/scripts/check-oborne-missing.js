const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
    'https://usibnysqelovfuctmkqw.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'
);

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

async function check() {
    // Get Oborne supplier products
    const oborneProducts = await fetchAll('supplier_products', 'supplier_sku, product_name, barcode', { col: 'supplier_name', val: 'oborne' });

    // Get all BC products and links
    const allBC = await fetchAll('ecommerce_products', 'id, sku, name, barcode, brand');
    const allLinks = await fetchAll('product_supplier_links', 'ecommerce_product_id');
    const linkedSet = new Set(allLinks.map(l => l.ecommerce_product_id));

    // Get unlinked OB products
    const obUnlinked = allBC.filter(p => (p.sku || '').startsWith('OB') && !linkedSet.has(p.id));

    // Build lookup maps
    const oborneByBarcode = {};
    const oborneBySku = {};
    oborneProducts.forEach(p => {
        if (p.barcode) oborneByBarcode[p.barcode] = p;
        if (p.supplier_sku) oborneBySku[p.supplier_sku.toUpperCase()] = p;
    });

    console.log('='.repeat(70));
    console.log('458 UNLINKED OB PRODUCTS - ANALYSIS');
    console.log('='.repeat(70));

    // Group by brand
    const byBrand = {};
    obUnlinked.forEach(p => {
        const brand = p.brand || 'Unknown';
        if (!byBrand[brand]) byBrand[brand] = [];
        byBrand[brand].push(p);
    });

    console.log('\nUNLINKED BY BRAND:');
    Object.entries(byBrand).sort((a, b) => b[1].length - a[1].length).slice(0, 20).forEach(([brand, products]) => {
        console.log(`  ${brand}: ${products.length}`);
    });

    // Sample products with their barcodes and SKUs
    console.log('\n' + '-'.repeat(70));
    console.log('SAMPLE UNLINKED PRODUCTS (first 30):');
    console.log('-'.repeat(70));

    obUnlinked.slice(0, 30).forEach((p, i) => {
        const bcSku = (p.sku || '').replace('OB - ', '').replace('OB-', '');
        const foundBySku = oborneBySku[bcSku.toUpperCase()];
        const foundByBarcode = p.barcode ? oborneByBarcode[p.barcode] : null;

        console.log(`\n${i+1}. [${p.sku}] ${(p.name || '').substring(0, 50)}`);
        console.log(`   Brand: ${p.brand || 'Unknown'} | Barcode: ${p.barcode || 'NONE'}`);
        console.log(`   In Oborne by SKU (${bcSku}): ${foundBySku ? 'YES' : 'NO'}`);
        console.log(`   In Oborne by Barcode: ${foundByBarcode ? 'YES - ' + foundByBarcode.supplier_sku : 'NO'}`);
    });

    // Try partial SKU match
    console.log('\n' + '-'.repeat(70));
    console.log('TRYING PARTIAL SKU MATCHES:');
    console.log('-'.repeat(70));

    let partialMatches = 0;
    obUnlinked.slice(0, 20).forEach(p => {
        const bcSku = (p.sku || '').replace('OB - ', '').replace('OB-', '').toUpperCase();

        // Look for partial matches
        const matches = oborneProducts.filter(op =>
            op.supplier_sku && op.supplier_sku.toUpperCase().includes(bcSku)
        ).slice(0, 2);

        if (matches.length > 0) {
            console.log(`\n[${p.sku}]:`);
            matches.forEach(m => console.log(`  -> [${m.supplier_sku}] ${(m.product_name || '').substring(0, 40)}`));
            partialMatches++;
        }
    });

    if (partialMatches === 0) {
        console.log('No partial SKU matches found in first 20 products');
    }
}

check().catch(console.error);
