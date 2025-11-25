#!/usr/bin/env node

/**
 * FUZZY MATCH UHP BRANDS
 * Uses fuzzy matching to catch similar brand names between BC and UHP
 */

require('dotenv').config({ path: '../MASTER-CREDENTIALS-COMPLETE.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.BOO_SUPABASE_URL,
  process.env.BOO_SUPABASE_SERVICE_ROLE_KEY
);

const SUPPLIER_NAME = 'uhp';

// Levenshtein distance
function levenshtein(a, b) {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// Calculate similarity percentage
function similarity(s1, s2) {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 100;

  const distance = levenshtein(longer, shorter);
  return ((longer.length - distance) / longer.length) * 100;
}

// Normalize brand name for comparison
function normalizeBrand(brand) {
  return brand
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

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

async function fuzzyMatchBrands() {
  console.log('\n========================================');
  console.log('FUZZY MATCH UHP BRANDS');
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
  const uhpBrandsRaw = [...new Set(
    uhpProducts
      .map(p => p.brand?.trim())
      .filter(Boolean)
  )];

  console.log(`✓ Found ${uhpBrandsRaw.length} unique brands in UHP supplier feed\n`);

  // Group unmatched BC products by brand
  console.log('Grouping unmatched BC products by brand...\n');
  const bcBrandGroups = new Map();

  unmatchedBcProducts.forEach(product => {
    const brandName = extractBrandFromName(product.name);

    if (!bcBrandGroups.has(brandName)) {
      bcBrandGroups.set(brandName, {
        brandName,
        products: [],
        totalProducts: 0
      });
    }

    const group = bcBrandGroups.get(brandName);
    group.products.push(product);
    group.totalProducts++;
  });

  // Fuzzy match BC brands to UHP brands
  console.log('Performing fuzzy match...\n');
  const SIMILARITY_THRESHOLD = 75; // 75% similarity
  const matches = [];
  const noMatches = [];

  bcBrandGroups.forEach((group, bcBrand) => {
    let bestMatch = null;
    let bestScore = 0;

    const bcNormalized = normalizeBrand(bcBrand);

    // Try to find fuzzy match in UHP brands
    uhpBrandsRaw.forEach(uhpBrand => {
      const uhpNormalized = normalizeBrand(uhpBrand);
      const score = similarity(bcNormalized, uhpNormalized);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = uhpBrand;
      }
    });

    if (bestScore >= SIMILARITY_THRESHOLD) {
      matches.push({
        bc_brand: bcBrand,
        uhp_brand: bestMatch,
        similarity: bestScore.toFixed(1),
        product_count: group.totalProducts,
        status: 'SIMILAR_BRAND_IN_UHP'
      });
    } else {
      noMatches.push({
        bc_brand: bcBrand,
        best_match: bestMatch,
        similarity: bestScore.toFixed(1),
        product_count: group.totalProducts,
        status: 'NO_SIMILAR_BRAND'
      });
    }
  });

  // Sort by product count
  matches.sort((a, b) => b.product_count - a.product_count);
  noMatches.sort((a, b) => b.product_count - a.product_count);

  // Display results
  console.log('========================================');
  console.log('BRANDS WITH SIMILAR NAMES IN UHP');
  console.log('(Need review - might be same brand)');
  console.log('========================================\n');

  console.log(`Total brands with matches: ${matches.length}`);
  console.log(`Total products: ${matches.reduce((sum, m) => sum + m.product_count, 0)}\n`);

  if (matches.length > 0) {
    console.log('BC Brand'.padEnd(30) + 'UHP Brand'.padEnd(30) + 'Score'.padEnd(10) + 'Products');
    console.log('─'.repeat(90));
    matches.forEach(m => {
      console.log(
        m.bc_brand.substring(0, 29).padEnd(30) +
        m.uhp_brand.substring(0, 29).padEnd(30) +
        `${m.similarity}%`.padEnd(10) +
        m.product_count
      );
    });
  }

  console.log('\n========================================');
  console.log('BRANDS WITH NO SIMILAR MATCH IN UHP');
  console.log('(Safe to delete)');
  console.log('========================================\n');

  console.log(`Total brands: ${noMatches.length}`);
  console.log(`Total products: ${noMatches.reduce((sum, m) => sum + m.product_count, 0)}\n`);

  if (noMatches.length > 0) {
    console.log('BC Brand'.padEnd(30) + 'Best Match'.padEnd(30) + 'Score'.padEnd(10) + 'Products');
    console.log('─'.repeat(90));
    noMatches.forEach(m => {
      console.log(
        m.bc_brand.substring(0, 29).padEnd(30) +
        (m.best_match || 'N/A').substring(0, 29).padEnd(30) +
        `${m.similarity}%`.padEnd(10) +
        m.product_count
      );
    });
  }

  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================\n');

  const safeToDelete = noMatches.reduce((sum, m) => sum + m.product_count, 0);
  const needsReview = matches.reduce((sum, m) => sum + m.product_count, 0);

  console.log(`Total unmatched BC products: ${unmatchedBcProducts.length}`);
  console.log(`Brands with similar names in UHP (needs review): ${matches.length} brands (${needsReview} products)`);
  console.log(`Brands with NO similar match (safe to delete): ${noMatches.length} brands (${safeToDelete} products)\n`);

  // Save detailed report
  const reportPath = 'reports/uhp-fuzzy-brand-match.json';
  const report = {
    timestamp: new Date().toISOString(),
    similarity_threshold: SIMILARITY_THRESHOLD,
    summary: {
      total_unmatched_bc_products: unmatchedBcProducts.length,
      brands_with_similar_match: matches.length,
      brands_no_match: noMatches.length,
      products_need_review: needsReview,
      products_safe_to_delete: safeToDelete
    },
    similar_brands: matches,
    no_match_brands: noMatches
  };

  fs.mkdirSync('reports', { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Detailed report saved to: ${reportPath}\n`);

  console.log('========================================\n');
}

fuzzyMatchBrands().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
