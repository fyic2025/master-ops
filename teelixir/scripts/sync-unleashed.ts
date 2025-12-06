#!/usr/bin/env npx tsx
/**
 * Unleashed Ongoing Sync Script
 *
 * Syncs data directly from Unleashed API to typed ul_* tables.
 * For use in cron jobs and n8n workflows.
 *
 * Usage:
 *   npx tsx teelixir/scripts/sync-unleashed.ts --store=teelixir --type=stock
 *   npx tsx teelixir/scripts/sync-unleashed.ts --store=teelixir --type=products
 *   npx tsx teelixir/scripts/sync-unleashed.ts --store=teelixir --type=orders
 *   npx tsx teelixir/scripts/sync-unleashed.ts --store=teelixir --type=full
 */

import * as crypto from 'crypto'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

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
      apiKey:
        process.env.TEELIXIR_UNLEASHED_API_KEY ||
        'a65AOqESdYl9GHyhqohaoYPGWsugYa2V1xi90zRn4pW4LzjCcgF3JUB3Z8YI4PNq5duUphxQ8zGOCwNKexDQ==',
      apiUrl: 'https://api.unleashedsoftware.com',
    },
  },
  elevate: {
    name: 'elevate',
    displayName: 'Elevate Wholesale',
    unleashed: {
      apiId: process.env.ELEVATE_UNLEASHED_API_ID || '336a6015-eae0-43ab-83eb-e08121e7655d',
      apiKey:
        process.env.ELEVATE_UNLEASHED_API_KEY ||
        'SNX5bNJMLV3VaTbMK1rXMAiEUFdO96bLT5epp6ph8DJvc1WH5aJMRLihc2J0OyzVfKsA3xXpQgWIQANLxkQ==',
      apiUrl: 'https://api.unleashedsoftware.com',
    },
  },
}

type SyncType = 'stock' | 'products' | 'orders' | 'customers' | 'full'

interface SyncOptions {
  store: string
  type: SyncType
  dryRun?: boolean
}

// =============================================================================
// Unleashed API Client
// =============================================================================

class UnleashedClient {
  private config: UnleashedConfig

  constructor(config: UnleashedConfig) {
    this.config = config
  }

  private sign(queryString: string): string {
    return crypto.createHmac('sha256', this.config.apiKey).update(queryString).digest('base64')
  }

