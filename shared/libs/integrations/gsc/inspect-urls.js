/**
 * GSC URL Inspection API Wrapper
 *
 * Inspects URLs via Google Search Console URL Inspection API
 * to get detailed indexing status, coverage state, and issues.
 *
 * Rate limit: ~2000 requests/day (we use ~500 to leave buffer)
 *
 * Usage:
 *   node inspect-urls.js <url>  # Inspect single URL
 *   node inspect-urls.js --queue [--limit=100]  # Process queue
 */

const { createClient } = require('@supabase/supabase-js');
const { google } = require('googleapis');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env'), override: true });

const SUPABASE_URL = process.env.BOO_SUPABASE_URL || 'https://usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_KEY = process.env.BOO_SUPABASE_SERVICE_ROLE_KEY;
const SITE_URL = 'https://www.buyorganicsonline.com.au/';  // Trailing slash required for GSC API

const GOOGLE_CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;
const GOOGLE_GSC_REFRESH_TOKEN = process.env.GOOGLE_GSC_REFRESH_TOKEN;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Initialize Google Search Console API client
 */
async function initGSCClient() {
    if (!GOOGLE_GSC_REFRESH_TOKEN) {
        console.error('Missing GOOGLE_GSC_REFRESH_TOKEN');
        return null;
    }

    const oauth2Client = new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        'http://localhost'
    );

    oauth2Client.setCredentials({ refresh_token: GOOGLE_GSC_REFRESH_TOKEN });

    try {
        const { token } = await oauth2Client.getAccessToken();
        if (!token) {
            console.error('Failed to get access token');
            return null;
        }
    } catch (error) {
        console.error('OAuth2 authentication failed:', error.message);
        return null;
    }

    return google.searchconsole({ version: 'v1', auth: oauth2Client });
}

/**
 * Classify issue type from API response
 */
function classifyIssue(inspection) {
    const result = inspection.inspectionResult || {};
    const indexStatus = result.indexStatusResult || {};
    const verdict = indexStatus.verdict;
    const coverageState = indexStatus.coverageState;
    const pageFetchState = indexStatus.pageFetchState;
    const robotsTxtState = indexStatus.robotsTxtState;

    // 404 Not Found
    if (pageFetchState === 'NOT_FOUND') {
        return { issueType: 'not_found_404', severity: 'critical' };
    }

    // Soft 404
    if (pageFetchState === 'SOFT_404') {
        return { issueType: 'soft_404', severity: 'critical' };
    }

    // Server error
    if (pageFetchState === 'SERVER_ERROR') {
        return { issueType: 'server_error', severity: 'critical' };
    }

    // Blocked by robots.txt
    if (robotsTxtState === 'DISALLOWED') {
        return { issueType: 'blocked_robots', severity: 'warning' };
    }

    // Noindex
    if (coverageState && coverageState.toLowerCase().includes('noindex')) {
        return { issueType: 'blocked_noindex', severity: 'warning' };
    }

    // Crawled but not indexed
    if (coverageState && coverageState.toLowerCase().includes('crawled') &&
        coverageState.toLowerCase().includes('not indexed')) {
        return { issueType: 'crawled_not_indexed', severity: 'warning' };
    }

    // No issue
    if (verdict === 'PASS' || verdict === 'NEUTRAL') {
        return { issueType: null, severity: null };
    }

    // Unknown issue
    return { issueType: 'unknown', severity: 'warning' };
}

/**
 * Inspect a single URL
 */
async function inspectUrl(gsc, url) {
    try {
        const response = await gsc.urlInspection.index.inspect({
            requestBody: {
                inspectionUrl: url,
                siteUrl: SITE_URL
            }
        });

        const result = response.data.inspectionResult || {};
        const indexStatus = result.indexStatusResult || {};

        return {
            success: true,
            url,
            inspectionResult: {
                verdict: indexStatus.verdict,
                coverageState: indexStatus.coverageState,
                indexingState: indexStatus.indexingState,
                robotsTxtState: indexStatus.robotsTxtState,
                pageFetchState: indexStatus.pageFetchState,
                lastCrawlTime: indexStatus.lastCrawlTime,
                crawledAs: indexStatus.crawledAs
            },
            ...classifyIssue(response.data)
        };

    } catch (error) {
        // Handle rate limiting
        if (error.code === 429) {
            console.error(`Rate limited on ${url}`);
            return { success: false, url, error: 'rate_limited', retryable: true };
        }

        console.error(`Error inspecting ${url}:`, error.message);
        return { success: false, url, error: error.message, retryable: false };
    }
}

/**
 * Inspect multiple URLs with rate limiting
 */
