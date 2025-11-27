// Query Supabase for current unlinked BC products grouped by brand
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
        const { data, error } = await supabase
            .from(table)
            .select(select)
            .range(offset, offset + limit - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;
        allData.push(...data);
        if (data.length < limit) break;
        offset += limit;
    }
    return allData;
}

async function main() {
    console.log('Fetching current data from Supabase...\n');

    // Get all BC products
    const bcProducts = await fetchAll('ecommerce_products',
        'id, product_id, sku, name, brand, inventory_level, is_visible'
    );
    console.log(`Total BC products: ${bcProducts.length}`);

    // Get all linked product IDs
    const links = await fetchAll('product_supplier_links', 'ecommerce_product_id');
    const linkedIds = new Set(links.map(l => l.ecommerce_product_id));
    console.log(`Linked products: ${linkedIds.size}`);

    // Find unlinked products
    const unlinked = bcProducts.filter(p => !linkedIds.has(p.id));
    console.log(`Unlinked products: ${unlinked.length}`);
    console.log(`Link rate: ${((linkedIds.size / bcProducts.length) * 100).toFixed(1)}%\n`);

    // Group by brand
    const byBrand = {};
    unlinked.forEach(p => {
        const brand = p.brand || 'Unknown/No Brand';
        if (!byBrand[brand]) {
            byBrand[brand] = { total: 0, zeroInv: 0, hasStock: 0, products: [] };
        }
        byBrand[brand].total++;
        byBrand[brand].products.push(p);
        if (p.inventory_level === 0) {
            byBrand[brand].zeroInv++;
        } else {
            byBrand[brand].hasStock++;
        }
    });

    // Sort by count descending
    const sorted = Object.entries(byBrand)
        .sort((a, b) => b[1].total - a[1].total);

    // Display results
    console.log('UNLINKED BC PRODUCTS BY BRAND');
    console.log('='.repeat(75));
    console.log('Brand'.padEnd(35) + '| Total | 0-inv | Stock | Safe?');
    console.log('-'.repeat(75));

    let totalSafe = 0;
    let totalUnsafe = 0;

    sorted.forEach(([brand, stats]) => {
        const safe = stats.hasStock === 0 ? 'YES' : `NO (${stats.hasStock})`;
        if (stats.hasStock === 0) totalSafe += stats.total;
        else totalUnsafe += stats.total;

        console.log(
            brand.substring(0, 34).padEnd(35) + '| ' +
            stats.total.toString().padStart(5) + ' | ' +
            stats.zeroInv.toString().padStart(5) + ' | ' +
            stats.hasStock.toString().padStart(5) + ' | ' + safe
        );
    });

    console.log('-'.repeat(75));
    console.log(`\nSUMMARY:`);
    console.log(`  Total unlinked: ${unlinked.length}`);
    console.log(`  Safe to delete (all 0 inventory): ${totalSafe}`);
    console.log(`  Needs review (has stock): ${totalUnsafe}`);

    // Save to JSON for reference
    const report = {
        timestamp: new Date().toISOString(),
        totals: {
            bc_products: bcProducts.length,
            linked: linkedIds.size,
            unlinked: unlinked.length,
            link_rate: ((linkedIds.size / bcProducts.length) * 100).toFixed(1) + '%'
        },
        by_brand: sorted.map(([brand, stats]) => ({
            brand,
            total: stats.total,
            zero_inventory: stats.zeroInv,
            has_stock: stats.hasStock,
            safe_to_delete: stats.hasStock === 0
        }))
    };

    require('fs').writeFileSync(
        './unlinked-by-brand-report.json',
        JSON.stringify(report, null, 2)
    );
    console.log('\nSaved detailed report to: unlinked-by-brand-report.json');
}

main().catch(err => console.error('Error:', err.message));
