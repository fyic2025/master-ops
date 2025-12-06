/**
 * DELETE NUTRA ORGANICS PRODUCTS
 *
 * 1. Fetches all Nutra Organics products from BC
 * 2. Creates 301 redirects (to category, brand, or home)
 * 3. Deletes from BigCommerce
 * 4. Deletes from Supabase
 */

require('dotenv').config({ path: '../MASTER-CREDENTIALS-COMPLETE.env' });
const https = require('https');
const { createClient } = require('@supabase/supabase-js');

// BigCommerce Config
const BC_STORE_HASH = process.env.BOO_BC_STORE_HASH || 'hhhi';
const BC_ACCESS_TOKEN = process.env.BOO_BC_ACCESS_TOKEN || 'eeikmonznnsxcq4f24m9d6uvv1e0qjn';

// Supabase Config
const supabase = createClient(
    'https://usibnysqelovfuctmkqw.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'
);

// Default redirect destination
const DEFAULT_REDIRECT = '/superfoods/';

function bcRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.bigcommerce.com',
            port: 443,
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
                    resolve(null); // Product not found
                } else if (res.statusCode >= 400) {
                    reject(new Error(`BC API Error (${res.statusCode}): ${data}`));
                } else {
                    try {
                        resolve(data ? JSON.parse(data) : {});
                    } catch (e) {
                        resolve(data);
                    }
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function fetchNutraProducts() {
    console.log('Fetching Nutra Organics products...');

    // Get product IDs from Supabase first
    const { data: supaProducts, error } = await supabase
        .from('ecommerce_products')
        .select('product_id, name')
        .ilike('brand', '%Nutra Organics%');

    if (error) {
        console.error('Supabase error:', error);
        return [];
    }

    console.log(`Found ${supaProducts.length} products in Supabase`);

    // Fetch each product from BC to get custom_url
    const allProducts = [];
    for (const sp of supaProducts) {
        try {
            const response = await bcRequest('GET', `/v3/catalog/products/${sp.product_id}`);
            if (response && response.data) {
                allProducts.push(response.data);
                console.log(`  ✓ Found: ${sp.product_id} - ${sp.name.substring(0, 40)}...`);
            } else {
                console.log(`  ✗ Not found: ${sp.product_id} (already deleted from BC)`);
            }
        } catch (e) {
            console.log(`  ✗ Error: ${sp.product_id} - ${e.message}`);
        }
    }

    return allProducts;
}

async function createRedirect(fromUrl, toUrl) {
    try {
        await bcRequest('POST', '/v3/storefront/redirects', {
            from_path: fromUrl,
            to_url: toUrl,
            type: 301
        });
        return true;
    } catch (e) {
        console.error(`  Failed to create redirect for ${fromUrl}:`, e.message);
        return false;
    }
}

async function deleteFromBC(productId) {
    try {
        await bcRequest('DELETE', `/v3/catalog/products/${productId}`);
        return true;
    } catch (e) {
        console.error(`  Failed to delete BC product ${productId}:`, e.message);
        return false;
    }
}

async function deleteFromSupabase(bcProductId) {
    // First delete from product_supplier_links
    const { data: product } = await supabase
        .from('ecommerce_products')
        .select('id')
        .eq('product_id', bcProductId)
        .single();

    if (product) {
        await supabase
            .from('product_supplier_links')
            .delete()
            .eq('ecommerce_product_id', product.id);

        await supabase
            .from('ecommerce_products')
            .delete()
            .eq('id', product.id);
    }

    return true;
}

async function main() {
    const args = process.argv.slice(2);
    const dryRun = !args.includes('--execute');

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║         DELETE NUTRA ORGANICS PRODUCTS                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`Mode: ${dryRun ? 'DRY RUN (use --execute to actually delete)' : 'EXECUTING DELETES'}`);
    console.log('');

    // Fetch products from BC
    const products = await fetchNutraProducts();
    console.log(`Found ${products.length} Nutra Organics products in BigCommerce\n`);

    if (products.length === 0) {
        console.log('No products found. Exiting.');
        return;
    }

    // Show products
    console.log('Products to delete:');
    products.forEach((p, i) => {
        const url = p.custom_url?.url || 'N/A';
        console.log(`  ${i + 1}. [${p.id}] ${p.name}`);
        console.log(`     URL: ${url} → ${DEFAULT_REDIRECT}`);
    });
    console.log('');

    if (dryRun) {
        console.log('DRY RUN - No changes made.');
        console.log('Run with --execute to perform actual deletions.');
        return;
    }

    // Execute deletions
    let redirectsCreated = 0;
    let bcDeleted = 0;
    let supabaseDeleted = 0;

    for (const product of products) {
        const fromUrl = product.custom_url?.url;

        // Create redirect
        if (fromUrl) {
            console.log(`Creating redirect: ${fromUrl} → ${DEFAULT_REDIRECT}`);
            if (await createRedirect(fromUrl, DEFAULT_REDIRECT)) {
                redirectsCreated++;
            }
        }

        // Delete from BC
        console.log(`Deleting from BC: ${product.id} - ${product.name}`);
        if (await deleteFromBC(product.id)) {
            bcDeleted++;
        }

        // Delete from Supabase
        console.log(`Deleting from Supabase: ${product.id}`);
        if (await deleteFromSupabase(product.id)) {
            supabaseDeleted++;
        }

        console.log('');
    }

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                       SUMMARY                               ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`  301 Redirects created: ${redirectsCreated}`);
    console.log(`  BC Products deleted: ${bcDeleted}`);
    console.log(`  Supabase records deleted: ${supabaseDeleted}`);
}

main().catch(err => console.error('Error:', err));
