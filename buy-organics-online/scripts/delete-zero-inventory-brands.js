const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const BC_STORE_HASH = 'hhhi';
const BC_ACCESS_TOKEN = 'eeikmonznnsxcq4f24m9d6uvv1e0qjn';

const supabase = createClient(
    'https://usibnysqelovfuctmkqw.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'
);

// Brands to process with their redirect destinations
const BRANDS_CONFIG = {
    'Pandas By Luvme': '/baby/',
    'Mad Millie': '/fermented-foods/',
    'Melrose': '/superfoods/',
    'Cathay Herbal Retail': '/herbal/',
    'Antipodes': '/beauty/',
    'Wonder Foods': '/superfoods/',
    'Alter Eco': '/snacks/',
    'Natural Instinct': '/body-care/',
    'Sweet William': '/snacks/',
    'Mingle': '/pantry/',
    'Free Spirit': '/beauty/',
    'Eco Modern Essentials': '/essential-oils/',
    'Well Naturally': '/snacks/',
    'Carwari Organic': '/pantry/'
};

const DRY_RUN = !process.argv.includes('--execute');
const REPORT_ONLY = process.argv.includes('--report');

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

async function processZeroInventoryBrands() {
    console.log(REPORT_ONLY ? '=== REPORT MODE ===' : (DRY_RUN ? '=== DRY RUN MODE ===' : '=== EXECUTE MODE ==='));
    console.log('Processing brands with 0 inventory only\n');

    // Get all supplier links first
    console.log('Fetching supplier links...');
    const links = await fetchAllSupabase('product_supplier_links', null, 'ecommerce_product_id');
    const linkedIds = new Set(links.map(l => l.ecommerce_product_id));
    console.log(`Total linked products: ${linkedIds.size}\n`);

    const summary = {};
    let totalToProcess = 0;

    // Analyze each brand
    for (const [brand, redirectTo] of Object.entries(BRANDS_CONFIG)) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`BRAND: ${brand}`);
        console.log(`Redirect to: ${redirectTo}`);
        console.log('='.repeat(60));

        // Get products for this brand
        const products = await fetchAllSupabase('ecommerce_products',
            { column: 'brand', value: `%${brand}%`, op: 'ilike' },
            'id, product_id, sku, name, inventory_level, is_visible'
        );

        // Filter to unlinked only
        const unlinked = products.filter(p => !linkedIds.has(p.id));

        // Group by inventory
        const inv0 = unlinked.filter(p => p.inventory_level === 0);
        const inv1000 = unlinked.filter(p => p.inventory_level === 1000);
        const invOther = unlinked.filter(p => p.inventory_level !== 0 && p.inventory_level !== 1000);

        console.log(`Total products: ${products.length}`);
        console.log(`Unlinked: ${unlinked.length}`);
        console.log(`  - Inventory 0: ${inv0.length} (will process)`);
        console.log(`  - Inventory 1000: ${inv1000.length} (skip)`);
        console.log(`  - Other inventory: ${invOther.length} (skip)`);

        if (invOther.length > 0) {
            console.log(`\n  Other inventory levels:`);
            invOther.slice(0, 5).forEach(p => {
                console.log(`    [${p.sku}] inv=${p.inventory_level}: ${p.name.substring(0, 40)}...`);
            });
            if (invOther.length > 5) console.log(`    ... and ${invOther.length - 5} more`);
        }

        summary[brand] = {
            total: products.length,
            unlinked: unlinked.length,
            toProcess: inv0,
            redirectTo: redirectTo
        };
        totalToProcess += inv0.length;
    }

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('SUMMARY - WILL PROCESS (0 inventory, unlinked)');
    console.log('='.repeat(60));

    for (const [brand, data] of Object.entries(summary)) {
        console.log(`${brand}: ${data.toProcess.length} products -> ${data.redirectTo}`);
    }
    console.log(`\nTOTAL TO DELETE: ${totalToProcess}`);

    if (REPORT_ONLY) {
        console.log('\n[REPORT MODE] No changes made');
        return;
    }

    if (totalToProcess === 0) {
        console.log('\nNo products to process.');
        return;
    }

    // Process each brand
    let totalRedirects = 0;
    let totalDeleted = 0;
    const errors = [];
    const supabaseIdsToDelete = [];

    for (const [brand, data] of Object.entries(summary)) {
        if (data.toProcess.length === 0) continue;

        console.log(`\n${'='.repeat(60)}`);
        console.log(`PROCESSING: ${brand} (${data.toProcess.length} products)`);
        console.log('='.repeat(60));

        for (const product of data.toProcess) {
            console.log(`\n[${product.sku}] ${product.name.substring(0, 45)}...`);

            // Get custom URL from BC
            const bcProduct = await bcRequest('GET', `/v3/catalog/products/${product.product_id}`);
            if (!bcProduct || !bcProduct.data) {
                console.log(`  WARNING: Not found in BC - already deleted?`);
                supabaseIdsToDelete.push(product.id); // Still clean up Supabase
                continue;
            }

            const customUrl = bcProduct.data.custom_url?.url;
            if (!customUrl) {
                console.log(`  WARNING: No custom URL`);
                continue;
            }

            console.log(`  ${customUrl} -> ${data.redirectTo}`);

            if (DRY_RUN) {
                console.log(`  [DRY RUN] Would redirect and delete`);
                totalRedirects++;
                totalDeleted++;
                supabaseIdsToDelete.push(product.id);
            } else {
                try {
                    // Create redirect
                    await bcRequest('POST', '/v3/storefront/redirects', {
                        from_path: customUrl,
                        site_id: 1000,
                        to: { type: 'relative', url: data.redirectTo },
                        to_url: data.redirectTo
                    });
                    console.log(`  ✓ Redirect created`);
                    totalRedirects++;

                    // Delete from BC
                    await bcRequest('DELETE', `/v3/catalog/products/${product.product_id}`);
                    console.log(`  ✓ Deleted from BC`);
                    totalDeleted++;
                    supabaseIdsToDelete.push(product.id);

                    await new Promise(r => setTimeout(r, 150));
                } catch (err) {
                    console.log(`  ERROR: ${err.message}`);
                    errors.push({ product, brand, error: err.message });
                }
            }
        }
    }

    // BC Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('BC PROCESSING COMPLETE');
    console.log('='.repeat(60));
    console.log(`Redirects created: ${totalRedirects}`);
    console.log(`Products deleted: ${totalDeleted}`);
    if (errors.length > 0) {
        console.log(`Errors: ${errors.length}`);
    }

    // Supabase cleanup
    if (!DRY_RUN && supabaseIdsToDelete.length > 0) {
        console.log(`\n${'='.repeat(60)}`);
        console.log('SUPABASE CLEANUP');
        console.log('='.repeat(60));

        // Process in batches of 500
        for (let i = 0; i < supabaseIdsToDelete.length; i += 500) {
            const batch = supabaseIdsToDelete.slice(i, i + 500);
            console.log(`\nBatch ${Math.floor(i/500) + 1}: ${batch.length} records`);

            console.log('  Deleting from seo_products...');
            const { error: seoErr } = await supabase
                .from('seo_products')
                .delete()
                .in('ecommerce_product_id', batch);
            if (seoErr) console.log(`    Error: ${seoErr.message}`);
            else console.log('    Done');

            console.log('  Deleting from product_supplier_links...');
            const { error: linkErr } = await supabase
                .from('product_supplier_links')
                .delete()
                .in('ecommerce_product_id', batch);
            if (linkErr) console.log(`    Error: ${linkErr.message}`);
            else console.log('    Done');

            console.log('  Deleting from ecommerce_products...');
            const { error: prodErr } = await supabase
                .from('ecommerce_products')
                .delete()
                .in('id', batch);
            if (prodErr) console.log(`    Error: ${prodErr.message}`);
            else console.log('    Done');
        }
    } else if (DRY_RUN) {
        console.log(`\n[DRY RUN] Would clean up ${supabaseIdsToDelete.length} records from Supabase`);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(DRY_RUN ? 'DRY RUN COMPLETE - Run with --execute to apply' : 'ALL DONE');
    console.log('='.repeat(60));
}

processZeroInventoryBrands().catch(err => console.error('Fatal error:', err));
