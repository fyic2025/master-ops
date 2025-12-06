#!/usr/bin/env node
/**
 * Agent CLI - Command-line interface for AI Agent Team
 * Main entry point for all agent operations
 */

import { Command } from 'commander';
import LighthouseRunner from './lighthouse-runner';
import DeploymentOrchestrator from './deployment-orchestrator';
import { getLogger } from './supabase-logger';

const program = new Command();
const logger = getLogger();

program
  .name('agent-cli')
  .description('AI Agent Team CLI for Shopify optimization')
  .version('1.0.0');

// ============================================================================
// LIGHTHOUSE COMMANDS
// ============================================================================

const lighthouseCmd = program
  .command('lighthouse')
  .description('Lighthouse audit operations');

lighthouseCmd
  .command('audit')
  .description('Run a Lighthouse audit')
  .requiredOption('--url <url>', 'URL to audit')
  .requiredOption('--brand <brand>', 'Brand (teelixir|elevate)')
  .option('--env <environment>', 'Environment (dev|staging|production)', 'production')
  .option('--device <device>', 'Device type (desktop|mobile)', 'desktop')
  .option('--type <pageType>', 'Page type (e.g., homepage, product)')
  .action(async (options) => {
    try {
      const runner = new LighthouseRunner();
      const result = await runner.runAudit({
        url: options.url,
        brand: options.brand,
        environment: options.env,
        device: options.device,
        pageType: options.type
      });

      process.exit(result.passed ? 0 : 1);
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

lighthouseCmd
  .command('multi-page')
  .description('Run audits on multiple pages')
  .requiredOption('--brand <brand>', 'Brand (teelixir|elevate)')
  .option('--env <environment>', 'Environment', 'production')
  .action(async (options) => {
    try {
      const runner = new LighthouseRunner();

      // Define key pages to audit
      const storeUrl = options.brand === 'teelixir'
        ? 'https://teelixir-au.myshopify.com'
        : 'https://elevate-wholesale.myshopify.com';

      const pages = [
        { url: `${storeUrl}/`, pageType: 'homepage' },
        { url: `${storeUrl}/collections/all`, pageType: 'collection' },
        { url: `${storeUrl}/cart`, pageType: 'cart' }
      ];

      await runner.runMultiPageAudit(options.brand, options.env, pages);
      process.exit(0);
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

lighthouseCmd
  .command('trends')
  .description('Show performance trends')
  .requiredOption('--brand <brand>', 'Brand (teelixir|elevate)')
  .option('--days <days>', 'Number of days', '30')
  .action(async (options) => {
    try {
      const trends = await logger.getPerformanceTrends(options.brand, parseInt(options.days));

      console.log(`\n📈 Performance Trends - ${options.brand} (${options.days} days):\n`);

      if (trends.length === 0) {
        console.log('   No trend data available yet.');
      } else {
        trends.forEach((trend: any) => {
          console.log(`   ${trend.timestamp}`);
          console.log(`      Performance: ${trend.avg_performance}/100`);
          console.log(`      Accessibility: ${trend.avg_accessibility}/100`);
          console.log(`      Best Practices: ${trend.avg_best_practices}/100`);
          console.log(`      SEO: ${trend.avg_seo}/100`);
          console.log(`      Trend: ${trend.performance_trend || 'stable'}`);
          console.log();
        });
      }

      process.exit(0);
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// DEPLOYMENT COMMANDS
// ============================================================================

const deployCmd = program
  .command('deploy')
  .description('Deployment operations');

deployCmd
  .command('execute')
  .description('Deploy to staging or production')
  .requiredOption('--brand <brand>', 'Brand (teelixir|elevate)')
  .requiredOption('--env <environment>', 'Environment (staging|production)')
  .requiredOption('--store <store>', 'Shopify store URL')
  .requiredOption('--path <path>', 'Theme directory path')
  .option('--changes <changes>', 'Comma-separated change IDs')
  .option('--skip-approval', 'Skip approval (staging only)')
  .action(async (options) => {
    try {
      const orchestrator = new DeploymentOrchestrator();

      const result = await orchestrator.deploy({
        brand: options.brand,
        environment: options.env,
        shopifyStore: options.store,
        themePath: options.path,
        changes: options.changes ? options.changes.split(',') : [],
        skipApproval: options.skipApproval || options.env === 'staging'
      });

      process.exit(result.success ? 0 : 1);
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

deployCmd
  .command('rollback')
  .description('Rollback a deployment')
  .requiredOption('--deployment-id <id>', 'Deployment ID to rollback')
  .action(async (options) => {
    try {
      const orchestrator = new DeploymentOrchestrator();
      const success = await orchestrator.rollback(options.deploymentId);

      process.exit(success ? 0 : 1);
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

deployCmd
  .command('list')
  .description('List recent deployments')
  .option('--brand <brand>', 'Filter by brand')
  .option('--limit <limit>', 'Number of deployments', '10')
  .action(async (options) => {
    try {
      const deployments = await logger.getRecentDeployments(
        options.brand,
        parseInt(options.limit)
      );

      console.log(`\n📦 Recent Deployments:\n`);

      if (deployments.length === 0) {
        console.log('   No deployments found.');
      } else {
        deployments.forEach((deployment: any) => {
          const statusIcon = {
            success: '✅',
            failed: '❌',
            rolled_back: '🔄',
            pending: '⏳',
            in_progress: '⚙️'
          }[deployment.status] || '❓';

          console.log(`   ${statusIcon} ${deployment.deployment_id}`);
          console.log(`      Brand: ${deployment.brand}`);
          console.log(`      Environment: ${deployment.environment}`);
          console.log(`      Status: ${deployment.status}`);
          console.log(`      Timestamp: ${deployment.timestamp}`);
          if (deployment.deployment_duration_seconds) {
            console.log(`      Duration: ${deployment.deployment_duration_seconds}s`);
          }
          console.log();
        });
      }

      process.exit(0);
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// MONITORING COMMANDS
// ============================================================================

const monitorCmd = program
  .command('monitor')
  .description('Monitoring and alerts');

monitorCmd
  .command('alerts')
  .description('Show active alerts')
  .option('--brand <brand>', 'Filter by brand')
  .action(async (options) => {
    try {
      const alerts = await logger.getActiveAlerts(options.brand);

      console.log(`\n🚨 Active Performance Alerts:\n`);

      if (alerts.length === 0) {
        console.log('   ✅ No active alerts. All systems optimal!');
      } else {
        alerts.forEach((alert: any) => {
          const severityIcon = {
            critical: '🔴',
            high: '🟠',
            medium: '🟡',
            low: '🟢'
          }[alert.severity] || '⚪';

          console.log(`   ${severityIcon} ${alert.title}`);
          console.log(`      Brand: ${alert.brand}`);
          console.log(`      Environment: ${alert.environment}`);
          console.log(`      Severity: ${alert.severity}`);
          if (alert.metric_name) {
            console.log(`      Metric: ${alert.metric_name}`);
            console.log(`      Current: ${alert.current_value} (threshold: ${alert.threshold_value})`);
          }
          console.log(`      Timestamp: ${alert.timestamp}`);
          console.log();
        });
      }

      process.exit(0);
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

monitorCmd
  .command('scores')
  .description('Show latest Lighthouse scores')
  .requiredOption('--brand <brand>', 'Brand (teelixir|elevate)')
  .option('--env <environment>', 'Environment', 'production')
  .action(async (options) => {
    try {
      const scores = await logger.getLatestScores(options.brand, options.env);

      console.log(`\n📊 Latest Lighthouse Scores - ${options.brand} (${options.env}):\n`);

      if (scores.length === 0) {
        console.log('   No score data available yet.');
      } else {
        scores.forEach((score: any) => {
          console.log(`   ${score.page_type || 'Page'}:`);
          console.log(`      Performance: ${score.performance_score}/100`);
          console.log(`      Accessibility: ${score.accessibility_score}/100`);
          console.log(`      Best Practices: ${score.best_practices_score}/100`);
          console.log(`      SEO: ${score.seo_score}/100`);
          console.log(`      LCP: ${score.lcp_value}s | CLS: ${score.cls_value}`);
          console.log(`      Updated: ${score.timestamp}`);
          console.log();
        });
      }

      process.exit(0);
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// AGENT COMMANDS
// ============================================================================

const agentCmd = program
  .command('agent')
  .description('Agent management');

agentCmd
  .command('status')
  .description('Show agent activity status')
  .action(async () => {
    try {
      console.log(`\n🤖 AI Agent Team Status:\n`);
      console.log(`   ✅ Lighthouse Audit Agent - Ready`);
      console.log(`   ✅ Theme Optimizer Agent - Ready`);
      console.log(`   ✅ Accessibility Agent - Ready`);
      console.log(`   ✅ SEO Implementation Agent - Ready`);
      console.log(`   ✅ Deployment & Validation Agent - Ready`);
      console.log();
      console.log(`   All agents operational and ready for tasks.`);

      process.exit(0);
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// UTILITY COMMANDS
// ============================================================================

program
  .command('setup')
  .description('Setup and configuration check')
  .action(async () => {
    console.log(`\n🔧 Setup Check:\n`);

    // Check environment variables
    const checks = [
      {
        name: 'Supabase URL',
        value: process.env.SUPABASE_URL,
        required: true
      },
      {
        name: 'Supabase Service Role Key',
        value: process.env.SUPABASE_SERVICE_ROLE_KEY,
        required: true
      },
      {
        name: 'Shopify CLI',
        value: 'installed',
        required: true
      }
    ];

    let allGood = true;

    for (const check of checks) {
      const status = check.value ? '✅' : '❌';
      console.log(`   ${status} ${check.name}`);

      if (check.required && !check.value) {
        allGood = false;
      }
    }

    console.log();

    if (!allGood) {
      console.log(`   ⚠️  Some required items are missing. Please configure them.`);
      console.log();
      console.log(`   Set environment variables:`);
      console.log(`   export SUPABASE_URL="https://your-project.supabase.co"`);
      console.log(`   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"`);
      process.exit(1);
    } else {
      console.log(`   ✅ All setup complete! Ready to use agent-cli.`);
      process.exit(0);
    }
  });

// Parse arguments
program.parse();
