#!/usr/bin/env node

/**
 * Run Lighthouse Audit Script
 *
 * Usage:
 *   npm run audit
 *   npm run audit -- --url=https://www.buyorganicsonline.com.au/
 *   npm run audit -- --device=mobile
 *   npm run audit -- --pages=homepage,cart
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

import { LighthouseAuditAgent } from '../agents/lighthouse-audit.js';
import { ReportGeneratorAgent } from '../agents/report-generator.js';

async function main() {
  console.log(chalk.blue('\n🔍 BOO Lighthouse Audit\n'));
  console.log(chalk.gray('='.repeat(50) + '\n'));

  const args = process.argv.slice(2);

  // Parse arguments
  const urlArg = args.find(a => a.startsWith('--url='));
  const deviceArg = args.find(a => a.startsWith('--device='));
  const pagesArg = args.find(a => a.startsWith('--pages='));
  const outputArg = args.find(a => a.startsWith('--output='));

  const url = urlArg ? urlArg.split('=')[1] : null;
  const device = deviceArg ? deviceArg.split('=')[1] : null;
  const pages = pagesArg ? pagesArg.split('=')[1].split(',') : null;
  const output = outputArg ? outputArg.split('=')[1] : 'console';

  const agent = new LighthouseAuditAgent();
  const reporter = new ReportGeneratorAgent();

  try {
    await agent.initialize();
    await reporter.initialize();

    let results;

    if (url) {
      // Single URL audit
      console.log(`Auditing: ${url}`);
      const devices = device ? [device] : ['desktop', 'mobile'];

      results = [];
      for (const d of devices) {
        const result = await agent.auditUrl(url, { device: d });
        results.push(result);
      }
    } else {
      // Multi-page audit
      const devices = device ? [device] : ['desktop', 'mobile'];
      results = await agent.auditPages(pages, { devices });
    }

    // Generate output
    if (output === 'json') {
      console.log(JSON.stringify(results, null, 2));
    } else if (output === 'report') {
      const report = reporter.generateAuditReport(results);
      reporter.saveReport(report, 'markdown');
    } else {
      // Console summary
      console.log(chalk.blue('\n📊 Audit Summary\n'));

      for (const result of results) {
        if (result.error) {
          console.log(chalk.red(`✗ ${result.pageName || result.url}: ${result.error}`));
          continue;
        }

        const status = result.evaluation?.overallStatus || 'unknown';
        const statusColor = status === 'good' ? chalk.green : status === 'warning' ? chalk.yellow : chalk.red;

        console.log(statusColor(`\n${result.pageName || result.url} (${result.device})`));
        console.log(`  Performance:    ${result.scores.performance}/100`);
        console.log(`  Accessibility:  ${result.scores.accessibility}/100`);
        console.log(`  Best Practices: ${result.scores.bestPractices}/100`);
        console.log(`  SEO:            ${result.scores.seo}/100`);
        console.log(`  LCP: ${result.metrics.lcp}ms | CLS: ${result.metrics.cls} | TBT: ${result.metrics.tbt}ms`);
      }

      const successCount = results.filter(r => !r.error).length;
      console.log(chalk.blue(`\n✓ Completed ${successCount}/${results.length} audits\n`));
    }

  } catch (error) {
    console.error(chalk.red(`\nError: ${error.message}\n`));
    process.exit(1);
  } finally {
    await agent.cleanup();
  }
}

main().catch(console.error);
