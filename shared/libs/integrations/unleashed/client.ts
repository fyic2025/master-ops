/**
 * Unleashed Inventory Connector
 *
 * Provides type-safe Unleashed API client with built-in:
 * - OAuth signature generation (HMAC-SHA256)
 * - Rate limiting
 * - Automatic retries
 * - Error handling and logging
 *
 * Usage:
 * ```typescript
 * import { unleashedClient } from '@/shared/libs/integrations/unleashed'
 *
 * const customers = await unleashedClient.customers.list()
 * const products = await unleashedClient.products.get('PROD-123')
 * ```
 */

import { BaseConnector } from '../base/base-connector'
import { ErrorHandler } from '../base/error-handler'
import * as crypto from 'crypto'
import * as dotenv from 'dotenv'

dotenv.config()

export interface UnleashedConfig {
  apiId?: string
  apiKey?: string
  baseUrl?: string
}

export interface UnleashedCustomer {
  Guid: string
  CustomerCode: string
  CustomerName: string
  Email?: string
  PhysicalAddress?: any
  CreatedOn: string
  LastModifiedOn: string
}

export interface UnleashedProduct {
  Guid: string
  ProductCode: string
  ProductDescription: string
  UnitOfMeasure?: string
  DefaultSellPrice?: number
  CreatedOn: string
  LastModifiedOn: string
}

export interface UnleashedSalesOrder {
  Guid: string
  OrderNumber: string
  OrderStatus: string
  Customer: UnleashedCustomer
  OrderDate: string
  RequiredDate?: string
  SubTotal: number
  TaxTotal: number
  Total: number
}

export interface ListResponse<T> {
  Items: T[]
  Pagination: {
    NumberOfItems: number
    PageSize: number
    PageNumber: number
    NumberOfPages: number
  }
}

class UnleashedConnector extends BaseConnector {
  private apiId: string
  private apiKey: string
  private baseUrl: string

  constructor(config: UnleashedConfig = {}) {
    super('unleashed', {
      rateLimiter: {
        maxRequests: 300, // Unleashed allows 300 requests per 5 minutes
        windowMs: 300000, // 5 minutes
        minDelay: 200, // Minimum 200ms between requests
      },
      retry: {
        maxRetries: 3,
        retryableStatusCodes: [429, 500, 502, 503, 504],
      },
      timeout: 30000, // 30 second timeout
    })

    this.apiId = config.apiId || process.env.UNLEASHED_API_ID || ''
    this.apiKey = config.apiKey || process.env.UNLEASHED_API_KEY || ''
    this.baseUrl = config.baseUrl || process.env.UNLEASHED_BASE_URL || 'https://api.unleashedsoftware.com'

    if (!this.apiId || !this.apiKey) {
      throw new Error(
        'Unleashed API credentials required. Set UNLEASHED_API_ID and UNLEASHED_API_KEY environment variables.'
      )
    }
  }

  /**
   * Generate Unleashed API signature
   * Uses HMAC-SHA256 with query string
   */
  private generateSignature(url: string): string {
    try {
      // Extract query string from URL
      const urlObj = new URL(url)
      const queryString = urlObj.search.substring(1) // Remove leading '?'

      // Generate HMAC signature
      const hmac = crypto.createHmac('sha256', this.apiKey)
      hmac.update(queryString)
      const signature = hmac.digest('base64')

      return signature
    } catch (error) {
      throw ErrorHandler.wrap(error as Error, {
        service: 'unleashed',
        operation: 'generateSignature',
        details: { url },
      })
    }
  }

  /**
   * Make authenticated request to Unleashed API
   */
  private async request<T>(
    method: string,
    path: string,
    data?: any,
    params?: Record<string, any>
  ): Promise<T> {
    const url = new URL(path, this.baseUrl)

    // Add default parameters
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    // Generate signature
    const signature = this.generateSignature(url.toString())

    const response = await fetch(url.toString(), {
      method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-auth-id': this.apiId,
        'api-auth-signature': signature,
      },
      body: data ? JSON.stringify(data) : undefined,
    })

    if (!response.ok) {
      const errorBody = await response.text()
      let errorMessage = `Unleashed API error: ${response.status} ${response.statusText}`

      try {
        const errorJson = JSON.parse(errorBody)
        errorMessage = errorJson.message || errorJson.Message || errorMessage
      } catch {
        // Use default error message
      }

      throw ErrorHandler.wrap(new Error(errorMessage), {
        statusCode: response.status,
        service: 'unleashed',
        details: {
          path,
          method,
          responseBody: errorBody,
        },
      })
    }

