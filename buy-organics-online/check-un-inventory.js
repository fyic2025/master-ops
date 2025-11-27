const data = require('./deletion-candidates.json');
const unProducts = data.products.filter(p => p.sku && /^UN\s*-/i.test(p.sku));

let hasStock = unProducts.filter(p => p.inventory > 0);
let zeroStock = unProducts.filter(p => !p.inventory || p.inventory === 0);

console.log('UN - Products Inventory Check:');
console.log('  Total UN - products: ' + unProducts.length);
console.log('  Zero stock: ' + zeroStock.length);
console.log('  HAS stock: ' + hasStock.length);

if (hasStock.length > 0) {
    console.log('\nProducts WITH inventory:');
    hasStock.forEach(p => {
        console.log('  [' + p.sku + '] Stock: ' + p.inventory + ' | $' + p.price + ' | ' + (p.name || '').substring(0,40));
    });
}
