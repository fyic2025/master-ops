#!/usr/bin/env npx tsx
/**
 * Teelixir - Distributor Orders Sync
 *
 * Syncs distributor customers and their sales orders from Unleashed to Supabase.
 * Filters out B2C orders (those containing "b2c" in the order number).
 * Parses order comments for OOS/discontinued mentions.
 *
 * Usage:
 *   npx tsx teelixir/scripts/sync-distributor-orders.ts [options]
 *
 * Options:
 *   --full          Full sync (all orders, not just recent)
 *   --dry-run       Preview without writing to database
 *   --orders-only   Skip customer sync, only sync orders
 *
 * Environment Variables Required:
 *   UNLEASHED_TEELIXIR_API_ID      - Teelixir Unleashed API ID
 *   UNLEASHED_TEELIXIR_API_KEY     - Teelixir Unleashed API Key
 *   SUPABASE_URL                   - Supabase URL (main hub)
 *   SUPABASE_SERVICE_KEY           - Supabase service role key
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as crypto from 'crypto'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { parseOrderNotes, OOSParseResult } from './parse-order-notes'

dotenv.config()

// Load credentials from vault
const credsPath = path.join(__dirname, '../../creds.js')
const creds = require(credsPath)

// ============================================================================
// CONFIGURATION
// ============================================================================

const BATCH_SIZE = 50
const PAGE_SIZE = 200
const MIN_DELAY_MS = 200

interface SyncConfig {
  dryRun: boolean
  fullSync: boolean
  ordersOnly: boolean
}

interface SyncResult {
  success: boolean
  syncType: string
  recordsProcessed: number
  recordsCreated: number
  recordsUpdated: number
  recordsFailed: number
  errors: Array<{ error: string; id?: string }>
  duration: number
}

// ============================================================================
// UNLEASHED TYPES
// ============================================================================

interface UnleashedCustomer {
  Guid: string
  CustomerCode: string
  CustomerName: string
  Email?: string
  PhoneNumber?: string
  MobileNumber?: string
  ContactFirstName?: string
  ContactLastName?: string
  Addresses?: Array<{
    AddressType: string
    AddressName?: string
    StreetAddress?: string
    StreetAddress2?: string
    Suburb?: string
    City?: string
    Region?: string
    PostCode?: string
    Country?: string
  }>
  CustomerType?: string
  CreatedOn?: string
  LastModifiedOn?: string
}

interface UnleashedSalesOrder {
  Guid: string
  OrderNumber: string
  OrderStatus: string
  OrderDate: string
  RequiredDate?: string
  CompletedDate?: string
  Customer: {
    Guid: string
    CustomerCode: string
    CustomerName: string
  }
  SubTotal: number
  TaxTotal: number
  Total: number
  Currency?: { CurrencyCode: string }
  Comments?: string
  SalesOrderLines?: Array<{
    Guid: string
    LineNumber: number
    Product: {
      Guid: string
      ProductCode: string
      ProductDescription: string
    }
    OrderQuantity: number
    UnitPrice: number
    DiscountRate?: number
    LineTotal: number
    LineTax: number
    Comments?: string
  }>
}

// ============================================================================
// UNLEASHED CLIENT
// ============================================================================

class TeelixirUnleashedClient {
  private apiId: string
  private apiKey: string
  private baseUrl: string = 'https://api.unleashedsoftware.com'

  constructor() {
    // Try multiple env var naming conventions
    this.apiId = process.env.TEELIXIR_UNLEASHED_API_ID || process.env.UNLEASHED_TEELIXIR_API_ID || ''
    this.apiKey = process.env.TEELIXIR_UNLEASHED_API_KEY || process.env.UNLEASHED_TEELIXIR_API_KEY || ''

    if (!this.apiId || !this.apiKey) {
      throw new Error(
        'Teelixir Unleashed credentials required. Run: node creds.js load teelixir'
      )
    }
  }

  private generateSignature(queryString: string): string {
    const hmac = crypto.createHmac('sha256', this.apiKey)
    hmac.update(queryString)
    return hmac.digest('base64')
  }

  private async request<T>(path: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(path, this.baseUrl)

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    const queryString = url.search.substring(1)
    const signature = this.generateSignature(queryString)

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-auth-id': this.apiId,
        'api-auth-signature': signature,
      },
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`Unleashed API error: ${response.status} - ${errorBody}`)
    }

    return response.json()
  }

  async listCustomers(page: number = 1): Promise<{
    Items: UnleashedCustomer[]
    Pagination: { NumberOfItems: number; PageSize: number; PageNumber: number; NumberOfPages: number }
  }> {
    // Unleashed requires page number in URL path, not query params
    return this.request(`/Customers/${page}`, { pageSize: PAGE_SIZE })
  }

  async listAllCustomers(): Promise<UnleashedCustomer[]> {
    const allCustomers: UnleashedCustomer[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      console.log(`    Fetching customers page ${page}...`)
      const response = await this.listCustomers(page)
      allCustomers.push(...response.Items)
      hasMore = page < response.Pagination.NumberOfPages
      page++
      if (hasMore) await sleep(MIN_DELAY_MS)
    }

    return allCustomers
  }

  async listSalesOrders(page: number = 1, startDate?: string): Promise<{
    Items: UnleashedSalesOrder[]
    Pagination: { NumberOfItems: number; PageSize: number; PageNumber: number; NumberOfPages: number }
  }> {
    // Unleashed requires page number in URL path, not query params
    const params: Record<string, any> = { pageSize: PAGE_SIZE }
    if (startDate) {
      params.startDate = startDate
    }
    return this.request(`/SalesOrders/${page}`, params)
  }

  async getSalesOrder(guid: string): Promise<UnleashedSalesOrder> {
    const response = await this.request<{ Items: UnleashedSalesOrder[] }>(`/SalesOrders/${guid}`)
    // Unleashed returns single item in Items array for specific GUID
    if (response.Items && response.Items.length > 0) {
      return response.Items[0]
    }
    throw new Error(`Sales order ${guid} not found`)
  }

  async listAllSalesOrders(startDate?: string): Promise<UnleashedSalesOrder[]> {
    const allOrders: UnleashedSalesOrder[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      console.log(`    Fetching orders page ${page}...`)
      const response = await this.listSalesOrders(page, startDate)
      allOrders.push(...response.Items)
      hasMore = page < response.Pagination.NumberOfPages
      page++
      if (hasMore) await sleep(MIN_DELAY_MS)
    }

    return allOrders
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Parse Unleashed date format: /Date(1764460800000)/
 * Returns ISO date string or null
 */
