/**
 * Shopify Connector
 *
 * Provides type-safe Shopify Admin API client with built-in:
 * - Rate limiting (2 requests per second - Shopify's standard rate limit)
 * - Automatic retries
 * - Error handling and logging
 * - Connection pooling
 *
 * Usage:
 * ```typescript
 * import { shopifyClient } from '@/shared/libs/integrations/shopify'
 *
 * const products = await shopifyClient.products.list({ limit: 250 })
 * const product = await shopifyClient.products.get('12345678')
 * const orders = await shopifyClient.orders.list({ status: 'any', limit: 250 })
 * ```
 */

import { BaseConnector } from '../base/base-connector'
import { ErrorHandler } from '../base/error-handler'
import * as dotenv from 'dotenv'
import {
  ShopifyProduct,
  ShopifyOrder,
  ShopifyCustomer,
  ShopifyCollection,
  ShopifyInventoryLevel,
  ListResponse,
  ShopifyPaginationInfo,
} from './types'

dotenv.config()

export interface ShopifyConfig {
  accessToken?: string
  shopDomain?: string
  apiVersion?: string
  rateLimitPerSecond?: number
}

class ShopifyConnector extends BaseConnector {
  private accessToken: string
  private shopDomain: string
  private apiVersion: string
  private baseUrl: string

  constructor(config: ShopifyConfig = {}) {
    super('shopify', {
      rateLimiter: {
        maxRequests: config.rateLimitPerSecond || 2,
        windowMs: 1000, // 2 requests per second (Shopify standard rate limit)
      },
      retry: {
        maxRetries: 3,
        retryableStatusCodes: [429, 500, 502, 503, 504],
      },
      timeout: 30000, // 30 second timeout
    })

    this.accessToken = config.accessToken || process.env.SHOPIFY_ACCESS_TOKEN || ''
    this.shopDomain = config.shopDomain || process.env.SHOPIFY_SHOP_DOMAIN || ''
    this.apiVersion = config.apiVersion || process.env.SHOPIFY_API_VERSION || '2024-01'

    if (!this.accessToken) {
      throw new Error(
        'Shopify access token is required. Set SHOPIFY_ACCESS_TOKEN environment variable or pass accessToken in config.'
      )
    }

    if (!this.shopDomain) {
      throw new Error(
        'Shopify shop domain is required. Set SHOPIFY_SHOP_DOMAIN environment variable or pass shopDomain in config.'
      )
    }

    this.baseUrl = `https://${this.shopDomain}/admin/api/${this.apiVersion}`
  }

