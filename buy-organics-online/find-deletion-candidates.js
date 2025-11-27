/**
 * Find products that are candidates for deletion
 *
 * Criteria:
 * - No supplier link (can't restock)
 * - Zero inventory
 * - Not visible / disabled
 * - Old/stale products
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fetchAllRecords(table, selectCols) {
    const PAGE_SIZE = 1000;
    let allRecords = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from(table)
            .select(selectCols)
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (error) throw new Error(`Failed to fetch ${table}: ${error.message}`);
        allRecords = allRecords.concat(data);
        hasMore = data.length === PAGE_SIZE;
        page++;
    }

    return allRecords;
}

async function analyze() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('DELETION CANDIDATE ANALYSIS');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Fetch all BC products
    console.log('Fetching BigCommerce products...');
    const products = await fetchAllRecords('ecommerce_products',
        'id, product_id, sku, name, price, inventory_level, is_visible, brand, categories, created_at, updated_at');
    console.log(`  ✓ ${products.length} products\n`);

    // Fetch linked product IDs
    console.log('Fetching product links...');
    const links = await fetchAllRecords('product_supplier_links', 'ecommerce_product_id');
    const linkedIds = new Set(links.map(l => l.ecommerce_product_id));
    console.log(`  ✓ ${linkedIds.size} linked products\n`);

    // Categorize products
    const categories = {
        // HIGH PRIORITY - Delete
        unlinked_zero_stock: [],      // No supplier + no stock = can't sell
        unlinked_hidden: [],          // No supplier + hidden = dead product
        copy_products: [],            // SKU contains "copy"
        test_products: [],            // Name/SKU contains "test"

        // MEDIUM PRIORITY - Review
        unlinked_low_stock: [],       // No supplier + low stock (1-5)
        unlinked_zero_price: [],      // No supplier + $0 price

        // LOW PRIORITY - Monitor
        unlinked_has_stock: [],       // No supplier but has stock (sell through)
        linked_zero_stock: [],        // Has supplier but no stock (can reorder)
    };

    for (const p of products) {
        const isLinked = linkedIds.has(p.id);
        const hasStock = p.inventory_level > 0;
        const isVisible = p.is_visible !== false;
        const hasPrice = p.price > 0;
        const sku = (p.sku || '').toLowerCase();
        const name = (p.name || '').toLowerCase();

        // Check for copy/test products
        if (sku.includes('copy') || name.includes('copy of ')) {
            categories.copy_products.push(p);
            continue;
        }
        if (sku.includes('test') || name.includes('test product')) {
            categories.test_products.push(p);
            continue;
        }

        if (!isLinked) {
            if (p.inventory_level === 0) {
                if (!isVisible) {
                    categories.unlinked_hidden.push(p);
                } else {
                    categories.unlinked_zero_stock.push(p);
                }
            } else if (p.inventory_level <= 5) {
                categories.unlinked_low_stock.push(p);
            } else if (!hasPrice) {
                categories.unlinked_zero_price.push(p);
            } else {
                categories.unlinked_has_stock.push(p);
            }
        } else {
            if (p.inventory_level === 0 && !isVisible) {
                categories.linked_zero_stock.push(p);
            }
        }
    }

    // Report
    console.log('═══════════════════════════════════════════════════════════');
    console.log('HIGH PRIORITY - SAFE TO DELETE');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`1. UNLINKED + ZERO STOCK: ${categories.unlinked_zero_stock.length}`);
    console.log('   (No supplier, no inventory - cannot be restocked or sold)\n');

    if (categories.unlinked_zero_stock.length > 0) {
        // Group by brand
        const byBrand = {};
        categories.unlinked_zero_stock.forEach(p => {
            const brand = p.brand || '(No Brand)';
            if (!byBrand[brand]) byBrand[brand] = [];
            byBrand[brand].push(p);
        });

        console.log('   By Brand:');
        Object.keys(byBrand)
            .sort((a, b) => byBrand[b].length - byBrand[a].length)
            .slice(0, 20)
            .forEach(brand => {
                console.log(`     ${brand}: ${byBrand[brand].length}`);
            });
        console.log('');
    }

    console.log(`2. UNLINKED + HIDDEN: ${categories.unlinked_hidden.length}`);
    console.log('   (No supplier, already hidden - dead products)\n');

    console.log(`3. COPY PRODUCTS: ${categories.copy_products.length}`);
    if (categories.copy_products.length > 0) {
        categories.copy_products.slice(0, 5).forEach(p => {
            console.log(`   - [${p.sku}] ${p.name?.substring(0, 50)}`);
        });
    }
    console.log('');

    console.log(`4. TEST PRODUCTS: ${categories.test_products.length}`);
    if (categories.test_products.length > 0) {
        categories.test_products.forEach(p => {
            console.log(`   - [${p.sku}] ${p.name?.substring(0, 50)}`);
        });
    }
    console.log('');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('MEDIUM PRIORITY - REVIEW BEFORE DELETE');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`5. UNLINKED + LOW STOCK (1-5): ${categories.unlinked_low_stock.length}`);
    console.log('   (May sell through, then delete)\n');

    console.log(`6. UNLINKED + ZERO PRICE: ${categories.unlinked_zero_price.length}`);
    console.log('   (Can\'t sell at $0, no supplier to check price)\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('LOW PRIORITY - MONITOR');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`7. UNLINKED + HAS STOCK: ${categories.unlinked_has_stock.length}`);
    console.log('   (Sell through inventory, then review)\n');

    console.log(`8. LINKED + ZERO STOCK: ${categories.linked_zero_stock.length}`);
    console.log('   (Has supplier - can reorder)\n');

    // Summary
    const highPriority = categories.unlinked_zero_stock.length +
                         categories.unlinked_hidden.length +
                         categories.copy_products.length +
                         categories.test_products.length;

    const mediumPriority = categories.unlinked_low_stock.length +
                          categories.unlinked_zero_price.length;

    console.log('═══════════════════════════════════════════════════════════');
    console.log('SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`HIGH PRIORITY (safe to delete):   ${highPriority}`);
    console.log(`MEDIUM PRIORITY (review first):   ${mediumPriority}`);
    console.log(`LOW PRIORITY (monitor):           ${categories.unlinked_has_stock.length + categories.linked_zero_stock.length}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Export high priority for deletion
    if (highPriority > 0) {
        const toDelete = [
            ...categories.unlinked_zero_stock,
            ...categories.unlinked_hidden,
            ...categories.copy_products,
            ...categories.test_products
        ];

        // Save to JSON for review
        const fs = require('fs');
        fs.writeFileSync('deletion-candidates.json', JSON.stringify({
            summary: {
                unlinked_zero_stock: categories.unlinked_zero_stock.length,
                unlinked_hidden: categories.unlinked_hidden.length,
                copy_products: categories.copy_products.length,
                test_products: categories.test_products.length,
                total: highPriority
            },
            products: toDelete.map(p => ({
                product_id: p.product_id,
                sku: p.sku,
                name: p.name,
                brand: p.brand,
                price: p.price,
                inventory: p.inventory_level,
                visible: p.is_visible
            }))
        }, null, 2));
        console.log('Saved deletion-candidates.json for review\n');
    }

    return categories;
}

analyze().catch(err => console.error('ERROR:', err.message));