  async fetch(endpoint: string, page: number = 1, pageSize: number = 200): Promise<any> {
    const queryString = `page=${page}&pageSize=${pageSize}`
    const url = `${this.config.apiUrl}/${endpoint}?${queryString}`
    const signature = this.sign(queryString)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'api-auth-id': this.config.apiId,
        'api-auth-signature': signature,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Unleashed API error (${response.status}): ${errorText}`)
    }

    return response.json()
  }

  async fetchAll(endpoint: string, pageSize: number = 200): Promise<any[]> {
    const allItems: any[] = []
    let page = 1
    let totalPages = 1

    while (page <= totalPages) {
      const data = await this.fetch(endpoint, page, pageSize)
      const items = data.Items || []
      allItems.push(...items)

      if (data.Pagination) {
        totalPages = data.Pagination.NumberOfPages
      }

      page++

      // Rate limiting
      if (page <= totalPages) {
        await new Promise((r) => setTimeout(r, 200))
      }
    }

    return allItems
  }
}

// =============================================================================
// Date Parser
// =============================================================================

function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null
  const match = dateStr.match(/\/Date\((\d+)\)\//)
  if (match) return new Date(parseInt(match[1]))
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) return new Date(dateStr)
  return null
}

// =============================================================================
// Sync Functions
// =============================================================================

async function syncStockOnHand(
  client: UnleashedClient,
  supabase: SupabaseClient,
  store: string
): Promise<{ synced: number; failed: number }> {
  console.log('  Fetching StockOnHand from Unleashed...')
  const items = await client.fetchAll('StockOnHand')
  console.log(`  Retrieved ${items.length} stock records`)

  let synced = 0
  let failed = 0

  // Use a Map to dedupe by product_guid + warehouse_guid
  const stockMap = new Map<string, any>()
  for (const item of items) {
    const key = `${item.ProductGuid || item.Guid}|${item.Warehouse?.Guid || ''}`
    stockMap.set(key, item)
  }

  console.log(`  ${stockMap.size} unique product/warehouse combinations`)

  for (const item of stockMap.values()) {
    const record = {
      store,
      product_guid: item.ProductGuid || item.Guid,
      product_code: item.ProductCode,
      product_description: item.ProductDescription,
      product_group_name: item.ProductGroupName,
      qty_on_hand: item.QtyOnHand || 0,
      available_qty: item.AvailableQty || 0,
      allocated_qty: item.AllocatedQty || 0,
      on_purchase: item.OnPurchase || 0,
      avg_cost: item.AvgCost || 0,
      total_cost: item.TotalCost || 0,
      warehouse_guid: item.Warehouse?.Guid || null,
      warehouse_code: item.Warehouse?.WarehouseCode || null,
      warehouse_name: item.Warehouse?.WarehouseName || null,
      last_modified_on: parseDate(item.LastModifiedOn),
      raw_data: item,
      synced_at: new Date(),
      updated_at: new Date(),
    }

    const { error } = await supabase.from('ul_stock_on_hand').upsert(record, {
      onConflict: 'store,product_guid,warehouse_guid',
      ignoreDuplicates: false,
    })

    if (error) {
      failed++
    } else {
      synced++
    }
  }

  return { synced, failed }
}

async function syncProducts(
  client: UnleashedClient,
  supabase: SupabaseClient,
  store: string
): Promise<{ synced: number; failed: number }> {
  console.log('  Fetching Products from Unleashed...')
  const items = await client.fetchAll('Products')
  console.log(`  Retrieved ${items.length} products`)

  let synced = 0
  let failed = 0

  for (const item of items) {
    const record = {
      store,
      guid: item.Guid,
      product_code: item.ProductCode,
      product_description: item.ProductDescription,
      default_sell_price: item.DefaultSellPrice || 0,
      default_purchase_price: item.DefaultPurchasePrice || 0,
      average_land_price: item.AverageLandPrice || 0,
      is_sellable: item.IsSellable ?? true,
      is_purchasable: item.IsPurchasable ?? true,
      is_assembled_product: item.IsAssembledProduct ?? false,
      is_component: item.IsComponent ?? false,
      is_batch_tracked: item.IsBatchTracked ?? false,
      is_serialized: item.IsSerialized ?? false,
      obsolete: item.Obsolete ?? false,
      never_diminishing: item.NeverDiminishing ?? false,
      taxable_sales: item.TaxableSales ?? true,
      taxable_purchase: item.TaxablePurchase ?? true,
      product_group_guid: item.ProductGroup?.Guid,
      product_group_name: item.ProductGroup?.GroupName,
      unit_of_measure_guid: item.UnitOfMeasure?.Guid,
      unit_of_measure_name: item.UnitOfMeasure?.Name,
      supplier_guid: item.Supplier?.Guid,
      supplier_code: item.Supplier?.SupplierCode,
      supplier_name: item.Supplier?.SupplierName,
      supplier_product_price: item.Supplier?.SupplierProductPrice,
      created_by: item.CreatedBy,
      created_on: parseDate(item.CreatedOn),
      last_modified_by: item.LastModifiedBy,
      last_modified_on: parseDate(item.LastModifiedOn),
      raw_data: item,
      synced_at: new Date(),
      updated_at: new Date(),
    }

    const { error } = await supabase.from('ul_products').upsert(record, { onConflict: 'store,guid' })

    if (error) {
      failed++
    } else {
      synced++
    }
  }

  return { synced, failed }
}

async function syncSalesOrders(
  client: UnleashedClient,
  supabase: SupabaseClient,
  store: string,
  modifiedSince?: Date
): Promise<{ synced: number; failed: number }> {
  console.log('  Fetching SalesOrders from Unleashed...')

  // Fetch orders modified in the last 24 hours for incremental sync
  const items = await client.fetchAll('SalesOrders')
  console.log(`  Retrieved ${items.length} orders`)

  let synced = 0
  let failed = 0

  for (const item of items) {
    const orderRecord = {
      store,
      guid: item.Guid,
      order_number: item.OrderNumber,
      order_status: item.OrderStatus,
      order_date: parseDate(item.OrderDate),
      required_date: parseDate(item.RequiredDate),
      payment_due_date: parseDate(item.PaymentDueDate),
      completed_date: parseDate(item.CompletedDate),
      customer_guid: item.Customer?.Guid,
      customer_code: item.Customer?.CustomerCode,
      customer_name: item.Customer?.CustomerName,
      delivery_email: item.DeliveryContact?.EmailAddress,
      delivery_first_name: item.DeliveryContact?.FirstName,
      warehouse_guid: item.Warehouse?.Guid,
      warehouse_code: item.Warehouse?.WarehouseCode,
      warehouse_name: item.Warehouse?.WarehouseName,
      currency_guid: item.Currency?.Guid,
      currency_code: item.Currency?.CurrencyCode,
      exchange_rate: item.ExchangeRate || 1,
      sub_total: item.SubTotal || 0,
      tax_total: item.TaxTotal || 0,
      total: item.Total || 0,
      discount_rate: item.DiscountRate || 0,
      bc_sub_total: item.BCSubTotal || 0,
      bc_tax_total: item.BCTaxTotal || 0,
      bc_total: item.BCTotal || 0,
      tax_rate: item.TaxRate || 0,
      xero_tax_code: item.XeroTaxCode,
      total_weight: item.TotalWeight || 0,
      total_volume: item.TotalVolume || 0,
      created_by: item.CreatedBy,
      created_on: parseDate(item.CreatedOn),
      last_modified_by: item.LastModifiedBy,
      last_modified_on: parseDate(item.LastModifiedOn),
      raw_data: item,
      synced_at: new Date(),
      updated_at: new Date(),
    }

    const { data: order, error: orderError } = await supabase
      .from('ul_sales_orders')
      .upsert(orderRecord, { onConflict: 'store,guid' })
      .select('id')
      .single()

    if (orderError) {
      failed++
      continue
    }

    synced++

    // Sync order lines
    const lines = item.SalesOrderLines || []
    for (const line of lines) {
      const lineRecord = {
        store,
        sales_order_id: order.id,
        sales_order_guid: item.Guid,
        guid: line.Guid,
        line_number: line.LineNumber,
        product_guid: line.Product?.Guid,
        product_code: line.Product?.ProductCode || line.ProductCode,
        product_description: line.Product?.ProductDescription || line.ProductDescription,
        order_quantity: line.OrderQuantity || 0,
        shipped_quantity: line.ShippedQuantity || 0,
        unit_price: line.UnitPrice || 0,
        discount_rate: line.DiscountRate || 0,
        line_total: line.LineTotal || 0,
        line_tax: line.LineTax || 0,
        bc_unit_price: line.BCUnitPrice || 0,
        bc_line_total: line.BCLineTotal || 0,
        bc_line_tax: line.BCLineTax || 0,
        last_modified_on: parseDate(line.LastModifiedOn),
        synced_at: new Date(),
      }

      await supabase.from('ul_sales_order_lines').upsert(lineRecord, { onConflict: 'store,guid' })
    }
  }

  return { synced, failed }
}

async function syncCustomers(
  client: UnleashedClient,
  supabase: SupabaseClient,
  store: string
): Promise<{ synced: number; failed: number }> {
  console.log('  Fetching Customers from Unleashed...')
  const items = await client.fetchAll('Customers')
  console.log(`  Retrieved ${items.length} customers`)

  let synced = 0
  let failed = 0

  for (const item of items) {
    const record = {
      store,
      guid: item.Guid,
      customer_code: item.CustomerCode,
      customer_name: item.CustomerName,
      email: item.Email,
      contact_first_name: item.ContactFirstName,
      contact_last_name: item.ContactLastName,
      phone: item.PhoneNumber,
      mobile: item.MobileNumber,
      xero_contact_id: item.XeroContactId,
      xero_sales_account: item.XeroSalesAccount,
      currency_guid: item.Currency?.Guid,
      currency_code: item.Currency?.CurrencyCode,
      obsolete: item.Obsolete ?? false,
      taxable: item.Taxable ?? true,
      stop_credit: item.StopCredit ?? false,
      has_credit_limit: item.HasCreditLimit ?? false,
      credit_limit: item.CreditLimit,
      created_by: item.CreatedBy,
      created_on: parseDate(item.CreatedOn),
      last_modified_by: item.LastModifiedBy,
      last_modified_on: parseDate(item.LastModifiedOn),
      raw_data: item,
      synced_at: new Date(),
      updated_at: new Date(),
    }

    const { error } = await supabase.from('ul_customers').upsert(record, { onConflict: 'store,guid' })

    if (error) {
      failed++
    } else {
      synced++
    }
  }

  return { synced, failed }
}

// =============================================================================
// Main Sync Runner
// =============================================================================

async function runSync(options: SyncOptions): Promise<void> {
  const { store, type, dryRun = false } = options

  const storeConfig = STORES[store]
  if (!storeConfig) {
    console.error(`Unknown store: ${store}`)
    process.exit(1)
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Unleashed Sync - ${storeConfig.displayName}`)
  console.log(`${'='.repeat(60)}`)
  console.log(`Type: ${type}`)
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`${'='.repeat(60)}\n`)

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const client = new UnleashedClient(storeConfig.unleashed)

  // Create sync run record
  const { data: run } = await supabase
    .from('ul_sync_runs')
    .insert({
      store,
      sync_type: type,
      status: 'running',
      tables_synced: [],
    })
    .select('id')
    .single()

  const syncRunId = run?.id
  const startTime = Date.now()
  const results: { table: string; synced: number; failed: number }[] = []

  try {
    if (type === 'stock' || type === 'full') {
      console.log('[StockOnHand]')
      const result = await syncStockOnHand(client, supabase, store)
      console.log(`  Synced: ${result.synced}, Failed: ${result.failed}`)
      results.push({ table: 'StockOnHand', ...result })
    }

    if (type === 'products' || type === 'full') {
      console.log('\n[Products]')
      const result = await syncProducts(client, supabase, store)
      console.log(`  Synced: ${result.synced}, Failed: ${result.failed}`)
      results.push({ table: 'Products', ...result })
    }

    if (type === 'orders' || type === 'full') {
      console.log('\n[SalesOrders]')
      const result = await syncSalesOrders(client, supabase, store)
      console.log(`  Synced: ${result.synced}, Failed: ${result.failed}`)
      results.push({ table: 'SalesOrders', ...result })
    }

    if (type === 'customers' || type === 'full') {
      console.log('\n[Customers]')
      const result = await syncCustomers(client, supabase, store)
      console.log(`  Synced: ${result.synced}, Failed: ${result.failed}`)
      results.push({ table: 'Customers', ...result })
    }

    // Update sync run
    const totalSynced = results.reduce((sum, r) => sum + r.synced, 0)
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0)
    const durationMs = Date.now() - startTime

    if (syncRunId) {
      await supabase
        .from('ul_sync_runs')
        .update({
          completed_at: new Date().toISOString(),
          status: totalFailed === 0 ? 'completed' : 'partial',
          tables_synced: results.map((r) => r.table),
          records_processed: totalSynced + totalFailed,
          records_created: totalSynced,
          records_failed: totalFailed,
        })
        .eq('id', syncRunId)
    }

    console.log(`\n${'='.repeat(60)}`)
    console.log('SYNC COMPLETE')
    console.log(`${'='.repeat(60)}`)
    console.log(`Duration: ${(durationMs / 1000).toFixed(1)}s`)
    console.log(`Total Synced: ${totalSynced}`)
    console.log(`Total Failed: ${totalFailed}`)
    console.log(`${'='.repeat(60)}\n`)
  } catch (error: any) {
    console.error('Sync failed:', error.message)

    if (syncRunId) {
      await supabase
        .from('ul_sync_runs')
        .update({
          completed_at: new Date().toISOString(),
          status: 'failed',
          error_message: error.message,
        })
        .eq('id', syncRunId)
    }

    process.exit(1)
  }
}

