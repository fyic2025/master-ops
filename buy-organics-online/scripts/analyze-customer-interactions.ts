#!/usr/bin/env npx tsx
/**
 * Customer Interactions Analytics Script
 *
 * Analyzes LiveChat and Email data to identify:
 * - Top customer issues/queries
 * - Response time patterns
 * - Sentiment trends
 * - Automation opportunities
 *
 * Usage:
 *   npx tsx analyze-customer-interactions.ts
 *   npx tsx analyze-customer-interactions.ts --days 30
 *   npx tsx analyze-customer-interactions.ts --export  # Export to CSV
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: 'buy-organics-online/BOO-CREDENTIALS.env' });
dotenv.config({ path: 'MASTER-CREDENTIALS-COMPLETE.env' });

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  supabase: {
    url: process.env.BOO_SUPABASE_URL || process.env.SUPABASE_URL || '',
    serviceKey: process.env.BOO_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  analysis: {
    defaultDays: 30,
    topN: 20,
  }
};

// ============================================================================
// ANALYTICS CLASS
// ============================================================================

class CustomerAnalytics {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async runFullAnalysis(days: number): Promise<void> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString();

    console.log('═'.repeat(70));
    console.log('📊 Customer Interactions Analysis');
    console.log(`📅 Period: Last ${days} days (since ${since.toISOString().split('T')[0]})`);
    console.log('═'.repeat(70));

    // Run all analyses
    await this.overviewStats(sinceStr);
    await this.topIssueCategories(sinceStr);
    await this.topKeywords(sinceStr);
    await this.responseTimeAnalysis(sinceStr);
    await this.sentimentBreakdown(sinceStr);
    await this.dailyVolume(sinceStr);
    await this.unansweredInteractions();
    await this.automationOpportunities(sinceStr);
  }

  private async overviewStats(since: string): Promise<void> {
    console.log('\n📈 OVERVIEW STATISTICS');
    console.log('─'.repeat(50));

    const { data, count } = await this.supabase
      .from('customer_interactions')
      .select('*', { count: 'exact', head: true })
      .gte('started_at', since);

    const { data: bySource } = await this.supabase
      .from('customer_interactions')
      .select('source')
      .gte('started_at', since);

    const livechatCount = bySource?.filter(r => r.source === 'livechat').length || 0;
    const emailCount = bySource?.filter(r => r.source === 'email').length || 0;

    const { data: statusData } = await this.supabase
      .from('customer_interactions')
      .select('status')
      .gte('started_at', since);

    const openCount = statusData?.filter(r => r.status === 'open').length || 0;
    const resolvedCount = statusData?.filter(r => r.status === 'resolved').length || 0;

    console.log(`Total interactions: ${count || 0}`);
    console.log(`  └─ LiveChat: ${livechatCount}`);
    console.log(`  └─ Email: ${emailCount}`);
    console.log(`Status:`);
    console.log(`  └─ Open: ${openCount}`);
    console.log(`  └─ Resolved: ${resolvedCount}`);
    console.log(`  └─ Resolution rate: ${count ? ((resolvedCount / count) * 100).toFixed(1) : 0}%`);
  }

  private async topIssueCategories(since: string): Promise<void> {
    console.log('\n🏷️  TOP ISSUE CATEGORIES');
    console.log('─'.repeat(50));

    const { data } = await this.supabase
      .from('customer_interactions')
      .select('category')
      .gte('started_at', since)
      .not('category', 'is', null);

    if (!data || data.length === 0) {
      console.log('No categorized interactions yet.');
      console.log('Run categorization after syncing data.');
      return;
    }

    // Count categories
    const counts: Record<string, number> = {};
    data.forEach(row => {
      counts[row.category] = (counts[row.category] || 0) + 1;
    });

    // Sort and display
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    sorted.slice(0, 10).forEach(([category, count], i) => {
      const bar = '█'.repeat(Math.ceil((count / sorted[0][1]) * 20));
      console.log(`${(i + 1).toString().padStart(2)}. ${category.padEnd(20)} ${count.toString().padStart(4)} ${bar}`);
    });
  }

  private async topKeywords(since: string): Promise<void> {
    console.log('\n🔍 TOP KEYWORDS IN SUBJECTS');
    console.log('─'.repeat(50));

    const { data } = await this.supabase
      .from('customer_interactions')
      .select('subject')
      .gte('started_at', since);

    if (!data || data.length === 0) {
      console.log('No interactions to analyze.');
      return;
    }

    // Common stop words to ignore
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'is', 'it', 'this', 'that', 'i', 'you',
      'my', 'your', 'we', 'our', 'hi', 'hello', 're', 'fwd', 'fw'
    ]);

    // Extract and count words
    const wordCounts: Record<string, number> = {};
    data.forEach(row => {
      if (!row.subject) return;
      const words = row.subject.toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w: string) => w.length > 2 && !stopWords.has(w));

      words.forEach((word: string) => {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      });
    });

    // Sort and display
    const sorted = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]);
    sorted.slice(0, 15).forEach(([word, count], i) => {
      const bar = '█'.repeat(Math.ceil((count / sorted[0][1]) * 15));
      console.log(`${(i + 1).toString().padStart(2)}. ${word.padEnd(20)} ${count.toString().padStart(4)} ${bar}`);
    });
  }

  private async responseTimeAnalysis(since: string): Promise<void> {
    console.log('\n⏱️  RESPONSE TIME ANALYSIS');
    console.log('─'.repeat(50));

    const { data } = await this.supabase
      .from('customer_interactions')
      .select('response_time_seconds, source')
      .gte('started_at', since)
      .not('response_time_seconds', 'is', null);

    if (!data || data.length === 0) {
      console.log('No response time data available.');
      return;
    }

    const times = data.map(r => r.response_time_seconds);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const median = times.sort((a, b) => a - b)[Math.floor(times.length / 2)];
    const max = Math.max(...times);
    const min = Math.min(...times);

    console.log(`Interactions with response time: ${data.length}`);
    console.log(`Average response time: ${this.formatTime(avg)}`);
    console.log(`Median response time: ${this.formatTime(median)}`);
    console.log(`Fastest response: ${this.formatTime(min)}`);
    console.log(`Slowest response: ${this.formatTime(max)}`);

    // Response time distribution
    console.log('\nDistribution:');
    const under1min = times.filter(t => t < 60).length;
    const under5min = times.filter(t => t >= 60 && t < 300).length;
    const under30min = times.filter(t => t >= 300 && t < 1800).length;
    const under1hour = times.filter(t => t >= 1800 && t < 3600).length;
    const over1hour = times.filter(t => t >= 3600).length;

    console.log(`  < 1 min:     ${under1min.toString().padStart(4)} (${((under1min / times.length) * 100).toFixed(1)}%)`);
    console.log(`  1-5 min:     ${under5min.toString().padStart(4)} (${((under5min / times.length) * 100).toFixed(1)}%)`);
    console.log(`  5-30 min:    ${under30min.toString().padStart(4)} (${((under30min / times.length) * 100).toFixed(1)}%)`);
    console.log(`  30min-1hr:   ${under1hour.toString().padStart(4)} (${((under1hour / times.length) * 100).toFixed(1)}%)`);
    console.log(`  > 1 hour:    ${over1hour.toString().padStart(4)} (${((over1hour / times.length) * 100).toFixed(1)}%)`);
  }

  private async sentimentBreakdown(since: string): Promise<void> {
    console.log('\n😊 SENTIMENT BREAKDOWN');
    console.log('─'.repeat(50));

    const { data } = await this.supabase
      .from('customer_interactions')
      .select('sentiment')
      .gte('started_at', since);

    if (!data || data.length === 0) {
      console.log('No sentiment data available.');
      return;
    }

    const counts: Record<string, number> = {
      positive: 0,
      neutral: 0,
      negative: 0,
      urgent: 0,
      unknown: 0,
    };

    data.forEach(row => {
      if (row.sentiment && counts.hasOwnProperty(row.sentiment)) {
        counts[row.sentiment]++;
      } else {
        counts.unknown++;
      }
    });

    const total = data.length;
    console.log(`Positive:  ${counts.positive.toString().padStart(4)} (${((counts.positive / total) * 100).toFixed(1)}%) 😊`);
    console.log(`Neutral:   ${counts.neutral.toString().padStart(4)} (${((counts.neutral / total) * 100).toFixed(1)}%) 😐`);
    console.log(`Negative:  ${counts.negative.toString().padStart(4)} (${((counts.negative / total) * 100).toFixed(1)}%) 😞`);
    console.log(`Urgent:    ${counts.urgent.toString().padStart(4)} (${((counts.urgent / total) * 100).toFixed(1)}%) 🚨`);
    if (counts.unknown > 0) {
      console.log(`Unknown:   ${counts.unknown.toString().padStart(4)} (${((counts.unknown / total) * 100).toFixed(1)}%) ❓`);
    }
  }

  private async dailyVolume(since: string): Promise<void> {
    console.log('\n📅 DAILY VOLUME (Last 14 days)');
    console.log('─'.repeat(50));

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const { data } = await this.supabase
      .from('customer_interactions')
      .select('started_at, source')
      .gte('started_at', twoWeeksAgo.toISOString());

    if (!data || data.length === 0) {
      console.log('No data for the last 14 days.');
      return;
    }

    // Group by date
    const byDate: Record<string, { livechat: number; email: number }> = {};
    data.forEach(row => {
      const date = row.started_at.split('T')[0];
      if (!byDate[date]) byDate[date] = { livechat: 0, email: 0 };
      if (row.source === 'livechat') byDate[date].livechat++;
      else byDate[date].email++;
    });

    // Display
    const dates = Object.keys(byDate).sort();
    const maxTotal = Math.max(...Object.values(byDate).map(v => v.livechat + v.email));

    dates.forEach(date => {
      const { livechat, email } = byDate[date];
      const total = livechat + email;
      const bar = '█'.repeat(Math.ceil((total / maxTotal) * 20));
      const day = new Date(date).toLocaleDateString('en-AU', { weekday: 'short' });
      console.log(`${date} (${day}): ${total.toString().padStart(3)} ${bar} (LC:${livechat} EM:${email})`);
    });
  }

  private async unansweredInteractions(): Promise<void> {
    console.log('\n⚠️  UNANSWERED/URGENT INTERACTIONS');
    console.log('─'.repeat(50));

    const { data } = await this.supabase
      .from('customer_interactions')
      .select('id, source, customer_name, customer_email, subject, started_at, priority, sentiment')
      .or('status.eq.open,status.eq.pending')
      .order('started_at', { ascending: true })
      .limit(10);

    if (!data || data.length === 0) {
      console.log('✅ No unanswered interactions!');
      return;
    }

    console.log(`Found ${data.length} open interactions:\n`);
    data.forEach((row, i) => {
      const age = this.getAge(new Date(row.started_at));
      const urgent = row.priority === 'urgent' || row.sentiment === 'urgent' ? '🚨' : '';
      console.log(`${(i + 1).toString().padStart(2)}. [${row.source.toUpperCase()}] ${urgent}`);
      console.log(`    From: ${row.customer_name || row.customer_email || 'Unknown'}`);
      console.log(`    Subject: ${(row.subject || 'No subject').substring(0, 50)}`);
      console.log(`    Age: ${age}`);
      console.log('');
    });
  }

  private async automationOpportunities(since: string): Promise<void> {
    console.log('\n🤖 AUTOMATION OPPORTUNITIES');
    console.log('─'.repeat(50));

    const { data } = await this.supabase
      .from('customer_interactions')
      .select('subject, transcript')
      .gte('started_at', since);

    if (!data || data.length === 0) {
      console.log('No data to analyze.');
      return;
    }

    // Common automatable patterns
    const patterns = {
      'Where is my order': /where.*(order|package|delivery|ship)/i,
      'Order tracking': /track(ing)?.*order|order.*track/i,
      'Payment issue': /payment|pay|card.*decline|transaction/i,
      'Stock availability': /stock|available|in.stock|out.of.stock/i,
      'Return/Refund': /return|refund|money.back/i,
      'Delivery time': /how.long|when.*deliver|delivery.time/i,
      'Cancel order': /cancel.*order|order.*cancel/i,
      'Change address': /change.*address|address.*change|wrong.address/i,
    };

    const matches: Record<string, number> = {};
    Object.keys(patterns).forEach(k => matches[k] = 0);

    data.forEach(row => {
      const text = `${row.subject || ''} ${row.transcript || ''}`.toLowerCase();
      Object.entries(patterns).forEach(([name, regex]) => {
        if (regex.test(text)) matches[name]++;
      });
    });

    const sorted = Object.entries(matches)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);

    if (sorted.length === 0) {
      console.log('No clear patterns detected yet. Need more data.');
      return;
    }

    console.log('Queries that could be automated with AI:\n');
    sorted.forEach(([pattern, count]) => {
      const pct = ((count / data.length) * 100).toFixed(1);
      console.log(`  ${pattern.padEnd(25)} ${count.toString().padStart(4)} (${pct}%)`);
    });

    const totalAutomatable = sorted.reduce((sum, [_, count]) => sum + count, 0);
    console.log(`\nTotal automatable: ${totalAutomatable} (${((totalAutomatable / data.length) * 100).toFixed(1)}% of all interactions)`);
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private formatTime(seconds: number): string {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  }

  private getAge(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 1) return `${Math.round(diffHours * 60)} minutes`;
    if (diffHours < 24) return `${Math.round(diffHours)} hours`;
    if (diffHours < 168) return `${Math.round(diffHours / 24)} days`;
    return `${Math.round(diffHours / 168)} weeks`;
  }

  async exportToCsv(days: number, filename: string): Promise<void> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await this.supabase
      .from('customer_interactions')
      .select('*')
      .gte('started_at', since.toISOString())
      .order('started_at', { ascending: false });

    if (error || !data) {
      console.error('Error fetching data:', error?.message);
      return;
    }

    // Convert to CSV
    const headers = [
      'id', 'source', 'customer_email', 'customer_name', 'subject',
      'category', 'status', 'sentiment', 'priority', 'message_count',
      'started_at', 'ended_at', 'response_time_seconds'
    ];

    const rows = data.map(row =>
      headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        if (typeof val === 'string' && val.includes(',')) return `"${val.replace(/"/g, '""')}"`;
        return val;
      }).join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');
    fs.writeFileSync(filename, csv);
    console.log(`\n✅ Exported ${data.length} interactions to ${filename}`);
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  // Validate configuration
  if (!CONFIG.supabase.url || !CONFIG.supabase.serviceKey) {
    console.error('❌ Missing Supabase credentials!');
    console.error('   Set BOO_SUPABASE_URL and BOO_SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Parse arguments
  const args = process.argv.slice(2);
  const daysArg = args.find(a => a.startsWith('--days='));
  const days = daysArg ? parseInt(daysArg.split('=')[1]) : CONFIG.analysis.defaultDays;
  const exportCsv = args.includes('--export');

  // Run analysis
  const analytics = new CustomerAnalytics(
    CONFIG.supabase.url,
    CONFIG.supabase.serviceKey
  );

  await analytics.runFullAnalysis(days);

  if (exportCsv) {
    const filename = `customer-interactions-${new Date().toISOString().split('T')[0]}.csv`;
    await analytics.exportToCsv(days, filename);
  }

  console.log('\n' + '═'.repeat(70));
  console.log('Analysis complete!');
  console.log('═'.repeat(70));
}

main().catch(console.error);
