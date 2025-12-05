/**
 * WooCommerce Connector
 *
 * Provides type-safe WooCommerce REST API v3 client with built-in:
 * - OAuth 1.0a authentication (via consumer key/secret)
 * - Rate limiting
 * - Automatic retries with exponential backoff
 * - Pagination handling
 * - Error handling and logging
 *
 * Usage:
 * ```typescript
 * import { WooCommerceConnector } from '@/shared/libs/integrations/woocommerce'
 *
 * const wc = new WooCommerceConnector({
 *   url: 'https://example.com',
 *   consumerKey: 'ck_xxx',
 *   consumerSecret: 'cs_xxx'
 * })
 *
 * const products = await wc.products.list({ per_page: 100 })
 * const orders = await wc.orders.list({ status: 'completed' })
 * ```
 */

import { BaseConnector } from '../base/base-connector'
import { ErrorHandler } from '../base/error-handler'
import * as dotenv from 'dotenv'
import {
  WooCommerceConfig,
  WooCommerceProduct,
  WooCommerceVariation,
  WooCommerceOrder,
  WooCommerceOrderNote,
  WooCommerceCustomer,
  WooCommerceProductCategory,
  WooCommerceProductTag,
  WooCommerceProductAttribute,
  WooCommerceProductAttributeTerm,
  WooCommerceShippingZone,
  WooCommerceShippingZoneLocation,
  WooCommerceShippingZoneMethod,
  WooCommerceCoupon,
  WooCommercePaymentGateway,
  WooCommerceTaxRate,
  WooCommerceProductListOptions,
  WooCommerceOrderListOptions,
  WooCommerceCustomerListOptions,
  WooCommerceListOptions,
} from './types'

dotenv.config()

export class WooCommerceConnector extends BaseConnector {
  private baseUrl: string
  private consumerKey: string
  private consumerSecret: string
  private version: string

  constructor(config: WooCommerceConfig) {
    super('woocommerce', {
      rateLimiter: {
        maxRequests: config.rateLimitPerWindow || 25, // WooCommerce default is ~25 req/sec
        windowMs: 1000,
      },
      retry: {
        maxRetries: 3,
        retryableStatusCodes: [429, 500, 502, 503, 504],
      },
      timeout: config.timeout || 30000,
    })

    if (!config.url) {
      throw new Error('WooCommerce URL is required')
    }
    if (!config.consumerKey) {
      throw new Error('WooCommerce consumer key is required')
    }
    if (!config.consumerSecret) {
      throw new Error('WooCommerce consumer secret is required')
    }

    // Normalize URL - remove trailing slash
    this.baseUrl = config.url.replace(/\/$/, '')
    this.consumerKey = config.consumerKey
    this.consumerSecret = config.consumerSecret
    this.version = config.version || 'wc/v3'
  }

