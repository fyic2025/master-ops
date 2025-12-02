#!/usr/bin/env npx tsx
/**
 * Google Ads Search Term Analyzer
 *
 * Analyzes search terms to find:
 * - High-performing terms to add as keywords
 * - Low-performing terms to add as negatives
 * - Wasted spend opportunities
 *
 * Usage:
 *   npx tsx search-term-analyzer.ts --business boo
 *   npx tsx search-term-analyzer.ts --business teelixir --days 30
 *   npx tsx search-term-analyzer.ts --business boo --export
 */

import { createClient } from '@supabase/supabase-js';

interface SearchTerm {
  searchTerm: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionValue: number;
  ctr: number;
  cpc: number;
  conversionRate: number;
  roas: number;
}

interface TermAnalysis {
  winners: SearchTerm[];       // High ROAS, should be exact match keywords
  losers: SearchTerm[];        // Spending with no conversions, add as negatives
  opportunities: SearchTerm[]; // Good CTR, low conversions, needs optimization
  wastedSpend: number;
}

// Initialize Supabase client
function getSupabaseClient() {
  const url = process.env.MASTER_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.MASTER_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient(url, key);
}

// Fetch search term data
async function fetchSearchTerms(
  supabase: ReturnType<typeof createClient>,
  business: string,
  days: number
): Promise<SearchTerm[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('google_ads_search_terms')
    .select('*')
    .eq('business_slug', business)
    .gte('date', startDate.toISOString().split('T')[0]);

  if (error) {
    console.error('Error fetching search terms:', error.message);
    return [];
  }

  // Aggregate by search term
  const termMap = new Map<string, SearchTerm>();

  for (const row of data || []) {
    const existing = termMap.get(row.search_term) || {
      searchTerm: row.search_term,
      impressions: 0,
      clicks: 0,
      cost: 0,
      conversions: 0,
      conversionValue: 0,
      ctr: 0,
      cpc: 0,
      conversionRate: 0,
      roas: 0
    };

    existing.impressions += row.impressions || 0;
    existing.clicks += row.clicks || 0;
    existing.cost += row.cost_micros ? row.cost_micros / 1000000 : 0;
    existing.conversions += row.conversions || 0;
    existing.conversionValue += row.conversion_value || 0;

    termMap.set(row.search_term, existing);
  }

  // Calculate derived metrics
  return Array.from(termMap.values()).map(term => ({
    ...term,
    ctr: term.impressions > 0 ? (term.clicks / term.impressions) * 100 : 0,
    cpc: term.clicks > 0 ? term.cost / term.clicks : 0,
    conversionRate: term.clicks > 0 ? (term.conversions / term.clicks) * 100 : 0,
    roas: term.cost > 0 ? term.conversionValue / term.cost : 0
  }));
}

// Analyze search terms
function analyzeTerms(terms: SearchTerm[]): TermAnalysis {
  const winners: SearchTerm[] = [];
  const losers: SearchTerm[] = [];
  const opportunities: SearchTerm[] = [];
  let wastedSpend = 0;

  for (const term of terms) {
    // Winners: ROAS > 3x with meaningful spend
    if (term.roas > 3 && term.cost > 5 && term.conversions >= 1) {
      winners.push(term);
    }
    // Losers: Spent > $10 with 0 conversions
    else if (term.cost > 10 && term.conversions === 0) {
      losers.push(term);
      wastedSpend += term.cost;
    }
    // Opportunities: Good CTR but low conversion rate
    else if (term.ctr > 3 && term.clicks > 10 && term.conversionRate < 1) {
      opportunities.push(term);
    }
  }

  // Sort by impact
  winners.sort((a, b) => b.conversionValue - a.conversionValue);
  losers.sort((a, b) => b.cost - a.cost);
  opportunities.sort((a, b) => b.clicks - a.clicks);

  return { winners, losers, opportunities, wastedSpend };
}

