const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const BC_STORE_HASH = 'hhhi';
const BC_ACCESS_TOKEN = 'eeikmonznnsxcq4f24m9d6uvv1e0qjn';
const REDIRECT_TO = '/tea/';

const supabase = createClient(
    'https://usibnysqelovfuctmkqw.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'
);

const DRY_RUN = !process.argv.includes('--execute');

function bcRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.bigcommerce.com',
            path: `/stores/${BC_STORE_HASH}${path}`,
            method: method,
            headers: {
                'X-Auth-Token': BC_ACCESS_TOKEN,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 404) {
                    resolve(null);
                } else if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(data ? JSON.parse(data) : {});
                } else {
                    reject(new Error(`BC API ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function fetchAllSupabase(table, filter, select) {
    const allData = [];
    let offset = 0;
    const limit = 1000;

    while (true) {
        let query = supabase.from(table).select(select).range(offset, offset + limit - 1);
        if (filter && filter.column && filter.value) {
            if (filter.op === 'ilike') {
                query = query.ilike(filter.column, filter.value);
            } else {
                query = query.eq(filter.column, filter.value);
            }
        }
        const { data, error } = await query;
        if (error) throw error;
        if (!data || data.length === 0) break;
        allData.push(...data);
        if (data.length < limit) break;
        offset += limit;
    }
    return allData;
}

async function deleteTeaTonic() {
    console.log(DRY_RUN ? '=== DRY RUN MODE ===' : '=== EXECUTE MODE ===');
    console.log('Processing Tea Tonic UNLINKED products only\n');

    // Get Tea Tonic BC products from Supabase
    console.log('Fetching Tea Tonic products from Supabase...');
    const teaTonicProducts = await fetchAllSupabase('ecommerce_products',
        { column: 'brand', value: '%Tea Tonic%', op: 'ilike' },
        'id, product_id, sku, name'
    );
    console.log(`Total Tea Tonic products: ${teaTonicProducts.length}`);

    // Get linked product IDs
    console.log('Fetching supplier links...');
    const links = await fetchAllSupabase('product_supplier_links', null, 'ecommerce_product_id');
    const linkedIds = new Set(links.map(l => l.ecommerce_product_id));

    // Filter to unlinked only
    const unlinkedProducts = teaTonicProducts.filter(p => !linkedIds.has(p.id));
    console.log(`Unlinked (to process): ${unlinkedProducts.length}\n`);

    if (unlinkedProducts.length === 0) {
        console.log('No unlinked products to process.');
        return;
    }

    let redirectsCreated = 0;
    let productsDeleted = 0;
    let errors = [];

    for (const product of unlinkedProducts) {
        console.log(`\nProcessing: [${product.sku}] ${product.name.substring(0, 50)}...`);

        // Get custom URL from BC
        const bcProduct = await bcRequest('GET', `/v3/catalog/products/${product.product_id}`);
        if (!bcProduct || !bcProduct.data) {
            console.log(`  WARNING: Product ${product.product_id} not found in BC - already deleted?`);
            continue;
        }

        const customUrl = bcProduct.data.custom_url?.url;
        if (!customUrl) {
            console.log(`  WARNING: No custom URL for product ${product.product_id}`);
            continue;
        }

        console.log(`  URL: ${customUrl} -> ${REDIRECT_TO}`);

        if (DRY_RUN) {
            console.log(`  [DRY RUN] Would create redirect and delete`);
            redirectsCreated++;
            productsDeleted++;
        } else {
            try {
                // Create 301 redirect
                await bcRequest('POST', '/v3/storefront/redirects', {
                    from_path: customUrl,
                    site_id: 1000,
                    to: { type: 'relative', url: REDIRECT_TO },
                    to_url: REDIRECT_TO
                });
                console.log(`  Created redirect`);
                redirectsCreated++;

                // Delete from BC
                await bcRequest('DELETE', `/v3/catalog/products/${product.product_id}`);
                console.log(`  Deleted from BC`);
                productsDeleted++;

                // Small delay to avoid rate limits
                await new Promise(r => setTimeout(r, 200));
            } catch (err) {
                console.log(`  ERROR: ${err.message}`);
                errors.push({ product, error: err.message });
            }
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('BC PROCESSING COMPLETE');
    console.log('='.repeat(60));
    console.log(`Redirects created: ${redirectsCreated}`);
    console.log(`Products deleted from BC: ${productsDeleted}`);
    if (errors.length > 0) {
        console.log(`Errors: ${errors.length}`);
    }

    // Supabase cleanup
    if (!DRY_RUN && productsDeleted > 0) {
        console.log('\n' + '='.repeat(60));
        console.log('SUPABASE CLEANUP');
        console.log('='.repeat(60));

        const supabaseIds = unlinkedProducts.map(p => p.id);

        // Delete from seo_products first (FK constraint)
        console.log('Deleting from seo_products...');
        const { error: seoErr } = await supabase
            .from('seo_products')
            .delete()
            .in('ecommerce_product_id', supabaseIds);
        if (seoErr) console.log(`  Error: ${seoErr.message}`);
        else console.log('  Done');

        // Delete from product_supplier_links (should be empty but just in case)
        console.log('Deleting from product_supplier_links...');
        const { error: linkErr } = await supabase
            .from('product_supplier_links')
            .delete()
            .in('ecommerce_product_id', supabaseIds);
        if (linkErr) console.log(`  Error: ${linkErr.message}`);
        else console.log('  Done');

        // Delete from ecommerce_products
        console.log('Deleting from ecommerce_products...');
        const { error: prodErr } = await supabase
            .from('ecommerce_products')
            .delete()
            .in('id', supabaseIds);
        if (prodErr) console.log(`  Error: ${prodErr.message}`);
        else console.log('  Done');
    } else if (DRY_RUN) {
        console.log('\n[DRY RUN] Would clean up Supabase tables');
    }

    console.log('\n' + '='.repeat(60));
    console.log(DRY_RUN ? 'DRY RUN COMPLETE - Run with --execute to apply' : 'ALL DONE');
    console.log('='.repeat(60));
}

deleteTeaTonic().catch(err => console.error('Fatal error:', err));
