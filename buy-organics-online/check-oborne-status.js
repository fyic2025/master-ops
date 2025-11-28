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
    console.log('='.repeat(60));
    console.log('OBORNE SUPPLIER STATUS');
    console.log('='.repeat(60));

    // Count Oborne supplier products
    const oborneProducts = await fetchAll('supplier_products', 'id, supplier_sku, product_name, barcode', { col: 'supplier_name', val: 'oborne' });
    console.log(`\nOborne products in feed: ${oborneProducts.length}`);

    // Count Oborne links
    const oborneLinks = await fetchAll('product_supplier_links', 'ecommerce_product_id, supplier_product_id, match_type', { col: 'supplier_name', val: 'oborne' });
    console.log(`Oborne links created: ${oborneLinks.length}`);

    // Get all BC products
    const allBC = await fetchAll('ecommerce_products', 'id, sku, name, barcode');
    const allLinks = await fetchAll('product_supplier_links', 'ecommerce_product_id');
    const linkedSet = new Set(allLinks.map(l => l.ecommerce_product_id));

    // BC products with OB prefix
    const obProducts = allBC.filter(p => (p.sku || '').startsWith('OB'));
    const obLinked = obProducts.filter(p => linkedSet.has(p.id));
    const obUnlinked = obProducts.filter(p => !linkedSet.has(p.id));

    console.log(`\nBC Products with OB- prefix: ${obProducts.length}`);
    console.log(`  Already linked: ${obLinked.length}`);
    console.log(`  Need linking: ${obUnlinked.length}`);

    // Check how many unlinked OB products could match by barcode
    const oborneByBarcode = {};
    oborneProducts.forEach(p => {
        if (p.barcode) oborneByBarcode[p.barcode] = p;
    });

    let barcodeMatches = 0;
    let noBarcodeOnBC = 0;
    let noMatchInOborne = 0;

    obUnlinked.forEach(p => {
        if (!p.barcode) {
            noBarcodeOnBC++;
        } else if (oborneByBarcode[p.barcode]) {
            barcodeMatches++;
        } else {
            noMatchInOborne++;
        }
    });

    console.log(`\nPotential matches for ${obUnlinked.length} unlinked OB products:`);
    console.log(`  Can match by barcode: ${barcodeMatches}`);
    console.log(`  BC product has no barcode: ${noBarcodeOnBC}`);
    console.log(`  Barcode not found in Oborne feed: ${noMatchInOborne}`);

    // Check by SKU matching (OB - XXX -> XXX in Oborne)
    const oborneBySku = {};
    oborneProducts.forEach(p => {
        if (p.supplier_sku) oborneBySku[p.supplier_sku.toUpperCase()] = p;
    });

    let skuMatches = 0;
    obUnlinked.forEach(p => {
        const sku = (p.sku || '').replace('OB - ', '').replace('OB-', '').toUpperCase();
        if (oborneBySku[sku]) skuMatches++;
    });

    console.log(`  Can match by SKU (OB-XXX -> XXX): ${skuMatches}`);

    // Sample unlinked that could be matched
    console.log('\n' + '-'.repeat(60));
    console.log('SAMPLE MATCHABLE BY BARCODE:');
    let shown = 0;
    for (const p of obUnlinked) {
        if (p.barcode && oborneByBarcode[p.barcode] && shown < 5) {
            const match = oborneByBarcode[p.barcode];
            console.log(`  BC: [${p.sku}] ${(p.name || '').substring(0, 35)}`);
            console.log(`  -> [${match.supplier_sku}] ${(match.product_name || '').substring(0, 35)}`);
            shown++;
        }
    }

    console.log('\n' + '-'.repeat(60));
    console.log('SAMPLE MATCHABLE BY SKU:');
    shown = 0;
    for (const p of obUnlinked) {
        const sku = (p.sku || '').replace('OB - ', '').replace('OB-', '').toUpperCase();
        if (oborneBySku[sku] && shown < 5) {
            const match = oborneBySku[sku];
            console.log(`  BC: [${p.sku}] ${(p.name || '').substring(0, 35)}`);
            console.log(`  -> [${match.supplier_sku}] ${(match.product_name || '').substring(0, 35)}`);
            shown++;
        }
    }

    console.log('\n' + '='.repeat(60));
}

check().catch(console.error);
