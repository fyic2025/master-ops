/**
 * Content Format Agent
 *
 * Purpose: Analyze and standardize product descriptions
 * - Detect products with no description
 * - Identify non-standard formats
 * - Queue products for content generation
 * - Calculate content quality scores
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_KEY = process.env.BOO_SUPABASE_SERVICE_ROLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Standard format patterns to detect
const FORMAT_PATTERNS = {
    standard: {
        name: 'standard_format',
        patterns: [
            /## Key Benefits/i,
            /## How to Use/i,
            /## Ingredients/i
        ],
        minMatches: 2
    },
    legacy_html: {
        name: 'legacy_html',
        patterns: [
            /<p>/i,
            /<br\s*\/?>/i,
            /<strong>/i,
            /<ul>/i
        ],
        minMatches: 2
    },
    plain_text: {
        name: 'plain_text',
        patterns: [
            /^[^<#*]+$/  // No HTML or markdown
        ],
        minMatches: 1
    },
    bullet_list: {
        name: 'bullet_list',
        patterns: [
            /^[-*•]\s/m,
            /\n[-*•]\s/
        ],
        minMatches: 1
    }
};

/**
 * Detect the format of a description
 */
function detectFormat(description) {
    if (!description || description.trim() === '') {
        return { format: 'none', confidence: 1.0 };
    }

    const text = description.trim();
    const wordCount = text.split(/\s+/).length;

    // Check each format pattern
    const scores = {};
    for (const [key, format] of Object.entries(FORMAT_PATTERNS)) {
        let matches = 0;
        for (const pattern of format.patterns) {
            if (pattern.test(text)) matches++;
        }
        scores[key] = matches / format.patterns.length;
    }

    // Find best match
    let bestFormat = 'unknown';
    let bestScore = 0;
    for (const [key, score] of Object.entries(scores)) {
        if (score > bestScore) {
            bestFormat = FORMAT_PATTERNS[key].name;
            bestScore = score;
        }
    }

    // Calculate quality score (0-100)
    let qualityScore = 0;
    qualityScore += Math.min(wordCount / 3, 30);  // Up to 30 points for word count (100+ words)
    qualityScore += scores.standard * 40;          // Up to 40 points for standard format
    qualityScore += (wordCount > 50 && wordCount < 500) ? 20 : 10;  // 20 points for good length
    qualityScore += text.includes('## ') ? 10 : 0; // 10 points for markdown headers

    return {
        format: bestFormat,
        confidence: bestScore,
        wordCount,
        qualityScore: Math.round(qualityScore),
        scores
    };
}

/**
 * Analyze products and update content status
 */
