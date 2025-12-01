/**
 * LiveChat Sync Daily Cron Job
 *
 * Runs the LiveChat sync daily at 3:00 AM AEST (17:00 UTC)
 * - Syncs conversations from the last 2 days (overlap for safety)
 * - Archives chat history to Supabase
 *
 * Usage:
 *   node livechat-sync-cron.js           # Start cron (runs at 3am AEST)
 *   node livechat-sync-cron.js --now     # Run immediately
 */

const cron = require('node-cron');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });

// Configuration
const CONFIG = {
    business: 'boo',
    daysToSync: 2,              // Sync last 2 days (overlap for safety)
    schedule: '0 17 * * *',     // 17:00 UTC = 3:00 AM AEST
    timezone: 'UTC'
};

// Supabase config for status updates
const MASTER_HUB_URL = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co';
const MASTER_HUB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8';

/**
 * Update job status in Master Hub
 */
async function updateJobStatus(status, errorMessage = null) {
    const https = require('https');
    const now = new Date().toISOString();

    const body = {
        last_run_at: now,
        status: status,
        error_message: errorMessage
    };

    if (status === 'healthy') {
        body.last_success_at = now;
    }

    const url = new URL(`${MASTER_HUB_URL}/rest/v1/dashboard_job_status?job_name=eq.livechat-sync&business=eq.boo`);

    const postData = JSON.stringify(body);

    const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'PATCH',
        headers: {
            'apikey': MASTER_HUB_KEY,
            'Authorization': `Bearer ${MASTER_HUB_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

/**
 * Run the daily sync
 */
async function runDailySync() {
    console.log('\n' + '═'.repeat(70));
    console.log(`🔄 LIVECHAT SYNC CRON - Starting at ${new Date().toISOString()}`);
    console.log('═'.repeat(70));

    const scriptPath = path.resolve(__dirname, '../shared/libs/integrations/livechat/sync-conversations.js');
    const command = `node "${scriptPath}" --days=${CONFIG.daysToSync}`;

    console.log(`Running: ${command}\n`);

    try {
        const { stdout, stderr } = await execAsync(command, {
            cwd: path.resolve(__dirname, '..'),
            timeout: 300000, // 5 minute timeout
            env: process.env
        });

        console.log(stdout);
        if (stderr) console.log('stderr:', stderr);

        // Update job status to healthy
        await updateJobStatus('healthy');

        console.log('\n✅ Sync completed successfully');
        return { success: true, output: stdout };

    } catch (error) {
        console.error('\n❌ Sync failed:', error.message);

        // Update job status to failed
        await updateJobStatus('failed', error.message.slice(0, 500));

        return { success: false, error: error.message };
    }
}

/**
 * Start the cron scheduler
 */
function startCron() {
    console.log('═'.repeat(70));
    console.log('🕐 LIVECHAT SYNC CRON - Starting Scheduler');
    console.log('═'.repeat(70));
    console.log(`Business: ${CONFIG.business}`);
    console.log(`Schedule: ${CONFIG.schedule} (${CONFIG.timezone})`);
    console.log(`Days to sync: ${CONFIG.daysToSync}`);
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
        console.log('\n\nStopping LiveChat Sync Cron...');
        process.exit(0);
    });
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.includes('--now')) {
        // Run immediately
        runDailySync()
            .then(result => {
                console.log('\n✅ Immediate run complete');
                process.exit(result.success ? 0 : 1);
            })
            .catch(err => {
                console.error('Error:', err);
                process.exit(1);
            });

    } else {
        // Start cron scheduler
        startCron();
    }
}

module.exports = { runDailySync, startCron, CONFIG };
