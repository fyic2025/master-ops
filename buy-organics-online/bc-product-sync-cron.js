/**
 * BigCommerce Product Sync Daily Cron Job
 *
 * Runs the BC product sync daily at 3:00 AM AEST (17:00 UTC)
 * - Syncs all BigCommerce products to Supabase
 * - Logs sync to automation_logs for dashboard tracking
 *
 * Usage:
 *   node bc-product-sync-cron.js           # Start cron (runs at 3am AEST)
 *   node bc-product-sync-cron.js --now     # Run immediately
 *   node bc-product-sync-cron.js --summary # Show current status
 */

const cron = require('node-cron');
const path = require('path');
const https = require('https');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });

// Configuration
const CONFIG = {
    business: 'boo',
    schedule: '0 17 * * *', // 17:00 UTC = 3:00 AM AEST
    timezone: 'UTC'
};

// Supabase configuration
const BOO_SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co';
const BOO_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

const DASHBOARD_SUPABASE_URL = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co';
const DASHBOARD_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8';

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

async function supabaseRequest(supabaseUrl, supabaseKey, method, path, body = null) {
    const url = new URL(supabaseUrl + path);

    const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method,
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
        },
    };

    const response = await httpsRequest(options, body ? JSON.stringify(body) : null);
    return JSON.parse(response.data || '[]');
}

// ============================================
// SUMMARY FUNCTIONS
// ============================================

async function getBCSummary() {
    try {
        // Get product count
        const products = await supabaseRequest(
            BOO_SUPABASE_URL,
            BOO_SUPABASE_KEY,
            'GET',
            '/rest/v1/ecommerce_products?select=id,last_synced_at&limit=1&order=last_synced_at.desc'
        );

        // Get product total
        const countResponse = await supabaseRequest(
            BOO_SUPABASE_URL,
            BOO_SUPABASE_KEY,
            'GET',
            '/rest/v1/ecommerce_products?select=count'
        );

        // Get last sync log
        const syncLogs = await supabaseRequest(
            BOO_SUPABASE_URL,
            BOO_SUPABASE_KEY,
            'GET',
            '/rest/v1/automation_logs?workflow_name=eq.BC%20%E2%86%92%20Supabase%20Product%20Sync%20(Script)&status=eq.success&order=completed_at.desc&limit=1'
        );

        const lastSync = syncLogs.length > 0 ? syncLogs[0] : null;
        const lastSyncedAt = products.length > 0 ? products[0].last_synced_at : null;

        return {
            totalProducts: countResponse?.length || 0,
            lastSyncedAt,
            lastSync: lastSync ? {
                date: lastSync.completed_at,
                status: lastSync.status,
                recordsProcessed: lastSync.records_processed,
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
    console.log('\n' + '='.repeat(70));
    console.log(`BC PRODUCT SYNC CRON - Starting at ${new Date().toISOString()}`);
    console.log('='.repeat(70));

    const { spawn } = require('child_process');
    const syncPath = path.resolve(__dirname, '../scripts/run-bc-product-sync.ts');

    return new Promise((resolve, reject) => {
        const child = spawn('npx', ['tsx', syncPath], {
            cwd: path.resolve(__dirname, '..'),
            env: process.env,
            stdio: 'inherit',
            shell: true,
        });

        child.on('close', async (code) => {
            if (code === 0) {
                console.log('\nBC product sync completed successfully');

                // Update dashboard job status
                try {
                    await supabaseRequest(
                        DASHBOARD_SUPABASE_URL,
                        DASHBOARD_SUPABASE_KEY,
                        'POST',
                        '/rest/v1/rpc/update_job_status',
                        {
                            p_job_name: 'bc-product-sync',
                            p_business: 'boo',
                            p_last_run: new Date().toISOString(),
                            p_success: true,
                            p_error_message: null
                        }
                    );
                    console.log('Updated dashboard job status to healthy');
                } catch (err) {
                    console.error('Failed to update dashboard:', err.message);
                }

                resolve({ success: true, exitCode: code });
            } else {
                console.error(`\nBC product sync failed with code ${code}`);

                // Update dashboard job status as failed
                try {
                    await supabaseRequest(
                        DASHBOARD_SUPABASE_URL,
                        DASHBOARD_SUPABASE_KEY,
                        'POST',
                        '/rest/v1/rpc/update_job_status',
                        {
                            p_job_name: 'bc-product-sync',
                            p_business: 'boo',
                            p_last_run: new Date().toISOString(),
                            p_success: false,
                            p_error_message: `Sync exited with code ${code}`
                        }
                    );
                } catch (err) {
                    console.error('Failed to update dashboard:', err.message);
                }

                reject(new Error(`Sync exited with code ${code}`));
            }
        });

        child.on('error', (err) => {
            console.error('\nFailed to spawn sync process:', err.message);
            reject(err);
        });
    });
}

// ============================================
// CRON SCHEDULER
// ============================================

function startCron() {
    console.log('='.repeat(70));
    console.log('BC PRODUCT SYNC CRON - Starting Scheduler');
    console.log('='.repeat(70));
    console.log(`Business: ${CONFIG.business}`);
    console.log(`Schedule: ${CONFIG.schedule} (${CONFIG.timezone})`);
    console.log(`Next run: 3:00 AM AEST daily`);
    console.log('-'.repeat(70));
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
        console.log('\n\nStopping BC Product Sync Cron...');
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
                console.log('\nImmediate run complete');
                process.exit(0);
            })
            .catch(err => {
                console.error('Error:', err);
                process.exit(1);
            });

    } else if (args.includes('--summary')) {
        // Show current summary
        getBCSummary().then(summary => {
            console.log('\nBigCommerce Product Sync Status:');
            console.log('-'.repeat(40));

            if (summary.error) {
                console.log(`Error: ${summary.error}`);
            } else {
                console.log(`Total Products: ${summary.totalProducts}`);
                console.log(`Last Synced At: ${summary.lastSyncedAt || 'Never'}`);

                if (summary.lastSync) {
                    console.log(`\nLast Sync:`);
                    console.log(`  Date: ${summary.lastSync.date}`);
                    console.log(`  Status: ${summary.lastSync.status}`);
                    console.log(`  Records: ${summary.lastSync.recordsProcessed}`);
                }
            }

            process.exit(0);
        });

    } else {
        // Start cron scheduler
        startCron();
    }
}

module.exports = { runDailySync, startCron, getBCSummary, CONFIG };
