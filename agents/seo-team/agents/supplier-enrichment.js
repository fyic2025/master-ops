/**
 * Supplier Enrichment Agent
 *
 * Purpose: Aggregate and standardize product data from all suppliers
 * - Pull data from supplier_products table
 * - Map to standardized enrichment schema
 * - Match to BC products by barcode
 * - Store enriched data for use by other agents
 */

const { createClient } = require('@supabase/supabase-js');
const {
    mapToStandard,
    calculateEnrichmentScore,
    generateDietaryBadges
} = require('../lib/enrichment-schema');

// Configuration
const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_KEY = process.env.BOO_SUPABASE_SERVICE_ROLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Enrich products from a specific supplier
 */
async function enrichSupplierProducts(supplierName, options = {}) {
    const limit = options.limit || 100;
    const offset = options.offset || 0;

    console.log(`\nEnriching ${supplierName} products (offset: ${offset}, limit: ${limit})...`);

    // Get supplier products
    const { data: supplierProducts, error } = await supabase
        .from('supplier_products')
        .select('*')
        .ilike('supplier_name', `%${supplierName}%`)
        .range(offset, offset + limit - 1);

    if (error) {
        console.error(`Error fetching ${supplierName} products:`, error);
        return { processed: 0, errors: 1 };
    }

    console.log(`  Found ${supplierProducts.length} supplier products`);

    let enriched = 0;
    let matched = 0;
    let errors = 0;

    for (const product of supplierProducts) {
        try {
            // Map to standard schema
            const standardData = mapToStandard(product);

            // Try to find matching BC product by barcode
            let ecommerceProductId = null;
            if (product.barcode) {
                const { data: bcProduct } = await supabase
                    .from('ecommerce_products')
                    .select('id')
                    .or(`sku.eq.${product.barcode},metadata->gtin.eq.${product.barcode}`)
                    .single();

                if (bcProduct) {
                    ecommerceProductId = bcProduct.id;
                    matched++;
                }
            }

            // Prepare enrichment record
            const enrichmentRecord = {
                supplier_product_id: product.id,
                ecommerce_product_id: ecommerceProductId,
                barcode: product.barcode || null,

                // Dietary flags
                is_vegan: standardData.dietary?.is_vegan || false,
                is_vegetarian: standardData.dietary?.is_vegetarian || false,
                is_gluten_free: standardData.dietary?.is_gluten_free || false,
                is_dairy_free: standardData.dietary?.is_dairy_free || false,
                is_organic: standardData.dietary?.is_organic || false,
                is_certified_organic: standardData.dietary?.is_certified_organic || false,
                is_raw: standardData.dietary?.is_raw || false,
                is_keto: standardData.dietary?.is_keto || false,
                is_paleo: standardData.dietary?.is_paleo || false,
                is_sugar_free: standardData.dietary?.is_sugar_free || false,
                is_nut_free: standardData.dietary?.is_nut_free || false,
                is_soy_free: standardData.dietary?.is_soy_free || false,

                // Content
                ingredients: standardData.content?.ingredients || null,
                short_description: standardData.content?.short_description || null,
                usage_instructions: standardData.content?.usage_instructions || null,
                warnings: standardData.content?.warnings || null,
                storage_instructions: standardData.content?.storage_instructions || null,

                // Images
                primary_image_url: standardData.images?.primary_image || null,
                secondary_images: standardData.images?.secondary_images || [],
                nutrition_panel_url: standardData.images?.nutrition_panel || null,

                // Classification
                supplier_category: standardData.classification?.supplier_category || null,
                suggested_bc_categories: standardData.classification?.suggested_bc_categories || [],
                product_type: standardData.classification?.product_type || null,

                // Dimensions
                weight_kg: standardData.dimensions?.weight_kg || null,
                width_mm: standardData.dimensions?.width_mm || null,
                height_mm: standardData.dimensions?.height_mm || null,
                length_mm: standardData.dimensions?.length_mm || null,

                // Supplier info
                primary_supplier: standardData.supplier?.supplier_name || supplierName.toLowerCase(),
                supplier_sku: standardData.supplier?.supplier_sku || product.supplier_sku,
                cost_price: standardData.supplier?.cost_price || product.cost_price,
                rrp: standardData.supplier?.rrp || product.rrp,
                stock_level: standardData.supplier?.stock_level || product.stock_level,
                moq: standardData.supplier?.moq || null,
                is_active: standardData.supplier?.is_active ?? true,
                on_deal: standardData.supplier?.on_deal || false,
                is_clearance: standardData.supplier?.is_clearance || false,

                // Meta
                enrichment_source: standardData.meta?.enrichment_source || supplierName.toLowerCase(),
                enrichment_score: standardData.meta?.enrichment_score || 0,
                enrichment_version: 1,
                raw_enrichment: standardData,
                last_enriched_at: new Date().toISOString()
            };

            // Upsert to enriched_products (use barcode as conflict key if available)
            const { error: upsertError } = await supabase
                .from('enriched_products')
                .upsert(enrichmentRecord, {
                    onConflict: product.barcode ? 'barcode' : 'supplier_product_id',
                    ignoreDuplicates: false
                });

            if (upsertError) {
                // If unique constraint fails, try update by supplier_product_id
                const { error: updateError } = await supabase
                    .from('enriched_products')
                    .update(enrichmentRecord)
                    .eq('supplier_product_id', product.id);

                if (updateError) {
                    console.error(`  Error upserting product ${product.supplier_sku}:`, updateError.message);
                    errors++;
                    continue;
                }
            }

            enriched++;

            if (enriched % 50 === 0) {
                console.log(`  Enriched ${enriched}/${supplierProducts.length}...`);
            }

        } catch (err) {
            console.error(`  Error processing ${product.supplier_sku}:`, err.message);
            errors++;
        }
    }

    return { processed: supplierProducts.length, enriched, matched, errors };
}

