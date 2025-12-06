const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const supabase = createClient(
    'https://usibnysqelovfuctmkqw.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'
);

function normalizeSku(sku) {
    if (!sku) return null;
    return sku.toString().toUpperCase().replace(/[\s\-_]/g, '');
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
    console.log('='.repeat(60));
    console.log('LINKING KIK PRODUCTS TO UNLEASHED');
    console.log('='.repeat(60));

    // Get Unleashed products
    const unleashedProducts = await fetchAll('supplier_products', 'id, supplier_sku, product_name, barcode, stock_level', { col: 'supplier_name', val: 'unleashed' });
    console.log(`\nUnleashed products in feed: ${unleashedProducts.length}`);

    // Build lookup by normalized SKU
    const unleashedBySku = {};
    unleashedProducts.forEach(p => {
        const norm = normalizeSku(p.supplier_sku);
        if (norm) unleashedBySku[norm] = p;
    });

    // Get KIK products from BC
    const kikProducts = await fetchAll('ecommerce_products', 'id, product_id, sku, name, barcode, inventory_level');
    const kikOnly = kikProducts.filter(p => (p.sku || '').toUpperCase().startsWith('KIK'));
    console.log(`KIK products in BC: ${kikOnly.length}`);

    // Get existing links
    const existingLinks = await fetchAll('product_supplier_links', 'ecommerce_product_id, supplier_product_id');
    const linkedEcomIds = new Set(existingLinks.map(l => l.ecommerce_product_id));

    // Find unlinked KIK products
    const unlinked = kikOnly.filter(p => !linkedEcomIds.has(p.id));
    console.log(`Unlinked KIK products: ${unlinked.length}`);

    // Try to match and link
    let linked = 0;
    let notFound = [];

    for (const product of unlinked) {
        // Try normalized SKU match (remove KIK- prefix)
        const rawSku = (product.sku || '').replace(/^KIK[-_]?/i, '');
        const normSku = normalizeSku(rawSku);

        let match = unleashedBySku[normSku];

        // Also try with KIK prefix intact
        if (!match) {
            match = unleashedBySku[normalizeSku(product.sku)];
        }

        // Try barcode match
        if (!match && product.barcode) {
            const normBarcode = product.barcode.toString().replace(/[\s\-]/g, '').replace(/^0+/, '');
            match = unleashedProducts.find(u => {
                const uBarcode = (u.barcode || '').toString().replace(/[\s\-]/g, '').replace(/^0+/, '');
                return uBarcode && uBarcode === normBarcode;
            });
        }

        if (match) {
            // Create link
            const { error } = await supabase.from('product_supplier_links').insert({
                ecommerce_product_id: product.id,
                supplier_product_id: match.id,
                supplier_name: 'unleashed',
                match_type: 'sku_normalized',
                is_active: true
            });

            if (error) {
                console.log(`  Error linking ${product.sku}: ${error.message}`);
            } else {
                console.log(`✓ Linked: ${product.sku} -> ${match.supplier_sku}`);
                linked++;
            }
        } else {
            notFound.push({
                sku: product.sku,
                name: product.name,
                inventory: product.inventory_level
            });
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Successfully linked: ${linked}`);
    console.log(`Could not match: ${notFound.length}`);

    if (notFound.length > 0) {
        console.log('\n--- UNMATCHED PRODUCTS ---');
        // Group by stock level
        const withStock = notFound.filter(p => p.inventory > 0 && p.inventory !== 1000);
        const zeroStock = notFound.filter(p => p.inventory === 0);
        const placeholder = notFound.filter(p => p.inventory === 1000);

        if (withStock.length > 0) {
            console.log(`\nWITH ACTUAL STOCK (${withStock.length}):`);
            withStock.forEach(p => console.log(`  ${p.sku} | ${p.inventory} | ${(p.name || '').substring(0, 40)}`));
        }

        if (zeroStock.length > 0) {
            console.log(`\nZERO STOCK - DISCONTINUED (${zeroStock.length}):`);
            zeroStock.forEach(p => console.log(`  ${p.sku} | ${(p.name || '').substring(0, 50)}`));
        }

        if (placeholder.length > 0) {
            console.log(`\nSTOCK=1000 PLACEHOLDER (${placeholder.length}):`);
            placeholder.forEach(p => console.log(`  ${p.sku} | ${(p.name || '').substring(0, 50)}`));
        }
    }
}

run().catch(console.error);
