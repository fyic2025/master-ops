/**
 * Test Enrichment Schema Mapping
 * Tests the mapping logic without database dependencies
 */

const { createClient } = require('@supabase/supabase-js');
const {
    mapToStandard,
    mapUHPToStandard,
    mapKadacToStandard,
    mapOborneToStandard,
    generateDietaryBadges,
    generateSchemaOrg
} = require('./lib/enrichment-schema');

const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testEnrichment() {
    console.log('='.repeat(60));
    console.log('ENRICHMENT SCHEMA MAPPING TEST');
    console.log('='.repeat(60));

    // Test with UHP products
    console.log('\n--- Testing UHP Products ---\n');

    const { data: uhpProducts } = await supabase
        .from('supplier_products')
        .select('*')
        .ilike('supplier_name', '%uhp%')
        .limit(3);

    if (uhpProducts?.length > 0) {
        console.log(`Found ${uhpProducts.length} UHP products\n`);

        for (const product of uhpProducts) {
            console.log(`Product: ${product.product_name}`);
            console.log(`  SKU: ${product.supplier_sku}`);

            const enriched = mapUHPToStandard(product);

            console.log(`  Enrichment Score: ${enriched.meta.enrichment_score}`);

            // Show dietary flags that are true
            const trueFlags = Object.entries(enriched.dietary)
                .filter(([k, v]) => v === true)
                .map(([k]) => k.replace('is_', ''));

            if (trueFlags.length > 0) {
                console.log(`  Dietary Flags: ${trueFlags.join(', ')}`);
            }

            // Show content availability
            if (enriched.content.ingredients) {
                console.log(`  Ingredients: ${enriched.content.ingredients.substring(0, 50)}...`);
            }

            // Show images
            if (enriched.images.primary_image) {
                console.log(`  Primary Image: ${enriched.images.primary_image.substring(0, 50)}...`);
            }

            // Generate badges
            const badges = generateDietaryBadges(enriched);
            if (badges.length > 0) {
                console.log(`  Badges: ${badges.map(b => b.label).join(', ')}`);
            }

            console.log('');
        }
    } else {
        console.log('No UHP products found');
    }

    // Test with Kadac products
    console.log('\n--- Testing Kadac Products ---\n');

    const { data: kadacProducts } = await supabase
        .from('supplier_products')
        .select('*')
        .ilike('supplier_name', '%kadac%')
        .limit(3);

    if (kadacProducts?.length > 0) {
        console.log(`Found ${kadacProducts.length} Kadac products\n`);

        for (const product of kadacProducts) {
            console.log(`Product: ${product.product_name}`);
            console.log(`  SKU: ${product.supplier_sku}`);

            const enriched = mapKadacToStandard(product);

            console.log(`  Enrichment Score: ${enriched.meta.enrichment_score}`);

            if (enriched.images.primary_image) {
                console.log(`  Primary Image: ${enriched.images.primary_image.substring(0, 50)}...`);
            }

            console.log('');
        }
    } else {
        console.log('No Kadac products found');
    }

    // Test with Oborne products
    console.log('\n--- Testing Oborne Products ---\n');

    const { data: oborneProducts } = await supabase
        .from('supplier_products')
        .select('*')
        .ilike('supplier_name', '%oborne%')
        .limit(3);

    if (oborneProducts?.length > 0) {
        console.log(`Found ${oborneProducts.length} Oborne products\n`);

        for (const product of oborneProducts) {
            console.log(`Product: ${product.product_name}`);
            console.log(`  SKU: ${product.supplier_sku}`);

            const enriched = mapOborneToStandard(product);

            console.log(`  Enrichment Score: ${enriched.meta.enrichment_score}`);
            console.log('');
        }
    } else {
        console.log('No Oborne products found');
    }

    // Test Schema.org generation
    console.log('\n--- Testing Schema.org Generation ---\n');

    if (uhpProducts?.length > 0) {
        const product = uhpProducts[0];
        const enriched = mapUHPToStandard(product);

        const schemaOrg = generateSchemaOrg({
            name: product.product_name,
            sku: product.supplier_sku,
            brand: product.brand
        }, enriched);

        console.log('Schema.org JSON-LD:');
        console.log(JSON.stringify(schemaOrg, null, 2));
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('ENRICHMENT QUALITY SUMMARY');
    console.log('='.repeat(60));

    // Count products by supplier
    const { data: supplierCounts } = await supabase
        .from('supplier_products')
        .select('supplier_name');

    const counts = {};
    supplierCounts?.forEach(p => {
        counts[p.supplier_name] = (counts[p.supplier_name] || 0) + 1;
    });

    console.log('\nSupplier Product Counts:');
    Object.entries(counts).forEach(([name, count]) => {
        console.log(`  ${name}: ${count}`);
    });

    // Sample enrichment scores
    console.log('\nAverage Enrichment Scores (sample):');

    if (uhpProducts?.length > 0) {
        const uhpScores = uhpProducts.map(p => mapUHPToStandard(p).meta.enrichment_score);
        console.log(`  UHP: ${Math.round(uhpScores.reduce((a, b) => a + b, 0) / uhpScores.length)}/100`);
    }

    if (kadacProducts?.length > 0) {
        const kadacScores = kadacProducts.map(p => mapKadacToStandard(p).meta.enrichment_score);
        console.log(`  Kadac: ${Math.round(kadacScores.reduce((a, b) => a + b, 0) / kadacScores.length)}/100`);
    }

    if (oborneProducts?.length > 0) {
        const oborneScores = oborneProducts.map(p => mapOborneToStandard(p).meta.enrichment_score);
        console.log(`  Oborne: ${Math.round(oborneScores.reduce((a, b) => a + b, 0) / oborneScores.length)}/100`);
    }
}

testEnrichment().catch(console.error);
