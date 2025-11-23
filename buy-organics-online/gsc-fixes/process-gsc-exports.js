const fs = require('fs');
const path = require('path');

console.log('='.repeat(60));
console.log('GSC Export Processing Tool');
console.log('='.repeat(60));

// Check which export files exist
const files = {
  current404s: 'current-404-list.csv',
  indexedButBlocked: 'indexed-but-blocked.csv',
  soft404: 'soft-404.csv',
  serverError: 'server-error.csv',
  original404s: 'full-404-list.txt'
};

const existingFiles = {};
let foundFiles = 0;

console.log('\nChecking for GSC export files...\n');

Object.keys(files).forEach(key => {
  const filename = files[key];
  if (fs.existsSync(filename)) {
    existingFiles[key] = filename;
    foundFiles++;
    console.log(`✓ Found: ${filename}`);
  } else {
    console.log(`✗ Missing: ${filename}`);
  }
});

console.log(`\nFound ${foundFiles} out of ${Object.keys(files).length} files\n`);

if (foundFiles === 0) {
  console.log('❌ No GSC export files found!');
  console.log('\nPlease export the following from Google Search Console:');
  console.log('1. Not found (404) → Export → Save as "current-404-list.csv"');
  console.log('2. Indexed, though blocked by robots.txt → Export → Save as "indexed-but-blocked.csv"');
  console.log('3. Soft 404 → Export → Save as "soft-404.csv"');
  console.log('4. Server error (5xx) → Export → Save as "server-error.csv"');
  console.log('\nThen run this script again.\n');
  process.exit(0);
}

// Process 404s if we have both old and new lists
if (existingFiles.current404s && existingFiles.original404s) {
  console.log('='.repeat(60));
  console.log('Analyzing 404 Changes');
  console.log('='.repeat(60));

  const current404s = fs.readFileSync(existingFiles.current404s, 'utf8')
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('URL') && !line.startsWith('url'))
    .map(line => {
      // Handle CSV format - extract first column (URL)
      const match = line.match(/^"?([^",]+)"?/);
      return match ? match[1].trim() : line.split(',')[0].trim();
    })
    .filter(url => url.startsWith('http'));

  const original404s = fs.readFileSync(existingFiles.original404s, 'utf8')
    .split('\n')
    .filter(u => u.trim());

  console.log(`\nOriginal 404s: ${original404s.length}`);
  console.log(`Current 404s: ${current404s.length}`);
  console.log(`Difference: ${current404s.length - original404s.length > 0 ? '+' : ''}${current404s.length - original404s.length}`);

  // Find new 404s
  const new404s = current404s.filter(url => !original404s.includes(url));

  if (new404s.length > 0) {
    console.log(`\n🆕 Found ${new404s.length} NEW 404 errors:\n`);
    fs.writeFileSync('new-404s.txt', new404s.join('\n'));
    console.log('Saved to: new-404s.txt\n');

    new404s.slice(0, 10).forEach(url => console.log(`  - ${url}`));
    if (new404s.length > 10) {
      console.log(`  ... and ${new404s.length - 10} more`);
    }
  } else {
    console.log('\n✓ No new 404s found (all are in original list)');
  }

  // Find fixed 404s
  const fixed404s = original404s.filter(url => !current404s.some(currentUrl => currentUrl.includes(url)));

  if (fixed404s.length > 0) {
    console.log(`\n✅ Fixed ${fixed404s.length} 404s (no longer appearing in GSC):\n`);
    fs.writeFileSync('fixed-404s.txt', fixed404s.join('\n'));
    console.log('Saved to: fixed-404s.txt\n');

    fixed404s.slice(0, 10).forEach(url => console.log(`  - ${url}`));
    if (fixed404s.length > 10) {
      console.log(`  ... and ${fixed404s.length - 10} more`);
    }
  }
}

