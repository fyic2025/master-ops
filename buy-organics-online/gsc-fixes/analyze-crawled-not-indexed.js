/**
 * Analyze "Crawled - currently not indexed" URLs from Google Search Console
 *
 * This script categorizes the 1,930 URLs that Google crawled but chose not to index,
 * helping identify which need redirects, content improvements, or can be ignored.
 *
 * INPUT: crawled-not-indexed-2025-11-25.csv (export from GSC)
 * OUTPUT: Categorized analysis + redirect recommendations
 */

const fs = require('fs');
const path = require('path');

// Configuration
const INPUT_FILE = path.join(__dirname, 'crawled-not-indexed-2025-11-25.csv');
const OUTPUT_DIR = __dirname;

// Category definitions
const categories = {
  copyOfProducts: {
    name: 'Copy-of Products',
    pattern: /\/copy-of-/i,
    description: 'Products with "copy-of" in URL - should redirect to original',
    action: 'CREATE REDIRECT to original product',
    priority: 'HIGH'
  },

  productVariations: {
    name: 'Product Name Variations',
    pattern: /-(on-sale|bb-\d{2}-\d{2}-\d{2,4}|exp-\d{2}-\d{2}-\d{2})/i,
    description: 'Old sale/expiry URL variations - should redirect to clean URL',
    action: 'CREATE REDIRECT to current product',
    priority: 'HIGH'
  },

  pagination: {
    name: 'Pagination Pages',
    pattern: /[?&]page=/i,
    description: 'Category pagination beyond page 1 - normal to not index',
    action: 'IGNORE - Google correctly deprioritizes deep pagination',
    priority: 'LOW'
  },

  filterParams: {
    name: 'Filtered Category Pages',
    pattern: /[?&](price_min|price_max|brand|sort|color|size)=/i,
    description: 'Category pages with filter parameters - duplicate content',
    action: 'IGNORE - Should be blocked in robots.txt',
    priority: 'LOW'
  },

  searchResults: {
    name: 'Search Results',
    pattern: /\/search\.php/i,
    description: 'Search result pages that leaked through robots.txt',
    action: 'VERIFY robots.txt blocks /search.php',
    priority: 'MEDIUM'
  },

  brands: {
    name: 'Brand Pages',
    pattern: /\/brands\//i,
    description: 'Brand archive pages - may need content improvement',
    action: 'REVIEW - Check if brand has products, add content if thin',
    priority: 'MEDIUM'
  },

  categories: {
    name: 'Category Pages',
    pattern: /\/categories\.php/i,
    description: 'Category pages not indexed - may have thin content',
    action: 'REVIEW - Check product count and add descriptions',
    priority: 'MEDIUM'
  },

  trailingSlash: {
    name: 'Trailing Slash Variations',
    description: 'URL variations with/without trailing slash',
    action: 'CHECK canonical tags are correct',
    priority: 'LOW',
    detect: (url, allUrls) => {
      const withSlash = url.endsWith('/') ? url : url + '/';
      const withoutSlash = url.endsWith('/') ? url.slice(0, -1) : url;
      return allUrls.some(u => u === withSlash || u === withoutSlash) && u !== url;
    }
  },

  discontinued: {
    name: 'Likely Discontinued Products',
    description: 'Product URLs that may have been deleted',
    action: 'VERIFY in BigCommerce, redirect if deleted',
    priority: 'HIGH',
    detect: (url) => {
      // Products that don't match other patterns
      return url.match(/\/[a-z0-9-]+\/$/) &&
             !url.match(/copy-of|on-sale|bb-\d{2}/i);
    }
  }
};

/**
 * Parse CSV file
 */
