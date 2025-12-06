// Find brands where ALL products are unlinked (no paired products at all)
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

async function main() {
    console.log('Fetching data from Supabase...\n');

    const bcProducts = await fetchAll('ecommerce_products', 'id, product_id, sku, name, brand, inventory_level');
    const links = await fetchAll('product_supplier_links', 'ecommerce_product_id');
    const linkedIds = new Set(links.map(l => l.ecommerce_product_id));

    // Group all products by brand
    const brandStats = {};
    bcProducts.forEach(p => {
        const brand = p.brand || 'Unknown/No Brand';
        if (!brandStats[brand]) {
            brandStats[brand] = { total: 0, linked: 0, unlinked: 0, zeroInv: 0, hasStock: 0, products: [] };
        }
        brandStats[brand].total++;
        if (linkedIds.has(p.id)) {
            brandStats[brand].linked++;
        } else {
            brandStats[brand].unlinked++;
            brandStats[brand].products.push(p);
            if (p.inventory_level === 0) brandStats[brand].zeroInv++;
            else brandStats[brand].hasStock++;
        }
    });

    // Find brands with NO linked products (100% unlinked)
    const fullyUnlinked = Object.entries(brandStats)
        .filter(([_, stats]) => stats.linked === 0 && stats.total > 0)
        .sort((a, b) => b[1].total - a[1].total);

    console.log('BRANDS WITH NO LINKED PRODUCTS (100% unpaired)');
    console.log('='.repeat(80));
    console.log('Brand'.padEnd(40) + '| Total | 0-inv | Stock | Safe to Delete?');
    console.log('-'.repeat(80));

    let totalProducts = 0;
    let safeToDelete = 0;

    fullyUnlinked.forEach(([brand, stats]) => {
        const safe = stats.hasStock === 0 ? 'YES' : `NO (${stats.hasStock} have stock)`;
        totalProducts += stats.total;
        if (stats.hasStock === 0) safeToDelete += stats.total;

        console.log(
            brand.substring(0, 39).padEnd(40) + '| ' +
            stats.total.toString().padStart(5) + ' | ' +
            stats.zeroInv.toString().padStart(5) + ' | ' +
            stats.hasStock.toString().padStart(5) + ' | ' + safe
        );
    });

    console.log('-'.repeat(80));
    console.log(`\nSUMMARY:`);
    console.log(`  Brands with 0 linked products: ${fullyUnlinked.length}`);
    console.log(`  Total products in these brands: ${totalProducts}`);
    console.log(`  Safe to delete (all 0 inventory): ${safeToDelete}`);
    console.log(`  Need review (some have stock): ${totalProducts - safeToDelete}`);

    // Save report
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            brands_fully_unlinked: fullyUnlinked.length,
            total_products: totalProducts,
            safe_to_delete: safeToDelete
        },
        brands: fullyUnlinked.map(([brand, stats]) => ({
            brand,
            total: stats.total,
            zero_inventory: stats.zeroInv,
            has_stock: stats.hasStock,
            safe_to_delete: stats.hasStock === 0
        }))
    };
    require('fs').writeFileSync('./fully-unlinked-brands.json', JSON.stringify(report, null, 2));
    console.log('\nSaved to: fully-unlinked-brands.json');
}

main().catch(err => console.error('Error:', err.message));
