/**
 * GSC Data Agent
 *
 * Purpose: Sync Google Search Console data to Supabase
 * - Import page performance (impressions, clicks, position, CTR)
 * - Import keyword data per page
 * - Match pages to products/categories/brands
 * - Track index status and coverage
 */

const { createClient } = require('@supabase/supabase-js');
const { google } = require('googleapis');

// Configuration
const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_KEY = process.env.BOO_SUPABASE_SERVICE_ROLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

const SITE_URL = 'https://www.buyorganicsonline.com.au';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// URL patterns for page type detection
const PAGE_PATTERNS = {
    product: /\/products?\//i,
    category: /\/categories?\//i,
    brand: /\/brands?\//i,
    blog: /\/blog\//i,
    page: /^\/[^\/]+\/?$/  // Top-level pages
};

/**
 * Detect page type from URL
 */
function detectPageType(url) {
    for (const [type, pattern] of Object.entries(PAGE_PATTERNS)) {
        if (pattern.test(url)) return type;
    }
    return 'other';
}

/**
 * Extract slug from URL for matching
 */
function extractSlug(url, pageType) {
    try {
        const pathname = new URL(url).pathname;
        const segments = pathname.split('/').filter(Boolean);

        if (pageType === 'product' && segments.length >= 2) {
            return segments[segments.length - 1]; // Last segment is product slug
        }
        if (pageType === 'category' && segments.length >= 2) {
            return segments.slice(1).join('/'); // Everything after /categories/
        }
        if (pageType === 'brand' && segments.length >= 2) {
            return segments[1]; // Brand slug
        }
        return pathname;
    } catch {
        return null;
    }
}

/**
 * Initialize Google Search Console API client
 */
async function initGSCClient() {
    // Check for credentials file or environment variable
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        './gsc-credentials.json';

    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: credentialsPath,
            scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
        });

        return google.searchconsole({ version: 'v1', auth });
    } catch (error) {
        console.error('Failed to initialize GSC client:', error.message);
        console.log('\nTo use this agent, you need to:');
        console.log('1. Create a service account in Google Cloud Console');
        console.log('2. Enable Search Console API');
        console.log('3. Add the service account email as a user in GSC');
        console.log('4. Download the JSON key and set GOOGLE_APPLICATION_CREDENTIALS');
        return null;
    }
}

/**
 * Fetch page performance data from GSC
 */
async function fetchPagePerformance(gsc, options = {}) {
    const days = options.days || 30;
    const startDate = options.startDate || getDateString(-days);
    const endDate = options.endDate || getDateString(-1);

    console.log(`Fetching GSC data from ${startDate} to ${endDate}...`);

    try {
        const response = await gsc.searchanalytics.query({
            siteUrl: SITE_URL,
            requestBody: {
                startDate,
                endDate,
                dimensions: ['page'],
                rowLimit: 25000,
                startRow: 0
            }
        });

        return response.data.rows || [];
    } catch (error) {
        console.error('Error fetching GSC data:', error.message);
        return [];
    }
}

/**
 * Fetch keyword data for pages
 */
async function fetchKeywordData(gsc, options = {}) {
    const days = options.days || 30;
    const startDate = options.startDate || getDateString(-days);
    const endDate = options.endDate || getDateString(-1);

    console.log(`Fetching keyword data from ${startDate} to ${endDate}...`);

    try {
        const response = await gsc.searchanalytics.query({
            siteUrl: SITE_URL,
            requestBody: {
                startDate,
                endDate,
                dimensions: ['page', 'query'],
                rowLimit: 25000,
                startRow: 0
            }
        });

        return response.data.rows || [];
    } catch (error) {
        console.error('Error fetching keyword data:', error.message);
        return [];
    }
}

/**
 * Helper to get date string
 */
function getDateString(daysOffset) {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date.toISOString().split('T')[0];
}

/**
 * Match page to product/category/brand
 */