/**
 * Enrich all suppliers
 */
async function enrichAllSuppliers(options = {}) {
    console.log('='.repeat(60));
    console.log('SUPPLIER ENRICHMENT AGENT');
    console.log('='.repeat(60));

    const suppliers = ['uhp', 'kadac', 'oborne'];
    const results = {};

    for (const supplier of suppliers) {
        console.log(`\n${'='.repeat(40)}`);
        console.log(`Processing: ${supplier.toUpperCase()}`);
        console.log('='.repeat(40));

        // Get total count for this supplier
        const { count } = await supabase
            .from('supplier_products')
            .select('*', { count: 'exact', head: true })
            .ilike('supplier_name', `%${supplier}%`);

        console.log(`Total products: ${count}`);

        // Process in batches
        const batchSize = options.batchSize || 100;
        let totalProcessed = 0;
        let totalEnriched = 0;
        let totalMatched = 0;
        let totalErrors = 0;

        for (let offset = 0; offset < count; offset += batchSize) {
            const result = await enrichSupplierProducts(supplier, {
                limit: batchSize,
                offset
            });

            totalProcessed += result.processed;
            totalEnriched += result.enriched;
            totalMatched += result.matched;
            totalErrors += result.errors;

            // Small delay between batches
            await new Promise(r => setTimeout(r, 100));
        }

        results[supplier] = {
            total: count,
            processed: totalProcessed,
            enriched: totalEnriched,
            matched: totalMatched,
            errors: totalErrors
        };

        console.log(`\n${supplier.toUpperCase()} Summary:`);
        console.log(`  Processed: ${totalProcessed}`);
        console.log(`  Enriched: ${totalEnriched}`);
        console.log(`  Matched to BC: ${totalMatched}`);
        console.log(`  Errors: ${totalErrors}`);
    }

    // Log to automation_logs
    await supabase.from('seo_agent_logs').insert({
        agent_name: 'supplier-enrichment',
        action: 'full_enrichment',
        details: results,
        status: 'completed'
    });

    return results;
}

/**
 * Get enrichment statistics
 */
async function getEnrichmentStats() {
    // Count by supplier
    const { data: bySupplier } = await supabase
        .from('enriched_products')
        .select('primary_supplier');

    const supplierCounts = {};
    bySupplier?.forEach(p => {
        supplierCounts[p.primary_supplier] = (supplierCounts[p.primary_supplier] || 0) + 1;
    });

    // Count matched to BC
    const { count: matchedCount } = await supabase
        .from('enriched_products')
        .select('*', { count: 'exact', head: true })
        .not('ecommerce_product_id', 'is', null);

    // Count with dietary flags
    const { data: withDietary } = await supabase
        .from('enriched_products')
        .select('is_vegan, is_gluten_free, is_organic, is_dairy_free');

    const dietaryCounts = {
        vegan: 0,
        gluten_free: 0,
        organic: 0,
        dairy_free: 0
    };

    withDietary?.forEach(p => {
        if (p.is_vegan) dietaryCounts.vegan++;
        if (p.is_gluten_free) dietaryCounts.gluten_free++;
        if (p.is_organic) dietaryCounts.organic++;
        if (p.is_dairy_free) dietaryCounts.dairy_free++;
    });

    // Average enrichment score by supplier
    const { data: scoreData } = await supabase
        .from('enriched_products')
        .select('primary_supplier, enrichment_score');

    const scoresBySupplier = {};
    const countsBySupplier = {};

    scoreData?.forEach(p => {
        if (!scoresBySupplier[p.primary_supplier]) {
            scoresBySupplier[p.primary_supplier] = 0;
            countsBySupplier[p.primary_supplier] = 0;
        }
        scoresBySupplier[p.primary_supplier] += p.enrichment_score;
        countsBySupplier[p.primary_supplier]++;
    });

    const avgScores = {};
    Object.keys(scoresBySupplier).forEach(supplier => {
        avgScores[supplier] = Math.round(scoresBySupplier[supplier] / countsBySupplier[supplier]);
    });

    return {
        total: bySupplier?.length || 0,
        by_supplier: supplierCounts,
        matched_to_bc: matchedCount,
        dietary_flags: dietaryCounts,
        avg_enrichment_score: avgScores
    };
}

