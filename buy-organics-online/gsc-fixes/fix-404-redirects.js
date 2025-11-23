const https = require('https');
const fs = require('fs');

// 404 URLs from GSC
const urls404 = [
  'https://www.buyorganicsonline.com.au/dr-bronner-pure-castile-liquid-soap-cherry-blossom',
  'https://www.buyorganicsonline.com.au/people4ocean-stick-it-coloured-zinc-spf-50-egyptian-blue-25g/',
  'https://www.buyorganicsonline.com.au/multi-amber-necklace-33-cm-by-amber-love/',
  'https://www.buyorganicsonline.com.au/mingle-livs-fave-salted-caramel-all-natural-sweet-topper-130g/',
  'https://www.buyorganicsonline.com.au/brands/A\'kin.html',
  'https://www.buyorganicsonline.com.au/brands/A\'kin-pureBaby.html',
  'https://www.buyorganicsonline.com.au/amber-love-adults-necklace-cognac-love-46cm/',
  'https://www.buyorganicsonline.com.au/radico-colour-me-organic-hair-colour-powder-brown-100g/',
  'https://www.buyorganicsonline.com.au/blue-dinosaur-vegan-protein-bar-pb-caramel-choc-12-x-45g/',
  'https://www.buyorganicsonline.com.au/carob-farm-carob-koala-salted-caramel-50-x-15g/',
  'https://www.buyorganicsonline.com.au/radico-colour-me-organic-hair-colour-powder-soft-black-100g/',
  'https://www.buyorganicsonline.com.au/martin-pleasance-vital-all-in-one-greens-1kg/',
  'https://www.buyorganicsonline.com.au/loving-earth-maca-powder-500g/',
  'https://www.buyorganicsonline.com.au/dr-organic-tea-tree-nail-solution-10ml/',
  'https://www.buyorganicsonline.com.au/health-guru-cauliflower-puffs-bangkok-sriracha-6-x-56g/',
  'https://www.buyorganicsonline.com.au/amber-moon-love-33cm-by-amber-love/',
  'https://www.buyorganicsonline.com.au/naturally-good-peanut-mylk-partyz-55-less-sugar-10-x-45g/',
  'https://www.buyorganicsonline.com.au/amber-love-adults-necklace-100-baltic-amber-mixed-46cm/',
  'https://www.buyorganicsonline.com.au/switch-nutrition-plant-protein-bar-cookies-and-cream-12-x-60g/',
  'https://www.buyorganicsonline.com.au/mama-nose-baby-bamboo-wipes-eco-friendly-baby-water-wipes-60-wipes/',
  'https://www.buyorganicsonline.com.au/grass-roots-organic-hemp-hearts-hulled-hemp-seeds-500g/',
  'https://www.buyorganicsonline.com.au/dr-organic-rose-otto-cleanser-150ml/',
  'https://www.buyorganicsonline.com.au/health-guru-cauliflower-puffs-sea-salt-6-x-56g/',
  'https://www.buyorganicsonline.com.au/lotus-sesame-seeds-hulled-organic-200-on-sale-bb-09-09-24/',
  'https://www.buyorganicsonline.com.au/health-guru-cauliflower-puffs-sea-salt-12x56g/',
  'https://www.buyorganicsonline.com.au/ora-health-curcumin-biocomplex-90-caps/',
  'https://www.buyorganicsonline.com.au/great-aussie-wipes-tradie-extra-large-textured-wipes-80pk/',
  'https://www.buyorganicsonline.com.au/amazing-oils-magnesium-flex-lotion-with-msm-turmeric-black-pepper-125ml/',
  'https://www.buyorganicsonline.com.au/ecoegg-laundry-egg-refill-pellets-50-washes-tropical-breeze/',
  'https://www.buyorganicsonline.com.au/great-aussie-wipes-grease-grime-jumbo-heavy-duty-wipes-60pk/',
  'https://www.buyorganicsonline.com.au/great-aussie-wipes-bbq-x-large-wipes-10pk/',
  'https://www.buyorganicsonline.com.au/switch-nutrition-plant-protein-bar-choc-rocky-road-12-x-60g/',
  'https://www.buyorganicsonline.com.au/great-aussie-wipes-bbq-x-large-wipes-30pk/',
  'https://www.buyorganicsonline.com.au/redmond-earthpaste-toothpaste-with-silver-spearmint-charcoal-113g/',
  'https://www.buyorganicsonline.com.au/wild-herbal-body-wash-herbal-500ml/',
  'https://www.buyorganicsonline.com.au/keto-naturals-cookies-buttery-coconut-8-x-64g/',
  'https://www.buyorganicsonline.com.au/switch-nutrition-plant-protein-bar-choc-peanut-butter-12-x-60g/',
  'https://www.buyorganicsonline.com.au/ecoegg-washing-machine-detox-tablets-6pk/',
  'https://www.buyorganicsonline.com.au/udos-choice-udos-3-6-9-oil-blend-941ml/',
  'https://www.buyorganicsonline.com.au/great-aussie-wipes-hand-face-large-wipes-40pk/',
  'https://www.buyorganicsonline.com.au/switch-nutrition-plant-protein-bar-choc-fudge-brownie-12-x-60g/',
  'https://www.buyorganicsonline.com.au/great-aussie-wipes-vinegar-x-large-natural-cleaning-wipes-50pk/',
  'https://www.buyorganicsonline.com.au/miessence-balancing-moisturiser-50ml/',
  'https://www.buyorganicsonline.com.au/loving-earth-maqui-powder-150g/',
  'https://www.buyorganicsonline.com.au/flordis-prospan-menthol-chesty-cough-relief-200ml/',
  'https://www.buyorganicsonline.com.au/ecoegg-laundry-egg-refill-pellets-50-washes-fresh-white-lights/'
];