function parseUnleashedDate(dateStr: string | undefined | null): string | null {
  if (!dateStr) return null

  // Handle /Date(timestamp)/ format
  const match = dateStr.match(/\/Date\((\d+)\)\//)
  if (match) {
    const timestamp = parseInt(match[1], 10)
    return new Date(timestamp).toISOString().split('T')[0] // Return just the date part
  }

  // Try parsing as ISO date
  try {
    const date = new Date(dateStr)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }
  } catch {
    // Fall through
  }

  return null
}

/**
 * Check if an order is from a distributor (not B2C)
 * B2C orders are identified by:
 * - Order number containing "b2c"
 * - Order number starting with "Shopify"
 * - Customer code starting with "SHOPIFY-"
 */
function isDistributorOrder(order: UnleashedSalesOrder): boolean {
  const orderNumber = (order.OrderNumber || '').toLowerCase()
  const customerCode = (order.Customer?.CustomerCode || '').toLowerCase()

  // Skip B2C orders
  if (orderNumber.includes('b2c')) return false

  // Skip Shopify B2C orders (created by unleashed-shopify-sync)
  if (orderNumber.startsWith('shopify')) return false
  if (customerCode.startsWith('shopify-')) return false

  return true
}

/**
 * Extract region from address
 */
function extractRegion(customer: UnleashedCustomer): string | null {
  const address = customer.Addresses?.find(a => a.AddressType === 'Physical') ||
    customer.Addresses?.[0]

  if (address?.Region) return address.Region
  if (address?.City) {
    // Try to map city to state
    const cityLower = address.City.toLowerCase()
    if (cityLower.includes('sydney') || cityLower.includes('nsw')) return 'NSW'
    if (cityLower.includes('melbourne') || cityLower.includes('vic')) return 'VIC'
    if (cityLower.includes('brisbane') || cityLower.includes('qld')) return 'QLD'
    if (cityLower.includes('perth') || cityLower.includes('wa')) return 'WA'
    if (cityLower.includes('adelaide') || cityLower.includes('sa')) return 'SA'
    if (cityLower.includes('hobart') || cityLower.includes('tas')) return 'TAS'
    if (cityLower.includes('darwin') || cityLower.includes('nt')) return 'NT'
    if (cityLower.includes('canberra') || cityLower.includes('act')) return 'ACT'
  }

  return null
}

