#!/usr/bin/env ts-node
/**
 * Baseline Audit Tool
 * Comprehensive audit of all key pages to establish performance baseline
 */

import LighthouseRunner from './lighthouse-runner';
import { getLogger } from './supabase-logger';

interface BaselineConfig {
  brand: 'teelixir' | 'elevate';
  storeUrl: string;
  pages: Array<{
    url: string;
    pageType: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
  }>;
}

const TEELIXIR_CONFIG: BaselineConfig = {
  brand: 'teelixir',
  storeUrl: 'https://teelixir-au.myshopify.com',
  pages: [
    { url: '/', pageType: 'homepage', priority: 'critical' },
    { url: '/collections/all', pageType: 'collection', priority: 'critical' },
    { url: '/products/organic-pure-chaga-50gm', pageType: 'product', priority: 'critical' },
    { url: '/cart', pageType: 'cart', priority: 'high' },
    { url: '/pages/about', pageType: 'about', priority: 'medium' },
    { url: '/pages/contact', pageType: 'contact', priority: 'medium' },
    { url: '/blogs/news', pageType: 'blog', priority: 'low' }
  ]
};

const ELEVATE_CONFIG: BaselineConfig = {
  brand: 'elevate',
  storeUrl: 'https://elevate-wholesale.myshopify.com',
  pages: [
    { url: '/', pageType: 'homepage', priority: 'critical' },
    { url: '/collections/all', pageType: 'collection', priority: 'critical' },
    { url: '/cart', pageType: 'cart', priority: 'high' },
    { url: '/pages/about', pageType: 'about', priority: 'medium' }
  ]
};

async function runBaselineAudit(config: BaselineConfig) {
  const runner = new LighthouseRunner();
  const logger = getLogger();

  console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║   BASELINE PERFORMANCE AUDIT - ${config.brand.toUpperCase()}               ║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝\n`);

  console.log(`Store: ${config.storeUrl}`);
  console.log(`Pages to audit: ${config.pages.length}`);
  console.log(`\nThis will take approximately ${config.pages.length * 2} minutes...\n`);

  const results: any[] = [];
  let totalScore = { performance: 0, accessibility: 0, bestPractices: 0, seo: 0 };
  let criticalIssues: string[] = [];

  for (let i = 0; i < config.pages.length; i++) {
    const page = config.pages[i];
    const url = page.url.startsWith('http') ? page.url : `${config.storeUrl}${page.url}`;

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`[${i + 1}/${config.pages.length}] ${page.pageType.toUpperCase()}`);
    console.log(`URL: ${url}`);
    console.log(`Priority: ${page.priority}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // Run desktop audit
    console.log(`Running desktop audit...`);
    const desktopResult = await runner.runAudit({
      url,
      brand: config.brand,
      environment: 'production',
      pageType: page.pageType,
      device: 'desktop'
    });

    // Run mobile audit
    console.log(`\nRunning mobile audit...`);
    const mobileResult = await runner.runAudit({
      url,
      brand: config.brand,
      environment: 'production',
      pageType: page.pageType,
      device: 'mobile'
    });

    results.push({
      page: page.pageType,
      url,
      priority: page.priority,
      desktop: desktopResult,
      mobile: mobileResult
    });

    // Aggregate scores
    totalScore.performance += desktopResult.scores.performance;
    totalScore.accessibility += desktopResult.scores.accessibility;
    totalScore.bestPractices += desktopResult.scores.bestPractices;
    totalScore.seo += desktopResult.scores.seo;

    // Collect critical issues
    if (page.priority === 'critical') {
      if (!desktopResult.passed) {
        criticalIssues.push(`${page.pageType} (desktop): ${desktopResult.failures.join(', ')}`);
      }
      if (!mobileResult.passed) {
        criticalIssues.push(`${page.pageType} (mobile): ${mobileResult.failures.join(', ')}`);
      }
    }

    console.log(`\n✅ Completed ${page.pageType}\n`);
  }

  // Calculate averages
  const avgScores = {
    performance: Math.round(totalScore.performance / config.pages.length),
    accessibility: Math.round(totalScore.accessibility / config.pages.length),
    bestPractices: Math.round(totalScore.bestPractices / config.pages.length),
    seo: Math.round(totalScore.seo / config.pages.length)
  };

  // Print comprehensive report
  printBaselineReport(config, results, avgScores, criticalIssues);

  // Save report to file
  saveBaselineReport(config, results, avgScores, criticalIssues);

  return { results, avgScores, criticalIssues };
}

