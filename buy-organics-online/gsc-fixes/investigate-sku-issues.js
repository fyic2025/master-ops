const https = require('https');

const STORE_HASH = 'hhhi';
const ACCESS_TOKEN = 'a96rfpx8xvhkb23h7esqy3y1i0jynpt';

// Sample of GSC "Invalid SKU" products to investigate
const sampleUrls = [
    '/plenty-plenty-cold-pressed-sunflower-oil-375ml/',
    '/eco-lips-lip-balm-display-mongo-kiss-unflavoured-15-x-7g/',
    '/macro-mike-mug-cake-mix-plant-protein-double-choc-chip-12-x-50g/',
    '/miessence-purifying-mineral-mask-oily-problem-skin-60g/',
    '/dr-organic-tea-tree-foot-spray-100ml/',
    '/summer-salt-body-rejuvenate-me-vitamin-c-serum-30ml/',
    '/tlxr-sparkling-mushroom-elixir-lemon-myrtle-250ml/',
    '/mindful-foods-stardust-anti-inflammatory-organic-nutrient-powder-100g/',
    '/natures-help-her-balance-female-hormone-balancer-300g/'
];

async function apiRequest(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.bigcommerce.com',
            path: `/stores/${STORE_HASH}/v3${path}`,
            method: 'GET',
            headers: {
                'X-Auth-Token': ACCESS_TOKEN,
                'Accept': 'application/json'
            }
        };

        https.get(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`API error: ${res.statusCode} - ${data}`));
                }
            });
        }).on('error', reject);
    });
}

