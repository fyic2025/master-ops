#!/usr/bin/env node

/**
 * UNLEASHED PRICING ANALYSIS - Multi-Size Comparison
 *
 * Analyzes pricing for 250g, 500g, 1000g products vs 50g/100g baseline
 * to identify pricing inconsistencies in Teelixir and Kikai/Elevate
 */

const https = require('https');
const crypto = require('crypto');

// Quick analysis mode - calculate all 250g adjustments
if (process.argv[2] === '--recommendations') {
  showRecommendations();
  process.exit(0);
}

function showRecommendations() {
  console.log('='.repeat(90));
  console.log('ALL PRODUCTS - 250g Pricing Adjustment (+15% premium vs 500g)');
  console.log('='.repeat(90));
  console.log();

  // Kikai wholesale current prices (from earlier analysis)
  const products = {
    'Pearl': { 50: 28.18, 100: 45.09, 250: 75.00, 500: 150.00 },
    'Tremella': { 50: 22.55, 250: 60.00, 500: 120.00, 1000: 240.00 },
    'Reishi': { 50: 22.55, 100: 36.07, 250: 60.00, 500: 120.00, 1000: 240.00 },
    'Turkey Tail': { 50: 22.55, 100: 36.07, 250: 60.00, 500: 120.00 },
    'Pine Pollen': { 50: 21.42, 250: 57.00, 500: 114.00 }
  };

  // RRP markup ratio
  const rrpMarkup = 1.72;

  console.log('Product        | Current 250g | New 250g W/S | Change   | New RRP');
  console.log('-'.repeat(75));

  for (const [name, sizes] of Object.entries(products)) {
    if (sizes[250] === undefined) continue;

    const anchor = sizes[500] || sizes[1000] / 2;  // Use 500g or half of 1kg
    const anchorPerG = anchor / 500;

    const current250 = sizes[250];
    const newPerG = anchorPerG * 1.15;  // +15% premium
    const new250 = newPerG * 250;
    const change = new250 - current250;
    const newRRP = new250 * rrpMarkup;

    console.log(
      name.padEnd(15) + '| $' +
      current250.toFixed(2).padStart(6) + '       | $' +
      new250.toFixed(2).padStart(6) + '       | +$' +
      change.toFixed(2).padStart(5) + '  | $' +
      newRRP.toFixed(0)
    );
  }

  console.log();
  console.log('Note: Chaga & Cordyceps have no 250g in Kikai - skip from 100g to 500g');
}

// API Credentials
const ACCOUNTS = {
  teelixir: {
    name: 'Teelixir',
    apiId: '7fda9404-7197-477b-89b1-dadbcefae168',
    apiKey: 'a65AOqESdYl9GHyhqohaoYPGWsugYa2V1xi90zRn4pW4LzjCcgF3JUB3Z8YI4PNq5duUphxQ8zGOCwNKexDQ=='
  },
  kikai: {
    name: 'Kikai/Elevate',
    apiId: '336a6015-eae0-43ab-83eb-e08121e7655d',
    apiKey: 'SNX5bNJMLV3VaTbMK1rXMAiEUFdO96bLT5epp6ph8DJvc1WH5aJMRLihc2J0OyzVfKsA3xXpQgWIQANLxkQ=='
  }
};

const API_BASE = 'api.unleashedsoftware.com';

// Products to include (case-insensitive patterns)
const INCLUDE_PATTERNS = [
  'pearl', 'reishi', 'chaga', 'cordyceps', 'turkey tail',
  'tremella', 'resveratrol', 'pine pollen', 'pure'
];

// Products to exclude (case-insensitive patterns)
const EXCLUDE_PATTERNS = [
  'lion', 'immunity', 'latte', 'ashwaganda', 'ashwagandha',
  'sample', 'bundle', 'gift', 'promo'
];

// Size patterns to extract (in grams)
const SIZE_PATTERNS = [
  { regex: /(\d+)\s*kg/i, multiplier: 1000 },
  { regex: /(\d+)\s*g(?:ram)?/i, multiplier: 1 }
];

