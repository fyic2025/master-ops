#!/usr/bin/env node

/**
 * ADVANCED UHP MATCHING
 * Matches remaining unmatched products by:
 * 1. Brand matching
 * 2. Size/weight/volume matching
 * 3. Product name keyword matching
 */

require('dotenv').config({ path: '../MASTER-CREDENTIALS-COMPLETE.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.BOO_SUPABASE_URL,
  process.env.BOO_SUPABASE_SERVICE_ROLE_KEY
);

const SUPPLIER_NAME = 'uhp';

// Extract size/weight/volume from product name
function extractSize(name) {
  if (!name) return null;

  // Common patterns: 500g, 1kg, 250ml, 1L, 100 capsules, etc.
  const patterns = [
    /(\d+\.?\d*)\s*(g|gr|gm|gram|grams)/i,
    /(\d+\.?\d*)\s*(kg|kilo|kilogram|kilograms)/i,
    /(\d+\.?\d*)\s*(ml|millilitre|millilitres|milliliter|milliliters)/i,
    /(\d+\.?\d*)\s*(l|litre|litres|liter|liters)/i,
    /(\d+\.?\d*)\s*(mg|milligram|milligrams)/i,
    /(\d+\.?\d*)\s*(oz|ounce|ounces)/i,
    /(\d+\.?\d*)\s*(capsule|capsules|caps|cap)/i,
    /(\d+\.?\d*)\s*(tablet|tablets|tabs|tab)/i,
    /(\d+\.?\d*)\s*(serving|servings)/i,
    /(\d+\.?\d*)\s*(unit|units)/i,
    /(\d+\.?\d*)\s*(pack|packs)/i,
    /(\d+\.?\d*)\s*(piece|pieces|pcs)/i,
  ];

  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match) {
      const value = parseFloat(match[1]);
      let unit = match[2].toLowerCase();

      // Normalize units
      if (unit.match(/^(g|gr|gm|gram|grams)$/)) unit = 'g';
      if (unit.match(/^(kg|kilo|kilogram|kilograms)$/)) unit = 'kg';
      if (unit.match(/^(ml|millilitre|millilitres|milliliter|milliliters)$/)) unit = 'ml';
      if (unit.match(/^(l|litre|litres|liter|liters)$/)) unit = 'l';
      if (unit.match(/^(mg|milligram|milligrams)$/)) unit = 'mg';
      if (unit.match(/^(oz|ounce|ounces)$/)) unit = 'oz';
      if (unit.match(/^(capsule|capsules|caps|cap)$/)) unit = 'caps';
      if (unit.match(/^(tablet|tablets|tabs|tab)$/)) unit = 'tabs';

      return { value, unit, normalized: normalizeSize(value, unit) };
    }
  }

  return null;
}

// Normalize size to common unit for comparison
function normalizeSize(value, unit) {
  // Convert everything to grams or ml for comparison
  if (unit === 'kg') return value * 1000;
  if (unit === 'l') return value * 1000;
  if (unit === 'mg') return value / 1000;
  if (unit === 'oz') return value * 28.35; // approximate
  return value;
}

