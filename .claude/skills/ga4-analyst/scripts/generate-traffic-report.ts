#!/usr/bin/env npx tsx

/**
 * Generate Traffic Report
 *
 * Generate traffic and performance reports from GA4 data.
 *
 * Usage:
 *   npx tsx generate-traffic-report.ts --weekly
 *   npx tsx generate-traffic-report.ts --monthly --business teelixir
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const config = {
  supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
}

interface TrafficSummary {
  business: string
  period: string
  sessions: number
  users: number
  newUsers: number
  engagementRate: number
  transactions: number
  revenue: number
  conversionRate: number
  avgOrderValue: number
}

function getSupabase() {
  if (!config.supabaseUrl || !config.supabaseKey) {
    throw new Error('Supabase not configured')
  }
  return createClient(config.supabaseUrl, config.supabaseKey)
}

function formatNumber(num: number): string {
  return num.toLocaleString()
}

function formatCurrency(num: number): string {
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatPercent(num: number): string {
  return `${(num * 100).toFixed(2)}%`
}

function getChangeEmoji(change: number): string {
  if (change > 5) return '📈'
  if (change < -5) return '📉'
  return '➡️'
}

// Get traffic summary for a period
async function getTrafficSummary(
  supabase: any,
  business: string | null,
  startDate: string,
  endDate: string
): Promise<TrafficSummary[]> {
  let query = supabase
    .from('ga4_daily_metrics')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)

  if (business) {
    query = query.eq('business', business)
  }

  const { data, error } = await query

  if (error) throw error

  // Aggregate by business
  const aggregated: Record<string, any> = {}
  for (const row of data || []) {
    if (!aggregated[row.business]) {
      aggregated[row.business] = {
        business: row.business,
        sessions: 0,
        users: 0,
        newUsers: 0,
        engagedSessions: 0,
        transactions: 0,
        revenue: 0
      }
    }
    aggregated[row.business].sessions += row.sessions || 0
    aggregated[row.business].users += row.users || 0
    aggregated[row.business].newUsers += row.new_users || 0
    aggregated[row.business].engagedSessions += row.engaged_sessions || 0
    aggregated[row.business].transactions += row.transactions || 0
    aggregated[row.business].revenue += parseFloat(row.revenue || 0)
  }

  return Object.values(aggregated).map((a: any) => ({
    business: a.business,
    period: `${startDate} to ${endDate}`,
    sessions: a.sessions,
    users: a.users,
    newUsers: a.newUsers,
    engagementRate: a.sessions > 0 ? a.engagedSessions / a.sessions : 0,
    transactions: a.transactions,
    revenue: a.revenue,
    conversionRate: a.sessions > 0 ? a.transactions / a.sessions : 0,
    avgOrderValue: a.transactions > 0 ? a.revenue / a.transactions : 0
  }))
}

// Get top traffic sources
async function getTopSources(
  supabase: any,
  business: string | null,
  startDate: string,
  endDate: string
): Promise<any[]> {
  let query = supabase
    .from('ga4_traffic_sources')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)

  if (business) {
    query = query.eq('business', business)
  }

  const { data, error } = await query

  if (error) throw error

  // Aggregate by source/medium
  const aggregated: Record<string, any> = {}
  for (const row of data || []) {
    const key = `${row.business}|${row.source}/${row.medium}`
    if (!aggregated[key]) {
      aggregated[key] = {
        business: row.business,
        source: row.source,
        medium: row.medium,
        sessions: 0,
        users: 0,
        transactions: 0,
        revenue: 0
      }
    }
    aggregated[key].sessions += row.sessions || 0
    aggregated[key].users += row.users || 0
    aggregated[key].transactions += row.transactions || 0
    aggregated[key].revenue += parseFloat(row.revenue || 0)
  }

  return Object.values(aggregated)
    .sort((a: any, b: any) => b.sessions - a.sessions)
    .slice(0, 10)
}

// Calculate period comparison
async function comparePeriods(
  supabase: any,
  business: string | null,
  currentStart: string,
  currentEnd: string,
  previousStart: string,
  previousEnd: string
): Promise<any[]> {
  const current = await getTrafficSummary(supabase, business, currentStart, currentEnd)
  const previous = await getTrafficSummary(supabase, business, previousStart, previousEnd)

  return current.map(c => {
    const p = previous.find(p => p.business === c.business) || {
      sessions: 0, users: 0, transactions: 0, revenue: 0
    }

    return {
      business: c.business,
      current: c,
      previous: p,
      changes: {
        sessions: p.sessions > 0 ? ((c.sessions - p.sessions) / p.sessions) * 100 : 0,
        users: p.users > 0 ? ((c.users - p.users) / p.users) * 100 : 0,
        transactions: p.transactions > 0 ? ((c.transactions - p.transactions) / p.transactions) * 100 : 0,
        revenue: p.revenue > 0 ? ((c.revenue - p.revenue) / p.revenue) * 100 : 0
      }
    }
  })
}

// Print summary report
function printSummaryReport(summaries: TrafficSummary[]): void {
  console.log('\n📊 TRAFFIC SUMMARY')
  console.log('='.repeat(80))

  for (const s of summaries) {
    console.log(`\n${s.business.toUpperCase()}`)
    console.log('-'.repeat(40))
    console.log(`Sessions:        ${formatNumber(s.sessions)}`)
    console.log(`Users:           ${formatNumber(s.users)}`)
    console.log(`New Users:       ${formatNumber(s.newUsers)} (${formatPercent(s.users > 0 ? s.newUsers / s.users : 0)})`)
    console.log(`Engagement Rate: ${formatPercent(s.engagementRate)}`)
    console.log(`Transactions:    ${formatNumber(s.transactions)}`)
    console.log(`Revenue:         ${formatCurrency(s.revenue)}`)
    console.log(`Conversion Rate: ${formatPercent(s.conversionRate)}`)
    console.log(`Avg Order Value: ${formatCurrency(s.avgOrderValue)}`)
  }
}

// Print comparison report
function printComparisonReport(comparisons: any[]): void {
  console.log('\n📈 PERIOD COMPARISON')
  console.log('='.repeat(80))

  for (const c of comparisons) {
    console.log(`\n${c.business.toUpperCase()}`)
    console.log('-'.repeat(60))

    console.log(`                   Current      Previous     Change`)
    console.log(`Sessions:     ${formatNumber(c.current.sessions).padStart(12)} ${formatNumber(c.previous.sessions).padStart(12)}  ${getChangeEmoji(c.changes.sessions)} ${c.changes.sessions.toFixed(1)}%`)
    console.log(`Users:        ${formatNumber(c.current.users).padStart(12)} ${formatNumber(c.previous.users).padStart(12)}  ${getChangeEmoji(c.changes.users)} ${c.changes.users.toFixed(1)}%`)
    console.log(`Transactions: ${formatNumber(c.current.transactions).padStart(12)} ${formatNumber(c.previous.transactions).padStart(12)}  ${getChangeEmoji(c.changes.transactions)} ${c.changes.transactions.toFixed(1)}%`)
    console.log(`Revenue:      ${formatCurrency(c.current.revenue).padStart(12)} ${formatCurrency(c.previous.revenue).padStart(12)}  ${getChangeEmoji(c.changes.revenue)} ${c.changes.revenue.toFixed(1)}%`)
  }
}

// Print sources report
function printSourcesReport(sources: any[]): void {
  console.log('\n🔗 TOP TRAFFIC SOURCES')
  console.log('='.repeat(80))
  console.log(`${'Source/Medium'.padEnd(35)} ${'Sessions'.padStart(10)} ${'Users'.padStart(10)} ${'Trans'.padStart(8)} ${'Revenue'.padStart(12)}`)
  console.log('-'.repeat(80))

  for (const s of sources) {
    const sourceMedium = `${s.source}/${s.medium}`
    const truncated = sourceMedium.length > 33 ? sourceMedium.slice(0, 30) + '...' : sourceMedium
    console.log(
      `${truncated.padEnd(35)} ${formatNumber(s.sessions).padStart(10)} ${formatNumber(s.users).padStart(10)} ${formatNumber(s.transactions).padStart(8)} ${formatCurrency(s.revenue).padStart(12)}`
    )
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--help')) {
    console.log(`
Traffic Report Generator

Usage:
  npx tsx generate-traffic-report.ts [options]

Options:
  --weekly              Generate weekly report (last 7 days vs previous 7)
  --monthly             Generate monthly report (last 30 days vs previous 30)
  --business <name>     Filter by business (boo, teelixir, elevate, rhf)
  --help                Show this help message

Examples:
  npx tsx generate-traffic-report.ts --weekly
  npx tsx generate-traffic-report.ts --monthly --business teelixir
    `)
    process.exit(0)
  }

  const supabase = getSupabase()

  // Parse arguments
  const businessIdx = args.indexOf('--business')
  const business = businessIdx !== -1 ? args[businessIdx + 1] : null
  const isWeekly = args.includes('--weekly')
  const isMonthly = args.includes('--monthly')

  // Calculate date ranges
  const now = new Date()
  let currentStart: string
  let currentEnd: string
  let previousStart: string
  let previousEnd: string
  let periodName: string

  if (isMonthly) {
    const endDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
    const prevEndDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000)
    const prevStartDate = new Date(prevEndDate.getTime() - 30 * 24 * 60 * 60 * 1000)

    currentStart = startDate.toISOString().split('T')[0]
    currentEnd = endDate.toISOString().split('T')[0]
    previousStart = prevStartDate.toISOString().split('T')[0]
    previousEnd = prevEndDate.toISOString().split('T')[0]
    periodName = 'Monthly'
  } else {
    // Default to weekly
    const endDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)
    const prevEndDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000)
    const prevStartDate = new Date(prevEndDate.getTime() - 7 * 24 * 60 * 60 * 1000)

    currentStart = startDate.toISOString().split('T')[0]
    currentEnd = endDate.toISOString().split('T')[0]
    previousStart = prevStartDate.toISOString().split('T')[0]
    previousEnd = prevEndDate.toISOString().split('T')[0]
    periodName = 'Weekly'
  }

  console.log(`📊 ${periodName} Traffic Report`)
  console.log('='.repeat(50))
  console.log(`Current period:  ${currentStart} to ${currentEnd}`)
  console.log(`Previous period: ${previousStart} to ${previousEnd}`)
  if (business) console.log(`Business: ${business}`)

  try {
    // Get summaries
    const summaries = await getTrafficSummary(supabase, business, currentStart, currentEnd)
    printSummaryReport(summaries)

    // Get comparisons
    const comparisons = await comparePeriods(
      supabase, business,
      currentStart, currentEnd,
      previousStart, previousEnd
    )
    printComparisonReport(comparisons)

    // Get top sources
    const sources = await getTopSources(supabase, business, currentStart, currentEnd)
    printSourcesReport(sources)

    // Overall summary
    console.log('\n📌 KEY INSIGHTS')
    console.log('='.repeat(50))

    for (const c of comparisons) {
      const insights: string[] = []

      if (c.changes.revenue > 10) {
        insights.push(`✅ Revenue up ${c.changes.revenue.toFixed(1)}%`)
      } else if (c.changes.revenue < -10) {
        insights.push(`⚠️ Revenue down ${Math.abs(c.changes.revenue).toFixed(1)}%`)
      }

      if (c.changes.sessions > 10) {
        insights.push(`✅ Traffic up ${c.changes.sessions.toFixed(1)}%`)
      } else if (c.changes.sessions < -10) {
        insights.push(`⚠️ Traffic down ${Math.abs(c.changes.sessions).toFixed(1)}%`)
      }

      const currentCvr = c.current.conversionRate * 100
      const previousCvr = c.previous.sessions > 0 ? (c.previous.transactions / c.previous.sessions) * 100 : 0
      if (currentCvr > previousCvr + 0.5) {
        insights.push(`✅ Conversion rate improved to ${currentCvr.toFixed(2)}%`)
      } else if (currentCvr < previousCvr - 0.5) {
        insights.push(`⚠️ Conversion rate dropped to ${currentCvr.toFixed(2)}%`)
      }

      console.log(`\n${c.business.toUpperCase()}:`)
      if (insights.length > 0) {
        insights.forEach(i => console.log(`  ${i}`))
      } else {
        console.log('  ➡️ Performance stable')
      }
    }

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : error}`)
    process.exit(1)
  }

  console.log('\n✅ Report complete!')
}

main()
