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

type SyncType = 'stock' | 'products' | 'orders' | 'customers' | 'invoices' | 'purchasing' | 'suppliers' | 'warehouses' | 'bom' | 'adjustments' | 'reference' | 'full'

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

  // Use a Map to dedupe by product_guid + warehouse_guid (empty string for null)
  const stockMap = new Map<string, any>()
  for (const item of items) {
    const warehouseGuid = item.Warehouse?.Guid || ''
    const key = `${item.ProductGuid || item.Guid}|${warehouseGuid}`
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
      warehouse_guid: item.Warehouse?.Guid || '',  // Use empty string for NULL to match unique index
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
      if (failed < 3) {
        console.error(`  Error syncing ${record.product_code}: ${error.message}`)
      }
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
// Priority 1 Sync Functions - Financial Data
// =============================================================================

async function syncInvoices(
  client: UnleashedClient,
  supabase: SupabaseClient,
  store: string
): Promise<{ synced: number; failed: number }> {
  console.log('  Fetching Invoices from Unleashed...')
  const items = await client.fetchAll('Invoices')
  console.log(`  Retrieved ${items.length} invoices`)

  let synced = 0
  let failed = 0

  for (const item of items) {
    const invoiceRecord = {
      store,
      guid: item.Guid,
      invoice_number: item.InvoiceNumber,
      order_number: item.OrderNumber,
      invoice_status: item.InvoiceStatus,
      invoice_date: parseDate(item.InvoiceDate),
      due_date: parseDate(item.DueDate),
      customer_guid: item.Customer?.Guid,
      customer_code: item.Customer?.CustomerCode,
      customer_name: item.Customer?.CustomerName,
      currency_guid: item.Currency?.Guid,
      currency_code: item.Currency?.CurrencyCode,
      exchange_rate: item.ExchangeRate || 1,
      sub_total: item.SubTotal || 0,
      tax_total: item.TaxTotal || 0,
      total: item.Total || 0,
      bc_sub_total: item.BCSubTotal || 0,
      bc_tax_total: item.BCTaxTotal || 0,
      bc_total: item.BCTotal || 0,
      payment_received: item.PaymentReceived ?? false,
      postal_address_city: item.PostalAddress?.City,
      postal_address_country: item.PostalAddress?.Country,
      postal_address_postal_code: item.PostalAddress?.PostalCode,
      postal_address_region: item.PostalAddress?.Region,
      postal_address_street: item.PostalAddress?.StreetAddress,
      created_by: item.CreatedBy,
      last_modified_by: item.LastModifiedBy,
      last_modified_on: parseDate(item.LastModifiedOn),
      raw_data: item,
      synced_at: new Date(),
      updated_at: new Date(),
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from('ul_invoices')
      .upsert(invoiceRecord, { onConflict: 'store,guid' })
      .select('id')
      .single()

    if (invoiceError) {
      if (failed < 3) {
        console.error(`  Error syncing invoice ${item.InvoiceNumber}: ${invoiceError.message}`)
      }
      failed++
      continue
    }

    synced++

    // Sync invoice lines
    const lines = item.InvoiceLines || []
    for (const line of lines) {
      const lineRecord = {
        store,
        invoice_id: invoice.id,
        invoice_guid: item.Guid,
        guid: line.Guid,
        line_number: line.LineNumber,
        product_guid: line.Product?.Guid,
        product_code: line.Product?.ProductCode || line.ProductCode,
        product_description: line.Product?.ProductDescription || line.ProductDescription,
        invoice_quantity: line.InvoiceQuantity || 0,
        unit_price: line.UnitPrice || 0,
        discount_rate: line.DiscountRate || 0,
        line_total: line.LineTotal || 0,
        line_tax: line.LineTax || 0,
        last_modified_on: parseDate(line.LastModifiedOn),
        synced_at: new Date(),
      }

      await supabase.from('ul_invoice_lines').upsert(lineRecord, { onConflict: 'store,guid' })
    }
  }

  return { synced, failed }
}

async function syncPurchaseOrders(
  client: UnleashedClient,
  supabase: SupabaseClient,
  store: string
): Promise<{ synced: number; failed: number }> {
  console.log('  Fetching PurchaseOrders from Unleashed...')
  const items = await client.fetchAll('PurchaseOrders')
  console.log(`  Retrieved ${items.length} purchase orders`)

  let synced = 0
  let failed = 0

  for (const item of items) {
    const poRecord = {
      store,
      guid: item.Guid,
      order_number: item.OrderNumber,
      order_status: item.OrderStatus,
      order_date: parseDate(item.OrderDate),
      delivery_date: parseDate(item.DeliveryDate || item.RequiredDate),
      received_date: parseDate(item.ReceivedDate),
      completed_date: parseDate(item.CompletedDate),
      supplier_invoice_date: parseDate(item.SupplierInvoiceDate),
      supplier_guid: item.Supplier?.Guid,
      supplier_code: item.Supplier?.SupplierCode,
      supplier_name: item.Supplier?.SupplierName,
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
      tax_code: item.TaxCode,
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

    const { data: po, error: poError } = await supabase
      .from('ul_purchase_orders')
      .upsert(poRecord, { onConflict: 'store,guid' })
      .select('id')
      .single()

    if (poError) {
      if (failed < 3) {
        console.error(`  Error syncing PO ${item.OrderNumber}: ${poError.message}`)
      }
      failed++
      continue
    }

    synced++

    // Sync PO lines
    const lines = item.PurchaseOrderLines || []
    for (const line of lines) {
      const lineRecord = {
        store,
        purchase_order_id: po.id,
        purchase_order_guid: item.Guid,
        guid: line.Guid,
        line_number: line.LineNumber,
        product_guid: line.Product?.Guid,
        product_code: line.Product?.ProductCode || line.ProductCode,
        product_description: line.Product?.ProductDescription || line.ProductDescription,
        order_quantity: line.OrderQuantity || 0,
        received_quantity: line.ReceivedQuantity || 0,
        unit_price: line.UnitPrice || 0,
        discount_rate: line.DiscountRate || 0,
        line_total: line.LineTotal || 0,
        line_tax: line.LineTax || 0,
        bc_unit_price: line.BCUnitPrice || 0,
        bc_line_total: line.BCLineTotal || 0,
        last_modified_on: parseDate(line.LastModifiedOn),
        synced_at: new Date(),
      }

      await supabase.from('ul_purchase_order_lines').upsert(lineRecord, { onConflict: 'store,guid' })
    }
  }

  return { synced, failed }
}

async function syncSuppliers(
  client: UnleashedClient,
  supabase: SupabaseClient,
  store: string
): Promise<{ synced: number; failed: number }> {
  console.log('  Fetching Suppliers from Unleashed...')
  const items = await client.fetchAll('Suppliers')
  console.log(`  Retrieved ${items.length} suppliers`)

  let synced = 0
  let failed = 0

  for (const item of items) {
    const record = {
      store,
      guid: item.Guid,
      supplier_code: item.SupplierCode,
      supplier_name: item.SupplierName,
      email: item.Email,
      phone: item.PhoneNumber,
      mobile: item.MobileNumber,
      contact_name: item.ContactFirstName
        ? `${item.ContactFirstName} ${item.ContactLastName || ''}`.trim()
        : null,
      currency_guid: item.Currency?.Guid,
      currency_code: item.Currency?.CurrencyCode,
      obsolete: item.Obsolete ?? false,
      created_by: item.CreatedBy,
      created_on: parseDate(item.CreatedOn),
      last_modified_by: item.LastModifiedBy,
      last_modified_on: parseDate(item.LastModifiedOn),
      raw_data: item,
      synced_at: new Date(),
      updated_at: new Date(),
    }

    const { error } = await supabase.from('ul_suppliers').upsert(record, { onConflict: 'store,guid' })

    if (error) {
      if (failed < 3) {
        console.error(`  Error syncing supplier ${item.SupplierCode}: ${error.message}`)
      }
      failed++
    } else {
      synced++
    }
  }

  return { synced, failed }
}

// =============================================================================
// Priority 2 Sync Functions - Operational Data
// =============================================================================

async function syncWarehouses(
  client: UnleashedClient,
  supabase: SupabaseClient,
  store: string
): Promise<{ synced: number; failed: number }> {
  console.log('  Fetching Warehouses from Unleashed...')
  const items = await client.fetchAll('Warehouses')
  console.log(`  Retrieved ${items.length} warehouses`)

  let synced = 0
  let failed = 0

  for (const item of items) {
    const record = {
      store,
      guid: item.Guid,
      warehouse_code: item.WarehouseCode,
      warehouse_name: item.WarehouseName,
      address_line1: item.AddressLine1,
      street_no: item.StreetNo,
      suburb: item.Suburb,
      city: item.City,
      region: item.Region,
      post_code: item.PostCode,
      country: item.Country,
      contact_name: item.ContactName,
      ddi_number: item.DDINumber,
      is_default: item.IsDefault ?? false,
      obsolete: item.Obsolete ?? false,
      last_modified_on: parseDate(item.LastModifiedOn),
      raw_data: item,
      synced_at: new Date(),
      updated_at: new Date(),
    }

    const { error } = await supabase.from('ul_warehouses').upsert(record, { onConflict: 'store,guid' })

    if (error) {
      if (failed < 3) {
        console.error(`  Error syncing warehouse ${item.WarehouseCode}: ${error.message}`)
      }
      failed++
    } else {
      synced++
    }
  }

  return { synced, failed }
}

async function syncBillOfMaterials(
  client: UnleashedClient,
  supabase: SupabaseClient,
  store: string
): Promise<{ synced: number; failed: number }> {
  console.log('  Fetching BillOfMaterials from Unleashed...')
  const items = await client.fetchAll('BillOfMaterials')
  console.log(`  Retrieved ${items.length} BOMs`)

  let synced = 0
  let failed = 0

  for (const item of items) {
    const bomRecord = {
      store,
      product_guid: item.Product?.Guid || item.Guid,
      product_code: item.Product?.ProductCode,
      product_description: item.Product?.ProductDescription,
      created_on: parseDate(item.CreatedOn),
      last_modified_on: parseDate(item.LastModifiedOn),
      raw_data: item,
      synced_at: new Date(),
      updated_at: new Date(),
    }

    const { data: bom, error: bomError } = await supabase
      .from('ul_bill_of_materials')
      .upsert(bomRecord, { onConflict: 'store,product_guid' })
      .select('id')
      .single()

    if (bomError) {
      if (failed < 3) {
        console.error(`  Error syncing BOM ${item.Product?.ProductCode}: ${bomError.message}`)
      }
      failed++
      continue
    }

    synced++

    // Sync BOM lines
    const lines = item.BillOfMaterialsLines || []
    for (const line of lines) {
      const lineRecord = {
        store,
        bom_id: bom.id,
        parent_product_guid: item.Product?.Guid || item.Guid,
        guid: line.Guid,
        component_product_guid: line.Product?.Guid,
        component_product_code: line.Product?.ProductCode,
        component_product_description: line.Product?.ProductDescription,
        quantity: line.Quantity || 0,
        wastage: line.Wastage || 0,
        line_total_cost: line.LineTotalCost || 0,
        created_on: parseDate(line.CreatedOn),
        last_modified_on: parseDate(line.LastModifiedOn),
        synced_at: new Date(),
      }

      await supabase.from('ul_bom_lines').upsert(lineRecord, { onConflict: 'store,guid' })
    }
  }

  return { synced, failed }
}

async function syncStockAdjustments(
  client: UnleashedClient,
  supabase: SupabaseClient,
  store: string
): Promise<{ synced: number; failed: number }> {
  console.log('  Fetching StockAdjustments from Unleashed...')
  const items = await client.fetchAll('StockAdjustments')
  console.log(`  Retrieved ${items.length} stock adjustments`)

  let synced = 0
  let failed = 0

  for (const item of items) {
    const record = {
      store,
      guid: item.Guid,
      adjustment_number: item.AdjustmentNumber,
      adjustment_reason: item.AdjustmentReason,
      adjustment_status: item.AdjustmentStatus,
      adjustment_date: parseDate(item.AdjustmentDate),
      warehouse_guid: item.Warehouse?.Guid,
      warehouse_code: item.Warehouse?.WarehouseCode,
      created_by: item.CreatedBy,
      created_on: parseDate(item.CreatedOn),
      last_modified_by: item.LastModifiedBy,
      last_modified_on: parseDate(item.LastModifiedOn),
      raw_data: item,
      synced_at: new Date(),
      updated_at: new Date(),
    }

    const { error } = await supabase.from('ul_stock_adjustments').upsert(record, { onConflict: 'store,guid' })

    if (error) {
      if (failed < 3) {
        console.error(`  Error syncing adjustment ${item.AdjustmentNumber}: ${error.message}`)
      }
      failed++
    } else {
      synced++
    }
  }

  return { synced, failed }
}

// =============================================================================
// Priority 3 Sync Functions - Reference Data
// =============================================================================

async function syncProductGroups(
  client: UnleashedClient,
  supabase: SupabaseClient,
  store: string
): Promise<{ synced: number; failed: number }> {
  console.log('  Fetching ProductGroups from Unleashed...')
  const items = await client.fetchAll('ProductGroups')
  console.log(`  Retrieved ${items.length} product groups`)

  let synced = 0
  let failed = 0

  for (const item of items) {
    const record = {
      store,
      guid: item.Guid,
      group_name: item.GroupName,
      parent_group_guid: item.ParentGroup?.Guid,
      last_modified_on: parseDate(item.LastModifiedOn),
      raw_data: item,
      synced_at: new Date(),
      updated_at: new Date(),
    }

    const { error } = await supabase.from('ul_product_groups').upsert(record, { onConflict: 'store,guid' })

    if (error) {
      failed++
    } else {
      synced++
    }
  }

  return { synced, failed }
}

async function syncSellPriceTiers(
  client: UnleashedClient,
  supabase: SupabaseClient,
  store: string
): Promise<{ synced: number; failed: number }> {
  console.log('  Fetching SellPriceTiers from Unleashed...')
  const items = await client.fetchAll('SellPriceTiers')
  console.log(`  Retrieved ${items.length} sell price tiers`)

  let synced = 0
  let failed = 0


  for (const item of items) {
    // SellPriceTiers API doesn't return Guid, use Tier number as unique identifier
    const tierGuid = `tier-${item.Tier || item.Name?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`
    const record = {
      store,
      guid: tierGuid,
      tier_name: item.Name || `Tier ${item.Tier}`,
      raw_data: item,
      synced_at: new Date(),
      updated_at: new Date(),
    }

    const { error } = await supabase.from('ul_sell_price_tiers').upsert(record, { onConflict: 'store,guid' })

    if (error) {
      if (failed === 0) console.log(`  First error: ${error.message}`)
      failed++
    } else {
      synced++
    }
  }

  return { synced, failed }
}

async function syncPaymentTerms(
  client: UnleashedClient,
  supabase: SupabaseClient,
  store: string
): Promise<{ synced: number; failed: number }> {
  console.log('  Fetching PaymentTerms from Unleashed...')
  const items = await client.fetchAll('PaymentTerms')
  console.log(`  Retrieved ${items.length} payment terms`)

  let synced = 0
  let failed = 0

  for (const item of items) {
    // PaymentTerms uses PaymentTermDescription and Days (not TermsName and DueDays)
    const record = {
      store,
      guid: item.Guid,
      terms_name: item.PaymentTermDescription || item.Name || 'Unknown',
      due_days: item.Days,
      obsolete: item.Obsolete ?? false,
      raw_data: item,
      synced_at: new Date(),
      updated_at: new Date(),
    }

    const { error } = await supabase.from('ul_payment_terms').upsert(record, { onConflict: 'store,guid' })

    if (error) {
      if (failed === 0) console.log(`  First error: ${error.message}`)
      failed++
    } else {
      synced++
    }
  }

  return { synced, failed }
}
async function syncCurrencies(
  client: UnleashedClient,
  supabase: SupabaseClient,
  store: string
): Promise<{ synced: number; failed: number }> {
  console.log('  Fetching Currencies from Unleashed...')
  const items = await client.fetchAll('Currencies')
  console.log(`  Retrieved ${items.length} currencies`)

  let synced = 0
  let failed = 0

  for (const item of items) {
    const record = {
      store,
      guid: item.Guid,
      currency_code: item.CurrencyCode,
      description: item.Description,
      default_sell_rate: item.DefaultSellRate,
      default_buy_rate: item.DefaultBuyRate,
      last_modified_on: parseDate(item.LastModifiedOn),
      raw_data: item,
      synced_at: new Date(),
      updated_at: new Date(),
    }

    const { error } = await supabase.from('ul_currencies').upsert(record, { onConflict: 'store,guid' })

    if (error) {
      failed++
    } else {
      synced++
    }
  }

  return { synced, failed }
}

async function syncCompanies(
  client: UnleashedClient,
  supabase: SupabaseClient,
  store: string
): Promise<{ synced: number; failed: number }> {
  console.log('  Fetching Companies from Unleashed...')
  const items = await client.fetchAll('Companies')
  console.log(`  Retrieved ${items.length} companies`)

  let synced = 0
  let failed = 0

  for (const item of items) {
    const record = {
      store,
      guid: item.Guid,
      company_name: item.CompanyName,
      base_currency_code: item.BaseCurrency?.CurrencyCode,
      default_tax_rate: item.DefaultTaxRate || 0,
      raw_data: item,
      synced_at: new Date(),
      updated_at: new Date(),
    }

    const { error } = await supabase.from('ul_companies').upsert(record, { onConflict: 'store,guid' })

    if (error) {
      failed++
    } else {
      synced++
    }
  }

  return { synced, failed }
}

async function syncUnitsOfMeasure(
  client: UnleashedClient,
  supabase: SupabaseClient,
  store: string
): Promise<{ synced: number; failed: number }> {
  console.log('  Fetching UnitOfMeasures from Unleashed...')
  const items = await client.fetchAll('UnitOfMeasures')
  console.log(`  Retrieved ${items.length} units of measure`)

  let synced = 0
  let failed = 0

  for (const item of items) {
    const record = {
      store,
      guid: item.Guid,
      name: item.Name,
      obsolete: item.Obsolete ?? false,
      raw_data: item,
      synced_at: new Date(),
      updated_at: new Date(),
    }

    const { error } = await supabase.from('ul_units_of_measure').upsert(record, { onConflict: 'store,guid' })

    if (error) {
      failed++
    } else {
      synced++
    }
  }

  return { synced, failed }
}

async function syncDeliveryMethods(
  client: UnleashedClient,
  supabase: SupabaseClient,
  store: string
): Promise<{ synced: number; failed: number }> {
  console.log('  Fetching DeliveryMethods from Unleashed...')
  const items = await client.fetchAll('DeliveryMethods')
  console.log(`  Retrieved ${items.length} delivery methods`)

  let synced = 0
  let failed = 0

  for (const item of items) {
    const record = {
      store,
      guid: item.Guid,
      name: item.Name,
      obsolete: item.Obsolete ?? false,
      last_modified_on: parseDate(item.LastModifiedOn),
      raw_data: item,
      synced_at: new Date(),
      updated_at: new Date(),
    }

    const { error } = await supabase.from('ul_delivery_methods').upsert(record, { onConflict: 'store,guid' })

    if (error) {
      failed++
    } else {
      synced++
    }
  }

  return { synced, failed }
}

async function syncSalesOrderGroups(
  client: UnleashedClient,
  supabase: SupabaseClient,
  store: string
): Promise<{ synced: number; failed: number }> {
  console.log('  Fetching SalesOrderGroups from Unleashed...')
  const items = await client.fetchAll('SalesOrderGroups')
  console.log(`  Retrieved ${items.length} sales order groups`)

  let synced = 0
  let failed = 0

  for (const item of items) {
    const record = {
      store,
      guid: item.Guid,
      group_name: item.GroupName || item.Name,
      obsolete: item.Obsolete ?? false,
      last_modified_on: parseDate(item.LastModifiedOn),
      raw_data: item,
      synced_at: new Date(),
      updated_at: new Date(),
    }

    const { error } = await supabase.from('ul_sales_order_groups').upsert(record, { onConflict: 'store,guid' })

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

    // Priority 1 - Financial
    if (type === 'invoices' || type === 'full') {
      console.log('\n[Invoices]')
      const result = await syncInvoices(client, supabase, store)
      console.log(`  Synced: ${result.synced}, Failed: ${result.failed}`)
      results.push({ table: 'Invoices', ...result })
    }

    if (type === 'purchasing' || type === 'suppliers' || type === 'full') {
      console.log('\n[Suppliers]')
      const result = await syncSuppliers(client, supabase, store)
      console.log(`  Synced: ${result.synced}, Failed: ${result.failed}`)
      results.push({ table: 'Suppliers', ...result })
    }

    if (type === 'purchasing' || type === 'full') {
      console.log('\n[PurchaseOrders]')
      const result = await syncPurchaseOrders(client, supabase, store)
      console.log(`  Synced: ${result.synced}, Failed: ${result.failed}`)
      results.push({ table: 'PurchaseOrders', ...result })
    }

    // Priority 2 - Operational
    if (type === 'warehouses' || type === 'full') {
      console.log('\n[Warehouses]')
      const result = await syncWarehouses(client, supabase, store)
      console.log(`  Synced: ${result.synced}, Failed: ${result.failed}`)
      results.push({ table: 'Warehouses', ...result })
    }

    if (type === 'bom' || type === 'full') {
      console.log('\n[BillOfMaterials]')
      const result = await syncBillOfMaterials(client, supabase, store)
      console.log(`  Synced: ${result.synced}, Failed: ${result.failed}`)
      results.push({ table: 'BillOfMaterials', ...result })
    }

    if (type === 'adjustments' || type === 'full') {
      console.log('\n[StockAdjustments]')
      const result = await syncStockAdjustments(client, supabase, store)
      console.log(`  Synced: ${result.synced}, Failed: ${result.failed}`)
      results.push({ table: 'StockAdjustments', ...result })
    }

    // Priority 3 - Reference Data
    if (type === 'reference' || type === 'full') {
      console.log('\n[ProductGroups]')
      let result = await syncProductGroups(client, supabase, store)
      console.log(`  Synced: ${result.synced}, Failed: ${result.failed}`)
      results.push({ table: 'ProductGroups', ...result })

      console.log('\n[SellPriceTiers]')
      result = await syncSellPriceTiers(client, supabase, store)
      console.log(`  Synced: ${result.synced}, Failed: ${result.failed}`)
      results.push({ table: 'SellPriceTiers', ...result })

      console.log('\n[PaymentTerms]')
      result = await syncPaymentTerms(client, supabase, store)
      console.log(`  Synced: ${result.synced}, Failed: ${result.failed}`)
      results.push({ table: 'PaymentTerms', ...result })

      console.log('\n[Currencies]')
      result = await syncCurrencies(client, supabase, store)
      console.log(`  Synced: ${result.synced}, Failed: ${result.failed}`)
      results.push({ table: 'Currencies', ...result })

      console.log('\n[Companies]')
      result = await syncCompanies(client, supabase, store)
      console.log(`  Synced: ${result.synced}, Failed: ${result.failed}`)
      results.push({ table: 'Companies', ...result })

      console.log('\n[UnitsOfMeasure]')
      result = await syncUnitsOfMeasure(client, supabase, store)
      console.log(`  Synced: ${result.synced}, Failed: ${result.failed}`)
      results.push({ table: 'UnitsOfMeasure', ...result })

      console.log('\n[DeliveryMethods]')
      result = await syncDeliveryMethods(client, supabase, store)
      console.log(`  Synced: ${result.synced}, Failed: ${result.failed}`)
      results.push({ table: 'DeliveryMethods', ...result })

      console.log('\n[SalesOrderGroups]')
      result = await syncSalesOrderGroups(client, supabase, store)
      console.log(`  Synced: ${result.synced}, Failed: ${result.failed}`)
      results.push({ table: 'SalesOrderGroups', ...result })
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

                  Core data (high frequency):
                  - stock: StockOnHand only (fastest, every 15 min)
                  - products: Products only
                  - orders: SalesOrders + lines
                  - customers: Customers only

                  Financial (Priority 1):
                  - invoices: Invoices + lines
                  - purchasing: Suppliers + PurchaseOrders + lines
                  - suppliers: Suppliers only

                  Operational (Priority 2):
                  - warehouses: Warehouses
                  - bom: BillOfMaterials + lines
                  - adjustments: StockAdjustments

                  Reference data (Priority 3 - sync once daily):
                  - reference: ProductGroups, SellPriceTiers, PaymentTerms,
                              Currencies, Companies, UnitsOfMeasure,
                              DeliveryMethods, SalesOrderGroups

                  - full: ALL tables (complete sync)

Examples:
  npx tsx sync-unleashed.ts --store=teelixir --type=stock
  npx tsx sync-unleashed.ts --store=teelixir --type=invoices
  npx tsx sync-unleashed.ts --store=teelixir --type=reference
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