// Extract main keywords from product name
function extractKeywords(name) {
  if (!name) return [];

  // Remove UN prefix, SKU, and common words
  let cleaned = name
    .replace(/^UN\s*-\s*[A-Z0-9]+\s*-\s*/i, '')
    .replace(/\b(organic|certified|natural|raw|pure|premium|extra|super|by|the|and|or|with)\b/gi, '')
    .replace(/\d+\.?\d*\s*(g|kg|ml|l|mg|oz|capsule|capsules|tablet|tablets|caps|tabs|gram|grams)/gi, '')
    .toLowerCase()
    .trim();

  // Split into words and filter
  const words = cleaned.split(/\s+/)
    .filter(w => w.length > 3)
    .filter(w => !w.match(/^\d+$/))
    .slice(0, 5); // Take first 5 significant words

  return words;
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

// Calculate match score based on brand, size, and keywords
function calculateMatchScore(bcProduct, uhpProduct) {
  let score = 0;
  const details = [];

  // 1. Brand matching (most important - 40 points)
  const bcBrand = extractBrandFromName(bcProduct.name);
  const uhpBrand = uhpProduct.brand?.trim() || '';

  if (bcBrand && uhpBrand) {
    if (bcBrand.toLowerCase() === uhpBrand.toLowerCase()) {
      score += 40;
      details.push('Brand: Exact match');
    } else if (bcBrand.toLowerCase().includes(uhpBrand.toLowerCase()) ||
               uhpBrand.toLowerCase().includes(bcBrand.toLowerCase())) {
      score += 30;
      details.push('Brand: Partial match');
    }
  }

  // 2. Size matching (30 points)
  const bcSize = extractSize(bcProduct.name);
  const uhpSize = extractSize(uhpProduct.product_name);

  if (bcSize && uhpSize) {
    if (bcSize.unit === uhpSize.unit && bcSize.value === uhpSize.value) {
      score += 30;
      details.push(`Size: Exact (${bcSize.value}${bcSize.unit})`);
    } else if (Math.abs(bcSize.normalized - uhpSize.normalized) / bcSize.normalized < 0.1) {
      score += 20;
      details.push('Size: Close match');
    }
  }

  // 3. Keyword matching (30 points)
  const bcKeywords = extractKeywords(bcProduct.name);
  const uhpKeywords = extractKeywords(uhpProduct.product_name);

  if (bcKeywords.length > 0 && uhpKeywords.length > 0) {
    const commonKeywords = bcKeywords.filter(kw =>
      uhpKeywords.some(ukw => ukw.includes(kw) || kw.includes(ukw))
    );

    const keywordScore = (commonKeywords.length / Math.max(bcKeywords.length, uhpKeywords.length)) * 30;
    score += keywordScore;
    if (commonKeywords.length > 0) {
      details.push(`Keywords: ${commonKeywords.length} matches (${commonKeywords.slice(0, 3).join(', ')})`);
    }
  }

  return { score, details };
}

async function advancedMatching() {
  console.log('\n========================================');
  console.log('ADVANCED UHP MATCHING');
  console.log('Brand + Size + Keywords');
  console.log('========================================\n');

  // Get already matched BC product IDs
  console.log('Loading existing matches...');
  let existingMatches = [];
  let offset = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('product_supplier_links')
      .select('ecommerce_product_id, supplier_product_id')
      .eq('supplier_name', SUPPLIER_NAME)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    existingMatches = existingMatches.concat(data);
    offset += PAGE_SIZE;
    if (data.length < PAGE_SIZE) break;
  }

  const matchedBcIds = new Set(existingMatches?.map(m => m.ecommerce_product_id) || []);
  const matchedSupplierIds = new Set(existingMatches?.map(m => m.supplier_product_id) || []);

  console.log(`✓ Found ${existingMatches?.length || 0} existing matches\n`);

  // Get all BC products with UN prefix
  console.log('Loading unmatched BC products...');
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
  console.log('Loading unmatched UHP products...');
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

  const unmatchedUhpProducts = uhpProducts.filter(p => !matchedSupplierIds.has(p.id));
  console.log(`✓ Found ${unmatchedUhpProducts.length} unmatched UHP products\n`);

  // Try to match using brand + size + keywords
  console.log('Matching by brand + size + keywords...\n');

  const matches = [];
  const MIN_SCORE = 60; // Require at least 60/100 score for a match

  for (let i = 0; i < unmatchedBcProducts.length; i++) {
    const bcProduct = unmatchedBcProducts[i];
    let bestMatch = null;
    let bestScore = 0;
    let bestDetails = [];

    // Try to match against all UHP products
    for (const uhpProduct of unmatchedUhpProducts) {
      const { score, details } = calculateMatchScore(bcProduct, uhpProduct);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = uhpProduct;
        bestDetails = details;
      }
    }

    if (bestScore >= MIN_SCORE && bestMatch) {
      matches.push({
        bc_id: bcProduct.id,
        bc_product_id: bcProduct.product_id,
        bc_sku: bcProduct.sku,
        bc_name: bcProduct.name,
        uhp_id: bestMatch.id,
        uhp_sku: bestMatch.sku,
        uhp_name: bestMatch.product_name,
        uhp_brand: bestMatch.brand,
        score: bestScore.toFixed(1),
        details: bestDetails.join('; ')
      });
    }

    // Progress indicator
    if ((i + 1) % 100 === 0) {
      console.log(`  Progress: ${i + 1}/${unmatchedBcProducts.length} BC products checked (${matches.length} matches)`);
    }
  }

  console.log(`\n✓ Found ${matches.length} potential matches\n`);

  // Group by score ranges
  const highConfidence = matches.filter(m => parseFloat(m.score) >= 80);
  const mediumConfidence = matches.filter(m => parseFloat(m.score) >= 70 && parseFloat(m.score) < 80);
  const lowConfidence = matches.filter(m => parseFloat(m.score) >= 60 && parseFloat(m.score) < 70);

  console.log('========================================');
  console.log('MATCH CONFIDENCE LEVELS');
  console.log('========================================\n');
  console.log(`High confidence (80-100): ${highConfidence.length} matches`);
  console.log(`Medium confidence (70-79): ${mediumConfidence.length} matches`);
  console.log(`Low confidence (60-69): ${lowConfidence.length} matches\n`);

  // Display sample high confidence matches
  if (highConfidence.length > 0) {
    console.log('Sample HIGH CONFIDENCE matches (first 10):\n');
    highConfidence.slice(0, 10).forEach((m, i) => {
      console.log(`${i + 1}. Score: ${m.score}`);
      console.log(`   BC: ${m.bc_sku} - ${m.bc_name}`);
      console.log(`   UHP: ${m.uhp_sku} - ${m.uhp_name}`);
      console.log(`   Match: ${m.details}\n`);
    });
  }

  // Save detailed report
  const reportPath = 'reports/uhp-advanced-matches.json';
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total_bc_products: unmatchedBcProducts.length,
      total_uhp_products: unmatchedUhpProducts.length,
      total_matches: matches.length,
      high_confidence: highConfidence.length,
      medium_confidence: mediumConfidence.length,
      low_confidence: lowConfidence.length
    },
    high_confidence_matches: highConfidence,
    medium_confidence_matches: mediumConfidence,
    low_confidence_matches: lowConfidence
  };

  fs.mkdirSync('reports', { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Detailed report saved: ${reportPath}\n`);

  // Create CSV for manual review
  const csvRows = [
    ['Score', 'BC SKU', 'BC Name', 'UHP SKU', 'UHP Name', 'UHP Brand', 'Match Details']
  ];

  matches.forEach(m => {
    csvRows.push([
      m.score,
      m.bc_sku,
      m.bc_name,
      m.uhp_sku,
      m.uhp_name,
      m.uhp_brand,
      m.details
    ]);
  });

  const csvContent = csvRows.map(row =>
    row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  const csvPath = 'reports/uhp-advanced-matches.csv';
  fs.writeFileSync(csvPath, csvContent);
  console.log(`📄 CSV for manual review: ${csvPath}\n`);

  console.log('========================================');
  console.log('NEXT STEPS');
  console.log('========================================\n');
  console.log('1. Review high confidence matches in CSV');
  console.log('2. Verify matches are correct');
  console.log('3. Import confirmed matches to database');
  console.log('4. Review medium/low confidence matches manually\n');
}

advancedMatching().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
