const https = require('https');
const fs = require('fs');

// BigCommerce API Credentials
const STORE_HASH = 's-hhhi';  // Extracted from CDN URLs
const ACCESS_TOKEN = '53109ca1d454eb5b4db3ee0914ae51f82dd99f36328f66bb1872b33611df8779';
const CLIENT_ID = 'kwdwl551b9w1u0nmyg4rwhr1up086ms';

// 404 URLs from GSC (excluding API endpoints and special files)
const PRODUCT_404_URLS = [
  '/dr-bronner-pure-castile-liquid-soap-cherry-blossom',
  '/people4ocean-stick-it-coloured-zinc-spf-50-egyptian-blue-25g/',
  '/multi-amber-necklace-33-cm-by-amber-love/',
  '/mingle-livs-fave-salted-caramel-all-natural-sweet-topper-130g/',
  '/amber-love-adults-necklace-cognac-love-46cm/',
  '/radico-colour-me-organic-hair-colour-powder-brown-100g/',
  '/blue-dinosaur-vegan-protein-bar-pb-caramel-choc-12-x-45g/',
  '/carob-farm-carob-koala-salted-caramel-50-x-15g/',
  '/radico-colour-me-organic-hair-colour-powder-soft-black-100g/',
  '/martin-pleasance-vital-all-in-one-greens-1kg/',
  '/loving-earth-maca-powder-500g/',
  '/dr-organic-tea-tree-nail-solution-10ml/',
  '/health-guru-cauliflower-puffs-bangkok-sriracha-6-x-56g/',
  '/amber-moon-love-33cm-by-amber-love/',
  '/naturally-good-peanut-mylk-partyz-55-less-sugar-10-x-45g/',
  '/amber-love-adults-necklace-100-baltic-amber-mixed-46cm/',
  '/switch-nutrition-plant-protein-bar-cookies-and-cream-12-x-60g/',
  '/mama-nose-baby-bamboo-wipes-eco-friendly-baby-water-wipes-60-wipes/',
  '/grass-roots-organic-hemp-hearts-hulled-hemp-seeds-500g/',
  '/dr-organic-rose-otto-cleanser-150ml/',
  '/health-guru-cauliflower-puffs-sea-salt-6-x-56g/',
  '/lotus-sesame-seeds-hulled-organic-200-on-sale-bb-09-09-24/',
  '/health-guru-cauliflower-puffs-sea-salt-12x56g/',
  '/ora-health-curcumin-biocomplex-90-caps/',
  '/great-aussie-wipes-tradie-extra-large-textured-wipes-80pk/',
  '/amazing-oils-magnesium-flex-lotion-with-msm-turmeric-black-pepper-125ml/',
  '/ecoegg-laundry-egg-refill-pellets-50-washes-tropical-breeze/',
  '/great-aussie-wipes-grease-grime-jumbo-heavy-duty-wipes-60pk/',
  '/great-aussie-wipes-bbq-x-large-wipes-10pk/',
  '/switch-nutrition-plant-protein-bar-choc-rocky-road-12-x-60g/',
  '/great-aussie-wipes-bbq-x-large-wipes-30pk/',
  '/redmond-earthpaste-toothpaste-with-silver-spearmint-charcoal-113g/',
  '/wild-herbal-body-wash-herbal-500ml/',
  '/keto-naturals-cookies-buttery-coconut-8-x-64g/',
  '/switch-nutrition-plant-protein-bar-choc-peanut-butter-12-x-60g/',
  '/ecoegg-washing-machine-detox-tablets-6pk/',
  '/udos-choice-udos-3-6-9-oil-blend-941ml/',
  '/great-aussie-wipes-hand-face-large-wipes-40pk/',
  '/switch-nutrition-plant-protein-bar-choc-fudge-brownie-12-x-60g/',
  '/great-aussie-wipes-vinegar-x-large-natural-cleaning-wipes-50pk/',
  '/miessence-balancing-moisturiser-50ml/',
  '/loving-earth-maqui-powder-150g/',
  '/flordis-prospan-menthol-chesty-cough-relief-200ml/',
  '/ecoegg-laundry-egg-refill-pellets-50-washes-fresh-white-lights/'
];