async function inspectUrls(urls, options = {}) {
    const {
        business = 'boo',
        delayMs = 500,  // Delay between requests (2 req/sec)
        maxRetries = 2
    } = options;

    const gsc = await initGSCClient();
    if (!gsc) {
        console.error('GSC client initialization failed');
        return { inspected: 0, issues: 0, errors: 0 };
    }

    console.log(`\nInspecting ${urls.length} URLs...`);

    const stats = { inspected: 0, issues: 0, resolved: 0, errors: 0 };
    const today = new Date().toISOString().split('T')[0];

    for (let i = 0; i < urls.length; i++) {
        const urlItem = typeof urls[i] === 'string' ? { url: urls[i] } : urls[i];
        const url = urlItem.url;

        console.log(`[${i + 1}/${urls.length}] ${url.slice(0, 80)}...`);

        const result = await inspectUrl(gsc, url);

        if (result.success) {
            stats.inspected++;

            if (result.issueType) {
                // Issue found - upsert to gsc_issue_urls
                const issueData = {
                    business,
                    url,
                    issue_type: result.issueType,
                    severity: result.severity,
                    status: 'active',
                    first_detected: today,
                    last_checked: today,
                    api_verdict: result.inspectionResult.verdict,
                    api_coverage_state: result.inspectionResult.coverageState,
                    api_indexing_state: result.inspectionResult.indexingState,
                    api_robots_state: result.inspectionResult.robotsTxtState,
                    api_page_fetch_state: result.inspectionResult.pageFetchState,
                    detection_reason: urlItem.reason || 'manual',
                    traffic_before: urlItem.trafficBefore,
                    traffic_after: urlItem.trafficAfter
                };

                const { error } = await supabase
                    .from('gsc_issue_urls')
                    .upsert(issueData, {
                        onConflict: 'business,url,issue_type',
                        ignoreDuplicates: false
                    });

                if (error) {
                    console.log(`  Error saving issue: ${error.message}`);
                } else {
                    stats.issues++;
                    console.log(`  ❌ Issue: ${result.issueType} (${result.severity})`);
                }

            } else {
                // No issue - check if there was a previous issue to resolve
                const { data: existingIssue } = await supabase
                    .from('gsc_issue_urls')
                    .select('id, status')
                    .eq('business', business)
                    .eq('url', url)
                    .eq('status', 'active')
                    .single();

                if (existingIssue) {
                    // Resolve the issue
                    await supabase
                        .from('gsc_issue_urls')
                        .update({
                            status: 'resolved',
                            resolved_at: new Date().toISOString(),
                            resolution_type: 'auto_verified',
                            last_checked: today,
                            api_verdict: result.inspectionResult.verdict
                        })
                        .eq('id', existingIssue.id);

                    stats.resolved++;
                    console.log(`  ✅ Resolved (was active issue, now passing)`);
                } else {
                    console.log(`  ✅ No issues`);
                }
            }

        } else {
            stats.errors++;
            if (result.error === 'rate_limited') {
                console.log('  ⚠️ Rate limited - stopping');
                break;  // Stop processing if rate limited
            }
        }

        // Rate limiting delay
        if (i < urls.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    return stats;
}

/**
 * Process the inspection queue from Supabase
 */
async function processInspectionQueue(options = {}) {
    const {
        business = 'boo',
        limit = 100
    } = options;

    // Import detect-issues to build queue
    const { buildInspectionQueue } = require('./detect-issues');

    console.log('Building inspection queue...');
    const { queue, summary } = await buildInspectionQueue({ business, budget: limit });

    if (queue.length === 0) {
        console.log('No URLs to inspect');
        return { inspected: 0, issues: 0, errors: 0 };
    }

    // Inspect the queue
    const stats = await inspectUrls(queue, { business });

    // Log the sync
    await supabase.from('gsc_sync_logs').insert({
        business,
        sync_date: new Date().toISOString().split('T')[0],
        anomalies_detected: summary.total,
        urls_inspected: stats.inspected,
        new_issues_found: stats.issues,
        issues_resolved: stats.resolved,
        api_calls_used: stats.inspected + stats.errors,
        status: stats.errors > stats.inspected ? 'failed' : 'completed'
    });

    console.log('\n' + '='.repeat(60));
    console.log('INSPECTION COMPLETE');
    console.log('='.repeat(60));
    console.log(`Inspected: ${stats.inspected}`);
    console.log(`New issues: ${stats.issues}`);
    console.log(`Resolved: ${stats.resolved}`);
    console.log(`Errors: ${stats.errors}`);

    return stats;
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args[0] === '--queue') {
        const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '100');
        const business = args.find(a => a.startsWith('--business='))?.split('=')[1] || 'boo';

        processInspectionQueue({ business, limit })
            .then(() => console.log('\nDone!'))
            .catch(err => {
                console.error('Error:', err);
                process.exit(1);
            });

    } else if (args[0] && !args[0].startsWith('-')) {
        // Single URL inspection
        const url = args[0];
        initGSCClient().then(async gsc => {
            if (!gsc) return;
            const result = await inspectUrl(gsc, url);
            console.log('\nInspection Result:');
            console.log(JSON.stringify(result, null, 2));
        });

    } else {
        console.log('Usage:');
        console.log('  node inspect-urls.js <url>                    # Inspect single URL');
        console.log('  node inspect-urls.js --queue [--limit=100]    # Process inspection queue');
    }
}

module.exports = {
    inspectUrl,
    inspectUrls,
    processInspectionQueue,
    initGSCClient
};