  /**
   * Make authenticated request to WooCommerce API
   */
  private async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    params?: Record<string, any>
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}/wp-json/${this.version}${endpoint}`)

    // Add query params
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => url.searchParams.append(`${key}[]`, String(v)))
          } else {
            url.searchParams.append(key, String(value))
          }
        }
      })
    }

    // Add OAuth credentials as query params (OAuth 1.0a over HTTPS)
    url.searchParams.append('consumer_key', this.consumerKey)
    url.searchParams.append('consumer_secret', this.consumerSecret)

    const response = await fetch(url.toString(), {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'MasterOps-WooCommerce-Sync/1.0',
      },
      body: data ? JSON.stringify(data) : undefined,
    })

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 2000

      throw ErrorHandler.rateLimit(`WooCommerce rate limit exceeded`, {
        service: 'woocommerce',
        details: {
          retryAfter: waitTime,
          endpoint,
          method,
        },
      })
    }

    if (!response.ok) {
      const errorBody = await response.text()
      let errorMessage = `WooCommerce API error: ${response.status} ${response.statusText}`

      try {
        const errorJson = JSON.parse(errorBody)
        errorMessage = errorJson.message || errorJson.code || errorMessage
      } catch {
        // Use default error message
      }

      throw ErrorHandler.wrap(new Error(errorMessage), {
        statusCode: response.status,
        service: 'woocommerce',
        details: {
          endpoint,
          method,
          responseBody: errorBody.substring(0, 500),
        },
      })
    }

    // Handle empty responses
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return {} as T
    }

    const result = await response.json()

    // Return total pages info if available (for pagination)
    const totalPages = response.headers.get('X-WP-TotalPages')
    const total = response.headers.get('X-WP-Total')

    if (Array.isArray(result) && (totalPages || total)) {
      (result as any)._pagination = {
        totalPages: totalPages ? parseInt(totalPages) : undefined,
        total: total ? parseInt(total) : undefined,
      }
    }

    return result as T
  }

  /**
   * Fetch all pages of a paginated endpoint
   */
  async fetchAllPages<T>(
    endpoint: string,
    params: Record<string, any> = {},
    options: { maxPages?: number; perPage?: number } = {}
  ): Promise<T[]> {
    const perPage = options.perPage || 100
    const maxPages = options.maxPages || 1000 // Safety limit
    let page = 1
    let allResults: T[] = []
    let hasMore = true

    while (hasMore && page <= maxPages) {
      const results = await this.request<T[]>('GET', endpoint, undefined, {
        ...params,
        page,
        per_page: perPage,
      })

      if (results.length === 0) {
        hasMore = false
      } else {
        allResults = allResults.concat(results)

        // Check pagination headers
        const pagination = (results as any)._pagination
        if (pagination?.totalPages && page >= pagination.totalPages) {
          hasMore = false
        } else if (results.length < perPage) {
          hasMore = false
        } else {
          page++
        }
      }
    }

    return allResults
  }

  // ============================================================================
  // PRODUCTS API
  // ============================================================================

  readonly products = {
    /**
     * List products with optional filters
     */
    list: async (options: WooCommerceProductListOptions = {}): Promise<WooCommerceProduct[]> => {
      return this.request<WooCommerceProduct[]>('GET', '/products', undefined, options)
    },

    /**
     * Get all products (handles pagination automatically)
     */
    listAll: async (options: WooCommerceProductListOptions = {}): Promise<WooCommerceProduct[]> => {
      return this.fetchAllPages<WooCommerceProduct>('/products', options)
    },

    /**
     * Get a single product by ID
     */
    get: async (productId: number): Promise<WooCommerceProduct> => {
      return this.request<WooCommerceProduct>('GET', `/products/${productId}`)
    },

    /**
     * Get product variations
     */
    getVariations: async (productId: number, options: WooCommerceListOptions = {}): Promise<WooCommerceVariation[]> => {
      return this.request<WooCommerceVariation[]>('GET', `/products/${productId}/variations`, undefined, options)
    },

    /**
     * Get all variations for a product (handles pagination)
     */
    getAllVariations: async (productId: number): Promise<WooCommerceVariation[]> => {
      return this.fetchAllPages<WooCommerceVariation>(`/products/${productId}/variations`)
    },
  }

  // ============================================================================
  // ORDERS API
  // ============================================================================

  readonly orders = {
    /**
     * List orders with optional filters
     */
    list: async (options: WooCommerceOrderListOptions = {}): Promise<WooCommerceOrder[]> => {
      return this.request<WooCommerceOrder[]>('GET', '/orders', undefined, options)
    },

    /**
     * Get all orders (handles pagination automatically)
     */
    listAll: async (options: WooCommerceOrderListOptions = {}): Promise<WooCommerceOrder[]> => {
      return this.fetchAllPages<WooCommerceOrder>('/orders', options)
    },

    /**
     * Get a single order by ID
     */
    get: async (orderId: number): Promise<WooCommerceOrder> => {
      return this.request<WooCommerceOrder>('GET', `/orders/${orderId}`)
    },

    /**
     * Get order notes
     */
    getNotes: async (orderId: number): Promise<WooCommerceOrderNote[]> => {
      return this.request<WooCommerceOrderNote[]>('GET', `/orders/${orderId}/notes`)
    },
  }

  // ============================================================================
  // CUSTOMERS API
  // ============================================================================

  readonly customers = {
    /**
     * List customers with optional filters
     */
    list: async (options: WooCommerceCustomerListOptions = {}): Promise<WooCommerceCustomer[]> => {
      return this.request<WooCommerceCustomer[]>('GET', '/customers', undefined, options)
    },

    /**
     * Get all customers (handles pagination automatically)
     */
    listAll: async (options: WooCommerceCustomerListOptions = {}): Promise<WooCommerceCustomer[]> => {
      return this.fetchAllPages<WooCommerceCustomer>('/customers', options)
    },

    /**
     * Get a single customer by ID
     */
    get: async (customerId: number): Promise<WooCommerceCustomer> => {
      return this.request<WooCommerceCustomer>('GET', `/customers/${customerId}`)
    },
  }

  // ============================================================================
  // CATEGORIES API
  // ============================================================================

  readonly categories = {
    /**
     * List product categories
     */
    list: async (options: WooCommerceListOptions = {}): Promise<WooCommerceProductCategory[]> => {
      return this.request<WooCommerceProductCategory[]>('GET', '/products/categories', undefined, options)
    },

    /**
     * Get all categories (handles pagination)
     */
    listAll: async (): Promise<WooCommerceProductCategory[]> => {
      return this.fetchAllPages<WooCommerceProductCategory>('/products/categories')
    },

    /**
     * Get a single category by ID
     */
    get: async (categoryId: number): Promise<WooCommerceProductCategory> => {
      return this.request<WooCommerceProductCategory>('GET', `/products/categories/${categoryId}`)
    },
  }

  // ============================================================================
  // TAGS API
  // ============================================================================

  readonly tags = {
    /**
     * List product tags
     */
    list: async (options: WooCommerceListOptions = {}): Promise<WooCommerceProductTag[]> => {
      return this.request<WooCommerceProductTag[]>('GET', '/products/tags', undefined, options)
    },

    /**
     * Get all tags (handles pagination)
     */
    listAll: async (): Promise<WooCommerceProductTag[]> => {
      return this.fetchAllPages<WooCommerceProductTag>('/products/tags')
    },

    /**
     * Get a single tag by ID
     */
    get: async (tagId: number): Promise<WooCommerceProductTag> => {
      return this.request<WooCommerceProductTag>('GET', `/products/tags/${tagId}`)
    },
  }

  // ============================================================================
  // ATTRIBUTES API
  // ============================================================================

  readonly attributes = {
    /**
     * List product attributes
     */
    list: async (): Promise<WooCommerceProductAttribute[]> => {
      return this.request<WooCommerceProductAttribute[]>('GET', '/products/attributes')
    },

    /**
     * Get a single attribute by ID
     */
    get: async (attributeId: number): Promise<WooCommerceProductAttribute> => {
      return this.request<WooCommerceProductAttribute>('GET', `/products/attributes/${attributeId}`)
    },

    /**
     * Get attribute terms
     */
    getTerms: async (attributeId: number, options: WooCommerceListOptions = {}): Promise<WooCommerceProductAttributeTerm[]> => {
      return this.request<WooCommerceProductAttributeTerm[]>(
        'GET',
        `/products/attributes/${attributeId}/terms`,
        undefined,
        options
      )
    },

    /**
     * Get all terms for an attribute (handles pagination)
     */
    getAllTerms: async (attributeId: number): Promise<WooCommerceProductAttributeTerm[]> => {
      return this.fetchAllPages<WooCommerceProductAttributeTerm>(`/products/attributes/${attributeId}/terms`)
    },
  }

  // ============================================================================
  // SHIPPING ZONES API
  // ============================================================================

  readonly shipping = {
    /**
     * List shipping zones
     */
    listZones: async (): Promise<WooCommerceShippingZone[]> => {
      return this.request<WooCommerceShippingZone[]>('GET', '/shipping/zones')
    },

    /**
     * Get a single shipping zone
     */
    getZone: async (zoneId: number): Promise<WooCommerceShippingZone> => {
      return this.request<WooCommerceShippingZone>('GET', `/shipping/zones/${zoneId}`)
    },

    /**
     * Get shipping zone locations
     */
    getZoneLocations: async (zoneId: number): Promise<WooCommerceShippingZoneLocation[]> => {
      return this.request<WooCommerceShippingZoneLocation[]>('GET', `/shipping/zones/${zoneId}/locations`)
    },

    /**
     * Get shipping zone methods
     */
    getZoneMethods: async (zoneId: number): Promise<WooCommerceShippingZoneMethod[]> => {
      return this.request<WooCommerceShippingZoneMethod[]>('GET', `/shipping/zones/${zoneId}/methods`)
    },
  }

  // ============================================================================
  // COUPONS API
  // ============================================================================

  readonly coupons = {
    /**
     * List coupons
     */
    list: async (options: WooCommerceListOptions = {}): Promise<WooCommerceCoupon[]> => {
      return this.request<WooCommerceCoupon[]>('GET', '/coupons', undefined, options)
    },

    /**
     * Get all coupons (handles pagination)
     */
    listAll: async (): Promise<WooCommerceCoupon[]> => {
      return this.fetchAllPages<WooCommerceCoupon>('/coupons')
    },

    /**
     * Get a single coupon by ID
     */
    get: async (couponId: number): Promise<WooCommerceCoupon> => {
      return this.request<WooCommerceCoupon>('GET', `/coupons/${couponId}`)
    },
  }

  // ============================================================================
  // PAYMENT GATEWAYS API
  // ============================================================================

  readonly paymentGateways = {
    /**
     * List payment gateways
     */
    list: async (): Promise<WooCommercePaymentGateway[]> => {
      return this.request<WooCommercePaymentGateway[]>('GET', '/payment_gateways')
    },

    /**
     * Get a single payment gateway
     */
    get: async (gatewayId: string): Promise<WooCommercePaymentGateway> => {
      return this.request<WooCommercePaymentGateway>('GET', `/payment_gateways/${gatewayId}`)
    },
  }

  // ============================================================================
  // TAX RATES API
  // ============================================================================

  readonly taxRates = {
    /**
     * List tax rates
     */
    list: async (options: WooCommerceListOptions = {}): Promise<WooCommerceTaxRate[]> => {
      return this.request<WooCommerceTaxRate[]>('GET', '/taxes', undefined, options)
    },

    /**
     * Get all tax rates (handles pagination)
     */
    listAll: async (): Promise<WooCommerceTaxRate[]> => {
      return this.fetchAllPages<WooCommerceTaxRate>('/taxes')
    },

    /**
     * Get a single tax rate
     */
    get: async (taxRateId: number): Promise<WooCommerceTaxRate> => {
      return this.request<WooCommerceTaxRate>('GET', `/taxes/${taxRateId}`)
    },
  }

  // ============================================================================
  // SYSTEM INFO
  // ============================================================================

  /**
   * Get system status (site health, versions, etc.)
   */
  async getSystemStatus(): Promise<any> {
    return this.request('GET', '/system_status')
  }

  /**
   * Get store settings
   */
  async getSettings(): Promise<any> {
    return this.request('GET', '/settings')
  }

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================

  /**
   * Perform health check
   */
  protected async performHealthCheck(): Promise<void> {
    // Try to fetch system status as a health check
    await this.getSystemStatus()
  }

  /**
   * Get connector metrics
   */
  getMetrics() {
    return {
      service: 'woocommerce',
      baseUrl: this.baseUrl,
      version: this.version,
    }
  }
}

// ============================================================================
// FACTORY FUNCTION FOR RHF
// ============================================================================

/**
 * Create WooCommerce connector for Red Hill Fresh
 */
export function createRHFConnector(): WooCommerceConnector {
  const url = process.env.RHF_WC_URL || process.env.RHF_DOMAIN
  const consumerKey = process.env.RHF_WC_CONSUMER_KEY
  const consumerSecret = process.env.RHF_WC_CONSUMER_SECRET

  if (!url || !consumerKey || !consumerSecret) {
    throw new Error(
      'Red Hill Fresh WooCommerce credentials not configured. ' +
      'Set RHF_WC_URL, RHF_WC_CONSUMER_KEY, and RHF_WC_CONSUMER_SECRET environment variables.'
    )
  }

  return new WooCommerceConnector({
    url,
    consumerKey,
    consumerSecret,
  })
}
