const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
    'https://usibnysqelovfuctmkqw.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'
);

async function checkBrands() {
    // Get sample product with metadata
    const { data, error } = await supabase
        .from('ecommerce_products')
        .select('id, sku, name, brand, metadata')
        .limit(3);

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    console.log('BRAND DATA ANALYSIS');
    console.log('===================\n');

    console.log('Sample product metadata structure:\n');
    data.forEach((p, i) => {
        console.log('Product ' + (i+1) + ': ' + (p.name || '').substring(0, 50));
        console.log('  brand column: ' + (p.brand || 'NULL'));

        const meta = p.metadata || {};
        const brandInfo = meta.brand;
        if (brandInfo && typeof brandInfo === 'object') {
            console.log('  metadata.brand.name: ' + (brandInfo.name || 'NULL'));
            console.log('  metadata.brand.id: ' + (brandInfo.id || 'NULL'));
        } else {
            console.log('  metadata.brand: ' + (brandInfo || 'NULL'));
        }
        console.log('  metadata keys: ' + Object.keys(meta).slice(0, 15).join(', '));
        console.log('');
    });

    // Fetch all products and analyze brands
    console.log('Fetching all products for brand analysis...\n');

    const allProducts = [];
    let offset = 0;
    const limit = 1000;

    while (true) {
        const { data: batch, error: batchErr } = await supabase
            .from('ecommerce_products')
            .select('metadata')
            .range(offset, offset + limit - 1);

        if (batchErr) {
            console.error('Batch error:', batchErr.message);
            break;
        }
        if (!batch || batch.length === 0) break;
        allProducts.push(...batch);
        offset += limit;
        if (batch.length < limit) break;
    }

    console.log('Total products: ' + allProducts.length + '\n');

    // Analyze brands from metadata
    let withBrand = 0;
    const brandNames = {};

    allProducts.forEach(p => {
        const meta = p.metadata || {};
        let brandName = null;

        if (meta.brand && typeof meta.brand === 'object') {
            brandName = meta.brand.name;
        } else if (typeof meta.brand === 'string') {
            brandName = meta.brand;
        }

        if (brandName) {
            withBrand++;
            brandNames[brandName] = (brandNames[brandName] || 0) + 1;
        }
    });

    console.log('Products with brand in metadata: ' + withBrand + '/' + allProducts.length);
    console.log('Products without brand: ' + (allProducts.length - withBrand));
    console.log('');

    // Top brands
    const sortedBrands = Object.entries(brandNames).sort((a, b) => b[1] - a[1]);

    console.log('Top 30 Brands (from metadata):');
    sortedBrands.slice(0, 30).forEach(([brand, count], i) => {
        console.log('  ' + (i + 1).toString().padStart(2) + '. ' + brand.padEnd(45) + count);
    });

    console.log('\nTotal unique brands: ' + Object.keys(brandNames).length);

    // Brands with 10+ products
    const brandsWithTenPlus = sortedBrands.filter(([_, count]) => count >= 10);
    console.log('Brands with 10+ products: ' + brandsWithTenPlus.length);

    // Also check categories in metadata
    console.log('\n\nCATEGORY DATA ANALYSIS');
    console.log('======================\n');

    let withCategories = 0;
    const categoryNames = {};

    allProducts.forEach(p => {
        const categories = p.metadata?.categories || [];
        if (categories.length > 0) {
            withCategories++;
            categories.forEach(cat => {
                const catName = cat.name || cat;
                if (catName) {
                    categoryNames[catName] = (categoryNames[catName] || 0) + 1;
                }
            });
        }
    });

    console.log('Products with categories: ' + withCategories + '/' + allProducts.length);
    console.log('Total unique categories: ' + Object.keys(categoryNames).length);

    const sortedCats = Object.entries(categoryNames).sort((a, b) => b[1] - a[1]);
    console.log('\nTop 20 Categories:');
    sortedCats.slice(0, 20).forEach(([cat, count], i) => {
        console.log('  ' + (i + 1).toString().padStart(2) + '. ' + cat.padEnd(50) + count);
    });

    console.log('\n===================');
    console.log('ANALYSIS COMPLETE');
}

checkBrands().catch(console.error);