function parseCSV(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`ERROR: File not found: ${filePath}`);
    console.log('\nPlease export "Crawled - currently not indexed" from GSC:');
    console.log('1. Go to GSC → Indexing → Pages');
    console.log('2. Click "Crawled - currently not indexed"');
    console.log('3. Click Export → Export all rows');
    console.log(`4. Save as: ${path.basename(filePath)}`);
    console.log(`5. Place in: ${OUTPUT_DIR}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());

  // Skip header row
  const urls = lines.slice(1).map(line => {
    // Handle CSV with quotes
    const match = line.match(/"([^"]+)"/);
    return match ? match[1] : line.split(',')[0];
  }).filter(url => url && url.startsWith('http'));

  return urls;
}

/**
 * Categorize URLs
 */
function categorizeURLs(urls) {
  const results = {
    categorized: {},
    uncategorized: [],
    stats: {
      total: urls.length,
      categorized: 0,
      uncategorized: 0
    }
  };

  // Initialize category buckets
  Object.keys(categories).forEach(key => {
    results.categorized[key] = [];
  });

  // Categorize each URL
  urls.forEach(url => {
    let categorized = false;

    // Check pattern-based categories
    for (const [key, category] of Object.entries(categories)) {
      if (category.pattern && category.pattern.test(url)) {
        results.categorized[key].push(url);
        categorized = true;
        break;
      }
    }

    // Check detection function categories
    if (!categorized) {
      for (const [key, category] of Object.entries(categories)) {
        if (category.detect && category.detect(url, urls)) {
          results.categorized[key].push(url);
          categorized = true;
          break;
        }
      }
    }

    if (!categorized) {
      results.uncategorized.push(url);
    }
  });

  // Update stats
  results.stats.categorized = urls.length - results.uncategorized.length;
  results.stats.uncategorized = results.uncategorized.length;

  return results;
}

/**
 * Generate redirect suggestions for copy-of products
 */
function generateCopyOfRedirects(urls) {
  return urls.map(url => {
    const path = new URL(url).pathname;
    const cleanPath = path.replace(/\/copy-of-/i, '/');

    return {
      oldPath: path,
      newPath: cleanPath,
      type: 'Manual Redirect'
    };
  });
}

/**
 * Generate redirect suggestions for product variations
 */
function generateProductVariationRedirects(urls) {
  return urls.map(url => {
    const path = new URL(url).pathname;
    // Remove sale/expiry suffixes
    const cleanPath = path.replace(/-(on-sale|bb-\d{2}-\d{2}-\d{2,4}|exp-\d{2}-\d{2}-\d{2})/gi, '');

    return {
      oldPath: path,
      newPath: cleanPath,
      type: 'Manual Redirect'
    };
  });
}

/**
 * Generate BigCommerce CSV for redirects
 */
function generateRedirectCSV(redirects, filename) {
  const csv = [
    'Domain,Old Path,Manual URL/Path,Dynamic Target Type,Dynamic Target ID'
  ];

  redirects.forEach(redirect => {
    csv.push(`www.buyorganicsonline.com.au,${redirect.oldPath},${redirect.newPath},,`);
  });

  const filePath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filePath, csv.join('\n'));
  console.log(`✅ Created: ${filename} (${redirects.length} redirects)`);

  return filePath;
}

/**
 * Print analysis report
 */
function printReport(results) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 CRAWLED BUT NOT INDEXED - ANALYSIS REPORT');
  console.log('='.repeat(80));
  console.log(`\nTotal URLs analyzed: ${results.stats.total}`);
  console.log(`Categorized: ${results.stats.categorized} (${(results.stats.categorized/results.stats.total*100).toFixed(1)}%)`);
  console.log(`Uncategorized: ${results.stats.uncategorized} (${(results.stats.uncategorized/results.stats.total*100).toFixed(1)}%)`);

  console.log('\n' + '-'.repeat(80));
  console.log('BREAKDOWN BY CATEGORY:');
  console.log('-'.repeat(80));

  // Sort categories by priority
  const priorityOrder = { HIGH: 1, MEDIUM: 2, LOW: 3 };
  const sortedCategories = Object.entries(categories).sort((a, b) => {
    return priorityOrder[a[1].priority] - priorityOrder[b[1].priority];
  });

  let totalRedirectsNeeded = 0;

  sortedCategories.forEach(([key, category]) => {
    const count = results.categorized[key].length;
    if (count > 0) {
      console.log(`\n${category.name} (${category.priority} PRIORITY)`);
      console.log(`  Count: ${count}`);
      console.log(`  Description: ${category.description}`);
      console.log(`  Action: ${category.action}`);

      if (category.priority === 'HIGH' && category.action.includes('REDIRECT')) {
        totalRedirectsNeeded += count;
      }

      // Show sample URLs (max 5)
      const samples = results.categorized[key].slice(0, 5);
      console.log(`  Samples:`);
      samples.forEach(url => {
        const path = new URL(url).pathname;
        console.log(`    - ${path}`);
      });

      if (count > 5) {
        console.log(`    ... and ${count - 5} more`);
      }
    }
  });

  if (results.uncategorized.length > 0) {
    console.log(`\nUncategorized URLs (${results.uncategorized.length})`);
    console.log(`  Action: Manual review needed`);
    console.log(`  Samples:`);
    results.uncategorized.slice(0, 10).forEach(url => {
      const path = new URL(url).pathname;
      console.log(`    - ${path}`);
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('📋 ACTION SUMMARY:');
  console.log('='.repeat(80));
  console.log(`\n🔴 HIGH PRIORITY: ~${totalRedirectsNeeded} redirects needed`);
  console.log(`🟡 MEDIUM PRIORITY: Review and potentially improve content`);
  console.log(`🟢 LOW PRIORITY: No action needed (Google correctly ignoring)`);

  return totalRedirectsNeeded;
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Analyzing "Crawled - currently not indexed" URLs...\n');

  // Parse CSV
  const urls = parseCSV(INPUT_FILE);
  console.log(`✅ Loaded ${urls.length} URLs from GSC export`);

  // Categorize
  const results = categorizeURLs(urls);

  // Print report
  const redirectsNeeded = printReport(results);

  // Generate redirect CSVs
  console.log('\n' + '='.repeat(80));
  console.log('📝 GENERATING REDIRECT FILES:');
  console.log('='.repeat(80) + '\n');

  const allRedirects = [];

  // Copy-of products
  if (results.categorized.copyOfProducts.length > 0) {
    const redirects = generateCopyOfRedirects(results.categorized.copyOfProducts);
    allRedirects.push(...redirects);
    generateRedirectCSV(redirects, 'batch3-copy-of-redirects.csv');
  }

  // Product variations
  if (results.categorized.productVariations.length > 0) {
    const redirects = generateProductVariationRedirects(results.categorized.productVariations);
    allRedirects.push(...redirects);
    generateRedirectCSV(redirects, 'batch3-variation-redirects.csv');
  }

  // Combined file
  if (allRedirects.length > 0) {
    generateRedirectCSV(allRedirects, 'batch3-all-redirects.csv');
  }

  // Save full analysis
  const analysisPath = path.join(OUTPUT_DIR, 'crawled-not-indexed-analysis.json');
  fs.writeFileSync(analysisPath, JSON.stringify(results, null, 2));
  console.log(`✅ Created: crawled-not-indexed-analysis.json (full data)`);

  // Save uncategorized for manual review
  if (results.uncategorized.length > 0) {
    const uncategorizedPath = path.join(OUTPUT_DIR, 'crawled-not-indexed-uncategorized.txt');
    fs.writeFileSync(uncategorizedPath, results.uncategorized.join('\n'));
    console.log(`✅ Created: crawled-not-indexed-uncategorized.txt (${results.uncategorized.length} URLs for manual review)`);
  }

  // Final summary
  console.log('\n' + '='.repeat(80));
  console.log('✅ ANALYSIS COMPLETE');
  console.log('='.repeat(80));
  console.log(`\nNext steps:`);
  console.log(`1. Review the redirect CSV files above`);
  console.log(`2. Upload batch3-all-redirects.csv to BigCommerce (${allRedirects.length} redirects)`);
  console.log(`3. Manually review uncategorized URLs if any`);
  console.log(`4. Monitor GSC for "Crawled - not indexed" count reduction\n`);
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { categorizeURLs, generateCopyOfRedirects, generateProductVariationRedirects };
