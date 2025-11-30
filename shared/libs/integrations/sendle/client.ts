/**
 * Sendle API Client
 *
 * Provides type-safe Sendle shipping API client with built-in:
 * - Rate limiting
 * - Automatic retries
 * - Error handling and logging
 * - HTTP Basic Authentication
 *
 * Usage:
 * ```typescript
 * import { createSendleClient } from '@/shared/libs/integrations/sendle'
 *
 * const sendle = createSendleClient('teelixir')
 * const order = await sendle.orders.create({ ... })
 * const label = await sendle.orders.getLabel(orderId)
 * ```
 *
 * API Docs: https://developers.sendle.com
 */

import { BaseConnector } from '../base/base-connector'
import * as dotenv from 'dotenv'
import {
  SendleOrder,
  SendleOrderCreate,
  SendleQuote,
  SendleQuoteRequest,
  SendleTracking,
  SendleError,
  SendleAddress,
} from './types'

dotenv.config()

// ============================================
// Configuration
// ============================================

export interface SendleConfig {
  sendleId?: string
  apiKey?: string
  sandbox?: boolean  // Use sandbox environment for testing
  rateLimitPerSecond?: number
}

export type BusinessCode = 'teelixir' | 'boo' | 'elevate'

// Get credentials based on business code
function getCredentials(businessCode: BusinessCode): { sendleId: string; apiKey: string } {
  const sendleId = process.env.SENDLE_ID || ''

  let apiKey: string
  switch (businessCode) {
    case 'teelixir':
      apiKey = process.env.TEELIXIR_SENDLE_API_KEY || ''
      break
    case 'boo':
      apiKey = process.env.BOO_SENDLE_API_KEY || ''
      break
    case 'elevate':
      // Elevate doesn't use Sendle
      throw new Error('Elevate does not have Sendle configured')
    default:
      throw new Error(`Unknown business code: ${businessCode}`)
  }

  return { sendleId, apiKey }
}

// ============================================
// Sendle Connector Class
// ============================================

class SendleConnector extends BaseConnector {
  private sendleId: string
  private apiKey: string
  private baseUrl: string
  private authHeader: string

  constructor(config: SendleConfig & { businessCode?: BusinessCode } = {}) {
    super('sendle', {
      rateLimiter: {
        maxRequests: config.rateLimitPerSecond || 5,
        windowMs: 1000, // 5 requests per second
      },
      retry: {
        maxRetries: 3,
        retryableStatusCodes: [429, 500, 502, 503, 504],
      },
      timeout: 30000, // 30 second timeout
    })

    // Get credentials from config or environment
    if (config.sendleId && config.apiKey) {
      this.sendleId = config.sendleId
      this.apiKey = config.apiKey
    } else if (config.businessCode) {
      const creds = getCredentials(config.businessCode)
      this.sendleId = creds.sendleId
      this.apiKey = creds.apiKey
    } else {
      throw new Error(
        'Sendle credentials required. Provide sendleId/apiKey or businessCode in config.'
      )
    }

    if (!this.sendleId || !this.apiKey) {
      throw new Error(
        'Sendle credentials are incomplete. Ensure SENDLE_ID and API key environment variables are set.'
      )
    }

    // Sendle uses HTTP Basic Auth
    this.authHeader = 'Basic ' + Buffer.from(`${this.sendleId}:${this.apiKey}`).toString('base64')

    // Production vs Sandbox
    this.baseUrl = config.sandbox
      ? 'https://sandbox.sendle.com/api'
      : 'https://api.sendle.com/api'
  }

  /**
   * Make authenticated request to Sendle API
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

    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      // Sendle requires User-Agent header for identification
      'User-Agent': 'MasterOps/1.0 (shipping-platform)',
    }

    const options: RequestInit = {
      method,
      headers,
    }

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data)
    }

    const response = await fetch(url.toString(), options)

    // Handle non-JSON responses (like label PDFs)
    const contentType = response.headers.get('content-type') || ''

    if (!response.ok) {
      let errorData: SendleError | string
      try {
        errorData = await response.json()
      } catch {
        errorData = await response.text()
      }

      const errorMessage =
        typeof errorData === 'object' && errorData.error_description
          ? errorData.error_description
          : typeof errorData === 'string'
          ? errorData
          : `Sendle API error: ${response.status}`

      const error = new Error(errorMessage) as any
      error.status = response.status
      error.sendleError = errorData
      throw error
    }

    // Return JSON for most responses
    if (contentType.includes('application/json')) {
      return response.json()
    }

    // For non-JSON responses (like redirects to labels), return the response itself
    return response as any
  }

  /**
   * Health check implementation
   */
  protected async performHealthCheck(): Promise<void> {
    // Simple ping to the API
    await this.request('GET', '/ping')
  }

  // ============================================
  // Orders API
  // ============================================

