/**
 * GSC Data Sync - OAuth2 Version
 *
 * Syncs Google Search Console data to Supabase BOO database
 * Uses OAuth2 refresh token (not service account)
 *
 * Usage: node sync-gsc-data.js [--days=30]
 */

const { createClient } = require('@supabase/supabase-js');
const { google } = require('googleapis');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env'), override: true });

// Configuration - all secrets from environment variables
const SUPABASE_URL = process.env.BOO_SUPABASE_URL || 'https://usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_KEY = process.env.BOO_SUPABASE_SERVICE_ROLE_KEY;

const SITE_URL = 'https://www.buyorganicsonline.com.au';

// OAuth2 credentials - must be set in .env
const GOOGLE_CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;
const GOOGLE_GSC_REFRESH_TOKEN = process.env.GOOGLE_GSC_REFRESH_TOKEN;

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
 * Helper to get date string
 */
function getDateString(daysOffset) {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date.toISOString().split('T')[0];
}

/**
 * Initialize Google Search Console API client with OAuth2
 */
async function initGSCClient() {
    if (!GOOGLE_GSC_REFRESH_TOKEN) {
        console.error('Missing GOOGLE_GSC_REFRESH_TOKEN in .env');
        console.log('\nTo authorize GSC access:');
        console.log('1. Visit: https://accounts.google.com/o/oauth2/v2/auth?client_id=' + GOOGLE_CLIENT_ID + '&redirect_uri=http://localhost&response_type=code&scope=https://www.googleapis.com/auth/webmasters.readonly&access_type=offline&prompt=consent');
        console.log('2. Exchange the code for a refresh token');
        console.log('3. Add GOOGLE_GSC_REFRESH_TOKEN to .env');
        return null;
    }

    const oauth2Client = new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        'http://localhost'
    );

    oauth2Client.setCredentials({
        refresh_token: GOOGLE_GSC_REFRESH_TOKEN
    });

    // Test connection by getting access token
    try {
        const { token } = await oauth2Client.getAccessToken();
        if (!token) {
            console.error('Failed to get access token');
            return null;
        }
        console.log('GSC OAuth2 authenticated successfully');
    } catch (error) {
        console.error('OAuth2 authentication failed:', error.message);
        return null;
    }

    return google.searchconsole({ version: 'v1', auth: oauth2Client });
}

/**
 * Create GSC tables if they don't exist
 */
async function ensureTables() {
    console.log('Checking GSC tables...');

    // Try to query the table - if it fails, we need to create it
    const { data, error } = await supabase
        .from('seo_gsc_pages')
        .select('id')
        .limit(1);

    if (error && error.code === '42P01') {
        console.log('GSC tables need to be created in Supabase SQL Editor.');
        console.log('\nRun this SQL in Supabase Dashboard > SQL Editor:\n');
        console.log(`
-- GSC Pages Table (minimal version, no FK dependencies)
CREATE TABLE IF NOT EXISTS seo_gsc_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT NOT NULL UNIQUE,
    page_type TEXT,

    -- Traffic metrics
    impressions_30d INTEGER DEFAULT 0,
    clicks_30d INTEGER DEFAULT 0,
    avg_position DECIMAL(5,2),
    ctr DECIMAL(5,4),

    first_seen DATE,
    last_updated DATE
);

CREATE INDEX IF NOT EXISTS idx_gsc_pages_url ON seo_gsc_pages(url);
CREATE INDEX IF NOT EXISTS idx_gsc_pages_type ON seo_gsc_pages(page_type);
CREATE INDEX IF NOT EXISTS idx_gsc_pages_impressions ON seo_gsc_pages(impressions_30d DESC);

-- GSC Keywords Table
CREATE TABLE IF NOT EXISTS seo_gsc_keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID REFERENCES seo_gsc_pages(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    avg_position DECIMAL(5,2),
    ctr DECIMAL(5,4),
    date DATE NOT NULL,
    UNIQUE(page_id, keyword, date)
);

CREATE INDEX IF NOT EXISTS idx_gsc_keywords_page ON seo_gsc_keywords(page_id);
CREATE INDEX IF NOT EXISTS idx_gsc_keywords_date ON seo_gsc_keywords(date DESC);

-- Agent logs (for tracking sync activity)
CREATE TABLE IF NOT EXISTS seo_agent_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_name TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id UUID,
    details JSONB,
    status TEXT CHECK (status IN ('started', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_logs_name ON seo_agent_logs(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created ON seo_agent_logs(created_at DESC);
`);
        return false;
    }

    console.log('GSC tables exist');
    return true;
}