    // Handle empty responses
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return {} as T
    }

    return response.json() as T
  }

  /**
   * Health check implementation
   */
  protected async performHealthCheck(): Promise<void> {
    await this.execute('healthCheck', async () => {
      // Try to fetch a single customer to verify API access
      await this.request('GET', '/Customers/1', undefined, { pageSize: 1 })
    })
  }

  // ==========================================================================
  // CUSTOMERS API
  // ==========================================================================

  customers = {
    /**
     * Get customer by GUID
     */
    get: async (guid: string): Promise<UnleashedCustomer> => {
      return this.execute('customers.get', async () => {
        const response = await this.request<UnleashedCustomer>(
          'GET',
          `/Customers/${guid}`
        )
        return response
      }, { metadata: { guid } })
    },

    /**
     * List customers with pagination
     */
    list: async (options?: {
      pageSize?: number
      page?: number
      customerCode?: string
      customerName?: string
      modifiedSince?: string
    }): Promise<ListResponse<UnleashedCustomer>> => {
      return this.execute('customers.list', async () => {
        return this.request<ListResponse<UnleashedCustomer>>(
          'GET',
          '/Customers',
          undefined,
          {
            pageSize: options?.pageSize || 200,
            page: options?.page || 1,
            customerCode: options?.customerCode,
            customerName: options?.customerName,
            modifiedSince: options?.modifiedSince,
          }
        )
      })
    },

    /**
     * Create customer
     */
    create: async (customer: Partial<UnleashedCustomer>): Promise<UnleashedCustomer> => {
      return this.execute('customers.create', async () => {
        return this.request<UnleashedCustomer>(
          'POST',
          '/Customers',
          customer
        )
      }, { metadata: { customerCode: customer.CustomerCode } })
    },

    /**
     * Update customer
     */
    update: async (guid: string, customer: Partial<UnleashedCustomer>): Promise<UnleashedCustomer> => {
      return this.execute('customers.update', async () => {
        return this.request<UnleashedCustomer>(
          'PUT',
          `/Customers/${guid}`,
          customer
        )
      }, { metadata: { guid } })
    },
  }

  // ==========================================================================
  // PRODUCTS API
  // ==========================================================================

  products = {
    /**
     * Get product by GUID
     */
    get: async (guid: string): Promise<UnleashedProduct> => {
      return this.execute('products.get', async () => {
        return this.request<UnleashedProduct>(
          'GET',
          `/Products/${guid}`
        )
      }, { metadata: { guid } })
    },

    /**
     * List products with pagination
     */
    list: async (options?: {
      pageSize?: number
      page?: number
      productCode?: string
      productDescription?: string
      modifiedSince?: string
    }): Promise<ListResponse<UnleashedProduct>> => {
      return this.execute('products.list', async () => {
        return this.request<ListResponse<UnleashedProduct>>(
          'GET',
          '/Products',
          undefined,
          {
            pageSize: options?.pageSize || 200,
            page: options?.page || 1,
            productCode: options?.productCode,
            productDescription: options?.productDescription,
            modifiedSince: options?.modifiedSince,
          }
        )
      })
    },

    /**
     * Create product
     */
    create: async (product: Partial<UnleashedProduct>): Promise<UnleashedProduct> => {
      return this.execute('products.create', async () => {
        return this.request<UnleashedProduct>(
          'POST',
          '/Products',
          product
        )
      }, { metadata: { productCode: product.ProductCode } })
    },

    /**
     * Update product
     */
    update: async (guid: string, product: Partial<UnleashedProduct>): Promise<UnleashedProduct> => {
      return this.execute('products.update', async () => {
        return this.request<UnleashedProduct>(
          'PUT',
          `/Products/${guid}`,
          product
        )
      }, { metadata: { guid } })
    },
  }

  // ==========================================================================
  // SALES ORDERS API
  // ==========================================================================

  salesOrders = {
    /**
     * Get sales order by GUID
     */
    get: async (guid: string): Promise<UnleashedSalesOrder> => {
      return this.execute('salesOrders.get', async () => {
        return this.request<UnleashedSalesOrder>(
          'GET',
          `/SalesOrders/${guid}`
        )
      }, { metadata: { guid } })
    },

    /**
     * List sales orders with pagination
     */
    list: async (options?: {
      pageSize?: number
      page?: number
      orderNumber?: string
      orderStatus?: string
      customerCode?: string
      startDate?: string
      endDate?: string
      modifiedSince?: string
    }): Promise<ListResponse<UnleashedSalesOrder>> => {
      return this.execute('salesOrders.list', async () => {
        return this.request<ListResponse<UnleashedSalesOrder>>(
          'GET',
          '/SalesOrders',
          undefined,
          {
            pageSize: options?.pageSize || 200,
            page: options?.page || 1,
            orderNumber: options?.orderNumber,
            orderStatus: options?.orderStatus,
            customerCode: options?.customerCode,
            startDate: options?.startDate,
            endDate: options?.endDate,
            modifiedSince: options?.modifiedSince,
          }
        )
      })
    },

    /**
     * Create sales order
     */
    create: async (order: Partial<UnleashedSalesOrder>): Promise<UnleashedSalesOrder> => {
      return this.execute('salesOrders.create', async () => {
        return this.request<UnleashedSalesOrder>(
          'POST',
          '/SalesOrders',
          order
        )
      }, { metadata: { orderNumber: order.OrderNumber } })
    },
  }

  // ==========================================================================
  // STOCK ON HAND API
  // ==========================================================================

  stockOnHand = {
    /**
     * Get stock levels for a product
     */
    get: async (productGuid: string): Promise<any> => {
      return this.execute('stockOnHand.get', async () => {
        return this.request(
          'GET',
          '/StockOnHand',
          undefined,
          { productGuid }
        )
      }, { metadata: { productGuid } })
    },

    /**
     * List all stock on hand
     */
    list: async (options?: {
      pageSize?: number
      page?: number
      modifiedSince?: string
    }): Promise<any> => {
      return this.execute('stockOnHand.list', async () => {
        return this.request(
          'GET',
          '/StockOnHand',
          undefined,
          {
            pageSize: options?.pageSize || 200,
            page: options?.page || 1,
            modifiedSince: options?.modifiedSince,
          }
        )
      })
    },
  }
}

// Export singleton instance
export const unleashedClient = new UnleashedConnector()

// Export class for custom instances
export { UnleashedConnector }
