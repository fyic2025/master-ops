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
    console.log('='.repeat(60));
    console.log('OBORNE LINKING & STOCK CHECK');
    console.log('='.repeat(60));

    // Get all data
    const oborneProducts = await fetchAll('supplier_products', 'id, supplier_sku, product_name, barcode', { col: 'supplier_name', val: 'oborne' });
    const allBC = await fetchAll('ecommerce_products', 'id, sku, name, barcode, brand, inventory_level');
    const allLinks = await fetchAll('product_supplier_links', 'ecommerce_product_id');
    const linkedSet = new Set(allLinks.map(l => l.ecommerce_product_id));

    const obUnlinked = allBC.filter(p => (p.sku || '').startsWith('OB') && !linkedSet.has(p.id));

    // Build normalized barcode lookup for Oborne
    const oborneByNormalizedBarcode = {};
    oborneProducts.forEach(p => {
        const norm = normalizeBarcode(p.barcode);
        if (norm) oborneByNormalizedBarcode[norm] = p;
    });

    // ================================================================
    // TASK 1: Link 7 products with normalized barcode matches
    // ================================================================
    console.log('\n' + '-'.repeat(60));
    console.log('TASK 1: AUTO-LINKING WITH NORMALIZED BARCODES');
    console.log('-'.repeat(60));

    const toLink = [];
    obUnlinked.forEach(bcProduct => {
        const norm = normalizeBarcode(bcProduct.barcode);
        if (norm && oborneByNormalizedBarcode[norm]) {
            toLink.push({
                bcProduct,
                obProduct: oborneByNormalizedBarcode[norm]
            });
        }
    });

    console.log(`Found ${toLink.length} products to link:\n`);

    for (const { bcProduct, obProduct } of toLink) {
        console.log(`  BC: [${bcProduct.sku}] ${bcProduct.name.substring(0, 40)}`);
        console.log(`  OB: [${obProduct.supplier_sku}] ${obProduct.product_name.substring(0, 40)}`);

        // Create the link
        const { error } = await supabase.from('product_supplier_links').insert({
            ecommerce_product_id: bcProduct.id,
            supplier_product_id: obProduct.id,
            supplier_name: 'oborne',
            match_type: 'barcode_normalized',
            is_active: true,
            created_at: new Date().toISOString()
        });

        if (error) {
            console.log(`  ERROR: ${error.message}`);
        } else {
            console.log(`  ✓ LINKED`);
        }
        console.log('');
    }

    // ================================================================
    // TASK 2: Check stock levels on remaining 409 products
    // ================================================================
    console.log('\n' + '-'.repeat(60));
    console.log('TASK 2: CHECKING STOCK ON 409 LIKELY DISCONTINUED PRODUCTS');
    console.log('-'.repeat(60));

    // Get products NOT in Oborne feed (excluding the ones we just linked)
    const linkedNow = new Set(toLink.map(t => t.bcProduct.id));
    const notInOborne = obUnlinked.filter(p => {
        if (linkedNow.has(p.id)) return false;
        const norm = normalizeBarcode(p.barcode);
        return !norm || !oborneByNormalizedBarcode[norm];
    });

    let zeroStock = 0;
    let hasStock = 0;
    const zeroStockByBrand = {};
    const hasStockByBrand = {};

    notInOborne.forEach(p => {
        const stock = p.inventory_level || 0;
        const brand = p.brand || 'Unknown';

        if (stock <= 0) {
            zeroStock++;
            zeroStockByBrand[brand] = (zeroStockByBrand[brand] || 0) + 1;
        } else {
            hasStock++;
            if (!hasStockByBrand[brand]) hasStockByBrand[brand] = [];
            hasStockByBrand[brand].push({ sku: p.sku, name: p.name, stock });
        }
    });

    console.log(`\nTotal not in Oborne feed: ${notInOborne.length}`);
    console.log(`  With ZERO stock: ${zeroStock}`);
    console.log(`  With stock > 0: ${hasStock}`);

    console.log('\n' + '-'.repeat(60));
    console.log('BRANDS WITH ZERO STOCK (candidates for removal):');
    console.log('-'.repeat(60));

    Object.entries(zeroStockByBrand)
        .sort((a, b) => b[1] - a[1])
        .forEach(([brand, count]) => {
            console.log(`  ${brand}: ${count} products`);
        });

    if (hasStock > 0) {
        console.log('\n' + '-'.repeat(60));
        console.log('PRODUCTS WITH STOCK > 0 (need attention - not in Oborne):');
        console.log('-'.repeat(60));

        Object.entries(hasStockByBrand)
            .sort((a, b) => b[1].length - a[1].length)
            .forEach(([brand, products]) => {
                console.log(`\n${brand} (${products.length} products):`);
                products.slice(0, 3).forEach(p => {
                    console.log(`  [${p.sku}] Stock: ${p.stock} - ${p.name.substring(0, 40)}`);
                });
                if (products.length > 3) {
                    console.log(`  ... and ${products.length - 3} more`);
                }
            });
    }

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Links created: ${toLink.length}`);
    console.log(`Zero stock (can likely delete): ${zeroStock}`);
    console.log(`Has stock (need review): ${hasStock}`);
}

run().catch(console.error);
