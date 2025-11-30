/**
 * GSC Issue Detection - Anomaly-based detection
 *
 * Detects potential GSC issues by analyzing traffic patterns:
 * - Traffic drops >50% vs 7-day average
 * - URLs that disappeared (had traffic, now 0)
 * - New URLs needing verification
 * - Recently resolved issues needing re-verification
 *
 * No API calls - queries Supabase only
 *
 * Usage:
 *   node detect-issues.js [--business=boo] [--limit=500]
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env'), override: true });

const SUPABASE_URL = process.env.BOO_SUPABASE_URL || 'https://usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_KEY = process.env.BOO_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Get date string
 */
function getDateString(daysOffset = 0) {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date.toISOString().split('T')[0];
}

/**
 * Detect URLs with significant traffic drops
 * Returns URLs where current impressions are <50% of 7-day average
 */
async function detectTrafficDrops(business = 'boo', minImpressions = 10) {
    console.log('\n--- Detecting Traffic Drops ---');

    // Get last 8 days of data for comparison
    const startDate = getDateString(-8);

    const { data: dailyStats, error } = await supabase
        .from('gsc_page_daily_stats')
        .select('url, stat_date, impressions')
        .eq('business', business)
        .gte('stat_date', startDate)
        .order('url')
        .order('stat_date', { ascending: false });

    if (error) {
        console.error('Error fetching daily stats:', error.message);
        return [];
    }

    // Group by URL and calculate averages
    const urlStats = {};
    for (const row of dailyStats) {
        if (!urlStats[row.url]) {
            urlStats[row.url] = { impressions: [], latestDate: null, latestImpressions: 0 };
        }
        urlStats[row.url].impressions.push(row.impressions);
        if (!urlStats[row.url].latestDate || row.stat_date > urlStats[row.url].latestDate) {
            urlStats[row.url].latestDate = row.stat_date;
            urlStats[row.url].latestImpressions = row.impressions;
        }
    }

    const anomalies = [];
    for (const [url, stats] of Object.entries(urlStats)) {
        if (stats.impressions.length < 3) continue;  // Need enough history

        // Calculate average excluding most recent day
        const historicalImpressions = stats.impressions.slice(1);
        const avg7d = historicalImpressions.reduce((a, b) => a + b, 0) / historicalImpressions.length;

        if (avg7d < minImpressions) continue;  // Skip low-traffic URLs

        const current = stats.latestImpressions;
        const dropPercent = avg7d > 0 ? ((avg7d - current) / avg7d) * 100 : 0;

        if (dropPercent >= 50) {
            anomalies.push({
                url,
                reason: 'traffic_drop',
                priority: Math.round(dropPercent),
                trafficBefore: Math.round(avg7d),
                trafficAfter: current,
                dropPercent: Math.round(dropPercent)
            });
        }
    }

    console.log(`Found ${anomalies.length} URLs with >50% traffic drop`);
    return anomalies.sort((a, b) => b.priority - a.priority);
}

/**
 * Detect new URLs that haven't been inspected
 * Returns URLs where first_seen is recent
 */
async function detectNewUrls(business = 'boo', daysBack = 2) {
    console.log('\n--- Detecting New URLs ---');

    const cutoffDate = getDateString(-daysBack);

    const { data: newUrls, error } = await supabase
        .from('gsc_page_daily_stats')
        .select('url, first_seen, impressions')
        .eq('business', business)
        .gte('first_seen', cutoffDate)
        .order('impressions', { ascending: false });

    if (error) {
        console.error('Error fetching new URLs:', error.message);
        return [];
    }

    // Filter out URLs already inspected recently
    const { data: recentlyInspected } = await supabase
        .from('gsc_issue_urls')
        .select('url')
        .eq('business', business)
        .gte('last_checked', getDateString(-7));

    const inspectedSet = new Set((recentlyInspected || []).map(r => r.url));

    const newNotInspected = (newUrls || [])
        .filter(u => !inspectedSet.has(u.url))
        .map(u => ({
            url: u.url,
            reason: 'new_url',
            priority: u.impressions || 1,
            firstSeen: u.first_seen
        }));

    console.log(`Found ${newNotInspected.length} new URLs not yet inspected`);
    return newNotInspected;
}

/**
 * Detect recently resolved issues needing verification
 */
