#!/usr/bin/env node

/**
 * COMPARE UNMATCHED BC BRANDS TO UHP SUPPLIER
 * Identifies which brands in unmatched BC products still exist in UHP feed
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

  // Common brand patterns - extract first significant word(s)
  const cleanName = name
    .replace(/^\s*UN\s*-\s*[A-Z0-9]+\s*-\s*/i, '') // Remove "UN - SKU -" prefix
    .trim();

  // Split and take first 1-2 words as brand
  const words = cleanName.split(/\s+/);

  // Common brand names with 2+ words
  const twoWordBrands = [
    'Power Super Foods', 'Protein Supplies', 'Jack N', 'Dr Organic',
    'The Ginger People', 'Tom Organic', 'Lemon Myrtle', 'Pure Food',
    'Naturally Sweet', 'Love Children', 'Schmidt\'s', 'Planet Organic',
    'Organic Times', 'Nirvana Organics', 'Nutritionist Choice', 'Happy Way',
    'Well & Good', 'MACRO MIKE', 'Nutra Organics'
  ];

  // Check for known 2-word brands
  const firstTwo = words.slice(0, 2).join(' ');
  for (const brand of twoWordBrands) {
    if (firstTwo.toLowerCase().includes(brand.toLowerCase())) {
      return brand;
    }
  }

  // Default: return first word
  return words[0] || 'UNKNOWN';
}

