#!/usr/bin/env npx tsx

/**
 * Content Opportunities Finder
 *
 * Identify content gaps and optimization opportunities.
 * Integrates with BOO SEO tables.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const masterSupabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const booSupabase = createClient(
  process.env.BOO_SUPABASE_URL!,
  process.env.BOO_SUPABASE_SERVICE_ROLE_KEY!
);

interface ContentOpportunity {
  type: 'product' | 'category' | 'keyword';
  id: string;
  name: string;
  url?: string;
  impressions: number;
  clicks: number;
  position?: number;
  issue: string;
  priority: 'high' | 'medium' | 'low';
  recommendation: string;
  potential_impact: string;
}

async function getProductContentGaps(): Promise<ContentOpportunity[]> {
  // Products with traffic but poor content
  const { data: products } = await booSupabase
    .from('seo_products')
    .select(`
      ecommerce_product_id,
      bc_product_id,
      impressions_30d,
      clicks_30d,
      avg_position,
      content_status,
      seo_status,
      has_description,
      description_word_count
    `)
    .gt('impressions_30d', 50)
    .in('content_status', ['no_description', 'needs_format'])
    .order('impressions_30d', { ascending: false })
    .limit(50);

  // Get product names
  const { data: productInfo } = await booSupabase
    .from('ecommerce_products')
    .select('id, name, url')
    .in('id', (products || []).map(p => p.ecommerce_product_id));

  const productMap = new Map(productInfo?.map(p => [p.id, p]) || []);

  return (products || []).map(p => {
    const info = productMap.get(p.ecommerce_product_id);
    const priority = p.impressions_30d > 500 ? 'high' : p.impressions_30d > 200 ? 'medium' : 'low';

    let issue = '';
    let recommendation = '';

    if (!p.has_description) {
      issue = 'No product description';
      recommendation = 'Add unique product description (150+ words)';
    } else if (p.description_word_count < 100) {
      issue = `Short description (${p.description_word_count} words)`;
      recommendation = 'Expand description to 150+ words with benefits and features';
    } else {
      issue = 'Content needs formatting';
      recommendation = 'Restructure with headers, bullets, and clear sections';
    }

    return {
      type: 'product' as const,
      id: p.bc_product_id?.toString() || p.ecommerce_product_id,
      name: info?.name || 'Unknown Product',
      url: info?.url,
      impressions: p.impressions_30d || 0,
      clicks: p.clicks_30d || 0,
      position: p.avg_position,
      issue,
      priority,
      recommendation,
      potential_impact: `${Math.round((p.impressions_30d || 0) * 0.02)} potential additional clicks/month`
    };
  });
}

async function getCategoryContentGaps(): Promise<ContentOpportunity[]> {
  const { data: categories } = await booSupabase
    .from('seo_categories')
    .select('*')
    .or('status.eq.empty,status.eq.sparse')
    .order('impressions_30d', { ascending: false })
    .limit(30);

  return (categories || []).map(c => {
    const priority = (c.impressions_30d || 0) > 1000 ? 'high' : (c.impressions_30d || 0) > 300 ? 'medium' : 'low';

    let issue = '';
    let recommendation = '';

    if (c.status === 'empty') {
      issue = 'No category description';
      recommendation = 'Add category description with target keyword, benefits, and product overview';
    } else if (c.status === 'sparse') {
      issue = 'Category description too short';
      recommendation = 'Expand to 200+ words with buying guides and product highlights';
    }

    return {
      type: 'category' as const,
      id: c.bc_category_id?.toString() || c.id,
      name: c.name || 'Unknown Category',
      url: c.url,
      impressions: c.impressions_30d || 0,
      clicks: c.clicks_30d || 0,
      position: c.current_position,
      issue,
      priority,
      recommendation,
      potential_impact: `${Math.round((c.impressions_30d || 0) * 0.03)} potential additional clicks/month`
    };
  });
}

async function getKeywordOpportunities(): Promise<ContentOpportunity[]> {
  // High-volume keywords without dedicated content
  const { data: keywords } = await booSupabase
    .from('seo_keywords')
    .select('*')
    .gt('search_volume', 200)
    .gt('opportunity_score', 50)
    .order('opportunity_score', { ascending: false })
    .limit(30);

  return (keywords || []).map(k => {
    const priority = (k.search_volume || 0) > 1000 ? 'high' : (k.search_volume || 0) > 500 ? 'medium' : 'low';

    return {
      type: 'keyword' as const,
      id: k.id,
      name: k.keyword || 'Unknown Keyword',
      impressions: k.search_volume || 0,
      clicks: 0,
      issue: 'No dedicated content for keyword',
      priority,
      recommendation: `Create content targeting "${k.keyword}" (${k.intent} intent)`,
      potential_impact: `${Math.round((k.search_volume || 0) * 0.05)} potential clicks/month if ranking #3`
    };
  });
}

async function getTrafficWithPoorRankings(): Promise<ContentOpportunity[]> {
  // Pages with impressions but poor position (positions 11-30)
  const { data: pages } = await masterSupabase
    .from('gsc_page_daily_stats')
    .select('url, avg_position, impressions, clicks')
    .eq('business', 'boo')
    .gte('stat_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .gt('impressions', 100)
    .gt('avg_position', 10)
    .lte('avg_position', 30)
    .order('impressions', { ascending: false })
    .limit(30);

  // Aggregate by URL
  const urlStats: Record<string, { impressions: number; clicks: number; positions: number[] }> = {};
  for (const p of pages || []) {
    if (!urlStats[p.url]) {
      urlStats[p.url] = { impressions: 0, clicks: 0, positions: [] };
    }
    urlStats[p.url].impressions += p.impressions || 0;
    urlStats[p.url].clicks += p.clicks || 0;
    urlStats[p.url].positions.push(p.avg_position || 0);
  }

  return Object.entries(urlStats)
    .map(([url, stats]) => {
      const avgPosition = stats.positions.reduce((a, b) => a + b, 0) / stats.positions.length;
      const priority = stats.impressions > 500 ? 'high' : stats.impressions > 200 ? 'medium' : 'low';

      return {
        type: 'product' as const,
        id: url,
        name: url.split('/').pop()?.replace(/-/g, ' ') || url,
        url,
        impressions: stats.impressions,
        clicks: stats.clicks,
        position: parseFloat(avgPosition.toFixed(1)),
        issue: `Ranking position ${avgPosition.toFixed(0)} - just outside page 1`,
        priority,
        recommendation: 'Improve content quality, add internal links, build backlinks',
        potential_impact: `Moving to position 5 could yield ${Math.round(stats.impressions * 0.08)} additional clicks/month`
      };
    })
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 20);
}

function printOpportunities(opportunities: ContentOpportunity[], title: string): void {
  console.log(`\n${title}`);
  console.log('='.repeat(70));

  const high = opportunities.filter(o => o.priority === 'high');
  const medium = opportunities.filter(o => o.priority === 'medium');
  const low = opportunities.filter(o => o.priority === 'low');

  if (high.length > 0) {
    console.log('\n🔴 HIGH PRIORITY');
    for (const o of high.slice(0, 10)) {
      console.log(`\n   ${o.name}`);
      if (o.url) console.log(`   URL: ${o.url.substring(0, 60)}`);
      console.log(`   Issue: ${o.issue}`);
      console.log(`   Impressions: ${o.impressions.toLocaleString()} | Position: ${o.position || 'N/A'}`);
      console.log(`   Recommendation: ${o.recommendation}`);
      console.log(`   Potential: ${o.potential_impact}`);
    }
  }

  if (medium.length > 0) {
    console.log('\n🟡 MEDIUM PRIORITY');
    for (const o of medium.slice(0, 5)) {
      console.log(`\n   ${o.name}`);
      console.log(`   Issue: ${o.issue}`);
      console.log(`   Impressions: ${o.impressions.toLocaleString()}`);
      console.log(`   Recommendation: ${o.recommendation}`);
    }
  }

  console.log(`\n📊 Summary: ${high.length} high, ${medium.length} medium, ${low.length} low priority opportunities`);
}

async function main() {
  const args = process.argv.slice(2);
  const businessArg = args.find(a => a.startsWith('--business='))?.split('=')[1] || 'boo';
  const topArg = parseInt(args.find(a => a.startsWith('--top='))?.split('=')[1] || '20');
  const typeArg = args.find(a => a.startsWith('--type='))?.split('=')[1];

  console.log('Content Opportunities Finder');
  console.log('============================');
  console.log(`Business: ${businessArg}`);

  if (businessArg !== 'boo') {
    console.log('\n⚠️ Content tracking is currently only available for BOO.');
    console.log('SEO tables exist in BOO Supabase only.');
    return;
  }

  const allOpportunities: ContentOpportunity[] = [];

  if (!typeArg || typeArg === 'product') {
    console.log('\nFetching product content gaps...');
    const products = await getProductContentGaps();
    if (products.length > 0) {
      printOpportunities(products, 'PRODUCT CONTENT GAPS');
      allOpportunities.push(...products);
    }
  }

  if (!typeArg || typeArg === 'category') {
    console.log('\nFetching category content gaps...');
    const categories = await getCategoryContentGaps();
    if (categories.length > 0) {
      printOpportunities(categories, 'CATEGORY CONTENT GAPS');
      allOpportunities.push(...categories);
    }
  }

  if (!typeArg || typeArg === 'keyword') {
    console.log('\nFetching keyword opportunities...');
    const keywords = await getKeywordOpportunities();
    if (keywords.length > 0) {
      printOpportunities(keywords, 'KEYWORD OPPORTUNITIES');
      allOpportunities.push(...keywords);
    }
  }

  if (!typeArg || typeArg === 'ranking') {
    console.log('\nFetching pages with poor rankings...');
    const rankings = await getTrafficWithPoorRankings();
    if (rankings.length > 0) {
      printOpportunities(rankings, 'PAGES JUST OUTSIDE PAGE 1');
      allOpportunities.push(...rankings);
    }
  }

  // Overall summary
  console.log('\n' + '='.repeat(70));
  console.log('OVERALL SUMMARY');
  console.log('='.repeat(70));

  const totalHigh = allOpportunities.filter(o => o.priority === 'high').length;
  const totalMedium = allOpportunities.filter(o => o.priority === 'medium').length;

  console.log(`\nTotal Opportunities Found: ${allOpportunities.length}`);
  console.log(`High Priority: ${totalHigh}`);
  console.log(`Medium Priority: ${totalMedium}`);

  const totalPotentialClicks = allOpportunities
    .slice(0, topArg)
    .reduce((sum, o) => {
      const match = o.potential_impact.match(/(\d+)/);
      return sum + (match ? parseInt(match[1]) : 0);
    }, 0);

  console.log(`\nEstimated potential clicks from top ${topArg} opportunities: ${totalPotentialClicks.toLocaleString()}/month`);

  console.log('\n💡 Next Steps:');
  console.log('   1. Start with high-priority product content gaps');
  console.log('   2. Use SEO agents for automated content generation');
  console.log('   3. Run: node agents/seo-team/agents/coordinator.js');
}

main().catch(console.error);
