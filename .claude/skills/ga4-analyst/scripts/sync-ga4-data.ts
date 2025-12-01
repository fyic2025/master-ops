#!/usr/bin/env npx tsx

/**
 * Sync GA4 Data
 *
 * Syncs analytics data from GA4 Data API.
 * Stores in Supabase for analysis and reporting.
 *
 * Usage:
 *   npx tsx sync-ga4-data.ts
 *   npx tsx sync-ga4-data.ts --business teelixir
 *   npx tsx sync-ga4-data.ts --start 2024-11-01 --end 2024-11-30
 */

import { BetaAnalyticsDataClient } from '@google-analytics/data'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

// Configuration
const config = {
  supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  googleCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
}

// Business property mappings
const BUSINESS_PROPERTIES: Record<string, string> = {
  boo: process.env.GA4_BOO_PROPERTY_ID || '',
  teelixir: process.env.GA4_TEELIXIR_PROPERTY_ID || '',
  elevate: process.env.GA4_ELEVATE_PROPERTY_ID || '',
  rhf: process.env.GA4_RHF_PROPERTY_ID || '',
}

interface DailyMetrics {
  business: string
  date: string
  sessions: number
  users: number
  newUsers: number
  pageViews: number
  engagedSessions: number
  engagementRate: number
  avgEngagementTime: number
  bounceRate: number
  transactions: number
  revenue: number
  avgOrderValue: number
  conversionRate: number
}

interface SyncResult {
  business: string
  daysProcessed: number
  rowsInserted: number
  errors: string[]
}

// Initialize GA4 Data API client
function getAnalyticsClient(): BetaAnalyticsDataClient {
  if (!config.googleCredentials) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS not set')
  }

  return new BetaAnalyticsDataClient({
    keyFilename: config.googleCredentials
  })
}

// Initialize Supabase
function getSupabase() {
  if (!config.supabaseUrl || !config.supabaseKey) {
    return null
  }
  return createClient(config.supabaseUrl, config.supabaseKey)
}

// Fetch daily metrics from GA4
async function fetchDailyMetrics(
  client: BetaAnalyticsDataClient,
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<any[]> {
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{
      startDate,
      endDate
    }],
    dimensions: [
      { name: 'date' }
    ],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'newUsers' },
      { name: 'screenPageViews' },
      { name: 'engagedSessions' },
      { name: 'engagementRate' },
      { name: 'averageSessionDuration' },
      { name: 'bounceRate' },
      { name: 'ecommercePurchases' },
      { name: 'totalRevenue' }
    ],
    orderBys: [{
      dimension: { dimensionName: 'date' },
      desc: false
    }]
  })

  return response.rows || []
}

// Fetch traffic sources from GA4
async function fetchTrafficSources(
  client: BetaAnalyticsDataClient,
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<any[]> {
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{
      startDate,
      endDate
    }],
    dimensions: [
      { name: 'date' },
      { name: 'sessionSource' },
      { name: 'sessionMedium' },
      { name: 'sessionCampaignName' }
    ],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'newUsers' },
      { name: 'engagedSessions' },
      { name: 'ecommercePurchases' },
      { name: 'totalRevenue' }
    ],
    limit: 10000
  })

  return response.rows || []
}

// Parse GA4 row to daily metrics
function parseMetricsRow(row: any, business: string): DailyMetrics {
  const dimensions = row.dimensionValues || []
  const metrics = row.metricValues || []

  const sessions = parseInt(metrics[0]?.value || '0')
  const transactions = parseInt(metrics[8]?.value || '0')
  const revenue = parseFloat(metrics[9]?.value || '0')

  // Format date from YYYYMMDD to YYYY-MM-DD
  const dateRaw = dimensions[0]?.value || ''
  const date = `${dateRaw.slice(0, 4)}-${dateRaw.slice(4, 6)}-${dateRaw.slice(6, 8)}`

  return {
    business,
    date,
    sessions,
    users: parseInt(metrics[1]?.value || '0'),
    newUsers: parseInt(metrics[2]?.value || '0'),
    pageViews: parseInt(metrics[3]?.value || '0'),
    engagedSessions: parseInt(metrics[4]?.value || '0'),
    engagementRate: parseFloat(metrics[5]?.value || '0'),
    avgEngagementTime: parseFloat(metrics[6]?.value || '0'),
    bounceRate: parseFloat(metrics[7]?.value || '0'),
    transactions,
    revenue,
    avgOrderValue: transactions > 0 ? revenue / transactions : 0,
    conversionRate: sessions > 0 ? transactions / sessions : 0
  }
}

