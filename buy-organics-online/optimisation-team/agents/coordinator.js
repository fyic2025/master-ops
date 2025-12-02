/**
 * BOO Coordinator Agent
 *
 * Orchestrates the optimization workflow and coordinates
 * all agents in the optimization team.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { format } from 'date-fns';
import chalk from 'chalk';
import ora from 'ora';

import { LighthouseAuditAgent } from './lighthouse-audit.js';
import { PerformanceMonitorAgent } from './performance-monitor.js';
import { AutoFixerAgent } from './auto-fixer.js';
import { ReportGeneratorAgent } from './report-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load configurations
const config = JSON.parse(readFileSync(join(__dirname, '../config/agent-config.json'), 'utf8'));
const schedulesConfig = JSON.parse(readFileSync(join(__dirname, '../config/schedules.json'), 'utf8'));

export class CoordinatorAgent {
  constructor(options = {}) {
    this.name = 'Coordinator Agent';
    this.version = '1.0.0';
    this.supabase = null;

    // Initialize sub-agents
    this.agents = {
      lighthouse: new LighthouseAuditAgent(),
      monitor: new PerformanceMonitorAgent(),
      fixer: new AutoFixerAgent(),
      reporter: new ReportGeneratorAgent()
    };

    this.options = {
      alertOnRegression: config.agents.coordinator.alertOnRegression || true,
      regressionThreshold: config.agents.coordinator.regressionThreshold || 5,
      ...options
    };
  }

  async initialize() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    // Initialize all agents
    console.log(chalk.blue('\n🚀 Initializing BOO Optimisation Team...\n'));

    for (const [name, agent] of Object.entries(this.agents)) {
      try {
        await agent.initialize();
      } catch (error) {
        console.log(chalk.yellow(`⚠ Failed to initialize ${name}: ${error.message}`));
      }
    }

    console.log(chalk.green('\n✓ All agents initialized\n'));
  }

  async cleanup() {
    // Cleanup agents that need it
    if (this.agents.lighthouse) {
      await this.agents.lighthouse.cleanup();
    }
  }

  /**
   * Run a full optimization workflow
   */
  async runFullWorkflow(options = {}) {
    const spinner = ora('Starting full optimization workflow').start();
    const startTime = Date.now();

    const results = {
      workflow: 'full-optimization',
      startedAt: new Date().toISOString(),
      stages: {},
      summary: null
    };

    try {
      // Stage 1: Run Lighthouse Audits
      spinner.text = 'Stage 1/4: Running Lighthouse audits...';
      const auditResults = await this.agents.lighthouse.auditPages(
        options.pages,
        { devices: options.devices || ['desktop', 'mobile'] }
      );
      results.stages.audit = {
        status: 'completed',
        results: auditResults,
        duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`
      };
      spinner.succeed('Stage 1/4: Lighthouse audits completed');

      // Stage 2: Compare with Previous Period
      spinner.start('Stage 2/4: Comparing with previous period...');
      const comparison = await this.agents.monitor.comparePeriods(
        options.comparisonPeriod || 'week'
      );
      results.stages.comparison = {
        status: 'completed',
        results: comparison,
        duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`
      };
      spinner.succeed('Stage 2/4: Period comparison completed');

      // Stage 3: Generate Fix Recommendations
      spinner.start('Stage 3/4: Analyzing and generating recommendations...');
      const recommendations = this.agents.fixer.analyzeAuditResults(auditResults);
      const fixPlan = this.agents.fixer.generateFixPlan(recommendations);
      results.stages.recommendations = {
        status: 'completed',
        count: recommendations.length,
        plan: fixPlan,
        duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`
      };
      spinner.succeed('Stage 3/4: Recommendations generated');

      // Stage 4: Generate Report
      spinner.start('Stage 4/4: Generating report...');
      const report = this.agents.reporter.generateAuditReport(
        auditResults,
        comparison?.comparison,
        recommendations
      );
      const reportPath = this.agents.reporter.saveReport(report, options.reportFormat || 'markdown');
      results.stages.report = {
        status: 'completed',
        path: reportPath,
        duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`
      };
      spinner.succeed('Stage 4/4: Report generated');

      // Check for alerts
      const alerts = this.checkForAlerts(auditResults, comparison);
      if (alerts.length > 0) {
        results.alerts = alerts;
        await this.saveAlerts(alerts);
        console.log(chalk.yellow(`\n⚠ ${alerts.length} alert(s) generated`));
      }

      // Calculate summary
      results.completedAt = new Date().toISOString();
      results.totalDuration = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
      results.summary = {
        pagesAudited: auditResults.filter(r => !r.error).length,
        recommendationsGenerated: recommendations.length,
        alertsGenerated: alerts.length,
        reportPath
      };

      // Print summary
      this.printWorkflowSummary(results);

      return results;

    } catch (error) {
      spinner.fail(`Workflow failed: ${error.message}`);
      results.error = error.message;
      results.completedAt = new Date().toISOString();
      return results;
    }
  }

  /**
   * Run a quick spot check workflow
   */
  async runSpotCheck(url, device = 'mobile') {
    console.log(chalk.blue(`\n🔍 Running spot check on ${url} (${device})...\n`));

    try {
      const result = await this.agents.lighthouse.auditUrl(url, { device });

      // Quick comparison if we have historical data
      let comparison = null;
      if (this.supabase) {
        comparison = await this.agents.monitor.comparePeriods('day');
      }

      // Print quick summary
      console.log(chalk.blue('\n📊 Spot Check Results:\n'));
      console.log(`  Performance: ${this.colorScore(result.scores.performance)}/100`);
      console.log(`  Accessibility: ${this.colorScore(result.scores.accessibility)}/100`);
      console.log(`  Best Practices: ${this.colorScore(result.scores.bestPractices)}/100`);
      console.log(`  SEO: ${this.colorScore(result.scores.seo)}/100`);
      console.log(`\n  LCP: ${result.metrics.lcp}ms`);
      console.log(`  CLS: ${result.metrics.cls}`);
      console.log(`  TBT: ${result.metrics.tbt}ms`);

      if (result.failingAudits?.length > 0) {
        console.log(chalk.yellow(`\n  Top Issues (${result.failingAudits.length} total):`));
        for (const audit of result.failingAudits.slice(0, 5)) {
          console.log(`    - ${audit.title}`);
        }
      }

      return result;

    } catch (error) {
      console.error(chalk.red(`Spot check failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * Check for alerts based on results
   */
  checkForAlerts(auditResults, comparison) {
    const alerts = [];

    // Check for critical scores
    for (const result of auditResults) {
      if (result.error) continue;

      for (const [category, score] of Object.entries(result.scores)) {
        if (score < 85) {
          alerts.push({
            type: 'critical-score',
            severity: score < 70 ? 'critical' : 'high',
            page: result.pageName,
            device: result.device,
            category,
            score,
            message: `${category} score is ${score}/100 on ${result.pageName} (${result.device})`
          });
        }
      }

      // Check Core Web Vitals
      if (result.evaluation?.alerts) {
        for (const alert of result.evaluation.alerts) {
          if (alert.type === 'critical') {
            alerts.push({
              type: 'cwv-failure',
              severity: 'critical',
              page: result.pageName,
              device: result.device,
              metric: alert.metric,
              value: alert.value,
              threshold: alert.threshold,
              message: `${alert.metric.toUpperCase()} exceeds threshold on ${result.pageName}`
            });
          }
        }
      }
    }

    // Check for regressions
    if (comparison?.comparison?.regressions) {
      for (const regression of comparison.comparison.regressions) {
        alerts.push({
          type: 'regression',
          severity: regression.severity || 'medium',
          metric: regression.metric,
          change: regression.change,
          message: `${regression.metric} regressed by ${Math.abs(regression.change)} points`
        });
      }
    }

    return alerts;
  }

  /**
   * Save alerts to database
   */
  async saveAlerts(alerts) {
    if (!this.supabase) return;

    try {
      const { error } = await this.supabase
        .from('boo_optimisation_alerts')
        .insert(alerts.map(alert => ({
          alert_type: alert.type,
          severity: alert.severity,
          page_id: alert.page,
          device: alert.device,
          metric: alert.metric || alert.category,
          value: alert.value || alert.score,
          threshold: alert.threshold,
          message: alert.message,
          status: 'open',
          created_at: new Date().toISOString()
        })));

      if (error) {
        console.log(chalk.yellow(`⚠ Failed to save alerts: ${error.message}`));
      }
    } catch (err) {
      console.log(chalk.yellow(`⚠ Database error: ${err.message}`));
    }
  }

  /**
   * Print workflow summary
   */
  printWorkflowSummary(results) {
    console.log(chalk.blue('\n' + '='.repeat(50)));
    console.log(chalk.blue('📋 Workflow Summary'));
    console.log(chalk.blue('='.repeat(50) + '\n'));

    console.log(`  Workflow: ${results.workflow}`);
    console.log(`  Duration: ${results.totalDuration}`);
    console.log(`  Pages Audited: ${results.summary.pagesAudited}`);
    console.log(`  Recommendations: ${results.summary.recommendationsGenerated}`);
    console.log(`  Alerts: ${results.summary.alertsGenerated}`);
    console.log(`  Report: ${results.summary.reportPath}`);

    console.log(chalk.blue('\n' + '='.repeat(50) + '\n'));
  }

  colorScore(score) {
    if (score >= 95) return chalk.green(score);
    if (score >= 85) return chalk.yellow(score);
    return chalk.red(score);
  }

  /**
   * Get workflow configuration
   */
  getWorkflowConfig(workflowName) {
    return schedulesConfig.workflows[workflowName] || null;
  }

  /**
   * List available workflows
   */
  listWorkflows() {
    return Object.keys(schedulesConfig.workflows);
  }
}

// CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const coordinator = new CoordinatorAgent();

  (async () => {
    try {
      await coordinator.initialize();

      const mode = process.argv.find(arg => arg.startsWith('--mode='))?.split('=')[1] || 'full';
      const url = process.argv.find(arg => arg.startsWith('--url='))?.split('=')[1];

      if (mode === 'spot' && url) {
        await coordinator.runSpotCheck(url);
      } else if (mode === 'full') {
        await coordinator.runFullWorkflow();
      } else if (mode === 'list') {
        console.log('Available workflows:', coordinator.listWorkflows());
      } else {
        console.log('Usage:');
        console.log('  --mode=full         Run full optimization workflow');
        console.log('  --mode=spot --url=  Run spot check on specific URL');
        console.log('  --mode=list         List available workflows');
      }

    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    } finally {
      await coordinator.cleanup();
    }
  })();
}

export default CoordinatorAgent;
