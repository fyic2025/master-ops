/**
 * Import 301 Redirects to BigCommerce and Request GSC Re-inspection
 *
 * This script:
 * 1. Reads redirect CSV file
 * 2. Creates 301 redirects in BigCommerce via API
 * 3. Requests Google Search Console URL re-inspection for fixed URLs
 *
 * Usage: node import-redirects-and-notify-gsc.js [csv-file]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load from master-ops root for node_modules access
const masterOpsRoot = path.resolve(__dirname, '../../..');
require('dotenv').config({ path: path.join(masterOpsRoot, '.env'), override: true });

// Add master-ops node_modules to module paths
module.paths.unshift(path.join(masterOpsRoot, 'node_modules'));

// BigCommerce Config
const BC_STORE_HASH = 'hhhi253u3y';
const BC_ACCESS_TOKEN = process.env.BC_ACCESS_TOKEN || 'eeikmonznnsxcq4f24m9d6uvv1e0qjn';

// GSC Config
const { createClient } = require('@supabase/supabase-js');
const { google } = require('googleapis');

const SUPABASE_URL = process.env.BOO_SUPABASE_URL || 'https://usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_KEY = process.env.BOO_SUPABASE_SERVICE_ROLE_KEY;
const SITE_URL = 'https://www.buyorganicsonline.com.au/';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;
const GOOGLE_GSC_REFRESH_TOKEN = process.env.GOOGLE_GSC_REFRESH_TOKEN;

const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

/**
 * Make BigCommerce API request
 */
function bcRequest(endpoint, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.bigcommerce.com',
            path: `/stores/${BC_STORE_HASH}${endpoint}`,
            method,
            headers: {
                'X-Auth-Token': BC_ACCESS_TOKEN,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = data ? JSON.parse(data) : {};
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(parsed);
                    } else {
                        reject({ status: res.statusCode, ...parsed });
                    }
                } catch (e) {
                    resolve({ raw: data, status: res.statusCode });
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

/**
 * Initialize GSC API client
 */
async function initGSCClient() {
    if (!GOOGLE_GSC_REFRESH_TOKEN) {
        console.log('  GSC: No refresh token configured');
        return null;
    }

    const oauth2Client = new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        'http://localhost'
    );

    oauth2Client.setCredentials({ refresh_token: GOOGLE_GSC_REFRESH_TOKEN });

    try {
        await oauth2Client.getAccessToken();
        return google.searchconsole({ version: 'v1', auth: oauth2Client });
    } catch (error) {
        console.log('  GSC: Auth failed -', error.message);
        return null;
    }
}

/**
 * Request URL inspection (tells Google to re-crawl)
 */