// ============================================================================
// SYNC FUNCTIONS
// ============================================================================

async function syncCustomers(
  unleashed: TeelixirUnleashedClient,
  supabase: SupabaseClient,
  config: SyncConfig
): Promise<SyncResult> {
  console.log('\n👥 Syncing Customers (potential distributors)...')
  const startTime = Date.now()
  const errors: Array<{ error: string; id?: string }> = []
  let updated = 0

  try {
    const customers = await unleashed.listAllCustomers()
    console.log(`  ✓ Found ${customers.length} customers`)

    if (config.dryRun) {
      console.log('\n  [DRY RUN] Would sync these customers:')
      customers.slice(0, 5).forEach(c =>
        console.log(`    - ${c.CustomerCode}: ${c.CustomerName}`)
      )
      if (customers.length > 5) console.log(`    ... and ${customers.length - 5} more`)

      return {
        success: true,
        syncType: 'customers',
        recordsProcessed: customers.length,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsFailed: 0,
        errors: [],
        duration: Date.now() - startTime,
      }
    }

    // Upsert in batches
    console.log('\n  Upserting to Supabase...')

    for (let i = 0; i < customers.length; i += BATCH_SIZE) {
      const batch = customers.slice(i, i + BATCH_SIZE)
      console.log(`    Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(customers.length / BATCH_SIZE)}...`)

      const records = batch.map(customer => {
        const address = customer.Addresses?.find(a => a.AddressType === 'Physical') ||
          customer.Addresses?.[0]

        return {
          unleashed_guid: customer.Guid,
          customer_code: customer.CustomerCode,
          customer_name: customer.CustomerName,
          email: customer.Email || null,
          phone: customer.PhoneNumber || customer.MobileNumber || null,
          contact_name: customer.ContactFirstName
            ? `${customer.ContactFirstName} ${customer.ContactLastName || ''}`.trim()
            : null,
          address_line1: address?.StreetAddress || null,
          address_line2: address?.StreetAddress2 || null,
          city: address?.City || address?.Suburb || null,
          state: address?.Region || null,
          postcode: address?.PostCode || null,
          country: address?.Country || 'Australia',
          region: extractRegion(customer),
          distributor_type: customer.CustomerType || null,
          last_synced_at: new Date().toISOString(),
          metadata: {
            created_on: customer.CreatedOn,
            last_modified_on: customer.LastModifiedOn,
          },
        }
      })

      const { error } = await supabase
        .from('tlx_distributors')
        .upsert(records, {
          onConflict: 'customer_code',
          ignoreDuplicates: false,
        })

      if (error) {
        errors.push({ error: `Batch upsert failed: ${error.message}` })
        console.error(`    ❌ Batch failed: ${error.message}`)
      } else {
        updated += batch.length
      }
    }

    console.log(`\n  ✅ Customers synced: ${updated} upserted, ${errors.length} errors`)

    return {
      success: errors.length === 0,
      syncType: 'customers',
      recordsProcessed: customers.length,
      recordsCreated: 0,
      recordsUpdated: updated,
      recordsFailed: errors.length,
      errors,
      duration: Date.now() - startTime,
    }
  } catch (e) {
    const error = e as Error
    console.error(`\n  ❌ Customers sync failed: ${error.message}`)
    return {
      success: false,
      syncType: 'customers',
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsFailed: 1,
      errors: [{ error: error.message }],
      duration: Date.now() - startTime,
    }
  }
}

