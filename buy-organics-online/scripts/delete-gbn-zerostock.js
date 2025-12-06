const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const supabase = createClient(
    'https://usibnysqelovfuctmkqw.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'
);

const BC_STORE_HASH = 'hhhi';
const BC_ACCESS_TOKEN = 'eeikmonznnsxcq4f24m9d6uvv1e0qjn';

async function fetchAll(table, select) {
    const allData = [];
    let offset = 0;
    const limit = 1000;
    while (true) {
        const { data, error } = await supabase.from(table).select(select).range(offset, offset + limit - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allData.push(...data);
        if (data.length < limit) break;
        offset += limit;
    }
    return allData;
}

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
    console.log('DELETE GBN ZERO-STOCK PRODUCTS');
    console.log('Duplicates/discontinued - minimizing Global supplier');
    console.log('='.repeat(60));

    // Get all products and links
    const allProducts = await fetchAll('ecommerce_products', 'id, product_id, sku, name, brand, inventory_level');
    const allLinks = await fetchAll('product_supplier_links', 'ecommerce_product_id');
    const linkedIds = new Set(allLinks.map(l => l.ecommerce_product_id));

    // Find GBN zero-stock unpaired
    const toDelete = allProducts.filter(p =>
        !linkedIds.has(p.id) &&
        (p.sku || '').toUpperCase().startsWith('GBN') &&
        p.inventory_level === 0
    );

    console.log(`\nFound ${toDelete.length} GBN zero-stock products to delete\n`);

    let redirected = 0;
    let deletedBC = 0;
    let deletedSupabase = 0;
    let errors = 0;

    for (const product of toDelete) {
        process.stdout.write(`[${product.sku}] `);

        // 1. Get URL and create redirect
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

        // 3. Delete from Supabase
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
    console.log(`Processed: ${toDelete.length}`);
    console.log(`Redirects: ${redirected}`);
    console.log(`Deleted BC: ${deletedBC}`);
    console.log(`Deleted Supabase: ${deletedSupabase}`);
    console.log(`Errors: ${errors}`);
}

run().catch(console.error);
