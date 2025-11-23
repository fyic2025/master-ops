const fs = require('fs');

// Read all the categorized files
const cleanProducts = fs.readFileSync('clean-products-missing.txt', 'utf8').split('\n').filter(u => u.trim());
const categoryPages = fs.readFileSync('category-pages-404.txt', 'utf8').split('\n').filter(u => u.trim());
const brandPages = fs.readFileSync('brand-pages-404.txt', 'utf8').split('\n').filter(u => u.trim());

console.log(`Creating comprehensive redirect solution...`);
console.log(`- ${cleanProducts.length} missing product URLs`);
console.log(`- ${categoryPages.length} category pages`);
console.log(`- ${brandPages.length} brand pages\n`);

const redirects = [];

// Read existing redirects from all-404-redirects.csv
const existingCsv = fs.readFileSync('all-404-redirects.csv', 'utf8').split('\n');
existingCsv.slice(1).forEach(line => {
  if (line.trim()) {
    redirects.push(line);
  }
});

console.log(`Found ${redirects.length} existing redirects from all-404-redirects.csv`);

// Helper function to extract product keywords from URL
function getSearchTerms(path) {
  // Remove leading/trailing slashes
  let clean = path.replace(/^\/|\/$/g, '');

  // Remove common patterns
  clean = clean
    .replace(/-on-sale.*$/, '')  // Remove on-sale suffixes
    .replace(/-\d+g$/i, '')       // Remove weight suffixes like -100g
    .replace(/-\d+ml$/i, '')      // Remove volume suffixes like -250ml
    .replace(/-\d+x\d+g$/i, '')   // Remove pack sizes like -12x45g
    .replace(/-x-\d+$/i, '');     // Remove x-20 style suffixes

  // Convert to search terms (replace dashes with plus signs)
  return clean.replace(/-/g, '+');
}

// 1. Add missing products - redirect to search
cleanProducts.forEach(path => {
  const searchTerms = getSearchTerms(path);
  redirects.push(`www.buyorganicsonline.com.au,${path},/search.php?search_query=${searchTerms},,`);
});

// 2. Category pages - redirect to home (old navigation system)
categoryPages.forEach(url => {
  const urlObj = new URL(url);
  const path = urlObj.pathname + urlObj.search;
  redirects.push(`www.buyorganicsonline.com.au,${path},/,,`);
});

// 3. Brand pages - redirect to brands page
brandPages.forEach(url => {
  const urlObj = new URL(url);
  const path = urlObj.pathname;

  // Try to extract brand name from URL
  const brandMatch = path.match(/\/brands\/([^\/]+)/);
  if (brandMatch) {
    const brandName = decodeURIComponent(brandMatch[1]).replace(/\.html$/, '').replace(/-/g, '+');
    redirects.push(`www.buyorganicsonline.com.au,${path},/search.php?search_query=${brandName},,`);
  } else {
    redirects.push(`www.buyorganicsonline.com.au,${path},/brands/,,`);
  }
});

// Generate final CSV
const csvRows = ['Domain,Old Path,Manual URL/Path,Dynamic Target Type,Dynamic Target ID'];
redirects.forEach(r => csvRows.push(r));

fs.writeFileSync('complete-404-redirects.csv', csvRows.join('\n'));

console.log(`\n✓ Created ${redirects.length} total redirects in: complete-404-redirects.csv`);
console.log(`\nBreakdown:`);
console.log(`- 65 existing redirects (fullSite, expired sales, copy-of)`);
console.log(`- ${cleanProducts.length} missing products → search results`);
console.log(`- ${categoryPages.length} old category pages → homepage`);
console.log(`- ${brandPages.length} brand pages → search/brands page`);
console.log(`\nTotal: ${redirects.length} redirects`);
