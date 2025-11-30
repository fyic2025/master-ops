/**
 * GSC Issues Daily Sync Cron Job
 *
 * Runs the GSC issues sync daily at 2:00 AM AEST (16:00 UTC)
 * - Syncs Search Analytics data
 * - Detects anomalies (traffic drops, new URLs)
 * - Inspects flagged URLs via URL Inspection API
 * - Updates issue tracking
 *
 * Usage:
 *   node gsc-issues-cron.js           # Start cron (runs at 2am AEST)
 *   node gsc-issues-cron.js --now     # Run immediately
 *   node gsc-issues-cron.js --test    # Test mode (no API calls)
 */

const cron = require('node-cron');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });

const { runGSCIssuesSync, getIssueSummary } = require('../shared/libs/integrations/gsc/sync-gsc-issues');

// Configuration
const CONFIG = {
    business: 'boo',
    budget: 500,           // Daily API call budget
    schedule: '0 16 * * *', // 16:00 UTC = 2:00 AM AEST
    timezone: 'UTC'
};

/**
 * Run the daily sync
 */
async function runDailySync(options = {}) {
    const { testMode = false } = options;

    console.log('\n' + '═'.repeat(70));
    console.log(`🔄 GSC ISSUES CRON - Starting at ${new Date().toISOString()}`);
    console.log('═'.repeat(70));

    try {
        const results = await runGSCIssuesSync({
            business: CONFIG.business,
            budget: CONFIG.budget,
            skipInspection: testMode  // Skip API calls in test mode
        });

        // Log summary
        console.log('\n📊 Issue Summary After Sync:');
        const summary = await getIssueSummary(CONFIG.business);
        console.log(`   Active Critical: ${summary.active.critical}`);
        console.log(`   Active Warning: ${summary.active.warning}`);
        console.log(`   Resolved Today: ${results.inspection?.resolved || 0}`);

        return results;

    } catch (error) {
        console.error('\n❌ Cron job failed:', error.message);
        console.error(error.stack);
        throw error;
    }
}

/**
 * Start the cron scheduler
 */
function startCron() {
    console.log('═'.repeat(70));
    console.log('🕐 GSC ISSUES CRON - Starting Scheduler');
    console.log('═'.repeat(70));
    console.log(`Business: ${CONFIG.business}`);
    console.log(`Schedule: ${CONFIG.schedule} (${CONFIG.timezone})`);
    console.log(`API Budget: ${CONFIG.budget}/day`);
    console.log(`Next run: 2:00 AM AEST daily`);
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
        console.log('\n\nStopping GSC Issues Cron...');
        process.exit(0);
    });
}

// CLI interface
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

    } else if (args.includes('--test')) {
        // Test mode - no API calls
        runDailySync({ testMode: true })
            .then(() => {
                console.log('\n✅ Test run complete (no API calls made)');
                process.exit(0);
            })
            .catch(err => {
                console.error('Error:', err);
                process.exit(1);
            });

    } else if (args.includes('--summary')) {
        // Just show current summary
        getIssueSummary(CONFIG.business).then(summary => {
            console.log('\n📊 Current GSC Issue Summary:');
            console.log('─'.repeat(40));
            console.log(`Active Critical: ${summary.active.critical}`);
            console.log(`Active Warning: ${summary.active.warning}`);
            console.log(`Resolved: ${summary.resolved.critical + summary.resolved.warning}`);
            console.log('\nBy Type:');
            for (const [type, count] of Object.entries(summary.byType)) {
                console.log(`  ${type}: ${count}`);
            }
            process.exit(0);
        });

    } else {
        // Start cron scheduler
        startCron();
    }
}

module.exports = { runDailySync, startCron, CONFIG };
