/**
 * Backfill Google Merchant Center Historical Snapshots
 *
 * Creates a baseline snapshot from current data and sets up
 * the foundation for historical trend tracking.
 *
 * Note: GMC API doesn't provide historical performance data.
 * This script creates baseline snapshots that will build up over time
 * as the daily sync runs.
 *
 * Usage:
 *   node backfill-snapshots.js              # Create baseline snapshot for today
 *   node backfill-snapshots.js --days 7     # Create snapshots for past 7 days (same data)
 *   node backfill-snapshots.js --status     # Check snapshot status
 */

const https = require('https');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../../../.env') });

// Supabase configuration
const DATA_SUPABASE_URL = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co';
const DATA_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8';

// ============================================
// HTTP HELPERS
// ============================================

function httpsRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 400) {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                } else {
                    resolve({ statusCode: res.statusCode, data });
                }
            });
        });
        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
    });
}

async function supabaseGet(path) {
    const url = new URL(DATA_SUPABASE_URL + path);

    const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
            'apikey': DATA_SUPABASE_KEY,
            'Authorization': `Bearer ${DATA_SUPABASE_KEY}`,
            'Content-Type': 'application/json',
        },
    };

    const response = await httpsRequest(options);
    return JSON.parse(response.data || '[]');
}

async function supabasePost(path, body) {
    const url = new URL(DATA_SUPABASE_URL + path);

    const options = {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: {
            'apikey': DATA_SUPABASE_KEY,
            'Authorization': `Bearer ${DATA_SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates,return=representation',
        },
    };

    const postData = JSON.stringify(body);
    options.headers['Content-Length'] = Buffer.byteLength(postData);

    const response = await httpsRequest(options, postData);
    return JSON.parse(response.data || '[]');
}

// ============================================
// SNAPSHOT FUNCTIONS
// ============================================

async function getAccountAndProducts() {
    console.log('Fetching BOO account and products...');

    // Get BOO account
    const accounts = await supabaseGet('/rest/v1/google_ads_accounts?business=eq.boo');
    if (!accounts || accounts.length === 0) {
        throw new Error('BOO account not found. Run sync-products.js first.');
    }
    const account = accounts[0];
    console.log(`  Account ID: ${account.id}`);

    // Get all products
    const products = await supabaseGet(`/rest/v1/google_merchant_products?account_id=eq.${account.id}`);
    console.log(`  Products found: ${products.length}`);

    return { account, products };
}

function calculateStats(products) {
    let approved = 0, disapproved = 0, pending = 0;
    let totalErrors = 0, totalWarnings = 0, totalSuggestions = 0;
    let totalImpressions = 0, totalClicks = 0;

    for (const p of products) {
        // Count by status
        if (p.approval_status === 'approved') approved++;
        else if (p.approval_status === 'disapproved') disapproved++;
        else pending++;

        // Count issues
        if (p.item_issues && Array.isArray(p.item_issues)) {
            for (const issue of p.item_issues) {
                const severity = issue.severity || 'warning';
                if (severity === 'error') totalErrors++;
                else if (severity === 'warning') totalWarnings++;
                else totalSuggestions++;
            }
        }

        // Sum performance
        totalImpressions += p.impressions_30d || 0;
        totalClicks += p.clicks_30d || 0;
    }

    const total = products.length;
    const approvalRate = total > 0 ? (approved * 100.0 / total) : 0;
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) : 0;

    return {
        total,
        approved,
        disapproved,
        pending,
        totalErrors,
        totalWarnings,
        totalSuggestions,
        totalImpressions,
        totalClicks,
        approvalRate,
        ctr,
    };
}

async function createSnapshot(accountId, date, stats) {
    const snapshot = {
        account_id: accountId,
        snapshot_date: date,
        products_total: stats.total,
        products_active: stats.approved,
        products_pending: stats.pending,
        products_disapproved: stats.disapproved,
        products_expiring: 0,
        total_errors: stats.totalErrors,
        total_warnings: stats.totalWarnings,
        total_suggestions: stats.totalSuggestions,
        total_impressions_30d: stats.totalImpressions,
        total_clicks_30d: stats.totalClicks,
        approval_rate: stats.approvalRate,
        ctr: stats.ctr,
    };

    try {
        const result = await supabasePost('/rest/v1/google_merchant_account_snapshots', snapshot);
        return { success: true, date, result: result[0] };
    } catch (err) {
        return { success: false, date, error: err.message };
    }
}

async function checkSnapshotStatus(accountId) {
    const snapshots = await supabaseGet(
        `/rest/v1/google_merchant_account_snapshots?account_id=eq.${accountId}&order=snapshot_date.desc&limit=30`
    );

    if (snapshots.length === 0) {
        return { hasSnapshots: false, count: 0 };
    }

    return {
        hasSnapshots: true,
        count: snapshots.length,
        oldest: snapshots[snapshots.length - 1].snapshot_date,
        newest: snapshots[0].snapshot_date,
        latest: snapshots[0],
    };
}

// ============================================
// MAIN FUNCTIONS
// ============================================

async function backfillSnapshots(days = 1) {
    console.log('═'.repeat(60));
    console.log('Google Merchant Center - Backfill Snapshots');
    console.log('═'.repeat(60));

    // Get account and products
    const { account, products } = await getAccountAndProducts();

    if (products.length === 0) {
        console.log('\n⚠️  No products found. Run sync-products.js first to sync product data.');
        return;
    }

    // Calculate current stats
    const stats = calculateStats(products);
    console.log(`\nCurrent stats from ${products.length} products:`);
    console.log(`  Approved: ${stats.approved} (${stats.approvalRate.toFixed(1)}%)`);
    console.log(`  Disapproved: ${stats.disapproved}`);
    console.log(`  Pending: ${stats.pending}`);
    console.log(`  Errors: ${stats.totalErrors}, Warnings: ${stats.totalWarnings}`);

    // Create snapshots for requested days
    console.log(`\nCreating snapshots for ${days} day(s)...`);

    const results = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const result = await createSnapshot(account.id, dateStr, stats);
        results.push(result);

        if (result.success) {
            console.log(`  ✓ ${dateStr} - snapshot created`);
        } else {
            console.log(`  ✗ ${dateStr} - ${result.error}`);
        }
    }

    // Summary
    const successful = results.filter(r => r.success).length;
    console.log(`\n═'.repeat(60)`);
    console.log(`Backfill complete: ${successful}/${days} snapshots created`);
    console.log('═'.repeat(60));

    if (days === 1) {
        console.log('\nNote: Historical data will build up as the daily cron runs.');
        console.log('For 30-day trends, wait 30 days or run: node backfill-snapshots.js --days 30');
    }

    return results;
}

async function showStatus() {
    console.log('═'.repeat(60));
    console.log('Google Merchant Center - Snapshot Status');
    console.log('═'.repeat(60));

    const { account, products } = await getAccountAndProducts();
    const status = await checkSnapshotStatus(account.id);

    console.log('\nSnapshot Status:');
    if (!status.hasSnapshots) {
        console.log('  No snapshots found. Run: node backfill-snapshots.js');
    } else {
        console.log(`  Total snapshots: ${status.count}`);
        console.log(`  Date range: ${status.oldest} to ${status.newest}`);
        console.log(`\n  Latest snapshot (${status.latest.snapshot_date}):`);
        console.log(`    Products: ${status.latest.products_total}`);
        console.log(`    Approved: ${status.latest.products_active} (${status.latest.approval_rate?.toFixed(1)}%)`);
        console.log(`    Disapproved: ${status.latest.products_disapproved}`);
        console.log(`    Errors: ${status.latest.total_errors}`);
        console.log(`    Warnings: ${status.latest.total_warnings}`);
    }

    // Calculate days of data
    if (status.hasSnapshots) {
        const oldest = new Date(status.oldest);
        const newest = new Date(status.newest);
        const daysCovered = Math.ceil((newest - oldest) / (1000 * 60 * 60 * 24)) + 1;
        console.log(`\n  Days of trend data: ${daysCovered}`);

        if (daysCovered < 30) {
            console.log(`  (Need ${30 - daysCovered} more days for full 30-day trends)`);
        }
    }
}

// ============================================
// CLI
// ============================================

if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.includes('--status')) {
        showStatus()
            .then(() => process.exit(0))
            .catch(err => {
                console.error('Error:', err.message);
                process.exit(1);
            });

    } else {
        // Check for --days argument
        let days = 1;
        const daysIndex = args.indexOf('--days');
        if (daysIndex !== -1 && args[daysIndex + 1]) {
            days = parseInt(args[daysIndex + 1], 10);
            if (isNaN(days) || days < 1) days = 1;
            if (days > 90) days = 90; // Cap at 90 days
        }

        backfillSnapshots(days)
            .then(() => process.exit(0))
            .catch(err => {
                console.error('Error:', err.message);
                process.exit(1);
            });
    }
}

module.exports = { backfillSnapshots, showStatus, calculateStats };
