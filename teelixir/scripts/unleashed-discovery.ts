#!/usr/bin/env npx tsx
/**
 * Unleashed API Discovery Script
 *
 * Pulls ALL raw API responses from Unleashed and stores as JSONB
 * for field analysis before designing final schema.
 *
 * Usage:
 *   npx tsx teelixir/scripts/unleashed-discovery.ts --store=teelixir
 *   npx tsx teelixir/scripts/unleashed-discovery.ts --store=teelixir --endpoints=Products,StockOnHand
 *   npx tsx teelixir/scripts/unleashed-discovery.ts --store=teelixir --dry-run
 */

import * as crypto from 'crypto'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: 'c:/Users/jayso/master-ops/.env' })

// =============================================================================
// Configuration
// =============================================================================

interface UnleashedConfig {
  apiId: string
  apiKey: string
  apiUrl: string
}

interface StoreConfig {
  name: string
  displayName: string
  unleashed: UnleashedConfig
}

const STORES: Record<string, StoreConfig> = {
  teelixir: {
    name: 'teelixir',
    displayName: 'Teelixir',
    unleashed: {
      apiId: process.env.TEELIXIR_UNLEASHED_API_ID || '7fda9404-7197-477b-89b1-dadbcefae168',
      apiKey: process.env.TEELIXIR_UNLEASHED_API_KEY || 'a65AOqESdYl9GHyhqohaoYPGWsugYa2V1xi90zRn4pW4LzjCcgF3JUB3Z8YI4PNq5duUphxQ8zGOCwNKexDQ==',
      apiUrl: 'https://api.unleashedsoftware.com',
    },
  },
  elevate: {
    name: 'elevate',
    displayName: 'Elevate Wholesale',
    unleashed: {
      apiId: process.env.ELEVATE_UNLEASHED_API_ID || '336a6015-eae0-43ab-83eb-e08121e7655d',
      apiKey: process.env.ELEVATE_UNLEASHED_API_KEY || 'SNX5bNJMLV3VaTbMK1rXMAiEUFdO96bLT5epp6ph8DJvc1WH5aJMRLihc2J0OyzVfKsA3xXpQgWIQANLxkQ==',
      apiUrl: 'https://api.unleashedsoftware.com',
    },
  },
}

// All known Unleashed API endpoints to discover
const ALL_ENDPOINTS = [
  'Products',
  'StockOnHand',
  'SalesOrders',
  'Customers',
  'Invoices',
  'PurchaseOrders',
  'Suppliers',
  'Warehouses',
  'BillOfMaterials',
  'StockAdjustments',
  'AssemblyOrders',
  'ProductGroups',
  'SellPriceTiers',
  'PaymentTerms',
  'TaxRates',
  'Currencies',
  'Companies',
  'SalesOrderGroups',
  'UnitOfMeasures',
  'DeliveryMethods',
]

// =============================================================================
// Unleashed API Client (Discovery Version)
// =============================================================================

class UnleashedDiscoveryClient {
  private config: UnleashedConfig

  constructor(config: UnleashedConfig) {
    this.config = config
  }

  private sign(queryString: string): string {
    return crypto
      .createHmac('sha256', this.config.apiKey)
      .update(queryString)
      .digest('base64')
  }

