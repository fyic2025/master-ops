#!/usr/bin/env npx tsx

/**
 * Keyword Ranking Tracker
 *
 * Track position changes for keywords over time.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RankingChange {
  url: string;
  keyword?: string;
  current_position: number;
  previous_position: number;
  position_change: number;
  current_clicks: number;
  previous_clicks: number;
  direction: 'up' | 'down' | 'stable';
}

async function getTopPages(business: string, days: number = 30): Promise<RankingChange[]> {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const midDate = new Date(Date.now() - (days / 2) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Get current period stats
  const { data: current } = await supabase
    .from('gsc_page_daily_stats')
    .select('url, avg_position, clicks')
    .eq('business', business)
    .gte('stat_date', midDate)
    .lte('stat_date', endDate);

  // Get previous period stats
  const { data: previous } = await supabase
    .from('gsc_page_daily_stats')
    .select('url, avg_position, clicks')
    .eq('business', business)
    .gte('stat_date', startDate)
    .lt('stat_date', midDate);

  // Aggregate by URL
  const currentByUrl: Record<string, { position: number; clicks: number; count: number }> = {};
  const previousByUrl: Record<string, { position: number; clicks: number; count: number }> = {};

  for (const row of current || []) {
    if (!currentByUrl[row.url]) {
      currentByUrl[row.url] = { position: 0, clicks: 0, count: 0 };
    }
    currentByUrl[row.url].position += row.avg_position || 0;
    currentByUrl[row.url].clicks += row.clicks || 0;
    currentByUrl[row.url].count++;
  }

  for (const row of previous || []) {
    if (!previousByUrl[row.url]) {
      previousByUrl[row.url] = { position: 0, clicks: 0, count: 0 };
    }
    previousByUrl[row.url].position += row.avg_position || 0;
    previousByUrl[row.url].clicks += row.clicks || 0;
    previousByUrl[row.url].count++;
  }

  // Calculate changes
  const changes: RankingChange[] = [];

  for (const [url, curr] of Object.entries(currentByUrl)) {
    const prev = previousByUrl[url];
    if (!prev) continue;

    const currentPos = curr.position / curr.count;
    const previousPos = prev.position / prev.count;
    const posChange = previousPos - currentPos; // Positive = improved ranking

    changes.push({
      url,
      current_position: parseFloat(currentPos.toFixed(1)),
      previous_position: parseFloat(previousPos.toFixed(1)),
      position_change: parseFloat(posChange.toFixed(1)),
      current_clicks: curr.clicks,
      previous_clicks: prev.clicks,
      direction: posChange > 0.5 ? 'up' : posChange < -0.5 ? 'down' : 'stable'
    });
  }

  // Sort by absolute position change
  changes.sort((a, b) => Math.abs(b.position_change) - Math.abs(a.position_change));

  return changes;
}

async function getKeywordRankings(business: string, keywords: string[]): Promise<RankingChange[]> {
  const results: RankingChange[] = [];

  for (const keyword of keywords) {
    // Search for URLs containing keyword or ranking for it
    const { data } = await supabase
      .from('gsc_page_daily_stats')
      .select('url, avg_position, clicks, stat_date')
      .eq('business', business)
      .ilike('url', `%${keyword.replace(/\s+/g, '-')}%`)
      .order('stat_date', { ascending: false })
      .limit(60);

    if (data && data.length > 0) {
      // Get first half (recent) and second half (older)
      const mid = Math.floor(data.length / 2);
      const recent = data.slice(0, mid);
      const older = data.slice(mid);

      const recentAvg = recent.reduce((sum, r) => sum + (r.avg_position || 0), 0) / recent.length;
      const olderAvg = older.reduce((sum, r) => sum + (r.avg_position || 0), 0) / older.length;
      const change = olderAvg - recentAvg;

      results.push({
        url: data[0].url,
        keyword,
        current_position: parseFloat(recentAvg.toFixed(1)),
        previous_position: parseFloat(olderAvg.toFixed(1)),
        position_change: parseFloat(change.toFixed(1)),
        current_clicks: recent.reduce((sum, r) => sum + (r.clicks || 0), 0),
        previous_clicks: older.reduce((sum, r) => sum + (r.clicks || 0), 0),
        direction: change > 0.5 ? 'up' : change < -0.5 ? 'down' : 'stable'
      });
    }
  }

  return results;
}

function printResults(changes: RankingChange[], title: string): void {
  console.log(`\n${title}`);
  console.log('='.repeat(80));

  // Winners (position improved)
  const winners = changes.filter(c => c.direction === 'up').slice(0, 10);
  if (winners.length > 0) {
    console.log('\n🟢 IMPROVED RANKINGS');
    for (const w of winners) {
      const keyword = w.keyword ? ` [${w.keyword}]` : '';
      console.log(`   ↑${w.position_change.toFixed(1)} pos: ${w.url.substring(0, 60)}${keyword}`);
      console.log(`      ${w.previous_position} → ${w.current_position} | Clicks: ${w.previous_clicks} → ${w.current_clicks}`);
    }
  }

  // Losers (position dropped)
  const losers = changes.filter(c => c.direction === 'down').slice(0, 10);
  if (losers.length > 0) {
    console.log('\n🔴 DROPPED RANKINGS');
    for (const l of losers) {
      const keyword = l.keyword ? ` [${l.keyword}]` : '';
      console.log(`   ↓${Math.abs(l.position_change).toFixed(1)} pos: ${l.url.substring(0, 60)}${keyword}`);
      console.log(`      ${l.previous_position} → ${l.current_position} | Clicks: ${l.previous_clicks} → ${l.current_clicks}`);
    }
  }

  // Stable
  const stable = changes.filter(c => c.direction === 'stable').length;
  console.log(`\n🟡 STABLE: ${stable} pages with minimal change`);

  // Summary
  console.log('\n📊 SUMMARY');
  console.log(`   Total pages tracked: ${changes.length}`);
  console.log(`   Improved: ${winners.length}`);
  console.log(`   Dropped: ${losers.length}`);
  console.log(`   Stable: ${stable}`);
}

async function main() {
  const args = process.argv.slice(2);
  const businessArg = args.find(a => a.startsWith('--business='))?.split('=')[1] || 'boo';
  const daysArg = parseInt(args.find(a => a.startsWith('--days='))?.split('=')[1] || '30');
  const keywordsArg = args.find(a => a.startsWith('--keywords='))?.split('=')[1];

  console.log('Keyword Ranking Tracker');
  console.log('=======================');
  console.log(`Business: ${businessArg}`);
  console.log(`Period: ${daysArg} days`);

  if (keywordsArg) {
    const keywords = keywordsArg.split(',').map(k => k.trim());
    console.log(`Tracking keywords: ${keywords.join(', ')}`);

    const results = await getKeywordRankings(businessArg, keywords);
    printResults(results, `Keyword Rankings for ${businessArg.toUpperCase()}`);
  } else {
    const changes = await getTopPages(businessArg, daysArg);
    printResults(changes, `Top Page Ranking Changes for ${businessArg.toUpperCase()}`);
  }
}

main().catch(console.error);