  /**
   * Make authenticated request to Shopify Admin API
   */
  private async request<T>(
    method: string,
    path: string,
    data?: any,
    params?: Record<string, any>
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`)

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    const response = await fetch(url.toString(), {
      method,
      headers: {
        'X-Shopify-Access-Token': this.accessToken,
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    })

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 2000

      throw ErrorHandler.rateLimit(`Shopify rate limit exceeded. Retry after ${waitTime}ms`, {
        service: 'shopify',
        details: {
          retryAfter: waitTime,
          path,
          method,
        },
      })
    }

    if (!response.ok) {
      const errorBody = await response.text()
      let errorMessage = `Shopify API error: ${response.status} ${response.statusText}`

      try {
        const errorJson = JSON.parse(errorBody)
        errorMessage = errorJson.errors || errorJson.error || errorMessage
      } catch {
        // Use default error message
      }

      throw ErrorHandler.wrap(new Error(errorMessage), {
        statusCode: response.status,
        service: 'shopify',
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
      // Try to fetch shop info to verify API access
      await this.request('GET', '/shop.json')
    })
  }

  // ==========================================================================
  // PRODUCTS API
  // ==========================================================================

  products = {
    /**
     * Get product by ID
     */
    get: async (productId: string, fields?: string[]): Promise<ShopifyProduct> => {
      return this.execute('products.get', async () => {
        const response = await this.request<{ product: ShopifyProduct }>(
          'GET',
          `/products/${productId}.json`,
          undefined,
          fields ? { fields: fields.join(',') } : undefined
        )
        return response.product
      }, { metadata: { productId } })
    },

    /**
     * List products with pagination
     */
    list: async (options?: {
      limit?: number
      since_id?: number
      status?: 'active' | 'archived' | 'draft'
      fields?: string[]
    } & ShopifyPaginationInfo): Promise<ShopifyProduct[]> => {
      return this.execute('products.list', async () => {
        const response = await this.request<ListResponse<ShopifyProduct>>(
          'GET',
          '/products.json',
          undefined,
          {
            limit: options?.limit || 250,
            since_id: options?.since_id,
            status: options?.status,
            fields: options?.fields?.join(','),
            created_at_min: options?.created_at_min,
            created_at_max: options?.created_at_max,
            updated_at_min: options?.updated_at_min,
            updated_at_max: options?.updated_at_max,
          }
        )
        return response.products
      })
    },

    /**
     * Count products
     */
    count: async (options?: {
      status?: 'active' | 'archived' | 'draft'
    }): Promise<number> => {
      return this.execute('products.count', async () => {
        const response = await this.request<{ count: number }>(
          'GET',
          '/products/count.json',
          undefined,
          { status: options?.status }
        )
        return response.count
      })
    },

    /**
     * Create product
     */
    create: async (product: Partial<ShopifyProduct>): Promise<ShopifyProduct> => {
      return this.execute('products.create', async () => {
        const response = await this.request<{ product: ShopifyProduct }>(
          'POST',
          '/products.json',
          { product }
        )
        return response.product
      }, { metadata: { title: product.title } })
    },

    /**
     * Update product
     */
    update: async (productId: string, product: Partial<ShopifyProduct>): Promise<ShopifyProduct> => {
      return this.execute('products.update', async () => {
        const response = await this.request<{ product: ShopifyProduct }>(
          'PUT',
          `/products/${productId}.json`,
          { product }
        )
        return response.product
      }, { metadata: { productId } })
    },

    /**
     * Delete product
     */
    delete: async (productId: string): Promise<void> => {
      return this.execute('products.delete', async () => {
        return this.request<void>(
          'DELETE',
          `/products/${productId}.json`
        )
      }, { metadata: { productId } })
    },
  }

  // ==========================================================================
  // ORDERS API
  // ==========================================================================

  orders = {
    /**
     * Get order by ID
     */
    get: async (orderId: string, fields?: string[]): Promise<ShopifyOrder> => {
      return this.execute('orders.get', async () => {
        const response = await this.request<{ order: ShopifyOrder }>(
          'GET',
          `/orders/${orderId}.json`,
          undefined,
          fields ? { fields: fields.join(',') } : undefined
        )
        return response.order
      }, { metadata: { orderId } })
    },

    /**
     * List orders with pagination
     */
    list: async (options?: {
      limit?: number
      since_id?: number
      status?: 'open' | 'closed' | 'cancelled' | 'any'
      financial_status?: string
      fulfillment_status?: string
      fields?: string[]
    } & ShopifyPaginationInfo): Promise<ShopifyOrder[]> => {
      return this.execute('orders.list', async () => {
        const response = await this.request<ListResponse<ShopifyOrder>>(
          'GET',
          '/orders.json',
          undefined,
          {
            limit: options?.limit || 250,
            since_id: options?.since_id,
            status: options?.status || 'any',
            financial_status: options?.financial_status,
            fulfillment_status: options?.fulfillment_status,
            fields: options?.fields?.join(','),
            created_at_min: options?.created_at_min,
            created_at_max: options?.created_at_max,
            updated_at_min: options?.updated_at_min,
            updated_at_max: options?.updated_at_max,
          }
        )
        return response.orders
      })
    },

    /**
     * Count orders
     */
    count: async (options?: {
      status?: 'open' | 'closed' | 'cancelled' | 'any'
      financial_status?: string
      fulfillment_status?: string
    }): Promise<number> => {
      return this.execute('orders.count', async () => {
        const response = await this.request<{ count: number }>(
          'GET',
          '/orders/count.json',
          undefined,
          {
            status: options?.status,
            financial_status: options?.financial_status,
            fulfillment_status: options?.fulfillment_status,
          }
        )
        return response.count
      })
    },

    /**
     * Create order
     */
    create: async (order: Partial<ShopifyOrder>): Promise<ShopifyOrder> => {
      return this.execute('orders.create', async () => {
        const response = await this.request<{ order: ShopifyOrder }>(
          'POST',
          '/orders.json',
          { order }
        )
        return response.order
      }, { metadata: { email: order.email } })
    },

    /**
     * Update order
     */
    update: async (orderId: string, order: Partial<ShopifyOrder>): Promise<ShopifyOrder> => {
      return this.execute('orders.update', async () => {
        const response = await this.request<{ order: ShopifyOrder }>(
          'PUT',
          `/orders/${orderId}.json`,
          { order }
        )
        return response.order
      }, { metadata: { orderId } })
    },

    /**
     * Cancel order
     */
    cancel: async (orderId: string, options?: {
      amount?: number
      currency?: string
      restock?: boolean
      reason?: 'customer' | 'fraud' | 'inventory' | 'declined' | 'other'
    }): Promise<ShopifyOrder> => {
      return this.execute('orders.cancel', async () => {
        const response = await this.request<{ order: ShopifyOrder }>(
          'POST',
          `/orders/${orderId}/cancel.json`,
          options
        )
        return response.order
      }, { metadata: { orderId } })
    },
  }

  // ==========================================================================
  // CUSTOMERS API
  // ==========================================================================

  customers = {
    /**
     * Get customer by ID
     */
    get: async (customerId: string, fields?: string[]): Promise<ShopifyCustomer> => {
      return this.execute('customers.get', async () => {
        const response = await this.request<{ customer: ShopifyCustomer }>(
          'GET',
          `/customers/${customerId}.json`,
          undefined,
          fields ? { fields: fields.join(',') } : undefined
        )
        return response.customer
      }, { metadata: { customerId } })
    },

    /**
     * List customers with pagination
     */
    list: async (options?: {
      limit?: number
      since_id?: number
      fields?: string[]
    } & ShopifyPaginationInfo): Promise<ShopifyCustomer[]> => {
      return this.execute('customers.list', async () => {
        const response = await this.request<ListResponse<ShopifyCustomer>>(
          'GET',
          '/customers.json',
          undefined,
          {
            limit: options?.limit || 250,
            since_id: options?.since_id,
            fields: options?.fields?.join(','),
            created_at_min: options?.created_at_min,
            created_at_max: options?.created_at_max,
            updated_at_min: options?.updated_at_min,
            updated_at_max: options?.updated_at_max,
          }
        )
        return response.customers
      })
    },

    /**
     * Search customers
     */
    search: async (query: string, options?: {
      limit?: number
      fields?: string[]
    }): Promise<ShopifyCustomer[]> => {
      return this.execute('customers.search', async () => {
        const response = await this.request<ListResponse<ShopifyCustomer>>(
          'GET',
          '/customers/search.json',
          undefined,
          {
            query,
            limit: options?.limit || 250,
            fields: options?.fields?.join(','),
          }
        )
        return response.customers
      }, { metadata: { query } })
    },

    /**
     * Create customer
     */
    create: async (customer: Partial<ShopifyCustomer>): Promise<ShopifyCustomer> => {
      return this.execute('customers.create', async () => {
        const response = await this.request<{ customer: ShopifyCustomer }>(
          'POST',
          '/customers.json',
          { customer }
        )
        return response.customer
      }, { metadata: { email: customer.email } })
    },

    /**
     * Update customer
     */
    update: async (customerId: string, customer: Partial<ShopifyCustomer>): Promise<ShopifyCustomer> => {
      return this.execute('customers.update', async () => {
        const response = await this.request<{ customer: ShopifyCustomer }>(
          'PUT',
          `/customers/${customerId}.json`,
          { customer }
        )
        return response.customer
      }, { metadata: { customerId } })
    },
  }

  // ==========================================================================
  // INVENTORY API
  // ==========================================================================

  inventory = {
    /**
     * Get inventory levels for inventory item
     */
    levels: async (inventoryItemIds: number[], locationIds?: number[]): Promise<ShopifyInventoryLevel[]> => {
      return this.execute('inventory.levels', async () => {
        const response = await this.request<ListResponse<ShopifyInventoryLevel>>(
          'GET',
          '/inventory_levels.json',
          undefined,
          {
            inventory_item_ids: inventoryItemIds.join(','),
            location_ids: locationIds?.join(','),
          }
        )
        return response.inventory_levels
      })
    },

    /**
     * Adjust inventory level
     */
    adjust: async (
      inventoryItemId: number,
      locationId: number,
      availableAdjustment: number
    ): Promise<ShopifyInventoryLevel> => {
      return this.execute('inventory.adjust', async () => {
        const response = await this.request<{ inventory_level: ShopifyInventoryLevel }>(
          'POST',
          '/inventory_levels/adjust.json',
          {
            inventory_item_id: inventoryItemId,
            location_id: locationId,
            available_adjustment: availableAdjustment,
          }
        )
        return response.inventory_level
      }, { metadata: { inventoryItemId, locationId, availableAdjustment } })
    },

    /**
     * Set inventory level
     */
    set: async (
      inventoryItemId: number,
      locationId: number,
      available: number
    ): Promise<ShopifyInventoryLevel> => {
      return this.execute('inventory.set', async () => {
        const response = await this.request<{ inventory_level: ShopifyInventoryLevel }>(
          'POST',
          '/inventory_levels/set.json',
          {
            inventory_item_id: inventoryItemId,
            location_id: locationId,
            available,
          }
        )
        return response.inventory_level
      }, { metadata: { inventoryItemId, locationId, available } })
    },
  }

  // ==========================================================================
  // COLLECTIONS API
  // ==========================================================================

  collections = {
    /**
     * Get collection by ID
     */
    get: async (collectionId: string): Promise<ShopifyCollection> => {
      return this.execute('collections.get', async () => {
        const response = await this.request<{ collection: ShopifyCollection }>(
          'GET',
          `/collections/${collectionId}.json`
        )
        return response.collection
      }, { metadata: { collectionId } })
    },

    /**
     * List collections
     */
    list: async (options?: {
      limit?: number
      since_id?: number
    }): Promise<ShopifyCollection[]> => {
      return this.execute('collections.list', async () => {
        const response = await this.request<ListResponse<ShopifyCollection>>(
          'GET',
          '/collections.json',
          undefined,
          {
            limit: options?.limit || 250,
            since_id: options?.since_id,
          }
        )
        return response.collections || response.custom_collections || response.smart_collections
      })
    },
  }

  // ==========================================================================
  // SHOP API
  // ==========================================================================

  shop = {
    /**
     * Get shop information
     */
    get: async (): Promise<any> => {
      return this.execute('shop.get', async () => {
        const response = await this.request<{ shop: any }>(
          'GET',
          '/shop.json'
        )
        return response.shop
      })
    },
  }
}

// Export singleton instance
export const shopifyClient = new ShopifyConnector()

// Export class for custom instances
export { ShopifyConnector }
