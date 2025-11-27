/**
 * BOO Report Generator Agent
 *
 * Generates comprehensive performance reports in various formats.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { format } from 'date-fns';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config = JSON.parse(readFileSync(join(__dirname, '../config/agent-config.json'), 'utf8'));
const thresholds = JSON.parse(readFileSync(join(__dirname, '../config/thresholds.json'), 'utf8'));

export class ReportGeneratorAgent {
  constructor(options = {}) {
    this.name = 'Report Generator Agent';
    this.version = '1.0.0';
    this.supabase = null;
    this.reportsDir = join(__dirname, '../reports');
    this.options = {
      format: config.agents.reportGenerator.defaultFormat || 'markdown',
      ...options
    };
  }

  async initialize() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      console.log(chalk.green('✓ Report Generator initialized'));
    }

    // Ensure reports directory exists
    if (!existsSync(this.reportsDir)) {
      mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  /**
   * Generate a full audit report
   */
  generateAuditReport(auditResults, comparison = null, recommendations = null) {
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
    const report = {
      meta: {
        title: 'BOO Website Performance Audit Report',
        generated: new Date().toISOString(),
        store: 'Buy Organics Online',
        platform: 'BigCommerce'
      },
      summary: this.generateSummary(auditResults),
      scores: this.aggregateScores(auditResults),
      coreWebVitals: this.aggregateCoreWebVitals(auditResults),
      comparison: comparison,
      recommendations: recommendations,
      details: auditResults
    };

    return report;
  }

  /**
   * Generate executive summary
   */
  generateSummary(auditResults) {
    const validResults = auditResults.filter(r => !r.error);
    if (validResults.length === 0) {
      return { status: 'error', message: 'No valid audit results' };
    }

    const avgScores = {
      performance: 0,
      accessibility: 0,
      bestPractices: 0,
      seo: 0
    };

    for (const result of validResults) {
      avgScores.performance += result.scores.performance;
      avgScores.accessibility += result.scores.accessibility;
      avgScores.bestPractices += result.scores.bestPractices;
      avgScores.seo += result.scores.seo;
    }

    const count = validResults.length;
    Object.keys(avgScores).forEach(key => {
      avgScores[key] = Math.round(avgScores[key] / count);
    });

    // Determine overall status
    const minScore = Math.min(...Object.values(avgScores));
    let status, statusMessage;

    if (minScore >= 95) {
      status = 'excellent';
      statusMessage = 'All scores are in the excellent range (95+)';
    } else if (minScore >= 85) {
      status = 'good';
      statusMessage = 'Scores are acceptable but have room for improvement';
    } else if (minScore >= 70) {
      status = 'needs-work';
      statusMessage = 'Several areas need optimization attention';
    } else {
      status = 'critical';
      statusMessage = 'Critical performance issues detected - immediate action required';
    }

    // Count failing audits
    let totalFailingAudits = 0;
    for (const result of validResults) {
      totalFailingAudits += (result.failingAudits || []).length;
    }

    return {
      status,
      statusMessage,
      averageScores: avgScores,
      pagesAudited: count,
      totalFailingAudits,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Aggregate scores across all audits
   */
  aggregateScores(auditResults) {
    const byDevice = { desktop: [], mobile: [] };
    const byPage = {};

    for (const result of auditResults) {
      if (result.error) continue;

      byDevice[result.device]?.push(result.scores);

      if (!byPage[result.pageId]) {
        byPage[result.pageId] = { name: result.pageName, desktop: null, mobile: null };
      }
      byPage[result.pageId][result.device] = result.scores;
    }

    return { byDevice, byPage };
  }

  /**
   * Aggregate Core Web Vitals
   */
  aggregateCoreWebVitals(auditResults) {
    const vitals = { desktop: {}, mobile: {} };

    for (const result of auditResults) {
      if (result.error) continue;

      const device = result.device;
      if (!vitals[device].lcp) {
        vitals[device] = {
          lcp: [],
          fid: [],
          cls: [],
          tbt: [],
          fcp: [],
          tti: [],
          ttfb: []
        };
      }

      vitals[device].lcp.push(result.metrics.lcp);
      vitals[device].fid.push(result.metrics.fid);
      vitals[device].cls.push(result.metrics.cls);
      vitals[device].tbt.push(result.metrics.tbt);
      vitals[device].fcp.push(result.metrics.fcp);
      vitals[device].tti.push(result.metrics.tti);
      vitals[device].ttfb.push(result.metrics.ttfb);
    }

    // Calculate averages
    const averages = {};
    for (const device of ['desktop', 'mobile']) {
      if (vitals[device].lcp?.length > 0) {
        averages[device] = {};
        for (const [metric, values] of Object.entries(vitals[device])) {
          const avg = values.reduce((a, b) => a + b, 0) / values.length;
          averages[device][metric] = metric === 'cls' ? parseFloat(avg.toFixed(3)) : Math.round(avg);
        }
      }
    }

    return averages;
  }

  /**
   * Format report as Markdown
   */
  formatAsMarkdown(report) {
    const lines = [];

    // Header
    lines.push(`# ${report.meta.title}`);
    lines.push('');
    lines.push(`**Generated:** ${format(new Date(report.meta.generated), 'PPpp')}`);
    lines.push(`**Store:** ${report.meta.store}`);
    lines.push(`**Platform:** ${report.meta.platform}`);
    lines.push('');

    // Executive Summary
    lines.push('## Executive Summary');
    lines.push('');
    lines.push(`**Status:** ${this.getStatusEmoji(report.summary.status)} ${report.summary.status.toUpperCase()}`);
    lines.push('');
    lines.push(report.summary.statusMessage);
    lines.push('');
    lines.push('### Average Scores');
    lines.push('');
    lines.push('| Category | Score | Status |');
    lines.push('|----------|-------|--------|');
    for (const [category, score] of Object.entries(report.summary.averageScores)) {
      const status = this.getScoreStatus(score);
      lines.push(`| ${this.formatCategoryName(category)} | ${score}/100 | ${status} |`);
    }
    lines.push('');

    // Core Web Vitals
    lines.push('## Core Web Vitals');
    lines.push('');
    for (const device of ['desktop', 'mobile']) {
      if (report.coreWebVitals[device]) {
        lines.push(`### ${device.charAt(0).toUpperCase() + device.slice(1)}`);
        lines.push('');
        lines.push('| Metric | Value | Target | Status |');
        lines.push('|--------|-------|--------|--------|');

        const vitals = report.coreWebVitals[device];
        const metricsToShow = ['lcp', 'fid', 'cls', 'tbt', 'fcp', 'ttfb'];

        for (const metric of metricsToShow) {
          if (vitals[metric] !== undefined) {
            const value = vitals[metric];
            const threshold = thresholds.coreWebVitals[metric];
            const unit = metric === 'cls' ? '' : 'ms';
            const target = threshold ? `≤${threshold.good}${unit}` : '-';
            const status = this.getMetricStatus(metric, value);
            lines.push(`| ${metric.toUpperCase()} | ${value}${unit} | ${target} | ${status} |`);
          }
        }
        lines.push('');
      }
    }

    // Comparison (if available)
    if (report.comparison) {
      lines.push('## Period Comparison');
      lines.push('');
      lines.push(`**Trend:** ${this.getTrendEmoji(report.comparison.overallTrend)} ${report.comparison.overallTrend.toUpperCase()}`);
      lines.push('');

      if (report.comparison.regressions?.length > 0) {
        lines.push('### Regressions Detected');
        lines.push('');
        for (const reg of report.comparison.regressions) {
          lines.push(`- ${reg.metric}: ${reg.change > 0 ? '+' : ''}${reg.change} (${reg.severity || 'warning'})`);
        }
        lines.push('');
      }

      if (report.comparison.improvements?.length > 0) {
        lines.push('### Improvements');
        lines.push('');
        for (const imp of report.comparison.improvements) {
          lines.push(`- ${imp.metric}: ${imp.change > 0 ? '+' : ''}${imp.change}`);
        }
        lines.push('');
      }
    }

    // Recommendations
    if (report.recommendations && report.recommendations.length > 0) {
      lines.push('## Recommended Fixes');
      lines.push('');

      const byPriority = { critical: [], high: [], medium: [], low: [] };
      for (const rec of report.recommendations) {
        byPriority[rec.priority]?.push(rec);
      }

      for (const priority of ['critical', 'high', 'medium', 'low']) {
        if (byPriority[priority].length > 0) {
          lines.push(`### ${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority`);
          lines.push('');
          for (const rec of byPriority[priority]) {
            lines.push(`#### ${rec.title}`);
            lines.push('');
            lines.push(rec.description);
            lines.push('');
            if (rec.fix?.estimatedImpact) {
              lines.push(`**Estimated Impact:** ${rec.fix.estimatedImpact}`);
              lines.push('');
            }
            if (rec.fix?.instructions) {
              lines.push('**Steps:**');
              for (const step of rec.fix.instructions) {
                lines.push(`1. ${step}`);
              }
              lines.push('');
            }
          }
        }
      }
    }

    // Footer
    lines.push('---');
    lines.push('');
    lines.push('*Report generated by BOO Optimisation Team*');

    return lines.join('\n');
  }

  /**
   * Format report as JSON
   */
  formatAsJson(report) {
    return JSON.stringify(report, null, 2);
  }

  /**
   * Save report to file
   */
  saveReport(report, format = 'markdown') {
    const timestamp = format === 'markdown'
      ? format(new Date(), 'yyyy-MM-dd_HH-mm')
      : format(new Date(), "yyyy-MM-dd'T'HH-mm-ss");

    const extension = format === 'markdown' ? 'md' : 'json';
    const filename = `audit-report_${timestamp}.${extension}`;
    const filepath = join(this.reportsDir, filename);

    const content = format === 'markdown'
      ? this.formatAsMarkdown(report)
      : this.formatAsJson(report);

    writeFileSync(filepath, content);
    console.log(chalk.green(`✓ Report saved to: ${filepath}`));

    return filepath;
  }

  // Helper methods
  getStatusEmoji(status) {
    const emojis = {
      excellent: '✅',
      good: '👍',
      'needs-work': '⚠️',
      critical: '🚨'
    };
    return emojis[status] || '❓';
  }

  getScoreStatus(score) {
    if (score >= 95) return '✅ Excellent';
    if (score >= 85) return '👍 Good';
    if (score >= 70) return '⚠️ Needs Work';
    return '🚨 Critical';
  }

  getMetricStatus(metric, value) {
    const threshold = thresholds.coreWebVitals[metric];
    if (!threshold) return '❓';

    if (value <= threshold.good) return '✅ Good';
    if (value <= threshold.needsImprovement) return '⚠️ Needs Improvement';
    return '🚨 Poor';
  }

  getTrendEmoji(trend) {
    switch (trend) {
      case 'improving': return '📈';
      case 'regressing': return '📉';
      default: return '➡️';
    }
  }

  formatCategoryName(name) {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
}

// CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const agent = new ReportGeneratorAgent();

  (async () => {
    try {
      await agent.initialize();

      // Generate sample report for testing
      const sampleResults = [{
        pageId: 'homepage',
        pageName: 'Homepage',
        device: 'mobile',
        scores: { performance: 75, accessibility: 92, bestPractices: 88, seo: 95 },
        metrics: { lcp: 3200, fid: 150, cls: 0.12, tbt: 450, fcp: 1800, tti: 4500, ttfb: 650 },
        failingAudits: [
          { id: 'render-blocking-resources', title: 'Render-blocking resources', score: 0.4 },
          { id: 'uses-responsive-images', title: 'Properly size images', score: 0.5 }
        ],
        evaluation: { overallStatus: 'warning' }
      }];

      const report = agent.generateAuditReport(sampleResults);
      const markdown = agent.formatAsMarkdown(report);
      console.log(markdown);

    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  })();
}

export default ReportGeneratorAgent;