async function analyzeProducts(options = {}) {
    const limit = options.limit || 1000;
    const updateDb = options.updateDb !== false;

    console.log('='.repeat(60));
    console.log('CONTENT FORMAT AGENT - Starting Analysis');
    console.log('='.repeat(60));

    // Get products with their descriptions from BigCommerce metadata
    // Note: ecommerce_products doesn't have description, need to check BC API or metadata
    const { data: products, error } = await supabase
        .from('seo_products')
        .select(`
            id,
            ecommerce_product_id,
            content_status,
            format_detected,
            description_word_count,
            content_quality_score,
            ecommerce_products!inner(
                id,
                name,
                sku,
                metadata
            )
        `)
        .in('content_status', ['unknown', null])
        .limit(limit);

    if (error) {
        console.error('Error fetching products:', error);
        return;
    }

    console.log(`\nAnalyzing ${products.length} products...`);

    const stats = {
        no_description: 0,
        standard_format: 0,
        legacy_html: 0,
        plain_text: 0,
        bullet_list: 0,
        unknown: 0,
        total: products.length
    };

    const updates = [];

    for (const product of products) {
        const ep = product.ecommerce_products;
        // Try to get description from metadata
        const description = ep.metadata?.description || '';

        const analysis = detectFormat(description);

        stats[analysis.format] = (stats[analysis.format] || 0) + 1;

        // Determine content status
        let contentStatus = 'unknown';
        if (analysis.format === 'none') {
            contentStatus = 'no_description';
        } else if (analysis.format === 'standard_format' && analysis.confidence >= 0.5) {
            contentStatus = 'standard_format';
        } else {
            contentStatus = 'needs_format';
        }

        updates.push({
            id: product.id,
            content_status: contentStatus,
            format_detected: analysis.format,
            description_word_count: analysis.wordCount || 0,
            content_quality_score: analysis.qualityScore
        });

        // Log sample products
        if (updates.length <= 10) {
            console.log(`  - "${ep.name?.substring(0, 40)}..." → ${analysis.format} (${analysis.wordCount || 0} words, quality: ${analysis.qualityScore})`);
        }
    }

    // Update database
    if (updateDb && updates.length > 0) {
        console.log(`\nUpdating ${updates.length} products in database...`);

        let updated = 0;
        let errors = 0;

        for (const update of updates) {
            const { error } = await supabase
                .from('seo_products')
                .update({
                    content_status: update.content_status,
                    format_detected: update.format_detected,
                    description_word_count: update.description_word_count,
                    content_quality_score: update.content_quality_score
                })
                .eq('id', update.id);

            if (error) {
                errors++;
            } else {
                updated++;
            }
        }

        console.log(`Updated: ${updated}, Errors: ${errors}`);
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('CONTENT FORMAT ANALYSIS SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total products analyzed: ${stats.total}`);
    console.log(`No description: ${stats.no_description} (${(stats.no_description / stats.total * 100).toFixed(1)}%)`);
    console.log(`Standard format: ${stats.standard_format} (${(stats.standard_format / stats.total * 100).toFixed(1)}%)`);
    console.log(`Legacy HTML: ${stats.legacy_html} (${(stats.legacy_html / stats.total * 100).toFixed(1)}%)`);
    console.log(`Plain text: ${stats.plain_text} (${(stats.plain_text / stats.total * 100).toFixed(1)}%)`);
    console.log(`Bullet list: ${stats.bullet_list} (${(stats.bullet_list / stats.total * 100).toFixed(1)}%)`);
    console.log(`Unknown: ${stats.unknown} (${(stats.unknown / stats.total * 100).toFixed(1)}%)`);

    // Log activity
    await supabase.from('seo_agent_logs').insert({
        agent_name: 'content-format',
        action: 'analysis_completed',
        details: stats,
        status: 'completed'
    });

    return stats;
}

/**
 * Get content status summary
 */
async function getContentStats() {
    const { data, error } = await supabase
        .from('seo_products')
        .select('content_status, format_detected');

    if (error) {
        console.error('Error:', error);
        return null;
    }

    const byStatus = {};
    const byFormat = {};

    for (const row of data) {
        byStatus[row.content_status || 'unknown'] = (byStatus[row.content_status || 'unknown'] || 0) + 1;
        byFormat[row.format_detected || 'unknown'] = (byFormat[row.format_detected || 'unknown'] || 0) + 1;
    }

    return { byStatus, byFormat, total: data.length };
}

/**
 * Queue products for content generation
 */
async function queueForContentGeneration(options = {}) {
    const limit = options.limit || 100;
    const priority = options.priority || 'high_traffic';

    console.log(`\nQueuing ${limit} products for content generation (priority: ${priority})...`);

    // Get products needing content, prioritized by traffic
    let query = supabase
        .from('seo_products')
        .select(`
            id,
            ecommerce_product_id,
            impressions_30d,
            content_status,
            ecommerce_products!inner(name, sku)
        `)
        .in('content_status', ['no_description', 'needs_format']);

    if (priority === 'high_traffic') {
        query = query.order('impressions_30d', { ascending: false, nullsFirst: false });
    }

    const { data: products, error } = await query.limit(limit);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${products.length} products to queue`);

    // Add to content queue
    let queued = 0;
    for (const product of products) {
        const { error: insertError } = await supabase
            .from('seo_content_queue')
            .upsert({
                content_type: 'product',
                content_id: product.ecommerce_product_id,
                priority: product.impressions_30d || 0,
                impressions_30d: product.impressions_30d || 0,
                optimization_type: product.content_status === 'no_description' ? 'content' : 'format',
                status: 'pending'
            }, { onConflict: 'content_id,content_type' });

        if (!insertError) queued++;
    }

    console.log(`Queued ${queued} products for content generation`);
    return { queued, total: products.length };
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0] || 'analyze';
    const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '1000');
    const noUpdate = args.includes('--no-update');

    if (command === 'stats') {
        getContentStats().then(stats => {
            console.log('Content Status Summary:');
            console.log(JSON.stringify(stats, null, 2));
        });
    } else if (command === 'queue') {
        queueForContentGeneration({ limit }).then(result => {
            console.log('Queue result:', result);
        });
    } else {
        analyzeProducts({ limit, updateDb: !noUpdate }).then(stats => {
            console.log('\nDone!');
        }).catch(err => {
            console.error('Error:', err);
            process.exit(1);
        });
    }
}

module.exports = { analyzeProducts, getContentStats, queueForContentGeneration, detectFormat };
