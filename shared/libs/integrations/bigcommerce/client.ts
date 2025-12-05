/**
 * BigCommerce Connector
 *
 * Provides type-safe BigCommerce V3 REST API client with built-in:
 * - Rate limiting (450 requests per 30 seconds - BigCommerce standard)
 * - Automatic retries with exponential backoff
 * - Error handling and logging
 * - Connection pooling
 *
 * Usage:
 * ```typescript
 * import { bigcommerceClient } from '@/shared/libs/integrations/bigcommerce'
 *
 * const products = await bigcommerceClient.products.list({ limit: 250 })
 * const product = await bigcommerceClient.products.get(12345)
 * const orders = await bigcommerceClient.orders.list({ limit: 250 })
 * ```
 */

import { BaseConnector } from '../base/base-connector'
import { ErrorHandler } from '../base/error-handler'
import * as dotenv from 'dotenv'
import {
  BigCommerceProduct,
  BigCommerceOrder,
  BigCommerceCustomer,
  BigCommerceStore,
  BigCommerceShippingZone,
  BigCommerceShippingMethod,
  BigCommerceChannel,
  BigCommerceCart,
  BigCommerceCheckout,
  BigCommercePaymentMethod,
  BigCommerceResponse,
  BigCommerceStoreLog,
  ProductListOptions,
  OrderListOptions,
  CustomerListOptions,
  StoreLogOptions,
  ListOptions,
} from './types'

dotenv.config()

export interface BigCommerceConfig {
  storeHash?: string
  accessToken?: string
  clientId?: string
  clientSecret?: string
  rateLimitPerWindow?: number
}

class BigCommerceConnector extends BaseConnector {
  private accessToken: string
  private storeHash: string
  private clientId: string
  private baseUrl: string

  constructor(config: BigCommerceConfig = {}) {
    super('bigcommerce', {
      rateLimiter: {
        maxRequests: config.rateLimitPerWindow || 450,
        windowMs: 30000, // 450 requests per 30 seconds (BigCommerce standard)
      },
      retry: {
        maxRetries: 3,
        retryableStatusCodes: [429, 500, 502, 503, 504],
      },
      timeout: 30000, // 30 second timeout
    })

    this.storeHash = config.storeHash || process.env.BIGCOMMERCE_BOO_STORE_HASH || ''
    this.accessToken = config.accessToken || process.env.BIGCOMMERCE_BOO_ACCESS_TOKEN || ''
    this.clientId = config.clientId || process.env.BIGCOMMERCE_BOO_CLIENT_ID || ''

    if (!this.accessToken) {
      throw new Error(
        'BigCommerce access token is required. Set BIGCOMMERCE_BOO_ACCESS_TOKEN environment variable or pass accessToken in config.'
      )
    }

    if (!this.storeHash) {
      throw new Error(
        'BigCommerce store hash is required. Set BIGCOMMERCE_BOO_STORE_HASH environment variable or pass storeHash in config.'
      )
    }

    this.baseUrl = `https://api.bigcommerce.com/stores/${this.storeHash}/v3`
  }

