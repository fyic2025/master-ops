const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const supabase = createClient(
    'https://usibnysqelovfuctmkqw.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'
);

const BC_STORE_HASH = 'hhhi';
const BC_ACCESS_TOKEN = 'eeikmonznnsxcq4f24m9d6uvv1e0qjn'; // From .stencil file

function normalizeBarcode(barcode) {
    if (!barcode) return null;
    return barcode.toString().replace(/[\s\-]/g, '').replace(/^0+/, '');
}

async function fetchAll(table, select, filter) {
    const allData = [];
    let offset = 0;
    const limit = 1000;
    while (true) {
        let query = supabase.from(table).select(select).range(offset, offset + limit - 1);
        if (filter) query = query.eq(filter.col, filter.val);
        const { data, error } = await query;
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

async function createRedirect(fromPath, toPath) {
    try {
        await bcRequest('/v3/storefront/redirects', 'POST', {
            from_path: fromPath,
            to: { type: 'url', url: toPath },
            site_id: 1000
        });
        return true;
    } catch (err) {
        console.log(`    Redirect error: ${err.message}`);
        return false;
    }
}

async function deleteProduct(productId) {
    try {
        await bcRequest(`/v3/catalog/products/${productId}`, 'DELETE');
        return true;
    } catch (err) {
        console.log(`    BC delete error: ${err.message}`);
        return false;
    }
}

async function run() {
    if (!BC_ACCESS_TOKEN) {
        console.log('ERROR: BC_BOO_ACCESS_TOKEN not set in .env');
        process.exit(1);
    }
    console.log(`Using BC Store: ${BC_STORE_HASH}`);

    console.log('='.repeat(60));
    console.log('CLEANUP DISCONTINUED OBORNE PRODUCTS');
    console.log('Stock=1000, Not in Oborne feed');
    console.log('='.repeat(60));

    // Get Oborne products and build barcode lookup
    const oborneProducts = await fetchAll('supplier_products', 'barcode', { col: 'supplier_name', val: 'oborne' });
    const oborneByNormalizedBarcode = {};
    oborneProducts.forEach(p => {
        const norm = normalizeBarcode(p.barcode);
        if (norm) oborneByNormalizedBarcode[norm] = true;
    });

    // Get all BC products and links
    const allBC = await fetchAll('ecommerce_products', 'id, product_id, sku, name, barcode, brand, inventory_level');
    const allLinks = await fetchAll('product_supplier_links', 'ecommerce_product_id');
    const linkedSet = new Set(allLinks.map(l => l.ecommerce_product_id));

    // Find OB products with stock=1000, not linked, not in Oborne feed
    const toDelete = allBC.filter(p => {
        const sku = (p.sku || '');
        if (!sku.startsWith('OB')) return false;
        if (linkedSet.has(p.id)) return false;
        if (p.inventory_level !== 1000) return false;

        // Check if in Oborne feed
        const norm = normalizeBarcode(p.barcode);
        if (norm && oborneByNormalizedBarcode[norm]) return false;

        // Exclude copy of / on sale
        if (sku.toLowerCase().includes('copy of')) return false;
        if ((p.name || '').toLowerCase().includes('on sale')) return false;

        return true;
    });

    console.log(`\nFound ${toDelete.length} products to delete:\n`);

    // Group by brand for display
    const byBrand = {};
    toDelete.forEach(p => {
        const brand = p.brand || 'Unknown';
        if (!byBrand[brand]) byBrand[brand] = [];
        byBrand[brand].push(p);
    });

    Object.entries(byBrand).sort((a, b) => b[1].length - a[1].length).forEach(([brand, products]) => {
        console.log(`${brand}: ${products.length}`);
    });

    console.log('\n' + '-'.repeat(60));
    console.log('PROCESSING...');
    console.log('-'.repeat(60));

    let redirected = 0;
    let deletedBC = 0;
    let deletedSupabase = 0;
    let errors = 0;

    for (const product of toDelete) {
        console.log(`\n[${product.sku}] ${(product.name || '').substring(0, 40)}`);

        // 1. Get product URL from BC, then create redirect
        let fromPath = null;
        if (product.product_id) {
            try {
                const bcProduct = await bcRequest(`/v3/catalog/products/${product.product_id}?include_fields=custom_url`);
                if (bcProduct && bcProduct.data && bcProduct.data.custom_url && bcProduct.data.custom_url.url) {
                    fromPath = bcProduct.data.custom_url.url;
                }
            } catch (err) {
                console.log(`  Could not get URL: ${err.message}`);
            }
        }

        if (fromPath) {
            console.log(`  Creating redirect: ${fromPath} -> /`);
            const redirectOk = await createRedirect(fromPath, '/');
            if (redirectOk) redirected++;
        } else {
            console.log(`  No URL found, skipping redirect`);
        }

        // 2. Delete from BigCommerce
        if (product.product_id) {
            console.log(`  Deleting from BC (product_id: ${product.product_id})...`);
            const bcOk = await deleteProduct(product.product_id);
            if (bcOk) deletedBC++;
            else errors++;
        }

        // 3. Delete from Supabase (handle FK constraints)
        console.log(`  Deleting from Supabase...`);

        // First delete from seo_products (FK constraint)
        await supabase.from('seo_products').delete().eq('ecommerce_product_id', product.id);

        // Then delete from ecommerce_products
        const { error: supError } = await supabase
            .from('ecommerce_products')
            .delete()
            .eq('id', product.id);

        if (supError) {
            console.log(`    Supabase error: ${supError.message}`);
            errors++;
        } else {
            deletedSupabase++;
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total processed: ${toDelete.length}`);
    console.log(`Redirects created: ${redirected}`);
    console.log(`Deleted from BC: ${deletedBC}`);
    console.log(`Deleted from Supabase: ${deletedSupabase}`);
    console.log(`Errors: ${errors}`);
}

run().catch(console.error);
