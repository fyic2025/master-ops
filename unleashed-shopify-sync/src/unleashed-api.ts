/**
 * Unleashed API Client
 *
 * Full CRUD operations for Sales Orders, Customers, and Products
 * Standalone module - no Shopify dependencies
 */

import * as crypto from 'crypto'
import { getStoreConfig } from './config.js'

// ============================================================================
// Date Helpers (Unleashed uses /Date(timestamp)/ format)
// ============================================================================

/**
 * Convert Unleashed date format to ISO string
 */
function convertUnleashedDate(dateStr: string | undefined): string | undefined {
  if (!dateStr) return undefined
  const match = dateStr.match(/\/Date\((\d+)\)\//)
  if (match) {
    return new Date(parseInt(match[1])).toISOString()
  }
  return dateStr
}

/**
 * Clean order lines for API submission (convert dates, include LineTotal)
 */
function cleanOrderLinesForUpdate(lines: SalesOrderLine[]): Partial<SalesOrderLine>[] {
  return lines.map(line => ({
    Guid: line.Guid,
    LineNumber: line.LineNumber,
    LineType: line.LineType,
    Product: {
      Guid: line.Product.Guid,
      ProductCode: line.Product.ProductCode,
    },
    OrderQuantity: line.OrderQuantity,
    UnitPrice: line.UnitPrice,
    DiscountRate: line.DiscountRate || 0,
    LineTotal: line.LineTotal,
    Comments: line.Comments,
    DueDate: convertUnleashedDate(line.DueDate),
  }))
}

/**
 * Recursively clean dates in an object (convert /Date(xxx)/ to ISO format)
 */
function cleanDatesInObject(obj: any): any {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'string') {
    const match = obj.match(/\/Date\((\d+)\)\//)
    if (match) return new Date(parseInt(match[1])).toISOString()
    return obj
  }
  if (Array.isArray(obj)) return obj.map(cleanDatesInObject)
  if (typeof obj === 'object') {
    const cleaned: any = {}
    for (const [key, value] of Object.entries(obj)) {
      // Skip LastModifiedOn fields entirely - they cause issues
      if (key === 'LastModifiedOn') continue
      cleaned[key] = cleanDatesInObject(value)
    }
    return cleaned
  }
  return obj
}

/**
 * Prepare full order payload for update - sends complete order with cleaned dates
 */
function prepareOrderForUpdate(order: SalesOrder, newLines: SalesOrderLine[]): Partial<SalesOrder> {
  // Calculate new subtotal from line totals
  const subTotal = newLines.reduce((sum, line) => sum + (line.LineTotal || 0), 0)
  const roundedSubTotal = Math.round(subTotal * 100) / 100

  // Clone and clean the entire order, then update lines and totals
  const cleaned = cleanDatesInObject(order) as SalesOrder
  cleaned.SalesOrderLines = cleanOrderLinesForUpdate(newLines) as SalesOrderLine[]
  cleaned.SubTotal = roundedSubTotal
  cleaned.Total = roundedSubTotal

  return cleaned
}

// ============================================================================
// Types
// ============================================================================

export interface UnleashedConfig {
  apiId: string
  apiKey: string
  apiUrl: string
}

export interface SalesOrder {
  Guid?: string
  OrderNumber?: string
  OrderDate: string
  RequiredDate: string
  OrderStatus: 'Open' | 'Parked' | 'Placed' | 'Completed' | 'Deleted'
  Customer: {
    CustomerCode: string
    CustomerName?: string
    Guid?: string
  }
  CustomerRef?: string
  Comments?: string
  Warehouse?: {
    WarehouseCode: string
    WarehouseName?: string
    Guid?: string
  }
  DeliveryName?: string
  DeliveryStreetAddress?: string
  DeliveryStreetAddress2?: string
  DeliverySuburb?: string
  DeliveryCity?: string
  DeliveryRegion?: string
  DeliveryCountry?: string
  DeliveryPostCode?: string
  DeliveryContact?: {
    FirstName?: string
    LastName?: string
    EmailAddress?: string
    PhoneNumber?: string
  }
  Currency?: {
    CurrencyCode: string
  }
  ExchangeRate?: number
  DiscountRate?: number
  Tax?: {
    TaxCode: string
  }
  SalesOrderLines: SalesOrderLine[]
  SubTotal?: number
  TaxTotal?: number
  Total?: number
}

export interface SalesOrderLine {
  Guid?: string
  LineNumber?: number
  LineType?: string | null
  Product: {
    Guid?: string
    ProductCode: string
    ProductDescription?: string
  }
  OrderQuantity: number
  UnitPrice: number
  DiscountRate?: number
  LineTotal?: number
  Comments?: string
  DueDate?: string
}

export interface Customer {
  Guid?: string
  CustomerCode: string
  CustomerName: string
  Email?: string
  ContactName?: string
  Address1?: string
  Address2?: string
  City?: string
  Region?: string
  PostalCode?: string
  Country?: string
  PhoneNumber?: string
}

export interface Product {
  Guid: string
  ProductCode: string
  ProductDescription: string
  Barcode?: string
  DefaultSellPrice?: number
  LastCost?: number
}

export interface ApiResponse<T> {
  Pagination?: {
    NumberOfItems: number
    PageSize: number
    PageNumber: number
    NumberOfPages: number
  }
  Items: T[]
}

// ============================================================================
// API Client Class
// ============================================================================

export class UnleashedClient {
  private config: UnleashedConfig

  constructor(config: UnleashedConfig) {
    this.config = config
  }

  /**
   * Create client from store name (teelixir, elevate)
   */
  static fromStore(storeName: string): UnleashedClient {
    const storeConfig = getStoreConfig(storeName)
    if (!storeConfig) {
      throw new Error(`Store not found: ${storeName}`)
    }
    return new UnleashedClient(storeConfig.unleashed)
  }

  /**
   * Generate HMAC-SHA256 signature for API authentication
   */
  private sign(queryString: string): string {
    return crypto
      .createHmac('sha256', this.config.apiKey)
      .update(queryString)
      .digest('base64')
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    queryString: string = '',
    body?: any
  ): Promise<T> {
    const url = queryString
      ? `${this.config.apiUrl}/${endpoint}?${queryString}`
      : `${this.config.apiUrl}/${endpoint}`

    const signature = this.sign(queryString)

    const response = await fetch(url, {
      method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-auth-id': this.config.apiId,
        'api-auth-signature': signature,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Unleashed API error (${response.status}): ${errorText}`)
    }

    return response.json() as Promise<T>
  }

  // ==========================================================================
  // Sales Orders
  // ==========================================================================

  /**
   * Get sales order by order number (e.g., "SO-00002264")
   */
  async getSalesOrder(orderNumber: string): Promise<SalesOrder | null> {
    const query = `orderNumber=${encodeURIComponent(orderNumber)}`
    const response = await this.request<ApiResponse<SalesOrder>>('GET', 'SalesOrders', query)
    return response.Items.length > 0 ? response.Items[0] : null
  }

  /**
   * Get sales order by GUID
   */
  async getSalesOrderByGuid(guid: string): Promise<SalesOrder | null> {
    try {
      const response = await this.request<SalesOrder>('GET', `SalesOrders/${guid}`, '')
      return response
    } catch {
      return null
    }
  }

  /**
   * List sales orders with optional filters
   */
  async listSalesOrders(options: {
    startDate?: Date
    endDate?: Date
    orderStatus?: string
    customerCode?: string
    pageSize?: number
    page?: number
  } = {}): Promise<ApiResponse<SalesOrder>> {
    const params: string[] = []

    if (options.startDate) {
      params.push(`startDate=${options.startDate.toISOString().split('T')[0]}`)
    }
    if (options.endDate) {
      params.push(`endDate=${options.endDate.toISOString().split('T')[0]}`)
    }
    if (options.orderStatus) {
      params.push(`orderStatus=${options.orderStatus}`)
    }
    if (options.customerCode) {
      params.push(`customerCode=${encodeURIComponent(options.customerCode)}`)
    }
    if (options.pageSize) {
      params.push(`pageSize=${options.pageSize}`)
    }
    if (options.page) {
      params.push(`page=${options.page}`)
    }

    const query = params.join('&')
    return this.request<ApiResponse<SalesOrder>>('GET', 'SalesOrders', query)
  }

  /**
   * Create a new sales order
   */
  async createSalesOrder(order: Partial<SalesOrder>): Promise<SalesOrder> {
    return this.request<SalesOrder>('POST', 'SalesOrders', '', order)
  }

  /**
   * Update an existing sales order
   * Note: Must include Guid in the order object
   */
  async updateSalesOrder(order: Partial<SalesOrder> & { Guid: string }): Promise<SalesOrder> {
    // POST with Guid in body should update existing order (per Unleashed docs)
    // PUT creates new entities, POST updates when Guid is provided
    return this.request<SalesOrder>('POST', 'SalesOrders', '', order)
  }

  /**
   * Update only the status of a sales order
   */
  async updateOrderStatus(
    orderNumberOrGuid: string,
    status: 'Open' | 'Parked' | 'Placed' | 'Completed' | 'Deleted'
  ): Promise<SalesOrder> {
    // If it looks like an order number, fetch the GUID first
    let order: SalesOrder | null
    if (orderNumberOrGuid.startsWith('SO-')) {
      order = await this.getSalesOrder(orderNumberOrGuid)
    } else {
      order = await this.getSalesOrderByGuid(orderNumberOrGuid)
    }

    if (!order || !order.Guid) {
      throw new Error(`Order not found: ${orderNumberOrGuid}`)
    }

    return this.updateSalesOrder({
      Guid: order.Guid,
      OrderStatus: status,
    })
  }

  /**
   * Add a line item to an existing order
   */
  async addOrderLine(
    orderNumberOrGuid: string,
    line: {
      productCode: string
      quantity: number
      unitPrice: number
      comments?: string
    }
  ): Promise<SalesOrder> {
    let order: SalesOrder | null
    if (orderNumberOrGuid.startsWith('SO-')) {
      order = await this.getSalesOrder(orderNumberOrGuid)
    } else {
      order = await this.getSalesOrderByGuid(orderNumberOrGuid)
    }

    if (!order || !order.Guid) {
      throw new Error(`Order not found: ${orderNumberOrGuid}`)
    }

    // Add new line to existing lines (calculate LineTotal)
    const newLine: SalesOrderLine = {
      Product: {
        ProductCode: line.productCode,
      },
      OrderQuantity: line.quantity,
      UnitPrice: line.unitPrice,
      DiscountRate: 0,
      LineTotal: Math.round(line.quantity * line.unitPrice * 100) / 100,
      Comments: line.comments,
    }

    order.SalesOrderLines.push(newLine)

    return this.updateSalesOrder(prepareOrderForUpdate(order, order.SalesOrderLines) as Partial<SalesOrder> & { Guid: string })
  }

  /**
   * Remove a line item from an order by product code
   */
  async removeOrderLine(orderNumberOrGuid: string, productCode: string): Promise<SalesOrder> {
    let order: SalesOrder | null
    if (orderNumberOrGuid.startsWith('SO-')) {
      order = await this.getSalesOrder(orderNumberOrGuid)
    } else {
      order = await this.getSalesOrderByGuid(orderNumberOrGuid)
    }

    if (!order || !order.Guid) {
      throw new Error(`Order not found: ${orderNumberOrGuid}`)
    }

    const filteredLines = order.SalesOrderLines.filter(
      (line) => line.Product.ProductCode !== productCode
    )

    if (filteredLines.length === order.SalesOrderLines.length) {
      throw new Error(`Product not found in order: ${productCode}`)
    }

    return this.updateSalesOrder(prepareOrderForUpdate(order, filteredLines) as Partial<SalesOrder> & { Guid: string })
  }

  /**
   * Update line quantity
   */
  async updateLineQuantity(
    orderNumberOrGuid: string,
    productCode: string,
    newQuantity: number
  ): Promise<SalesOrder> {
    let order: SalesOrder | null
    if (orderNumberOrGuid.startsWith('SO-')) {
      order = await this.getSalesOrder(orderNumberOrGuid)
    } else {
      order = await this.getSalesOrderByGuid(orderNumberOrGuid)
    }

    if (!order || !order.Guid) {
      throw new Error(`Order not found: ${orderNumberOrGuid}`)
    }

    const line = order.SalesOrderLines.find((l) => l.Product.ProductCode === productCode)
    if (!line) {
      throw new Error(`Product not found in order: ${productCode}`)
    }

    // Update quantity and recalculate line total
    const discountRate = line.DiscountRate || 0
    const discountedUnitPrice = Math.round(line.UnitPrice * (1 - discountRate) * 10000) / 10000
    line.OrderQuantity = newQuantity
    line.LineTotal = Math.round(newQuantity * discountedUnitPrice * 100) / 100

    return this.updateSalesOrder(prepareOrderForUpdate(order, order.SalesOrderLines) as Partial<SalesOrder> & { Guid: string })
  }

  // ==========================================================================
  // Customers
  // ==========================================================================

  /**
   * Get customer by code
   */
  async getCustomer(customerCode: string): Promise<Customer | null> {
    const query = `customerCode=${encodeURIComponent(customerCode)}`
    const response = await this.request<ApiResponse<Customer>>('GET', 'Customers', query)
    return response.Items.length > 0 ? response.Items[0] : null
  }

  /**
   * Search customers by name
   */
  async searchCustomers(name: string): Promise<Customer[]> {
    const query = `customerName=${encodeURIComponent(name)}`
    const response = await this.request<ApiResponse<Customer>>('GET', 'Customers', query)
    return response.Items
  }

  /**
   * Create a new customer
   */
  async createCustomer(customer: Partial<Customer>): Promise<Customer> {
    return this.request<Customer>('POST', 'Customers', '', customer)
  }

  /**
   * Update a customer
   */
  async updateCustomer(customer: Partial<Customer> & { Guid: string }): Promise<Customer> {
    return this.request<Customer>('POST', `Customers/${customer.Guid}`, '', customer)
  }

  // ==========================================================================
  // Products
  // ==========================================================================

  /**
   * Get product by code
   */
  async getProduct(productCode: string): Promise<Product | null> {
    const query = `productCode=${encodeURIComponent(productCode)}`
    const response = await this.request<ApiResponse<Product>>('GET', 'Products', query)
    return response.Items.length > 0 ? response.Items[0] : null
  }

  /**
   * Search products
   */
  async searchProducts(search: string): Promise<Product[]> {
    const query = `productSearch=${encodeURIComponent(search)}`
    const response = await this.request<ApiResponse<Product>>('GET', 'Products', query)
    return response.Items
  }

  /**
   * List all products with pagination
   */
  async listProducts(page: number = 1, pageSize: number = 200): Promise<ApiResponse<Product>> {
    const query = `page=${page}&pageSize=${pageSize}`
    return this.request<ApiResponse<Product>>('GET', 'Products', query)
  }

  // ==========================================================================
  // Stock
  // ==========================================================================

  /**
   * Get stock levels for a product
   */
  async getStockOnHand(productCode: string): Promise<any[]> {
    const query = `productCode=${encodeURIComponent(productCode)}`
    const response = await this.request<ApiResponse<any>>('GET', 'StockOnHand', query)
    return response.Items
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format Unleashed date (from /Date(timestamp)/ format)
 */
export function parseUnleashedDate(dateStr: string): Date {
  const match = dateStr.match(/\/Date\((\d+)\)\//)
  if (match) {
    return new Date(parseInt(match[1]))
  }
  return new Date(dateStr)
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency: string = 'AUD'): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
  }).format(amount)
}

/**
 * Pretty print a sales order
 */
export function printOrder(order: SalesOrder): void {
  console.log('\n' + '='.repeat(60))
  console.log(`Order: ${order.OrderNumber}`)
  console.log('='.repeat(60))
  console.log(`Status:   ${order.OrderStatus}`)
  console.log(`Customer: ${order.Customer.CustomerName} (${order.Customer.CustomerCode})`)
  console.log(`Date:     ${order.OrderDate ? formatDate(parseUnleashedDate(order.OrderDate)) : 'N/A'}`)
  console.log(`Total:    ${formatCurrency(order.Total || 0)}`)

  if (order.DeliveryName || order.DeliveryCountry) {
    console.log('\nDelivery:')
    if (order.DeliveryName) console.log(`  Name:    ${order.DeliveryName}`)
    if (order.DeliveryStreetAddress) console.log(`  Address: ${order.DeliveryStreetAddress}`)
    if (order.DeliveryStreetAddress2) console.log(`           ${order.DeliveryStreetAddress2}`)
    if (order.DeliverySuburb || order.DeliveryCity) {
      console.log(`           ${order.DeliverySuburb || order.DeliveryCity}`)
    }
    if (order.DeliveryRegion) console.log(`           ${order.DeliveryRegion}`)
    if (order.DeliveryCountry) console.log(`           ${order.DeliveryCountry}`)
  }

  if (order.Comments) {
    console.log(`\nComments: ${order.Comments}`)
  }

  console.log('\nLine Items:')
  console.log('-'.repeat(60))

  for (const line of order.SalesOrderLines) {
    if (line.LineType === 'Charge') {
      console.log(`  [Charge] ${line.Product.ProductDescription}: ${formatCurrency(line.LineTotal || 0)}`)
    } else {
      const discount = line.DiscountRate ? ` (${line.DiscountRate * 100}% off)` : ''
      console.log(`  ${line.OrderQuantity}x ${line.Product.ProductCode} - ${line.Product.ProductDescription}`)
      console.log(`     ${formatCurrency(line.UnitPrice)} each${discount} = ${formatCurrency(line.LineTotal || 0)}`)
      if (line.Comments) {
        console.log(`     Note: ${line.Comments}`)
      }
    }
  }

  console.log('-'.repeat(60))
  console.log(`Subtotal: ${formatCurrency(order.SubTotal || 0)}`)
  console.log(`Tax:      ${formatCurrency(order.TaxTotal || 0)}`)
  console.log(`Total:    ${formatCurrency(order.Total || 0)}`)
  console.log('='.repeat(60) + '\n')
}
