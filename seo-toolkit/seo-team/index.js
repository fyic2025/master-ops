/**
 * BOO SEO Team - Main Entry Point
 *
 * AI-powered SEO optimization for Buy Organics Online
 *
 * Agents:
 * - Classification: AI product categorization
 * - Content Format: Description analysis and standardization
 * - GSC Data: Google Search Console sync
 * - Keyword Research: DataForSEO integration
 * - Health Claims: Compliance scanning with PubMed
 * - Content Generation: AI content creation
 * - Coordinator: Orchestrates all agents
 */

const coordinator = require('./agents/coordinator');
const classification = require('./agents/classification');
const contentFormat = require('./agents/content-format');
const gscData = require('./agents/gsc-data');
const keywordResearch = require('./agents/keyword-research');
const healthClaims = require('./agents/health-claims');
const contentGeneration = require('./agents/content-generation');

module.exports = {
    // Coordinator functions
    runDailyCycle: coordinator.runDailyCycle,
    runWeeklyCycle: coordinator.runWeeklyCycle,
    generateReport: coordinator.generateReport,
    getHealthStatus: coordinator.getHealthStatus,

    // Individual agents
    agents: {
        classification,
        contentFormat,
        gscData,
        keywordResearch,
        healthClaims,
        contentGeneration,
        coordinator
    }
};

// CLI usage
if (require.main === module) {
    console.log('BOO SEO Team');
    console.log('='.repeat(50));
    console.log('');
    console.log('Available commands:');
    console.log('  npm run daily      - Run daily optimization cycle');
    console.log('  npm run weekly     - Run weekly deep optimization');
    console.log('  npm run report     - Generate SEO report');
    console.log('  npm run health     - Check system health');
    console.log('');
    console.log('Individual agents:');
    console.log('  npm run classify   - Run product classification');
    console.log('  npm run format     - Run content format analysis');
    console.log('  npm run gsc        - Sync GSC data');
    console.log('  npm run keywords   - Run keyword research');
    console.log('  npm run claims     - Scan health claims');
    console.log('  npm run generate   - Generate content');
    console.log('');
    console.log('Or require this module in your code:');
    console.log("  const seoTeam = require('./agents/seo-team');");
    console.log('  await seoTeam.runDailyCycle();');
}
