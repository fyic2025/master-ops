/**
 * Content Generation Agent
 *
 * Purpose: Generate and reformat product descriptions
 * - Generate new descriptions for products without content
 * - Reformat existing descriptions to standard format
 * - Include SEO keywords naturally
 * - Add PubMed citations for health claims
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

// Standard description template
const DESCRIPTION_TEMPLATE = `
## Key Benefits
[3-5 bullet points highlighting main benefits]

## How to Use
[Clear usage instructions]

## Ingredients
[List of key ingredients with brief descriptions]

## About [Brand]
[Brief brand information if available]
`;

/**
 * Generate product description using AI
 */
async function generateDescription(product, options = {}) {
    const includeKeyword = options.keyword || product.primary_keyword;
    const brandInfo = options.brandInfo;
    const pubmedResearch = options.pubmedResearch || [];

    const prompt = `Generate a compelling product description for an Australian organic/health food e-commerce store.

Product Information:
- Name: ${product.name}
- Brand: ${product.brand || 'Not specified'}
- SKU: ${product.sku || 'N/A'}
- Category: ${product.category || 'Health Foods'}
${product.existing_description ? `- Current Description: ${product.existing_description}` : ''}
${includeKeyword ? `- Target Keyword: ${includeKeyword}` : ''}

${brandInfo ? `Brand Background:\n${brandInfo}\n` : ''}

${pubmedResearch.length > 0 ? `
Research Citations Available:
${pubmedResearch.map(r => `- ${r.title} (PMID: ${r.pmid})`).join('\n')}
` : ''}

Requirements:
1. Use this exact format with markdown headers:
   ## Key Benefits
   [3-5 bullet points with specific benefits]

   ## How to Use
   [Clear, practical usage instructions]

   ## Ingredients
   [Key ingredients with brief health-focused descriptions]

2. Tone: Professional, trustworthy, health-conscious
3. Length: 150-250 words total
4. Include the target keyword naturally (if provided)
5. Use Australian spelling (colour, organise, etc.)
6. Avoid unsubstantiated health claims - use "may help", "traditionally used for", etc.
7. If research citations are provided, include them like: "Research suggests... [1]"

Write the description now:`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            max_tokens: 1500,
            messages: [{ role: 'user', content: prompt }]
        });

        return response.choices[0].message.content;
    } catch (error) {
        console.error('Generation error:', error.message);
        return null;
    }
}

/**
 * Reformat existing description to standard format
 */
async function reformatDescription(product, existingDescription) {
    const prompt = `Reformat this product description to our standard format while preserving the key information.

Product: ${product.name}
Brand: ${product.brand || 'Unknown'}

Current Description:
${existingDescription}

Reformat to this exact structure:

## Key Benefits
[Extract 3-5 main benefits as bullet points]

## How to Use
[Extract or create usage instructions]

## Ingredients
[List key ingredients if mentioned]

Requirements:
- Preserve all factual information
- Use Australian spelling
- Keep any existing citations or references
- Remove any HTML tags or broken formatting
- Make it scannable with bullet points
- If certain sections have no information, make educated suggestions based on the product type

Reformatted description:`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            max_tokens: 1500,
            messages: [{ role: 'user', content: prompt }]
        });

        return response.choices[0].message.content;
    } catch (error) {
        console.error('Reformat error:', error.message);
        return null;
    }
}

/**
 * Generate meta title and description
 */
async function generateMetaContent(product, description) {
    const prompt = `Generate SEO meta tags for this product.

Product: ${product.name}
Brand: ${product.brand || ''}
Category: ${product.category || ''}
Primary Keyword: ${product.primary_keyword || product.name}

Description Preview:
${description?.substring(0, 500) || 'No description available'}

Generate:
1. Meta Title (50-60 characters, include keyword, end with "| Buy Organics Online")
2. Meta Description (150-160 characters, compelling with call to action)

Return as JSON:
{
  "meta_title": "...",
  "meta_description": "..."
}`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            max_tokens: 300,
            messages: [{ role: 'user', content: prompt }]
        });

        const content = response.choices[0].message.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return null;
    } catch (error) {
        console.error('Meta generation error:', error.message);
        return null;
    }
}

/**
 * Process content queue
 */