// Sync data for a business
async function syncBusiness(
  client: BetaAnalyticsDataClient,
  supabase: any,
  business: string,
  startDate: string,
  endDate: string
): Promise<SyncResult> {
  const propertyId = BUSINESS_PROPERTIES[business]

  if (!propertyId) {
    return {
      business,
      daysProcessed: 0,
      rowsInserted: 0,
      errors: [`No property ID configured for ${business}. Set GA4_${business.toUpperCase()}_PROPERTY_ID`]
    }
  }

  console.log(`\n📊 Syncing ${business} (property: ${propertyId})...`)
  console.log(`   Date range: ${startDate} to ${endDate}`)

  const result: SyncResult = {
    business,
    daysProcessed: 0,
    rowsInserted: 0,
    errors: []
  }

  try {
    // Fetch daily metrics
    console.log('   Fetching daily metrics...')
    const dailyRows = await fetchDailyMetrics(client, propertyId, startDate, endDate)
    console.log(`   Found ${dailyRows.length} days of data`)

    // Parse and store daily metrics
    if (supabase && dailyRows.length > 0) {
      const dailyMetrics = dailyRows.map(row => parseMetricsRow(row, business))

      const dailyRecords = dailyMetrics.map(m => ({
        business: m.business,
        date: m.date,
        sessions: m.sessions,
        users: m.users,
        new_users: m.newUsers,
        page_views: m.pageViews,
        engaged_sessions: m.engagedSessions,
        engagement_rate: m.engagementRate,
        avg_engagement_time_seconds: Math.round(m.avgEngagementTime),
        bounce_rate: m.bounceRate,
        transactions: m.transactions,
        revenue: m.revenue,
        avg_order_value: m.avgOrderValue,
        conversion_rate: m.conversionRate,
        pages_per_session: m.sessions > 0 ? m.pageViews / m.sessions : 0,
        revenue_per_session: m.sessions > 0 ? m.revenue / m.sessions : 0
      }))

      const { error } = await supabase
        .from('ga4_daily_metrics')
        .upsert(dailyRecords, {
          onConflict: 'business,date',
          ignoreDuplicates: false
        })

      if (error) {
        result.errors.push(`Daily metrics: ${error.message}`)
      } else {
        result.daysProcessed = dailyMetrics.length
        result.rowsInserted += dailyMetrics.length
        console.log(`   ✅ Stored ${dailyMetrics.length} daily records`)
      }
    }

    // Fetch and store traffic sources
    console.log('   Fetching traffic sources...')
    const sourceRows = await fetchTrafficSources(client, propertyId, startDate, endDate)
    console.log(`   Found ${sourceRows.length} source/medium combinations`)

    if (supabase && sourceRows.length > 0) {
      const sourceRecords = sourceRows.map(row => {
        const dims = row.dimensionValues || []
        const mets = row.metricValues || []
        const dateRaw = dims[0]?.value || ''

        return {
          business,
          date: `${dateRaw.slice(0, 4)}-${dateRaw.slice(4, 6)}-${dateRaw.slice(6, 8)}`,
          source: dims[1]?.value || '(direct)',
          medium: dims[2]?.value || '(none)',
          campaign: dims[3]?.value || null,
          sessions: parseInt(mets[0]?.value || '0'),
          users: parseInt(mets[1]?.value || '0'),
          new_users: parseInt(mets[2]?.value || '0'),
          engaged_sessions: parseInt(mets[3]?.value || '0'),
          transactions: parseInt(mets[4]?.value || '0'),
          revenue: parseFloat(mets[5]?.value || '0')
        }
      })

      // Insert in batches
      const batchSize = 500
      for (let i = 0; i < sourceRecords.length; i += batchSize) {
        const batch = sourceRecords.slice(i, i + batchSize)
        const { error } = await supabase
          .from('ga4_traffic_sources')
          .upsert(batch, {
            onConflict: 'business,date,source,medium,campaign',
            ignoreDuplicates: false
          })

        if (error) {
          result.errors.push(`Traffic sources batch ${i}: ${error.message}`)
        } else {
          result.rowsInserted += batch.length
        }
      }

      console.log(`   ✅ Stored ${sourceRecords.length} traffic source records`)
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    result.errors.push(message)
    console.error(`   ❌ Error: ${message}`)
  }

  return result
}

// Calculate date range
function getDateRange(args: string[]): { startDate: string; endDate: string } {
  const startIdx = args.indexOf('--start')
  const endIdx = args.indexOf('--end')

  if (startIdx !== -1 && endIdx !== -1) {
    return {
      startDate: args[startIdx + 1],
      endDate: args[endIdx + 1]
    }
  }

  // Default: last 7 days
  const now = new Date()
  const endDate = new Date(now.getTime() - 24 * 60 * 60 * 1000) // Yesterday
  const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--help')) {
    console.log(`
GA4 Data Sync

Usage:
  npx tsx sync-ga4-data.ts [options]

Options:
  --business <name>     Sync specific business (boo, teelixir, elevate, rhf)
  --start <date>        Start date (YYYY-MM-DD)
  --end <date>          End date (YYYY-MM-DD)
  --help                Show this help message

Examples:
  npx tsx sync-ga4-data.ts                              # Last 7 days, all businesses
  npx tsx sync-ga4-data.ts --business teelixir          # Teelixir only
  npx tsx sync-ga4-data.ts --start 2024-11-01 --end 2024-11-30

Environment Variables Required:
  GOOGLE_APPLICATION_CREDENTIALS - Path to service account JSON
  GA4_BOO_PROPERTY_ID           - BOO GA4 property ID
  GA4_TEELIXIR_PROPERTY_ID      - Teelixir GA4 property ID
  GA4_ELEVATE_PROPERTY_ID       - Elevate GA4 property ID
  GA4_RHF_PROPERTY_ID           - RHF GA4 property ID
    `)
    process.exit(0)
  }

  console.log('🔄 GA4 Data Sync')
  console.log('='.repeat(50))

  // Get date range
  const { startDate, endDate } = getDateRange(args)
  console.log(`Date range: ${startDate} to ${endDate}`)

  // Initialize clients
  let analyticsClient
  try {
    analyticsClient = getAnalyticsClient()
  } catch (error) {
    console.error(`❌ ${error instanceof Error ? error.message : error}`)
    console.log('\nSet GOOGLE_APPLICATION_CREDENTIALS to your service account JSON file.')
    process.exit(1)
  }

  const supabase = getSupabase()
  if (!supabase) {
    console.warn('⚠️ Supabase not configured - data will not be stored')
  }

  // Determine businesses to sync
  const businessArg = args.indexOf('--business')
  const businesses = businessArg !== -1
    ? [args[businessArg + 1]]
    : Object.keys(BUSINESS_PROPERTIES)

  // Sync each business
  const results: SyncResult[] = []
  for (const business of businesses) {
    const result = await syncBusiness(
      analyticsClient,
      supabase,
      business,
      startDate,
      endDate
    )
    results.push(result)
  }

  // Summary
  console.log(`\n${'='.repeat(50)}`)
  console.log('📈 SYNC SUMMARY')
  console.log('='.repeat(50))

  let totalDays = 0
  let totalRows = 0
  let totalErrors = 0

  for (const result of results) {
    console.log(`\n${result.business}:`)
    console.log(`  Days processed: ${result.daysProcessed}`)
    console.log(`  Rows inserted:  ${result.rowsInserted}`)

    if (result.errors.length > 0) {
      console.log(`  Errors: ${result.errors.length}`)
      result.errors.forEach(e => console.log(`    - ${e}`))
    }

    totalDays += result.daysProcessed
    totalRows += result.rowsInserted
    totalErrors += result.errors.length
  }

  console.log(`\nTotal: ${totalRows} rows across ${totalDays} days`)

  if (totalErrors > 0) {
    console.log(`⚠️ ${totalErrors} errors occurred`)
    process.exit(1)
  }

  console.log('\n✅ Sync complete!')
}

main().catch(console.error)