  orders = {
    /**
     * Create a new shipping order
     */
    create: async (order: SendleOrderCreate): Promise<SendleOrder> => {
      return this.execute('orders.create', () =>
        this.request<SendleOrder>('POST', '/orders', order)
      )
    },

    /**
     * Get order by ID
     */
    get: async (orderId: string): Promise<SendleOrder> => {
      return this.execute('orders.get', () =>
        this.request<SendleOrder>('GET', `/orders/${orderId}`)
      )
    },

    /**
     * Cancel an order
     */
    cancel: async (orderId: string): Promise<SendleOrder> => {
      return this.execute('orders.cancel', () =>
        this.request<SendleOrder>('DELETE', `/orders/${orderId}`)
      )
    },

    /**
     * Get tracking information for an order
     */
    track: async (orderId: string): Promise<SendleTracking> => {
      return this.execute('orders.track', () =>
        this.request<SendleTracking>('GET', `/orders/${orderId}/tracking`)
      )
    },

    /**
     * Get label URL for an order
     * Note: The URL in the order response is a temporary signed URL
     * You should download it immediately after order creation
     */
    getLabel: async (
      orderId: string,
      format: 'pdf' | 'zpl' = 'pdf',
      size: 'a4' | 'cropped' = 'cropped'
    ): Promise<string> => {
      return this.execute('orders.getLabel', async () => {
        const order = await this.request<SendleOrder>('GET', `/orders/${orderId}`)

        // Find the label with the requested format and size
        const label = order.labels?.find(l => l.format === format && l.size === size)

        if (!label) {
          // Fallback to any available label
          const anyLabel = order.labels?.[0]
          if (!anyLabel) {
            throw new Error(`No label available for order ${orderId}`)
          }
          return anyLabel.url
        }

        return label.url
      })
    },

    /**
     * Download label as Buffer
     */
    downloadLabel: async (
      orderId: string,
      format: 'pdf' | 'zpl' = 'pdf',
      size: 'a4' | 'cropped' = 'cropped'
    ): Promise<Buffer> => {
      return this.execute('orders.downloadLabel', async () => {
        const labelUrl = await this.orders.getLabel(orderId, format, size)

        // Sendle label URLs redirect, so we need to follow the redirect
        const response = await fetch(labelUrl, {
          redirect: 'follow',
        })

        if (!response.ok) {
          throw new Error(`Failed to download label: ${response.status}`)
        }

        const arrayBuffer = await response.arrayBuffer()
        return Buffer.from(arrayBuffer)
      })
    },
  }

  // ============================================
  // Quotes API
  // ============================================

  quotes = {
    /**
     * Get shipping quotes
     */
    get: async (params: SendleQuoteRequest): Promise<SendleQuote[]> => {
      return this.execute('quotes.get', () =>
        this.request<SendleQuote[]>('GET', '/quote', undefined, {
          sender_suburb: params.sender_suburb,
          sender_postcode: params.sender_postcode,
          sender_country: params.sender_country || 'AU',
          receiver_suburb: params.receiver_suburb,
          receiver_postcode: params.receiver_postcode,
          receiver_country: params.receiver_country || 'AU',
          weight_value: params.weight_value,
          weight_units: params.weight_units,
          length_value: params.length_value,
          width_value: params.width_value,
          height_value: params.height_value,
          dimension_units: params.dimension_units,
          pickup_date: params.pickup_date,
        })
      )
    },
  }

  // ============================================
  // Products API
  // ============================================

  products = {
    /**
     * Get available products/services
     */
    list: async (): Promise<any[]> => {
      return this.execute('products.list', () =>
        this.request<any[]>('GET', '/products')
      )
    },
  }

  // ============================================
  // Ping API
  // ============================================

  /**
   * Ping the API to check connectivity
   */
  ping = async (): Promise<{ ping: string }> => {
    return this.execute('ping', () =>
      this.request<{ ping: string }>('GET', '/ping')
    )
  }
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create a Sendle client for a specific business
 */
export function createSendleClient(businessCode: BusinessCode, config: Partial<SendleConfig> = {}): SendleConnector {
  return new SendleConnector({
    ...config,
    businessCode,
  })
}

/**
 * Create a Sendle client with custom credentials
 */
export function createCustomSendleClient(config: SendleConfig): SendleConnector {
  return new SendleConnector(config)
}

// Export the connector class for advanced usage
export { SendleConnector }

// ============================================
// Helper Functions
// ============================================

/**
 * Create a Sendle address from common address format
 */
export function createSendleAddress(address: {
  name?: string
  company?: string
  email?: string
  phone?: string
  address1: string
  address2?: string
  city: string
  state: string
  postcode: string
  country?: string
}): SendleAddress {
  return {
    contact: {
      name: address.name,
      company: address.company,
      email: address.email,
      phone: address.phone,
    },
    address_line1: address.address1,
    address_line2: address.address2,
    suburb: address.city,
    state_name: address.state,
    postcode: address.postcode,
    country: address.country || 'AU',
  }
}