async function matchPageToEntity(url, pageType) {
    const slug = extractSlug(url, pageType);
    if (!slug) return null;

    if (pageType === 'product') {
        // Try to match by URL in seo_products or by slug in ecommerce_products
        const { data: product } = await supabase
            .from('seo_products')
            .select('id, ecommerce_product_id')
            .eq('url', url)
            .single();

        if (product) return { type: 'product', id: product.ecommerce_product_id };

        // Try by custom_url in ecommerce_products
        const { data: epByUrl } = await supabase
            .from('ecommerce_products')
            .select('id')
            .ilike('metadata->>custom_url', `%${slug}%`)
            .single();

        if (epByUrl) return { type: 'product', id: epByUrl.id };
    }

    if (pageType === 'category') {
        const { data: category } = await supabase
            .from('seo_categories')
            .select('id')
            .or(`url.eq.${url},slug.eq.${slug}`)
            .single();

        if (category) return { type: 'category', id: category.id };
    }

    if (pageType === 'brand') {
        const { data: brand } = await supabase
            .from('seo_brands')
            .select('id')
            .or(`url.eq.${url},slug.eq.${slug}`)
            .single();

        if (brand) return { type: 'brand', id: brand.id };
    }

    return null;
}

/**
 * Sync GSC page data to Supabase
 */