async function investigateSKUs() {
    console.log('Investigating "Invalid SKU" products from GSC...\n');

    // First, let's scan ALL products and categorize SKU issues
    const skuIssues = {
        empty: [],           // Empty or whitespace only
        hasSpaces: [],       // Contains spaces
        specialChars: [],    // Has unusual characters
        tooLong: [],         // Over 50 chars
        duplicates: new Map(), // Duplicate SKUs
        normal: []           // Looks normal
    };

    let page = 1;
    let hasMore = true;
    let totalProducts = 0;
    const allSkus = new Map(); // Track all SKUs to find duplicates

    console.log('Scanning all products for SKU patterns...\n');

    while (hasMore) {
        process.stdout.write(`  Page ${page}...`);

        const response = await apiRequest(`/catalog/products?limit=250&page=${page}`);
        const products = response.data;

        if (products.length === 0) {
            hasMore = false;
            console.log(' done');
            break;
        }

        totalProducts += products.length;

        for (const product of products) {
            const sku = product.sku;
            const info = {
                id: product.id,
                name: product.name,
                sku: sku,
                customUrl: product.custom_url?.url || ''
            };

            // Check for various SKU issues
            if (!sku || sku.trim() === '') {
                skuIssues.empty.push(info);
            } else if (/\s/.test(sku)) {
                skuIssues.hasSpaces.push(info);
            } else if (/[^a-zA-Z0-9\-_.]/.test(sku)) {
                skuIssues.specialChars.push(info);
            } else if (sku.length > 50) {
                skuIssues.tooLong.push(info);
            } else {
                skuIssues.normal.push(info);
            }

            // Track duplicates
            if (sku && sku.trim() !== '') {
                if (allSkus.has(sku)) {
                    allSkus.get(sku).push(info);
                } else {
                    allSkus.set(sku, [info]);
                }
            }
        }

        console.log(` ${products.length} products`);

        if (response.meta.pagination.current_page >= response.meta.pagination.total_pages) {
            hasMore = false;
        }
        page++;
        await new Promise(r => setTimeout(r, 200));
    }

    // Find duplicates
    for (const [sku, products] of allSkus) {
        if (products.length > 1) {
            skuIssues.duplicates.set(sku, products);
        }
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log(`TOTAL PRODUCTS SCANNED: ${totalProducts}`);
    console.log(`${'='.repeat(70)}\n`);

    console.log(`SKU ISSUES FOUND:`);
    console.log(`  Empty/Missing SKU:     ${skuIssues.empty.length}`);
    console.log(`  Contains Spaces:       ${skuIssues.hasSpaces.length}`);
    console.log(`  Special Characters:    ${skuIssues.specialChars.length}`);
    console.log(`  Too Long (>50):        ${skuIssues.tooLong.length}`);
    console.log(`  Duplicate SKUs:        ${skuIssues.duplicates.size} unique SKUs shared by ${[...skuIssues.duplicates.values()].reduce((a,b) => a + b.length, 0)} products`);
    console.log(`  Normal SKUs:           ${skuIssues.normal.length}`);

    // Show examples of each issue
    console.log(`\n${'='.repeat(70)}`);
    console.log('EXAMPLES OF ISSUES:');
    console.log(`${'='.repeat(70)}\n`);

    if (skuIssues.empty.length > 0) {
        console.log('EMPTY/MISSING SKU (first 10):');
        skuIssues.empty.slice(0, 10).forEach(p => {
            console.log(`  - [ID: ${p.id}] ${p.name}`);
        });
        console.log('');
    }

    if (skuIssues.hasSpaces.length > 0) {
        console.log('SKU WITH SPACES (first 10):');
        skuIssues.hasSpaces.slice(0, 10).forEach(p => {
            console.log(`  - SKU: "${p.sku}" -> ${p.name}`);
        });
        console.log('');
    }

    if (skuIssues.specialChars.length > 0) {
        console.log('SKU WITH SPECIAL CHARACTERS (first 20):');
        skuIssues.specialChars.slice(0, 20).forEach(p => {
            console.log(`  - SKU: "${p.sku}" -> ${p.name}`);
        });
        console.log('');
    }

    if (skuIssues.duplicates.size > 0) {
        console.log('DUPLICATE SKUs (first 10):');
        let count = 0;
        for (const [sku, products] of skuIssues.duplicates) {
            if (count >= 10) break;
            console.log(`  SKU "${sku}" used by ${products.length} products:`);
            products.forEach(p => console.log(`    - [${p.id}] ${p.name}`));
            count++;
        }
        console.log('');
    }

    // Now let's check the specific GSC flagged products
    console.log(`${'='.repeat(70)}`);
    console.log('CHECKING SPECIFIC GSC-FLAGGED PRODUCTS:');
    console.log(`${'='.repeat(70)}\n`);

    for (const url of sampleUrls) {
        const slug = url.replace(/\//g, '');
        // Find in our scanned data
        const allProducts = [...skuIssues.empty, ...skuIssues.hasSpaces,
                           ...skuIssues.specialChars, ...skuIssues.tooLong,
                           ...skuIssues.normal];

        const found = allProducts.find(p => p.customUrl && p.customUrl.includes(slug.substring(0, 30)));

        if (found) {
            console.log(`URL: ${url}`);
            console.log(`  Product: ${found.name}`);
            console.log(`  SKU: "${found.sku || '(empty)'}"`);
            console.log(`  SKU Length: ${found.sku ? found.sku.length : 0}`);
            console.log('');
        }
    }

    // Summary of what might be causing 509 GSC errors
    const potentialGSCIssues = skuIssues.empty.length + skuIssues.hasSpaces.length + skuIssues.specialChars.length;
    console.log(`${'='.repeat(70)}`);
    console.log('SUMMARY:');
    console.log(`${'='.repeat(70)}`);
    console.log(`\nPotential causes of 509 GSC "Invalid SKU" errors:`);
    console.log(`  - Empty SKUs: ${skuIssues.empty.length}`);
    console.log(`  - SKUs with spaces: ${skuIssues.hasSpaces.length}`);
    console.log(`  - SKUs with special chars: ${skuIssues.specialChars.length}`);
    console.log(`  - Total potential issues: ${potentialGSCIssues}`);

    if (potentialGSCIssues < 509) {
        console.log(`\n  NOTE: Only ${potentialGSCIssues} issues found, but GSC reports 509.`);
        console.log(`  The remaining issues might be from:`);
        console.log(`    - Product variants with SKU issues`);
        console.log(`    - Structured data output differences`);
        console.log(`    - Cached/historical pages`);
    }

    return skuIssues;
}

investigateSKUs().catch(err => console.error('Error:', err.message));
