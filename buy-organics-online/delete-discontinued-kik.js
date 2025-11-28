const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const supabase = createClient(
    'https://usibnysqelovfuctmkqw.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'
);

const BC_STORE_HASH = 'hhhi';
const BC_ACCESS_TOKEN = 'eeikmonznnsxcq4f24m9d6uvv1e0qjn';

// Products to delete: discontinued Miessence + Eco SouLife (zero stock, not in Unleashed)
const SKUS_TO_DELETE = [
    'KIK - one - 12301',
    'KIK - 2029NT',
    'KIK - one - 11102',
    'KIK - one - 11201',
    'KIK - one - 11402',
    'KIK - one - 11404',
    'KIK - one - 11502',
    'KIK - one - 11601',
    'KIK - one - 11701',
    'KIK - one - 11702',
    'KIK - one - 12101',
    'KIK - one - 13201',
    'KIK - one - 11103',
    'KIK - one - 11104',
    'KIK - one - 11401',
    'KIK - one - 11403',
    'KIK - one - 11501',
    'KIK - one - 11604',
    'KIK - one - 11603',
    'KIK - one - 13101',
    'KIK - one - 13305',
    'KIK - 0035NT',
    'KIK - one - 12501',
    'KIK - one - 11101',
    'KIK - one - 11302',
    'KIK - one - 11303',
    'KIK - one - 13301',
    'KIK - 2043NT'
];

async function bcRequest(endpoint, method = 'GET', body = null) {
    const url = `https://api.bigcommerce.com/stores/${BC_STORE_HASH}${endpoint}`;
    const options = {
        method,
        headers: {
            'X-Auth-Token': BC_ACCESS_TOKEN,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(url, options);
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`BC API ${method} ${endpoint}: ${response.status} - ${text}`);
    }
    if (response.status === 204) return null;
    return response.json();
}

async function createRedirect(fromPath) {
    try {
        await bcRequest('/v2/redirects', 'POST', {
            path: fromPath,
            forward: { type: 'manual', ref: '/' }
        });
        return true;
    } catch (err) {
        return false;
    }
}

async function run() {
    console.log('='.repeat(60));
    console.log('DELETE DISCONTINUED KIK PRODUCTS');
    console.log('Miessence + Eco SouLife (zero stock, not in Unleashed)');
    console.log('='.repeat(60));

    // Get products from Supabase
    const { data: products, error } = await supabase
        .from('ecommerce_products')
        .select('id, product_id, sku, name')
        .in('sku', SKUS_TO_DELETE);

    if (error) throw error;
    console.log(`\nFound ${products.length} products to delete\n`);

    let redirected = 0;
    let deletedBC = 0;
    let deletedSupabase = 0;
    let errors = 0;

    for (const product of products) {
        process.stdout.write(`[${product.sku}] `);

        // 1. Get product URL and create redirect
        if (product.product_id) {
            try {
                const bcProduct = await bcRequest(`/v3/catalog/products/${product.product_id}?include_fields=custom_url`);
                if (bcProduct?.data?.custom_url?.url) {
                    const redirectOk = await createRedirect(bcProduct.data.custom_url.url);
                    if (redirectOk) redirected++;
                }
            } catch (err) {
                // Product may already be deleted
            }

            // 2. Delete from BC
            try {
                await bcRequest(`/v3/catalog/products/${product.product_id}`, 'DELETE');
                deletedBC++;
                process.stdout.write('BC✓ ');
            } catch (err) {
                process.stdout.write('BC✗ ');
                errors++;
            }
        }

        // 3. Delete from Supabase (handle FK constraints)
        await supabase.from('seo_products').delete().eq('ecommerce_product_id', product.id);
        await supabase.from('product_supplier_links').delete().eq('ecommerce_product_id', product.id);
        const { error: supError } = await supabase
            .from('ecommerce_products')
            .delete()
            .eq('id', product.id);

        if (supError) {
            console.log(`SB✗ ${supError.message}`);
            errors++;
        } else {
            deletedSupabase++;
            console.log('SB✓');
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Processed: ${products.length}`);
    console.log(`Redirects: ${redirected}`);
    console.log(`Deleted BC: ${deletedBC}`);
    console.log(`Deleted Supabase: ${deletedSupabase}`);
    console.log(`Errors: ${errors}`);
}

run().catch(console.error);