async function syncPageData(options = {}) {
    console.log('='.repeat(60));
    console.log('GSC DATA AGENT - Starting Sync');
    console.log('='.repeat(60));

    const gsc = await initGSCClient();
    if (!gsc) {
        console.log('\nRunning in offline mode (no GSC credentials)...');
        return await syncFromImportedData(options);
    }

    // Fetch page performance
    const pages = await fetchPagePerformance(gsc, options);
    console.log(`\nFetched ${pages.length} pages from GSC`);

    if (pages.length === 0) {
        console.log('No data returned from GSC');
        return;
    }

    // Process and upsert pages
    const stats = {
        total: pages.length,
        products: 0,
        categories: 0,
        brands: 0,
        other: 0,
        errors: 0
    };

    for (const row of pages) {
        const url = row.keys[0];
        const pageType = detectPageType(url);

        // Match to entity
        const entity = await matchPageToEntity(url, pageType);

        const pageData = {
            url,
            page_type: pageType,
            ecommerce_product_id: entity?.type === 'product' ? entity.id : null,
            category_id: entity?.type === 'category' ? entity.id : null,
            brand_id: entity?.type === 'brand' ? entity.id : null,
            impressions_30d: Math.round(row.impressions),
            clicks_30d: Math.round(row.clicks),
            avg_position: row.position?.toFixed(2),
            ctr: (row.ctr * 100).toFixed(2),
            last_updated: new Date().toISOString().split('T')[0]
        };

        const { error } = await supabase
            .from('seo_gsc_pages')
            .upsert(pageData, { onConflict: 'url' });

        if (error) {
            stats.errors++;
        } else {
            stats[pageType] = (stats[pageType] || 0) + 1;
        }
    }

    // Also update impressions in seo_products
    await updateProductImpressions();

    // Log activity
    await supabase.from('seo_agent_logs').insert({
        agent_name: 'gsc-data',
        action: 'sync_completed',
        details: stats,
        status: 'completed'
    });

    console.log('\n' + '='.repeat(60));
    console.log('GSC SYNC SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total pages: ${stats.total}`);
    console.log(`Products: ${stats.products}`);
    console.log(`Categories: ${stats.categories}`);
    console.log(`Brands: ${stats.brands}`);
    console.log(`Other: ${stats.other}`);
    console.log(`Errors: ${stats.errors}`);

    return stats;
}

/**
 * Sync from imported CSV/JSON data (offline mode)
 */
async function syncFromImportedData(options = {}) {
    const dataPath = options.dataPath || './gsc-export.json';
    const fs = require('fs');

    if (!fs.existsSync(dataPath)) {
        console.log(`\nNo data file found at ${dataPath}`);
        console.log('To import GSC data offline:');
        console.log('1. Export from GSC as CSV');
        console.log('2. Convert to JSON array with: [{url, impressions, clicks, position, ctr}, ...]');
        console.log(`3. Save as ${dataPath}`);
        return null;
    }

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    console.log(`Loaded ${data.length} pages from ${dataPath}`);

    // Process same as live data
    const stats = { total: data.length, imported: 0, errors: 0 };

    for (const row of data) {
        const pageType = detectPageType(row.url);
        const entity = await matchPageToEntity(row.url, pageType);

        const { error } = await supabase
            .from('seo_gsc_pages')
            .upsert({
                url: row.url,
                page_type: pageType,
                ecommerce_product_id: entity?.type === 'product' ? entity.id : null,
                category_id: entity?.type === 'category' ? entity.id : null,
                brand_id: entity?.type === 'brand' ? entity.id : null,
                impressions_30d: row.impressions || 0,
                clicks_30d: row.clicks || 0,
                avg_position: row.position,
                ctr: row.ctr,
                last_updated: new Date().toISOString().split('T')[0]
            }, { onConflict: 'url' });

        if (error) stats.errors++;
        else stats.imported++;
    }

    console.log(`Imported: ${stats.imported}, Errors: ${stats.errors}`);
    return stats;
}

/**
 * Update product impressions from GSC pages
 */
async function updateProductImpressions() {
    console.log('\nUpdating product impressions...');

    // Get all GSC pages with matched products
    const { data: gscPages } = await supabase
        .from('seo_gsc_pages')
        .select('ecommerce_product_id, impressions_30d, clicks_30d, avg_position, ctr')
        .not('ecommerce_product_id', 'is', null);

    if (!gscPages || gscPages.length === 0) {
        console.log('No matched product pages to update');
        return;
    }

    let updated = 0;
    for (const page of gscPages) {
        const { error } = await supabase
            .from('seo_products')
            .update({
                impressions_30d: page.impressions_30d,
                clicks_30d: page.clicks_30d,
                avg_position: page.avg_position,
                ctr: page.ctr
            })
            .eq('ecommerce_product_id', page.ecommerce_product_id);

        if (!error) updated++;
    }

    console.log(`Updated ${updated} products with GSC data`);
}

/**
 * Sync keyword data
 */
async function syncKeywordData(options = {}) {
    console.log('\nSyncing keyword data...');

    const gsc = await initGSCClient();
    if (!gsc) {
        console.log('Skipping keywords (no GSC credentials)');
        return;
    }

    const keywords = await fetchKeywordData(gsc, options);
    console.log(`Fetched ${keywords.length} keyword rows`);

    // Group by page
    const keywordsByPage = {};
    for (const row of keywords) {
        const url = row.keys[0];
        const query = row.keys[1];

        if (!keywordsByPage[url]) keywordsByPage[url] = [];
        keywordsByPage[url].push({
            keyword: query,
            impressions: row.impressions,
            clicks: row.clicks,
            position: row.position,
            ctr: row.ctr
        });
    }

    // Update pages with top keywords
    for (const [url, kws] of Object.entries(keywordsByPage)) {
        // Sort by impressions, take top 10
        const topKeywords = kws
            .sort((a, b) => b.impressions - a.impressions)
            .slice(0, 10);

        // Get page ID
        const { data: page } = await supabase
            .from('seo_gsc_pages')
            .select('id')
            .eq('url', url)
            .single();

        if (page) {
            // Insert keyword data
            for (const kw of topKeywords) {
                await supabase.from('seo_gsc_keywords').upsert({
                    page_id: page.id,
                    keyword: kw.keyword,
                    impressions: kw.impressions,
                    clicks: kw.clicks,
                    avg_position: kw.position?.toFixed(2),
                    ctr: (kw.ctr * 100).toFixed(2),
                    date: getDateString(0)
                }, { onConflict: 'page_id,keyword,date' });
            }
        }
    }

    console.log(`Processed keywords for ${Object.keys(keywordsByPage).length} pages`);
}

/**
 * Get GSC summary statistics
 */
async function getGSCStats() {
    const { data: pages } = await supabase
        .from('seo_gsc_pages')
        .select('page_type, impressions_30d, clicks_30d');

    if (!pages) return null;

    const stats = {
        total_pages: pages.length,
        total_impressions: 0,
        total_clicks: 0,
        by_type: {}
    };

    for (const page of pages) {
        stats.total_impressions += page.impressions_30d || 0;
        stats.total_clicks += page.clicks_30d || 0;

        if (!stats.by_type[page.page_type]) {
            stats.by_type[page.page_type] = { count: 0, impressions: 0, clicks: 0 };
        }
        stats.by_type[page.page_type].count++;
        stats.by_type[page.page_type].impressions += page.impressions_30d || 0;
        stats.by_type[page.page_type].clicks += page.clicks_30d || 0;
    }

    return stats;
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0] || 'sync';
    const days = parseInt(args.find(a => a.startsWith('--days='))?.split('=')[1] || '30');

    if (command === 'stats') {
        getGSCStats().then(stats => {
            console.log('GSC Statistics:');
            console.log(JSON.stringify(stats, null, 2));
        });
    } else if (command === 'keywords') {
        syncKeywordData({ days }).then(() => console.log('Done!'));
    } else {
        syncPageData({ days }).then(() => {
            console.log('\nDone!');
        }).catch(err => {
            console.error('Error:', err);
            process.exit(1);
        });
    }
}

module.exports = { syncPageData, syncKeywordData, getGSCStats, updateProductImpressions };