  async fetchEndpoint(
    endpoint: string,
    page: number = 1,
    pageSize: number = 200
  ): Promise<{
    data: any
    pagination: { page: number; totalPages: number; totalItems: number } | null
    responseTimeMs: number
  }> {
    const queryString = `page=${page}&pageSize=${pageSize}`
    const url = `${this.config.apiUrl}/${endpoint}?${queryString}`
    const signature = this.sign(queryString)

    const startTime = Date.now()

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'api-auth-id': this.config.apiId,
        'api-auth-signature': signature,
      },
    })

    const responseTimeMs = Date.now() - startTime

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Unleashed API error (${response.status}): ${errorText}`)
    }

    const data = await response.json() as any

    // Extract pagination info if present
    let pagination = null
    if (data.Pagination) {
      pagination = {
        page: data.Pagination.PageNumber,
        totalPages: data.Pagination.NumberOfPages,
        totalItems: data.Pagination.NumberOfItems,
      }
    }

    return { data, pagination, responseTimeMs }
  }

  async fetchAllPages(
    endpoint: string,
    pageSize: number = 200,
    onPage?: (page: number, totalPages: number, items: any[]) => Promise<void>
  ): Promise<{ totalRecords: number; totalPages: number; totalTimeMs: number }> {
    let page = 1
    let totalPages = 1
    let totalRecords = 0
    let totalTimeMs = 0

    while (page <= totalPages) {
      const { data, pagination, responseTimeMs } = await this.fetchEndpoint(endpoint, page, pageSize)
      totalTimeMs += responseTimeMs

      const items = data.Items || []
      totalRecords += items.length

      if (pagination) {
        totalPages = pagination.totalPages
      }

      if (onPage) {
        await onPage(page, totalPages, items)
      }

      console.log(`  Page ${page}/${totalPages}: ${items.length} items (${responseTimeMs}ms)`)

      page++

      // Rate limiting - 300ms between requests
      if (page <= totalPages) {
        await new Promise((resolve) => setTimeout(resolve, 300))
      }
    }

    return { totalRecords, totalPages, totalTimeMs }
  }
}

// =============================================================================
// Discovery Runner
// =============================================================================

interface DiscoveryOptions {
  store: string
  endpoints?: string[]
  dryRun?: boolean
  pageSize?: number
}

async function runDiscovery(options: DiscoveryOptions): Promise<void> {
  const { store, endpoints = ALL_ENDPOINTS, dryRun = false, pageSize = 200 } = options

  // Validate store
  const storeConfig = STORES[store]
  if (!storeConfig) {
    console.error(`Unknown store: ${store}`)
    console.error(`Available stores: ${Object.keys(STORES).join(', ')}`)
    process.exit(1)
  }

  if (!storeConfig.unleashed.apiKey) {
    console.error(`Missing API key for ${store}. Set ${store.toUpperCase()}_UNLEASHED_API_KEY env var.`)
    process.exit(1)
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Unleashed API Discovery - ${storeConfig.displayName}`)
  console.log(`${'='.repeat(60)}`)
  console.log(`Mode: ${dryRun ? 'DRY RUN (no database writes)' : 'LIVE'}`)
  console.log(`Endpoints: ${endpoints.join(', ')}`)
  console.log(`Page Size: ${pageSize}`)
  console.log(`${'='.repeat(60)}\n`)

  // Initialize Supabase client
  let supabase: SupabaseClient | null = null
  let runId: string | null = null

  if (!dryRun) {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
      process.exit(1)
    }

    supabase = createClient(supabaseUrl, supabaseKey)

    // Create discovery run record
    const { data: run, error: runError } = await supabase
      .from('ul_discovery_runs')
      .insert({
        store,
        endpoints_requested: endpoints,
        endpoints_completed: [],
        endpoints_failed: [],
        status: 'running',
      })
      .select()
      .single()

    if (runError) {
      console.error('Failed to create discovery run:', runError)
      process.exit(1)
    }

    runId = run.id
    console.log(`Discovery run ID: ${runId}\n`)
  }

  // Initialize Unleashed client
  const client = new UnleashedDiscoveryClient(storeConfig.unleashed)

  // Track results
  const completedEndpoints: string[] = []
  const failedEndpoints: string[] = []
  let totalRecordsFetched = 0
  let totalPagesFetched = 0
  let totalApiCalls = 0
  const startTime = Date.now()

  // Process each endpoint
  for (const endpoint of endpoints) {
    console.log(`\n[${endpoint}]`)
    console.log('-'.repeat(40))

    try {
      const result = await client.fetchAllPages(endpoint, pageSize, async (page, totalPages, items) => {
        totalApiCalls++

        if (!dryRun && supabase) {
          // Store raw response
          const { error } = await supabase.from('ul_raw_discovery').insert({
            store,
            endpoint,
            raw_response: { Items: items },
            record_count: items.length,
            page_number: page,
            total_pages: totalPages,
          })

          if (error) {
            console.error(`  Error storing page ${page}:`, error.message)
          }
        }
      })

      totalRecordsFetched += result.totalRecords
      totalPagesFetched += result.totalPages
      completedEndpoints.push(endpoint)

      console.log(`  COMPLETED: ${result.totalRecords} records in ${result.totalPages} pages (${result.totalTimeMs}ms)`)
    } catch (error: any) {
      failedEndpoints.push(endpoint)
      console.error(`  FAILED: ${error.message}`)
    }
  }

  const totalTimeMs = Date.now() - startTime

  // Update discovery run record
  if (!dryRun && supabase && runId) {
    await supabase
      .from('ul_discovery_runs')
      .update({
        completed_at: new Date().toISOString(),
        status: failedEndpoints.length === 0 ? 'completed' : 'partial',
        endpoints_completed: completedEndpoints,
        endpoints_failed: failedEndpoints,
        total_records_fetched: totalRecordsFetched,
        total_pages_fetched: totalPagesFetched,
        total_api_calls: totalApiCalls,
        total_time_ms: totalTimeMs,
      })
      .eq('id', runId)
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`)
  console.log('DISCOVERY SUMMARY')
  console.log(`${'='.repeat(60)}`)
  console.log(`Store: ${storeConfig.displayName}`)
  console.log(`Total Records: ${totalRecordsFetched.toLocaleString()}`)
  console.log(`Total Pages: ${totalPagesFetched.toLocaleString()}`)
  console.log(`API Calls: ${totalApiCalls.toLocaleString()}`)
  console.log(`Total Time: ${(totalTimeMs / 1000).toFixed(1)}s`)
  console.log(`Completed: ${completedEndpoints.length}/${endpoints.length} endpoints`)

  if (failedEndpoints.length > 0) {
    console.log(`\nFailed Endpoints:`)
    for (const ep of failedEndpoints) {
      console.log(`  - ${ep}`)
    }
  }

  console.log(`${'='.repeat(60)}\n`)
}

// =============================================================================
// CLI
// =============================================================================

function parseArgs(): DiscoveryOptions {
  const args = process.argv.slice(2)
  const options: DiscoveryOptions = {
    store: 'teelixir',
  }

  for (const arg of args) {
    if (arg.startsWith('--store=')) {
      options.store = arg.split('=')[1]
    } else if (arg.startsWith('--endpoints=')) {
      options.endpoints = arg.split('=')[1].split(',')
    } else if (arg === '--dry-run') {
      options.dryRun = true
    } else if (arg.startsWith('--page-size=')) {
      options.pageSize = parseInt(arg.split('=')[1])
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Unleashed API Discovery Script

Usage:
  npx tsx unleashed-discovery.ts [options]

Options:
  --store=NAME       Store to discover (teelixir, elevate) [default: teelixir]
  --endpoints=A,B,C  Comma-separated list of endpoints to fetch [default: all]
  --page-size=N      Items per page [default: 200]
  --dry-run          Preview without writing to database

Available Endpoints:
  ${ALL_ENDPOINTS.join(', ')}

Examples:
  npx tsx unleashed-discovery.ts --store=teelixir
  npx tsx unleashed-discovery.ts --store=teelixir --endpoints=Products,StockOnHand --dry-run
`)
      process.exit(0)
    }
  }

  return options
}

// Run
const options = parseArgs()
runDiscovery(options).catch((error) => {
  console.error('Discovery failed:', error)
  process.exit(1)
})
