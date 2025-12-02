#!/usr/bin/env npx tsx
/**
 * A/B Test Analyzer with Statistical Significance
 *
 * Analyzes A/B tests to determine winners with statistical confidence.
 * Supports email, landing page, and ad copy tests.
 *
 * Usage:
 *   npx tsx ab-test-analyzer.ts --test-id TEST123
 *   npx tsx ab-test-analyzer.ts --list --status active
 *   npx tsx ab-test-analyzer.ts --analyze-all
 */

import { createClient } from '@supabase/supabase-js';

interface Variant {
  id: string;
  name: string;
  visitors: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
  revenuePerVisitor: number;
}

interface TestResult {
  testId: string;
  testName: string;
  testType: string;
  status: 'running' | 'significant' | 'not_significant' | 'needs_data';
  control: Variant;
  treatment: Variant;
  lift: number;
  confidence: number;
  pValue: number;
  recommendation: string;
  sampleSizeNeeded: number;
  daysRemaining: number;
}

// Initialize Supabase
function getSupabaseClient() {
  const url = process.env.MASTER_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.MASTER_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient(url, key);
}

// Statistical functions
function normalCdf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

function calculateZScore(control: Variant, treatment: Variant): number {
  const p1 = control.conversionRate / 100;
  const p2 = treatment.conversionRate / 100;
  const n1 = control.visitors;
  const n2 = treatment.visitors;

  if (n1 === 0 || n2 === 0) return 0;

  const pooledP = (control.conversions + treatment.conversions) / (n1 + n2);
  const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2));

  if (se === 0) return 0;

  return (p2 - p1) / se;
}

function calculatePValue(zScore: number): number {
  return 2 * (1 - normalCdf(Math.abs(zScore)));
}

function calculateConfidence(pValue: number): number {
  return (1 - pValue) * 100;
}

function calculateSampleSizeNeeded(
  baselineRate: number,
  minimumDetectableEffect: number = 0.1,
  power: number = 0.8,
  alpha: number = 0.05
): number {
  const zAlpha = 1.96; // for 95% confidence
  const zBeta = 0.84;  // for 80% power

  const p1 = baselineRate;
  const p2 = baselineRate * (1 + minimumDetectableEffect);

  const numerator = 2 * Math.pow(zAlpha + zBeta, 2) * p1 * (1 - p1);
  const denominator = Math.pow(p2 - p1, 2);

  return Math.ceil(numerator / denominator);
}

// Fetch test data
async function fetchTest(
  supabase: ReturnType<typeof createClient>,
  testId: string
): Promise<TestResult | null> {
  const { data: test, error } = await supabase
    .from('ab_tests')
    .select(`
      *,
      variants:ab_test_variants(*)
    `)
    .eq('id', testId)
    .single();

  if (error || !test) {
    console.error('Test not found:', testId);
    return null;
  }

  const control = test.variants.find((v: any) => v.is_control);
  const treatment = test.variants.find((v: any) => !v.is_control);

  if (!control || !treatment) {
    console.error('Missing control or treatment variant');
    return null;
  }

  const controlVariant: Variant = {
    id: control.id,
    name: control.name,
    visitors: control.visitors || 0,
    conversions: control.conversions || 0,
    revenue: control.revenue || 0,
    conversionRate: control.visitors > 0 ? (control.conversions / control.visitors) * 100 : 0,
    revenuePerVisitor: control.visitors > 0 ? control.revenue / control.visitors : 0
  };

  const treatmentVariant: Variant = {
    id: treatment.id,
    name: treatment.name,
    visitors: treatment.visitors || 0,
    conversions: treatment.conversions || 0,
    revenue: treatment.revenue || 0,
    conversionRate: treatment.visitors > 0 ? (treatment.conversions / treatment.visitors) * 100 : 0,
    revenuePerVisitor: treatment.visitors > 0 ? treatment.revenue / treatment.visitors : 0
  };

  const zScore = calculateZScore(controlVariant, treatmentVariant);
  const pValue = calculatePValue(zScore);
  const confidence = calculateConfidence(pValue);
  const lift = controlVariant.conversionRate > 0
    ? ((treatmentVariant.conversionRate - controlVariant.conversionRate) / controlVariant.conversionRate) * 100
    : 0;

  const totalVisitors = controlVariant.visitors + treatmentVariant.visitors;
  const sampleSizeNeeded = calculateSampleSizeNeeded(controlVariant.conversionRate / 100);
  const dailyVisitors = totalVisitors / Math.max(1, daysSinceStart(test.created_at));
  const daysRemaining = dailyVisitors > 0
    ? Math.ceil((sampleSizeNeeded * 2 - totalVisitors) / dailyVisitors)
    : 999;

  let status: TestResult['status'];
  let recommendation: string;

  if (totalVisitors < 100) {
    status = 'needs_data';
    recommendation = `Need more data. Currently ${totalVisitors} visitors, recommend at least ${sampleSizeNeeded * 2}.`;
  } else if (confidence >= 95) {
    status = 'significant';
    if (lift > 0) {
      recommendation = `WINNER: ${treatmentVariant.name} with ${lift.toFixed(1)}% lift at ${confidence.toFixed(1)}% confidence. Implement treatment.`;
    } else {
      recommendation = `WINNER: ${controlVariant.name}. Treatment performed ${Math.abs(lift).toFixed(1)}% worse. Keep control.`;
    }
  } else if (confidence >= 80) {
    status = 'running';
    recommendation = `Trending ${lift > 0 ? 'positive' : 'negative'} (${confidence.toFixed(1)}% confidence). Continue test for ${daysRemaining} more days.`;
  } else {
    status = 'not_significant';
    recommendation = `No significant difference detected. Continue test or increase traffic.`;
  }

  return {
    testId: test.id,
    testName: test.name,
    testType: test.test_type,
    status,
    control: controlVariant,
    treatment: treatmentVariant,
    lift,
    confidence,
    pValue,
    recommendation,
    sampleSizeNeeded,
    daysRemaining: Math.max(0, daysRemaining)
  };
}