// Format output
function formatAnalysis(analysis: TermAnalysis, business: string): string {
  const lines: string[] = [
    '',
    '═'.repeat(70),
    `  Search Term Analysis - ${business.toUpperCase()}`,
    '═'.repeat(70),
    ''
  ];

  // Wasted spend summary
  lines.push(`💸 WASTED SPEND: $${analysis.wastedSpend.toFixed(2)}`);
  lines.push('');

  // Winners
  lines.push('🏆 TOP PERFORMERS (Add as Exact Match Keywords)');
  lines.push('─'.repeat(70));
  if (analysis.winners.length === 0) {
    lines.push('  No clear winners found');
  } else {
    for (const term of analysis.winners.slice(0, 15)) {
      lines.push(`  "${term.searchTerm}"`);
      lines.push(`    ROAS: ${term.roas.toFixed(2)}x | Revenue: $${term.conversionValue.toFixed(2)} | Conv: ${term.conversions}`);
    }
  }
  lines.push('');

  // Losers
  lines.push('🚫 NEGATIVE KEYWORD CANDIDATES');
  lines.push('─'.repeat(70));
  if (analysis.losers.length === 0) {
    lines.push('  No clear losers found');
  } else {
    for (const term of analysis.losers.slice(0, 20)) {
      lines.push(`  "${term.searchTerm}"`);
      lines.push(`    Wasted: $${term.cost.toFixed(2)} | Clicks: ${term.clicks} | 0 Conversions`);
    }
  }
  lines.push('');

  // Opportunities
  lines.push('🎯 OPTIMIZATION OPPORTUNITIES (Good CTR, Low Conversion)');
  lines.push('─'.repeat(70));
  if (analysis.opportunities.length === 0) {
    lines.push('  No opportunities found');
  } else {
    for (const term of analysis.opportunities.slice(0, 10)) {
      lines.push(`  "${term.searchTerm}"`);
      lines.push(`    CTR: ${term.ctr.toFixed(2)}% | Clicks: ${term.clicks} | Conv Rate: ${term.conversionRate.toFixed(2)}%`);
    }
  }
  lines.push('');

  // Summary
  lines.push('📊 SUMMARY');
  lines.push('─'.repeat(70));
  lines.push(`  Winners to add as keywords: ${analysis.winners.length}`);
  lines.push(`  Terms to add as negatives: ${analysis.losers.length}`);
  lines.push(`  Terms needing optimization: ${analysis.opportunities.length}`);
  lines.push(`  Estimated monthly savings from negatives: $${(analysis.wastedSpend).toFixed(2)}`);
  lines.push('');

  return lines.join('\n');
}

// Export to CSV
function exportToCsv(analysis: TermAnalysis): string {
  const rows: string[] = ['type,search_term,impressions,clicks,cost,conversions,conversion_value,roas'];

  for (const term of analysis.winners) {
    rows.push(`winner,"${term.searchTerm}",${term.impressions},${term.clicks},${term.cost.toFixed(2)},${term.conversions},${term.conversionValue.toFixed(2)},${term.roas.toFixed(2)}`);
  }

  for (const term of analysis.losers) {
    rows.push(`negative,"${term.searchTerm}",${term.impressions},${term.clicks},${term.cost.toFixed(2)},${term.conversions},${term.conversionValue.toFixed(2)},${term.roas.toFixed(2)}`);
  }

  for (const term of analysis.opportunities) {
    rows.push(`opportunity,"${term.searchTerm}",${term.impressions},${term.clicks},${term.cost.toFixed(2)},${term.conversions},${term.conversionValue.toFixed(2)},${term.roas.toFixed(2)}`);
  }

  return rows.join('\n');
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const business = args.find(a => a.startsWith('--business='))?.split('=')[1]
    || (args.includes('--business') ? args[args.indexOf('--business') + 1] : null);
  const days = parseInt(args.find(a => a.startsWith('--days='))?.split('=')[1] || '30');
  const shouldExport = args.includes('--export');

  if (!business) {
    console.error('Usage: npx tsx search-term-analyzer.ts --business <boo|teelixir|rhf> [--days 30] [--export]');
    process.exit(1);
  }

  console.log(`🔍 Analyzing search terms for ${business}...`);
  console.log(`   Period: Last ${days} days`);

  const supabase = getSupabaseClient();
  const terms = await fetchSearchTerms(supabase, business, days);

  console.log(`   Found ${terms.length} unique search terms`);

  const analysis = analyzeTerms(terms);

  if (shouldExport) {
    const csv = exportToCsv(analysis);
    const filename = `search-terms-${business}-${new Date().toISOString().split('T')[0]}.csv`;
    require('fs').writeFileSync(filename, csv);
    console.log(`\n✅ Exported to ${filename}`);
  }

  console.log(formatAnalysis(analysis, business));

  // Store analysis in database
  await supabase.from('google_ads_search_term_analysis').upsert({
    business_slug: business,
    analysis_date: new Date().toISOString().split('T')[0],
    period_days: days,
    total_terms_analyzed: terms.length,
    winners_count: analysis.winners.length,
    losers_count: analysis.losers.length,
    opportunities_count: analysis.opportunities.length,
    wasted_spend: analysis.wastedSpend,
    winners: analysis.winners.slice(0, 50),
    losers: analysis.losers.slice(0, 50),
    created_at: new Date().toISOString()
  }, {
    onConflict: 'business_slug,analysis_date'
  });

  console.log('✅ Analysis complete and saved');
}

main().catch(console.error);
