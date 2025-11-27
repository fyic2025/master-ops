#!/usr/bin/env node

/**
 * Generate Performance Report
 *
 * Usage:
 *   npm run report
 *   npm run report -- --format=json
 *   npm run report -- --type=monthly
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

import { ReportGeneratorAgent } from '../agents/report-generator.js';
import { PerformanceMonitorAgent } from '../agents/performance-monitor.js';
import { getSupabaseClient } from '../lib/supabase-client.js';

async function main() {
  console.log(chalk.blue('\n📊 BOO Performance Report Generator\n'));

  const args = process.argv.slice(2);
  const formatArg = args.find(a => a.startsWith('--format='));
  const typeArg = args.find(a => a.startsWith('--type='));

  const format = formatArg ? formatArg.split('=')[1] : 'markdown';
  const type = typeArg ? typeArg.split('=')[1] : 'standard';

  const reporter = new ReportGeneratorAgent();
  const monitor = new PerformanceMonitorAgent();

  try {
    await reporter.initialize();
    await monitor.initialize();

    const supabase = getSupabaseClient();

    // Fetch recent audit data
    let auditResults = [];
    if (supabase) {
      const { data, error } = await supabase
        .from('boo_lighthouse_audits')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(20);

      if (!error && data) {
        auditResults = data.map(row => ({
          pageId: row.page_id,
          pageName: row.page_name,
          device: row.device,
          url: row.url,
          timestamp: row.timestamp,
          scores: {
            performance: row.performance_score,
            accessibility: row.accessibility_score,
            bestPractices: row.best_practices_score,
            seo: row.seo_score
          },
          metrics: {
            lcp: row.lcp_ms,
            fid: row.fid_ms,
            cls: row.cls,
            tbt: row.tbt_ms,
            fcp: row.fcp_ms,
            tti: row.tti_ms,
            ttfb: row.ttfb_ms
          },
          evaluation: { overallStatus: row.overall_status },
          failingAudits: row.failing_audits || []
        }));
      }
    }

    if (auditResults.length === 0) {
      console.log(chalk.yellow('No audit data found. Run an audit first: npm run audit'));
      return;
    }

    // Get comparison data
    const comparison = await monitor.comparePeriods('week');

    // Generate report
    const report = reporter.generateAuditReport(auditResults, comparison?.comparison);
    const filepath = reporter.saveReport(report, format);

    console.log(chalk.green(`\n✓ Report generated: ${filepath}\n`));

  } catch (error) {
    console.error(chalk.red(`\nError: ${error.message}\n`));
    process.exit(1);
  }
}

main().catch(console.error);
