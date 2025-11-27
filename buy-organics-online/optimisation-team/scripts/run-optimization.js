#!/usr/bin/env node

/**
 * Run Full Optimization Workflow
 *
 * Usage:
 *   npm run optimize
 *   npm run optimize -- --quick
 *   npm run optimize -- --pages=homepage,cart
 *   npm run optimize -- --report-format=json
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

import { CoordinatorAgent } from '../agents/coordinator.js';

async function main() {
  console.log(chalk.blue('\n🚀 BOO Full Optimization Workflow\n'));
  console.log(chalk.gray('='.repeat(50) + '\n'));

  const args = process.argv.slice(2);

  // Parse arguments
  const quickFlag = args.includes('--quick');
  const pagesArg = args.find(a => a.startsWith('--pages='));
  const formatArg = args.find(a => a.startsWith('--report-format='));
  const periodArg = args.find(a => a.startsWith('--comparison-period='));

  const options = {
    pages: pagesArg ? pagesArg.split('=')[1].split(',') : null,
    devices: quickFlag ? ['mobile'] : ['desktop', 'mobile'],
    reportFormat: formatArg ? formatArg.split('=')[1] : 'markdown',
    comparisonPeriod: periodArg ? periodArg.split('=')[1] : 'week'
  };

  const coordinator = new CoordinatorAgent();

  try {
    await coordinator.initialize();

    console.log('Starting optimization workflow...');
    console.log(`  Pages: ${options.pages ? options.pages.join(', ') : 'default set'}`);
    console.log(`  Devices: ${options.devices.join(', ')}`);
    console.log(`  Comparison: ${options.comparisonPeriod}`);
    console.log('');

    const results = await coordinator.runFullWorkflow(options);

    if (results.error) {
      console.log(chalk.red(`\nWorkflow failed: ${results.error}\n`));
      process.exit(1);
    }

    console.log(chalk.green('\n✓ Optimization workflow completed successfully\n'));

    // Print action items summary
    if (results.stages.recommendations?.count > 0) {
      console.log(chalk.blue('📋 Action Items for Review:\n'));

      const plan = results.stages.recommendations.plan;
      for (const phase of plan.phases || []) {
        console.log(`  ${phase.name}: ${phase.fixes.length} fixes`);
      }
      console.log('');
    }

    if (results.alerts?.length > 0) {
      console.log(chalk.yellow(`⚠ ${results.alerts.length} alert(s) require attention\n`));
    }

  } catch (error) {
    console.error(chalk.red(`\nError: ${error.message}\n`));
    process.exit(1);
  } finally {
    await coordinator.cleanup();
  }
}

main().catch(console.error);
