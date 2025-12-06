#!/usr/bin/env npx tsx
/**
 * Unleashed Data Transformation Script
 *
 * Transforms raw discovery JSONB data into typed ul_* tables.
 * Run this after discovery to populate the typed schema.
 *
 * Usage:
 *   npx tsx teelixir/scripts/transform-unleashed-data.ts --store=teelixir
 *   npx tsx teelixir/scripts/transform-unleashed-data.ts --store=teelixir --table=Products
 *   npx tsx teelixir/scripts/transform-unleashed-data.ts --store=teelixir --dry-run
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: 'c:/Users/jayso/master-ops/.env' })

// =============================================================================
// Types
// =============================================================================

interface TransformOptions {
  store: string
  table?: string
  dryRun?: boolean
}

interface TransformResult {
  table: string
  processed: number
  created: number
  updated: number
  failed: number
  errors: string[]
}

// =============================================================================
// Date Parser
// =============================================================================

function parseUnleashedDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null

  // Handle /Date(timestamp)/ format
  const match = dateStr.match(/\/Date\((\d+)\)\//)
  if (match) {
    return new Date(parseInt(match[1]))
  }

  // Handle ISO date format
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
    return new Date(dateStr)
  }

  return null
}

// =============================================================================
// Transformers
// =============================================================================

async function transformProducts(
  supabase: SupabaseClient,
  store: string,
  dryRun: boolean
): Promise<TransformResult> {
  const result: TransformResult = {
    table: 'ul_products',
    processed: 0,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  }

  // Fetch raw discovery data
  const { data: pages } = await supabase
    .from('ul_raw_discovery')
    .select('raw_response')
    .eq('store', store)
    .eq('endpoint', 'Products')

  if (!pages) return result

  for (const page of pages) {
    const items = page.raw_response?.Items || []

    for (const item of items) {
      result.processed++

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
        created_on: parseUnleashedDate(item.CreatedOn),
        last_modified_by: item.LastModifiedBy,
        last_modified_on: parseUnleashedDate(item.LastModifiedOn),
        raw_data: item,
        synced_at: new Date(),
      }

      if (dryRun) {
        result.created++
        continue
      }

      const { error } = await supabase
        .from('ul_products')
        .upsert(record, { onConflict: 'store,guid' })

      if (error) {
        result.failed++
        result.errors.push(`${item.ProductCode}: ${error.message}`)
      } else {
        result.created++
      }
    }
  }

  return result
}

async function transformStockOnHand(
  supabase: SupabaseClient,
  store: string,
  dryRun: boolean
): Promise<TransformResult> {
  const result: TransformResult = {
    table: 'ul_stock_on_hand',
    processed: 0,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  }

  const { data: pages } = await supabase
    .from('ul_raw_discovery')
    .select('raw_response')
    .eq('store', store)
    .eq('endpoint', 'StockOnHand')

  if (!pages) return result

  for (const page of pages) {
    const items = page.raw_response?.Items || []

    for (const item of items) {
      result.processed++

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
        last_modified_on: parseUnleashedDate(item.LastModifiedOn),
        raw_data: item,
        synced_at: new Date(),
      }

      if (dryRun) {
        result.created++
        continue
      }

      const { error } = await supabase
        .from('ul_stock_on_hand')
        .upsert(record, { onConflict: 'store,product_guid,warehouse_guid' })

      if (error) {
        result.failed++
        result.errors.push(`${item.ProductCode}: ${error.message}`)
      } else {
        result.created++
      }
    }
  }

  return result
}

async function transformCustomers(
  supabase: SupabaseClient,
  store: string,
  dryRun: boolean
): Promise<TransformResult> {
  const result: TransformResult = {
    table: 'ul_customers',
    processed: 0,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  }

  const { data: pages } = await supabase
    .from('ul_raw_discovery')
    .select('raw_response')
    .eq('store', store)
    .eq('endpoint', 'Customers')

  if (!pages) return result

  for (const page of pages) {
    const items = page.raw_response?.Items || []

    for (const item of items) {
      result.processed++

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
        created_on: parseUnleashedDate(item.CreatedOn),
        last_modified_by: item.LastModifiedBy,
        last_modified_on: parseUnleashedDate(item.LastModifiedOn),
        raw_data: item,
        synced_at: new Date(),
      }

      if (dryRun) {
        result.created++
        continue
      }

      const { error } = await supabase.from('ul_customers').upsert(record, { onConflict: 'store,guid' })

      if (error) {
        result.failed++
        result.errors.push(`${item.CustomerCode}: ${error.message}`)
      } else {
        result.created++
      }
    }
  }

  return result
}

async function transformSalesOrders(
  supabase: SupabaseClient,
  store: string,
  dryRun: boolean
): Promise<TransformResult> {
  const result: TransformResult = {
    table: 'ul_sales_orders + ul_sales_order_lines',
    processed: 0,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  }

  const { data: pages } = await supabase
    .from('ul_raw_discovery')
    .select('raw_response')
    .eq('store', store)
    .eq('endpoint', 'SalesOrders')

  if (!pages) return result

  for (const page of pages) {
    const items = page.raw_response?.Items || []

    for (const item of items) {
      result.processed++

      const orderRecord = {
        store,
        guid: item.Guid,
        order_number: item.OrderNumber,
        order_status: item.OrderStatus,
        order_date: parseUnleashedDate(item.OrderDate),
        required_date: parseUnleashedDate(item.RequiredDate),
        payment_due_date: parseUnleashedDate(item.PaymentDueDate),
        completed_date: parseUnleashedDate(item.CompletedDate),
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
        created_on: parseUnleashedDate(item.CreatedOn),
        last_modified_by: item.LastModifiedBy,
        last_modified_on: parseUnleashedDate(item.LastModifiedOn),
        raw_data: item,
        synced_at: new Date(),
      }

      if (dryRun) {
        result.created++
        continue
      }

      // Upsert order
      const { data: order, error: orderError } = await supabase
        .from('ul_sales_orders')
        .upsert(orderRecord, { onConflict: 'store,guid' })
        .select('id')
        .single()

      if (orderError) {
        result.failed++
        result.errors.push(`${item.OrderNumber}: ${orderError.message}`)
        continue
      }

      result.created++

      // Insert order lines
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
          last_modified_on: parseUnleashedDate(line.LastModifiedOn),
          synced_at: new Date(),
        }

        await supabase.from('ul_sales_order_lines').upsert(lineRecord, { onConflict: 'store,guid' })
      }
    }
  }

  return result
}

async function transformInvoices(
  supabase: SupabaseClient,
  store: string,
  dryRun: boolean
): Promise<TransformResult> {
  const result: TransformResult = {
    table: 'ul_invoices + ul_invoice_lines',
    processed: 0,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  }

  const { data: pages } = await supabase
    .from('ul_raw_discovery')
    .select('raw_response')
    .eq('store', store)
    .eq('endpoint', 'Invoices')

  if (!pages) return result

  for (const page of pages) {
    const items = page.raw_response?.Items || []

    for (const item of items) {
      result.processed++

      const invoiceRecord = {
        store,
        guid: item.Guid,
        invoice_number: item.InvoiceNumber,
        order_number: item.OrderNumber,
        invoice_status: item.InvoiceStatus,
        invoice_date: parseUnleashedDate(item.InvoiceDate),
        due_date: parseUnleashedDate(item.DueDate),
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
        last_modified_on: parseUnleashedDate(item.LastModifiedOn),
        raw_data: item,
        synced_at: new Date(),
      }

      if (dryRun) {
        result.created++
        continue
      }

      const { data: invoice, error: invoiceError } = await supabase
        .from('ul_invoices')
        .upsert(invoiceRecord, { onConflict: 'store,guid' })
        .select('id')
        .single()

      if (invoiceError) {
        result.failed++
        result.errors.push(`${item.InvoiceNumber}: ${invoiceError.message}`)
        continue
      }

      result.created++

      // Insert invoice lines
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
          invoice_quantity: line.InvoiceQuantity || line.OrderQuantity || 0,
          unit_price: line.UnitPrice || 0,
          discount_rate: line.DiscountRate || 0,
          line_total: line.LineTotal || 0,
          line_tax: line.LineTax || 0,
          last_modified_on: parseUnleashedDate(line.LastModifiedOn),
          synced_at: new Date(),
        }

        await supabase.from('ul_invoice_lines').upsert(lineRecord, { onConflict: 'store,guid' })
      }
    }
  }

  return result
}

async function transformSuppliers(
  supabase: SupabaseClient,
  store: string,
  dryRun: boolean
): Promise<TransformResult> {
  const result: TransformResult = {
    table: 'ul_suppliers',
    processed: 0,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  }

  const { data: pages } = await supabase
    .from('ul_raw_discovery')
    .select('raw_response')
    .eq('store', store)
    .eq('endpoint', 'Suppliers')

  if (!pages) return result

  for (const page of pages) {
    const items = page.raw_response?.Items || []

    for (const item of items) {
      result.processed++

      const record = {
        store,
        guid: item.Guid,
        supplier_code: item.SupplierCode,
        supplier_name: item.SupplierName,
        email: item.Email,
        phone: item.PhoneNumber,
        mobile: item.MobileNumber,
        contact_name: item.ContactName,
        currency_guid: item.Currency?.Guid,
        currency_code: item.Currency?.CurrencyCode,
        obsolete: item.Obsolete ?? false,
        created_by: item.CreatedBy,
        created_on: parseUnleashedDate(item.CreatedOn),
        last_modified_by: item.LastModifiedBy,
        last_modified_on: parseUnleashedDate(item.LastModifiedOn),
        raw_data: item,
        synced_at: new Date(),
      }

      if (dryRun) {
        result.created++
        continue
      }

      const { error } = await supabase.from('ul_suppliers').upsert(record, { onConflict: 'store,guid' })

      if (error) {
        result.failed++
        result.errors.push(`${item.SupplierCode}: ${error.message}`)
      } else {
        result.created++
      }
    }
  }

  return result
}

async function transformPurchaseOrders(
  supabase: SupabaseClient,
  store: string,
  dryRun: boolean
): Promise<TransformResult> {
  const result: TransformResult = {
    table: 'ul_purchase_orders + ul_purchase_order_lines',
    processed: 0,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  }

  const { data: pages } = await supabase
    .from('ul_raw_discovery')
    .select('raw_response')
    .eq('store', store)
    .eq('endpoint', 'PurchaseOrders')

  if (!pages) return result

  for (const page of pages) {
    const items = page.raw_response?.Items || []

    for (const item of items) {
      result.processed++

      const poRecord = {
        store,
        guid: item.Guid,
        order_number: item.OrderNumber,
        order_status: item.OrderStatus,
        order_date: parseUnleashedDate(item.OrderDate),
        delivery_date: parseUnleashedDate(item.DeliveryDate),
        received_date: parseUnleashedDate(item.ReceivedDate),
        completed_date: parseUnleashedDate(item.CompletedDate),
        supplier_invoice_date: parseUnleashedDate(item.SupplierInvoiceDate),
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
        created_on: parseUnleashedDate(item.CreatedOn),
        last_modified_by: item.LastModifiedBy,
        last_modified_on: parseUnleashedDate(item.LastModifiedOn),
        raw_data: item,
        synced_at: new Date(),
      }

      if (dryRun) {
        result.created++
        continue
      }

      const { data: po, error: poError } = await supabase
        .from('ul_purchase_orders')
        .upsert(poRecord, { onConflict: 'store,guid' })
        .select('id')
        .single()

      if (poError) {
        result.failed++
        result.errors.push(`${item.OrderNumber}: ${poError.message}`)
        continue
      }

      result.created++

      // Insert PO lines
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
          last_modified_on: parseUnleashedDate(line.LastModifiedOn),
          synced_at: new Date(),
        }

        await supabase.from('ul_purchase_order_lines').upsert(lineRecord, { onConflict: 'store,guid' })
      }
    }
  }

  return result
}

async function transformWarehouses(
  supabase: SupabaseClient,
  store: string,
  dryRun: boolean
): Promise<TransformResult> {
  const result: TransformResult = {
    table: 'ul_warehouses',
    processed: 0,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  }

  const { data: pages } = await supabase
    .from('ul_raw_discovery')
    .select('raw_response')
    .eq('store', store)
    .eq('endpoint', 'Warehouses')

  if (!pages) return result

  for (const page of pages) {
    const items = page.raw_response?.Items || []

    for (const item of items) {
      result.processed++

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
        last_modified_on: parseUnleashedDate(item.LastModifiedOn),
        raw_data: item,
        synced_at: new Date(),
      }

      if (dryRun) {
        result.created++
        continue
      }

      const { error } = await supabase.from('ul_warehouses').upsert(record, { onConflict: 'store,guid' })

      if (error) {
        result.failed++
        result.errors.push(`${item.WarehouseCode}: ${error.message}`)
      } else {
        result.created++
      }
    }
  }

  return result
}

async function transformBillOfMaterials(
  supabase: SupabaseClient,
  store: string,
  dryRun: boolean
): Promise<TransformResult> {
  const result: TransformResult = {
    table: 'ul_bill_of_materials + ul_bom_lines',
    processed: 0,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  }

  const { data: pages } = await supabase
    .from('ul_raw_discovery')
    .select('raw_response')
    .eq('store', store)
    .eq('endpoint', 'BillOfMaterials')

  if (!pages) return result

  for (const page of pages) {
    const items = page.raw_response?.Items || []

    for (const item of items) {
      result.processed++

      const bomRecord = {
        store,
        product_guid: item.Product?.Guid || item.Guid,
        product_code: item.Product?.ProductCode,
        product_description: item.Product?.ProductDescription,
        created_on: parseUnleashedDate(item.CreatedOn),
        last_modified_on: parseUnleashedDate(item.LastModifiedOn),
        raw_data: item,
        synced_at: new Date(),
      }

      if (dryRun) {
        result.created++
        continue
      }

      const { data: bom, error: bomError } = await supabase
        .from('ul_bill_of_materials')
        .upsert(bomRecord, { onConflict: 'store,product_guid' })
        .select('id')
        .single()

      if (bomError) {
        result.failed++
        result.errors.push(`${item.Product?.ProductCode}: ${bomError.message}`)
        continue
      }

      result.created++

      // Insert BOM lines
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
          created_on: parseUnleashedDate(line.CreatedOn),
          last_modified_on: parseUnleashedDate(line.LastModifiedOn),
          synced_at: new Date(),
        }

        await supabase.from('ul_bom_lines').upsert(lineRecord, { onConflict: 'store,guid' })
      }
    }
  }

  return result
}

async function transformStockAdjustments(
  supabase: SupabaseClient,
  store: string,
  dryRun: boolean
): Promise<TransformResult> {
  const result: TransformResult = {
    table: 'ul_stock_adjustments',
    processed: 0,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  }

  const { data: pages } = await supabase
    .from('ul_raw_discovery')
    .select('raw_response')
    .eq('store', store)
    .eq('endpoint', 'StockAdjustments')

  if (!pages) return result

  for (const page of pages) {
    const items = page.raw_response?.Items || []

    for (const item of items) {
      result.processed++

      const record = {
        store,
        guid: item.Guid,
        adjustment_number: item.AdjustmentNumber,
        adjustment_reason: item.AdjustmentReason,
        adjustment_status: item.AdjustmentStatus,
        adjustment_date: parseUnleashedDate(item.AdjustmentDate),
        warehouse_guid: item.Warehouse?.Guid,
        warehouse_code: item.Warehouse?.WarehouseCode,
        created_by: item.CreatedBy,
        created_on: parseUnleashedDate(item.CreatedOn),
        last_modified_by: item.LastModifiedBy,
        last_modified_on: parseUnleashedDate(item.LastModifiedOn),
        raw_data: item,
        synced_at: new Date(),
      }

      if (dryRun) {
        result.created++
        continue
      }

      const { error } = await supabase.from('ul_stock_adjustments').upsert(record, { onConflict: 'store,guid' })

      if (error) {
        result.failed++
        result.errors.push(`${item.AdjustmentNumber}: ${error.message}`)
      } else {
        result.created++
      }
    }
  }

  return result
}

// =============================================================================
// Main Runner
// =============================================================================

const TABLE_TRANSFORMERS: Record<string, (s: SupabaseClient, store: string, dry: boolean) => Promise<TransformResult>> =
  {
    Products: transformProducts,
    StockOnHand: transformStockOnHand,
    Customers: transformCustomers,
    SalesOrders: transformSalesOrders,
    Invoices: transformInvoices,
    Suppliers: transformSuppliers,
    PurchaseOrders: transformPurchaseOrders,
    Warehouses: transformWarehouses,
    BillOfMaterials: transformBillOfMaterials,
    StockAdjustments: transformStockAdjustments,
  }

async function runTransform(options: TransformOptions): Promise<void> {
  const { store, table, dryRun = false } = options

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Unleashed Data Transformation - ${store}`)
  console.log(`${'='.repeat(60)}`)
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`Tables: ${table || 'ALL'}`)
  console.log(`${'='.repeat(60)}\n`)

  // Initialize Supabase
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Create sync run record
  let syncRunId: string | null = null
  if (!dryRun) {
    const { data: run } = await supabase
      .from('ul_sync_runs')
      .insert({
        store,
        sync_type: 'transform',
        status: 'running',
        tables_synced: [],
      })
      .select('id')
      .single()

    syncRunId = run?.id
  }

  // Determine which tables to transform
  const tablesToTransform = table ? [table] : Object.keys(TABLE_TRANSFORMERS)

  const results: TransformResult[] = []
  let totalProcessed = 0
  let totalCreated = 0
  let totalFailed = 0

  for (const tableName of tablesToTransform) {
    const transformer = TABLE_TRANSFORMERS[tableName]
    if (!transformer) {
      console.log(`Unknown table: ${tableName}`)
      continue
    }

    console.log(`\n[${tableName}]`)
    console.log('-'.repeat(40))

    const result = await transformer(supabase, store, dryRun)
    results.push(result)

    totalProcessed += result.processed
    totalCreated += result.created
    totalFailed += result.failed

    console.log(`  Processed: ${result.processed}`)
    console.log(`  Created/Updated: ${result.created}`)
    console.log(`  Failed: ${result.failed}`)

    if (result.errors.length > 0 && result.errors.length <= 5) {
      console.log(`  Errors:`)
      for (const err of result.errors) {
        console.log(`    - ${err}`)
      }
    } else if (result.errors.length > 5) {
      console.log(`  Errors: ${result.errors.length} (showing first 5)`)
      for (const err of result.errors.slice(0, 5)) {
        console.log(`    - ${err}`)
      }
    }
  }

  // Update sync run record
  if (!dryRun && syncRunId) {
    await supabase
      .from('ul_sync_runs')
      .update({
        completed_at: new Date().toISOString(),
        status: totalFailed === 0 ? 'completed' : 'partial',
        tables_synced: tablesToTransform,
        records_processed: totalProcessed,
        records_created: totalCreated,
        records_failed: totalFailed,
      })
      .eq('id', syncRunId)
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`)
  console.log('TRANSFORMATION SUMMARY')
  console.log(`${'='.repeat(60)}`)
  console.log(`Store: ${store}`)
  console.log(`Total Processed: ${totalProcessed.toLocaleString()}`)
  console.log(`Total Created/Updated: ${totalCreated.toLocaleString()}`)
  console.log(`Total Failed: ${totalFailed.toLocaleString()}`)
  console.log(`${'='.repeat(60)}\n`)
}

// =============================================================================
// CLI
// =============================================================================

function parseArgs(): TransformOptions {
  const args = process.argv.slice(2)
  const options: TransformOptions = {
    store: 'teelixir',
  }

  for (const arg of args) {
    if (arg.startsWith('--store=')) {
      options.store = arg.split('=')[1]
    } else if (arg.startsWith('--table=')) {
      options.table = arg.split('=')[1]
    } else if (arg === '--dry-run') {
      options.dryRun = true
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Unleashed Data Transformation Script

Transforms raw discovery JSONB data into typed ul_* tables.

Usage:
  npx tsx transform-unleashed-data.ts [options]

Options:
  --store=NAME    Store to transform (teelixir, elevate) [default: teelixir]
  --table=NAME    Specific table to transform [default: all]
  --dry-run       Preview without writing to database

Available Tables:
  ${Object.keys(TABLE_TRANSFORMERS).join(', ')}

Prerequisites:
  1. Run unleashed-discovery.ts first to populate ul_raw_discovery
  2. Deploy 20251206_unleashed_typed_tables.sql migration

Examples:
  npx tsx transform-unleashed-data.ts --store=teelixir
  npx tsx transform-unleashed-data.ts --store=teelixir --table=Products --dry-run
`)
      process.exit(0)
    }
  }

  return options
}

// Run
const options = parseArgs()
runTransform(options).catch((error) => {
  console.error('Transform failed:', error)
  process.exit(1)
})
