#!/usr/bin/env npx tsx

/**
 * Analyze Keywords
 *
 * Analyze keyword performance from GSC data.
 * Find opportunities, track rankings, identify trends.
 *
 * Usage:
 *   npx tsx analyze-keywords.ts --top 50
 *   npx tsx analyze-keywords.ts --opportunities
 *   npx tsx analyze-keywords.ts --business teelixir --detailed
 */

import { createClient } from '@supabase/supabase-js'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)

// Load credentials from vault
const creds = require(path.resolve(__dirname, '../../../../creds'))

const config = {
  supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
}

interface KeywordData {
  query: string
  clicks: number
  impressions: number
  ctr: number
  position: number
  topPage?: string
}

interface Opportunity {
  query: string
  impressions: number
  clicks: number
  ctr: number
  position: number
  issue: string
  recommendation: string
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

function formatCtr(ctr: number): string {
  return `${(ctr * 100).toFixed(2)}%`
}

function formatPosition(pos: number): string {
  return pos.toFixed(1)
}

// Get top performing keywords
async function getTopKeywords(
  supabase: any,
  business: string | null,
  limit: number
): Promise<KeywordData[]> {
  let query = supabase
    .from('gsc_search_performance')
    .select('query, clicks, impressions, ctr, position')
    .gte('date', new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

  if (business) {
    query = query.eq('business', business)
  }

  const { data, error } = await query

  if (error) throw error

  // Aggregate by query
  const aggregated: Record<string, KeywordData> = {}
  for (const row of data || []) {
    if (!aggregated[row.query]) {
      aggregated[row.query] = {
        query: row.query,
        clicks: 0,
        impressions: 0,
        ctr: 0,
        position: 0
      }
    }
    aggregated[row.query].clicks += row.clicks
    aggregated[row.query].impressions += row.impressions
  }

  // Calculate averages
  const keywords = Object.values(aggregated)
    .map(k => ({
      ...k,
      ctr: k.impressions > 0 ? k.clicks / k.impressions : 0,
      position: 0 // Would need weighted average
    }))
    .filter(k => k.impressions >= 10)
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, limit)

  return keywords
}

// Find keyword opportunities
async function findOpportunities(
  supabase: any,
  business: string | null
): Promise<Opportunity[]> {
  let query = supabase
    .from('gsc_search_performance')
    .select('query, clicks, impressions, ctr, position')
    .gte('date', new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

  if (business) {
    query = query.eq('business', business)
  }

  const { data, error } = await query

  if (error) throw error

  // Aggregate by query
  const aggregated: Record<string, any> = {}
  for (const row of data || []) {
    if (!aggregated[row.query]) {
      aggregated[row.query] = {
        query: row.query,
        clicks: 0,
        impressions: 0,
        positions: []
      }
    }
    aggregated[row.query].clicks += row.clicks
    aggregated[row.query].impressions += row.impressions
    aggregated[row.query].positions.push(row.position)
  }

  const opportunities: Opportunity[] = []

  for (const k of Object.values(aggregated)) {
    const avgPosition = k.positions.reduce((a: number, b: number) => a + b, 0) / k.positions.length
    const ctr = k.impressions > 0 ? k.clicks / k.impressions : 0

    // Opportunity 1: High impressions, low CTR, good position
    if (k.impressions >= 100 && ctr < 0.02 && avgPosition <= 10) {
      opportunities.push({
        query: k.query,
        impressions: k.impressions,
        clicks: k.clicks,
        ctr,
        position: avgPosition,
        issue: 'Low CTR despite good position',
        recommendation: 'Optimize title and meta description for this query'
      })
    }

    // Opportunity 2: Position 11-20 with good impressions
    if (k.impressions >= 50 && avgPosition > 10 && avgPosition <= 20) {
      opportunities.push({
        query: k.query,
        impressions: k.impressions,
        clicks: k.clicks,
        ctr,
        position: avgPosition,
        issue: 'Close to page 1',
        recommendation: 'Improve content and build links to reach page 1'
      })
    }

    // Opportunity 3: High impressions, very low clicks
    if (k.impressions >= 200 && k.clicks < 5) {
      opportunities.push({
        query: k.query,
        impressions: k.impressions,
        clicks: k.clicks,
        ctr,
        position: avgPosition,
        issue: 'High visibility, no clicks',
        recommendation: 'Check search intent match and snippet quality'
      })
    }
  }

  return opportunities
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 50)
}

// Print top keywords table
function printTopKeywords(keywords: KeywordData[], business: string | null): void {
  console.log(`\n📊 Top Keywords ${business ? `(${business})` : '(All Businesses)'}`)
  console.log('='.repeat(80))
  console.log(`${'Query'.padEnd(40)} ${'Clicks'.padStart(8)} ${'Impr'.padStart(8)} ${'CTR'.padStart(8)} ${'Pos'.padStart(6)}`)
  console.log('-'.repeat(80))

  for (const k of keywords) {
    const query = k.query.length > 38 ? k.query.slice(0, 35) + '...' : k.query
    console.log(
      `${query.padEnd(40)} ${formatNumber(k.clicks).padStart(8)} ${formatNumber(k.impressions).padStart(8)} ${formatCtr(k.ctr).padStart(8)} ${formatPosition(k.position).padStart(6)}`
    )
  }

  console.log('-'.repeat(80))
  const totalClicks = keywords.reduce((sum, k) => sum + k.clicks, 0)
  const totalImpressions = keywords.reduce((sum, k) => sum + k.impressions, 0)
  console.log(
    `${'TOTAL'.padEnd(40)} ${formatNumber(totalClicks).padStart(8)} ${formatNumber(totalImpressions).padStart(8)}`
  )
}

// Print opportunities
function printOpportunities(opportunities: Opportunity[]): void {
  console.log('\n🎯 Keyword Opportunities')
  console.log('='.repeat(80))

  if (opportunities.length === 0) {
    console.log('No significant opportunities found.')
    return
  }

  for (let i = 0; i < Math.min(opportunities.length, 20); i++) {
    const opp = opportunities[i]
    console.log(`\n${i + 1}. "${opp.query}"`)
    console.log(`   Impressions: ${formatNumber(opp.impressions)} | Clicks: ${opp.clicks} | CTR: ${formatCtr(opp.ctr)} | Position: ${formatPosition(opp.position)}`)
    console.log(`   ⚠️  Issue: ${opp.issue}`)
    console.log(`   💡 Action: ${opp.recommendation}`)
  }

  if (opportunities.length > 20) {
    console.log(`\n... and ${opportunities.length - 20} more opportunities`)
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--help')) {
    console.log(`
Keyword Analysis

Usage:
  npx tsx analyze-keywords.ts [options]

Options:
  --top <n>             Show top N keywords (default: 20)
  --opportunities       Find optimization opportunities
  --business <name>     Filter by business (boo, teelixir, elevate, rhf)
  --detailed            Show detailed breakdown
  --export              Export to CSV
  --help                Show this help message

Examples:
  npx tsx analyze-keywords.ts --top 50
  npx tsx analyze-keywords.ts --opportunities --business teelixir

Credentials:
  Loads from secure vault (global) - requires Master Supabase access
    `)
    process.exit(0)
  }

  console.log('🔍 Keyword Analysis')
  console.log('='.repeat(50))

  // Load credentials from vault
  console.log('Loading credentials from vault...')
  await creds.load('global')

  const supabase = getSupabase()

  // Parse arguments
  const businessIdx = args.indexOf('--business')
  const business = businessIdx !== -1 ? args[businessIdx + 1] : null

  const topIdx = args.indexOf('--top')
  const topLimit = topIdx !== -1 ? parseInt(args[topIdx + 1]) : 20

  const showOpportunities = args.includes('--opportunities')

  try {
    if (showOpportunities) {
      const opportunities = await findOpportunities(supabase, business)
      printOpportunities(opportunities)

      console.log(`\n📈 Summary:`)
      console.log(`   Total opportunities found: ${opportunities.length}`)

      const potentialClicks = opportunities.reduce((sum, o) => {
        // Estimate if CTR improved to 5%
        const potentialCtr = Math.max(0.05, o.ctr)
        return sum + (o.impressions * potentialCtr) - o.clicks
      }, 0)
      console.log(`   Potential additional clicks: ~${Math.round(potentialClicks).toLocaleString()}`)

    } else {
      const keywords = await getTopKeywords(supabase, business, topLimit)
      printTopKeywords(keywords, business)

      // Quick stats
      console.log(`\n📈 Quick Stats (Last 28 days):`)
      console.log(`   Keywords shown: ${keywords.length}`)

      const brandedCount = keywords.filter(k =>
        k.query.toLowerCase().includes('teelixir') ||
        k.query.toLowerCase().includes('buy organics') ||
        k.query.toLowerCase().includes('elevate wholesale') ||
        k.query.toLowerCase().includes('red hill fresh')
      ).length
      console.log(`   Branded queries: ${brandedCount}`)
      console.log(`   Non-branded queries: ${keywords.length - brandedCount}`)
    }

  } catch (error: any) {
    console.error(`❌ Error: ${error?.message || JSON.stringify(error, null, 2)}`)
    if (error?.code) console.error(`   Code: ${error.code}`)
    if (error?.details) console.error(`   Details: ${error.details}`)
    process.exit(1)
  }

  console.log('\n✅ Analysis complete!')
}

main()
