/**
 * SEO Coordinator Agent
 *
 * Purpose: Orchestrate all SEO agents and manage workflows
 * - Run daily/weekly optimization cycles
 * - Coordinate agent priorities
 * - Generate reports and insights
 * - Handle escalations and alerts
 */

const { createClient } = require('@supabase/supabase-js');

// Import agents
const { analyzeProducts: analyzeContentFormat, getContentStats } = require('./content-format');
const { classifyProducts, getClassificationStats } = require('./classification');
const { syncPageData, getGSCStats, updateProductImpressions } = require('./gsc-data');
const { researchProductKeywords, researchCategoryKeywords, findOpportunities, getKeywordStats } = require('./keyword-research');
const { scanProducts: scanHealthClaims, getClaimsStats } = require('./health-claims');
const { processContentQueue, generateForHighTraffic, getContentStats: getGenerationStats } = require('./content-generation');

// Configuration
const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_KEY = process.env.BOO_SUPABASE_SERVICE_ROLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Run daily optimization cycle
 */
async function runDailyCycle(options = {}) {
    const startTime = Date.now();

    console.log('='.repeat(70));
    console.log('SEO COORDINATOR - Starting Daily Optimization Cycle');
    console.log('='.repeat(70));
    console.log(`Started at: ${new Date().toISOString()}`);

    const results = {
        cycle: 'daily',
        started_at: new Date().toISOString(),
        agents: {},
        errors: []
    };

    try {
        // 1. Sync GSC data (critical - do first)
        console.log('\n--- Stage 1: GSC Data Sync ---');
        try {
            results.agents.gsc = await syncPageData({ days: 7 });
            await updateProductImpressions();
        } catch (err) {
            console.log(`GSC sync skipped: ${err.message}`);
            results.errors.push({ agent: 'gsc', error: err.message });
        }

        // 2. Analyze content format for new/changed products
        console.log('\n--- Stage 2: Content Format Analysis ---');
        try {
            results.agents.contentFormat = await analyzeContentFormat({ limit: 500 });
        } catch (err) {
            console.log(`Content format error: ${err.message}`);
            results.errors.push({ agent: 'contentFormat', error: err.message });
        }

        // 3. Classify new products
        console.log('\n--- Stage 3: Product Classification ---');
        try {
            results.agents.classification = await classifyProducts({ limit: 100 });
        } catch (err) {
            console.log(`Classification error: ${err.message}`);
            results.errors.push({ agent: 'classification', error: err.message });
        }

        // 4. Find keyword opportunities from GSC
        console.log('\n--- Stage 4: Keyword Opportunities ---');
        try {
            results.agents.keywordOpportunities = await findOpportunities();
        } catch (err) {
            console.log(`Keyword opportunities error: ${err.message}`);
            results.errors.push({ agent: 'keywordOpportunities', error: err.message });
        }

        // 5. Queue high-traffic products for content generation
        console.log('\n--- Stage 5: Content Queue ---');
        try {
            results.agents.contentQueue = await generateForHighTraffic({ limit: 20 });
        } catch (err) {
            console.log(`Content queue error: ${err.message}`);
            results.errors.push({ agent: 'contentQueue', error: err.message });
        }

        // 6. Process content queue (limited in daily)
        console.log('\n--- Stage 6: Content Generation ---');
        try {
            results.agents.contentGeneration = await processContentQueue({ limit: 5 });
        } catch (err) {
            console.log(`Content generation error: ${err.message}`);
            results.errors.push({ agent: 'contentGeneration', error: err.message });
        }

    } catch (error) {
        console.error('Critical error in daily cycle:', error);
        results.errors.push({ critical: true, error: error.message });
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    results.completed_at = new Date().toISOString();
    results.duration_seconds = duration;

    // Log cycle completion
    await supabase.from('seo_agent_logs').insert({
        agent_name: 'coordinator',
        action: 'daily_cycle_completed',
        details: results,
        status: results.errors.length > 0 ? 'completed_with_errors' : 'completed'
    });

    console.log('\n' + '='.repeat(70));
    console.log('DAILY CYCLE COMPLETE');
    console.log('='.repeat(70));
    console.log(`Duration: ${duration} seconds`);
    console.log(`Errors: ${results.errors.length}`);

    return results;
}

/**
 * Run weekly deep optimization cycle
 */
async function runWeeklyCycle(options = {}) {
    const startTime = Date.now();

    console.log('='.repeat(70));
    console.log('SEO COORDINATOR - Starting Weekly Deep Optimization Cycle');
    console.log('='.repeat(70));
    console.log(`Started at: ${new Date().toISOString()}`);

    const results = {
        cycle: 'weekly',
        started_at: new Date().toISOString(),
        agents: {},
        errors: []
    };

    try {
        // 1. Full GSC sync (30 days)
        console.log('\n--- Stage 1: Full GSC Sync (30 days) ---');
        try {
            results.agents.gsc = await syncPageData({ days: 30 });
        } catch (err) {
            results.errors.push({ agent: 'gsc', error: err.message });
        }

        // 2. Deep content format analysis
        console.log('\n--- Stage 2: Deep Content Analysis ---');
        try {
            results.agents.contentFormat = await analyzeContentFormat({ limit: 2000 });
        } catch (err) {
            results.errors.push({ agent: 'contentFormat', error: err.message });
        }

        // 3. Full product classification
        console.log('\n--- Stage 3: Full Classification ---');
        try {
            results.agents.classification = await classifyProducts({ limit: 500 });
        } catch (err) {
            results.errors.push({ agent: 'classification', error: err.message });
        }

        // 4. Keyword research for products
        console.log('\n--- Stage 4: Product Keyword Research ---');
        try {
            results.agents.productKeywords = await researchProductKeywords({ limit: 100 });
        } catch (err) {
            results.errors.push({ agent: 'productKeywords', error: err.message });
        }

        // 5. Category keyword research
        console.log('\n--- Stage 5: Category Keyword Research ---');
        try {
            results.agents.categoryKeywords = await researchCategoryKeywords({ limit: 50 });
        } catch (err) {
            results.errors.push({ agent: 'categoryKeywords', error: err.message });
        }

        // 6. Health claims scan
        console.log('\n--- Stage 6: Health Claims Scan ---');
        try {
            results.agents.healthClaims = await scanHealthClaims({ limit: 200, useAI: true });
        } catch (err) {
            results.errors.push({ agent: 'healthClaims', error: err.message });
        }

        // 7. Batch content generation
        console.log('\n--- Stage 7: Batch Content Generation ---');
        try {
            results.agents.contentGeneration = await processContentQueue({ limit: 25 });
        } catch (err) {
            results.errors.push({ agent: 'contentGeneration', error: err.message });
        }

    } catch (error) {
        console.error('Critical error in weekly cycle:', error);
        results.errors.push({ critical: true, error: error.message });
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    results.completed_at = new Date().toISOString();
    results.duration_seconds = duration;

    // Log cycle completion
    await supabase.from('seo_agent_logs').insert({
        agent_name: 'coordinator',
        action: 'weekly_cycle_completed',
        details: results,
        status: results.errors.length > 0 ? 'completed_with_errors' : 'completed'
    });

    console.log('\n' + '='.repeat(70));
    console.log('WEEKLY CYCLE COMPLETE');
    console.log('='.repeat(70));
    console.log(`Duration: ${Math.round(duration / 60)} minutes`);
    console.log(`Errors: ${results.errors.length}`);

    return results;
}

/**
 * Generate comprehensive SEO report
 */
async function generateReport() {
    console.log('='.repeat(70));
    console.log('SEO TEAM - Comprehensive Report');
    console.log('='.repeat(70));
    console.log(`Generated: ${new Date().toISOString()}\n`);

    const report = {
        generated_at: new Date().toISOString(),
        sections: {}
    };

    // Products overview
    const { data: products } = await supabase
        .from('seo_products')
        .select('content_status, classification_status, seo_status, has_brand, has_description');

    const productStats = {
        total: products?.length || 0,
        with_brand: products?.filter(p => p.has_brand).length || 0,
        with_description: products?.filter(p => p.has_description).length || 0,
        content_status: {},
        classification_status: {},
        seo_status: {}
    };

    for (const p of products || []) {
        productStats.content_status[p.content_status] = (productStats.content_status[p.content_status] || 0) + 1;
        productStats.classification_status[p.classification_status] = (productStats.classification_status[p.classification_status] || 0) + 1;
        productStats.seo_status[p.seo_status] = (productStats.seo_status[p.seo_status] || 0) + 1;
    }

    report.sections.products = productStats;

    console.log('PRODUCTS');
    console.log('-'.repeat(40));
    console.log(`Total: ${productStats.total}`);
    console.log(`With brand: ${productStats.with_brand} (${((productStats.with_brand / productStats.total) * 100).toFixed(1)}%)`);
    console.log(`With description: ${productStats.with_description} (${((productStats.with_description / productStats.total) * 100).toFixed(1)}%)`);
    console.log('\nContent Status:');
    for (const [status, count] of Object.entries(productStats.content_status)) {
        console.log(`  ${status}: ${count}`);
    }

    // GSC Stats
    try {
        const gscStats = await getGSCStats();
        report.sections.gsc = gscStats;

        console.log('\nGOOGLE SEARCH CONSOLE');
        console.log('-'.repeat(40));
        if (gscStats) {
            console.log(`Total pages tracked: ${gscStats.total_pages}`);
            console.log(`Total impressions: ${gscStats.total_impressions?.toLocaleString()}`);
            console.log(`Total clicks: ${gscStats.total_clicks?.toLocaleString()}`);
        } else {
            console.log('No GSC data available');
        }
    } catch (e) {
        console.log('GSC stats not available');
    }

    // Keywords
    try {
        const keywordStats = await getKeywordStats();
        report.sections.keywords = keywordStats;

        console.log('\nKEYWORDS');
        console.log('-'.repeat(40));
        if (keywordStats) {
            console.log(`Total keywords: ${keywordStats.total}`);
            console.log(`Total search volume: ${keywordStats.total_volume?.toLocaleString()}`);
            console.log(`Average opportunity score: ${keywordStats.avg_opportunity}`);
            console.log('\nBy Priority:');
            for (const [priority, count] of Object.entries(keywordStats.by_priority || {})) {
                console.log(`  ${priority}: ${count}`);
            }
        }
    } catch (e) {
        console.log('Keyword stats not available');
    }

    // Health Claims
    try {
        const claimsStats = await getClaimsStats();
        report.sections.healthClaims = claimsStats;

        console.log('\nHEALTH CLAIMS');
        console.log('-'.repeat(40));
        if (claimsStats) {
            console.log(`Total claims: ${claimsStats.total}`);
            console.log('\nBy Severity:');
            for (const [severity, count] of Object.entries(claimsStats.by_severity || {})) {
                console.log(`  ${severity}: ${count}`);
            }
            console.log('\nBy Status:');
            for (const [status, count] of Object.entries(claimsStats.by_status || {})) {
                console.log(`  ${status}: ${count}`);
            }
        }
    } catch (e) {
        console.log('Claims stats not available');
    }

    // Content Queue
    try {
        const contentStats = await getGenerationStats();
        report.sections.contentQueue = contentStats;

        console.log('\nCONTENT QUEUE');
        console.log('-'.repeat(40));
        if (contentStats?.queue) {
            console.log(`Items in queue: ${contentStats.queue.total}`);
            console.log('\nBy Status:');
            for (const [status, count] of Object.entries(contentStats.queue.by_status || {})) {
                console.log(`  ${status}: ${count}`);
            }
        }
    } catch (e) {
        console.log('Content queue stats not available');
    }

    // Recent agent activity
    const { data: recentLogs } = await supabase
        .from('seo_agent_logs')
        .select('agent_name, action, status, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

    console.log('\nRECENT AGENT ACTIVITY');
    console.log('-'.repeat(40));
    for (const log of recentLogs || []) {
        const time = new Date(log.created_at).toLocaleString();
        console.log(`  [${log.status}] ${log.agent_name}: ${log.action} (${time})`);
    }

    // Save report to database
    await supabase.from('seo_agent_logs').insert({
        agent_name: 'coordinator',
        action: 'report_generated',
        details: report,
        status: 'completed'
    });

    return report;
}

/**
 * Get system health status
 */
async function getHealthStatus() {
    const health = {
        status: 'healthy',
        checks: {},
        timestamp: new Date().toISOString()
    };

    // Check database connection
    try {
        const { count } = await supabase.from('seo_products').select('*', { count: 'exact', head: true });
        health.checks.database = { status: 'ok', product_count: count };
    } catch (e) {
        health.checks.database = { status: 'error', error: e.message };
        health.status = 'degraded';
    }

    // Check last agent runs
    const { data: lastRuns } = await supabase
        .from('seo_agent_logs')
        .select('agent_name, created_at, status')
        .order('created_at', { ascending: false })
        .limit(20);

    const agentHealth = {};
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    for (const run of lastRuns || []) {
        if (!agentHealth[run.agent_name]) {
            const age = now - new Date(run.created_at).getTime();
            agentHealth[run.agent_name] = {
                last_run: run.created_at,
                status: run.status,
                age_hours: Math.round(age / (60 * 60 * 1000)),
                stale: age > oneDayMs
            };
        }
    }

    health.checks.agents = agentHealth;

    // Check for stale agents
    const staleAgents = Object.entries(agentHealth).filter(([_, a]) => a.stale);
    if (staleAgents.length > 3) {
        health.status = 'degraded';
    }

    return health;
}

/**
 * Run specific agent by name
 */
async function runAgent(agentName, options = {}) {
    console.log(`Running agent: ${agentName}`);

    switch (agentName) {
        case 'content-format':
            return await analyzeContentFormat(options);
        case 'classification':
            return await classifyProducts(options);
        case 'gsc-data':
            return await syncPageData(options);
        case 'keyword-research':
            return await researchProductKeywords(options);
        case 'health-claims':
            return await scanHealthClaims(options);
        case 'content-generation':
            return await processContentQueue(options);
        default:
            console.log(`Unknown agent: ${agentName}`);
            return null;
    }
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0] || 'report';
    const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '100');

    if (command === 'daily') {
        runDailyCycle().then(() => console.log('\nDaily cycle complete!'));
    } else if (command === 'weekly') {
        runWeeklyCycle().then(() => console.log('\nWeekly cycle complete!'));
    } else if (command === 'report') {
        generateReport().then(() => console.log('\nReport complete!'));
    } else if (command === 'health') {
        getHealthStatus().then(status => {
            console.log('System Health Status:');
            console.log(JSON.stringify(status, null, 2));
        });
    } else if (command === 'run') {
        const agentName = args[1];
        if (!agentName) {
            console.log('Usage: node coordinator.js run <agent-name> [options]');
            console.log('Agents: content-format, classification, gsc-data, keyword-research, health-claims, content-generation');
        } else {
            runAgent(agentName, { limit }).then(() => console.log('\nDone!'));
        }
    } else {
        console.log('SEO Coordinator - Usage:');
        console.log('  node coordinator.js daily          - Run daily optimization cycle');
        console.log('  node coordinator.js weekly         - Run weekly deep optimization');
        console.log('  node coordinator.js report         - Generate comprehensive report');
        console.log('  node coordinator.js health         - Check system health');
        console.log('  node coordinator.js run <agent>    - Run specific agent');
    }
}

module.exports = {
    runDailyCycle,
    runWeeklyCycle,
    generateReport,
    getHealthStatus,
    runAgent
};
