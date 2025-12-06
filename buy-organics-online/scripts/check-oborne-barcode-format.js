const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
    'https://usibnysqelovfuctmkqw.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'
);

function normalizeBarcode(barcode) {
    if (!barcode) return null;
    // Remove spaces, dashes, leading zeros issues
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

async function check() {
    const oborneProducts = await fetchAll('supplier_products', 'id, supplier_sku, product_name, barcode', { col: 'supplier_name', val: 'oborne' });
    const allBC = await fetchAll('ecommerce_products', 'id, sku, name, barcode, brand');
    const allLinks = await fetchAll('product_supplier_links', 'ecommerce_product_id');
    const linkedSet = new Set(allLinks.map(l => l.ecommerce_product_id));

    const obUnlinked = allBC.filter(p => (p.sku || '').startsWith('OB') && !linkedSet.has(p.id));

    // Build normalized barcode lookup
    const oborneByNormalizedBarcode = {};
    oborneProducts.forEach(p => {
        const norm = normalizeBarcode(p.barcode);
        if (norm) oborneByNormalizedBarcode[norm] = p;
    });

    console.log('='.repeat(60));
    console.log('BARCODE FORMAT ANALYSIS');
    console.log('='.repeat(60));

    let matchesWithNormalization = 0;
    const matchedPairs = [];

    obUnlinked.forEach(p => {
        const norm = normalizeBarcode(p.barcode);
        if (norm && oborneByNormalizedBarcode[norm]) {
            matchesWithNormalization++;
            matchedPairs.push({ bc: p, ob: oborneByNormalizedBarcode[norm] });
        }
    });

    console.log(`\nWith normalized barcodes (no spaces/dashes):`);
    console.log(`  Additional matches found: ${matchesWithNormalization}`);

    if (matchedPairs.length > 0) {
        console.log('\nSample matches with normalized barcodes:');
        matchedPairs.slice(0, 10).forEach(({ bc, ob }) => {
            console.log(`  BC: [${bc.sku}] barcode: "${bc.barcode}"`);
            console.log(`  OB: [${ob.supplier_sku}] barcode: "${ob.barcode}"`);
            console.log('');
        });
    }

    // Check sample barcodes from both sides
    console.log('\n' + '-'.repeat(60));
    console.log('SAMPLE BARCODE FORMATS:');
    console.log('-'.repeat(60));

    console.log('\nBC (first 5 with barcodes):');
    obUnlinked.filter(p => p.barcode).slice(0, 5).forEach(p => {
        console.log(`  "${p.barcode}" -> normalized: "${normalizeBarcode(p.barcode)}"`);
    });

    console.log('\nOborne (first 5 with barcodes):');
    oborneProducts.filter(p => p.barcode).slice(0, 5).forEach(p => {
        console.log(`  "${p.barcode}" -> normalized: "${normalizeBarcode(p.barcode)}"`);
    });

    // Summary of why not matching
    console.log('\n' + '-'.repeat(60));
    console.log('WHY 458 PRODUCTS NOT MATCHING:');
    console.log('-'.repeat(60));

    let noBarcodeBC = 0;
    let barcodeNotInOborne = 0;
    let normalizedMatch = matchesWithNormalization;

    obUnlinked.forEach(p => {
        if (!p.barcode || p.barcode === 'NONE' || p.barcode === 'N/A') {
            noBarcodeBC++;
        } else {
            const norm = normalizeBarcode(p.barcode);
            if (!oborneByNormalizedBarcode[norm]) {
                barcodeNotInOborne++;
            }
        }
    });

    console.log(`  No barcode in BC: ${noBarcodeBC}`);
    console.log(`  Would match with normalization: ${normalizedMatch}`);
    console.log(`  Barcode not in Oborne feed (likely discontinued): ${barcodeNotInOborne}`);
    console.log(`  TOTAL: ${obUnlinked.length}`);
}

check().catch(console.error);