/**
 * Fetch page performance data from GSC
 */
async function fetchPagePerformance(gsc, options = {}) {
    const days = options.days || 30;
    const startDate = options.startDate || getDateString(-days);
    const endDate = options.endDate || getDateString(-1);

    console.log(`Fetching GSC data from ${startDate} to ${endDate} (Australia only)...`);

    try {
        const response = await gsc.searchanalytics.query({
            siteUrl: SITE_URL,
            requestBody: {
                startDate,
                endDate,
                dimensions: ['page'],
                // Filter to Australia only
                dimensionFilterGroups: [{
                    filters: [{
                        dimension: 'country',
                        operator: 'equals',
                        expression: 'aus'
                    }]
                }],
                rowLimit: 25000,
                startRow: 0
            }
        });

        return response.data.rows || [];
    } catch (error) {
        console.error('Error fetching GSC data:', error.message);
        if (error.code === 403) {
            console.log('\nThe GSC API returned 403. Possible issues:');
            console.log('1. The Google account does not have access to this GSC property');
            console.log('2. The site URL format is incorrect (try sc-domain: prefix)');
            console.log('3. Search Console API is not enabled in Google Cloud Console');
        }
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
 * Sync daily stats for anomaly detection
 * Stores daily snapshots in gsc_page_daily_stats table
 */
async function syncDailyStats(options = {}) {
    const business = options.business || 'boo';
    const gsc = await initGSCClient();
    if (!gsc) return { synced: 0, newUrls: 0, errors: 0 };

    // Fetch yesterday's data specifically (GSC data has ~2 day delay)
    const yesterday = getDateString(-2);
    console.log(`\nSyncing daily stats for ${yesterday}...`);

    try {
        const response = await gsc.searchanalytics.query({
            siteUrl: SITE_URL,
            requestBody: {
                startDate: yesterday,
                endDate: yesterday,
                dimensions: ['page'],
                // Filter to Australia only
                dimensionFilterGroups: [{
                    filters: [{
                        dimension: 'country',
                        operator: 'equals',
                        expression: 'aus'
                    }]
                }],
                rowLimit: 25000
            }
        });

        const pages = response.data.rows || [];
        console.log(`Fetched ${pages.length} pages for ${yesterday} (Australia)`);

        if (pages.length === 0) return { synced: 0, newUrls: 0, errors: 0 };

        // Get existing URLs to detect new ones
        const { data: existingUrls } = await supabase
            .from('gsc_page_daily_stats')
            .select('url')
            .eq('business', business);

        const existingUrlSet = new Set((existingUrls || []).map(r => r.url));

        const stats = { synced: 0, newUrls: 0, errors: 0 };
        const BATCH_SIZE = 500;

        // Prepare all daily data
        const allDailyData = pages.map(row => {
            const url = row.keys[0];
            const isNew = !existingUrlSet.has(url);
            if (isNew) stats.newUrls++;

            return {
                business,
                url,
                stat_date: yesterday,
                impressions: Math.round(row.impressions),
                clicks: Math.round(row.clicks),
                avg_position: row.position?.toFixed(2),
                ctr: row.ctr?.toFixed(4),  // Store as decimal (0-1), not percentage
                first_seen: isNew ? yesterday : null
            };
        });

        // Batch upsert for better performance
        for (let i = 0; i < allDailyData.length; i += BATCH_SIZE) {
            const batch = allDailyData.slice(i, i + BATCH_SIZE);
            const { error } = await supabase
                .from('gsc_page_daily_stats')
                .upsert(batch, { onConflict: 'business,url,stat_date' });

            if (error) {
                stats.errors += batch.length;
                if (stats.errors <= BATCH_SIZE) console.log(`Batch error: ${error.message}`);
            } else {
                stats.synced += batch.length;
            }
        }

        console.log(`Daily stats: ${stats.synced} synced, ${stats.newUrls} new URLs, ${stats.errors} errors`);
        return stats;

    } catch (error) {
        console.error('Error syncing daily stats:', error.message);
        return { synced: 0, newUrls: 0, errors: 1 };
    }
}

/**
 * Sync GSC page data to Supabase
 */
async function syncPageData(options = {}) {
    console.log('='.repeat(60));
    console.log('GSC DATA SYNC - Starting');
    console.log('='.repeat(60));

    // Check tables exist
    const tablesOk = await ensureTables();
    if (!tablesOk) {
        console.log('\nPlease create the tables first, then run again.');
        return null;
    }

    // Initialize GSC client
    const gsc = await initGSCClient();
    if (!gsc) {
        console.log('\nGSC client initialization failed');
        return null;
    }

    // Log start
    await supabase.from('seo_agent_logs').insert({
        agent_name: 'gsc-sync',
        action: 'sync_started',
        status: 'started',
        details: { days: options.days || 30 }
    });

    // Fetch page performance
    const pages = await fetchPagePerformance(gsc, options);
    console.log(`\nFetched ${pages.length} pages from GSC`);

    if (pages.length === 0) {
        console.log('No data returned from GSC');
        return { total: 0, synced: 0, errors: 0 };
    }

    // Process and upsert pages in batches for better performance
    const stats = {
        total: pages.length,
        synced: 0,
        products: 0,
        categories: 0,
        brands: 0,
        other: 0,
        errors: 0
    };

    const today = getDateString(0);
    const BATCH_SIZE = 500;

    // Prepare all page data
    const allPageData = pages.map(row => {
        const url = row.keys[0];
        const pageType = detectPageType(url);
        stats[pageType] = (stats[pageType] || 0) + 1;
        return {
            url,
            page_type: pageType,
            impressions_30d: Math.round(row.impressions),
            clicks_30d: Math.round(row.clicks),
            avg_position: row.position?.toFixed(2),
            ctr: row.ctr?.toFixed(4),  // Store as decimal (0-1), not percentage
            last_updated: today
        };
    });

    // Batch upsert for much better performance
    for (let i = 0; i < allPageData.length; i += BATCH_SIZE) {
        const batch = allPageData.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
            .from('seo_gsc_pages')
            .upsert(batch, { onConflict: 'url' });

        if (error) {
            stats.errors += batch.length;
            console.log(`Batch error at ${i}:`, error.message);
        } else {
            stats.synced += batch.length;
        }

        // Progress indicator
        if ((i + BATCH_SIZE) % 2000 === 0 || i + BATCH_SIZE >= allPageData.length) {
            console.log(`Progress: ${Math.min(i + BATCH_SIZE, allPageData.length)}/${allPageData.length} pages`);
        }
    }

    // Also sync daily stats for anomaly detection
    if (options.includeDailyStats !== false) {
        console.log('\n--- Syncing daily stats for anomaly detection ---');
        const dailyStats = await syncDailyStats({ business: options.business || 'boo' });
        stats.dailyStats = dailyStats;
    }

    // Log completion
    await supabase.from('seo_agent_logs').insert({
        agent_name: 'gsc-sync',
        action: 'sync_completed',
        status: 'completed',
        details: stats
    });

    console.log('\n' + '='.repeat(60));
    console.log('GSC SYNC SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total pages: ${stats.total}`);
    console.log(`Synced: ${stats.synced}`);
    console.log(`Products: ${stats.products}`);
    console.log(`Categories: ${stats.categories}`);
    console.log(`Brands: ${stats.brands}`);
    console.log(`Other: ${stats.other}`);
    console.log(`Errors: ${stats.errors}`);
    if (stats.dailyStats) {
        console.log(`Daily stats: ${stats.dailyStats.synced} synced, ${stats.dailyStats.newUrls} new URLs`);
    }

    return stats;
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

    if (keywords.length === 0) return;

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

    const today = getDateString(0);
    let updated = 0;

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
                    date: today
                }, { onConflict: 'page_id,keyword,date' });
            }
            updated++;
        }
    }

    console.log(`Updated keywords for ${updated} pages`);
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

/**
 * List verified sites in GSC
 */
async function listSites() {
    const gsc = await initGSCClient();
    if (!gsc) return;

    try {
        const response = await gsc.sites.list();
        console.log('\nVerified GSC Sites:');
        console.log('='.repeat(60));

        if (response.data.siteEntry) {
            for (const site of response.data.siteEntry) {
                console.log(`- ${site.siteUrl} (${site.permissionLevel})`);
            }
        } else {
            console.log('No sites found. The account may not have GSC access.');
        }
    } catch (error) {
        console.error('Error listing sites:', error.message);
    }
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
        syncKeywordData({ days }).then(() => console.log('\nDone!'));
    } else if (command === 'sites' || command === 'list') {
        listSites();
    } else {
        syncPageData({ days }).then(() => {
            console.log('\nDone!');
        }).catch(err => {
            console.error('Error:', err);
            process.exit(1);
        });
    }
}

module.exports = { syncPageData, syncKeywordData, syncDailyStats, getGSCStats, listSites, initGSCClient };
