/**
 * Lighthouse Runner for AI Agent Team
 * Runs Lighthouse audits and logs results to Supabase
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { getLogger, LighthouseAuditLog } from './supabase-logger';

const execAsync = promisify(exec);

export interface LighthouseRunOptions {
  url: string;
  brand: 'teelixir' | 'elevate';
  environment: 'dev' | 'staging' | 'production';
  pageType?: string;
  device?: 'desktop' | 'mobile';
  numberOfRuns?: number;
  changeId?: string;
  deploymentId?: string;
}

export interface LighthouseResult {
  auditId: string;
  scores: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  coreWebVitals: {
    lcp: number;
    fid: number;
    cls: number;
    tti: number;
    tbt: number;
    si: number;
    fcp: number;
  };
  passed: boolean;
  failures: string[];
}

export class LighthouseRunner {
  private logger = getLogger();

  /**
   * Run a Lighthouse audit
   */
  async runAudit(options: LighthouseRunOptions): Promise<LighthouseResult> {
    console.log(`\n🔍 Running Lighthouse audit...`);
    console.log(`   URL: ${options.url}`);
    console.log(`   Brand: ${options.brand}`);
    console.log(`   Environment: ${options.environment}`);
    console.log(`   Device: ${options.device || 'desktop'}`);

    const tempDir = '/tmp/lighthouse-results';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const outputPath = path.join(tempDir, `audit-${Date.now()}.json`);

    // Build Lighthouse CLI command
    const runs = options.numberOfRuns || 1;

    let command: string;
    if (options.device === 'mobile') {
      command = `lighthouse ${options.url} \
        --emulated-form-factor=mobile \
        --throttling.cpuSlowdownMultiplier=4 \
        --output=json \
        --output-path=${outputPath} \
        --quiet \
        --chrome-flags="--headless --no-sandbox"`;
    } else {
      command = `lighthouse ${options.url} \
        --preset=desktop \
        --output=json \
        --output-path=${outputPath} \
        --quiet \
        --chrome-flags="--headless --no-sandbox"`;
    }

    try {
      // Run Lighthouse
      await execAsync(command);

      // Read results
      const rawData = fs.readFileSync(outputPath, 'utf-8');
      const lhrData = JSON.parse(rawData);

      // Extract scores
      const scores = {
        performance: Math.round((lhrData.categories.performance?.score || 0) * 100),
        accessibility: Math.round((lhrData.categories.accessibility?.score || 0) * 100),
        bestPractices: Math.round((lhrData.categories['best-practices']?.score || 0) * 100),
        seo: Math.round((lhrData.categories.seo?.score || 0) * 100)
      };

      // Extract Core Web Vitals
      const audits = lhrData.audits;
      const coreWebVitals = {
        lcp: audits['largest-contentful-paint']?.numericValue / 1000 || 0,
        fid: audits['max-potential-fid']?.numericValue || 0,
        cls: audits['cumulative-layout-shift']?.numericValue || 0,
        tti: audits['interactive']?.numericValue / 1000 || 0,
        tbt: audits['total-blocking-time']?.numericValue || 0,
        si: audits['speed-index']?.numericValue / 1000 || 0,
        fcp: audits['first-contentful-paint']?.numericValue / 1000 || 0
      };

      // Collect failing audits
      const failingAudits: any[] = [];
      const opportunities: any[] = [];

      Object.entries(audits).forEach(([key, audit]: [string, any]) => {
        if (audit.score !== null && audit.score < 1 && audit.scoreDisplayMode === 'binary') {
          failingAudits.push({
            id: key,
            title: audit.title,
            description: audit.description,
            score: audit.score
          });
        }

        if (audit.details?.type === 'opportunity' && audit.numericValue > 0) {
          opportunities.push({
            id: key,
            title: audit.title,
            description: audit.description,
            savings: audit.displayValue
          });
        }
      });

      // Log to Supabase
      const auditLog: LighthouseAuditLog = {
        brand: options.brand,
        environment: options.environment,
        page_url: options.url,
        page_type: options.pageType,
        performance_score: scores.performance,
        accessibility_score: scores.accessibility,
        best_practices_score: scores.bestPractices,
        seo_score: scores.seo,
        lcp_value: coreWebVitals.lcp,
        fid_value: coreWebVitals.fid,
        cls_value: coreWebVitals.cls,
        tti_value: coreWebVitals.tti,
        tbt_value: coreWebVitals.tbt,
        si_value: coreWebVitals.si,
        fcp_value: coreWebVitals.fcp,
        failing_audits: failingAudits,
        opportunities: opportunities,
        diagnostics: {
          userAgent: lhrData.userAgent,
          fetchTime: lhrData.fetchTime
        },
        device_type: options.device || 'desktop',
        lighthouse_version: lhrData.lighthouseVersion,
        user_agent: lhrData.userAgent,
        change_id: options.changeId,
        deployment_id: options.deploymentId
      };

      const auditId = await this.logger.logLighthouseAudit(auditLog);

      // Check if passed deployment thresholds
      const thresholdCheck = await this.logger.checkDeploymentThresholds(auditId);

      // Print summary
      this.printSummary(scores, coreWebVitals, thresholdCheck);

      // Clean up temp file
      fs.unlinkSync(outputPath);

      return {
        auditId,
        scores,
        coreWebVitals,
        passed: thresholdCheck.passed,
        failures: thresholdCheck.failures
      };
    } catch (error: any) {
      console.error('❌ Lighthouse audit failed:', error.message);
      throw error;
    }
  }

  /**
   * Run audits on multiple pages
   */
  async runMultiPageAudit(
    brand: 'teelixir' | 'elevate',
    environment: 'dev' | 'staging' | 'production',
    pages: Array<{ url: string; pageType: string }>
  ): Promise<LighthouseResult[]> {
    console.log(`\n📊 Running multi-page audit for ${brand} (${environment})`);
    console.log(`   Pages: ${pages.length}`);

    const results: LighthouseResult[] = [];

    for (const page of pages) {
      const result = await this.runAudit({
        url: page.url,
        brand,
        environment,
        pageType: page.pageType
      });
      results.push(result);
    }

    // Print overall summary
    const allPassed = results.every(r => r.passed);
    const avgScores = {
      performance: Math.round(results.reduce((sum, r) => sum + r.scores.performance, 0) / results.length),
      accessibility: Math.round(results.reduce((sum, r) => sum + r.scores.accessibility, 0) / results.length),
      bestPractices: Math.round(results.reduce((sum, r) => sum + r.scores.bestPractices, 0) / results.length),
      seo: Math.round(results.reduce((sum, r) => sum + r.scores.seo, 0) / results.length)
    };

    console.log(`\n📈 Multi-Page Audit Summary:`);
    console.log(`   Average Performance: ${avgScores.performance}/100`);
    console.log(`   Average Accessibility: ${avgScores.accessibility}/100`);
    console.log(`   Average Best Practices: ${avgScores.bestPractices}/100`);
    console.log(`   Average SEO: ${avgScores.seo}/100`);
    console.log(`   Overall: ${allPassed ? '✅ PASSED' : '⛔ FAILED'}`);

    return results;
  }

  /**
   * Compare two audits (before/after)
   */
  async compareAudits(
    beforeAuditId: string,
    afterAuditId: string
  ): Promise<{
    improved: boolean;
    changes: any;
  }> {
    // This would fetch from Supabase and compare
    // Implementation would query lighthouse_audits table
    throw new Error('Not yet implemented');
  }

  /**
   * Print audit summary
   */
  private printSummary(
    scores: any,
    coreWebVitals: any,
    thresholdCheck: any
  ): void {
    console.log(`\n📊 Lighthouse Audit Results:`);
    console.log(`\n   Scores:`);
    console.log(`   Performance:     ${this.formatScore(scores.performance)}`);
    console.log(`   Accessibility:   ${this.formatScore(scores.accessibility)}`);
    console.log(`   Best Practices:  ${this.formatScore(scores.bestPractices)}`);
    console.log(`   SEO:             ${this.formatScore(scores.seo)}`);

    console.log(`\n   Core Web Vitals:`);
    console.log(`   LCP: ${this.formatMetric(coreWebVitals.lcp, 2.5, 's', true)}`);
    console.log(`   FID: ${this.formatMetric(coreWebVitals.fid, 100, 'ms', true)}`);
    console.log(`   CLS: ${this.formatMetric(coreWebVitals.cls, 0.1, '', true)}`);
    console.log(`   TTI: ${this.formatMetric(coreWebVitals.tti, 3.5, 's', true)}`);
    console.log(`   TBT: ${this.formatMetric(coreWebVitals.tbt, 200, 'ms', true)}`);

    if (thresholdCheck.passed) {
      console.log(`\n   ✅ DEPLOYMENT APPROVED - All thresholds met (≥95/100)`);
    } else {
      console.log(`\n   ⛔ DEPLOYMENT BLOCKED - Thresholds not met:`);
      thresholdCheck.failures.forEach((failure: string) => {
        console.log(`      • ${failure}`);
      });
    }
  }

  private formatScore(score: number): string {
    const icon = score >= 95 ? '✅' : score >= 80 ? '⚠️' : '❌';
    return `${score}/100 ${icon}`;
  }

  private formatMetric(
    value: number,
    threshold: number,
    unit: string,
    lowerIsBetter: boolean = true
  ): string {
    const passed = lowerIsBetter ? value <= threshold : value >= threshold;
    const icon = passed ? '✅' : '❌';
    const formattedValue = typeof value === 'number' ? value.toFixed(value < 1 ? 3 : 2) : value;
    return `${formattedValue}${unit} ${icon} (target: ${lowerIsBetter ? '≤' : '≥'}${threshold}${unit})`;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(`
Usage: ts-node lighthouse-runner.ts <url> <brand> [options]

Arguments:
  url          URL to audit
  brand        teelixir | elevate

Options:
  --env        dev | staging | production (default: production)
  --device     desktop | mobile (default: desktop)
  --type       Page type (e.g., homepage, product, collection)

Example:
  ts-node lighthouse-runner.ts https://teelixir-au.myshopify.com/ teelixir --env=production --device=mobile
    `);
    process.exit(1);
  }

  const url = args[0];
  const brand = args[1] as 'teelixir' | 'elevate';

  const getArg = (name: string, defaultValue?: string) => {
    const arg = args.find(a => a.startsWith(`--${name}=`));
    return arg ? arg.split('=')[1] : defaultValue;
  };

  const options: LighthouseRunOptions = {
    url,
    brand,
    environment: (getArg('env', 'production') as any),
    device: (getArg('device', 'desktop') as any),
    pageType: getArg('type')
  };

  const runner = new LighthouseRunner();
  runner.runAudit(options)
    .then((result) => {
      console.log(`\n✅ Audit complete. ID: ${result.auditId}`);
      process.exit(result.passed ? 0 : 1);
    })
    .catch((error) => {
      console.error('\n❌ Audit failed:', error);
      process.exit(1);
    });
}

export default LighthouseRunner;
