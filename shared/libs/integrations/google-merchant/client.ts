/**
 * Google Merchant Center Connector
 *
 * Provides access to Google Merchant Center Content API for:
 * - Product status monitoring
 * - Feed health checks
 * - Disapproval tracking
 * - Product issue resolution
 *
 * Usage:
 * ```typescript
 * import { GoogleMerchantConnector } from '@/shared/libs/integrations/google-merchant'
 *
 * const client = new GoogleMerchantConnector('boo')
 *
 * // Get product statuses
 * const products = await client.products.list()
 *
 * // Get disapproved products
 * const disapproved = await client.products.getDisapproved()
 * ```
 */

import { BaseConnector } from '../base/base-connector'
import { ErrorHandler } from '../base/error-handler'
import * as dotenv from 'dotenv'

dotenv.config()

export type BusinessId = 'boo' | 'teelixir' | 'redhillfresh'

// Environment variable mapping
const ENV_MAPPING: Record<BusinessId, { prefix: string; displayName: string }> = {
  boo: { prefix: 'GMC_BOO', displayName: 'Buy Organics Online' },
  teelixir: { prefix: 'GMC_TEELIXIR', displayName: 'Teelixir' },
  redhillfresh: { prefix: 'GMC_RHF', displayName: 'Red Hill Fresh' },
}

export interface MerchantProduct {
  id: string
  offerId: string // SKU
  title: string
  description?: string
  link?: string
  imageLink?: string
  availability: 'in stock' | 'out of stock' | 'preorder'
  price: {
    value: string
    currency: string
  }
  brand?: string
  gtin?: string
  condition?: 'new' | 'refurbished' | 'used'
  channel: 'online' | 'local'
}

export interface ProductStatus {
  productId: string
  title: string
  offerId: string
  destinationStatuses: Array<{
    destination: string
    status: 'approved' | 'disapproved' | 'pending'
    pendingCountries?: string[]
    approvedCountries?: string[]
    disapprovedCountries?: string[]
  }>
  itemLevelIssues: Array<{
    code: string
    severity: 'error' | 'warning' | 'suggestion'
    resolution: string
    attributeName?: string
    description: string
    detail?: string
    documentation?: string
  }>
}

export interface AccountStatus {
  accountId: string
  accountLevelIssues: Array<{
    id: string
    title: string
    country: string
    severity: 'critical' | 'error' | 'warning'
    documentation?: string
  }>
  products: {
    active: number
    pending: number
    disapproved: number
    expiring: number
  }
}

export interface MerchantHealthCheck {
  status: 'healthy' | 'unhealthy'
  merchantId?: string
  productCounts?: {
    active: number
    pending: number
    disapproved: number
  }
  error?: string
}

export class GoogleMerchantConnector extends BaseConnector {
  private readonly business: BusinessId
  private readonly merchantId: string
  private readonly clientId: string
  private readonly clientSecret: string
  private refreshToken: string
  private accessToken?: string
  private tokenExpiresAt?: number
  private readonly baseUrl = 'https://shoppingcontent.googleapis.com/content/v2.1'

  constructor(business: BusinessId) {
    super('google-merchant', {
      rateLimiter: {
        maxRequests: 100,
        windowMs: 60000, // 100 per minute
      },
      retry: {
        maxRetries: 3,
        retryableStatusCodes: [429, 500, 502, 503, 504],
      },
      timeout: 30000,
    })

    this.business = business
    const envPrefix = ENV_MAPPING[business].prefix

    this.merchantId = process.env[`${envPrefix}_MERCHANT_ID`] || ''
    this.clientId = process.env.GOOGLE_ADS_CLIENT_ID || ''
    this.clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET || ''
    this.refreshToken = process.env[`${envPrefix}_REFRESH_TOKEN`] ||
      process.env[`GOOGLE_ADS_${business.toUpperCase()}_REFRESH_TOKEN`] || ''

    if (!this.merchantId) {
      console.warn(`Merchant ID for ${business} not set. Set ${envPrefix}_MERCHANT_ID`)
    }
  }

