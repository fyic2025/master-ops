/**
 * Order Store - Supabase-based order storage with Unleashed sync
 *
 * Workflow:
 * 1. Pull order from Unleashed → Store in Supabase
 * 2. Edit order in Supabase (source of truth)
 * 3. Push to Unleashed via delete → create
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { UnleashedClient, SalesOrder, SalesOrderLine, parseUnleashedDate } from './unleashed-api.js'
import { loadConfig } from './config.js'

// Types for Supabase records
export interface StoredOrder {
  id?: string
  store: string
  unleashed_guid?: string
  order_number: string
  order_date: string
  required_date?: string
  order_status: string
  customer_code: string
  customer_name?: string
  customer_guid?: string
  delivery_name?: string
  delivery_address1?: string
  delivery_address2?: string
  delivery_suburb?: string
  delivery_city?: string
  delivery_region?: string
  delivery_country?: string
  delivery_postcode?: string
  delivery_contact_name?: string
  delivery_contact_email?: string
  delivery_contact_phone?: string
  currency_code: string
  exchange_rate: number
  tax_code: string
  subtotal: number
  tax_total: number
  total: number
  comments?: string
  warehouse_code?: string
  warehouse_guid?: string
  external_reference?: string
  synced_at?: string
  sync_status: string
  sync_error?: string
  created_at?: string
  updated_at?: string
}

export interface StoredOrderLine {
  id?: string
  order_id: string
  line_guid?: string
  line_number?: number
  product_code: string
  product_guid?: string
  product_description?: string
  order_quantity: number
  unit_price: number
  discount_rate: number
  line_total?: number
  comments?: string
  due_date?: string
}

export class OrderStore {
  private supabase: SupabaseClient
  private unleashed: UnleashedClient

  constructor(store: string = 'teelixir') {
    const config = loadConfig()

    this.supabase = createClient(
      config.supabase.url || 'https://qcvfxxsnqvdfmpbcgdni.supabase.co',
      config.supabase.serviceRoleKey || process.env.SUPABASE_SERVICE_KEY || ''
    )

    this.unleashed = UnleashedClient.fromStore(store)
  }

  /**
   * Pull an order from Unleashed and store in Supabase
   */
  async pullOrder(orderNumber: string): Promise<StoredOrder | null> {
    console.log(`Pulling ${orderNumber} from Unleashed...`)

    const unleashedOrder = await this.unleashed.getSalesOrder(orderNumber)
    if (!unleashedOrder) {
      console.log(`Order not found in Unleashed: ${orderNumber}`)
      return null
    }

    // Convert to stored format
    const storedOrder = this.convertFromUnleashed(unleashedOrder)

    // Upsert order
    const { data: order, error: orderError } = await this.supabase
      .from('unleashed_orders')
      .upsert(storedOrder, { onConflict: 'unleashed_guid' })
      .select()
      .single()

    if (orderError) {
      throw new Error(`Failed to store order: ${orderError.message}`)
    }

    // Delete existing lines and insert new ones
    await this.supabase
      .from('unleashed_order_lines')
      .delete()
      .eq('order_id', order.id)

    // Filter out charge lines (freight, etc) that have no product code
    const productLines = unleashedOrder.SalesOrderLines.filter(
      line => line.Product?.ProductCode && line.LineType !== 'Charge'
    )

    const lines = productLines.map(line => ({
      order_id: order.id,
      line_guid: line.Guid,
      line_number: line.LineNumber,
      product_code: line.Product.ProductCode,
      product_guid: line.Product.Guid,
      product_description: line.Product.ProductDescription,
      order_quantity: line.OrderQuantity,
      unit_price: line.UnitPrice,
      discount_rate: line.DiscountRate || 0,
      line_total: line.LineTotal,
      comments: line.Comments,
      due_date: line.DueDate ? parseUnleashedDate(line.DueDate).toISOString() : null,
    }))

    if (lines.length > 0) {
      const { error: linesError } = await this.supabase
        .from('unleashed_order_lines')
        .insert(lines)

      if (linesError) {
        throw new Error(`Failed to store order lines: ${linesError.message}`)
      }
    }

    console.log(`✅ Stored ${orderNumber} with ${lines.length} lines`)
    return order
  }

  /**
   * Get order from Supabase
   */
  async getOrder(orderNumber: string): Promise<{ order: StoredOrder; lines: StoredOrderLine[] } | null> {
    const { data: order, error } = await this.supabase
      .from('unleashed_orders')
      .select('*')
      .eq('order_number', orderNumber)
      .single()

    if (error || !order) return null

    const { data: lines } = await this.supabase
      .from('unleashed_order_lines')
      .select('*')
      .eq('order_id', order.id)
      .order('line_number')

    return { order, lines: lines || [] }
  }

  /**
   * Update order in Supabase (edit locally)
   */
  async updateOrder(orderNumber: string, updates: Partial<StoredOrder>): Promise<StoredOrder> {
    const { data, error } = await this.supabase
      .from('unleashed_orders')
      .update({ ...updates, sync_status: 'pending' })
      .eq('order_number', orderNumber)
      .select()
      .single()

    if (error) throw new Error(`Failed to update order: ${error.message}`)
    return data
  }

  /**
   * Add line to order in Supabase
   */
  async addLine(orderNumber: string, line: Omit<StoredOrderLine, 'id' | 'order_id'>): Promise<StoredOrderLine> {
    const { order } = await this.getOrder(orderNumber) || {}
    if (!order?.id) throw new Error(`Order not found: ${orderNumber}`)

    // Calculate line total
    const discountedPrice = line.unit_price * (1 - (line.discount_rate || 0))
    const lineTotal = Math.round(line.order_quantity * discountedPrice * 100) / 100

    const { data, error } = await this.supabase
      .from('unleashed_order_lines')
      .insert({ ...line, order_id: order.id, line_total: lineTotal })
      .select()
      .single()

    if (error) throw new Error(`Failed to add line: ${error.message}`)

    // Mark order as needing sync
    await this.updateOrderTotals(order.id)

    return data
  }

  /**
   * Remove line from order in Supabase
   */
  async removeLine(orderNumber: string, productCode: string): Promise<void> {
    const { order, lines } = await this.getOrder(orderNumber) || {}
    if (!order?.id) throw new Error(`Order not found: ${orderNumber}`)

    const line = lines?.find(l => l.product_code === productCode)
    if (!line) throw new Error(`Product not found in order: ${productCode}`)

    const { error } = await this.supabase
      .from('unleashed_order_lines')
      .delete()
      .eq('id', line.id)

    if (error) throw new Error(`Failed to remove line: ${error.message}`)

    await this.updateOrderTotals(order.id)
  }

  /**
   * Update line quantity in Supabase
   */
  async updateLineQty(orderNumber: string, productCode: string, quantity: number): Promise<void> {
    const { order, lines } = await this.getOrder(orderNumber) || {}
    if (!order?.id) throw new Error(`Order not found: ${orderNumber}`)

    const line = lines?.find(l => l.product_code === productCode)
    if (!line) throw new Error(`Product not found in order: ${productCode}`)

    const discountedPrice = line.unit_price * (1 - (line.discount_rate || 0))
    const lineTotal = Math.round(quantity * discountedPrice * 100) / 100

    const { error } = await this.supabase
      .from('unleashed_order_lines')
      .update({ order_quantity: quantity, line_total: lineTotal })
      .eq('id', line.id)

    if (error) throw new Error(`Failed to update line: ${error.message}`)

    await this.updateOrderTotals(order.id)
  }

  /**
   * Recalculate and update order totals
   */
  private async updateOrderTotals(orderId: string): Promise<void> {
    const { data: lines } = await this.supabase
      .from('unleashed_order_lines')
      .select('line_total')
      .eq('order_id', orderId)

    const subtotal = (lines || []).reduce((sum, l) => sum + (l.line_total || 0), 0)

    await this.supabase
      .from('unleashed_orders')
      .update({
        subtotal: Math.round(subtotal * 100) / 100,
        total: Math.round(subtotal * 100) / 100,
        sync_status: 'pending'
      })
      .eq('id', orderId)
  }

  /**
   * Push order to Unleashed (create new first, then delete old)
   * Safe approach: only deletes old order after new one is confirmed working
   */
  async pushOrder(orderNumber: string): Promise<SalesOrder> {
    const stored = await this.getOrder(orderNumber)
    if (!stored) throw new Error(`Order not found in Supabase: ${orderNumber}`)

    const { order, lines } = stored
    const oldGuid = order.unleashed_guid

    // Step 1: Create new order in Unleashed FIRST
    console.log(`Creating new order in Unleashed...`)
    const newOrder = this.convertToUnleashed(order, lines)
    const created = await this.unleashed.createSalesOrder(newOrder)

    console.log(`✅ Created ${created.OrderNumber} in Unleashed`)

    // Step 2: Update Supabase with new GUID
    await this.supabase
      .from('unleashed_orders')
      .update({
        unleashed_guid: created.Guid,
        order_number: created.OrderNumber || order.order_number,
        synced_at: new Date().toISOString(),
        sync_status: 'synced',
        sync_error: null
      })
      .eq('id', order.id)

    // Step 3: Delete old order from Unleashed (only after new one confirmed)
    if (oldGuid) {
      console.log(`\nNew order confirmed. Marking old ${orderNumber} as Deleted...`)
      try {
        await this.unleashed.updateOrderStatus(oldGuid, 'Deleted')
        console.log(`  ✅ Old order marked as Deleted`)
      } catch (e) {
        console.log(`  ⚠️ Could not delete old order: ${(e as Error).message}`)
        console.log(`  You may need to manually delete ${orderNumber} (GUID: ${oldGuid})`)
      }
    }

    return created
  }

  /**
   * Convert Unleashed order to Supabase format
   */
  private convertFromUnleashed(order: SalesOrder): Partial<StoredOrder> {
    return {
      store: 'teelixir',
      unleashed_guid: order.Guid,
      order_number: order.OrderNumber || '',
      order_date: order.OrderDate ? parseUnleashedDate(order.OrderDate).toISOString() : new Date().toISOString(),
      required_date: order.RequiredDate ? parseUnleashedDate(order.RequiredDate).toISOString() : undefined,
      order_status: order.OrderStatus,
      customer_code: order.Customer.CustomerCode,
      customer_name: order.Customer.CustomerName,
      customer_guid: order.Customer.Guid,
      delivery_name: order.DeliveryName,
      delivery_address1: order.DeliveryStreetAddress,
      delivery_address2: order.DeliveryStreetAddress2,
      delivery_suburb: order.DeliverySuburb,
      delivery_city: order.DeliveryCity,
      delivery_region: order.DeliveryRegion,
      delivery_country: order.DeliveryCountry,
      delivery_postcode: order.DeliveryPostCode,
      delivery_contact_name: order.DeliveryContact?.FirstName,
      delivery_contact_email: order.DeliveryContact?.EmailAddress,
      currency_code: order.Currency?.CurrencyCode || 'AUD',
      exchange_rate: order.ExchangeRate || 1,
      tax_code: order.Tax?.TaxCode || 'NONE',
      subtotal: order.SubTotal || 0,
      tax_total: order.TaxTotal || 0,
      total: order.Total || 0,
      comments: order.Comments,
      warehouse_code: order.Warehouse?.WarehouseCode,
      warehouse_guid: order.Warehouse?.Guid,
      synced_at: new Date().toISOString(),
      sync_status: 'synced',
    }
  }

  /**
   * Convert Supabase order to Unleashed format
   */
  private convertToUnleashed(order: StoredOrder, lines: StoredOrderLine[]): Partial<SalesOrder> {
    return {
      OrderDate: order.order_date,
      RequiredDate: order.required_date || order.order_date,
      OrderStatus: order.order_status as any,
      Customer: {
        CustomerCode: order.customer_code,
        Guid: order.customer_guid,
      },
      DeliveryName: order.delivery_name,
      DeliveryStreetAddress: order.delivery_address1,
      DeliveryStreetAddress2: order.delivery_address2,
      DeliverySuburb: order.delivery_suburb,
      DeliveryCity: order.delivery_city,
      DeliveryRegion: order.delivery_region,
      DeliveryCountry: order.delivery_country,
      DeliveryPostCode: order.delivery_postcode,
      Currency: { CurrencyCode: order.currency_code },
      ExchangeRate: order.exchange_rate,
      Tax: { TaxCode: order.tax_code },
      Warehouse: order.warehouse_guid ? { Guid: order.warehouse_guid, WarehouseCode: order.warehouse_code || 'W1' } : undefined,
      Comments: order.comments,
      SubTotal: order.subtotal,
      TaxTotal: order.tax_total,
      Total: order.total,
      SalesOrderLines: lines.map((line, idx) => ({
        LineNumber: idx + 1,
        Product: {
          ProductCode: line.product_code,
          Guid: line.product_guid,
        },
        OrderQuantity: line.order_quantity,
        UnitPrice: line.unit_price,
        DiscountRate: line.discount_rate,
        LineTotal: line.line_total,
        Comments: line.comments,
      })) as SalesOrderLine[],
    }
  }

  /**
   * List orders in Supabase
   */
  async listOrders(options: { status?: string; limit?: number } = {}): Promise<StoredOrder[]> {
    let query = this.supabase
      .from('unleashed_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(options.limit || 50)

    if (options.status) {
      query = query.eq('sync_status', options.status)
    }

    const { data, error } = await query
    if (error) throw new Error(`Failed to list orders: ${error.message}`)
    return data || []
  }
}
