#!/usr/bin/env node

/**
 * ANALYZE UNMATCHED UHP PRODUCTS BY BRAND
 * Groups unmatched BC UN products by brand to identify discontinued brands
 */

require('dotenv').config({ path: '../MASTER-CREDENTIALS-COMPLETE.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.BOO_SUPABASE_URL,
  process.env.BOO_SUPABASE_SERVICE_ROLE_KEY
);

const SUPPLIER_NAME = 'uhp';

async function analyzeUnmatchedByBrand() {
  console.log('\n========================================');
  console.log('UNMATCHED UHP PRODUCTS - BRAND ANALYSIS');
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

  // Group by brand (using brand field directly)
  console.log('Grouping products by brand...\n');
  const brandGroups = new Map();

  unmatchedProducts.forEach(product => {
    const brandId = product.brand?.toString() || 'NO_BRAND';
    const brandName = brandId === 'NO_BRAND' ? 'NO BRAND' : `Brand ID: ${brandId}`;

    if (!brandGroups.has(brandName)) {
      brandGroups.set(brandName, {
        brandId,
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
  console.log('UNMATCHED PRODUCTS BY BRAND');
  console.log('========================================\n');

  console.log(`Total unmatched products: ${unmatchedProducts.length}`);
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

  sortedBrands.forEach(brand => {
    console.log(
      brand.brandName.substring(0, 39).padEnd(40) +
      brand.totalProducts.toString().padEnd(10) +
      brand.zeroStock.toString().padEnd(15) +
      brand.lowStock.toString().padEnd(15) +
      brand.inStock.toString().padEnd(15) +
      brand.totalStockLevel.toString()
    );
  });

  console.log('─'.repeat(120));
  console.log();

  // Identify candidates for deletion (all zero stock)
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
    ['Brand', 'SKU', 'Product Name', 'Stock Level', 'Is Visible', 'BC ID', 'Barcode']
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

  const csvPath = 'reports/unmatched-uhp-by-brand.csv';
  fs.mkdirSync('reports', { recursive: true });
  fs.writeFileSync(csvPath, csvContent);
  console.log(`\n📄 Detailed report saved to: ${csvPath}`);

  // Create summary JSON
  const summaryPath = 'reports/unmatched-uhp-brand-summary.json';
  const summary = {
    timestamp: new Date().toISOString(),
    total_unmatched: unmatchedProducts.length,
    total_brands: sortedBrands.length,
    brands: sortedBrands.map(b => ({
      brand_name: b.brandName,
      brand_id: b.brandId,
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

analyzeUnmatchedByBrand().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
