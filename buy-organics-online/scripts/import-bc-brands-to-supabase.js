/**
 * Import BigCommerce brands into Supabase seo_brands table
 * Prerequisites: Run 010_seo_team_schema.sql migration first
 */

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://usibnysqelovfuctmkqw.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'
);

async function importBrands() {
    console.log('Importing BigCommerce brands to Supabase...\n');

    // Read the JSON file
    const brands = JSON.parse(fs.readFileSync('bc-brands.json', 'utf8'));
    console.log(`Found ${brands.length} brands to import\n`);

    // Insert brands
    console.log('Inserting brands...');
    let inserted = 0;
    let errors = 0;

    for (const brand of brands) {
        const insertData = {
            bc_brand_id: brand.bc_brand_id,
            name: brand.name,
            slug: brand.slug,
            url: brand.url,
            description: brand.description,
            content_status: brand.meta_description ? 'needs_update' : 'no_content'
        };

        const { error } = await supabase
            .from('seo_brands')
            .upsert(insertData, { onConflict: 'bc_brand_id' });

        if (error) {
            // Handle duplicate name errors by appending brand ID
            if (error.message.includes('duplicate key') && error.message.includes('name')) {
                insertData.name = `${brand.name} (${brand.bc_brand_id})`;
                const { error: retryError } = await supabase
                    .from('seo_brands')
                    .upsert(insertData, { onConflict: 'bc_brand_id' });

                if (retryError) {
                    console.error(`Error inserting brand ${brand.name}:`, retryError.message);
                    errors++;
                } else {
                    inserted++;
                }
            } else {
                console.error(`Error inserting brand ${brand.name}:`, error.message);
                errors++;
            }
        } else {
            inserted++;
        }
    }

    console.log(`Inserted ${inserted} brands (${errors} errors)\n`);

    // Count products per brand from ecommerce_products
    console.log('Counting products per brand...');

    const { data: products, error: prodError } = await supabase
        .from('ecommerce_products')
        .select('id, brand, is_visible');

    if (prodError) {
        console.error('Error fetching products:', prodError.message);
        return;
    }

    // Count products per brand name
    const brandCounts = new Map();
    const activeCounts = new Map();

    for (const product of products) {
        if (product.brand) {
            const brandName = product.brand.trim();
            brandCounts.set(brandName, (brandCounts.get(brandName) || 0) + 1);
            if (product.is_visible) {
                activeCounts.set(brandName, (activeCounts.get(brandName) || 0) + 1);
            }
        }
    }

    // Update counts in seo_brands
    for (const [brandName, count] of brandCounts) {
        const activeCount = activeCounts.get(brandName) || 0;

        await supabase
            .from('seo_brands')
            .update({
                product_count: count,
                active_product_count: activeCount
            })
            .eq('name', brandName);
    }

    console.log('Updated product counts\n');

    // Summary
    const { data: summary, error: sumError } = await supabase
        .from('seo_brands')
        .select('content_status, product_count');

    if (!sumError) {
        const statusCounts = summary.reduce((acc, brand) => {
            acc[brand.content_status] = (acc[brand.content_status] || 0) + 1;
            return acc;
        }, {});

        const brandsWithProducts = summary.filter(b => b.product_count > 0).length;
        const topBrands = summary.sort((a, b) => b.product_count - a.product_count).slice(0, 10);

        console.log('Brand Content Status:');
        Object.entries(statusCounts).forEach(([status, count]) => {
            console.log(`  ${status}: ${count}`);
        });

        console.log(`\nBrands with products: ${brandsWithProducts}`);
        console.log('\nTop 10 brands by product count:');
        topBrands.forEach((b, i) => {
            console.log(`  ${i + 1}. ${b.product_count} products`);
        });
    }

    console.log('\n✓ Import complete!');
}

importBrands().catch(console.error);
