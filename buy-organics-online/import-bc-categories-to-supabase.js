/**
 * Import BigCommerce categories into Supabase seo_categories table
 * Prerequisites: Run 010_seo_team_schema.sql migration first
 */

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://usibnysqelovfuctmkqw.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'
);

async function importCategories() {
    console.log('Importing BigCommerce categories to Supabase...\n');

    // Read the JSON file
    const categories = JSON.parse(fs.readFileSync('bc-categories.json', 'utf8'));
    console.log(`Found ${categories.length} categories to import\n`);

    // First pass: Insert all categories without parent references
    console.log('Pass 1: Inserting categories...');
    const bcToUuid = new Map(); // Map BC ID to Supabase UUID

    for (const cat of categories) {
        const insertData = {
            bc_category_id: cat.bc_category_id,
            name: cat.name,
            slug: cat.slug,
            url: cat.url,
            description: cat.description,
            meta_title: cat.meta_title,
            meta_description: cat.meta_description,
            depth: cat.depth,
            has_description: !!cat.description && cat.description.length > 0,
            description_word_count: cat.description ? cat.description.split(/\s+/).length : 0,
            status: 'active'
        };

        const { data, error } = await supabase
            .from('seo_categories')
            .upsert(insertData, { onConflict: 'bc_category_id' })
            .select('id, bc_category_id')
            .single();

        if (error) {
            console.error(`Error inserting category ${cat.name}:`, error.message);
        } else {
            bcToUuid.set(cat.bc_category_id, data.id);
        }
    }

    console.log(`Inserted ${bcToUuid.size} categories\n`);

    // Second pass: Update parent references
    console.log('Pass 2: Updating parent references...');
    let parentUpdates = 0;

    for (const cat of categories) {
        if (cat.parent_bc_id && cat.parent_bc_id !== 0) {
            const parentUuid = bcToUuid.get(cat.parent_bc_id);
            const selfUuid = bcToUuid.get(cat.bc_category_id);

            if (parentUuid && selfUuid) {
                const { error } = await supabase
                    .from('seo_categories')
                    .update({ parent_id: parentUuid })
                    .eq('id', selfUuid);

                if (error) {
                    console.error(`Error updating parent for ${cat.name}:`, error.message);
                } else {
                    parentUpdates++;
                }
            }
        }
    }

    console.log(`Updated ${parentUpdates} parent references\n`);

    // Count products per category from ecommerce_products
    console.log('Pass 3: Counting products per category...');

    const { data: products, error: prodError } = await supabase
        .from('ecommerce_products')
        .select('id, categories, is_visible');

    if (prodError) {
        console.error('Error fetching products:', prodError.message);
        return;
    }

    // Count products per BC category ID
    const categoryCounts = new Map();
    const activeCounts = new Map();

    for (const product of products) {
        if (product.categories && Array.isArray(product.categories)) {
            for (const catId of product.categories) {
                categoryCounts.set(catId, (categoryCounts.get(catId) || 0) + 1);
                if (product.is_visible) {
                    activeCounts.set(catId, (activeCounts.get(catId) || 0) + 1);
                }
            }
        }
    }

    // Update counts in seo_categories
    for (const [bcCatId, count] of categoryCounts) {
        const activeCount = activeCounts.get(bcCatId) || 0;

        // Determine status based on product count
        let status = 'active';
        if (count === 0) status = 'empty';
        else if (count < 5) status = 'sparse';
        else if (count > 500) status = 'overstuffed';

        await supabase
            .from('seo_categories')
            .update({
                product_count: count,
                active_product_count: activeCount,
                status: status
            })
            .eq('bc_category_id', bcCatId);
    }

    console.log('Updated product counts\n');

    // Summary
    const { data: summary, error: sumError } = await supabase
        .from('seo_categories')
        .select('status');

    if (!sumError) {
        const statusCounts = summary.reduce((acc, cat) => {
            acc[cat.status] = (acc[cat.status] || 0) + 1;
            return acc;
        }, {});

        console.log('Category Status Summary:');
        Object.entries(statusCounts).forEach(([status, count]) => {
            console.log(`  ${status}: ${count}`);
        });
    }

    console.log('\n✓ Import complete!');
}

importCategories().catch(console.error);
