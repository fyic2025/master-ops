#!/usr/bin/env node

/**
 * Run Performance Comparison Script
 *
 * Usage:
 *   npm run compare
 *   npm run compare -- --period=day
 *   npm run compare -- --period=week
 *   npm run compare -- --period=month
 *   npm run compare -- --trend
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

import { PerformanceMonitorAgent } from '../agents/performance-monitor.js';

async function main() {
  console.log(chalk.blue('\n📈 BOO Performance Comparison\n'));
  console.log(chalk.gray('='.repeat(50) + '\n'));

  const args = process.argv.slice(2);

  // Parse arguments
  const periodArg = args.find(a => a.startsWith('--period='));
  const trendFlag = args.includes('--trend');
  const daysArg = args.find(a => a.startsWith('--days='));

  const period = periodArg ? periodArg.split('=')[1] : 'week';
  const days = daysArg ? parseInt(daysArg.split('=')[1]) : 30;

  const agent = new PerformanceMonitorAgent();

  try {
    await agent.initialize();

    if (trendFlag) {
      // Generate trend analysis
      console.log(chalk.blue(`Generating ${days}-day trend analysis...\n`));
      const trend = await agent.generateTrendAnalysis(days);

      if (trend) {
        console.log(chalk.blue('📊 Trend Analysis Results:\n'));
        console.log(`  Period: ${trend.period.start} to ${trend.period.end}`);
        console.log(`  Data Points: ${trend.dataPoints}`);
        console.log(`  Unique Days: ${trend.uniqueDays}`);

        if (trend.trend) {
          console.log('\n  Score Trends:');
          for (const [metric, data] of Object.entries(trend.trend)) {
            const emoji = data.direction === 'improving' ? '📈' : data.direction === 'declining' ? '📉' : '➡️';
            console.log(`    ${metric}: ${emoji} ${data.direction} (slope: ${data.slope})`);
          }
        }

        if (trend.summary) {
          console.log('\n  Summary:');
          console.log(`    Start Scores: P:${trend.summary.startScores.performance} A:${trend.summary.startScores.accessibility}`);
          console.log(`    End Scores:   P:${trend.summary.endScores.performance} A:${trend.summary.endScores.accessibility}`);
        }
      } else {
        console.log(chalk.yellow('Insufficient data for trend analysis'));
      }
    } else {
      // Run period comparison
      const result = await agent.comparePeriods(period);

      if (!result) {
        console.log(chalk.yellow('No data available for comparison'));
        return;
      }

      if (!result.previous) {
        console.log(chalk.yellow('No previous period data for comparison'));
        console.log('\nCurrent period averages:');
        console.log(JSON.stringify(result.current, null, 2));
        return;
      }

      // Print detailed comparison
      console.log(chalk.blue('\n📋 Comparison Details:\n'));

      if (result.comparison.regressions.length > 0) {
        console.log(chalk.red('⚠ Regressions:'));
        for (const reg of result.comparison.regressions) {
          console.log(`  - ${reg.metric}: ${reg.change > 0 ? '+' : ''}${reg.change}`);
        }
      }

      if (result.comparison.improvements.length > 0) {
        console.log(chalk.green('\n✓ Improvements:'));
        for (const imp of result.comparison.improvements) {
          console.log(`  - ${imp.metric}: ${imp.change > 0 ? '+' : ''}${imp.change}`);
        }
      }
    }

    console.log(chalk.blue('\n✓ Comparison complete\n'));

  } catch (error) {
    console.error(chalk.red(`\nError: ${error.message}\n`));
    process.exit(1);
  }
}

main().catch(console.error);
