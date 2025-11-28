/**
 * GTMetrix API Client
 *
 * Run website performance tests and analyze results for SEO/technical fixes.
 *
 * API Docs: https://gtmetrix.com/api/docs/2.0/
 *
 * Required environment variables:
 *   - GTMETRIX_API_KEY
 *
 * Usage:
 *   const gtmetrix = require('./client');
 *   const test = await gtmetrix.runTest('https://www.buyorganicsonline.com.au');
 *   const results = await gtmetrix.waitForResults(test.id);
 */

const https = require('https');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../../../.env') });

const API_KEY = process.env.GTMETRIX_API_KEY;
const API_BASE = 'gtmetrix.com';

// ============================================
// HTTP HELPERS
// ============================================

function apiRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${API_KEY}:`).toString('base64');

    const options = {
      hostname: API_BASE,
      path: `/api/2.0${endpoint}`,
      method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/vnd.api+json',
      },
    };

    const postData = body ? JSON.stringify(body) : null;
    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`GTMetrix API ${res.statusCode}: ${data}`));
        } else {
          resolve(JSON.parse(data || '{}'));
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

// ============================================
// TEST MANAGEMENT
// ============================================

/**
 * Start a new GTMetrix test
 * @param {string} url - URL to test
 * @param {object} options - Test options
 * @param {string} options.location - Test location (default: Sydney)
 * @param {string} options.browser - Browser type (default: chrome)
 * @param {boolean} options.adblock - Enable adblock (default: false)
 * @returns {Promise<object>} Test object with id
 */
async function runTest(url, options = {}) {
  const body = {
    data: {
      type: 'test',
      attributes: {
        url,
        location: options.location || '3', // Sydney, Australia (ID 3)
        browser: options.browser || '3', // Chrome Desktop
        adblock: options.adblock ? 1 : 0,
        // Enable Lighthouse
        report: 'lighthouse',
      }
    }
  };

  const response = await apiRequest('POST', '/tests', body);
  return {
    id: response.data.id,
    state: response.data.attributes.state,
    url: response.data.attributes.url,
  };
}

/**
 * Get test status and results
 * @param {string} testId - Test ID
 * @returns {Promise<object>} Test results
 */
async function getTest(testId) {
  const response = await apiRequest('GET', `/tests/${testId}`);
  return response.data;
}

/**
 * Get report data (contains actual metrics)
 * @param {string} reportId - Report ID
 * @returns {Promise<object>} Report data
 */
async function getReport(reportId) {
  const response = await apiRequest('GET', `/reports/${reportId}`);
  return response.data;
}

/**
 * Wait for test to complete and return results
 * @param {string} testId - Test ID
 * @param {number} maxWait - Max wait time in ms (default: 5 minutes)
 * @param {number} pollInterval - Poll interval in ms (default: 5 seconds)
 * @returns {Promise<object>} Completed test results
 */
async function waitForResults(testId, maxWait = 300000, pollInterval = 5000) {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    const test = await getTest(testId);

    if (test.attributes.state === 'completed') {
      // Fetch the full report which contains actual metrics
      const reportId = test.attributes.report;
      const report = await getReport(reportId);
      return parseResults(report);
    }

    if (test.attributes.state === 'error') {
      throw new Error(`Test failed: ${test.attributes.error || 'Unknown error'}`);
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Test timed out after ${maxWait / 1000} seconds`);
}

/**
 * Parse raw report results into a cleaner format
 */
function parseResults(report) {
  const attrs = report.attributes;
  const links = report.links || {};

  return {
    id: report.id,
    url: attrs.url,
    state: 'completed',

    // Core Web Vitals
    webVitals: {
      lcp: attrs.largest_contentful_paint, // Largest Contentful Paint (ms)
      tbt: attrs.total_blocking_time, // Total Blocking Time (ms)
      cls: attrs.cumulative_layout_shift, // Cumulative Layout Shift
    },

    // Performance Scores (0-100)
    scores: {
      gtmetrix: attrs.gtmetrix_grade,
      gtmetrixScore: attrs.gtmetrix_score,
      performance: attrs.performance_score,
      structure: attrs.structure_score,
    },

    // Page Metrics
    metrics: {
      fullyLoaded: attrs.fully_loaded_time, // ms
      totalPageSize: attrs.page_bytes, // bytes
      totalRequests: attrs.page_requests,
      htmlSize: attrs.html_bytes,
      ttfb: attrs.time_to_first_byte, // Time to first byte (ms)
      fcp: attrs.first_contentful_paint, // First contentful paint (ms)
      tti: attrs.time_to_interactive, // Time to interactive (ms)
      speedIndex: attrs.speed_index,
      onloadTime: attrs.onload_time,
    },

    // Resource Breakdown (note: detailed breakdown requires HAR analysis)
    resources: {
      total: { bytes: attrs.page_bytes, count: attrs.page_requests },
      html: { bytes: attrs.html_bytes },
    },

    // Links to reports
    reports: {
      reportUrl: links.report_url,
      pdfUrl: links.report_pdf,
      harUrl: links.har,
      screenshotUrl: links.screenshot,
      lighthouseUrl: links.lighthouse,
    },

    // Timestamps
    createdAt: attrs.created,
    expiresAt: attrs.expires,
  };
}