// Extract product slug and search term from URL
function extractSearchTerm(url) {
  const path = url.replace('https://www.buyorganicsonline.com.au/', '').replace(/\/$/, '');

  // Skip API endpoints and special files
  if (path.includes('/api/') || path.includes('.well-known') || path.includes('/your/api/')) {
    return null;
  }

  // Handle brand pages
  if (path.includes('/brands/')) {
    return { type: 'brand', slug: path, searchTerm: path.replace('/brands/', '').replace('.html', '') };
  }

  // Clean up the product slug for search
  const searchTerm = path
    .replace(/-/g, ' ')
    .replace(/\//g, '')
    .replace(/\d+g$/, '') // Remove trailing size
    .replace(/\d+ml$/, '')
    .replace(/\d+pk$/, '')
    .replace(/\d+x\d+g$/, '')
    .trim();

  return { type: 'product', slug: path, searchTerm };
}

// Search for product on site
function searchProduct(searchTerm) {
  return new Promise((resolve) => {
    const encodedTerm = encodeURIComponent(searchTerm);
    const options = {
      hostname: 'www.buyorganicsonline.com.au',
      path: `/search.php?search_query=${encodedTerm}`,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // Extract product links from search results - look for actual product cards
        const productLinkRegex = /<a\s+href="(https:\/\/www\.buyorganicsonline\.com\.au\/[^"]+)"\s*>/g;
        let match;
        const links = [];

        while ((match = productLinkRegex.exec(data)) !== null) {
          const url = match[1];
          // Skip navigation, category, search, and other non-product URLs
          if (!url.includes('search.php') &&
              !url.includes('/family/') &&
              !url.includes('/pantry/') &&
              !url.includes('/drinks/') &&
              !url.includes('/superfoods/') &&
              !url.includes('/ingredients/') &&
              !url.includes('/brands/') &&
              !url.includes('#') &&
              url.length > 40) { // Product URLs are typically longer
            links.push(url);
          }
        }

        if (links.length > 0) {
          // Return the first actual product link
          const cleanUrl = links[0].split('?')[0];
          resolve(cleanUrl);
        } else {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.setTimeout(10000, () => {
      req.destroy();
      resolve(null);
    });
    req.end();
  });
}

// Main function
async function findRedirects() {
  const redirects = [];
  const notFound = [];
  const apiEndpoints = [];

  console.log('Searching for current product URLs...\n');

  for (const url of urls404) {
    const info = extractSearchTerm(url);

    if (!info) {
      apiEndpoints.push(url);
      continue;
    }

    console.log(`Checking: ${info.slug}`);

    const newUrl = await searchProduct(info.searchTerm);

    if (newUrl && newUrl !== url) {
      redirects.push({
        from: url.replace('https://www.buyorganicsonline.com.au', ''),
        to: newUrl.replace('https://www.buyorganicsonline.com.au', ''),
        status: 'Found'
      });
      console.log(`  ✓ Found: ${newUrl}`);
    } else {
      notFound.push(url);
      console.log(`  ✗ Not found or discontinued`);
    }

    // Delay to avoid overwhelming the server
    await new Promise(r => setTimeout(r, 500));
  }

  // Generate report
  console.log('\n\n========== REDIRECT REPORT ==========\n');
  console.log(`Products Found: ${redirects.length}`);
  console.log(`Products Not Found: ${notFound.length}`);
  console.log(`API Endpoints: ${apiEndpoints.length}`);

  // Save redirect CSV for BigCommerce
  const csvRows = ['From Path,To Path'];
  redirects.forEach(r => {
    csvRows.push(`"${r.from}","${r.to}"`);
  });

  fs.writeFileSync('redirects.csv', csvRows.join('\n'));
  console.log('\n✓ Redirects saved to: redirects.csv');

  // Save not found list
  fs.writeFileSync('not-found.txt', notFound.join('\n'));
  console.log('✓ Not found URLs saved to: not-found.txt');

  // Save API endpoints to block
  fs.writeFileSync('api-endpoints-to-block.txt', apiEndpoints.join('\n'));
  console.log('✓ API endpoints saved to: api-endpoints-to-block.txt');

  console.log('\n========== SUMMARY ==========');
  console.log(`\nFound ${redirects.length} products that can be redirected.`);
  console.log(`\nNext steps:`);
  console.log(`1. Upload redirects.csv to BigCommerce (Settings > URL Redirects)`);
  console.log(`2. Update robots.txt to block API endpoints`);
  console.log(`3. Remove not-found URLs from GSC or mark as fixed`);
}

findRedirects().catch(console.error);