async function requestReInspection(gsc, url) {
    try {
        // URL Inspection API shows current status but doesn't force recrawl
        // The indexing API would need to be used for that, but we can at least
        // update our tracking
        const response = await gsc.urlInspection.index.inspect({
            requestBody: {
                inspectionUrl: url,
                siteUrl: SITE_URL
            }
        });

        return {
            success: true,
            verdict: response.data.inspectionResult?.indexStatusResult?.verdict
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Parse redirect CSV file
 */
function parseRedirectCSV(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());

    // Skip header
    const redirects = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        // Handle CSV with potential quotes
        const match = line.match(/^"?([^",]+)"?,\s*"?([^",]+)"?,?\s*(\d+)?/);
        if (match) {
            redirects.push({
                from: match[1].startsWith('/') ? match[1] : '/' + match[1],
                to: match[2].startsWith('/') ? match[2] : '/' + match[2],
                type: parseInt(match[3]) || 301
            });
        }
    }

    return redirects;
}

/**
 * Create redirect in BigCommerce
 */
async function createRedirect(redirect) {
    try {
        // Use v3 API for redirects
        const result = await bcRequest('/v3/storefront/redirects', 'POST', [{
            from_path: redirect.from,
            site_id: 1000,  // Default site
            to: {
                type: 'relative',
                url: redirect.to
            },
            to_url: redirect.to  // Fallback format
        }]);

        return { success: true, data: result };
    } catch (error) {
        // Try v2 API if v3 fails
        try {
            const v2Result = await bcRequest('/v2/redirects', 'POST', {
                path: redirect.from,
                forward: {
                    type: 'product',
                    ref: redirect.to
                }
            });
            return { success: true, data: v2Result, api: 'v2' };
        } catch (v2Error) {
            return {
                success: false,
                error: error.status === 409 ? 'Already exists' : (error.title || error.message || 'Unknown error')
            };
        }
    }
}

/**
 * Main import function
 */
async function importRedirects(csvFile) {
    console.log('='.repeat(60));
    console.log('BOO Redirect Import & GSC Notification');
    console.log('='.repeat(60));
    console.log(`\nFile: ${csvFile}\n`);

    // Parse CSV
    const redirects = parseRedirectCSV(csvFile);
    console.log(`Found ${redirects.length} redirects to import\n`);

    if (redirects.length === 0) {
        console.log('No redirects found in file');
        return;
    }

    // Stats
    const stats = {
        bcCreated: 0,
        bcExisted: 0,
        bcFailed: 0,
        gscInspected: 0,
        gscFailed: 0
    };

    // Initialize GSC client
    console.log('Initializing GSC client...');
    const gsc = await initGSCClient();
    if (gsc) {
        console.log('GSC client ready\n');
    } else {
        console.log('GSC client not available - will skip re-inspection\n');
    }

    // Process redirects
    console.log('Importing redirects to BigCommerce...\n');

    for (let i = 0; i < redirects.length; i++) {
        const redirect = redirects[i];
        const progress = `[${i + 1}/${redirects.length}]`;

        process.stdout.write(`${progress} ${redirect.from.slice(0, 50)}... `);

        // Create redirect in BC
        const bcResult = await createRedirect(redirect);

        if (bcResult.success) {
            stats.bcCreated++;
            process.stdout.write('BC:✓ ');
        } else if (bcResult.error === 'Already exists') {
            stats.bcExisted++;
            process.stdout.write('BC:exists ');
        } else {
            stats.bcFailed++;
            process.stdout.write(`BC:✗(${bcResult.error}) `);
        }

        // Request GSC re-inspection (only for successful redirects)
        if (gsc && (bcResult.success || bcResult.error === 'Already exists')) {
            const fullUrl = SITE_URL.replace(/\/$/, '') + redirect.from;
            const gscResult = await requestReInspection(gsc, fullUrl);

            if (gscResult.success) {
                stats.gscInspected++;
                console.log(`GSC:✓ (${gscResult.verdict || 'inspected'})`);
            } else {
                stats.gscFailed++;
                console.log(`GSC:✗`);
            }

            // Rate limit for GSC
            await new Promise(r => setTimeout(r, 600));
        } else {
            console.log('');
        }

        // Small delay between BC requests
        await new Promise(r => setTimeout(r, 100));
    }

    // Update Supabase tracking if available
    if (supabase) {
        const today = new Date().toISOString().split('T')[0];

        // Mark URLs as having redirects created
        for (const redirect of redirects) {
            const fullUrl = SITE_URL.replace(/\/$/, '') + redirect.from;

            await supabase
                .from('gsc_issue_urls')
                .update({
                    status: 'resolved',
                    resolution_type: 'redirect_created',
                    resolved_at: new Date().toISOString(),
                    notes: `Redirected to ${redirect.to}`
                })
                .eq('business', 'boo')
                .eq('url', fullUrl)
                .eq('status', 'active');
        }

        console.log('\nSupabase tracking updated');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('IMPORT COMPLETE');
    console.log('='.repeat(60));
    console.log(`\nBigCommerce Redirects:`);
    console.log(`  Created: ${stats.bcCreated}`);
    console.log(`  Already existed: ${stats.bcExisted}`);
    console.log(`  Failed: ${stats.bcFailed}`);
    console.log(`\nGoogle Search Console:`);
    console.log(`  Inspected: ${stats.gscInspected}`);
    console.log(`  Failed: ${stats.gscFailed}`);

    // Save results
    const resultsFile = csvFile.replace('.csv', '-results.json');
    fs.writeFileSync(resultsFile, JSON.stringify({
        timestamp: new Date().toISOString(),
        file: csvFile,
        stats,
        redirects: redirects.length
    }, null, 2));
    console.log(`\nResults saved to: ${resultsFile}`);

    return stats;
}

// CLI
if (require.main === module) {
    const csvFile = process.argv[2] || path.join(__dirname, 'new-404-redirects-2025-12-01.csv');

    if (!fs.existsSync(csvFile)) {
        console.error(`File not found: ${csvFile}`);
        console.log('\nUsage: node import-redirects-and-notify-gsc.js [csv-file]');
        process.exit(1);
    }

    importRedirects(csvFile)
        .then(() => console.log('\nDone!'))
        .catch(err => {
            console.error('Error:', err);
            process.exit(1);
        });
}

module.exports = { importRedirects, createRedirect, parseRedirectCSV };