// ============================================
// ACCOUNT & CREDITS
// ============================================

/**
 * Get account status and remaining credits
 */
async function getAccountStatus() {
  const response = await apiRequest('GET', '/status');
  return {
    creditsUsed: response.data.attributes.api_credits,
    creditsRemaining: response.data.attributes.api_refill - response.data.attributes.api_credits,
    refillsAt: response.data.attributes.api_refill_at,
  };
}

/**
 * List recent tests
 * @param {number} limit - Number of tests to return
 */
async function listTests(limit = 10) {
  const response = await apiRequest('GET', `/tests?page[size]=${limit}`);
  return response.data.map(test => ({
    id: test.id,
    url: test.attributes.url,
    state: test.attributes.state,
    createdAt: test.attributes.created_at,
  }));
}

// ============================================
// ANALYSIS HELPERS
// ============================================

/**
 * Analyze results and return prioritized recommendations
 */
function analyzeResults(results) {
  const issues = [];

  // Core Web Vitals checks
  if (results.webVitals.lcp && results.webVitals.lcp > 2500) {
    issues.push({
      severity: results.webVitals.lcp > 4000 ? 'critical' : 'warning',
      category: 'Core Web Vitals',
      issue: 'LCP too slow',
      value: `${(results.webVitals.lcp / 1000).toFixed(2)}s`,
      target: '< 2.5s',
      fix: 'Optimize largest content element (hero image, main heading). Consider lazy loading, image optimization, or preloading critical resources.',
    });
  }

  if (results.webVitals.tbt && results.webVitals.tbt > 200) {
    issues.push({
      severity: results.webVitals.tbt > 600 ? 'critical' : 'warning',
      category: 'Core Web Vitals',
      issue: 'TBT too high',
      value: `${results.webVitals.tbt}ms`,
      target: '< 200ms',
      fix: 'Reduce JavaScript execution time. Defer non-critical scripts, code-split large bundles, remove unused JS.',
    });
  }

  if (results.webVitals.cls && results.webVitals.cls > 0.1) {
    issues.push({
      severity: results.webVitals.cls > 0.25 ? 'critical' : 'warning',
      category: 'Core Web Vitals',
      issue: 'CLS too high',
      value: results.webVitals.cls.toFixed(3),
      target: '< 0.1',
      fix: 'Add explicit width/height to images and embeds. Reserve space for dynamic content. Avoid inserting content above existing content.',
    });
  }

  // Page size checks
  if (results.metrics.totalPageSize) {
    const pageSizeMB = results.metrics.totalPageSize / (1024 * 1024);
    if (pageSizeMB > 2) {
      issues.push({
        severity: pageSizeMB > 4 ? 'critical' : 'warning',
        category: 'Page Weight',
        issue: 'Page too large',
        value: `${pageSizeMB.toFixed(2)}MB`,
        target: '< 2MB',
        fix: 'Compress images, remove unused CSS/JS, enable Gzip/Brotli compression.',
      });
    }
  }

  // Request count
  if (results.metrics.totalRequests && results.metrics.totalRequests > 100) {
    issues.push({
      severity: results.metrics.totalRequests > 150 ? 'critical' : 'warning',
      category: 'Requests',
      issue: 'Too many requests',
      value: `${results.metrics.totalRequests} requests`,
      target: '< 100',
      fix: 'Combine files, use sprites, reduce third-party scripts.',
    });
  }

  // Fully loaded time
  if (results.metrics.fullyLoaded && results.metrics.fullyLoaded > 5000) {
    issues.push({
      severity: results.metrics.fullyLoaded > 10000 ? 'critical' : 'warning',
      category: 'Load Time',
      issue: 'Slow fully loaded time',
      value: `${(results.metrics.fullyLoaded / 1000).toFixed(2)}s`,
      target: '< 5s',
      fix: 'Optimize critical rendering path, defer non-essential resources, use CDN.',
    });
  }

  // TTFB check
  if (results.metrics.ttfb && results.metrics.ttfb > 600) {
    issues.push({
      severity: results.metrics.ttfb > 1000 ? 'critical' : 'warning',
      category: 'Server',
      issue: 'Slow server response (TTFB)',
      value: `${results.metrics.ttfb}ms`,
      target: '< 600ms',
      fix: 'Optimize server-side processing, use caching, consider CDN or faster hosting.',
    });
  }

  // Sort by severity
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return issues;
}

