#!/usr/bin/env npx tsx

/**
 * Core Web Vitals Monitor
 *
 * Monitor and analyze Core Web Vitals using GTMetrix data.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// CWV Thresholds
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  TBT: { good: 200, poor: 600 },
  CLS: { good: 0.1, poor: 0.25 }
};

interface CWVResult {
  url: string;
  business: string;
  test_date: string;
  lcp_ms: number;
  tbt_ms: number;
  cls: number;
  lcp_status: 'good' | 'needs_improvement' | 'poor';
  tbt_status: 'good' | 'needs_improvement' | 'poor';
  cls_status: 'good' | 'needs_improvement' | 'poor';
  overall_status: 'pass' | 'fail';
  performance_score: number;
  page_size_bytes: number;
  total_requests: number;
  issues: string[];
}

function getStatus(value: number, metric: keyof typeof THRESHOLDS): 'good' | 'needs_improvement' | 'poor' {
  const threshold = THRESHOLDS[metric];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs_improvement';
  return 'poor';
}

async function getLatestTests(business?: string): Promise<CWVResult[]> {
  let query = supabase
    .from('v_gtmetrix_latest')
    .select('*')
    .order('tested_at', { ascending: false });

  if (business) {
    query = query.eq('business', business);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching GTMetrix data:', error.message);
    return [];
  }

  return (data || []).map(test => {
    const lcpStatus = getStatus(test.lcp_ms || 0, 'LCP');
    const tbtStatus = getStatus(test.tbt_ms || 0, 'TBT');
    const clsStatus = getStatus(test.cls || 0, 'CLS');

    const issues: string[] = [];
    if (lcpStatus !== 'good') issues.push(`LCP: ${test.lcp_ms}ms`);
    if (tbtStatus !== 'good') issues.push(`TBT: ${test.tbt_ms}ms`);
    if (clsStatus !== 'good') issues.push(`CLS: ${test.cls}`);
    if (test.page_size_bytes > 3000000) issues.push(`Large page: ${(test.page_size_bytes / 1024 / 1024).toFixed(1)}MB`);
    if (test.total_requests > 100) issues.push(`Many requests: ${test.total_requests}`);

    return {
      url: test.url,
      business: test.business,
      test_date: test.tested_at,
      lcp_ms: test.lcp_ms || 0,
      tbt_ms: test.tbt_ms || 0,
      cls: test.cls || 0,
      lcp_status: lcpStatus,
      tbt_status: tbtStatus,
      cls_status: clsStatus,
      overall_status: lcpStatus === 'good' && tbtStatus === 'good' && clsStatus === 'good' ? 'pass' : 'fail',
      performance_score: test.performance_score || 0,
      page_size_bytes: test.page_size_bytes || 0,
      total_requests: test.total_requests || 0,
      issues
    };
  });
}

async function getFailingPages(): Promise<CWVResult[]> {
  const { data } = await supabase
    .from('v_gtmetrix_needs_attention')
    .select('*');

  return (data || []).map(test => ({
    url: test.url,
    business: test.business,
    test_date: test.tested_at,
    lcp_ms: test.lcp_ms || 0,
    tbt_ms: test.tbt_ms || 0,
    cls: test.cls || 0,
    lcp_status: getStatus(test.lcp_ms || 0, 'LCP'),
    tbt_status: getStatus(test.tbt_ms || 0, 'TBT'),
    cls_status: getStatus(test.cls || 0, 'CLS'),
    overall_status: 'fail' as const,
    performance_score: test.performance_score || 0,
    page_size_bytes: test.page_size_bytes || 0,
    total_requests: test.total_requests || 0,
    issues: []
  }));
}

function printResults(results: CWVResult[]): void {
  // Group by business
  const byBusiness: Record<string, CWVResult[]> = {};
  for (const r of results) {
    if (!byBusiness[r.business]) byBusiness[r.business] = [];
    byBusiness[r.business].push(r);
  }

  for (const [business, tests] of Object.entries(byBusiness)) {
    const passing = tests.filter(t => t.overall_status === 'pass').length;
    const failing = tests.filter(t => t.overall_status === 'fail').length;
    const passRate = tests.length > 0 ? (passing / tests.length * 100).toFixed(1) : 0;

    console.log(`\n📊 ${business.toUpperCase()}`);
    console.log('='.repeat(60));
    console.log(`Pass Rate: ${passRate}% (${passing}/${tests.length})`);

    // Averages
    const avgLCP = tests.reduce((sum, t) => sum + t.lcp_ms, 0) / tests.length;
    const avgTBT = tests.reduce((sum, t) => sum + t.tbt_ms, 0) / tests.length;
    const avgCLS = tests.reduce((sum, t) => sum + t.cls, 0) / tests.length;

    console.log(`\nAverages:`);
    console.log(`   LCP: ${avgLCP.toFixed(0)}ms ${avgLCP <= 2500 ? '✅' : '❌'}`);
    console.log(`   TBT: ${avgTBT.toFixed(0)}ms ${avgTBT <= 200 ? '✅' : '❌'}`);
    console.log(`   CLS: ${avgCLS.toFixed(3)} ${avgCLS <= 0.1 ? '✅' : '❌'}`);

    // Failing pages
    const failingTests = tests.filter(t => t.overall_status === 'fail');
    if (failingTests.length > 0) {
      console.log(`\n❌ Failing Pages (${failingTests.length}):`);
      for (const t of failingTests.slice(0, 10)) {
        const shortUrl = t.url.length > 50 ? t.url.substring(0, 50) + '...' : t.url;
        console.log(`   ${shortUrl}`);
        console.log(`      LCP: ${t.lcp_ms}ms | TBT: ${t.tbt_ms}ms | CLS: ${t.cls}`);
        if (t.issues.length > 0) {
          console.log(`      Issues: ${t.issues.join(', ')}`);
        }
      }
      if (failingTests.length > 10) {
        console.log(`   ... and ${failingTests.length - 10} more`);
      }
    }

    // Recommendations
    console.log(`\n💡 Recommendations:`);
    if (avgLCP > 2500) {
      console.log(`   • Optimize LCP: Compress images, use lazy loading, reduce render-blocking resources`);
    }
    if (avgTBT > 200) {
      console.log(`   • Reduce TBT: Split long tasks, defer non-critical JS, optimize third-party scripts`);
    }
    if (avgCLS > 0.1) {
      console.log(`   • Fix CLS: Set explicit dimensions for images/videos, avoid inserting content above existing content`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const businessArg = args.find(a => a.startsWith('--business='))?.split('=')[1];
  const failingOnly = args.includes('--failing');
  const retestFailing = args.includes('--retest-failing');

  console.log('Core Web Vitals Monitor');
  console.log('=======================');

  if (retestFailing) {
    console.log('\n⚠️ Retest functionality requires GTMetrix API integration.');
    console.log('Run: node shared/libs/integrations/gtmetrix/run-test.js --url <url>');

    const failing = await getFailingPages();
    console.log(`\nPages needing retest (${failing.length}):`);
    for (const f of failing.slice(0, 20)) {
      console.log(`   ${f.url}`);
    }
    return;
  }

  let results: CWVResult[];

  if (failingOnly) {
    console.log('Showing failing pages only...\n');
    results = await getFailingPages();
  } else {
    results = await getLatestTests(businessArg);
  }

  if (results.length === 0) {
    console.log('No GTMetrix test results found.');
    console.log('\nRun tests with: node shared/libs/integrations/gtmetrix/run-test.js --url <url>');
    return;
  }

  printResults(results);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('OVERALL SUMMARY');
  console.log('='.repeat(60));

  const totalPassing = results.filter(r => r.overall_status === 'pass').length;
  const totalFailing = results.filter(r => r.overall_status === 'fail').length;

  console.log(`Total Pages Tested: ${results.length}`);
  console.log(`Passing CWV: ${totalPassing} (${(totalPassing / results.length * 100).toFixed(1)}%)`);
  console.log(`Failing CWV: ${totalFailing} (${(totalFailing / results.length * 100).toFixed(1)}%)`);

  const targetPassRate = 80;
  if (totalPassing / results.length * 100 < targetPassRate) {
    console.log(`\n⚠️ Pass rate below ${targetPassRate}% target. Prioritize optimization.`);
  } else {
    console.log(`\n✅ Pass rate meets ${targetPassRate}% target!`);
  }
}

main().catch(console.error);