/**
 * Get products with highest enrichment scores (best data quality)
 */
async function getBestEnrichedProducts(limit = 10) {
    const { data } = await supabase
        .from('enriched_products')
        .select('*')
        .not('ecommerce_product_id', 'is', null)
        .order('enrichment_score', { ascending: false })
        .limit(limit);

    return data?.map(p => ({
        supplier_sku: p.supplier_sku,
        supplier: p.primary_supplier,
        score: p.enrichment_score,
        has_ingredients: !!p.ingredients,
        has_images: !!p.primary_image_url,
        dietary_badges: generateDietaryBadges({
            dietary: {
                is_vegan: p.is_vegan,
                is_vegetarian: p.is_vegetarian,
                is_gluten_free: p.is_gluten_free,
                is_dairy_free: p.is_dairy_free,
                is_organic: p.is_organic,
                is_certified_organic: p.is_certified_organic,
                is_raw: p.is_raw,
                is_keto: p.is_keto,
                is_paleo: p.is_paleo
            }
        }).map(b => b.label)
    }));
}

/**
 * Match enriched products to BC products by barcode
 */
async function matchToEcommerceProducts(options = {}) {
    console.log('='.repeat(60));
    console.log('MATCHING ENRICHED PRODUCTS TO BC');
    console.log('='.repeat(60));

    // Get enriched products with barcodes but no BC match
    const { data: unmatched } = await supabase
        .from('enriched_products')
        .select('id, barcode, supplier_sku')
        .is('ecommerce_product_id', null)
        .not('barcode', 'is', null)
        .limit(options.limit || 500);

    console.log(`\nFound ${unmatched?.length || 0} unmatched products with barcodes`);

    let matched = 0;
    let notFound = 0;

    for (const product of unmatched || []) {
        // Try to find BC product by barcode in various fields
        const { data: bcProducts } = await supabase
            .from('ecommerce_products')
            .select('id, sku, name')
            .or(`sku.eq.${product.barcode},metadata->gtin.eq.${product.barcode},metadata->upc.eq.${product.barcode}`)
            .limit(1);

        if (bcProducts?.length > 0) {
            const bcProduct = bcProducts[0];

            await supabase
                .from('enriched_products')
                .update({ ecommerce_product_id: bcProduct.id })
                .eq('id', product.id);

            matched++;
            console.log(`  Matched: ${product.supplier_sku} -> ${bcProduct.name?.substring(0, 40)}...`);
        } else {
            notFound++;
        }
    }

    console.log(`\nMatching complete:`);
    console.log(`  Matched: ${matched}`);
    console.log(`  Not found in BC: ${notFound}`);

    return { matched, notFound };
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0] || 'stats';

    if (command === 'enrich') {
        const supplier = args[1] || 'all';
        if (supplier === 'all') {
            enrichAllSuppliers().then(results => {
                console.log('\n' + '='.repeat(60));
                console.log('FINAL RESULTS');
                console.log('='.repeat(60));
                console.log(JSON.stringify(results, null, 2));
            });
        } else {
            enrichSupplierProducts(supplier, { limit: 1000 }).then(result => {
                console.log('\nResult:', result);
            });
        }
    } else if (command === 'match') {
        matchToEcommerceProducts().then(result => {
            console.log('\nMatching result:', result);
        });
    } else if (command === 'stats') {
        getEnrichmentStats().then(stats => {
            console.log('Enrichment Statistics:');
            console.log(JSON.stringify(stats, null, 2));
        });
    } else if (command === 'best') {
        getBestEnrichedProducts(20).then(products => {
            console.log('Best Enriched Products:');
            products.forEach(p => {
                console.log(`  ${p.supplier_sku} (${p.supplier}) - Score: ${p.score}`);
                if (p.dietary_badges.length > 0) {
                    console.log(`    Badges: ${p.dietary_badges.join(', ')}`);
                }
            });
        });
    } else {
        console.log('Usage: node supplier-enrichment.js [command]');
        console.log('Commands:');
        console.log('  enrich [supplier|all] - Enrich products from supplier(s)');
        console.log('  match                 - Match enriched products to BC by barcode');
        console.log('  stats                 - Show enrichment statistics');
        console.log('  best                  - Show best enriched products');
    }
}

module.exports = {
    enrichSupplierProducts,
    enrichAllSuppliers,
    matchToEcommerceProducts,
    getEnrichmentStats,
    getBestEnrichedProducts
};
