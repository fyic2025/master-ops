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

async function findMatches() {
    console.log('Finding barcode matches between unpaired UHP and BC products...\n');

    // Get all UHP supplier products
    console.log('Fetching UHP products...');
    const uhpProducts = await fetchAll('supplier_products',
        { column: 'supplier_name', value: 'uhp' },
        'id, supplier_sku, product_name, barcode, brand'
    );

    // Get linked product IDs
    console.log('Fetching existing links...');
    const links = await fetchAll('product_supplier_links',
        { column: 'supplier_name', value: 'uhp' },
        'supplier_product_id'
    );
    const linkedIds = new Set(links.map(l => l.supplier_product_id));

    // Find unpaired with barcodes
    const unpaired = uhpProducts.filter(p => !linkedIds.has(p.id) && p.barcode);
    console.log(`Unpaired UHP products with barcodes: ${unpaired.length}`);

    // Get all BC products with barcodes
    console.log('Fetching BC products...');
    const bcProducts = await fetchAll('ecommerce_products',
        {},
        'id, product_id, sku, name, barcode, gtin, upc'
    );

    // Build barcode lookup from BC
    const bcByBarcode = new Map();
    bcProducts.forEach(p => {
        if (p.barcode) bcByBarcode.set(p.barcode, p);
        if (p.gtin) bcByBarcode.set(p.gtin, p);
        if (p.upc) bcByBarcode.set(p.upc, p);
    });

    console.log(`BC products with barcodes: ${bcByBarcode.size}\n`);

    // Find matches
    const matches = [];
    for (const uhp of unpaired) {
        const bc = bcByBarcode.get(uhp.barcode);
        if (bc) {
            matches.push({ uhp, bc });
        }
    }

    console.log('=' .repeat(60));
    console.log(`BARCODE MATCHES FOUND: ${matches.length}`);
    console.log('=' .repeat(60));

    if (matches.length === 0) {
        console.log('\nNo matches found - unpaired products do not exist in BC.');
    } else {
        console.log('\nThese can be auto-linked:\n');
        matches.forEach((m, i) => {
            console.log(`${i+1}. SUPPLIER: [${m.uhp.supplier_sku}] ${m.uhp.product_name}`);
            console.log(`   BC:       [${m.bc.sku}] ${m.bc.name}`);
            console.log(`   Barcode:  ${m.uhp.barcode}`);
            console.log('');
        });
    }

    // Summary by brand
    console.log('\nUnpaired with NO BC match (by brand):');
    const noMatch = unpaired.filter(p => !bcByBarcode.has(p.barcode));
    const byBrand = {};
    noMatch.forEach(p => {
        byBrand[p.brand || 'Unknown'] = (byBrand[p.brand || 'Unknown'] || 0) + 1;
    });
    Object.entries(byBrand)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .forEach(([brand, count]) => {
            console.log(`  ${brand}: ${count}`);
        });

    return matches;
}

findMatches().catch(err => console.error('Error:', err));
