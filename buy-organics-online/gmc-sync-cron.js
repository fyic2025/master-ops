/**
 * Google Merchant Center Daily Sync Cron Job
 *
 * Runs the GMC product sync daily at 3:00 AM AEST (17:00 UTC)
 * - Syncs product statuses from GMC
 * - Creates daily snapshot for trend tracking
 * - Logs sync to google_ads_sync_log
 *
 * Usage:
 *   node gmc-sync-cron.js           # Start cron (runs at 3am AEST)
 *   node gmc-sync-cron.js --now     # Run immediately
 *   node gmc-sync-cron.js --summary # Show current status
 */

const cron = require('node-cron');
const path = require('path');
const https = require('https');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });

// Configuration
const CONFIG = {
    business: 'boo',
    schedule: '0 17 * * *', // 17:00 UTC = 3:00 AM AEST (after GSC sync at 2am)
    timezone: 'UTC'
};

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

async function supabaseRequest(method, path) {
    const url = new URL(DATA_SUPABASE_URL + path);

    const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method,
        headers: {
            'apikey': DATA_SUPABASE_KEY,
            'Authorization': `Bearer ${DATA_SUPABASE_KEY}`,
            'Content-Type': 'application/json',
        },
    };

    const response = await httpsRequest(options);
    return JSON.parse(response.data || '[]');
}

// ============================================
// SUMMARY FUNCTIONS
// ============================================

async function getGMCSummary() {
    try {
        // Get BOO account
        const accounts = await supabaseRequest('GET', '/rest/v1/google_ads_accounts?business=eq.boo');
        if (!accounts || accounts.length === 0) {
            return { error: 'BOO account not found' };
        }
        const accountId = accounts[0].id;

        // Get product counts
        const products = await supabaseRequest('GET', `/rest/v1/google_merchant_products?account_id=eq.${accountId}&select=approval_status,item_issues`);

        // Calculate stats
        const stats = {
            total: products.length,
            approved: products.filter(p => p.approval_status === 'approved').length,
            disapproved: products.filter(p => p.approval_status === 'disapproved').length,
            pending: products.filter(p => p.approval_status === 'pending').length,
            withIssues: products.filter(p => p.item_issues && p.item_issues.length > 0).length,
        };

        // Get last sync
        const syncLogs = await supabaseRequest('GET', `/rest/v1/google_ads_sync_log?account_id=eq.${accountId}&sync_type=eq.merchant&order=completed_at.desc&limit=1`);
        const lastSync = syncLogs.length > 0 ? syncLogs[0] : null;

        // Get latest snapshot
        const snapshots = await supabaseRequest('GET', `/rest/v1/google_merchant_account_snapshots?account_id=eq.${accountId}&order=snapshot_date.desc&limit=1`);
        const latestSnapshot = snapshots.length > 0 ? snapshots[0] : null;

        return {
            stats,
            lastSync: lastSync ? {
                date: lastSync.completed_at,
                status: lastSync.status,
                recordsFetched: lastSync.records_fetched,
            } : null,
            latestSnapshot: latestSnapshot ? {
                date: latestSnapshot.snapshot_date,
                approvalRate: latestSnapshot.approval_rate,
                errors: latestSnapshot.total_errors,
                warnings: latestSnapshot.total_warnings,
            } : null,
        };
    } catch (err) {
        return { error: err.message };
    }
}

// ============================================
// SYNC RUNNER
// ============================================

async function runDailySync() {
    console.log('\n' + '═'.repeat(70));
    console.log(`🛒 GMC SYNC CRON - Starting at ${new Date().toISOString()}`);
    console.log('═'.repeat(70));

    // Import and run the sync script
    const syncScript = require('../shared/libs/integrations/google-merchant/sync-products');

    // The sync-products.js exports nothing and runs via main()
    // We need to run it as a child process or refactor it
    // For now, let's spawn it as a child process

    const { spawn } = require('child_process');
    const syncPath = path.resolve(__dirname, '../shared/libs/integrations/google-merchant/sync-products.js');

    return new Promise((resolve, reject) => {
        const child = spawn('node', [syncPath], {
            cwd: path.dirname(syncPath),
            env: process.env,
            stdio: 'inherit',
        });

        child.on('close', (code) => {
            if (code === 0) {
                console.log('\n✅ GMC sync completed successfully');
                resolve({ success: true, exitCode: code });
            } else {
                console.error(`\n❌ GMC sync failed with code ${code}`);
                reject(new Error(`Sync exited with code ${code}`));
            }
        });

        child.on('error', (err) => {
            console.error('\n❌ Failed to spawn sync process:', err.message);
            reject(err);
        });
    });
}

// ============================================
// CRON SCHEDULER
// ============================================

function startCron() {
    console.log('═'.repeat(70));
    console.log('🕐 GMC SYNC CRON - Starting Scheduler');
    console.log('═'.repeat(70));
    console.log(`Business: ${CONFIG.business}`);
    console.log(`Schedule: ${CONFIG.schedule} (${CONFIG.timezone})`);
    console.log(`Next run: 3:00 AM AEST daily`);
    console.log('─'.repeat(70));
    console.log('Press Ctrl+C to stop\n');

    cron.schedule(CONFIG.schedule, async () => {
        console.log(`\n[${new Date().toISOString()}] Cron triggered`);
        try {
            await runDailySync();
        } catch (error) {
            console.error('Cron job error:', error.message);
        }
    }, {
        timezone: CONFIG.timezone
    });

    // Keep process alive
    process.on('SIGINT', () => {
        console.log('\n\nStopping GMC Sync Cron...');
        process.exit(0);
    });
}

// ============================================
// CLI INTERFACE
// ============================================

if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.includes('--now')) {
        // Run immediately
        runDailySync()
            .then(() => {
                console.log('\n✅ Immediate run complete');
                process.exit(0);
            })
            .catch(err => {
                console.error('Error:', err);
                process.exit(1);
            });

    } else if (args.includes('--summary')) {
        // Show current summary
        getGMCSummary().then(summary => {
            console.log('\n🛒 Current GMC Status:');
            console.log('─'.repeat(40));

            if (summary.error) {
                console.log(`Error: ${summary.error}`);
            } else {
                console.log(`Products:`);
                console.log(`  Total: ${summary.stats.total}`);
                console.log(`  Approved: ${summary.stats.approved}`);
                console.log(`  Disapproved: ${summary.stats.disapproved}`);
                console.log(`  Pending: ${summary.stats.pending}`);
                console.log(`  With Issues: ${summary.stats.withIssues}`);

                if (summary.lastSync) {
                    console.log(`\nLast Sync:`);
                    console.log(`  Date: ${summary.lastSync.date}`);
                    console.log(`  Status: ${summary.lastSync.status}`);
                    console.log(`  Records: ${summary.lastSync.recordsFetched}`);
                }

                if (summary.latestSnapshot) {
                    console.log(`\nLatest Snapshot (${summary.latestSnapshot.date}):`);
                    console.log(`  Approval Rate: ${summary.latestSnapshot.approvalRate?.toFixed(1)}%`);
                    console.log(`  Errors: ${summary.latestSnapshot.errors}`);
                    console.log(`  Warnings: ${summary.latestSnapshot.warnings}`);
                }
            }

            process.exit(0);
        });

    } else {
        // Start cron scheduler
        startCron();
    }
}

module.exports = { runDailySync, startCron, getGMCSummary, CONFIG };