function makeUnleashedRequest(account, endpoint) {
  return new Promise((resolve, reject) => {
    const queryString = '';
    const signature = crypto
      .createHmac('sha256', account.apiKey)
      .update(queryString)
      .digest('base64');

    const options = {
      hostname: API_BASE,
      path: endpoint,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'api-auth-id': account.apiId,
        'api-auth-signature': signature
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`API Error ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function fetchAllProducts(account) {
  let allProducts = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await makeUnleashedRequest(account, `/Products/${page}`);

    if (response.Items && response.Items.length > 0) {
      allProducts = allProducts.concat(response.Items);
      page++;
      hasMore = response.Pagination && response.Pagination.NumberOfPages > page - 1;
    } else {
      hasMore = false;
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  return allProducts;
}

function extractSize(productName, productCode) {
  const combined = `${productName} ${productCode}`;

  for (const pattern of SIZE_PATTERNS) {
    const match = combined.match(pattern.regex);
    if (match) {
      return parseInt(match[1]) * pattern.multiplier;
    }
  }
  return null;
}

function shouldInclude(productName) {
  const lower = productName.toLowerCase();

  // Check exclusions first
  for (const pattern of EXCLUDE_PATTERNS) {
    if (lower.includes(pattern)) return false;
  }

  // Check inclusions
  for (const pattern of INCLUDE_PATTERNS) {
    if (lower.includes(pattern)) return true;
  }

  return false;
}

function extractBaseName(productName) {
  // Remove size indicators and clean up
  let base = productName
    .replace(/\d+\s*(g|kg|gram)/gi, '')
    .replace(/pure\s*/gi, 'Pure ')
    .replace(/extract\s*/gi, '')
    .replace(/powder\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Normalize common names
  const normalizations = {
    'pearl': 'Pearl (Tremella)',
    'tremella': 'Pearl (Tremella)',
    'turkey tail': 'Turkey Tail',
    'pine pollen': 'Pine Pollen'
  };

  for (const [key, value] of Object.entries(normalizations)) {
    if (base.toLowerCase().includes(key)) {
      return value;
    }
  }

  return base;
}

async function main() {
  console.log('========================================');
  console.log('UNLEASHED PRICING ANALYSIS');
  console.log('Multi-Size Comparison Report');
  console.log('========================================\n');

  const allAnalyzed = [];

  for (const [key, account] of Object.entries(ACCOUNTS)) {
    console.log(`\nFetching from ${account.name}...`);

    try {
      const products = await fetchAllProducts(account);
      console.log(`  Found ${products.length} total products`);

      // Filter and analyze
      const filtered = products.filter(p => {
        if (!p.IsSellable || p.IsObsolete) return false;
        return shouldInclude(p.ProductDescription);
      });

      console.log(`  ${filtered.length} products match criteria`);

      for (const product of filtered) {
        const size = extractSize(product.ProductDescription, product.ProductCode);
        if (!size) continue;

        // Only interested in specific sizes
        if (![50, 100, 250, 500, 1000].includes(size)) continue;

        allAnalyzed.push({
          account: account.name,
          code: product.ProductCode,
          name: product.ProductDescription,
          baseName: extractBaseName(product.ProductDescription),
          size: size,
          wholesale: product.DefaultSellPrice || 0,
          rrp: product.RRP || 0,
          cost: product.LastCost || 0
        });
      }
    } catch (error) {
      console.error(`  Error fetching from ${account.name}:`, error.message);
    }
  }

  // Group by base product name
  const grouped = {};
  for (const item of allAnalyzed) {
    const key = `${item.account}|${item.baseName}`;
    if (!grouped[key]) {
      grouped[key] = {
        account: item.account,
        baseName: item.baseName,
        variants: []
      };
    }
    grouped[key].variants.push(item);
  }

  // Sort variants by size within each group
  for (const group of Object.values(grouped)) {
    group.variants.sort((a, b) => a.size - b.size);
  }

  // Display results
  console.log('\n\n========================================');
  console.log('PRICING ANALYSIS RESULTS');
  console.log('========================================\n');

  const sortedGroups = Object.values(grouped).sort((a, b) =>
    a.baseName.localeCompare(b.baseName)
  );

  for (const group of sortedGroups) {
    if (group.variants.length < 2) continue; // Need at least 2 sizes to compare

    console.log(`\n${group.baseName} (${group.account})`);
    console.log('-'.repeat(80));
    console.log(
      'Size'.padEnd(8) +
      'SKU'.padEnd(20) +
      'Wholesale'.padEnd(12) +
      'RRP'.padEnd(12) +
      'W$/g'.padEnd(10) +
      'RRP$/g'.padEnd(10) +
      'W%Base'.padEnd(10) +
      'Flag'
    );
    console.log('-'.repeat(80));

    const baseline = group.variants[0]; // Smallest size as baseline
    const baseWholesalePerG = baseline.wholesale / baseline.size;
    const baseRrpPerG = baseline.rrp / baseline.size;

    for (const variant of group.variants) {
      const wholesalePerG = variant.wholesale / variant.size;
      const rrpPerG = variant.rrp / variant.size;

      const wholesaleDiscount = ((wholesalePerG - baseWholesalePerG) / baseWholesalePerG * 100);
      const rrpDiscount = baseRrpPerG > 0 ? ((rrpPerG - baseRrpPerG) / baseRrpPerG * 100) : 0;

      // Flag if larger size is MORE expensive per gram (anomaly)
      let flag = '';
      if (variant.size > baseline.size && wholesalePerG >= baseWholesalePerG) {
        flag = '⚠️ TOO EXPENSIVE';
      } else if (variant.size > baseline.size && wholesaleDiscount > -10) {
        flag = '⚠️ WEAK DISCOUNT';
      }

      console.log(
        `${variant.size}g`.padEnd(8) +
        variant.code.substring(0, 18).padEnd(20) +
        `$${variant.wholesale.toFixed(2)}`.padEnd(12) +
        `$${variant.rrp.toFixed(2)}`.padEnd(12) +
        `$${wholesalePerG.toFixed(3)}`.padEnd(10) +
        `$${rrpPerG.toFixed(3)}`.padEnd(10) +
        (variant === baseline ? 'BASE'.padEnd(10) : `${wholesaleDiscount.toFixed(0)}%`.padEnd(10)) +
        flag
      );
    }
  }

  // Summary of anomalies
  console.log('\n\n========================================');
  console.log('ANOMALY SUMMARY');
  console.log('========================================\n');

  let anomalyCount = 0;
  for (const group of sortedGroups) {
    if (group.variants.length < 2) continue;

    const baseline = group.variants[0];
    const baseWholesalePerG = baseline.wholesale / baseline.size;

    for (const variant of group.variants) {
      if (variant === baseline) continue;

      const wholesalePerG = variant.wholesale / variant.size;
      const discount = ((wholesalePerG - baseWholesalePerG) / baseWholesalePerG * 100);

      if (wholesalePerG >= baseWholesalePerG || discount > -10) {
        anomalyCount++;
        console.log(`❌ ${group.baseName} ${variant.size}g: $${variant.wholesale} wholesale`);
        console.log(`   → $${wholesalePerG.toFixed(3)}/g vs baseline $${baseWholesalePerG.toFixed(3)}/g (${baseline.size}g)`);
        console.log(`   → Only ${Math.abs(discount).toFixed(0)}% discount for ${(variant.size/baseline.size).toFixed(1)}x the size`);
        console.log('');
      }
    }
  }

  if (anomalyCount === 0) {
    console.log('✅ No pricing anomalies detected - all larger sizes have appropriate discounts');
  } else {
    console.log(`\nTotal anomalies found: ${anomalyCount}`);
  }

  console.log('\n========================================');
  console.log('ANALYSIS COMPLETE');
  console.log('========================================\n');
}

main().catch(console.error);
