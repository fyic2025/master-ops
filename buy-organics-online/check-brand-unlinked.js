const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://usibnysqelovfuctmkqw.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'
);

const BRAND = process.argv[2] || 'Tea Tonic';

async function fetchAll(table, filter, select) {
    const allData = [];
    let offset = 0;
    const limit = 1000;

    while (true) {
        let query = supabase.from(table).select(select).range(offset, offset + limit - 1);
        if (filter && filter.column && filter.value) {
            if (filter.op === 'ilike') {
                query = query.ilike(filter.column, filter.value);
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

async function checkBrand() {
    console.log(`CHECKING UNLINKED BC PRODUCTS: ${BRAND}`);
    console.log('='.repeat(60));

    // Get BC products for this brand
    const bcProducts = await fetchAll('ecommerce_products',
        { column: 'brand', value: `%${BRAND}%`, op: 'ilike' },
        'id, product_id, sku, name, barcode, gtin, upc, inventory_level, is_visible'
    );
    console.log(`BC products for ${BRAND}: ${bcProducts.length}`);

    // Get linked BC product IDs
    const links = await fetchAll('product_supplier_links', null, 'ecommerce_product_id');
    const linkedIds = new Set(links.map(l => l.ecommerce_product_id));

    // Find unlinked
    const unlinked = bcProducts.filter(p => !linkedIds.has(p.id));
    console.log(`Unlinked (no supplier): ${unlinked.length}`);

    // Get all supplier products to try matching
    const suppliers = await fetchAll('supplier_products', null, 'id, supplier_sku, product_name, barcode, supplier_name');

    // Build barcode lookup
    const supplierByBarcode = new Map();
    suppliers.forEach(s => {
        if (s.barcode) supplierByBarcode.set(s.barcode, s);
    });

    // Check for potential matches
    const canMatch = [];
    const noMatch = [];

    for (const bc of unlinked) {
        const barcodes = [bc.barcode, bc.gtin, bc.upc].filter(Boolean);
        let matched = null;
        for (const code of barcodes) {
            if (supplierByBarcode.has(code)) {
                matched = supplierByBarcode.get(code);
                break;
            }
        }
        if (matched) {
            canMatch.push({ bc, supplier: matched });
        } else {
            noMatch.push(bc);
        }
    }

    console.log(`\nCan auto-link by barcode: ${canMatch.length}`);
    console.log(`No supplier match: ${noMatch.length}`);

    // Show inventory summary
    const inv0 = noMatch.filter(p => p.inventory_level === 0).length;
    const inv1000 = noMatch.filter(p => p.inventory_level === 1000).length;
    const invOther = noMatch.filter(p => p.inventory_level !== 0 && p.inventory_level !== 1000).length;

    console.log(`\nInventory of unmatched:`);
    console.log(`  Level 0: ${inv0}`);
    console.log(`  Level 1000: ${inv1000}`);
    console.log(`  Other: ${invOther}`);

    if (canMatch.length > 0) {
        console.log('\n' + '='.repeat(60));
        console.log('CAN AUTO-LINK:');
        canMatch.forEach((m, i) => {
            console.log(`${i+1}. BC: [${m.bc.sku}] ${m.bc.name.substring(0, 45)}...`);
            console.log(`   Supplier: [${m.supplier.supplier_sku}] ${m.supplier.supplier_name}`);
        });
    }

    console.log('\n' + '='.repeat(60));
    console.log('NO SUPPLIER MATCH (sample):');
    noMatch.slice(0, 20).forEach((p, i) => {
        console.log(`${i+1}. [${p.sku}] ${p.name.substring(0, 50)}...`);
        console.log(`   Barcode: ${p.barcode || 'N/A'} | Inv: ${p.inventory_level} | Visible: ${p.is_visible}`);
    });

    if (noMatch.length > 20) {
        console.log(`... and ${noMatch.length - 20} more`);
    }
}

checkBrand().catch(err => console.error('Error:', err));