async function detectNeedsVerification(business = 'boo', daysBack = 7) {
    console.log('\n--- Detecting Issues Needing Verification ---');

    const cutoffDate = getDateString(-daysBack);

    const { data: resolved, error } = await supabase
        .from('gsc_issue_urls')
        .select('url, issue_type, resolved_at, last_checked')
        .eq('business', business)
        .eq('status', 'resolved')
        .gte('resolved_at', cutoffDate);

    if (error) {
        console.error('Error fetching resolved issues:', error.message);
        return [];
    }

    // Filter to those not re-verified since resolution
    const needsVerification = (resolved || [])
        .filter(r => !r.last_checked || new Date(r.last_checked) < new Date(r.resolved_at))
        .map(r => ({
            url: r.url,
            reason: 'fix_verification',
            priority: 100,  // High priority for fix verification
            issueType: r.issue_type,
            resolvedAt: r.resolved_at
        }));

    console.log(`Found ${needsVerification.length} resolved issues needing verification`);
    return needsVerification;
}

/**
 * Get top pages for rotation inspection
 * Returns top N pages by impressions not inspected in last 7 days
 */
async function getTopPagesForRotation(business = 'boo', limit = 100) {
    console.log('\n--- Getting Top Pages for Rotation ---');

    // Get top pages from seo_gsc_pages
    const { data: topPages, error } = await supabase
        .from('seo_gsc_pages')
        .select('url, impressions_30d')
        .order('impressions_30d', { ascending: false })
        .limit(limit * 2);  // Get more than needed to filter

    if (error) {
        console.error('Error fetching top pages:', error.message);
        return [];
    }

    // Filter out recently inspected
    const { data: recentlyInspected } = await supabase
        .from('gsc_issue_urls')
        .select('url')
        .eq('business', business)
        .gte('last_checked', getDateString(-7));

    const inspectedSet = new Set((recentlyInspected || []).map(r => r.url));

    const notInspected = (topPages || [])
        .filter(p => !inspectedSet.has(p.url))
        .slice(0, limit)
        .map(p => ({
            url: p.url,
            reason: 'rotation',
            priority: Math.round(p.impressions_30d / 100),  // Scaled priority
            impressions: p.impressions_30d
        }));

    console.log(`Found ${notInspected.length} top pages for rotation inspection`);
    return notInspected;
}

/**
 * Build the full inspection queue with budget allocation
 */
async function buildInspectionQueue(options = {}) {
    const {
        business = 'boo',
        budget = 500,
        trafficDropBudget = 200,
        newUrlBudget = 100,
        verificationBudget = 100,
        rotationBudget = 100
    } = options;

    console.log('='.repeat(60));
    console.log('GSC ISSUE DETECTION');
    console.log(`Business: ${business}, Total Budget: ${budget}`);
    console.log('='.repeat(60));

    const queue = [];

    // 1. Traffic drops (highest priority)
    const trafficDrops = await detectTrafficDrops(business);
    queue.push(...trafficDrops.slice(0, trafficDropBudget));

    // 2. Fix verification
    const needsVerification = await detectNeedsVerification(business);
    queue.push(...needsVerification.slice(0, verificationBudget));

    // 3. New URLs
    const newUrls = await detectNewUrls(business);
    queue.push(...newUrls.slice(0, newUrlBudget));

    // 4. Top pages rotation (fill remaining budget)
    const remaining = budget - queue.length;
    if (remaining > 0) {
        const rotation = await getTopPagesForRotation(business, Math.min(remaining, rotationBudget));
        queue.push(...rotation);
    }

    // Deduplicate by URL (keep highest priority entry)
    const urlMap = new Map();
    for (const item of queue) {
        const existing = urlMap.get(item.url);
        if (!existing || item.priority > existing.priority) {
            urlMap.set(item.url, item);
        }
    }

    const finalQueue = Array.from(urlMap.values())
        .sort((a, b) => b.priority - a.priority)
        .slice(0, budget);

    // Summary
    const summary = {
        total: finalQueue.length,
        byReason: {}
    };
    for (const item of finalQueue) {
        summary.byReason[item.reason] = (summary.byReason[item.reason] || 0) + 1;
    }

    console.log('\n' + '='.repeat(60));
    console.log('INSPECTION QUEUE SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total URLs to inspect: ${summary.total}`);
    console.log('By reason:');
    for (const [reason, count] of Object.entries(summary.byReason)) {
        console.log(`  - ${reason}: ${count}`);
    }

    return { queue: finalQueue, summary };
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const business = args.find(a => a.startsWith('--business='))?.split('=')[1] || 'boo';
    const budget = parseInt(args.find(a => a.startsWith('--budget='))?.split('=')[1] || '500');

    buildInspectionQueue({ business, budget })
        .then(({ queue, summary }) => {
            console.log('\n\nTop 10 URLs in queue:');
            for (const item of queue.slice(0, 10)) {
                console.log(`  ${item.url}`);
                console.log(`    Reason: ${item.reason}, Priority: ${item.priority}`);
            }
        })
        .catch(err => {
            console.error('Error:', err);
            process.exit(1);
        });
}

module.exports = {
    detectTrafficDrops,
    detectNewUrls,
    detectNeedsVerification,
    getTopPagesForRotation,
    buildInspectionQueue
};