// Process indexed but blocked pages
if (existingFiles.indexedButBlocked) {
  console.log('\n' + '='.repeat(60));
  console.log('Analyzing Indexed but Blocked Pages');
  console.log('='.repeat(60));

  const indexedButBlocked = fs.readFileSync(existingFiles.indexedButBlocked, 'utf8')
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('URL') && !line.startsWith('url'))
    .map(line => {
      const match = line.match(/^"?([^",]+)"?/);
      return match ? match[1].trim() : line.split(',')[0].trim();
    })
    .filter(url => url.startsWith('http'));

  console.log(`\nTotal: ${indexedButBlocked.length} pages`);

  // Categorize
  const categories = {
    search: [],
    account: [],
    checkout: [],
    brands: [],
    products: [],
    api: [],
    other: []
  };

  indexedButBlocked.forEach(url => {
    if (url.includes('/search.php')) categories.search.push(url);
    else if (url.includes('/account') || url.includes('/login')) categories.account.push(url);
    else if (url.includes('/checkout') || url.includes('/cart')) categories.checkout.push(url);
    else if (url.includes('/brands/')) categories.brands.push(url);
    else if (url.includes('/api/')) categories.api.push(url);
    else if (url.match(/\/[^\/]+-[^\/]+-[^\/]+\//)) categories.products.push(url);
    else categories.other.push(url);
  });

  console.log('\nBreakdown:');
  console.log(`  Search pages: ${categories.search.length}`);
  console.log(`  Account pages: ${categories.account.length}`);
  console.log(`  Checkout/Cart: ${categories.checkout.length}`);
  console.log(`  Brand pages: ${categories.brands.length}`);
  console.log(`  Product pages: ${categories.products.length}`);
  console.log(`  API endpoints: ${categories.api.length}`);
  console.log(`  Other: ${categories.other.length}`);

  // Save categorized files
  Object.keys(categories).forEach(cat => {
    if (categories[cat].length > 0) {
      fs.writeFileSync(`blocked-${cat}.txt`, categories[cat].join('\n'));
      console.log(`\n✓ Saved ${categories[cat].length} ${cat} URLs to: blocked-${cat}.txt`);
    }
  });

  // Create removal request list for GSC
  console.log('\n📝 Creating URL removal request list...');
  fs.writeFileSync('urls-to-remove-from-google.txt', indexedButBlocked.join('\n'));
  console.log('✓ Saved to: urls-to-remove-from-google.txt');
  console.log('\nTo remove these from Google:');
  console.log('1. Go to GSC → Removals → New Request');
  console.log('2. Upload the URLs from urls-to-remove-from-google.txt');
  console.log('3. URLs will be removed within 1-2 days');
}

// Process Soft 404
if (existingFiles.soft404) {
  console.log('\n' + '='.repeat(60));
  console.log('Soft 404 Analysis');
  console.log('='.repeat(60));

  const soft404 = fs.readFileSync(existingFiles.soft404, 'utf8).trim();
  console.log(`\nURL: ${soft404}`);
  console.log('\nAction needed:');
  console.log('1. Visit this URL in your browser');
  console.log('2. Check if page has content or shows "not found" message');
  console.log('3. Fix: Either add content OR change to return proper 404 status code');
}

// Process Server Error
if (existingFiles.serverError) {
  console.log('\n' + '='.repeat(60));
  console.log('Server Error (5xx) Analysis');
  console.log('='.repeat(60));

  const serverError = fs.readFileSync(existingFiles.serverError, 'utf8').trim();
  console.log(`\nURL: ${serverError}`);
  console.log('\nAction needed:');
  console.log('1. Test this URL directly: curl -I "' + serverError + '"');
  console.log('2. Check server logs for errors at this URL');
  console.log('3. Common causes: Database timeout, script error, resource limit');
  console.log('4. Fix the underlying error');
}

console.log('\n' + '='.repeat(60));
console.log('Analysis Complete!');
console.log('='.repeat(60));
console.log('\nNext steps:');
console.log('1. Review the generated .txt files');
console.log('2. Run fix-all-404s.js to create updated redirect CSV');
console.log('3. Submit removal requests for blocked-but-indexed pages');
console.log('4. Fix soft 404 and server error');
console.log('');
