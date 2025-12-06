/**
 * Sync Brand Content from BigCommerce to Supabase
 *
 * Syncs meta_description and page_title from BC to seo_brands table
 */

const https = require('https');

// BigCommerce
const BC_STORE_HASH = 'hhhi';
const BC_ACCESS_TOKEN = 'a96rfpx8xvhkb23h7esqy3y1i0jynpt';

// BOO Supabase
const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

function bcGet(path) {
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

async function fetchAllBCBrands() {
    console.log('Fetching all brands from BigCommerce...');
    const allBrands = [];
    let page = 1;

    while (true) {
        const response = await bcGet(`/v3/catalog/brands?limit=250&page=${page}`);
        const brands = response.data || [];

        if (brands.length === 0) break;

        allBrands.push(...brands);
        console.log(`  Page ${page}: ${brands.length} brands (total: ${allBrands.length})`);

        page++;
        await new Promise(r => setTimeout(r, 200));
    }

    return allBrands;
}

async function syncBrandContent(bcBrands) {
    console.log('\nSyncing brand content to Supabase...');

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < bcBrands.length; i++) {
        const brand = bcBrands[i];

        // Skip if no content
        if (!brand.meta_description && !brand.page_title) {
            skipped++;
            continue;
        }

        try {
            await supabaseRequest(
                'PATCH',
                `/rest/v1/seo_brands?bc_brand_id=eq.${brand.id}`,
                {
                    description: brand.meta_description || null,
                    updated_at: new Date().toISOString()
                }
            );
            updated++;

            if ((i + 1) % 50 === 0) {
                console.log(`  Progress: ${i + 1}/${bcBrands.length} processed`);
            }
        } catch (err) {
            errors++;
            if (errors <= 5) {
                console.log(`  Error updating ${brand.name}: ${err.message}`);
            }
        }

        // Rate limiting
        if ((i + 1) % 100 === 0) {
            await new Promise(r => setTimeout(r, 100));
        }
    }

    return { updated, skipped, errors };
}

async function verifySyncResults() {
    console.log('\nVerifying sync results...');

    const brands = await supabaseRequest(
        'GET',
        '/rest/v1/seo_brands?select=name,description,product_count&order=product_count.desc&limit=10'
    );

    console.log('\nTop 10 brands by product count:');
    brands.forEach((b, i) => {
        const hasDesc = b.description ? 'Yes' : 'No';
        console.log(`  ${i + 1}. ${b.name} (${b.product_count} products) - Has description: ${hasDesc}`);
    });

    // Count brands with content
    const withContent = await supabaseRequest(
        'GET',
        '/rest/v1/seo_brands?select=id&description=not.is.null'
    );

    const total = await supabaseRequest(
        'GET',
        '/rest/v1/seo_brands?select=id'
    );

    console.log(`\nContent coverage: ${withContent.length}/${total.length} brands have descriptions`);
}

async function main() {
    console.log('========================================');
    console.log('Sync Brand Content: BC -> Supabase');
    console.log('========================================\n');

    // Step 1: Fetch all brands from BC
    const bcBrands = await fetchAllBCBrands();
    console.log(`\nTotal BC brands: ${bcBrands.length}`);

    const withMeta = bcBrands.filter(b => b.meta_description);
    console.log(`Brands with meta_description: ${withMeta.length}`);

    // Step 2: Sync to Supabase
    const results = await syncBrandContent(bcBrands);

    console.log('\n========================================');
    console.log('SYNC SUMMARY');
    console.log('========================================');
    console.log(`Updated: ${results.updated}`);
    console.log(`Skipped (no content): ${results.skipped}`);
    console.log(`Errors: ${results.errors}`);

    // Step 3: Verify
    await verifySyncResults();

    console.log('\n========================================');
    console.log('Sync Complete!');
    console.log('========================================');
}

main().catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
});