async function processContentQueue(options = {}) {
    const limit = options.limit || 10;
    const dryRun = options.dryRun || false;

    console.log('='.repeat(60));
    console.log('CONTENT GENERATION AGENT - Processing Queue');
    console.log('='.repeat(60));

    // Get pending items from queue, prioritized
    const { data: queue, error } = await supabase
        .from('seo_content_queue')
        .select('*')
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching queue:', error);
        return;
    }

    console.log(`\nProcessing ${queue.length} items from queue...`);

    const stats = {
        processed: 0,
        generated: 0,
        reformatted: 0,
        errors: 0
    };

    for (const item of queue) {
        console.log(`\nProcessing: ${item.content_type} ${item.content_id}`);

        // Mark as in progress
        await supabase
            .from('seo_content_queue')
            .update({ status: 'drafting' })
            .eq('id', item.id);

        // Get product details
        const { data: seoProduct } = await supabase
            .from('seo_products')
            .select(`
                id,
                primary_keyword,
                ecommerce_products!inner(
                    id,
                    name,
                    sku,
                    brand,
                    metadata
                )
            `)
            .eq('ecommerce_product_id', item.content_id)
            .single();

        if (!seoProduct) {
            console.log('  Product not found, skipping...');
            stats.errors++;
            continue;
        }

        const ep = seoProduct.ecommerce_products;
        const existingDesc = ep.metadata?.description || item.current_content;

        // Get brand info if available
        let brandInfo = null;
        if (ep.brand) {
            const { data: brand } = await supabase
                .from('seo_brands')
                .select('description, story, values')
                .eq('name', ep.brand)
                .single();
            if (brand) {
                brandInfo = [brand.description, brand.story, brand.values].filter(Boolean).join('\n');
            }
        }

        // Get relevant PubMed research
        let pubmedResearch = [];
        if (item.pubmed_research?.length > 0) {
            const { data: research } = await supabase
                .from('seo_pubmed_research')
                .select('pmid, title, abstract, citation_inline')
                .in('pmid', item.pubmed_research);
            pubmedResearch = research || [];
        }

        // Generate or reformat
        let newContent = null;

        if (item.optimization_type === 'content' || !existingDesc) {
            // Generate new content
            console.log('  Generating new description...');
            newContent = await generateDescription({
                name: ep.name,
                brand: ep.brand,
                sku: ep.sku,
                category: item.category,
                primary_keyword: seoProduct.primary_keyword
            }, { brandInfo, pubmedResearch });

            if (newContent) stats.generated++;
        } else {
            // Reformat existing
            console.log('  Reformatting existing description...');
            newContent = await reformatDescription({
                name: ep.name,
                brand: ep.brand
            }, existingDesc);

            if (newContent) stats.reformatted++;
        }

        if (!newContent) {
            console.log('  Content generation failed');
            await supabase
                .from('seo_content_queue')
                .update({ status: 'pending' })  // Retry later
                .eq('id', item.id);
            stats.errors++;
            continue;
        }

        // Generate meta content
        const meta = await generateMetaContent({
            name: ep.name,
            brand: ep.brand,
            primary_keyword: seoProduct.primary_keyword
        }, newContent);

        // Update queue item
        const updateData = {
            proposed_content: newContent,
            proposed_at: new Date().toISOString(),
            status: 'review'
        };

        if (dryRun) {
            console.log('  [DRY RUN] Would save:');
            console.log(`    Content: ${newContent.substring(0, 100)}...`);
            if (meta) console.log(`    Meta: ${meta.meta_title}`);
        } else {
            await supabase
                .from('seo_content_queue')
                .update(updateData)
                .eq('id', item.id);

            // Also save to seo_products
            await supabase
                .from('seo_products')
                .update({
                    generated_description: newContent,
                    content_status: 'pending_review'
                })
                .eq('id', seoProduct.id);
        }

        stats.processed++;
        console.log('  Done!');

        // Rate limit AI calls
        await new Promise(r => setTimeout(r, 1000));
    }

    // Log activity
    await supabase.from('seo_agent_logs').insert({
        agent_name: 'content-generation',
        action: 'queue_processed',
        details: stats,
        status: 'completed'
    });

    console.log('\n' + '='.repeat(60));
    console.log('CONTENT GENERATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Processed: ${stats.processed}`);
    console.log(`New content generated: ${stats.generated}`);
    console.log(`Reformatted: ${stats.reformatted}`);
    console.log(`Errors: ${stats.errors}`);

    return stats;
}

