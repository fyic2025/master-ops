/**
 * Fetch all BigCommerce categories for SEO team
 * Outputs to JSON for import into Supabase seo_categories table
 */

const https = require('https');
const fs = require('fs');

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

async function fetchAllCategories() {
    console.log('Fetching BigCommerce categories...\n');

    const allCategories = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
        try {
            const response = await apiRequest(`/v3/catalog/categories?limit=250&page=${page}`);
            const categories = response.data || [];

            allCategories.push(...categories);
            console.log(`Page ${page}: ${categories.length} categories`);

            hasMore = categories.length === 250;
            page++;

            // Rate limiting
            await new Promise(r => setTimeout(r, 200));
        } catch (error) {
            console.error('Error fetching categories:', error.message);
            break;
        }
    }

    console.log(`\nTotal categories fetched: ${allCategories.length}`);

    // Transform for seo_categories table
    const seoCategories = allCategories.map(cat => ({
        bc_category_id: cat.id,
        name: cat.name,
        slug: cat.custom_url?.url?.replace(/\//g, '') || cat.name.toLowerCase().replace(/\s+/g, '-'),
        parent_bc_id: cat.parent_id || null,
        url: cat.custom_url?.url || null,
        description: cat.description || null,
        meta_title: cat.page_title || null,
        meta_description: cat.meta_description || null,
        is_visible: cat.is_visible,
        sort_order: cat.sort_order,
        image_url: cat.image_url || null,
        product_count: 0, // Will be populated later
        depth: 0 // Will be calculated
    }));

    // Calculate depth based on parent relationships
    const categoryMap = new Map(seoCategories.map(c => [c.bc_category_id, c]));

    function calculateDepth(cat) {
        if (!cat.parent_bc_id || cat.parent_bc_id === 0) return 0;
        const parent = categoryMap.get(cat.parent_bc_id);
        if (!parent) return 0;
        return 1 + calculateDepth(parent);
    }

    seoCategories.forEach(cat => {
        cat.depth = calculateDepth(cat);
    });

    // Save to file
    fs.writeFileSync('bc-categories.json', JSON.stringify(seoCategories, null, 2));
    console.log('\n✓ Saved to bc-categories.json');

    // Summary
    const rootCategories = seoCategories.filter(c => !c.parent_bc_id || c.parent_bc_id === 0);
    const maxDepth = Math.max(...seoCategories.map(c => c.depth));

    console.log('\nCategory Structure:');
    console.log(`  Root categories: ${rootCategories.length}`);
    console.log(`  Max depth: ${maxDepth}`);

    // Show tree structure for root categories
    console.log('\nRoot categories:');
    rootCategories.slice(0, 20).forEach(cat => {
        const children = seoCategories.filter(c => c.parent_bc_id === cat.bc_category_id);
        console.log(`  ${cat.name} (${children.length} children)`);
    });
    if (rootCategories.length > 20) {
        console.log(`  ... and ${rootCategories.length - 20} more`);
    }

    return seoCategories;
}

fetchAllCategories().catch(console.error);