/**
 * Format results as a readable report
 */
function formatReport(results, issues) {
  const lines = [];

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push(`GTMetrix Report: ${results.url}`);
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');

  // Scores
  lines.push('SCORES');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push(`  GTMetrix Grade:    ${results.scores.gtmetrix || 'N/A'}`);
  lines.push(`  Performance:       ${results.scores.performance || 'N/A'}%`);
  lines.push(`  Structure:         ${results.scores.structure || 'N/A'}%`);
  lines.push('');

  // Core Web Vitals
  lines.push('CORE WEB VITALS');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push(`  LCP (Largest Contentful Paint):  ${results.webVitals.lcp ? (results.webVitals.lcp / 1000).toFixed(2) + 's' : 'N/A'}`);
  lines.push(`  TBT (Total Blocking Time):       ${results.webVitals.tbt ? results.webVitals.tbt + 'ms' : 'N/A'}`);
  lines.push(`  CLS (Cumulative Layout Shift):   ${results.webVitals.cls ? results.webVitals.cls.toFixed(3) : 'N/A'}`);
  lines.push('');

  // Page Metrics
  lines.push('PAGE METRICS');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push(`  Fully Loaded:      ${results.metrics.fullyLoaded ? (results.metrics.fullyLoaded / 1000).toFixed(2) + 's' : 'N/A'}`);
  lines.push(`  Page Size:         ${results.metrics.totalPageSize ? (results.metrics.totalPageSize / (1024 * 1024)).toFixed(2) + 'MB' : 'N/A'}`);
  lines.push(`  Total Requests:    ${results.metrics.totalRequests || 'N/A'}`);
  lines.push('');

  // Additional Metrics
  lines.push('ADDITIONAL METRICS');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push(`  TTFB:              ${results.metrics.ttfb ? results.metrics.ttfb + 'ms' : 'N/A'}`);
  lines.push(`  First Paint:       ${results.metrics.fcp ? results.metrics.fcp + 'ms' : 'N/A'}`);
  lines.push(`  Time to Interactive: ${results.metrics.tti ? (results.metrics.tti / 1000).toFixed(2) + 's' : 'N/A'}`);
  lines.push(`  Speed Index:       ${results.metrics.speedIndex || 'N/A'}`);
  lines.push('');

  // Issues
  if (issues.length > 0) {
    lines.push('ISSUES TO FIX');
    lines.push('───────────────────────────────────────────────────────────────');
    issues.forEach((issue, i) => {
      const icon = issue.severity === 'critical' ? '🔴' : issue.severity === 'warning' ? '🟡' : '🔵';
      lines.push(`  ${i + 1}. ${icon} [${issue.category}] ${issue.issue}`);
      lines.push(`     Current: ${issue.value} | Target: ${issue.target}`);
      lines.push(`     Fix: ${issue.fix}`);
      lines.push('');
    });
  } else {
    lines.push('✅ No critical issues found!');
    lines.push('');
  }

  // Links
  lines.push('REPORTS');
  lines.push('───────────────────────────────────────────────────────────────');
  if (results.reports.reportUrl) lines.push(`  Full Report:  ${results.reports.reportUrl}`);
  if (results.reports.pdfUrl) lines.push(`  PDF Report:   ${results.reports.pdfUrl}`);
  lines.push('');

  return lines.join('\n');
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  runTest,
  getTest,
  getReport,
  waitForResults,
  getAccountStatus,
  listTests,
  analyzeResults,
  formatReport,
};
