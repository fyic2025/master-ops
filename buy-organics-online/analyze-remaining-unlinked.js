// Analyze remaining unlinked products from deletion-candidates.json
const fs = require('fs');

const data = JSON.parse(fs.readFileSync('./deletion-candidates.json', 'utf8'));

console.log('REMAINING UNLINKED PRODUCTS ANALYSIS');
console.log('=====================================\n');
console.log(`Total candidates: ${data.summary.total}`);
console.log(`  - Zero stock: ${data.summary.unlinked_zero_stock}`);
console.log(`  - Hidden: ${data.summary.unlinked_hidden}`);
console.log(`  - Copy products: ${data.summary.copy_products}\n`);

// Group by brand
const byBrand = {};
const bySkuPrefix = {};

data.products.forEach(p => {
    const brand = p.brand || 'Unknown/Null';
    if (!byBrand[brand]) byBrand[brand] = { total: 0, zero: 0, other: 0, products: [] };
    byBrand[brand].total++;
    byBrand[brand].products.push(p);
    if (p.inventory === 0) {
        byBrand[brand].zero++;
    } else {
        byBrand[brand].other++;
    }

    // Also group by SKU prefix (e.g., "UN -", "KAD -", etc.)
    const skuMatch = p.sku?.match(/^([A-Z]+)\s*-/);
    const prefix = skuMatch ? skuMatch[1] : 'Other';
    if (!bySkuPrefix[prefix]) bySkuPrefix[prefix] = 0;
    bySkuPrefix[prefix]++;
});

// Sort by total count
const sorted = Object.entries(byBrand).sort((a, b) => b[1].total - a[1].total);

console.log('BY BRAND (sorted by count):');
console.log('-'.repeat(70));
console.log('Brand'.padEnd(30) + '| Total | 0-inv | Other | Safe to Delete?');
console.log('-'.repeat(70));

let totalSafe = 0;
let totalUnsafe = 0;

sorted.forEach(([brand, stats]) => {
    const safe = stats.other === 0 ? 'YES' : 'NO - has stock';
    if (stats.other === 0) totalSafe += stats.total;
    else totalUnsafe += stats.total;

    console.log(
        brand.substring(0, 29).padEnd(30) + '| ' +
        stats.total.toString().padStart(5) + ' | ' +
        stats.zero.toString().padStart(5) + ' | ' +
        stats.other.toString().padStart(5) + ' | ' + safe
    );
});

console.log('-'.repeat(70));
console.log(`\nSUMMARY:`);
console.log(`  Safe to delete (0 inventory): ${totalSafe}`);
console.log(`  NOT safe (has stock): ${totalUnsafe}`);

console.log('\n\nBY SKU PREFIX:');
console.log('-'.repeat(40));
Object.entries(bySkuPrefix).sort((a, b) => b[1] - a[1]).forEach(([prefix, count]) => {
    console.log(`  ${prefix.padEnd(10)}: ${count}`);
});

// Show sample products with stock (not safe to delete)
const withStock = data.products.filter(p => p.inventory > 0);
if (withStock.length > 0) {
    console.log('\n\nPRODUCTS WITH STOCK (review before delete):');
    console.log('-'.repeat(70));
    withStock.slice(0, 20).forEach(p => {
        console.log(`  [${p.sku}] inv=${p.inventory} - ${p.name?.substring(0, 45)}...`);
    });
    if (withStock.length > 20) {
        console.log(`  ... and ${withStock.length - 20} more with stock`);
    }
}
