#!/usr/bin/env npx tsx

/**
 * Sync GSC Data
 *
 * Syncs search performance data from Google Search Console API.
 * Stores in Supabase for analysis and reporting.
 *
 * Usage:
 *   npx tsx sync-gsc-data.ts
 *   npx tsx sync-gsc-data.ts --business teelixir
 *   npx tsx sync-gsc-data.ts --start 2024-11-01 --end 2024-11-30
 *   npx tsx sync-gsc-data.ts --full
 */

import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)

// Load credentials from vault
const creds = require(path.resolve(__dirname, '../../../../creds'))

// Configuration (loaded from vault)
const config = {
  supabaseUrl: process.env.MASTER_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.MASTER_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  googleClientId: process.env.GOOGLE_ADS_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET,
  gscRefreshToken: process.env.GOOGLE_GSC_REFRESH_TOKEN,
}

// Business property mappings (use exact format from GSC sites.list)
const BUSINESS_PROPERTIES: Record<string, string> = {
  boo: 'https://www.buyorganicsonline.com.au/',
  teelixir: 'https://teelixir.com/',
  elevate: 'sc-domain:elevatewholesale.com.au',
  rhf: 'sc-domain:redhillfresh.com.au',
}

interface SearchAnalyticsRow {
  keys: string[]
  clicks: number
  impressions: number
  ctr: number
  position: number
}

interface SyncResult {
  business: string
  rowsProcessed: number
  rowsInserted: number
  errors: string[]
}

// Initialize Google Auth with vault credentials
async function getGoogleAuth(business?: string) {
  // Load credentials from vault if not already loaded
  if (!process.env.GOOGLE_ADS_CLIENT_ID) {
    await creds.load('global')
  }

  // Try business-specific refresh token first (from Google Ads or Merchant)
  let refreshToken = config.gscRefreshToken

  if (business) {
    await creds.load(business)
    const prefix = business.toUpperCase()
    // Try business-specific GSC token, then Google Ads token, then Merchant token
    const businessGscToken = process.env[`${prefix}_GSC_REFRESH_TOKEN`]
    const businessAdsToken = process.env[`${prefix}_GOOGLE_ADS_REFRESH_TOKEN`]
    const businessMerchantToken = process.env[`${prefix}_GOOGLE_MERCHANT_REFRESH_TOKEN`]

    if (businessGscToken) {
      console.log(`   Using ${business} GSC refresh token`)
      refreshToken = businessGscToken
    }
    // Note: Google Ads and Merchant tokens typically don't have GSC scopes
    // They would need to be re-authorized with webmasters.readonly scope
  }

  // Use OAuth2 with vault credentials
  if (config.googleClientId && config.googleClientSecret && refreshToken) {
    const oauth2Client = new google.auth.OAuth2(
      config.googleClientId,
      config.googleClientSecret,
      'http://localhost'
    )
    oauth2Client.setCredentials({
      refresh_token: refreshToken
    })
    return oauth2Client
  }

  throw new Error('Google credentials not found in vault. Ensure global vault contains: GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_GSC_REFRESH_TOKEN')
}

// Initialize Supabase
function getSupabase() {
  if (!config.supabaseUrl || !config.supabaseKey) {
    return null
  }
  return createClient(config.supabaseUrl, config.supabaseKey)
}

// Fetch search analytics data
async function fetchSearchAnalytics(
  searchconsole: any,
  siteUrl: string,
  startDate: string,
  endDate: string,
  startRow: number = 0
): Promise<SearchAnalyticsRow[]> {
  const response = await searchconsole.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ['query', 'page', 'device', 'country', 'date'],
      rowLimit: 25000,
      startRow,
    }
  })

  return response.data.rows || []
}

