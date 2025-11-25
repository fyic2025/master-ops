#!/usr/bin/env node

/**
 * ANALYZE UNMATCHED BC UHP PRODUCTS BY BRAND NAME
 * Extracts brand from product names to identify deletion candidates
 */

require('dotenv').config({ path: '../MASTER-CREDENTIALS-COMPLETE.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.BOO_SUPABASE_URL,
  process.env.BOO_SUPABASE_SERVICE_ROLE_KEY
);

const SUPPLIER_NAME = 'uhp';

// Extract brand from product name (usually first 1-3 words)
function extractBrandFromName(name) {
  if (!name) return 'UNKNOWN';

  // Common patterns
  const patterns = [
    /^([\w\s&'.]+?)\s+(?:Tea|Coffee|Oil|Powder|Cream|Balm|Lotion|Shampoo|Conditioner|Soap|Gel|Spray|Wash|Drops|Capsules|Tablets|Serum|Mask|Scrub|Toner|Butter|Wax|Paste|Sauce|Syrup|Juice|Water|Milk|Flour|Sugar|Salt|Spice|Herb|Extract|Tincture|Blend|Mix|Bar|Stick|Pad|Wrap|Bag|Box|Pack|Kit|Set)/i,
    /^([\w\s&'.]+?)\s+\d+/,  // Brand followed by number
    /^([A-Z][\w\s&'.]{2,30}?)\s+[A-Z][a-z]/,  // Capitalized brand followed by capitalized word
  ];

  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // Fallback: take first 1-3 words
  const words = name.split(/\s+/);
  if (words.length >= 3) {
    return words.slice(0, 3).join(' ');
  } else if (words.length >= 2) {
    return words.slice(0, 2).join(' ');
  }
  return words[0] || 'UNKNOWN';
}

async function analyzeUnmatchedBCByBrand() {
  console.log('\n========================================');
  console.log('UNMATCHED BC UHP PRODUCTS - BRAND ANALYSIS');
  console.log('========================================\n');

  // Get already matched BC product IDs
  console.log('Loading existing UHP matches...');
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
  console.log(`✓ Found ${existingMatches.length} existing matches\n`);

  // Get all BC products with UN prefix
  console.log('Loading BC products with UN prefix...');
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

  // Filter to unmatched products
  const unmatchedProducts = bcProducts.filter(p => !matchedBcIds.has(p.id));
  console.log(`✓ Found ${unmatchedProducts.length} unmatched BC products with UN prefix\n`);

  // Group by extracted brand
  console.log('Extracting brands from product names...\n');
  const brandGroups = new Map();

  unmatchedProducts.forEach(product => {
    const brandName = extractBrandFromName(product.name);

    if (!brandGroups.has(brandName)) {
      brandGroups.set(brandName, {
        brandName,
        products: [],
        totalProducts: 0,
        zeroStock: 0,
        lowStock: 0,
        inStock: 0,
        totalStockLevel: 0
      });
    }

    const group = brandGroups.get(brandName);
    group.products.push(product);
    group.totalProducts++;
    group.totalStockLevel += product.stock_level || 0;

    if (!product.stock_level || product.stock_level === 0) {
      group.zeroStock++;
    } else if (product.stock_level <= 5) {
      group.lowStock++;
    } else {
      group.inStock++;
    }
  });

  // Sort by total products (descending)
  const sortedBrands = Array.from(brandGroups.values())
    .sort((a, b) => b.totalProducts - a.totalProducts);

  // Display results
  console.log('========================================');
  console.log('UNMATCHED BC PRODUCTS BY BRAND (extracted from names)');
  console.log('========================================\n');

  console.log(`Total unmatched BC products: ${unmatchedProducts.length}`);
  console.log(`Total brands: ${sortedBrands.length}\n`);

  console.log('BRAND BREAKDOWN (sorted by product count):');
  console.log('─'.repeat(120));
  console.log(
    'Brand'.padEnd(40) +
    'Total'.padEnd(10) +
    'Zero Stock'.padEnd(15) +
    'Low Stock'.padEnd(15) +
    'In Stock'.padEnd(15) +
    'Total Stock'
  );
  console.log('─'.repeat(120));

  sortedBrands.forEach((brand, idx) => {
    console.log(
      `${(idx + 1).toString().padStart(3)}. ${brand.brandName.substring(0, 35).padEnd(36)}${brand.totalProducts.toString().padEnd(10)}${brand.zeroStock.toString().padEnd(15)}${brand.lowStock.toString().padEnd(15)}${brand.inStock.toString().padEnd(15)}${brand.totalStockLevel.toString()}`
    );
  });

  console.log('─'.repeat(120));
  console.log();

  // Identify deletion candidates (all zero stock)
  const deletionCandidates = sortedBrands.filter(b => b.zeroStock === b.totalProducts);

  if (deletionCandidates.length > 0) {
    console.log('\n========================================');
    console.log('DELETION CANDIDATES (100% Zero Stock)');
    console.log('========================================\n');

    deletionCandidates.forEach((brand, idx) => {
      console.log(`${idx + 1}. ${brand.brandName}: ${brand.totalProducts} products (ALL ZERO STOCK)`);
    });

    console.log(`\nTotal products that could be deleted: ${deletionCandidates.reduce((sum, b) => sum + b.totalProducts, 0)}\n`);
  }

  // Create detailed CSV export
  const csvRows = [
    ['Extracted Brand', 'SKU', 'Product Name', 'Stock Level', 'Is Visible', 'BC ID', 'Barcode']
  ];

  sortedBrands.forEach(brand => {
    brand.products.forEach(product => {
      csvRows.push([
        brand.brandName,
        product.sku || '',
        product.name || '',
        product.stock_level || 0,
        product.is_visible ? 'Yes' : 'No',
        product.product_id || '',
        product.barcode || ''
      ]);
    });
  });

  const csvContent = csvRows.map(row =>
    row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  const csvPath = 'reports/unmatched-bc-uhp-by-brand.csv';
  fs.mkdirSync('reports', { recursive: true });
  fs.writeFileSync(csvPath, csvContent);
  console.log(`\n📄 Detailed report saved to: ${csvPath}`);

  // Create summary JSON
  const summaryPath = 'reports/unmatched-bc-uhp-brand-summary.json';
  const summary = {
    timestamp: new Date().toISOString(),
    total_unmatched: unmatchedProducts.length,
    total_brands: sortedBrands.length,
    brands: sortedBrands.map(b => ({
      brand_name: b.brandName,
      total_products: b.totalProducts,
      zero_stock: b.zeroStock,
      low_stock: b.lowStock,
      in_stock: b.inStock,
      total_stock_level: b.totalStockLevel,
      can_delete: b.zeroStock === b.totalProducts
    })),
    deletion_candidates: deletionCandidates.map(b => ({
      brand_name: b.brandName,
      product_count: b.totalProducts
    }))
  };

  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`📄 Summary JSON saved to: ${summaryPath}\n`);

  console.log('========================================\n');
}

analyzeUnmatchedBCByBrand().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
