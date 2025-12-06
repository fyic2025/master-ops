const data = require('./deletion-candidates.json');
const products = data.products;

console.log('DELETION CANDIDATES ANALYSIS\n');
console.log('Total: ' + products.length + '\n');

// Sample first 30
console.log('SAMPLE PRODUCTS:\n');
products.slice(0, 30).forEach(p => {
    console.log('[' + (p.sku || 'NO SKU').padEnd(25) + '] ' + (p.name || 'NO NAME').substring(0, 50));
});

// Check SKU patterns
console.log('\n\nSKU PATTERNS:');
const patterns = {};
products.forEach(p => {
    const sku = p.sku || '';
    let pattern = 'other';
    if (/^OB\s*-/i.test(sku)) pattern = 'OB - (Oborne)';
    else if (/^KAD\s*-/i.test(sku)) pattern = 'KAD - (Kadac)';
    else if (/^UN\s*-/i.test(sku)) pattern = 'UN - (UHP)';
    else if (/^KIK\s*-/i.test(sku)) pattern = 'KIK - (Unleashed)';
    else if (/^NEWOB/i.test(sku)) pattern = 'NEWOB';
    else if (/^NEWKAD/i.test(sku)) pattern = 'NEWKAD';
    else if (/^NEWUN/i.test(sku)) pattern = 'NEWUN';
    else if (/^HLB/i.test(sku)) pattern = 'HLB';
    else if (/copy/i.test(sku)) pattern = 'COPY';
    else if (!sku) pattern = '(empty SKU)';
    patterns[pattern] = (patterns[pattern] || 0) + 1;
});

Object.keys(patterns).sort((a,b) => patterns[b] - patterns[a]).forEach(p => {
    console.log('  ' + p + ': ' + patterns[p]);
});

// Show "other" examples
console.log('\n\nOTHER SKU EXAMPLES (first 20):');
const others = products.filter(p => {
    const sku = p.sku || '';
    return !/^(OB|KAD|UN|KIK|NEWOB|NEWKAD|NEWUN|HLB|copy)/i.test(sku) && sku;
});
others.slice(0, 20).forEach(p => {
    console.log('  [' + p.sku + '] ' + (p.name || '').substring(0, 45));
});

// Price analysis
console.log('\n\nPRICE DISTRIBUTION:');
const priceRanges = { '$0': 0, '$0.01-$10': 0, '$10-$50': 0, '$50-$100': 0, '$100+': 0 };
products.forEach(p => {
    const price = p.price || 0;
    if (price === 0) priceRanges['$0']++;
    else if (price <= 10) priceRanges['$0.01-$10']++;
    else if (price <= 50) priceRanges['$10-$50']++;
    else if (price <= 100) priceRanges['$50-$100']++;
    else priceRanges['$100+']++;
});
Object.keys(priceRanges).forEach(r => {
    console.log('  ' + r + ': ' + priceRanges[r]);
});
