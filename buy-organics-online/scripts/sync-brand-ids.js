const https = require('https');
const { createClient } = require('@supabase/supabase-js');

// BigCommerce credentials
const BC_STORE_HASH = 'hhhi';
const BC_ACCESS_TOKEN = 'a96rfpx8xvhkb23h7esqy3y1i0jynpt';

// Supabase credentials
const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function fetchPage(page = 1) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.bigcommerce.com',
            path: `/stores/${BC_STORE_HASH}/v3/catalog/products?include_fields=id,brand_id&limit=250&page=${page}`,
            headers: {
                'X-Auth-Token': BC_ACCESS_TOKEN,
                'Accept': 'application/json'
            }
        };

        https.get(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function fetchAllProducts() {
    let allProducts = [];
    let page = 1;
    let hasMore = true;

    console.log('Fetching products with brand_id from BigCommerce...');

    while (hasMore) {
        const response = await fetchPage(page);
        const products = response.data || [];
        allProducts = allProducts.concat(products);

        console.log(`Page ${page}: ${products.length} products (total: ${allProducts.length})`);

        hasMore = response.meta?.pagination?.total_pages > page;
        page++;

        // Rate limit
        await new Promise(r => setTimeout(r, 200));
    }

    return allProducts;
}

async function main() {
    try {
        // Fetch all products with brand_id
        const products = await fetchAllProducts();
        console.log(`\nFetched ${products.length} products`);

        // Filter products with brand_id
        const withBrand = products.filter(p => p.brand_id && p.brand_id > 0);
        console.log(`Products with brand_id: ${withBrand.length}`);

        // Get brand mapping from seo_brands
        const { data: brands, error: brandError } = await supabase
            .from('seo_brands')
            .select('id, bc_brand_id, name');

        if (brandError) throw brandError;

        const brandMap = {};
        brands.forEach(b => {
            brandMap[b.bc_brand_id] = { id: b.id, name: b.name };
        });

        console.log(`Loaded ${brands.length} brands from seo_brands`);

        // Update ecommerce_products with brand name
        let updated = 0;
        let errors = 0;
        const batchSize = 100;

        for (let i = 0; i < withBrand.length; i += batchSize) {
            const batch = withBrand.slice(i, i + batchSize);

            for (const product of batch) {
                const brand = brandMap[product.brand_id];
                if (brand) {
                    const { error } = await supabase
                        .from('ecommerce_products')
                        .update({ brand: brand.name })
                        .eq('product_id', product.id);

                    if (error) {
                        errors++;
                    } else {
                        updated++;
                    }
                }
            }

            console.log(`Updated ${updated}/${withBrand.length} products...`);
        }

        console.log(`\nUpdated ${updated} products with brand names (${errors} errors)`);

        // Now update seo_products.has_brand
        const { error: seoError } = await supabase.rpc('raw_sql', {
            query: `
                UPDATE seo_products sp
                SET has_brand = true
                FROM ecommerce_products ep
                WHERE sp.ecommerce_product_id = ep.id
                AND ep.brand IS NOT NULL AND ep.brand != ''
            `
        });

        // Update seo_brands product counts
        const { data: brandCounts } = await supabase
            .from('ecommerce_products')
            .select('brand')
            .not('brand', 'is', null);

        // Count by brand
        const counts = {};
        brandCounts?.forEach(p => {
            counts[p.brand] = (counts[p.brand] || 0) + 1;
        });

        // Update each brand
        for (const [brandName, count] of Object.entries(counts)) {
            await supabase
                .from('seo_brands')
                .update({ product_count: count })
                .eq('name', brandName);
        }

        console.log('Updated seo_brands product counts');

        // Final stats
        const { data: stats } = await supabase
            .from('seo_brands')
            .select('product_count')
            .gt('product_count', 0);

        console.log(`\nBrands with products: ${stats?.length || 0}`);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

main();
