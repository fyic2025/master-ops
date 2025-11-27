/**
 * Classification Agent
 *
 * Purpose: Classify products into correct categories
 * - Analyzes product names, brands to suggest categories
 * - Calculates confidence scores
 * - Identifies miscategorized products
 * - Flags products needing new categories
 */

const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

// Configuration
const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_KEY = process.env.BOO_SUPABASE_SERVICE_ROLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Batch size for processing
const BATCH_SIZE = 50;

/**
 * Load all categories into a lookup structure
 */
async function loadCategories() {
    const { data: categories, error } = await supabase
        .from('seo_categories')
        .select('id, bc_category_id, name, slug, parent_id, product_count')
        .order('product_count', { ascending: false });

    if (error) throw error;

    // Build category tree and lookup
    const byId = {};
    const byName = {};
    const roots = [];

    for (const cat of categories) {
        byId[cat.id] = cat;
        byName[cat.name.toLowerCase()] = cat;
        if (!cat.parent_id) {
            roots.push(cat);
        }
    }

    // Build full paths for each category
    for (const cat of categories) {
        const path = [];
        let current = cat;
        while (current) {
            path.unshift(current.name);
            current = current.parent_id ? byId[current.parent_id] : null;
        }
        cat.fullPath = path.join(' > ');
    }

    return { categories, byId, byName, roots };
}

/**
 * Get products needing classification
 */
async function getUnclassifiedProducts(limit = BATCH_SIZE) {
    const { data: products, error } = await supabase
        .from('seo_products')
        .select(`
            id,
            ecommerce_product_id,
            bc_product_id,
            primary_category_id,
            classification_status,
            has_brand,
            ecommerce_products!inner(
                id,
                name,
                sku,
                brand,
                categories
            )
        `)
        .in('classification_status', ['unreviewed', 'needs_review'])
        .limit(limit);

    if (error) throw error;
    return products;
}

/**
 * Use Claude to classify a batch of products
 */
async function classifyProducts(products, categoryList) {
    // Build category list for prompt
    const categoryOptions = categoryList.slice(0, 100).map(c =>
        `- "${c.name}" (${c.product_count} products) [ID: ${c.id}]`
    ).join('\n');

    // Build products to classify
    const productList = products.map((p, i) => {
        const ep = p.ecommerce_products;
        return `${i + 1}. "${ep.name}" (SKU: ${ep.sku || 'N/A'}, Brand: ${ep.brand || 'Unknown'})`;
    }).join('\n');

    const prompt = `You are a product categorization expert for an organic health food store (Buy Organics Online).

## Available Categories (top 100 by product count):
${categoryOptions}

## Products to Classify:
${productList}

## Task:
For each product, suggest the BEST category from the list above. Consider:
- Product name keywords (ingredients, type, form)
- Brand context (organic, health-focused)
- Store focus (organic foods, supplements, health products)

## Response Format (JSON):
Return a JSON array with one object per product:
[
  {
    "index": 1,
    "category_id": "uuid-here",
    "category_name": "Category Name",
    "confidence": 0.95,
    "reasoning": "Brief explanation"
  }
]

Only return the JSON array, no other text.`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            max_tokens: 4096,
            messages: [{ role: 'user', content: prompt }]
        });

        const content = response.choices[0].message.content;
        // Extract JSON from response
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        throw new Error('No JSON found in response');
    } catch (error) {
        console.error('Classification error:', error.message);
        return null;
    }
}

/**
 * Update product classifications in database
 */
async function updateClassifications(products, classifications) {
    let updated = 0;
    let errors = 0;

    for (const classification of classifications) {
        const product = products[classification.index - 1];
        if (!product) continue;

        const { error } = await supabase
            .from('seo_products')
            .update({
                suggested_categories: JSON.stringify([{
                    category_id: classification.category_id,
                    category_name: classification.category_name,
                    confidence: classification.confidence,
                    reasoning: classification.reasoning
                }]),
                classification_confidence: classification.confidence,
                classification_status: classification.confidence >= 0.9 ? 'auto_classified' : 'needs_review',
                last_classified_at: new Date().toISOString()
            })
            .eq('id', product.id);

        if (error) {
            console.error(`Error updating product ${product.id}:`, error.message);
            errors++;
        } else {
            updated++;
        }
    }

    return { updated, errors };
}