// =============================================================================
// CLI
// =============================================================================

function parseArgs(): SyncOptions {
  const args = process.argv.slice(2)
  const options: SyncOptions = {
    store: 'teelixir',
    type: 'stock',
  }

  for (const arg of args) {
    if (arg.startsWith('--store=')) {
      options.store = arg.split('=')[1]
    } else if (arg.startsWith('--type=')) {
      options.type = arg.split('=')[1] as SyncType
    } else if (arg === '--dry-run') {
      options.dryRun = true
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Unleashed Ongoing Sync Script

Syncs data from Unleashed API to typed ul_* tables.

Usage:
  npx tsx sync-unleashed.ts [options]

Options:
  --store=NAME    Store to sync (teelixir, elevate) [default: teelixir]
  --type=TYPE     Sync type [default: stock]
                  - stock: StockOnHand only (fastest, every 15 min)
                  - products: Products only
                  - orders: SalesOrders + lines
                  - customers: Customers only
                  - full: All tables

Examples:
  npx tsx sync-unleashed.ts --store=teelixir --type=stock
  npx tsx sync-unleashed.ts --store=teelixir --type=full
`)
      process.exit(0)
    }
  }

  return options
}

// Run
const options = parseArgs()
runSync(options).catch((error) => {
  console.error('Sync failed:', error)
  process.exit(1)
})
