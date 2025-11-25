#!/usr/bin/env node

/**
 * ANALYZE UNMATCHED UHP SUPPLIER PRODUCTS BY BRAND
 * Groups unmatched UHP supplier products by brand
 */

require('dotenv').config({ path: '../MASTER-CREDENTIALS-COMPLETE.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.BOO_SUPABASE_URL,
  process.env.BOO_SUPABASE_SERVICE_ROLE_KEY
);

const SUPPLIER_NAME = 'uhp';

async function analyzeUnmatchedSupplierByBrand() {
  console.log('\n========================================');
  console.log('UNMATCHED UHP SUPPLIER PRODUCTS - BRAND ANALYSIS');
  console.log('========================================\n');

  // Get already matched supplier product IDs
  console.log('Loading existing UHP matches...');
  let existingMatches = [];
  let offset = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('product_supplier_links')
      .select('supplier_product_id')
      .eq('supplier_name', SUPPLIER_NAME)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    existingMatches = existingMatches.concat(data);
    offset += PAGE_SIZE;
    if (data.length < PAGE_SIZE) break;
  }

  const matchedSupplierIds = new Set(existingMatches.map(m => m.supplier_product_id));
  console.log(`✓ Found ${existingMatches.length} existing matches\n`);

  // Get all UHP supplier products
  console.log('Loading UHP supplier products...');
  let uhpProducts = [];
  let uhpOffset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('supplier_products')
      .select('*')
      .eq('supplier_name', SUPPLIER_NAME)
      .range(uhpOffset, uhpOffset + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    uhpProducts = uhpProducts.concat(data);
    uhpOffset += PAGE_SIZE;
    if (data.length < PAGE_SIZE) break;
  }

  console.log(`✓ Loaded ${uhpProducts.length} total UHP supplier products\n`);

  // Filter to unmatched products
  const unmatchedProducts = uhpProducts.filter(p => !matchedSupplierIds.has(p.id));
  console.log(`✓ Found ${unmatchedProducts.length} unmatched UHP supplier products\n`);

  // Group by brand
  console.log('Grouping products by brand...\n');
  const brandGroups = new Map();

  unmatchedProducts.forEach(product => {
    const brandName = product.brand || 'NO BRAND';

    if (!brandGroups.has(brandName)) {
      brandGroups.set(brandName, {
        brandName,
        products: [],
        totalProducts: 0
      });
    }

    const group = brandGroups.get(brandName);
    group.products.push(product);
    group.totalProducts++;
  });

  // Sort by total products (descending)
  const sortedBrands = Array.from(brandGroups.values())
    .sort((a, b) => b.totalProducts - a.totalProducts);

  // Display results
  console.log('========================================');
  console.log('UNMATCHED UHP SUPPLIER PRODUCTS BY BRAND');
  console.log('========================================\n');

  console.log(`Total unmatched UHP supplier products: ${unmatchedProducts.length}`);
  console.log(`Total brands: ${sortedBrands.length}\n`);

  console.log('BRAND BREAKDOWN (sorted by product count):');
  console.log('─'.repeat(80));
  console.log('Brand'.padEnd(50) + 'Product Count');
  console.log('─'.repeat(80));

  sortedBrands.forEach((brand, idx) => {
    console.log(
      `${(idx + 1).toString().padStart(3)}. ${brand.brandName.substring(0, 44).padEnd(45)}${brand.totalProducts}`
    );
  });

  console.log('─'.repeat(80));
  console.log();

  // Show top 10 brands with sample products
  console.log('\n========================================');
  console.log('TOP 10 BRANDS - SAMPLE PRODUCTS');
  console.log('========================================\n');

  sortedBrands.slice(0, 10).forEach((brand, idx) => {
    console.log(`${idx + 1}. ${brand.brandName} (${brand.totalProducts} products)`);
    console.log('─'.repeat(80));

    brand.products.slice(0, 5).forEach(product => {
      console.log(`   ${product.supplier_sku || 'NO SKU'} - ${product.product_name}`);
    });

    if (brand.products.length > 5) {
      console.log(`   ... and ${brand.products.length - 5} more products`);
    }
    console.log();
  });

  // Create detailed CSV export
  const csvRows = [
    ['Brand', 'Supplier SKU', 'Product Name', 'Barcode', 'Supplier Product ID']
  ];

  sortedBrands.forEach(brand => {
    brand.products.forEach(product => {
      csvRows.push([
        brand.brandName,
        product.supplier_sku || '',
        product.product_name || '',
        product.barcode || '',
        product.id || ''
      ]);
    });
  });

  const csvContent = csvRows.map(row =>
    row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  const csvPath = 'reports/unmatched-uhp-supplier-by-brand.csv';
  fs.mkdirSync('reports', { recursive: true });
  fs.writeFileSync(csvPath, csvContent);
  console.log(`\n📄 Detailed report saved to: ${csvPath}`);

  // Create summary JSON
  const summaryPath = 'reports/unmatched-uhp-supplier-brand-summary.json';
  const summary = {
    timestamp: new Date().toISOString(),
    total_unmatched_supplier_products: unmatchedProducts.length,
    total_brands: sortedBrands.length,
    brands: sortedBrands.map(b => ({
      brand_name: b.brandName,
      product_count: b.totalProducts
    }))
  };

  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`📄 Summary JSON saved to: ${summaryPath}\n`);

  console.log('========================================\n');
}

analyzeUnmatchedSupplierByBrand().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
