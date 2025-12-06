#!/usr/bin/env node

/**
 * ANALYZE REMAINING UNMATCHED UHP PRODUCTS
 * Check inventory levels and create detailed CSV
 */

require('dotenv').config({ path: '../MASTER-CREDENTIALS-COMPLETE.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.BOO_SUPABASE_URL,
  process.env.BOO_SUPABASE_SERVICE_ROLE_KEY
);

const SUPPLIER_NAME = 'uhp';

// Extract brand from product name
function extractBrandFromName(name) {
  if (!name) return 'UNKNOWN';

  const cleanName = name
    .replace(/^\s*UN\s*-\s*[A-Z0-9]+\s*-\s*/i, '')
    .trim();

  const words = cleanName.split(/\s+/);

  const twoWordBrands = [
    'Power Super Foods', 'Protein Supplies', 'Jack N', 'Dr Organic',
    'The Ginger People', 'Tom Organic', 'Lemon Myrtle', 'Pure Food',
    'Naturally Sweet', 'Love Children', 'Schmidt\'s', 'Planet Organic',
    'Organic Times', 'Nirvana Organics', 'Nutritionist Choice', 'Happy Way',
    'Well & Good', 'MACRO MIKE', 'Nutra Organics'
  ];

  const firstTwo = words.slice(0, 2).join(' ');
  for (const brand of twoWordBrands) {
    if (firstTwo.toLowerCase().includes(brand.toLowerCase())) {
      return brand;
    }
  }

  return words[0] || 'UNKNOWN';
}

async function analyzeRemainingProducts() {
  console.log('\n========================================');
  console.log('ANALYZE REMAINING UNMATCHED UHP PRODUCTS');
  console.log('========================================\n');

  // Get already matched BC product IDs
  console.log('Loading existing matches...');
  let existingMatches = [];
  let offset = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('product_supplier_links')
      .select('ecommerce_product_id')
      .eq('supplier_name', SUPPLIER_NAME)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    existingMatches = existingMatches.concat(data);
    offset += PAGE_SIZE;
    if (data.length < PAGE_SIZE) break;
  }

  const matchedBcIds = new Set(existingMatches.map(m => m.ecommerce_product_id));
  console.log(`✓ Found ${existingMatches.length} matched products\n`);

  // Get all BC products with UN prefix
  console.log('Loading all BC products with UN prefix...');
  let bcProducts = [];
  let bcOffset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('ecommerce_products')
      .select('*')
      .or('sku.ilike.UN %,sku.ilike.UN-%')
      .range(bcOffset, bcOffset + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    bcProducts = bcProducts.concat(data);
    bcOffset += PAGE_SIZE;
    if (data.length < PAGE_SIZE) break;
  }

  const unmatchedBcProducts = bcProducts.filter(p => !matchedBcIds.has(p.id));
  console.log(`✓ Found ${unmatchedBcProducts.length} unmatched BC products\n`);

  // Load advanced matches to exclude them
  console.log('Loading advanced match results...');
  let advancedMatches = [];
  try {
    const advancedReport = JSON.parse(fs.readFileSync('reports/uhp-advanced-matches.json', 'utf8'));
    advancedMatches = [
      ...advancedReport.high_confidence_matches,
      ...advancedReport.medium_confidence_matches,
      ...advancedReport.low_confidence_matches
    ];
    console.log(`✓ Found ${advancedMatches.length} advanced matches to exclude\n`);
  } catch (err) {
    console.log('⚠️  No advanced matches file found\n');
  }

  const advancedMatchedBcIds = new Set(advancedMatches.map(m => m.bc_id));

  // Load fuzzy match report to identify deleted brands
  console.log('Loading fuzzy match report...');
  const fuzzyReport = JSON.parse(fs.readFileSync('reports/uhp-fuzzy-brand-match.json', 'utf8'));
  const deletedBrands = fuzzyReport.no_match_brands
    .filter(b => parseFloat(b.similarity) < 60)
    .map(b => b.bc_brand);

  console.log(`✓ Found ${deletedBrands.length} deleted brands\n`);

  // Filter to remaining products (excluding advanced matches and deleted brands)
  const remainingProducts = unmatchedBcProducts.filter(p => {
    const brand = extractBrandFromName(p.name);
    return !advancedMatchedBcIds.has(p.id) && !deletedBrands.includes(brand);
  });

  console.log(`✓ Found ${remainingProducts.length} truly remaining unmatched products\n`);

  // Analyze inventory
  const withInventory = remainingProducts.filter(p => (p.stock_level || 0) > 0);
  const withoutInventory = remainingProducts.filter(p => (p.stock_level || 0) === 0);

  console.log('========================================');
  console.log('INVENTORY ANALYSIS');
  console.log('========================================\n');
  console.log(`Products with inventory: ${withInventory.length}`);
  console.log(`Products without inventory: ${withoutInventory.length}`);
  console.log(`Total stock value: ${withInventory.reduce((sum, p) => sum + (p.stock_level || 0), 0)} units\n`);

  // Group by brand
  const brandGroups = new Map();
  remainingProducts.forEach(product => {
    const brand = extractBrandFromName(product.name);
    if (!brandGroups.has(brand)) {
      brandGroups.set(brand, {
        brand,
        total: 0,
        withStock: 0,
        totalStock: 0
      });
    }
    const group = brandGroups.get(brand);
    group.total++;
    if ((product.stock_level || 0) > 0) {
      group.withStock++;
      group.totalStock += product.stock_level;
    }
  });

  const sortedBrands = Array.from(brandGroups.values()).sort((a, b) => b.total - a.total);

  console.log('Top 20 brands by product count:\n');
  console.log('Brand'.padEnd(30) + 'Total'.padEnd(10) + 'W/ Stock'.padEnd(10) + 'Stock Units');
  console.log('─'.repeat(70));
  sortedBrands.slice(0, 20).forEach(b => {
    console.log(
      b.brand.substring(0, 29).padEnd(30) +
      b.total.toString().padEnd(10) +
      b.withStock.toString().padEnd(10) +
      b.totalStock.toString()
    );
  });

  // Create detailed CSV
  console.log('\n\nCreating detailed CSV...\n');

  const csvRows = [
    ['BC SKU', 'Product Name', 'Brand', 'Stock Level', 'Price', 'BC Product ID', 'Has Inventory?', 'Notes']
  ];

  remainingProducts.forEach(p => {
    const brand = extractBrandFromName(p.name);
    const hasInventory = (p.stock_level || 0) > 0 ? 'YES' : 'NO';
    const notes = (p.stock_level || 0) > 0 ? 'NEEDS ATTENTION - Has inventory' : '';

    csvRows.push([
      p.sku || '',
      p.name || '',
      brand,
      (p.stock_level || 0).toString(),
      (p.price || 0).toString(),
      (p.product_id || '').toString(),
      hasInventory,
      notes
    ]);
  });

  const csvContent = csvRows.map(row =>
    row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  const csvPath = 'reports/uhp-remaining-unmatched-products.csv';
  fs.writeFileSync(csvPath, csvContent);

  console.log(`📄 CSV created: ${csvPath}`);
  console.log(`   Total products: ${remainingProducts.length}`);
  console.log(`   With inventory: ${withInventory.length}`);
  console.log(`   Without inventory: ${withoutInventory.length}\n`);

  // Create summary report
  const summaryPath = 'reports/uhp-remaining-products-summary.txt';
  const summary = `
========================================
UHP REMAINING UNMATCHED PRODUCTS SUMMARY
========================================

Date: ${new Date().toISOString()}

OVERVIEW:
- Total unmatched products: ${unmatchedBcProducts.length}
- Advanced matches found: ${advancedMatches.length}
- Products from deleted brands: ${unmatchedBcProducts.length - remainingProducts.length - advancedMatches.length}
- Truly remaining unmatched: ${remainingProducts.length}

INVENTORY STATUS:
- Products WITH inventory: ${withInventory.length}
- Products WITHOUT inventory: ${withoutInventory.length}
- Total stock units: ${withInventory.reduce((sum, p) => sum + (p.stock_level || 0), 0)}

TOP BRANDS (by product count):
${sortedBrands.slice(0, 10).map((b, i) =>
  `${i + 1}. ${b.brand} - ${b.total} products (${b.withStock} with stock, ${b.totalStock} units)`
).join('\n')}

RECOMMENDATIONS:
1. Review products WITH inventory first (${withInventory.length} products)
2. Consider deleting products WITHOUT inventory if brand discontinued
3. Manual investigation needed for products with inventory

FILES:
- Detailed CSV: ${csvPath}
- Summary: ${summaryPath}
`;

  fs.writeFileSync(summaryPath, summary);
  console.log(`📄 Summary saved: ${summaryPath}\n`);

  console.log('========================================\n');
}

analyzeRemainingProducts().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