function printBaselineReport(
  config: BaselineConfig,
  results: any[],
  avgScores: any,
  criticalIssues: string[]
) {
  console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║   BASELINE AUDIT COMPLETE - ${config.brand.toUpperCase()}                  ║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝\n`);

  // Overall averages
  console.log(`📊 OVERALL AVERAGE SCORES (Desktop):`);
  console.log(`   Performance:     ${formatScore(avgScores.performance)}`);
  console.log(`   Accessibility:   ${formatScore(avgScores.accessibility)}`);
  console.log(`   Best Practices:  ${formatScore(avgScores.bestPractices)}`);
  console.log(`   SEO:             ${formatScore(avgScores.seo)}\n`);

  // Page-by-page breakdown
  console.log(`📄 PAGE-BY-PAGE BREAKDOWN:\n`);
  results.forEach(result => {
    console.log(`   ${result.page.toUpperCase()} (${result.priority})`);
    console.log(`   ├─ Desktop:  P:${result.desktop.scores.performance} A:${result.desktop.scores.accessibility} BP:${result.desktop.scores.bestPractices} SEO:${result.desktop.scores.seo}`);
    console.log(`   └─ Mobile:   P:${result.mobile.scores.performance} A:${result.mobile.scores.accessibility} BP:${result.mobile.scores.bestPractices} SEO:${result.mobile.scores.seo}`);
    console.log();
  });

  // Critical issues
  if (criticalIssues.length > 0) {
    console.log(`🚨 CRITICAL ISSUES (Priority Pages):\n`);
    criticalIssues.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}`);
    });
    console.log();
  } else {
    console.log(`✅ No critical issues found on priority pages!\n`);
  }

  // Optimization priorities
  console.log(`🎯 OPTIMIZATION PRIORITIES:\n`);

  const priorities = [];
  if (avgScores.performance < 95) {
    priorities.push({
      priority: 'CRITICAL',
      category: 'Performance',
      score: avgScores.performance,
      actions: [
        'Optimize images (WebP, responsive, lazy loading)',
        'Extract and inline critical CSS',
        'Defer non-critical JavaScript',
        'Optimize font loading'
      ]
    });
  }

  if (avgScores.accessibility < 95) {
    priorities.push({
      priority: 'CRITICAL',
      category: 'Accessibility',
      score: avgScores.accessibility,
      actions: [
        'Fix missing alt text on images',
        'Improve color contrast ratios',
        'Add form labels',
        'Ensure keyboard navigation'
      ]
    });
  }

  if (avgScores.bestPractices < 95) {
    priorities.push({
      priority: 'HIGH',
      category: 'Best Practices',
      score: avgScores.bestPractices,
      actions: [
        'Fix console errors',
        'Use HTTPS for all resources',
        'Update deprecated APIs',
        'Add Content Security Policy'
      ]
    });
  }

  if (priorities.length === 0) {
    console.log(`   ✅ All scores ≥95! Focus on achieving perfect 100/100.\n`);
  } else {
    priorities.forEach(p => {
      console.log(`   [${p.priority}] ${p.category}: ${p.score}/100`);
      p.actions.forEach(action => {
        console.log(`      • ${action}`);
      });
      console.log();
    });
  }

  // Next steps
  console.log(`📋 NEXT STEPS:\n`);
  console.log(`   1. Review detailed audit results in Supabase`);
  console.log(`   2. Prioritize fixes based on critical issues`);
  console.log(`   3. Use Theme Optimizer Agent for implementation`);
  console.log(`   4. Re-run baseline after optimizations`);
  console.log(`   5. Track progress with: npm run lighthouse:trends\n`);

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

function saveBaselineReport(
  config: BaselineConfig,
  results: any[],
  avgScores: any,
  criticalIssues: string[]
) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `/root/master-ops/agents/reports/baseline-${config.brand}-${timestamp}.json`;

  const report = {
    brand: config.brand,
    timestamp: new Date().toISOString(),
    storeUrl: config.storeUrl,
    avgScores,
    results,
    criticalIssues,
    totalPages: results.length
  };

  const fs = require('fs');
  const path = require('path');

  // Ensure reports directory exists
  const dir = path.dirname(filename);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filename, JSON.stringify(report, null, 2));
  console.log(`📄 Report saved to: ${filename}\n`);
}

function formatScore(score: number): string {
  const icon = score >= 95 ? '✅' : score >= 80 ? '⚠️' : '❌';
  return `${score}/100 ${icon}`;
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const brand = args[0] as 'teelixir' | 'elevate';

  if (!brand || !['teelixir', 'elevate'].includes(brand)) {
    console.log(`
Usage: ts-node baseline-audit.ts <brand>

Arguments:
  brand    teelixir | elevate

Example:
  ts-node baseline-audit.ts teelixir
    `);
    process.exit(1);
  }

  const config = brand === 'teelixir' ? TEELIXIR_CONFIG : ELEVATE_CONFIG;

  runBaselineAudit(config)
    .then(({ avgScores, criticalIssues }) => {
      const allGood = Object.values(avgScores).every((score: any) => score >= 95);
      process.exit(allGood && criticalIssues.length === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Baseline audit failed:', error);
      process.exit(1);
    });
}

export default runBaselineAudit;
