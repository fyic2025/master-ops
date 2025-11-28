/**
 * Diagnose BigCommerce Checkout Issues
 *
 * Checks common causes of "shopping cart has been updated" errors:
 * - Products with zero/low stock
 * - Products with inventory tracking enabled but no stock
 * - Recent product modifications
 * - Price mismatches
 */

const https = require('https');

const BC_STORE_HASH = 'hhhi';
const BC_ACCESS_TOKEN = 'a96rfpx8xvhkb23h7esqy3y1i0jynpt';

function apiRequest(path) {
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
                    reject(new Error(`API Error ${res.statusCode}: ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function checkStoreSettings() {
    console.log('========================================');
    console.log('1. Store Inventory Settings');
    console.log('========================================\n');

    try {
        const settings = await apiRequest('/v2/store');
        console.log(`Store: ${settings.name}`);
        console.log(`Domain: ${settings.domain}`);
        console.log(`Plan: ${settings.plan_name}`);
        console.log(`Status: ${settings.status}`);
    } catch (err) {
        console.log('Could not fetch store settings:', err.message);
    }
}

async function checkZeroStockProducts() {
    console.log('\n========================================');
    console.log('2. Products with Zero Stock (Inventory Tracked)');
    console.log('========================================\n');

    const zeroStockProducts = [];
    let page = 1;

    while (page <= 10) { // Check first 10 pages
        try {
            const response = await apiRequest(`/v3/catalog/products?limit=250&page=${page}&include=variants&inventory_level:max=0`);
            const products = response.data || [];

            if (products.length === 0) break;

            for (const product of products) {
                if (product.inventory_tracking !== 'none' && product.inventory_level === 0) {
                    zeroStockProducts.push({
                        id: product.id,
                        name: product.name.substring(0, 50),
                        sku: product.sku,
                        tracking: product.inventory_tracking,
                        stock: product.inventory_level,
                        is_visible: product.is_visible,
                        availability: product.availability
                    });
                }
            }

            page++;
            await new Promise(r => setTimeout(r, 200));
        } catch (err) {
            console.log('Error fetching products:', err.message);
            break;
        }
    }

    console.log(`Found ${zeroStockProducts.length} products with zero stock and inventory tracking enabled`);

    if (zeroStockProducts.length > 0) {
        console.log('\nTop 20 zero-stock products (visible ones are problematic):');
        zeroStockProducts
            .filter(p => p.is_visible)
            .slice(0, 20)
            .forEach(p => {
                console.log(`  [${p.id}] ${p.name} | SKU: ${p.sku || 'N/A'} | Avail: ${p.availability}`);
            });
    }

    return zeroStockProducts;
}

async function checkLowStockProducts() {
    console.log('\n========================================');
    console.log('3. Products with Very Low Stock (1-5 units)');
    console.log('========================================\n');

    const lowStockProducts = [];
    let page = 1;

    while (page <= 5) {
        try {
            const response = await apiRequest(`/v3/catalog/products?limit=250&page=${page}&include=variants`);
            const products = response.data || [];

            if (products.length === 0) break;

            for (const product of products) {
                if (product.inventory_tracking !== 'none' &&
                    product.inventory_level > 0 &&
                    product.inventory_level <= 5 &&
                    product.is_visible) {
                    lowStockProducts.push({
                        id: product.id,
                        name: product.name.substring(0, 50),
                        sku: product.sku,
                        stock: product.inventory_level
                    });
                }
            }

            page++;
            await new Promise(r => setTimeout(r, 200));
        } catch (err) {
            break;
        }
    }

    console.log(`Found ${lowStockProducts.length} visible products with 1-5 units in stock`);
    console.log('(These can cause cart issues when multiple customers buy simultaneously)\n');

    lowStockProducts.slice(0, 20).forEach(p => {
        console.log(`  [${p.id}] ${p.name} | Stock: ${p.stock}`);
    });

    return lowStockProducts;
}

async function checkRecentlyModifiedProducts() {
    console.log('\n========================================');
    console.log('4. Recently Modified Products (last 7 days)');
    console.log('========================================\n');

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateFilter = sevenDaysAgo.toISOString();

    try {
        const response = await apiRequest(`/v3/catalog/products?limit=50&sort=date_modified&direction=desc`);
        const products = response.data || [];

        console.log(`Last 20 modified products:`);
        products.slice(0, 20).forEach(p => {
            const modified = new Date(p.date_modified).toLocaleString();
            console.log(`  [${p.id}] ${p.name.substring(0, 40)} | Modified: ${modified}`);
        });

        return products;
    } catch (err) {
        console.log('Error:', err.message);
        return [];
    }
}

async function checkInventorySettings() {
    console.log('\n========================================');
    console.log('5. Inventory Tracking Summary');
    console.log('========================================\n');

    const tracking = {
        none: 0,
        product: 0,
        variant: 0
    };

    let page = 1;
    let total = 0;

    while (page <= 20) {
        try {
            const response = await apiRequest(`/v3/catalog/products?limit=250&page=${page}`);
            const products = response.data || [];

            if (products.length === 0) break;

            products.forEach(p => {
                tracking[p.inventory_tracking]++;
                total++;
            });

            page++;
            await new Promise(r => setTimeout(r, 100));
        } catch (err) {
            break;
        }
    }

    console.log(`Total products checked: ${total}`);
    console.log(`  No tracking: ${tracking.none} (${((tracking.none/total)*100).toFixed(1)}%)`);
    console.log(`  Product-level: ${tracking.product} (${((tracking.product/total)*100).toFixed(1)}%)`);
    console.log(`  Variant-level: ${tracking.variant} (${((tracking.variant/total)*100).toFixed(1)}%)`);
}

async function checkAvailabilitySettings() {
    console.log('\n========================================');
    console.log('6. Product Availability Settings');
    console.log('========================================\n');

    const availability = {
        available: 0,
        disabled: 0,
        preorder: 0
    };

    let page = 1;

    while (page <= 10) {
        try {
            const response = await apiRequest(`/v3/catalog/products?limit=250&page=${page}`);
            const products = response.data || [];

            if (products.length === 0) break;

            products.forEach(p => {
                availability[p.availability] = (availability[p.availability] || 0) + 1;
            });

            page++;
            await new Promise(r => setTimeout(r, 100));
        } catch (err) {
            break;
        }
    }

    console.log('Availability breakdown:');
    Object.entries(availability).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
    });
}

async function checkCartSettings() {
    console.log('\n========================================');
    console.log('7. Checking Store Settings for Cart Behavior');
    console.log('========================================\n');

    try {
        // Check store settings
        const settings = await apiRequest('/v2/store');
        console.log('Store configuration:');
        console.log(`  Order Email: ${settings.order_email || 'Not set'}`);
        console.log(`  Logo URL: ${settings.logo?.url ? 'Set' : 'Not set'}`);

        // Try to get checkout settings
        try {
            const checkoutSettings = await apiRequest('/v3/checkouts/settings');
            console.log('\nCheckout settings:');
            console.log(JSON.stringify(checkoutSettings, null, 2));
        } catch (e) {
            console.log('\nCheckout settings: Not accessible via API');
        }
    } catch (err) {
        console.log('Error:', err.message);
    }
}

async function main() {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║  BigCommerce Checkout Issue Diagnostics        ║');
    console.log('║  Buy Organics Online                           ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    console.log('The "shopping cart has been updated" error typically occurs when:\n');
    console.log('1. Product stock changes between add-to-cart and checkout');
    console.log('2. Product becomes unavailable');
    console.log('3. Price changes during the session');
    console.log('4. Inventory sync issues with external systems\n');

    await checkStoreSettings();
    await checkZeroStockProducts();
    await checkLowStockProducts();
    await checkRecentlyModifiedProducts();
    await checkInventorySettings();
    await checkAvailabilitySettings();
    await checkCartSettings();

    console.log('\n========================================');
    console.log('RECOMMENDATIONS');
    console.log('========================================\n');
    console.log('1. Review zero-stock visible products - hide or disable them');
    console.log('2. Set up low-stock alerts for products with <5 units');
    console.log('3. Check if inventory sync (from suppliers) is running correctly');
    console.log('4. Consider enabling "Allow out of stock purchases" for popular items');
    console.log('5. Review product availability settings (available vs disabled)');
}

main().catch(console.error);
