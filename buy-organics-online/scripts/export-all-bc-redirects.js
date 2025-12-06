const https = require('https');
const fs = require('fs');

const STORE_HASH = process.env.BOO_BC_STORE_HASH;
const ACCESS_TOKEN = process.env.BOO_BC_ACCESS_TOKEN;

if (!STORE_HASH || !ACCESS_TOKEN) {
  console.error('❌ Missing BigCommerce credentials');
  console.error('Set BOO_BC_STORE_HASH and BOO_BC_ACCESS_TOKEN environment variables');
  process.exit(1);
}

async function getRedirects(page = 1, limit = 250) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.bigcommerce.com',
      path: `/stores/${STORE_HASH}/v3/storefront/redirects?limit=${limit}&page=${page}`,
      method: 'GET',
      headers: {
        'X-Auth-Token': ACCESS_TOKEN,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`API Error: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function getTargetInfo(redirect) {
  if (!redirect.to) return { type: 'unknown', destination: '', entity_id: '' };

  const to = redirect.to;

  if (typeof to === 'string') {
    return { type: 'manual', destination: to, entity_id: '' };
  }

  if (to.type === 'product' && to.entity_id) {
    return { type: 'product', destination: `Product ID: ${to.entity_id}`, entity_id: to.entity_id };
  }

  if (to.type === 'category' && to.entity_id) {
    return { type: 'category', destination: `Category ID: ${to.entity_id}`, entity_id: to.entity_id };
  }

  if (to.type === 'brand' && to.entity_id) {
    return { type: 'brand', destination: `Brand ID: ${to.entity_id}`, entity_id: to.entity_id };
  }

  if (to.type === 'page' && to.entity_id) {
    return { type: 'page', destination: `Page ID: ${to.entity_id}`, entity_id: to.entity_id };
  }

  if (to.url) {
    return { type: 'url', destination: to.url, entity_id: '' };
  }

  return { type: to.type || 'unknown', destination: JSON.stringify(to), entity_id: to.entity_id || '' };
}

function categorizeRedirect(fromPath) {
  const path = fromPath.toLowerCase();

  // Query parameters
  if (path.includes('?ctk=') || path.includes('?ref=') || path.includes('?fullsite=') ||
      path.includes('?revpage=') || path.includes('sfdr_')) {
    return 'query-parameter';
  }

  // Sale/expiry dates
  if (path.includes('-on-sale') || path.includes('-bb-') || path.includes('-bbd-')) {
    return 'sale-expiry';
  }

  // Copy/duplicate pages
  if (path.includes('copy-of-') || path.includes('-copy-')) {
    return 'copy-duplicate';
  }

  // Supplier prefixes
  if (path.match(/\/(hlb|kik|kad|uhp|un)-/i)) {
    return 'supplier-prefix';
  }

  // Brand pages
  if (path.includes('/brands/')) {
    return 'brand-page';
  }

  // Category pages
  if (path.includes('/categories') || path.includes('category')) {
    return 'category-page';
  }

  // Old date patterns (products with years in URL)
  if (path.match(/-(2019|2020|2021|2022)/)) {
    return 'dated-url';
  }

  return 'standard-product';
}

async function exportAllRedirects() {
  try {
    console.log('🚀 Starting BigCommerce redirect export...\n');
    console.log(`Store: ${STORE_HASH}`);
    console.log(`Timestamp: ${new Date().toISOString()}\n`);

    let allRedirects = [];
    let page = 1;
    let hasMore = true;
    let totalPages = 0;

    // Fetch all redirects
    while (hasMore) {
      const response = await getRedirects(page);
      const redirects = response.data || [];
      allRedirects = allRedirects.concat(redirects);

      if (response.meta && response.meta.pagination) {
        const { current_page, total_pages, total } = response.meta.pagination;
        totalPages = total_pages;

        process.stdout.write(`\r📥 Fetching: Page ${current_page}/${total_pages} (${allRedirects.length}/${total} redirects)`);

        hasMore = current_page < total_pages;
        page++;
      } else {
        hasMore = false;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log('\n\n✅ Fetch complete!\n');
    console.log(`Total redirects fetched: ${allRedirects.length}`);

    // Categorize and prepare for CSV
    console.log('📊 Categorizing redirects...\n');

    const categorized = allRedirects.map(redirect => {
      const target = getTargetInfo(redirect);
      const category = categorizeRedirect(redirect.from_path);

      return {
        id: redirect.id,
        from_path: redirect.from_path,
        target_type: target.type,
        target_destination: target.destination,
        target_entity_id: target.entity_id,
        category: category,
        site_id: redirect.site_id
      };
    });

    // Generate category statistics
    const stats = {};
    categorized.forEach(r => {
      stats[r.category] = (stats[r.category] || 0) + 1;
    });

    console.log('📈 Category Breakdown:');
    Object.entries(stats).sort((a, b) => b[1] - a[1]).forEach(([category, count]) => {
      const percentage = ((count / allRedirects.length) * 100).toFixed(2);
      console.log(`  ${category.padEnd(20)} ${String(count).padStart(6)} (${percentage}%)`);
    });

    // Write to CSV
    console.log('\n💾 Writing to CSV...');

    const csvHeader = 'id,from_path,target_type,target_destination,target_entity_id,category,site_id\n';
    const csvRows = categorized.map(r =>
      `${escapeCSV(r.id)},${escapeCSV(r.from_path)},${escapeCSV(r.target_type)},${escapeCSV(r.target_destination)},${escapeCSV(r.target_entity_id)},${escapeCSV(r.category)},${escapeCSV(r.site_id)}`
    ).join('\n');

    const outputFile = 'all-bc-redirects-export.csv';
    fs.writeFileSync(outputFile, csvHeader + csvRows);

    console.log(`✅ Exported to: ${outputFile}`);
    console.log(`   File size: ${(fs.statSync(outputFile).size / 1024).toFixed(2)} KB`);

    // Write JSON for detailed analysis
    const jsonFile = 'all-bc-redirects-export.json';
    fs.writeFileSync(jsonFile, JSON.stringify({
      exported_at: new Date().toISOString(),
      total_count: allRedirects.length,
      categories: stats,
      redirects: categorized
    }, null, 2));

    console.log(`✅ Exported to: ${jsonFile}`);
    console.log(`   File size: ${(fs.statSync(jsonFile).size / 1024).toFixed(2)} KB`);

    // Generate summary report
    console.log('\n' + '='.repeat(60));
    console.log('📋 EXPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Redirects:        ${allRedirects.length} / 25,000`);
    console.log(`Remaining Capacity:     ${25000 - allRedirects.length}`);
    console.log(`Usage:                  ${((allRedirects.length / 25000) * 100).toFixed(2)}%`);
    console.log(`\nTop Cleanup Opportunities:`);

    const cleanupCandidates = [
      { name: 'Query Parameters', count: stats['query-parameter'] || 0, priority: 'High' },
      { name: 'Sale/Expiry URLs', count: stats['sale-expiry'] || 0, priority: 'High' },
      { name: 'Copy/Duplicates', count: stats['copy-duplicate'] || 0, priority: 'High' },
      { name: 'Dated URLs', count: stats['dated-url'] || 0, priority: 'Medium' }
    ];

    cleanupCandidates.forEach(c => {
      if (c.count > 0) {
        console.log(`  [${c.priority}] ${c.name.padEnd(20)} ${c.count} redirects`);
      }
    });

    const estimatedCleanup = cleanupCandidates.reduce((sum, c) => sum + c.count, 0);
    console.log(`\nEstimated Quick Cleanup: ${estimatedCleanup} redirects`);
    console.log(`Would bring total down to: ${allRedirects.length - estimatedCleanup} (${((estimatedCleanup / allRedirects.length) * 100).toFixed(2)}% reduction)`);

    console.log('\n✅ Export complete!\n');

  } catch (error) {
    console.error('\n❌ Export failed:', error.message);
    process.exit(1);
  }
}

exportAllRedirects();