async function syncOrders(
  unleashed: TeelixirUnleashedClient,
  supabase: SupabaseClient,
  config: SyncConfig
): Promise<SyncResult> {
  console.log('\n🛒 Syncing Distributor Orders...')
  const startTime = Date.now()
  const errors: Array<{ error: string; id?: string }> = []
  let updated = 0
  let skipped = 0

  try {
    // For full sync, get all orders. Otherwise, last 90 days
    const startDate = config.fullSync ? undefined : getDateDaysAgo(90)
    const allOrders = await unleashed.listAllSalesOrders(startDate)
    console.log(`  ✓ Found ${allOrders.length} total orders`)

    // Filter to distributor orders only
    const distributorOrders = allOrders.filter(isDistributorOrder)
    skipped = allOrders.length - distributorOrders.length
    console.log(`  ✓ ${distributorOrders.length} distributor orders (${skipped} B2C orders skipped)`)

    if (config.dryRun) {
      console.log('\n  [DRY RUN] Would sync these orders:')
      distributorOrders.slice(0, 5).forEach(o =>
        console.log(`    - ${o.OrderNumber}: ${o.Customer.CustomerName} - $${o.Total}`)
      )
      if (distributorOrders.length > 5) console.log(`    ... and ${distributorOrders.length - 5} more`)

      return {
        success: true,
        syncType: 'orders',
        recordsProcessed: distributorOrders.length,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsFailed: 0,
        errors: [],
        duration: Date.now() - startTime,
      }
    }

    // Get distributor mapping (customer_code -> id) - paginate to get all
    console.log('\n  Building distributor lookup...')
    const distributorMap = new Map<string, string>()
    let distributorOffset = 0
    const pageSize = 1000

    while (true) {
      const { data: distributors, error } = await supabase
        .from('tlx_distributors')
        .select('id, customer_code')
        .range(distributorOffset, distributorOffset + pageSize - 1)

      if (error || !distributors || distributors.length === 0) break
      distributors.forEach(d => distributorMap.set(d.customer_code, d.id))

      if (distributors.length < pageSize) break
      distributorOffset += pageSize
    }
    console.log(`    ✓ ${distributorMap.size} distributors in lookup`)

    // Get product mapping (product_code -> id) - paginate to get all
    const productMap = new Map<string, string>()
    let productOffset = 0

    while (true) {
      const { data: products, error } = await supabase
        .from('tlx_products')
        .select('id, product_code')
        .range(productOffset, productOffset + pageSize - 1)

      if (error || !products || products.length === 0) break
      products.forEach(p => productMap.set(p.product_code, p.id))

      if (products.length < pageSize) break
      productOffset += pageSize
    }
    console.log(`    ✓ ${productMap.size} products in lookup`)

    // Process orders
    console.log('\n  Upserting orders...')
    let oosNotesCreated = 0

    for (const order of distributorOrders) {
      try {
        const distributorId = distributorMap.get(order.Customer.CustomerCode)

        if (!distributorId) {
          errors.push({
            error: `Distributor not found: ${order.Customer.CustomerCode}`,
            id: order.OrderNumber
          })
          continue
        }

        // Parse notes for OOS mentions
        const parsedNotes = parseOrderNotes(
          order.Comments || '',
          order.SalesOrderLines?.map(l => l.Comments || '') || []
        )

        // Upsert order (parse Unleashed date format)
        const orderRecord = {
          distributor_id: distributorId,
          unleashed_order_guid: order.Guid,
          order_number: order.OrderNumber,
          order_date: parseUnleashedDate(order.OrderDate),
          required_date: parseUnleashedDate(order.RequiredDate),
          completed_date: parseUnleashedDate(order.CompletedDate),
          order_status: order.OrderStatus,
          subtotal: order.SubTotal,
          tax_total: order.TaxTotal,
          total: order.Total,
          currency: order.Currency?.CurrencyCode || 'AUD',
          comments: order.Comments || null,
          has_oos_mention: parsedNotes.hasOOS,
          has_discontinued_mention: parsedNotes.hasDiscontinued,
          parsed_notes: parsedNotes,
          last_synced_at: new Date().toISOString(),
          raw_data: order,
        }

        const { data: orderData, error: orderError } = await supabase
          .from('tlx_distributor_orders')
          .upsert(orderRecord, { onConflict: 'order_number' })
          .select('id')
          .single()

        if (orderError) {
          errors.push({ error: `Order upsert failed: ${orderError.message}`, id: order.OrderNumber })
          continue
        }

        // Upsert line items
        if (order.SalesOrderLines && order.SalesOrderLines.length > 0) {
          // Filter out line items without valid product codes
          const validLines = order.SalesOrderLines.filter(line =>
            line.Product?.ProductCode && line.Product.ProductCode.trim() !== ''
          )

          const lineItems = validLines.map(line => {
            const lineNotes = parseOrderNotes(line.Comments || '', [])

            return {
              order_id: orderData.id,
              product_id: productMap.get(line.Product.ProductCode) || null,
              line_number: line.LineNumber,
              product_code: line.Product.ProductCode,
              product_description: line.Product.ProductDescription || '',
              quantity_ordered: line.OrderQuantity,
              unit_price: line.UnitPrice,
              discount_percent: line.DiscountRate || 0,
              line_total: line.LineTotal,
              line_tax: line.LineTax,
              line_comments: line.Comments || null,
              has_oos_mention: lineNotes.hasOOS,
            }
          })

          // Delete existing line items for this order and re-insert
          await supabase
            .from('tlx_order_line_items')
            .delete()
            .eq('order_id', orderData.id)

          // Only insert if there are valid line items
          if (lineItems.length > 0) {
            const { error: lineError } = await supabase
              .from('tlx_order_line_items')
              .insert(lineItems)

            if (lineError) {
              errors.push({ error: `Line items failed: ${lineError.message}`, id: order.OrderNumber })
            }
          }
        }

        // Create OOS notes if detected
        if (parsedNotes.oosMatches.length > 0 || parsedNotes.discontinuedMatches.length > 0) {
          for (const match of parsedNotes.oosMatches) {
            await supabase.from('tlx_oos_notes').upsert({
              order_id: orderData.id,
              note_type: 'out_of_stock',
              original_text: match,
              detected_at: new Date().toISOString(),
            }, { onConflict: 'order_id,original_text', ignoreDuplicates: true })
            oosNotesCreated++
          }

          for (const match of parsedNotes.discontinuedMatches) {
            await supabase.from('tlx_oos_notes').upsert({
              order_id: orderData.id,
              note_type: 'discontinued',
              original_text: match,
              detected_at: new Date().toISOString(),
            }, { onConflict: 'order_id,original_text', ignoreDuplicates: true })
            oosNotesCreated++
          }
        }

        updated++

        // Progress indicator
        if (updated % 50 === 0) {
          console.log(`    Processed ${updated}/${distributorOrders.length} orders...`)
        }
      } catch (e) {
        errors.push({ error: (e as Error).message, id: order.OrderNumber })
      }
    }

    // Update distributor metrics
    console.log('\n  Updating distributor metrics...')
    await supabase.rpc('update_all_distributor_metrics')

    console.log(`\n  ✅ Orders synced: ${updated} processed, ${oosNotesCreated} OOS notes, ${errors.length} errors`)

    return {
      success: errors.length === 0,
      syncType: 'orders',
      recordsProcessed: distributorOrders.length,
      recordsCreated: 0,
      recordsUpdated: updated,
      recordsFailed: errors.length,
      errors,
      duration: Date.now() - startTime,
    }
  } catch (e) {
    const error = e as Error
    console.error(`\n  ❌ Orders sync failed: ${error.message}`)
    return {
      success: false,
      syncType: 'orders',
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsFailed: 1,
      errors: [{ error: error.message }],
      duration: Date.now() - startTime,
    }
  }
}

function getDateDaysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().split('T')[0]
}

// ============================================================================
// PARSE CLI ARGUMENTS
// ============================================================================

function parseArgs(): SyncConfig {
  const args = process.argv.slice(2)

  return {
    dryRun: args.includes('--dry-run'),
    fullSync: args.includes('--full'),
    ordersOnly: args.includes('--orders-only'),
  }
}

// ============================================================================
// SYNC LOG
// ============================================================================

async function logSyncStart(supabase: SupabaseClient, syncType: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('tlx_sync_log')
    .insert({
      sync_type: syncType,
      status: 'started',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    console.error(`Failed to create sync log: ${error.message}`)
    return null
  }

  return data.id
}

async function logSyncComplete(
  supabase: SupabaseClient,
  logId: string,
  result: SyncResult
): Promise<void> {
  const { error } = await supabase
    .from('tlx_sync_log')
    .update({
      status: result.success ? 'success' : 'failed',
      completed_at: new Date().toISOString(),
      duration_ms: result.duration,
      records_fetched: result.recordsProcessed,
      records_created: result.recordsCreated,
      records_updated: result.recordsUpdated,
      records_failed: result.recordsFailed,
      error_message: result.errors.length > 0 ? result.errors[0].error : null,
      error_details: result.errors.length > 0 ? { errors: result.errors.slice(0, 10) } : null,
    })
    .eq('id', logId)

  if (error) {
    console.error(`Failed to update sync log: ${error.message}`)
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  Teelixir - Distributor Orders Sync')
  console.log('═══════════════════════════════════════════════════════════')

  const config = parseArgs()

  if (config.dryRun) {
    console.log('\n🔍 DRY RUN MODE - No data will be written\n')
  }

  if (config.fullSync) {
    console.log('📊 FULL SYNC - Processing all historical orders\n')
  } else {
    console.log('📊 INCREMENTAL SYNC - Processing last 90 days\n')
  }

  // Load credentials from vault
  console.log('🔐 Loading credentials from vault...')
  await creds.load('teelixir')
  await creds.load('global')

  // Initialize Unleashed client
  let unleashed: TeelixirUnleashedClient
  try {
    unleashed = new TeelixirUnleashedClient()
    console.log('📡 Connected to Teelixir Unleashed API')
  } catch (e) {
    console.error(`❌ ${(e as Error).message}`)
    process.exit(1)
  }

  // Initialize Supabase
  const supabaseUrl = process.env.MASTER_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.MASTER_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials!')
    console.error('   Set SUPABASE_URL and SUPABASE_SERVICE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  console.log('📦 Connected to Supabase')

  const results: SyncResult[] = []
  const startTime = Date.now()

  // Sync customers first (unless --orders-only)
  if (!config.ordersOnly) {
    const logId = config.dryRun ? null : await logSyncStart(supabase, 'customers')
    const result = await syncCustomers(unleashed, supabase, config)
    results.push(result)
    if (logId) await logSyncComplete(supabase, logId, result)
  }

  // Sync orders
  const logId = config.dryRun ? null : await logSyncStart(supabase, 'orders')
  const result = await syncOrders(unleashed, supabase, config)
  results.push(result)
  if (logId) await logSyncComplete(supabase, logId, result)

  // Summary
  const totalDuration = Date.now() - startTime
  const totalRecords = results.reduce((sum, r) => sum + r.recordsProcessed, 0)
  const totalErrors = results.reduce((sum, r) => sum + r.recordsFailed, 0)
  const allSuccess = results.every(r => r.success)

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('  SYNC COMPLETE')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`  Status: ${allSuccess ? '✅ SUCCESS' : '⚠️ PARTIAL SUCCESS'}`)
  console.log(`  Duration: ${(totalDuration / 1000).toFixed(1)}s`)
  console.log(`  Records Processed: ${totalRecords}`)
  console.log(`  Errors: ${totalErrors}`)
  console.log('')

  results.forEach(r => {
    const icon = r.success ? '✅' : '❌'
    console.log(`  ${icon} ${r.syncType}: ${r.recordsProcessed} records (${(r.duration / 1000).toFixed(1)}s)`)
  })

  console.log('═══════════════════════════════════════════════════════════\n')

  if (allSuccess) {
    console.log('Next steps:')
    console.log('  1. Review distributors: SELECT * FROM v_tlx_distributor_overview ORDER BY total_revenue DESC')
    console.log('  2. Review OOS notes: SELECT * FROM tlx_oos_notes ORDER BY detected_at DESC')
    console.log('  3. Start product grouping workflow')
    console.log('')
  }

  process.exit(allSuccess ? 0 : 1)
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