/**
 * Generate content for high-traffic products
 */
async function generateForHighTraffic(options = {}) {
    const limit = options.limit || 20;

    console.log('='.repeat(60));
    console.log('CONTENT GENERATION - High Traffic Products');
    console.log('='.repeat(60));

    // Get high-traffic products needing content
    const { data: products, error } = await supabase
        .from('seo_products')
        .select(`
            id,
            ecommerce_product_id,
            primary_keyword,
            impressions_30d,
            content_status,
            ecommerce_products!inner(
                id,
                name,
                sku,
                brand,
                metadata
            )
        `)
        .in('content_status', ['no_description', 'needs_format'])
        .order('impressions_30d', { ascending: false, nullsFirst: false })
        .limit(limit);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`\nFound ${products.length} high-traffic products needing content`);

    // Add to queue with high priority
    let queued = 0;
    for (const product of products) {
        const { error: insertError } = await supabase
            .from('seo_content_queue')
            .upsert({
                content_type: 'product',
                content_id: product.ecommerce_product_id,
                priority: product.impressions_30d || 100,
                impressions_30d: product.impressions_30d || 0,
                current_content: product.ecommerce_products.metadata?.description,
                optimization_type: product.content_status === 'no_description' ? 'content' : 'format',
                status: 'pending',
                target_keyword: product.primary_keyword
            }, { onConflict: 'content_id,content_type' });

        if (!insertError) {
            queued++;
            console.log(`  Queued: ${product.ecommerce_products.name.substring(0, 50)}... (${product.impressions_30d || 0} impressions)`);
        }
    }

    console.log(`\nQueued ${queued} products for content generation`);
    return { queued };
}

/**
 * Approve generated content
 */
async function approveContent(queueId, approver = 'system') {
    // Get the queue item
    const { data: item } = await supabase
        .from('seo_content_queue')
        .select('*')
        .eq('id', queueId)
        .single();

    if (!item || item.status !== 'review') {
        return { success: false, error: 'Item not found or not in review status' };
    }

    // Update queue status
    await supabase
        .from('seo_content_queue')
        .update({
            status: 'approved',
            approved_by: approver,
            approved_at: new Date().toISOString()
        })
        .eq('id', queueId);

    // Update seo_products
    await supabase
        .from('seo_products')
        .update({
            content_status: 'approved'
        })
        .eq('ecommerce_product_id', item.content_id);

    return { success: true };
}

/**
 * Get content generation stats
 */
async function getContentStats() {
    // Queue stats
    const { data: queue } = await supabase
        .from('seo_content_queue')
        .select('status, optimization_type');

    // Product content stats
    const { data: products } = await supabase
        .from('seo_products')
        .select('content_status');

    const stats = {
        queue: {
            total: queue?.length || 0,
            by_status: {},
            by_type: {}
        },
        products: {
            total: products?.length || 0,
            by_status: {}
        }
    };

    for (const item of queue || []) {
        stats.queue.by_status[item.status] = (stats.queue.by_status[item.status] || 0) + 1;
        stats.queue.by_type[item.optimization_type] = (stats.queue.by_type[item.optimization_type] || 0) + 1;
    }

    for (const product of products || []) {
        stats.products.by_status[product.content_status] = (stats.products.by_status[product.content_status] || 0) + 1;
    }

    return stats;
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0] || 'process';
    const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '10');
    const dryRun = args.includes('--dry-run');

    if (command === 'process') {
        processContentQueue({ limit, dryRun }).then(() => console.log('\nDone!'));
    } else if (command === 'queue-high-traffic') {
        generateForHighTraffic({ limit }).then(() => console.log('\nDone!'));
    } else if (command === 'stats') {
        getContentStats().then(stats => {
            console.log('Content Generation Statistics:');
            console.log(JSON.stringify(stats, null, 2));
        });
    } else {
        console.log('Usage: node content-generation.js [command] [options]');
        console.log('Commands: process, queue-high-traffic, stats');
        console.log('Options: --limit=N, --dry-run');
    }
}

module.exports = {
    processContentQueue,
    generateForHighTraffic,
    generateDescription,
    reformatDescription,
    generateMetaContent,
    approveContent,
    getContentStats
};
