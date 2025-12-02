/**
 * Metrics Calculator for BOO Optimisation Team
 *
 * Utility functions for calculating performance metrics,
 * trends, and comparisons.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const thresholds = JSON.parse(readFileSync(join(__dirname, '../config/thresholds.json'), 'utf8'));

/**
 * Calculate weighted performance score
 */
export function calculateWeightedScore(scores, weights = null) {
  const defaultWeights = {
    performance: 0.4,
    accessibility: 0.2,
    bestPractices: 0.2,
    seo: 0.2
  };

  const w = weights || defaultWeights;
  let total = 0;
  let weightSum = 0;

  for (const [key, weight] of Object.entries(w)) {
    if (scores[key] !== undefined) {
      total += scores[key] * weight;
      weightSum += weight;
    }
  }

  return weightSum > 0 ? Math.round(total / weightSum) : 0;
}

/**
 * Evaluate Core Web Vitals pass/fail
 */
export function evaluateCoreWebVitals(metrics) {
  const results = {
    passing: [],
    needsImprovement: [],
    failing: [],
    overallPass: true
  };

  const cwvMetrics = ['lcp', 'fid', 'cls', 'inp', 'ttfb'];

  for (const metric of cwvMetrics) {
    const value = metrics[metric];
    const threshold = thresholds.coreWebVitals[metric];

    if (value === undefined || !threshold) continue;

    if (value <= threshold.good) {
      results.passing.push({ metric, value, status: 'good' });
    } else if (value <= threshold.needsImprovement) {
      results.needsImprovement.push({ metric, value, status: 'needs-improvement' });
      results.overallPass = false;
    } else {
      results.failing.push({ metric, value, status: 'poor' });
      results.overallPass = false;
    }
  }

  return results;
}

/**
 * Calculate percentage change between two values
 */
export function percentageChange(oldValue, newValue) {
  if (oldValue === 0) return newValue === 0 ? 0 : 100;
  return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Calculate trend direction from a series of values
 */
export function calculateTrend(values) {
  if (!values || values.length < 2) {
    return { direction: 'unknown', slope: 0 };
  }

  // Simple linear regression
  const n = values.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

  let direction;
  if (slope > 0.5) direction = 'improving';
  else if (slope < -0.5) direction = 'declining';
  else direction = 'stable';

  return { direction, slope: parseFloat(slope.toFixed(2)) };
}

/**
 * Calculate moving average
 */
export function movingAverage(values, windowSize = 7) {
  if (values.length < windowSize) {
    return values;
  }

  const result = [];
  for (let i = windowSize - 1; i < values.length; i++) {
    const window = values.slice(i - windowSize + 1, i + 1);
    const avg = window.reduce((a, b) => a + b, 0) / window.length;
    result.push(parseFloat(avg.toFixed(2)));
  }

  return result;
}

/**
 * Detect anomalies using standard deviation
 */
export function detectAnomalies(values, stdDevThreshold = 2) {
  if (values.length < 5) {
    return [];
  }

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
  const stdDev = Math.sqrt(avgSquaredDiff);

  const anomalies = [];
  for (let i = 0; i < values.length; i++) {
    const zScore = (values[i] - mean) / stdDev;
    if (Math.abs(zScore) > stdDevThreshold) {
      anomalies.push({
        index: i,
        value: values[i],
        zScore: parseFloat(zScore.toFixed(2)),
        direction: zScore > 0 ? 'high' : 'low'
      });
    }
  }

  return anomalies;
}

/**
 * Calculate performance budget compliance
 */
export function checkPerformanceBudget(metrics, budgets = null) {
  const defaultBudgets = thresholds.resourceBudgets;
  const b = budgets || defaultBudgets;

  const results = {
    passing: [],
    warning: [],
    failing: [],
    overallCompliant: true
  };

  for (const [metric, budget] of Object.entries(b)) {
    const value = metrics[metric];
    if (value === undefined) continue;

    if (value <= budget.target) {
      results.passing.push({ metric, value, target: budget.target });
    } else if (value <= budget.warning) {
      results.warning.push({ metric, value, target: budget.target, limit: budget.warning });
      results.overallCompliant = false;
    } else {
      results.failing.push({ metric, value, target: budget.target, limit: budget.critical });
      results.overallCompliant = false;
    }
  }

  return results;
}

/**
 * Format duration in milliseconds to human readable
 */
export function formatDuration(ms) {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default {
  calculateWeightedScore,
  evaluateCoreWebVitals,
  percentageChange,
  calculateTrend,
  movingAverage,
  detectAnomalies,
  checkPerformanceBudget,
  formatDuration,
  formatBytes
};
