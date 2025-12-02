/**
 * BOO Lighthouse Audit Agent
 *
 * Runs comprehensive Lighthouse audits on BigCommerce pages
 * and tracks Core Web Vitals over time.
 */

import lighthouse from 'lighthouse';
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load configurations
const config = JSON.parse(readFileSync(join(__dirname, '../config/agent-config.json'), 'utf8'));
const thresholds = JSON.parse(readFileSync(join(__dirname, '../config/thresholds.json'), 'utf8'));
const pagesConfig = JSON.parse(readFileSync(join(__dirname, '../config/pages.json'), 'utf8'));

export class LighthouseAuditAgent {
  constructor(options = {}) {
    this.name = 'Lighthouse Audit Agent';
    this.version = '1.0.0';
    this.supabase = null;
    this.browser = null;
    this.options = {
      retryAttempts: config.agents.lighthouseAudit.retryAttempts || 3,
      retryDelay: config.agents.lighthouseAudit.retryDelay || 5000,
      timeout: config.agents.lighthouseAudit.timeout || 120000,
      ...options
    };
  }

  async initialize() {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      console.log(chalk.green('✓ Supabase client initialized'));
    } else {
      console.log(chalk.yellow('⚠ Supabase credentials not found - running in offline mode'));
    }

    // Launch browser
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log(chalk.green('✓ Browser launched'));
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log(chalk.green('✓ Browser closed'));
    }
  }

  /**
   * Run a Lighthouse audit on a single URL
   */
  async auditUrl(url, options = {}) {
    const device = options.device || 'desktop';
    const categories = options.categories || ['performance', 'accessibility', 'best-practices', 'seo'];

    console.log(chalk.blue(`\n📊 Auditing: ${url} (${device})`));

    const lighthouseConfig = {
      logLevel: 'error',
      output: 'json',
      onlyCategories: categories,
      formFactor: device === 'mobile' ? 'mobile' : 'desktop',
      screenEmulation: device === 'mobile'
        ? { mobile: true, width: 375, height: 667, deviceScaleFactor: 2 }
        : { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1 },
      throttling: device === 'mobile'
        ? { cpuSlowdownMultiplier: 4, downloadThroughputKbps: 1638.4, uploadThroughputKbps: 675.84 }
        : { cpuSlowdownMultiplier: 1, downloadThroughputKbps: 10240, uploadThroughputKbps: 10240 }
    };

    let result = null;
    let lastError = null;

    for (let attempt = 1; attempt <= this.options.retryAttempts; attempt++) {
      try {
        const port = new URL(this.browser.wsEndpoint()).port;
        result = await lighthouse(url, { port, ...lighthouseConfig });
        break;
      } catch (error) {
        lastError = error;
        console.log(chalk.yellow(`  Attempt ${attempt}/${this.options.retryAttempts} failed: ${error.message}`));
        if (attempt < this.options.retryAttempts) {
          await this.sleep(this.options.retryDelay);
        }
      }
    }

    if (!result) {
      throw new Error(`Audit failed after ${this.options.retryAttempts} attempts: ${lastError?.message}`);
    }

    return this.parseResults(result.lhr, url, device);
  }

  /**
   * Parse Lighthouse results into structured format
   */
  parseResults(lhr, url, device) {
    const scores = {
      performance: Math.round((lhr.categories.performance?.score || 0) * 100),
      accessibility: Math.round((lhr.categories.accessibility?.score || 0) * 100),
      bestPractices: Math.round((lhr.categories['best-practices']?.score || 0) * 100),
      seo: Math.round((lhr.categories.seo?.score || 0) * 100)
    };

    const metrics = {
      lcp: lhr.audits['largest-contentful-paint']?.numericValue || 0,
      fid: lhr.audits['max-potential-fid']?.numericValue || 0,
      cls: lhr.audits['cumulative-layout-shift']?.numericValue || 0,
      tbt: lhr.audits['total-blocking-time']?.numericValue || 0,
      fcp: lhr.audits['first-contentful-paint']?.numericValue || 0,
      si: lhr.audits['speed-index']?.numericValue || 0,
      tti: lhr.audits['interactive']?.numericValue || 0,
      ttfb: lhr.audits['server-response-time']?.numericValue || 0
    };

    // Get failing audits
    const failingAudits = Object.values(lhr.audits)
      .filter(audit => audit.score !== null && audit.score < 0.9)
      .map(audit => ({
        id: audit.id,
        title: audit.title,
        description: audit.description,
        score: audit.score,
        displayValue: audit.displayValue,
        numericValue: audit.numericValue
      }))
      .sort((a, b) => (a.score || 0) - (b.score || 0));

    // Evaluate against thresholds
    const evaluation = this.evaluateResults(scores, metrics);

    return {
      url,
      device,
      timestamp: new Date().toISOString(),
      scores,
      metrics,
      failingAudits: failingAudits.slice(0, 20), // Top 20 issues
      evaluation,
      rawData: {
        fetchTime: lhr.fetchTime,
        userAgent: lhr.userAgent,
        environment: lhr.environment
      }
    };
  }

  /**
   * Evaluate results against thresholds
   */
  evaluateResults(scores, metrics) {
    const evaluation = {
      overallStatus: 'good',
      scoreStatus: {},
      metricStatus: {},
      alerts: []
    };

    // Evaluate scores
    for (const [key, value] of Object.entries(scores)) {
      const threshold = thresholds.lighthouseScores[key] || thresholds.lighthouseScores.performance;
      if (value < threshold.critical) {
        evaluation.scoreStatus[key] = 'critical';
        evaluation.alerts.push({ type: 'critical', metric: key, value, threshold: threshold.critical });
      } else if (value < threshold.warning) {
        evaluation.scoreStatus[key] = 'warning';
        evaluation.alerts.push({ type: 'warning', metric: key, value, threshold: threshold.warning });
      } else {
        evaluation.scoreStatus[key] = 'good';
      }
    }

    // Evaluate Core Web Vitals
    const cwvMetrics = { lcp: metrics.lcp, fid: metrics.fid, cls: metrics.cls, tbt: metrics.tbt };
    for (const [key, value] of Object.entries(cwvMetrics)) {
      const threshold = thresholds.coreWebVitals[key];
      if (!threshold) continue;

      if (value > threshold.needsImprovement) {
        evaluation.metricStatus[key] = 'poor';
        evaluation.alerts.push({ type: 'critical', metric: key, value, threshold: threshold.needsImprovement });
      } else if (value > threshold.good) {
        evaluation.metricStatus[key] = 'needs-improvement';
        evaluation.alerts.push({ type: 'warning', metric: key, value, threshold: threshold.good });
      } else {
        evaluation.metricStatus[key] = 'good';
      }
    }

    // Set overall status
    if (evaluation.alerts.some(a => a.type === 'critical')) {
      evaluation.overallStatus = 'critical';
    } else if (evaluation.alerts.some(a => a.type === 'warning')) {
      evaluation.overallStatus = 'warning';
    }

    return evaluation;
  }

  /**
   * Run audits on multiple pages
   */
  async auditPages(pageIds = null, options = {}) {
    const devices = options.devices || ['desktop', 'mobile'];
    const pagesToAudit = pageIds
      ? pagesConfig.pages.filter(p => pageIds.includes(p.id))
      : pagesConfig.pages.filter(p => pagesConfig.defaultAuditSet.includes(p.id));

    const results = [];

    for (const page of pagesToAudit) {
      const url = `${pagesConfig.baseUrl}${page.path}`;

      for (const device of devices) {
        try {
          const result = await this.auditUrl(url, { device, ...options });
          result.pageId = page.id;
          result.pageName = page.name;
          result.priority = page.priority;
          results.push(result);

          // Log to Supabase if available
          if (this.supabase) {
            await this.saveAuditResult(result);
          }

          this.printResultSummary(result);
        } catch (error) {
          console.log(chalk.red(`  ✗ Failed to audit ${page.name} (${device}): ${error.message}`));
          results.push({
            pageId: page.id,
            pageName: page.name,
            device,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    return results;
  }

  /**
   * Save audit result to Supabase
   */
  async saveAuditResult(result) {
    if (!this.supabase) return;

    try {
      const { error } = await this.supabase
        .from('boo_lighthouse_audits')
        .insert({
          url: result.url,
          page_id: result.pageId,
          page_name: result.pageName,
          device: result.device,
          timestamp: result.timestamp,
          performance_score: result.scores.performance,
          accessibility_score: result.scores.accessibility,
          best_practices_score: result.scores.bestPractices,
          seo_score: result.scores.seo,
          lcp_ms: Math.round(result.metrics.lcp),
          fid_ms: Math.round(result.metrics.fid),
          cls: result.metrics.cls,
          tbt_ms: Math.round(result.metrics.tbt),
          fcp_ms: Math.round(result.metrics.fcp),
          si_ms: Math.round(result.metrics.si),
          tti_ms: Math.round(result.metrics.tti),
          ttfb_ms: Math.round(result.metrics.ttfb),
          overall_status: result.evaluation.overallStatus,
          failing_audits: result.failingAudits,
          alerts: result.evaluation.alerts
        });

      if (error) {
        console.log(chalk.yellow(`  ⚠ Failed to save to Supabase: ${error.message}`));
      } else {
        console.log(chalk.gray('  → Saved to database'));
      }
    } catch (err) {
      console.log(chalk.yellow(`  ⚠ Database error: ${err.message}`));
    }
  }

  /**
   * Print result summary to console
   */
  printResultSummary(result) {
    const statusColors = {
      good: chalk.green,
      warning: chalk.yellow,
      critical: chalk.red
    };

    const statusColor = statusColors[result.evaluation.overallStatus] || chalk.white;

    console.log(statusColor(`  ${result.evaluation.overallStatus.toUpperCase()}`));
    console.log(`    Performance: ${this.colorScore(result.scores.performance)}`);
    console.log(`    Accessibility: ${this.colorScore(result.scores.accessibility)}`);
    console.log(`    Best Practices: ${this.colorScore(result.scores.bestPractices)}`);
    console.log(`    SEO: ${this.colorScore(result.scores.seo)}`);
    console.log(`    LCP: ${this.colorMetric('lcp', result.metrics.lcp)}ms`);
    console.log(`    CLS: ${this.colorMetric('cls', result.metrics.cls)}`);
    console.log(`    TBT: ${this.colorMetric('tbt', result.metrics.tbt)}ms`);
  }

  colorScore(score) {
    if (score >= 95) return chalk.green(score);
    if (score >= 85) return chalk.yellow(score);
    return chalk.red(score);
  }

  colorMetric(metric, value) {
    const threshold = thresholds.coreWebVitals[metric];
    if (!threshold) return chalk.white(value.toFixed(2));

    if (value <= threshold.good) return chalk.green(value.toFixed(2));
    if (value <= threshold.needsImprovement) return chalk.yellow(value.toFixed(2));
    return chalk.red(value.toFixed(2));
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const agent = new LighthouseAuditAgent();

  (async () => {
    try {
      await agent.initialize();

      const urlArg = process.argv.find(arg => arg.startsWith('--url='));
      const deviceArg = process.argv.find(arg => arg.startsWith('--device='));

      if (urlArg) {
        const url = urlArg.split('=')[1];
        const device = deviceArg ? deviceArg.split('=')[1] : 'desktop';
        const result = await agent.auditUrl(url, { device });
        console.log(JSON.stringify(result, null, 2));
      } else {
        const results = await agent.auditPages();
        console.log(`\n✓ Completed ${results.length} audits`);
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    } finally {
      await agent.cleanup();
    }
  })();
}

export default LighthouseAuditAgent;