/**
 * Log agent activity
 */
async function logActivity(action, details, status = 'completed') {
    await supabase.from('seo_agent_logs').insert({
        agent_name: 'classification',
        action,
        details,
        status
    });
}

/**
 * Main classification run
 */
async function runClassification(options = {}) {
    const maxProducts = options.limit || 200;
    const dryRun = options.dryRun || false;

    console.log('='.repeat(60));
    console.log('CLASSIFICATION AGENT - Starting');
    console.log('='.repeat(60));

    await logActivity('run_started', { maxProducts, dryRun }, 'started');

    try {
        // Load categories
        console.log('\nLoading categories...');
        const { categories } = await loadCategories();
        console.log(`Loaded ${categories.length} categories`);

        // Get unclassified products
        console.log('\nFetching unclassified products...');
        const products = await getUnclassifiedProducts(maxProducts);
        console.log(`Found ${products.length} products to classify`);

        if (products.length === 0) {
            console.log('No products need classification!');
            await logActivity('run_completed', { productsClassified: 0 });
            return { classified: 0, errors: 0 };
        }

        // Process in batches
        let totalUpdated = 0;
        let totalErrors = 0;

        for (let i = 0; i < products.length; i += BATCH_SIZE) {
            const batch = products.slice(i, i + BATCH_SIZE);
            console.log(`\nProcessing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(products.length / BATCH_SIZE)} (${batch.length} products)`);

            // Classify batch
            const classifications = await classifyProducts(batch, categories);

            if (!classifications) {
                console.log('  Classification failed for this batch');
                totalErrors += batch.length;
                continue;
            }

            console.log(`  Got ${classifications.length} classifications`);

            // Show results
            for (const c of classifications) {
                const product = batch[c.index - 1];
                const ep = product?.ecommerce_products;
                console.log(`  - "${ep?.name?.substring(0, 40)}..." → ${c.category_name} (${(c.confidence * 100).toFixed(0)}%)`);
            }

            // Update database
            if (!dryRun) {
                const result = await updateClassifications(batch, classifications);
                totalUpdated += result.updated;
                totalErrors += result.errors;
                console.log(`  Updated: ${result.updated}, Errors: ${result.errors}`);
            } else {
                console.log('  [DRY RUN - no updates]');
            }

            // Rate limiting pause between batches
            if (i + BATCH_SIZE < products.length) {
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('CLASSIFICATION COMPLETE');
        console.log('='.repeat(60));
        console.log(`Products classified: ${totalUpdated}`);
        console.log(`Errors: ${totalErrors}`);

        await logActivity('run_completed', {
            productsProcessed: products.length,
            productsClassified: totalUpdated,
            errors: totalErrors
        });

        return { classified: totalUpdated, errors: totalErrors };

    } catch (error) {
        console.error('Classification run failed:', error);
        await logActivity('run_failed', { error: error.message }, 'failed');
        throw error;
    }
}

/**
 * Get classification stats
 */
async function getStats() {
    const { data: stats } = await supabase
        .from('seo_products')
        .select('classification_status')
        .then(res => {
            const counts = {};
            for (const row of res.data || []) {
                counts[row.classification_status] = (counts[row.classification_status] || 0) + 1;
            }
            return { data: counts };
        });

    return stats;
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '200');
    const statsOnly = args.includes('--stats');

    if (statsOnly) {
        getStats().then(stats => {
            console.log('Classification Status:');
            console.log(JSON.stringify(stats, null, 2));
        });
    } else {
        runClassification({ limit, dryRun }).then(result => {
            console.log('\nResult:', result);
            process.exit(result.errors > 0 ? 1 : 0);
        }).catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
    }
}

module.exports = { runClassification, getStats, loadCategories };