  /**
   * Refresh OAuth2 access token
   */
  private async refreshAccessToken(): Promise<void> {
    if (!this.clientId || !this.clientSecret || !this.refreshToken) {
      throw new Error('OAuth2 credentials not configured')
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to refresh access token: ${error}`)
    }

    const data = await response.json()
    this.accessToken = data.access_token
    this.tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000
  }

  /**
   * Get valid access token
   */
  private async getAccessToken(): Promise<string> {
    if (!this.accessToken || !this.tokenExpiresAt || Date.now() >= this.tokenExpiresAt) {
      await this.refreshAccessToken()
    }
    return this.accessToken!
  }

  /**
   * Make authenticated request
   */
  private async request<T>(
    method: string,
    path: string,
    params?: Record<string, any>,
    body?: any
  ): Promise<T> {
    const accessToken = await this.getAccessToken()
    const url = new URL(`${this.baseUrl}/${this.merchantId}${path}`)

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    const response = await fetch(url.toString(), {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw ErrorHandler.wrap(new Error(`Merchant API error: ${response.status}`), {
        statusCode: response.status,
        service: 'google-merchant',
        details: { business: this.business, path },
      })
    }

    return response.json() as T
  }

  // ============================================
  // PRODUCTS API
  // ============================================
  readonly products = {
    /**
     * List all products
     */
    list: async (maxResults = 250): Promise<MerchantProduct[]> => {
      return this.execute('products.list', async () => {
        const result = await this.request<{ resources: MerchantProduct[] }>(
          'GET',
          '/products',
          { maxResults }
        )
        return result.resources || []
      })
    },

    /**
     * Get product by ID
     */
    get: async (productId: string): Promise<MerchantProduct> => {
      return this.execute('products.get', async () => {
        return this.request<MerchantProduct>('GET', `/products/${productId}`)
      })
    },

    /**
     * Get all product statuses
     */
    getStatuses: async (maxResults = 250): Promise<ProductStatus[]> => {
      return this.execute('products.getStatuses', async () => {
        const result = await this.request<{ resources: ProductStatus[] }>(
          'GET',
          '/productstatuses',
          { maxResults }
        )
        return result.resources || []
      })
    },

    /**
     * Get disapproved products
     */
    getDisapproved: async (): Promise<ProductStatus[]> => {
      const statuses = await this.products.getStatuses(1000)
      return statuses.filter(p =>
        p.destinationStatuses?.some(d => d.status === 'disapproved')
      )
    },

    /**
     * Get products with issues
     */
    getWithIssues: async (): Promise<ProductStatus[]> => {
      const statuses = await this.products.getStatuses(1000)
      return statuses.filter(p =>
        p.itemLevelIssues?.length > 0
      )
    },

    /**
     * Get products with critical issues (errors)
     */
    getCriticalIssues: async (): Promise<ProductStatus[]> => {
      const statuses = await this.products.getStatuses(1000)
      return statuses.filter(p =>
        p.itemLevelIssues?.some(i => i.severity === 'error')
      )
    },
  }

  // ============================================
  // ACCOUNT API
  // ============================================
  readonly account = {
    /**
     * Get account status
     */
    getStatus: async (): Promise<AccountStatus> => {
      return this.execute('account.getStatus', async () => {
        return this.request<AccountStatus>('GET', `/accountstatuses/${this.merchantId}`)
      })
    },

    /**
     * Get account info
     */
    getInfo: async (): Promise<{ id: string; name: string }> => {
      return this.execute('account.getInfo', async () => {
        const result = await this.request<{ id: string; name: string }>(
          'GET',
          `/accounts/${this.merchantId}`
        )
        return result
      })
    },
  }

  // ============================================
  // HEALTH CHECK
  // ============================================
  protected async performHealthCheck(): Promise<void> {
    await this.account.getInfo()
  }

  async healthCheck(): Promise<MerchantHealthCheck> {
    try {
      const status = await this.account.getStatus()

      return {
        status: 'healthy',
        merchantId: status.accountId,
        productCounts: {
          active: status.products?.active || 0,
          pending: status.products?.pending || 0,
          disapproved: status.products?.disapproved || 0,
        },
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Get connector info
   */
  getInfo() {
    return {
      business: this.business,
      displayName: ENV_MAPPING[this.business].displayName,
      merchantId: this.merchantId,
      hasCredentials: !!(this.merchantId && this.refreshToken),
    }
  }
}

// Export factory function
export function createMerchantConnector(business: BusinessId): GoogleMerchantConnector {
  return new GoogleMerchantConnector(business)
}

// Export lazy-initialized connectors
let _booClient: GoogleMerchantConnector | null = null
let _teelixirClient: GoogleMerchantConnector | null = null
let _rhfClient: GoogleMerchantConnector | null = null

export const merchantBoo = new Proxy({} as GoogleMerchantConnector, {
  get(_, prop) {
    if (!_booClient) _booClient = new GoogleMerchantConnector('boo')
    return (_booClient as any)[prop]
  },
})

export const merchantTeelixir = new Proxy({} as GoogleMerchantConnector, {
  get(_, prop) {
    if (!_teelixirClient) _teelixirClient = new GoogleMerchantConnector('teelixir')
    return (_teelixirClient as any)[prop]
  },
})

export const merchantRhf = new Proxy({} as GoogleMerchantConnector, {
  get(_, prop) {
    if (!_rhfClient) _rhfClient = new GoogleMerchantConnector('redhillfresh')
    return (_rhfClient as any)[prop]
  },
})
