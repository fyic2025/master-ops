const https = require('https');

const STORE_HASH = 'hhhi';
const ACCESS_TOKEN = 'a96rfpx8xvhkb23h7esqy3y1i0jynpt';

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

async function findProblems() {
    console.log('🔍 Scanning products for GSC issues...\n');

    const problems = {
        missingImages: [],
        missingPrice: [],
        missingDescription: [],
        invalidSku: []
    };

    let page = 1;
    let hasMore = true;
    let totalProducts = 0;

    while (hasMore) {
        process.stdout.write(`  Scanning page ${page}...`);

        const response = await apiRequest(`/catalog/products?limit=250&page=${page}&include=images`);
        const products = response.data;

        if (products.length === 0) {
            hasMore = false;
            console.log(' done');
            break;
        }

        totalProducts += products.length;

        for (const product of products) {
            // Check for missing images
            if (!product.images || product.images.length === 0) {
                problems.missingImages.push({
                    id: product.id,
                    name: product.name,
                    sku: product.sku,
                    url: `https://store-${STORE_HASH}.mybigcommerce.com/manage/products/${product.id}/edit`
                });
            }

            // Check for missing/zero price
            if (!product.price || product.price === 0) {
                problems.missingPrice.push({
                    id: product.id,
                    name: product.name,
                    sku: product.sku,
                    price: product.price,
                    url: `https://store-${STORE_HASH}.mybigcommerce.com/manage/products/${product.id}/edit`
                });
            }

            // Check for missing description
            if (!product.description || product.description.trim() === '') {
                problems.missingDescription.push({
                    id: product.id,
                    name: product.name,
                    sku: product.sku
                });
            }

            // Check for invalid SKU (empty or problematic characters)
            if (!product.sku || product.sku.trim() === '' || /[<>\"\'&]/.test(product.sku)) {
                problems.invalidSku.push({
                    id: product.id,
                    name: product.name,
                    sku: product.sku || '(empty)',
                    url: `https://store-${STORE_HASH}.mybigcommerce.com/manage/products/${product.id}/edit`
                });
            }
        }

        console.log(` found ${products.length} products`);

        if (response.meta.pagination.current_page >= response.meta.pagination.total_pages) {
            hasMore = false;
        }
        page++;

        // Rate limiting
        await new Promise(r => setTimeout(r, 200));
    }

    console.log(`\n📊 Scanned ${totalProducts} total products\n`);
    console.log('=' .repeat(60));

    // Report missing images
    console.log(`\n❌ MISSING IMAGES: ${problems.missingImages.length} products`);
    if (problems.missingImages.length > 0 && problems.missingImages.length <= 20) {
        problems.missingImages.forEach(p => {
            console.log(`   - [${p.sku}] ${p.name}`);
            console.log(`     Edit: ${p.url}`);
        });
    }

    // Report missing price
    console.log(`\n❌ MISSING PRICE: ${problems.missingPrice.length} products`);
    if (problems.missingPrice.length > 0 && problems.missingPrice.length <= 20) {
        problems.missingPrice.forEach(p => {
            console.log(`   - [${p.sku}] ${p.name} (price: ${p.price})`);
            console.log(`     Edit: ${p.url}`);
        });
    }

    // Report missing description
    console.log(`\n⚠️  MISSING DESCRIPTION: ${problems.missingDescription.length} products`);
    if (problems.missingDescription.length <= 10) {
        problems.missingDescription.forEach(p => {
            console.log(`   - [${p.sku}] ${p.name}`);
        });
    }

    // Report invalid SKU
    console.log(`\n⚠️  INVALID/EMPTY SKU: ${problems.invalidSku.length} products`);
    if (problems.invalidSku.length > 0 && problems.invalidSku.length <= 20) {
        problems.invalidSku.forEach(p => {
            console.log(`   - SKU: "${p.sku}" - ${p.name}`);
            console.log(`     Edit: ${p.url}`);
        });
    }

    console.log('\n' + '=' .repeat(60));

    return problems;
}

findProblems().catch(err => console.error('Error:', err.message));
