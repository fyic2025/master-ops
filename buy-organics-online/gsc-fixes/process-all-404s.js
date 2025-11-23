const fs = require('fs');

// Read the full 404 list
const urls = fs.readFileSync('full-404-list.txt', 'utf8').split('\n').filter(u => u.trim());

console.log(`Processing ${urls.length} 404 URLs from GSC...\n`);

const categories = {
  trackingParams: [],      // URLs with tracking parameters
  rssFeeds: [],           // RSS feed URLs
  categoryPages: [],      // Category/navigation pages
  copyOfPages: [],        // "copy-of-" pages
  expiredSales: [],       // On-sale items with expired dates
  fullSiteParam: [],      // URLs with ?fullSite=1
  cleanProducts: [],      // Clean product URLs
  apiPaths: [],           // API endpoints
  brands: []              // Brand pages
};

urls.forEach(url => {
  const urlObj = new URL(url);
  const path = urlObj.pathname;
  const params = urlObj.searchParams;

  // Categorize
  if (url.includes('/rss.php')) {
    categories.rssFeeds.push(url);
  } else if (url.includes('/categories.php')) {
    categories.categoryPages.push(url);
  } else if (path.includes('/copy-of-')) {
    categories.copyOfPages.push(path);
  } else if (path.includes('/brands/')) {
    categories.brands.push(url);
  } else if (path.includes('/api/') || path.includes('/your/api/')) {
    categories.apiPaths.push(url);
  } else if (params.has('sfdr_ptcid') || params.has('sfdr_hash') || params.has('sku')) {
    // Has tracking parameters - redirect to clean URL
    const cleanUrl = `${urlObj.origin}${path}`;
    categories.trackingParams.push({ from: path, to: path });
  } else if (params.has('fullSite')) {
    const cleanUrl = `${urlObj.origin}${path}`;
    categories.fullSiteParam.push({ from: url.replace(urlObj.origin, ''), to: path });
  } else if (path.match(/-on-sale-bb-\d+-\d+-\d+/)) {
    // Expired sale items
    const cleanPath = path.replace(/-on-sale-bb-\d+-\d+-\d+/, '');
    categories.expiredSales.push({ from: path, to: cleanPath });
  } else {
    // Clean product URL - probably genuinely missing
    categories.cleanProducts.push(path);
  }
});

// Generate statistics
console.log('========== CATEGORIZATION RESULTS ==========\n');
console.log(`URLs with Tracking Parameters: ${categories.trackingParams.length}`);
console.log(`RSS Feed URLs: ${categories.rssFeeds.length}`);
console.log(`Category Pages: ${categories.categoryPages.length}`);
console.log(`"Copy Of" Pages: ${categories.copyOfPages.length}`);
console.log(`Expired Sale Items: ${categories.expiredSales.length}`);
console.log(`URLs with ?fullSite=1: ${categories.fullSiteParam.length}`);
console.log(`Brand Pages: ${categories.brands.length}`);
console.log(`API Paths: ${categories.apiPaths.length}`);
console.log(`Clean Product URLs (genuinely missing): ${categories.cleanProducts.length}`);
console.log(`\nTotal: ${urls.length}`);

// Create redirect CSV for BigCommerce
const redirects = [];

// 1. Remove tracking parameters (redirect to clean URL)
categories.trackingParams.forEach(item => {
  // These are duplicates - they should redirect to themselves without params
  // BigCommerce will handle this automatically, so we skip them
});

// 2. Remove fullSite parameter
categories.fullSiteParam.forEach(item => {
  redirects.push({
    from: item.from,
    to: item.to,
    type: '301'
  });
});

// 3. Expired sale items redirect to non-sale version
categories.expiredSales.forEach(item => {
  redirects.push({
    from: item.from,
    to: item.to,
    type: '301'
  });
});

// 4. RSS feeds - block in robots.txt
// 5. Category pages - these might need manual review
// 6. Copy-of pages - redirect to original
categories.copyOfPages.forEach(path => {
  const cleanPath = path.replace('/copy-of-', '/');
  redirects.push({
    from: path,
    to: cleanPath,
    type: '301'
  });
});

// Generate BigCommerce CSV
const csvRows = ['Domain,Old Path,Manual URL/Path,Dynamic Target Type,Dynamic Target ID'];
redirects.forEach(r => {
  csvRows.push(`www.buyorganicsonline.com.au,${r.from},${r.to},,`);
});

fs.writeFileSync('all-404-redirects.csv', csvRows.join('\n'));
console.log(`\n✓ Created ${redirects.length} redirects in: all-404-redirects.csv`);

// Save problematic URLs for manual review
fs.writeFileSync('rss-feeds-to-block.txt', categories.rssFeeds.join('\n'));
fs.writeFileSync('category-pages-404.txt', categories.categoryPages.join('\n'));
fs.writeFileSync('clean-products-missing.txt', categories.cleanProducts.join('\n'));
fs.writeFileSync('api-paths-to-block.txt', categories.apiPaths.join('\n'));
fs.writeFileSync('brand-pages-404.txt', categories.brands.join('\n'));

console.log('\n========== FILES CREATED ==========');
console.log('1. all-404-redirects.csv - Upload to BigCommerce');
console.log('2. rss-feeds-to-block.txt - Block in robots.txt');
console.log('3. category-pages-404.txt - Manual review needed');
console.log('4. clean-products-missing.txt - Genuinely missing products');
console.log('5. api-paths-to-block.txt - Block in robots.txt');
console.log('6. brand-pages-404.txt - Fix or redirect');

console.log('\n========== RECOMMENDATIONS ==========');
console.log('1. Upload all-404-redirects.csv to BigCommerce');
console.log('2. Add to robots.txt:');
console.log('   Disallow: /rss.php');
console.log('   Disallow: /api/');
console.log('   Disallow: /your/api/');
console.log('3. Review category-pages-404.txt - these may need fixing');
console.log('4. Review clean-products-missing.txt for genuine 404s');
console.log('5. Note: URLs with tracking parameters will auto-redirect to clean URLs');
