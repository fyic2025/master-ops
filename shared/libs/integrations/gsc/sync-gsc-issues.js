/**
 * GSC Issues Sync Orchestrator
 *
 * Orchestrates the full daily GSC issues sync:
 * 1. Sync Search Analytics data (performance + daily history)
 * 2. Detect anomalies (traffic drops, new URLs, etc.)
 * 3. Inspect flagged URLs via URL Inspection API
 * 4. Update issue tracking and log results
 *
 * Usage:
 *   node sync-gsc-issues.js [--business=boo] [--budget=500]
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env'), override: true });

const { syncPageData, syncDailyStats } = require('./sync-gsc-data');
const { buildInspectionQueue } = require('./detect-issues');
const { inspectUrls } = require('./inspect-urls');

const SUPABASE_URL = process.env.BOO_SUPABASE_URL || 'https://usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_KEY = process.env.BOO_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Run the full GSC issues sync
 */
async function runGSCIssuesSync(options = {}) {
    const {
        business = 'boo',
        budget = 500,
        skipPerformanceSync = false,
        skipInspection = false
    } = options;

    const startTime = Date.now();
    const today = new Date().toISOString().split('T')[0];

    console.log('='.repeat(70));
    console.log(`GSC ISSUES SYNC - ${new Date().toISOString()}`);
    console.log(`Business: ${business}, API Budget: ${budget}`);
    console.log('='.repeat(70));

    const results = {
        performanceSync: null,
        dailyStats: null,
        anomalies: null,
        inspection: null,
        duration: 0,
        status: 'completed'
    };

    try {
        // Step 1: Sync Search Analytics (performance data)
        if (!skipPerformanceSync) {
            console.log('\n' + '─'.repeat(60));
            console.log('STEP 1: Syncing Search Analytics data');
            console.log('─'.repeat(60));

            results.performanceSync = await syncPageData({
                days: 30,
                business,
                includeDailyStats: true
            });
        }

        // Step 2: Build inspection queue from anomaly detection
        console.log('\n' + '─'.repeat(60));
        console.log('STEP 2: Detecting anomalies');
        console.log('─'.repeat(60));

        const { queue, summary } = await buildInspectionQueue({ business, budget });
        results.anomalies = summary;

        // Step 3: Run URL Inspection API on queue
        if (!skipInspection && queue.length > 0) {
            console.log('\n' + '─'.repeat(60));
            console.log('STEP 3: Running URL Inspection API');
            console.log('─'.repeat(60));

            results.inspection = await inspectUrls(queue, { business });
        } else if (queue.length === 0) {
            console.log('\n' + '─'.repeat(60));
            console.log('STEP 3: Skipped - No URLs to inspect');
            console.log('─'.repeat(60));
            results.inspection = { inspected: 0, issues: 0, resolved: 0, errors: 0 };
        }

        // Step 4: Log results
        results.duration = Date.now() - startTime;

        await supabase.from('gsc_sync_logs').insert({
            business,
            sync_date: today,
            pages_synced: results.performanceSync?.synced || 0,
            anomalies_detected: results.anomalies?.total || 0,
            urls_inspected: results.inspection?.inspected || 0,
            new_issues_found: results.inspection?.issues || 0,
            issues_resolved: results.inspection?.resolved || 0,
            api_calls_used: results.inspection?.inspected || 0,
            status: 'completed',
            duration_ms: results.duration
        });

    } catch (error) {
        console.error('\n❌ Sync failed:', error.message);
        results.status = 'failed';
        results.error = error.message;
        results.duration = Date.now() - startTime;

        await supabase.from('gsc_sync_logs').insert({
            business,
            sync_date: today,
            status: 'failed',
            error_message: error.message,
            duration_ms: results.duration
        });
    }

    // Final summary
    console.log('\n' + '='.repeat(70));
    console.log('GSC ISSUES SYNC COMPLETE');
    console.log('='.repeat(70));
    console.log(`Status: ${results.status}`);
    console.log(`Duration: ${(results.duration / 1000).toFixed(1)}s`);

    if (results.performanceSync) {
        console.log(`\nPerformance Sync:`);
        console.log(`  - Pages synced: ${results.performanceSync.synced}`);
        if (results.performanceSync.dailyStats) {
            console.log(`  - Daily stats: ${results.performanceSync.dailyStats.synced}`);
            console.log(`  - New URLs: ${results.performanceSync.dailyStats.newUrls}`);
        }
    }

    if (results.anomalies) {
        console.log(`\nAnomaly Detection:`);
        console.log(`  - Total anomalies: ${results.anomalies.total}`);
        for (const [reason, count] of Object.entries(results.anomalies.byReason || {})) {
            console.log(`  - ${reason}: ${count}`);
        }
    }

    if (results.inspection) {
        console.log(`\nURL Inspection:`);
        console.log(`  - Inspected: ${results.inspection.inspected}`);
        console.log(`  - New issues: ${results.inspection.issues}`);
        console.log(`  - Resolved: ${results.inspection.resolved}`);
        console.log(`  - Errors: ${results.inspection.errors}`);
    }

    return results;
}

/**
 * Get current issue summary
 */
async function getIssueSummary(business = 'boo') {
    const { data: issues } = await supabase
        .from('gsc_issue_urls')
        .select('issue_type, severity, status')
        .eq('business', business);

    const summary = {
        active: { critical: 0, warning: 0 },
        resolved: { critical: 0, warning: 0 },
        byType: {}
    };

    for (const issue of issues || []) {
        if (issue.status === 'active') {
            summary.active[issue.severity]++;
        } else if (issue.status === 'resolved') {
            summary.resolved[issue.severity]++;
        }
        summary.byType[issue.issue_type] = (summary.byType[issue.issue_type] || 0) + 1;
    }

    return summary;
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const business = args.find(a => a.startsWith('--business='))?.split('=')[1] || 'boo';
    const budget = parseInt(args.find(a => a.startsWith('--budget='))?.split('=')[1] || '500');
    const skipPerformance = args.includes('--skip-performance');
    const skipInspection = args.includes('--skip-inspection');
    const summaryOnly = args.includes('--summary');

    if (summaryOnly) {
        getIssueSummary(business).then(summary => {
            console.log('Current Issue Summary:');
            console.log(JSON.stringify(summary, null, 2));
        });
    } else {
        runGSCIssuesSync({
            business,
            budget,
            skipPerformanceSync: skipPerformance,
            skipInspection
        })
            .then(() => console.log('\n✅ Done!'))
            .catch(err => {
                console.error('Error:', err);
                process.exit(1);
            });
    }
}

module.exports = { runGSCIssuesSync, getIssueSummary };
