const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
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
    console.log('='.repeat(70));
    console.log('UNLEASHED GAP REPORT - Products in Unleashed NOT on BC');
    console.log('='.repeat(70));

    // Get Unleashed products
    const unleashed = await fetchAll('supplier_products', 'id, supplier_sku, product_name, brand, stock_level, availability, metadata', { col: 'supplier_name', val: 'unleashed' });
    console.log(`\nUnleashed products in feed: ${unleashed.length}`);

    // Filter to sellable only
    const sellable = unleashed.filter(p => p.metadata?.is_sellable !== false && p.availability !== 'not_sellable');
    console.log(`Sellable products: ${sellable.length}`);

    // Get all KIK products from BC
    const kikProducts = await fetchAll('ecommerce_products', 'id, sku, name, barcode, inventory_level');
    const kikOnly = kikProducts.filter(p => (p.sku || '').toUpperCase().startsWith('KIK'));
    console.log(`KIK products on BC: ${kikOnly.length}`);

    // Build lookup by normalized SKU (remove KIK- prefix)
    const bcByNormSku = {};
    kikOnly.forEach(p => {
        const rawSku = (p.sku || '').replace(/^KIK[\s\-_]?/i, '');
        const norm = normalizeSku(rawSku);
        if (norm) bcByNormSku[norm] = p;
        // Also add with full SKU
        const fullNorm = normalizeSku(p.sku);
        if (fullNorm) bcByNormSku[fullNorm] = p;
    });

    // Find Unleashed products NOT on BC
    const notOnBC = [];
    const onBC = [];

    for (const up of sellable) {
        // Try matching the Unleashed SKU (which is like "KIK - TEE-COR-250")
        const rawSku = (up.supplier_sku || '').replace(/^KIK[\s\-_]?/i, '');
        const normSku = normalizeSku(rawSku);
        const fullNormSku = normalizeSku(up.supplier_sku);

        if (bcByNormSku[normSku] || bcByNormSku[fullNormSku]) {
            onBC.push(up);
        } else {
            notOnBC.push(up);
        }
    }

    console.log(`\nLinked/On BC: ${onBC.length}`);
    console.log(`NOT on BC: ${notOnBC.length}`);

    // Group NOT on BC by brand/category
    const byBrand = {};
    notOnBC.forEach(p => {
        const brand = p.brand || extractBrandFromSku(p.supplier_sku) || 'Unknown';
        if (!byBrand[brand]) byBrand[brand] = [];
        byBrand[brand].push(p);
    });

    console.log('\n' + '='.repeat(70));
    console.log('PRODUCTS IN UNLEASHED NOT ON BC (by Brand/Type)');
    console.log('='.repeat(70));

    Object.entries(byBrand).sort((a, b) => b[1].length - a[1].length).forEach(([brand, products]) => {
        console.log(`\n--- ${brand}: ${products.length} products ---`);
        products.forEach(p => {
            const stock = p.stock_level || 0;
            const stockStr = stock > 0 ? `${stock} in stock` : 'NO STOCK';
            console.log(`  ${p.supplier_sku} | ${stockStr} | ${(p.product_name || '').substring(0, 45)}`);
        });
    });

    // Summary by stock status
    const withStock = notOnBC.filter(p => (p.stock_level || 0) > 0);
    const noStock = notOnBC.filter(p => (p.stock_level || 0) === 0);

    console.log('\n' + '='.repeat(70));
    console.log('SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total Unleashed products: ${unleashed.length}`);
    console.log(`Sellable products: ${sellable.length}`);
    console.log(`On BC (linked): ${onBC.length}`);
    console.log(`NOT on BC: ${notOnBC.length}`);
    console.log(`  - With stock (need adding): ${withStock.length}`);
    console.log(`  - No stock: ${noStock.length}`);

    // Write CSV for products needing to be added
    if (withStock.length > 0) {
        const csvLines = ['SKU,Name,Brand,Stock,Category'];
        withStock.forEach(p => {
            const name = (p.product_name || '').replace(/,/g, ' ');
            csvLines.push(`${p.supplier_sku},"${name}",${p.brand || ''},${p.stock_level || 0},${p.metadata?.product_group || ''}`);
        });
        fs.writeFileSync('unleashed-not-on-bc.csv', csvLines.join('\n'));
        console.log(`\n✓ Saved CSV: unleashed-not-on-bc.csv (${withStock.length} products with stock)`);
    }
}

function extractBrandFromSku(sku) {
    if (!sku) return null;
    // Known brand prefixes
    if (sku.includes('TEE-') || sku.includes('TEE ')) return 'Teelixir';
    if (sku.includes('ORG')) return 'Ausganica';
    if (sku.includes('EX')) return 'Ausganica Essential Oils';
    if (sku.includes('EC')) return 'Ausganica';
    if (sku.includes('HOF')) return 'House of Ferments';
    if (sku.includes('HBR')) return 'House of Brews';
    if (sku.includes('ELL-')) return 'Ellovi';
    if (sku.includes('BS-')) return 'Bare Soul';
    if (sku.includes('RO-') || sku.includes('OB-')) return 'Oils by Nature';
    if (sku.includes('PL') || sku.includes('PH') || sku.includes('WO') || sku.includes('NK')) return 'Plantoys';
    return null;
}

run().catch(console.error);