async function compareUnmatchedBrandsToUHP() {
  console.log('\n========================================');
  console.log('COMPARE UNMATCHED BC BRANDS TO UHP');
  console.log('========================================\n');

  // Get matched BC product IDs
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

  const unmatchedBcProducts = bcProducts.filter(p => !matchedBcIds.has(p.id));
  console.log(`✓ Found ${unmatchedBcProducts.length} unmatched BC products\n`);

  // Get all UHP supplier products
  console.log('Loading UHP supplier products...');
  let uhpProducts = [];
  let uhpOffset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('supplier_products')
      .select('brand, product_name')
      .eq('supplier_name', SUPPLIER_NAME)
      .range(uhpOffset, uhpOffset + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    uhpProducts = uhpProducts.concat(data);
    uhpOffset += PAGE_SIZE;
    if (data.length < PAGE_SIZE) break;
  }

  console.log(`✓ Loaded ${uhpProducts.length} UHP supplier products\n`);

  // Get unique brands from UHP
  const uhpBrands = new Set(
    uhpProducts
      .map(p => p.brand?.trim().toLowerCase())
      .filter(Boolean)
  );

  console.log(`✓ Found ${uhpBrands.size} unique brands in UHP supplier feed\n`);

  // Group unmatched BC products by brand
  console.log('Grouping unmatched BC products by brand...\n');
  const bcBrandGroups = new Map();

  unmatchedBcProducts.forEach(product => {
    const brandName = extractBrandFromName(product.name);

    if (!bcBrandGroups.has(brandName)) {
      bcBrandGroups.set(brandName, {
        brandName,
        products: [],
        totalProducts: 0,
        zeroStock: 0,
        totalStock: 0
      });
    }

    const group = bcBrandGroups.get(brandName);
    group.products.push(product);
    group.totalProducts++;
    group.totalStock += product.stock_level || 0;
    if (!product.stock_level || product.stock_level === 0) {
      group.zeroStock++;
    }
  });

  // Check which BC brands exist in UHP
  const brandsInUHP = [];
  const brandsNotInUHP = [];

  bcBrandGroups.forEach((group, brandName) => {
    const brandLower = brandName.toLowerCase();
    const existsInUHP = uhpBrands.has(brandLower);

    const brandInfo = {
      ...group,
      existsInUHP
    };

    if (existsInUHP) {
      brandsInUHP.push(brandInfo);
    } else {
      brandsNotInUHP.push(brandInfo);
    }
  });

  // Sort by product count
  brandsInUHP.sort((a, b) => b.totalProducts - a.totalProducts);
  brandsNotInUHP.sort((a, b) => b.totalProducts - a.totalProducts);

  // Display results
  console.log('========================================');
  console.log('BRANDS STILL IN UHP (SKU mismatch issue)');
  console.log('========================================\n');

  console.log(`Total brands: ${brandsInUHP.length}`);
  console.log(`Total products: ${brandsInUHP.reduce((sum, b) => sum + b.totalProducts, 0)}\n`);

  if (brandsInUHP.length > 0) {
    console.log('Brand'.padEnd(40) + 'Products'.padEnd(15) + 'Zero Stock'.padEnd(15) + 'In UHP?');
    console.log('─'.repeat(80));
    brandsInUHP.forEach(brand => {
      console.log(
        brand.brandName.substring(0, 39).padEnd(40) +
        brand.totalProducts.toString().padEnd(15) +
        brand.zeroStock.toString().padEnd(15) +
        'YES'
      );
    });
  } else {
    console.log('(None found - all brands discontinued)');
  }

  console.log('\n========================================');
  console.log('BRANDS NOT IN UHP (Safe to delete)');
  console.log('========================================\n');

  console.log(`Total brands: ${brandsNotInUHP.length}`);
  console.log(`Total products: ${brandsNotInUHP.reduce((sum, b) => sum + b.totalProducts, 0)}\n`);

  if (brandsNotInUHP.length > 0) {
    console.log('Brand'.padEnd(40) + 'Products'.padEnd(15) + 'Zero Stock'.padEnd(15) + 'In UHP?');
    console.log('─'.repeat(80));
    brandsNotInUHP.forEach(brand => {
      console.log(
        brand.brandName.substring(0, 39).padEnd(40) +
        brand.totalProducts.toString().padEnd(15) +
        brand.zeroStock.toString().padEnd(15) +
        'NO'
      );
    });
  }

  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================\n');

  const safeToDelete = brandsNotInUHP.reduce((sum, b) => sum + b.totalProducts, 0);
  const needsReview = brandsInUHP.reduce((sum, b) => sum + b.totalProducts, 0);

  console.log(`Total unmatched BC products: ${unmatchedBcProducts.length}`);
  console.log(`Products from brands NOT in UHP (safe to delete): ${safeToDelete}`);
  console.log(`Products from brands STILL in UHP (needs review): ${needsReview}\n`);

  // Save detailed report
  const reportPath = 'reports/unmatched-uhp-brand-comparison.json';
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total_unmatched_bc_products: unmatchedBcProducts.length,
      brands_still_in_uhp: brandsInUHP.length,
      brands_not_in_uhp: brandsNotInUHP.length,
      products_safe_to_delete: safeToDelete,
      products_need_review: needsReview
    },
    brands_in_uhp: brandsInUHP,
    brands_not_in_uhp: brandsNotInUHP
  };

  fs.mkdirSync('reports', { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Detailed report saved to: ${reportPath}\n`);

  // Create deletion candidate CSV (brands not in UHP)
  if (brandsNotInUHP.length > 0) {
    const csvRows = [
      ['Brand', 'SKU', 'Product Name', 'Stock Level', 'BC ID', 'In UHP Feed?']
    ];

    brandsNotInUHP.forEach(brand => {
      brand.products.forEach(product => {
        csvRows.push([
          brand.brandName,
          product.sku || '',
          product.name || '',
          product.stock_level || 0,
          product.product_id || '',
          'NO'
        ]);
      });
    });

    const csvContent = csvRows.map(row =>
      row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const csvPath = 'reports/uhp-deletion-candidates.csv';
    fs.writeFileSync(csvPath, csvContent);
    console.log(`📄 Deletion candidates CSV: ${csvPath}\n`);
  }

  console.log('========================================\n');
}

compareUnmatchedBrandsToUHP().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