  /**
   * Make authenticated request to BigCommerce API (V2 or V3)
   */
  private async request<T>(
    method: string,
    path: string,
    data?: any,
    params?: Record<string, any>,
    apiVersion: 'v2' | 'v3' = 'v3'
  ): Promise<T> {
    const baseUrl = apiVersion === 'v2'
      ? `https://api.bigcommerce.com/stores/${this.storeHash}/v2`
      : this.baseUrl
    const url = new URL(`${baseUrl}${path}`)

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            url.searchParams.append(key, value.join(','))
          } else {
            url.searchParams.append(key, String(value))
          }
        }
      })
    }

    const response = await fetch(url.toString(), {
      method,
      headers: {
        'X-Auth-Token': this.accessToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    })

    // Handle rate limiting
    if (response.status === 429) {
      const rateLimitRemaining = response.headers.get('X-Rate-Limit-Requests-Left')
      const rateLimitReset = response.headers.get('X-Rate-Limit-Time-Reset-Ms')
      const waitTime = rateLimitReset ? parseInt(rateLimitReset) : 2000

      throw ErrorHandler.rateLimit(`BigCommerce rate limit exceeded. Retry after ${waitTime}ms`, {
        service: 'bigcommerce',
        details: {
          retryAfter: waitTime,
          remaining: rateLimitRemaining,
          path,
          method,
        },
      })
    }

    if (!response.ok) {
      const errorBody = await response.text()
      let errorMessage = `BigCommerce API error: ${response.status} ${response.statusText}`

      try {
        const errorJson = JSON.parse(errorBody)
        errorMessage = errorJson.title || errorJson.errors || errorJson.error || errorMessage
      } catch {
        // Use default error message
      }

      throw ErrorHandler.wrap(new Error(errorMessage), {
        statusCode: response.status,
        service: 'bigcommerce',
        details: {
          path,
          method,
          responseBody: errorBody.substring(0, 500), // Limit error body size
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
   * STORE API
   */
  readonly store = {
    /**
     * Get store information (uses V2 API)
     */
    get: async (): Promise<BigCommerceStore> => {
      const response = await this.request<BigCommerceStore>('GET', '/store', undefined, undefined, 'v2')
      return response
    },
  }

  /**
   * PRODUCTS API
   */
  readonly products = {
    /**
     * List products with optional filters
     */
    list: async (options: ProductListOptions = {}): Promise<BigCommerceProduct[]> => {
      const response = await this.request<BigCommerceResponse<BigCommerceProduct[]>>(
        'GET',
        '/catalog/products',
        undefined,
        options
      )
      return response.data || []
    },

    /**
     * Get a single product by ID
     */
    get: async (productId: number, include_fields?: string): Promise<BigCommerceProduct> => {
      const response = await this.request<BigCommerceResponse<BigCommerceProduct>>(
        'GET',
        `/catalog/products/${productId}`,
        undefined,
        include_fields ? { include_fields } : undefined
      )
      return response.data
    },

    /**
     * Get total product count
     */
    count: async (filters?: ProductListOptions): Promise<number> => {
      const response = await this.request<BigCommerceResponse<BigCommerceProduct[]>>(
        'GET',
        '/catalog/products',
        undefined,
        { ...filters, limit: 1 }
      )
      return response.meta?.pagination?.total || 0
    },

    /**
     * Create a new product
     */
    create: async (product: Partial<BigCommerceProduct>): Promise<BigCommerceProduct> => {
      const response = await this.request<BigCommerceResponse<BigCommerceProduct>>(
        'POST',
        '/catalog/products',
        product
      )
      return response.data
    },

    /**
     * Update a product
     */
    update: async (
      productId: number,
      product: Partial<BigCommerceProduct>
    ): Promise<BigCommerceProduct> => {
      const response = await this.request<BigCommerceResponse<BigCommerceProduct>>(
        'PUT',
        `/catalog/products/${productId}`,
        product
      )
      return response.data
    },

    /**
     * Delete a product
     */
    delete: async (productId: number): Promise<void> => {
      await this.request('DELETE', `/catalog/products/${productId}`)
    },
  }

  /**
   * ORDERS API (uses V2 API)
   */
  readonly orders = {
    /**
     * List orders with optional filters
     */
    list: async (options: OrderListOptions = {}): Promise<BigCommerceOrder[]> => {
      const response = await this.request<BigCommerceOrder[]>(
        'GET',
        '/orders',
        undefined,
        options,
        'v2'
      )
      return Array.isArray(response) ? response : []
    },

    /**
     * Get a single order by ID
     */
    get: async (orderId: number): Promise<BigCommerceOrder> => {
      const response = await this.request<BigCommerceOrder>(
        'GET',
        `/orders/${orderId}`,
        undefined,
        undefined,
        'v2'
      )
      return response
    },

    /**
     * Get total order count
     */
    count: async (filters?: OrderListOptions): Promise<number> => {
      const response = await this.request<BigCommerceOrder[]>(
        'GET',
        '/orders/count',
        undefined,
        filters,
        'v2'
      )
      // V2 API returns { count: number }
      return (response as any).count || 0
    },

    /**
     * Update an order
     */
    update: async (orderId: number, order: Partial<BigCommerceOrder>): Promise<BigCommerceOrder> => {
      const response = await this.request<BigCommerceResponse<BigCommerceOrder>>(
        'PUT',
        `/orders/${orderId}`,
        order
      )
      return response.data
    },
  }

  /**
   * CUSTOMERS API
   */
  readonly customers = {
    /**
     * List customers with optional filters
     */
    list: async (options: CustomerListOptions = {}): Promise<BigCommerceCustomer[]> => {
      const response = await this.request<BigCommerceResponse<BigCommerceCustomer[]>>(
        'GET',
        '/customers',
        undefined,
        options
      )
      return response.data || []
    },

    /**
     * Get a single customer by ID
     */
    get: async (customerId: number, include_fields?: string): Promise<BigCommerceCustomer> => {
      const response = await this.request<BigCommerceResponse<BigCommerceCustomer[]>>(
        'GET',
        '/customers',
        undefined,
        { 'id:in': [customerId], include_fields }
      )
      if (!response.data || response.data.length === 0) {
        throw new Error(`Customer ${customerId} not found`)
      }
      return response.data[0]
    },

    /**
     * Get total customer count
     */
    count: async (filters?: CustomerListOptions): Promise<number> => {
      const response = await this.request<BigCommerceResponse<BigCommerceCustomer[]>>(
        'GET',
        '/customers',
        undefined,
        { ...filters, limit: 1 }
      )
      return response.meta?.pagination?.total || 0
    },

    /**
     * Create a new customer
     */
    create: async (customer: Partial<BigCommerceCustomer>): Promise<BigCommerceCustomer> => {
      const response = await this.request<BigCommerceResponse<BigCommerceCustomer[]>>(
        'POST',
        '/customers',
        [customer]
      )
      return response.data[0]
    },

    /**
     * Update a customer
     */
    update: async (
      customerId: number,
      customer: Partial<BigCommerceCustomer>
    ): Promise<BigCommerceCustomer> => {
      const response = await this.request<BigCommerceResponse<BigCommerceCustomer[]>>(
        'PUT',
        '/customers',
        [{ ...customer, id: customerId }]
      )
      return response.data[0]
    },

    /**
     * Delete customers
     */
    delete: async (customerIds: number[]): Promise<void> => {
      await this.request('DELETE', '/customers', undefined, { 'id:in': customerIds })
    },
  }

  /**
   * SHIPPING API (uses V2 API)
   */
  readonly shipping = {
    /**
     * List shipping zones
     */
    listZones: async (): Promise<BigCommerceShippingZone[]> => {
      const response = await this.request<BigCommerceShippingZone[]>(
        'GET',
        '/shipping/zones',
        undefined,
        undefined,
        'v2'
      )
      return Array.isArray(response) ? response : []
    },

    /**
     * Get a single shipping zone
     */
    getZone: async (zoneId: number): Promise<BigCommerceShippingZone> => {
      const response = await this.request<BigCommerceShippingZone>(
        'GET',
        `/shipping/zones/${zoneId}`,
        undefined,
        undefined,
        'v2'
      )
      return response
    },

    /**
     * List shipping methods for a zone
     */
    listMethods: async (zoneId: number): Promise<BigCommerceShippingMethod[]> => {
      const response = await this.request<BigCommerceShippingMethod[]>(
        'GET',
        `/shipping/zones/${zoneId}/methods`,
        undefined,
        undefined,
        'v2'
      )
      return Array.isArray(response) ? response : []
    },

    /**
     * Get a shipping method
     */
    getMethod: async (zoneId: number, methodId: number): Promise<BigCommerceShippingMethod> => {
      const response = await this.request<BigCommerceShippingMethod>(
        'GET',
        `/shipping/zones/${zoneId}/methods/${methodId}`,
        undefined,
        undefined,
        'v2'
      )
      return response
    },
  }

  /**
   * CHANNELS API
   */
  readonly channels = {
    /**
     * List all channels
     */
    list: async (): Promise<BigCommerceChannel[]> => {
      const response = await this.request<BigCommerceResponse<BigCommerceChannel[]>>(
        'GET',
        '/channels'
      )
      return response.data || []
    },

    /**
     * Get a single channel
     */
    get: async (channelId: number): Promise<BigCommerceChannel> => {
      const response = await this.request<BigCommerceResponse<BigCommerceChannel>>(
        'GET',
        `/channels/${channelId}`
      )
      return response.data
    },
  }

  /**
   * CARTS API
   */
  readonly carts = {
    /**
     * Create a cart
     */
    create: async (cart: {
      channel_id?: number
      line_items: Array<{
        quantity: number
        product_id: number
        variant_id?: number
      }>
      customer_id?: number
    }): Promise<BigCommerceCart> => {
      const response = await this.request<BigCommerceResponse<BigCommerceCart>>(
        'POST',
        '/carts',
        cart
      )
      return response.data
    },

    /**
     * Get a cart
     */
    get: async (cartId: string, include?: string): Promise<BigCommerceCart> => {
      const response = await this.request<BigCommerceResponse<BigCommerceCart>>(
        'GET',
        `/carts/${cartId}`,
        undefined,
        include ? { include } : undefined
      )
      return response.data
    },

    /**
     * Update a cart
     */
    update: async (cartId: string, cart: Partial<BigCommerceCart>): Promise<BigCommerceCart> => {
      const response = await this.request<BigCommerceResponse<BigCommerceCart>>(
        'PUT',
        `/carts/${cartId}`,
        cart
      )
      return response.data
    },

    /**
     * Delete a cart
     */
    delete: async (cartId: string): Promise<void> => {
      await this.request('DELETE', `/carts/${cartId}`)
    },
  }

  /**
   * CHECKOUT API
   */
  readonly checkouts = {
    /**
     * Get checkout
     */
    get: async (checkoutId: string, include?: string): Promise<BigCommerceCheckout> => {
      const response = await this.request<BigCommerceResponse<BigCommerceCheckout>>(
        'GET',
        `/checkouts/${checkoutId}`,
        undefined,
        include ? { include } : undefined
      )
      return response.data
    },

    /**
     * Add billing address to checkout
     */
    addBillingAddress: async (
      checkoutId: string,
      address: Partial<BigCommerceCheckout>
    ): Promise<BigCommerceCheckout> => {
      const response = await this.request<BigCommerceResponse<BigCommerceCheckout>>(
        'POST',
        `/checkouts/${checkoutId}/billing-address`,
        address
      )
      return response.data
    },
  }

  /**
   * PAYMENT API
   */
  readonly payments = {
    /**
     * Get accepted payment methods
     */
    getMethods: async (orderId: number): Promise<BigCommercePaymentMethod[]> => {
      const response = await this.request<BigCommerceResponse<BigCommercePaymentMethod[]>>(
        'GET',
        `/payments/methods`,
        undefined,
        { order_id: orderId }
      )
      return response.data || []
    },
  }

  /**
   * STORE LOGS API
   */
  readonly storeLogs = {
    /**
     * List store logs with optional filters
     */
    list: async (options: StoreLogOptions = {}): Promise<BigCommerceStoreLog[]> => {
      const response = await this.request<BigCommerceResponse<BigCommerceStoreLog[]>>(
        'GET',
        '/store/systemlogs',
        undefined,
        options
      )
      return response.data || []
    },

    /**
     * Get logs with error severity (severity >= 3)
     */
    getErrors: async (limit: number = 100): Promise<BigCommerceStoreLog[]> => {
      const allLogs = await this.storeLogs.list({ limit })
      // Filter for higher severity (typically 3+ indicates errors)
      return allLogs.filter(log => log.severity >= 3)
    },

    /**
     * Get logs by type
     */
    getByType: async (
      type: StoreLogOptions['type'],
      limit: number = 100
    ): Promise<BigCommerceStoreLog[]> => {
      return this.storeLogs.list({ type, limit })
    },
  }

  /**
   * HEALTH CHECK
   * Test connection and basic functionality
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy'
    store?: BigCommerceStore
    productCount?: number
    error?: string
  }> {
    try {
      const store = await this.store.get()
      const productCount = await this.products.count()

      return {
        status: 'healthy',
        store,
        productCount,
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Get connector metrics (for monitoring)
   */
  getMetrics() {
    return {
      service: 'bigcommerce',
      storeHash: this.storeHash,
      baseUrl: this.baseUrl,
      // Add rate limiter metrics if available
    }
  }
}

// Export class for custom instances
export { BigCommerceConnector }

// Export singleton instance (lazy initialization to avoid errors when env vars not set)
let _bigcommerceClient: BigCommerceConnector | null = null
export const bigcommerceClient = new Proxy({} as BigCommerceConnector, {
  get(target, prop) {
    if (!_bigcommerceClient) {
      _bigcommerceClient = new BigCommerceConnector()
    }
    return (_bigcommerceClient as any)[prop]
  }
})