// Helper to make API requests
function apiRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.bigcommerce.com',
      path: `/stores/${STORE_HASH}${path}`,
      method: method,
      headers: {
        'X-Auth-Token': ACCESS_TOKEN,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(responseData));
          } catch (e) {
            resolve(responseData);
          }
        } else {
          reject(new Error(`API Error ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Extract product family name from URL
function extractProductFamily(url) {
  const slug = url.replace(/^\//, '').replace(/\/$/, '');

  // Remove size/quantity suffixes
  const cleaned = slug
    .replace(/-\d+g$/, '')
    .replace(/-\d+ml$/, '')
    .replace(/-\d+pk$/, '')
    .replace(/-\d+x\d+g$/, '')
    .replace(/-\d+caps?$/, '')
    .replace(/-\d+-x-\d+g$/, '')
    .replace(/-\d+l$/, '')
    .replace(/-on-sale-bb-\d+-\d+-\d+$/, '');

  return {
    slug: cleaned,
    name: cleaned
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' '),
    searchTerm: cleaned.replace(/-/g, ' ')
  };
}

// Search for products matching a search term
async function searchProducts(searchTerm) {
  try {
    const response = await apiRequest('GET', `/v3/catalog/products?name:like=${encodeURIComponent(searchTerm)}&limit=250`);
    return response.data || [];
  } catch (error) {
    console.error(`Error searching for "${searchTerm}":`, error.message);
    return [];
  }
}

// Create a category
async function createCategory(name, urlPath, description) {
  try {
    const categoryData = {
      parent_id: 0,
      name: name,
      custom_url: {
        url: `/${urlPath}/`,
        is_customized: true
      },
      description: description,
      is_visible: true,
      sort_order: 0
    };

    const response = await apiRequest('POST', '/v3/catalog/categories', categoryData);
    console.log(`  ✓ Created category: ${name} (ID: ${response.data.id})`);
    return response.data;
  } catch (error) {
    console.error(`  ✗ Error creating category "${name}":`, error.message);
    return null;
  }
}

// Assign products to category
async function assignProductsToCategory(categoryId, productIds) {
  try {
    for (const productId of productIds) {
      await apiRequest('PUT', `/v3/catalog/products/${productId}`, {
        categories: [categoryId]
      });
    }
    console.log(`  ✓ Assigned ${productIds.length} products to category`);
    return true;
  } catch (error) {
    console.error(`  ✗ Error assigning products:`, error.message);
    return false;
  }
}

// Create redirect
async function createRedirect(fromPath, toPath) {
  try {
    const redirectData = {
      from_path: fromPath,
      to_url: toPath,
      redirect_type: 'permanent'
    };

    await apiRequest('POST', '/v3/storefront/redirects', redirectData);
    return true;
  } catch (error) {
    // Redirect might already exist, that's okay
    if (!error.message.includes('already exists')) {
      console.error(`  Warning: Redirect ${fromPath} -> ${toPath}: ${error.message}`);
    }
    return false;
  }
}

// Main function
async function fixAll404s() {
  console.log('Starting 404 Fix Process...\n');
  console.log(`Processing ${PRODUCT_404_URLS.length} 404 URLs\n`);

  const results = {
    categoriesCreated: [],
    redirectsCreated: [],
    noProductsFound: [],
    errors: []
  };

  for (const url of PRODUCT_404_URLS) {
    console.log(`\nProcessing: ${url}`);

    const family = extractProductFamily(url);
    console.log(`  Product family: ${family.name}`);
    console.log(`  Searching for products...`);

    // Search for all products in this family
    const products = await searchProducts(family.searchTerm);

    if (products.length === 0) {
      console.log(`  ✗ No products found`);
      results.noProductsFound.push(url);
      continue;
    }

    console.log(`  ✓ Found ${products.length} product(s)`);

    // Create category for this product family
    const category = await createCategory(
      family.name,
      family.slug,
      `All ${family.name} products and sizes`
    );

    if (!category) {
      results.errors.push({ url, error: 'Failed to create category' });
      continue;
    }

    results.categoriesCreated.push({
      url: url,
      category: family.name,
      categoryId: category.id,
      productCount: products.length
    });

    // Assign products to category
    const productIds = products.map(p => p.id);
    await assignProductsToCategory(category.id, productIds);

    // Create redirect from old URL to new category
    const redirectCreated = await createRedirect(url, `/${family.slug}/`);
    if (redirectCreated) {
      results.redirectsCreated.push({ from: url, to: `/${family.slug}/` });
      console.log(`  ✓ Redirect created: ${url} → /${family.slug}/`);
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 500));
  }

  // Generate report
  console.log('\n\n========== FINAL REPORT ==========\n');
  console.log(`Categories Created: ${results.categoriesCreated.length}`);
  console.log(`Redirects Created: ${results.redirectsCreated.length}`);
  console.log(`No Products Found: ${results.noProductsFound.length}`);
  console.log(`Errors: ${results.errors.length}`);

  // Save detailed report
  fs.writeFileSync('404-fix-report.json', JSON.stringify(results, null, 2));
  console.log('\n✓ Detailed report saved to: 404-fix-report.json');

  // Save redirect CSV for manual upload (backup)
  const csvRows = ['From Path,To Path,Type'];
  results.redirectsCreated.forEach(r => {
    csvRows.push(`"${r.from}","${r.to}","permanent"`);
  });
  fs.writeFileSync('bigcommerce-redirects.csv', csvRows.join('\n'));
  console.log('✓ Redirect CSV saved to: bigcommerce-redirects.csv');

  // Handle URLs with no products found
  if (results.noProductsFound.length > 0) {
    console.log('\n⚠ URLs with no products found (may be discontinued):');
    results.noProductsFound.forEach(url => console.log(`  - ${url}`));
    fs.writeFileSync('discontinued-products.txt', results.noProductsFound.join('\n'));
    console.log('✓ Saved to: discontinued-products.txt');
  }

  console.log('\n========== NEXT STEPS ==========');
  console.log('1. Review the 404-fix-report.json for details');
  console.log('2. Check category pages are working correctly');
  console.log('3. Update robots.txt to block API endpoints:');
  console.log('   Add these lines to robots.txt:');
  console.log('   Disallow: /api/');
  console.log('   Disallow: /.well-known/assetlinks.json');
  console.log('4. Mark fixed URLs in Google Search Console');
  console.log('5. Submit updated sitemap to Google');
}

// Run the script
fixAll404s().catch(console.error);
