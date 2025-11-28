/**
 * Sync Product-Brand Relationships
 *
 * Fetches brand_id from BigCommerce for all products and updates:
 * 1. ecommerce_products.bc_brand_id
 * 2. seo_brands.product_count
 *
 * Usage: node sync-product-brands.js
 */

const https = require('https');

// BigCommerce
const BC_STORE_HASH = 'hhhi';
const BC_ACCESS_TOKEN = 'a96rfpx8xvhkb23h7esqy3y1i0jynpt';

// BOO Supabase
const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

// HTTP helpers
function bcRequest(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.bigcommerce.com',
            path: `/stores/${BC_STORE_HASH}${path}`,
            method: 'GET',
            headers: {
                'X-Auth-Token': BC_ACCESS_TOKEN,
                'Accept': 'application/json'
            }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`BC API Error ${res.statusCode}: ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

function supabaseRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(SUPABASE_URL + path);
        const postData = body ? JSON.stringify(body) : null;

        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method,
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            }
        };

        if (postData) {
            options.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(data ? JSON.parse(data) : { success: true });
                } else {
                    reject(new Error(`Supabase Error ${res.statusCode}: ${data}`));
                }
            });
        });
        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
    });
}

async function fetchAllBCProducts() {
    console.log('Fetching all products from BigCommerce...');
    const allProducts = [];
    let page = 1;

    while (true) {
        const response = await bcRequest(`/v3/catalog/products?limit=250&page=${page}&include_fields=id,brand_id,name`);
        const products = response.data || [];

        if (products.length === 0) break;

        allProducts.push(...products);
        console.log(`  Page ${page}: ${products.length} products (total: ${allProducts.length})`);

        page++;
        await new Promise(r => setTimeout(r, 200)); // Rate limiting
    }

    return allProducts;
}

async function updateProductBrandIds(products) {
    console.log('\nUpdating ecommerce_products.bc_brand_id...');

    let updated = 0;
    let errors = 0;

    // Group products by brand_id for batch updates
    const byBrand = {};
    products.forEach(p => {
        const brandId = p.brand_id || 0;
        if (!byBrand[brandId]) byBrand[brandId] = [];
        byBrand[brandId].push(p.id);
    });

    // Update each product individually (Supabase doesn't support IN clause with PATCH easily)
    for (let i = 0; i < products.length; i++) {
        const p = products[i];
        try {
            await supabaseRequest(
                'PATCH',
                `/rest/v1/ecommerce_products?product_id=eq.${p.id}`,
                { bc_brand_id: p.brand_id || null }
            );
            updated++;

            if ((i + 1) % 500 === 0) {
                console.log(`  Progress: ${i + 1}/${products.length} updated`);
            }
        } catch (err) {
            errors++;
            if (errors <= 5) {
                console.log(`  Error updating product ${p.id}: ${err.message}`);
            }
        }

        // Small delay to avoid overwhelming Supabase
        if ((i + 1) % 100 === 0) {
            await new Promise(r => setTimeout(r, 100));
        }
    }

    console.log(`  Completed: ${updated} updated, ${errors} errors`);
    return { updated, errors };
}

async function updateBrandProductCounts() {
    console.log('\nUpdating seo_brands.product_count...');

    // Get current brands
    const brands = await supabaseRequest('GET', '/rest/v1/seo_brands?select=id,bc_brand_id,name');

    // Count products per brand from ecommerce_products
    const counts = {};
    let page = 0;
    const pageSize = 1000;

    while (true) {
        const products = await supabaseRequest(
            'GET',
            `/rest/v1/ecommerce_products?select=bc_brand_id,is_visible&bc_brand_id=not.is.null&limit=${pageSize}&offset=${page * pageSize}`
        );

        if (!products || products.length === 0) break;

        products.forEach(p => {
            if (p.bc_brand_id) {
                if (!counts[p.bc_brand_id]) {
                    counts[p.bc_brand_id] = { total: 0, visible: 0 };
                }
                counts[p.bc_brand_id].total++;
                if (p.is_visible) counts[p.bc_brand_id].visible++;
            }
        });

        page++;
    }

    // Update each brand's count
    let updated = 0;
    for (const brand of brands) {
        const count = counts[brand.bc_brand_id] || { total: 0, visible: 0 };
        try {
            await supabaseRequest(
                'PATCH',
                `/rest/v1/seo_brands?id=eq.${brand.id}`,
                {
                    product_count: count.total,
                    active_product_count: count.visible
                }
            );
            updated++;
        } catch (err) {
            console.log(`  Error updating brand ${brand.name}: ${err.message}`);
        }
    }

    console.log(`  Updated ${updated} brands`);

    // Show top brands
    const topBrands = brands
        .map(b => ({
            name: b.name,
            count: (counts[b.bc_brand_id] || {}).total || 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    console.log('\nTop 10 brands by product count:');
    topBrands.forEach((b, i) => {
        console.log(`  ${i + 1}. ${b.name}: ${b.count} products`);
    });
}

async function main() {
    console.log('========================================');
    console.log('Sync Product-Brand Relationships');
    console.log('========================================\n');

    // Step 1: Fetch all products from BC
    const products = await fetchAllBCProducts();
    console.log(`\nTotal products fetched: ${products.length}`);

    const withBrand = products.filter(p => p.brand_id && p.brand_id > 0);
    console.log(`Products with brand_id: ${withBrand.length}`);

    // Step 2: Update ecommerce_products.bc_brand_id
    await updateProductBrandIds(products);

    // Step 3: Update seo_brands.product_count
    await updateBrandProductCounts();

    console.log('\n========================================');
    console.log('Sync Complete!');
    console.log('========================================');
}

main().catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
});