// Sync data for a business
async function syncBusiness(
  searchconsole: any,
  supabase: any,
  business: string,
  startDate: string,
  endDate: string
): Promise<SyncResult> {
  const siteUrl = BUSINESS_PROPERTIES[business]
  if (!siteUrl) {
    return {
      business,
      rowsProcessed: 0,
      rowsInserted: 0,
      errors: [`Unknown business: ${business}`]
    }
  }

  console.log(`\n📊 Syncing ${business} (${siteUrl})...`)
  console.log(`   Date range: ${startDate} to ${endDate}`)

  const result: SyncResult = {
    business,
    rowsProcessed: 0,
    rowsInserted: 0,
    errors: []
  }

  try {
    // Fetch all rows (paginated)
    let allRows: SearchAnalyticsRow[] = []
    let startRow = 0
    let hasMore = true

    while (hasMore) {
      const rows = await fetchSearchAnalytics(
        searchconsole,
        siteUrl,
        startDate,
        endDate,
        startRow
      )

      if (rows.length === 0) {
        hasMore = false
      } else {
        allRows = allRows.concat(rows)
        startRow += rows.length
        console.log(`   Fetched ${allRows.length} rows...`)

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Safety limit
      if (allRows.length >= 100000) {
        console.log('   Reached 100k row limit')
        hasMore = false
      }
    }

    result.rowsProcessed = allRows.length
    console.log(`   Total rows: ${allRows.length}`)

    if (allRows.length === 0) {
      console.log('   No data found for date range')
      return result
    }

    // Transform and insert data
    if (supabase) {
      const batchSize = 1000
      for (let i = 0; i < allRows.length; i += batchSize) {
        const batch = allRows.slice(i, i + batchSize).map(row => ({
          business,
          date: row.keys[4], // date dimension
          query: row.keys[0],
          page: row.keys[1],
          device: row.keys[2],
          country: row.keys[3],
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: row.ctr,
          position: row.position
        }))

        const response = await supabase
          .from('gsc_search_performance')
          .upsert(batch, {
            onConflict: 'business,date,query,page,country,device',
            ignoreDuplicates: false
          })

        const { error, status, statusText } = response as any

        if (error || status >= 400) {
          const errMsg = error?.message || error?.details || error?.hint || statusText || `status: ${status}`
          result.errors.push(`Batch ${i}-${i + batchSize}: ${errMsg}`)
          // Log first error in detail
          if (result.errors.length === 1) {
            console.error(`   ⚠️ Insert error: ${errMsg} (${status})`)
            if (status === 404) {
              console.error('   💡 Table "gsc_search_performance" does not exist.')
              console.error('   📋 Run this migration in Supabase SQL Editor:')
              console.error('      infra/supabase/migrations/20251202_gsc_search_performance.sql')
            }
          }
        } else {
          result.rowsInserted += batch.length
        }

        // Progress indicator
        if ((i + batchSize) % 5000 === 0) {
          console.log(`   Inserted ${Math.min(i + batchSize, allRows.length)}/${allRows.length} rows...`)
        }
      }
    }

    console.log(`   ✅ Synced ${result.rowsInserted} rows`)

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    result.errors.push(message)
    console.error(`   ❌ Error: ${message}`)
  }

  return result
}

// Calculate date range
function getDateRange(args: string[]): { startDate: string; endDate: string } {
  const now = new Date()

  // Check for custom dates
  const startIdx = args.indexOf('--start')
  const endIdx = args.indexOf('--end')

  if (startIdx !== -1 && endIdx !== -1) {
    return {
      startDate: args[startIdx + 1],
      endDate: args[endIdx + 1]
    }
  }

  // Full sync (16 months)
  if (args.includes('--full')) {
    const startDate = new Date(now)
    startDate.setMonth(startDate.getMonth() - 16)
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }
  }

  // Default: last 7 days
  const endDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) // 2 days ago (data delay)
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
GSC Data Sync

Usage:
  npx tsx sync-gsc-data.ts [options]

Options:
  --business <name>     Sync specific business (boo, teelixir, elevate, rhf)
  --start <date>        Start date (YYYY-MM-DD)
  --end <date>          End date (YYYY-MM-DD)
  --full                Full sync (last 16 months)
  --help                Show this help message

Examples:
  npx tsx sync-gsc-data.ts                              # Last 7 days, all businesses
  npx tsx sync-gsc-data.ts --business teelixir          # Teelixir only
  npx tsx sync-gsc-data.ts --start 2024-11-01 --end 2024-11-30
  npx tsx sync-gsc-data.ts --full                       # Full historical sync

Credentials:
  Loads from secure vault (global): GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_GSC_REFRESH_TOKEN
    `)
    process.exit(0)
  }

  console.log('🔄 GSC Data Sync')
  console.log('='.repeat(50))

  // Load credentials from vault
  console.log('Loading credentials from vault...')
  await creds.load('global')

  // Get date range
  const { startDate, endDate } = getDateRange(args)
  console.log(`Date range: ${startDate} to ${endDate}`)

  // Initialize Supabase
  const supabase = getSupabase()
  if (!supabase) {
    console.warn('⚠️ Supabase not configured - data will not be stored')
  }

  // Determine which businesses to sync
  const businessArg = args.indexOf('--business')
  const businesses = businessArg !== -1
    ? [args[businessArg + 1]]
    : Object.keys(BUSINESS_PROPERTIES)

  // Sync each business (with its own auth)
  const results: SyncResult[] = []
  for (const business of businesses) {
    // Get auth for this business (tries business-specific tokens first)
    let auth
    try {
      auth = await getGoogleAuth(business)
    } catch (error) {
      console.error(`❌ ${error instanceof Error ? error.message : error}`)
      results.push({
        business,
        rowsProcessed: 0,
        rowsInserted: 0,
        errors: [`Auth failed: ${error instanceof Error ? error.message : error}`]
      })
      continue
    }

    const searchconsole = google.searchconsole({ version: 'v1', auth })
    const result = await syncBusiness(
      searchconsole,
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

  let totalRows = 0
  let totalInserted = 0
  let totalErrors = 0

  for (const result of results) {
    console.log(`\n${result.business}:`)
    console.log(`  Processed: ${result.rowsProcessed.toLocaleString()} rows`)
    console.log(`  Inserted:  ${result.rowsInserted.toLocaleString()} rows`)

    if (result.errors.length > 0) {
      console.log(`  Errors:    ${result.errors.length}`)
      result.errors.slice(0, 3).forEach(e => console.log(`    - ${e}`))
    }

    totalRows += result.rowsProcessed
    totalInserted += result.rowsInserted
    totalErrors += result.errors.length
  }

  console.log(`\nTotal: ${totalInserted.toLocaleString()}/${totalRows.toLocaleString()} rows synced`)

  if (totalErrors > 0) {
    console.log(`⚠️ ${totalErrors} errors occurred`)
    process.exit(1)
  }

  console.log('\n✅ Sync complete!')
}

main().catch(console.error)
