/**
 * BOO Performance Monitor Agent
 *
 * Compares current performance against previous periods
 * and detects regressions.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { format, subDays, subWeeks, subMonths, parseISO } from 'date-fns';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config = JSON.parse(readFileSync(join(__dirname, '../config/agent-config.json'), 'utf8'));
const thresholds = JSON.parse(readFileSync(join(__dirname, '../config/thresholds.json'), 'utf8'));

export class PerformanceMonitorAgent {
  constructor(options = {}) {
    this.name = 'Performance Monitor Agent';
    this.version = '1.0.0';
    this.supabase = null;
    this.options = {
      trendWindowDays: config.agents.performanceMonitor.trendWindowDays || 30,
      minDataPoints: config.agents.performanceMonitor.minDataPointsForTrend || 5,
      ...options
    };
  }

  async initialize() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      console.log(chalk.green('✓ Performance Monitor initialized'));
    } else {
      console.log(chalk.yellow('⚠ Running in offline mode - no historical data available'));
    }
  }

  /**
   * Get audits from a specific time period
   */
  async getAuditsForPeriod(startDate, endDate, pageId = null) {
    if (!this.supabase) return [];

    let query = this.supabase
      .from('boo_lighthouse_audits')
      .select('*')
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
      .order('timestamp', { ascending: false });

    if (pageId) {
      query = query.eq('page_id', pageId);
    }

    const { data, error } = await query;

    if (error) {
      console.log(chalk.yellow(`⚠ Failed to fetch audits: ${error.message}`));
      return [];
    }

    return data || [];
  }

  /**
   * Get the latest audit for each page/device combination
   */
  async getLatestAudits() {
    if (!this.supabase) return [];

    const { data, error } = await this.supabase
      .from('boo_lighthouse_audits')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) {
      console.log(chalk.yellow(`⚠ Failed to fetch latest audits: ${error.message}`));
      return [];
    }

    // Group by page_id + device and keep latest
    const latestByKey = {};
    for (const audit of data || []) {
      const key = `${audit.page_id}-${audit.device}`;
      if (!latestByKey[key]) {
        latestByKey[key] = audit;
      }
    }

    return Object.values(latestByKey);
  }

  /**
   * Calculate average metrics for a set of audits
   */
  calculateAverages(audits) {
    if (!audits || audits.length === 0) {
      return null;
    }

    const sum = {
      performance: 0,
      accessibility: 0,
      bestPractices: 0,
      seo: 0,
      lcp: 0,
      fid: 0,
      cls: 0,
      tbt: 0,
      fcp: 0,
      tti: 0,
      ttfb: 0
    };

    for (const audit of audits) {
      sum.performance += audit.performance_score || 0;
      sum.accessibility += audit.accessibility_score || 0;
      sum.bestPractices += audit.best_practices_score || 0;
      sum.seo += audit.seo_score || 0;
      sum.lcp += audit.lcp_ms || 0;
      sum.fid += audit.fid_ms || 0;
      sum.cls += audit.cls || 0;
      sum.tbt += audit.tbt_ms || 0;
      sum.fcp += audit.fcp_ms || 0;
      sum.tti += audit.tti_ms || 0;
      sum.ttfb += audit.ttfb_ms || 0;
    }

    const count = audits.length;
    return {
      count,
      scores: {
        performance: Math.round(sum.performance / count),
        accessibility: Math.round(sum.accessibility / count),
        bestPractices: Math.round(sum.bestPractices / count),
        seo: Math.round(sum.seo / count)
      },
      metrics: {
        lcp: Math.round(sum.lcp / count),
        fid: Math.round(sum.fid / count),
        cls: parseFloat((sum.cls / count).toFixed(3)),
        tbt: Math.round(sum.tbt / count),
        fcp: Math.round(sum.fcp / count),
        tti: Math.round(sum.tti / count),
        ttfb: Math.round(sum.ttfb / count)
      }
    };
  }

  /**
   * Compare current period against previous period
   */
  async comparePeriods(period = 'week', pageId = null) {
    const now = new Date();
    let previousStart, previousEnd, currentStart, currentEnd;

    switch (period) {
      case 'day':
        currentStart = subDays(now, 1);
        currentEnd = now;
        previousStart = subDays(now, 2);
        previousEnd = subDays(now, 1);
        break;
      case 'week':
        currentStart = subWeeks(now, 1);
        currentEnd = now;
        previousStart = subWeeks(now, 2);
        previousEnd = subWeeks(now, 1);
        break;
      case 'month':
        currentStart = subMonths(now, 1);
        currentEnd = now;
        previousStart = subMonths(now, 2);
        previousEnd = subMonths(now, 1);
        break;
      default:
        throw new Error(`Unknown period: ${period}`);
    }

    console.log(chalk.blue(`\n📊 Comparing ${period} periods:`));
    console.log(`   Current:  ${format(currentStart, 'yyyy-MM-dd')} to ${format(currentEnd, 'yyyy-MM-dd')}`);
    console.log(`   Previous: ${format(previousStart, 'yyyy-MM-dd')} to ${format(previousEnd, 'yyyy-MM-dd')}`);

    const currentAudits = await this.getAuditsForPeriod(currentStart, currentEnd, pageId);
    const previousAudits = await this.getAuditsForPeriod(previousStart, previousEnd, pageId);

    const currentAvg = this.calculateAverages(currentAudits);
    const previousAvg = this.calculateAverages(previousAudits);

    if (!currentAvg) {
      console.log(chalk.yellow('⚠ No current period data available'));
      return null;
    }

    if (!previousAvg) {
      console.log(chalk.yellow('⚠ No previous period data for comparison'));
      return { current: currentAvg, previous: null, comparison: null };
    }

    const comparison = this.calculateComparison(currentAvg, previousAvg);
    this.printComparison(comparison, period);

    // Save comparison to database
    if (this.supabase) {
      await this.saveComparison(period, currentAvg, previousAvg, comparison);
    }

    return { current: currentAvg, previous: previousAvg, comparison };
  }

  /**
   * Calculate comparison between two periods
   */
  calculateComparison(current, previous) {
    const comparison = {
      scores: {},
      metrics: {},
      regressions: [],
      improvements: []
    };

    // Compare scores
    for (const [key, currentValue] of Object.entries(current.scores)) {
      const previousValue = previous.scores[key] || 0;
      const change = currentValue - previousValue;
      const percentChange = previousValue > 0 ? ((change / previousValue) * 100).toFixed(1) : 0;

      comparison.scores[key] = {
        current: currentValue,
        previous: previousValue,
        change,
        percentChange: parseFloat(percentChange),
        trend: change > 0 ? 'improved' : change < 0 ? 'regressed' : 'stable'
      };

      if (change <= -thresholds.regressionDetection.scoreDropThreshold) {
        comparison.regressions.push({ type: 'score', metric: key, change, severity: this.getSeverity(change) });
      } else if (change >= thresholds.regressionDetection.scoreDropThreshold) {
        comparison.improvements.push({ type: 'score', metric: key, change });
      }
    }

    // Compare metrics (note: lower is better for timing metrics)
    for (const [key, currentValue] of Object.entries(current.metrics)) {
      const previousValue = previous.metrics[key] || 0;
      const change = currentValue - previousValue;
      const percentChange = previousValue > 0 ? ((change / previousValue) * 100).toFixed(1) : 0;

      comparison.metrics[key] = {
        current: currentValue,
        previous: previousValue,
        change,
        percentChange: parseFloat(percentChange),
        trend: change < 0 ? 'improved' : change > 0 ? 'regressed' : 'stable'
      };

      const degradationPercent = Math.abs(parseFloat(percentChange));
      if (change > 0 && degradationPercent >= thresholds.regressionDetection.metricDegradationPercent) {
        comparison.regressions.push({ type: 'metric', metric: key, change, percentChange: degradationPercent });
      } else if (change < 0 && degradationPercent >= thresholds.regressionDetection.metricDegradationPercent) {
        comparison.improvements.push({ type: 'metric', metric: key, change, percentChange: degradationPercent });
      }
    }

    comparison.overallTrend = comparison.regressions.length > comparison.improvements.length
      ? 'regressing'
      : comparison.improvements.length > comparison.regressions.length
        ? 'improving'
        : 'stable';

    return comparison;
  }

  getSeverity(change) {
    if (change <= -15) return 'critical';
    if (change <= -10) return 'high';
    if (change <= -5) return 'medium';
    return 'low';
  }

  /**
   * Print comparison results
   */
  printComparison(comparison, period) {
    console.log(chalk.blue(`\n📈 ${period.charAt(0).toUpperCase() + period.slice(1)}-over-${period} Comparison:\n`));

    // Scores table
    console.log('  Lighthouse Scores:');
    for (const [key, data] of Object.entries(comparison.scores)) {
      const arrow = data.change > 0 ? chalk.green('↑') : data.change < 0 ? chalk.red('↓') : chalk.gray('→');
      const changeStr = data.change > 0 ? chalk.green(`+${data.change}`) : data.change < 0 ? chalk.red(data.change) : chalk.gray('0');
      console.log(`    ${key.padEnd(15)} ${data.previous} → ${data.current} ${arrow} ${changeStr} (${data.percentChange}%)`);
    }

    // Core Web Vitals
    console.log('\n  Core Web Vitals:');
    const cwvMetrics = ['lcp', 'fid', 'cls', 'tbt'];
    for (const key of cwvMetrics) {
      const data = comparison.metrics[key];
      if (!data) continue;
      // For timing metrics, decrease is improvement
      const arrow = data.change < 0 ? chalk.green('↓') : data.change > 0 ? chalk.red('↑') : chalk.gray('→');
      const unit = key === 'cls' ? '' : 'ms';
      console.log(`    ${key.toUpperCase().padEnd(5)} ${data.previous}${unit} → ${data.current}${unit} ${arrow} (${data.percentChange}%)`);
    }

    // Summary
    console.log(`\n  Overall Trend: ${this.getTrendEmoji(comparison.overallTrend)} ${comparison.overallTrend.toUpperCase()}`);
    if (comparison.regressions.length > 0) {
      console.log(chalk.red(`  ⚠ ${comparison.regressions.length} regression(s) detected`));
    }
    if (comparison.improvements.length > 0) {
      console.log(chalk.green(`  ✓ ${comparison.improvements.length} improvement(s) detected`));
    }
  }

  getTrendEmoji(trend) {
    switch (trend) {
      case 'improving': return '📈';
      case 'regressing': return '📉';
      default: return '➡️';
    }
  }

  /**
   * Generate performance trend analysis
   */
  async generateTrendAnalysis(days = 30, pageId = null) {
    const endDate = new Date();
    const startDate = subDays(endDate, days);

    console.log(chalk.blue(`\n📊 Generating ${days}-day trend analysis...`));

    const audits = await this.getAuditsForPeriod(startDate, endDate, pageId);

    if (audits.length < this.options.minDataPoints) {
      console.log(chalk.yellow(`⚠ Insufficient data points (${audits.length}/${this.options.minDataPoints})`));
      return null;
    }

    // Group by date
    const byDate = {};
    for (const audit of audits) {
      const date = format(parseISO(audit.timestamp), 'yyyy-MM-dd');
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push(audit);
    }

    // Calculate daily averages
    const dailyAverages = Object.entries(byDate)
      .map(([date, dayAudits]) => ({
        date,
        ...this.calculateAverages(dayAudits)
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate trend direction
    const trend = this.calculateTrendDirection(dailyAverages);

    return {
      period: { start: format(startDate, 'yyyy-MM-dd'), end: format(endDate, 'yyyy-MM-dd') },
      dataPoints: audits.length,
      uniqueDays: dailyAverages.length,
      dailyAverages,
      trend,
      summary: this.generateTrendSummary(dailyAverages, trend)
    };
  }

  /**
   * Calculate trend direction using linear regression
   */
  calculateTrendDirection(dailyAverages) {
    if (dailyAverages.length < 2) return null;

    const trends = {};
    const metrics = ['performance', 'accessibility', 'bestPractices', 'seo'];

    for (const metric of metrics) {
      const values = dailyAverages.map((d, i) => ({ x: i, y: d.scores[metric] }));
      const slope = this.calculateSlope(values);
      trends[metric] = {
        slope: parseFloat(slope.toFixed(2)),
        direction: slope > 0.1 ? 'improving' : slope < -0.1 ? 'declining' : 'stable'
      };
    }

    return trends;
  }

  calculateSlope(points) {
    const n = points.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    for (const point of points) {
      sumX += point.x;
      sumY += point.y;
      sumXY += point.x * point.y;
      sumXX += point.x * point.x;
    }

    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  generateTrendSummary(dailyAverages, trend) {
    const first = dailyAverages[0];
    const last = dailyAverages[dailyAverages.length - 1];

    return {
      periodStart: first.date,
      periodEnd: last.date,
      startScores: first.scores,
      endScores: last.scores,
      scoreChanges: {
        performance: last.scores.performance - first.scores.performance,
        accessibility: last.scores.accessibility - first.scores.accessibility,
        bestPractices: last.scores.bestPractices - first.scores.bestPractices,
        seo: last.scores.seo - first.scores.seo
      },
      trend
    };
  }

  /**
   * Save comparison to database
   */
  async saveComparison(period, current, previous, comparison) {
    if (!this.supabase) return;

    try {
      const { error } = await this.supabase
        .from('boo_comparison_reports')
        .insert({
          period_type: period,
          generated_at: new Date().toISOString(),
          current_period_avg: current,
          previous_period_avg: previous,
          comparison_data: comparison,
          regressions_count: comparison.regressions.length,
          improvements_count: comparison.improvements.length,
          overall_trend: comparison.overallTrend
        });

      if (error) {
        console.log(chalk.yellow(`⚠ Failed to save comparison: ${error.message}`));
      }
    } catch (err) {
      console.log(chalk.yellow(`⚠ Database error: ${err.message}`));
    }
  }
}

// CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const agent = new PerformanceMonitorAgent();

  (async () => {
    try {
      await agent.initialize();

      const periodArg = process.argv.find(arg => arg.startsWith('--period='));
      const period = periodArg ? periodArg.split('=')[1] : 'week';

      const result = await agent.comparePeriods(period);

      if (process.argv.includes('--trend')) {
        const trend = await agent.generateTrendAnalysis(30);
        if (trend) {
          console.log(JSON.stringify(trend, null, 2));
        }
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  })();
}

export default PerformanceMonitorAgent;