function daysSinceStart(startDate: string): number {
  const start = new Date(startDate);
  const now = new Date();
  return Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

// List active tests
async function listTests(
  supabase: ReturnType<typeof createClient>,
  status?: string
): Promise<void> {
  let query = supabase.from('ab_tests').select('*').order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data: tests, error } = await query.limit(20);

  if (error) {
    console.error('Error fetching tests:', error.message);
    return;
  }

  console.log('\n📊 A/B Tests');
  console.log('─'.repeat(80));

  if (!tests || tests.length === 0) {
    console.log('  No tests found');
    return;
  }

  for (const test of tests) {
    console.log(`  ${test.id} | ${test.name}`);
    console.log(`    Type: ${test.test_type} | Status: ${test.status} | Created: ${test.created_at.split('T')[0]}`);
  }

  console.log('');
}

// Format test result
function formatResult(result: TestResult): string {
  const statusEmoji = {
    running: '🔄',
    significant: '✅',
    not_significant: '❓',
    needs_data: '📊'
  };

  const lines = [
    '',
    '═'.repeat(70),
    `  ${statusEmoji[result.status]} A/B Test: ${result.testName}`,
    '═'.repeat(70),
    '',
    `  Test ID: ${result.testId}`,
    `  Type: ${result.testType}`,
    `  Status: ${result.status.toUpperCase()}`,
    '',
    '📈 RESULTS',
    '─'.repeat(70),
    '',
    `  CONTROL: ${result.control.name}`,
    `    Visitors: ${result.control.visitors.toLocaleString()}`,
    `    Conversions: ${result.control.conversions.toLocaleString()}`,
    `    Conversion Rate: ${result.control.conversionRate.toFixed(2)}%`,
    `    Revenue: $${result.control.revenue.toFixed(2)}`,
    '',
    `  TREATMENT: ${result.treatment.name}`,
    `    Visitors: ${result.treatment.visitors.toLocaleString()}`,
    `    Conversions: ${result.treatment.conversions.toLocaleString()}`,
    `    Conversion Rate: ${result.treatment.conversionRate.toFixed(2)}%`,
    `    Revenue: $${result.treatment.revenue.toFixed(2)}`,
    '',
    '📊 STATISTICS',
    '─'.repeat(70),
    `  Lift: ${result.lift > 0 ? '+' : ''}${result.lift.toFixed(2)}%`,
    `  Statistical Confidence: ${result.confidence.toFixed(1)}%`,
    `  P-Value: ${result.pValue.toFixed(4)}`,
    `  Sample Size Needed (per variant): ${result.sampleSizeNeeded.toLocaleString()}`,
    '',
    '💡 RECOMMENDATION',
    '─'.repeat(70),
    `  ${result.recommendation}`,
    ''
  ];

  return lines.join('\n');
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const testId = args.find(a => a.startsWith('--test-id='))?.split('=')[1]
    || (args.includes('--test-id') ? args[args.indexOf('--test-id') + 1] : null);
  const shouldList = args.includes('--list');
  const analyzeAll = args.includes('--analyze-all');
  const status = args.find(a => a.startsWith('--status='))?.split('=')[1];

  const supabase = getSupabaseClient();

  if (shouldList) {
    await listTests(supabase, status);
    return;
  }

  if (testId) {
    const result = await fetchTest(supabase, testId);
    if (result) {
      console.log(formatResult(result));

      // Update test status in database
      await supabase.from('ab_tests').update({
        calculated_confidence: result.confidence,
        calculated_lift: result.lift,
        analysis_status: result.status,
        last_analyzed_at: new Date().toISOString()
      }).eq('id', testId);
    }
    return;
  }

  if (analyzeAll) {
    const { data: activeTests } = await supabase
      .from('ab_tests')
      .select('id')
      .eq('status', 'active');

    if (!activeTests || activeTests.length === 0) {
      console.log('No active tests to analyze');
      return;
    }

    console.log(`\n📊 Analyzing ${activeTests.length} active tests...\n`);

    for (const test of activeTests) {
      const result = await fetchTest(supabase, test.id);
      if (result) {
        console.log(`${result.testName}: ${result.status} (${result.confidence.toFixed(1)}% confidence)`);

        await supabase.from('ab_tests').update({
          calculated_confidence: result.confidence,
          calculated_lift: result.lift,
          analysis_status: result.status,
          last_analyzed_at: new Date().toISOString()
        }).eq('id', test.id);
      }
    }

    console.log('\n✅ All tests analyzed');
    return;
  }

  console.log('Usage:');
  console.log('  npx tsx ab-test-analyzer.ts --test-id TEST123    # Analyze specific test');
  console.log('  npx tsx ab-test-analyzer.ts --list               # List all tests');
  console.log('  npx tsx ab-test-analyzer.ts --list --status active');
  console.log('  npx tsx ab-test-analyzer.ts --analyze-all        # Analyze all active tests');
}

main().catch(console.error);
