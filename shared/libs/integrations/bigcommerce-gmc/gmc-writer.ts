/**
 * Google Merchant Center Product Writer
 *
 * Extends the GMC connector with write capabilities:
 * - Insert new products
 * - Update existing products
 * - Batch operations
 * - Delete products
 * - Supplemental feed management
 */

import { BaseConnector } from '../base/base-connector'
import { ErrorHandler } from '../base/error-handler'
import * as dotenv from 'dotenv'
import { GMCProduct, SyncResult, SyncError, SupplementalFeedEntry } from './types'

dotenv.config()

export type BusinessId = 'boo' | 'teelixir' | 'redhillfresh'

// Environment variable mapping
const ENV_MAPPING: Record<BusinessId, { prefix: string; displayName: string }> = {
  boo: { prefix: 'GMC_BOO', displayName: 'Buy Organics Online' },
  teelixir: { prefix: 'GMC_TEELIXIR', displayName: 'Teelixir' },
  redhillfresh: { prefix: 'GMC_RHF', displayName: 'Red Hill Fresh' },
}

// ============================================================================
// GMC WRITER CLASS
// ============================================================================

export class GMCProductWriter extends BaseConnector {
  private readonly business: BusinessId
  private readonly merchantId: string
  private readonly clientId: string
  private readonly clientSecret: string
  private refreshToken: string
  private accessToken?: string
  private tokenExpiresAt?: number
  private readonly baseUrl = 'https://shoppingcontent.googleapis.com/content/v2.1'

  constructor(business: BusinessId) {
    super('gmc-writer', {
      rateLimiter: {
        maxRequests: 100,
        windowMs: 60000, // 100 per minute
      },
      retry: {
        maxRetries: 3,
        retryableStatusCodes: [429, 500, 502, 503, 504],
      },
      timeout: 60000, // 60 second timeout for batch operations
    })

    this.business = business
    const envPrefix = ENV_MAPPING[business].prefix

    this.merchantId = process.env[`${envPrefix}_MERCHANT_ID`] || ''
    this.clientId = process.env.GOOGLE_ADS_CLIENT_ID || ''
    this.clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET || ''
    this.refreshToken =
      process.env[`${envPrefix}_REFRESH_TOKEN`] ||
      process.env[`GOOGLE_ADS_${business.toUpperCase()}_REFRESH_TOKEN`] ||
      ''

    if (!this.merchantId) {
      console.warn(`Merchant ID for ${business} not set. Set ${envPrefix}_MERCHANT_ID`)
    }
  }

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

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

    const data = await response.json() as { access_token: string; expires_in: number }
    this.accessToken = data.access_token
    this.tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000
  }

  private async getAccessToken(): Promise<string> {
    if (!this.accessToken || !this.tokenExpiresAt || Date.now() >= this.tokenExpiresAt) {
      await this.refreshAccessToken()
    }
    return this.accessToken!
  }

  // ============================================================================
  // API REQUESTS
  // ============================================================================

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
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw ErrorHandler.wrap(new Error(`Merchant API error: ${response.status}`), {
        statusCode: response.status,
        service: 'gmc-writer',
        details: { business: this.business, path, body: errorBody },
      })
    }

    // Handle empty responses
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return {} as T
    }

    return response.json() as T
  }

  // ============================================================================
  // PRODUCT OPERATIONS
  // ============================================================================

  /**
   * Insert a single product
   */
  async insertProduct(product: GMCProduct): Promise<{ success: boolean; productId?: string; error?: string }> {
    try {
      // Build the product ID for GMC
      const gmcProduct = this.buildGMCProductPayload(product)

      const result = await this.request<any>('POST', '/products', undefined, gmcProduct)

      return {
        success: true,
        productId: result.id,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Update an existing product
   */
  async updateProduct(product: GMCProduct): Promise<{ success: boolean; productId?: string; error?: string }> {
    try {
      const productId = this.buildProductId(product)
      const gmcProduct = this.buildGMCProductPayload(product)

      const result = await this.request<any>('PATCH', `/products/${productId}`, undefined, gmcProduct)

      return {
        success: true,
        productId: result.id,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Insert or update a product (upsert)
   */
  async upsertProduct(product: GMCProduct): Promise<{ success: boolean; productId?: string; error?: string }> {
    // Try insert first, if it fails with already exists, update
    const insertResult = await this.insertProduct(product)

    if (insertResult.success) {
      return insertResult
    }

    // If already exists, try update
    if (insertResult.error?.includes('already exists')) {
      return this.updateProduct(product)
    }

    return insertResult
  }

  /**
   * Delete a product
   */
  async deleteProduct(offerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const productId = `online:en:AU:${offerId}`
      await this.request<void>('DELETE', `/products/${productId}`)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  // ============================================================================
  // BATCH OPERATIONS
  // ============================================================================

  /**
   * Batch insert/update products using custombatch endpoint
   */
  async batchUpsert(
    products: GMCProduct[],
    options: {
      batchSize?: number
      onProgress?: (completed: number, total: number) => void
    } = {}
  ): Promise<SyncResult> {
    const startTime = Date.now()
    const batchSize = options.batchSize || 50
    const errors: SyncError[] = []
    let inserted = 0
    let updated = 0
    let skipped = 0

    // Process in batches
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize)

      try {
        const result = await this.executeBatch(batch, 'insert')

        // Process results
        for (const entry of result.entries || []) {
          if (entry.errors?.length) {
            // Check if it's an "already exists" error
            const alreadyExists = entry.errors.some(
              (e: any) => e.message?.includes('already exists')
            )

            if (alreadyExists) {
              // Try to update instead
              const product = batch.find((p) => p.offerId === entry.batchId?.toString())
              if (product) {
                const updateResult = await this.updateProduct(product)
                if (updateResult.success) {
                  updated++
                } else {
                  errors.push({
                    timestamp: new Date(),
                    offerId: product.offerId,
                    operation: 'update',
                    error: updateResult.error || 'Unknown error',
                    retryable: false,
                    retryCount: 0,
                  })
                }
              }
            } else {
              errors.push({
                timestamp: new Date(),
                offerId: entry.batchId?.toString(),
                operation: 'insert',
                error: entry.errors.map((e: any) => e.message).join('; '),
                retryable: false,
                retryCount: 0,
              })
            }
          } else {
            inserted++
          }
        }
      } catch (error) {
        // Batch failed, try individual inserts
        for (const product of batch) {
          const result = await this.upsertProduct(product)
          if (result.success) {
            inserted++
          } else {
            errors.push({
              timestamp: new Date(),
              offerId: product.offerId,
              operation: 'insert',
              error: result.error || 'Unknown error',
              retryable: true,
              retryCount: 0,
            })
          }
        }
      }

      // Report progress
      options.onProgress?.(Math.min(i + batchSize, products.length), products.length)
    }

    return {
      success: errors.length === 0,
      duration: Date.now() - startTime,
      stats: {
        inserted,
        updated,
        deleted: 0,
        skipped,
        errors: errors.length,
      },
      errors,
      timestamp: new Date(),
    }
  }

  /**
   * Batch delete products
   */
  async batchDelete(
    offerIds: string[],
    options: {
      batchSize?: number
      onProgress?: (completed: number, total: number) => void
    } = {}
  ): Promise<SyncResult> {
    const startTime = Date.now()
    const batchSize = options.batchSize || 50
    const errors: SyncError[] = []
    let deleted = 0

    for (let i = 0; i < offerIds.length; i += batchSize) {
      const batch = offerIds.slice(i, i + batchSize)

      for (const offerId of batch) {
        const result = await this.deleteProduct(offerId)
        if (result.success) {
          deleted++
        } else {
          errors.push({
            timestamp: new Date(),
            offerId,
            operation: 'delete',
            error: result.error || 'Unknown error',
            retryable: true,
            retryCount: 0,
          })
        }
      }

      options.onProgress?.(Math.min(i + batchSize, offerIds.length), offerIds.length)
    }

    return {
      success: errors.length === 0,
      duration: Date.now() - startTime,
      stats: {
        inserted: 0,
        updated: 0,
        deleted,
        skipped: 0,
        errors: errors.length,
      },
      errors,
      timestamp: new Date(),
    }
  }

  /**
   * Execute a batch operation
   */
  private async executeBatch(
    products: GMCProduct[],
    method: 'insert' | 'delete'
  ): Promise<{ entries: any[] }> {
    const entries = products.map((product, index) => ({
      batchId: index,
      merchantId: this.merchantId,
      method,
      ...(method === 'insert' ? { product: this.buildGMCProductPayload(product) } : {}),
      ...(method === 'delete' ? { productId: this.buildProductId(product) } : {}),
    }))

    return this.request<{ entries: any[] }>('POST', '/products/batch', undefined, { entries })
  }

  // ============================================================================
  // SUPPLEMENTAL FEED
  // ============================================================================

  /**
   * Apply supplemental feed entries (overrides specific attributes)
   */
  async applySupplementalFeed(entries: SupplementalFeedEntry[]): Promise<SyncResult> {
    const startTime = Date.now()
    const errors: SyncError[] = []
    let updated = 0

    for (const entry of entries) {
      try {
        // Build partial product with only the attributes to override
        const partialProduct: Partial<GMCProduct> = {
          offerId: entry.offerId,
          targetCountry: 'AU',
          contentLanguage: 'en',
          channel: 'online',
          ...entry.attributes,
        }

        // Use update to apply the supplemental data
        const productId = `online:en:AU:${entry.offerId}`
        await this.request('PATCH', `/products/${productId}`, undefined, partialProduct)
        updated++
      } catch (error) {
        errors.push({
          timestamp: new Date(),
          offerId: entry.offerId,
          operation: 'update',
          error: error instanceof Error ? error.message : String(error),
          retryable: true,
          retryCount: 0,
        })
      }
    }

    return {
      success: errors.length === 0,
      duration: Date.now() - startTime,
      stats: {
        inserted: 0,
        updated,
        deleted: 0,
        skipped: 0,
        errors: errors.length,
      },
      errors,
      timestamp: new Date(),
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Build the GMC product ID
   */
  private buildProductId(product: GMCProduct): string {
    const channel = product.channel || 'online'
    const language = product.contentLanguage || 'en'
    const country = product.targetCountry || 'AU'
    return `${channel}:${language}:${country}:${product.offerId}`
  }

  /**
   * Build the GMC product payload for API
   */
  private buildGMCProductPayload(product: GMCProduct): any {
    return {
      offerId: product.offerId,
      title: product.title,
      description: product.description,
      link: product.link,
      imageLink: product.imageLink,
      additionalImageLinks: product.additionalImageLinks,
      availability: product.availability,
      price: product.price,
      salePrice: product.salePrice,
      salePriceEffectiveDate: product.salePriceEffectiveDate,
      brand: product.brand,
      gtin: product.gtin,
      mpn: product.mpn,
      identifierExists: product.identifierExists,
      condition: product.condition,
      googleProductCategory: product.googleProductCategory,
      productTypes: product.productType ? [product.productType] : undefined,
      shipping: product.shipping,
      shippingWeight: product.shippingWeight,
      shippingLength: product.shippingLength,
      shippingWidth: product.shippingWidth,
      shippingHeight: product.shippingHeight,
      color: product.color,
      sizes: product.size ? [product.size] : undefined,
      sizeType: product.sizeType,
      sizeSystem: product.sizeSystem,
      gender: product.gender,
      ageGroup: product.ageGroup,
      material: product.material,
      pattern: product.pattern,
      customLabel0: product.customLabel0,
      customLabel1: product.customLabel1,
      customLabel2: product.customLabel2,
      customLabel3: product.customLabel3,
      customLabel4: product.customLabel4,
      productHighlights: product.productHighlights,
      productDetails: product.productDetails,
      targetCountry: product.targetCountry || 'AU',
      contentLanguage: product.contentLanguage || 'en',
      channel: product.channel || 'online',
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

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; error?: string }> {
    try {
      await this.getAccessToken()
      return { status: 'healthy' }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Perform health check (required by BaseConnector)
   */
  protected async performHealthCheck(): Promise<void> {
    await this.getAccessToken()
  }
}

// ============================================================================
// FACTORY & EXPORTS
// ============================================================================

export function createGMCWriter(business: BusinessId): GMCProductWriter {
  return new GMCProductWriter(business)
}

// Lazy-initialized writers
let _booWriter: GMCProductWriter | null = null
let _teelixirWriter: GMCProductWriter | null = null
let _rhfWriter: GMCProductWriter | null = null

export const gmcWriterBoo = new Proxy({} as GMCProductWriter, {
  get(_, prop) {
    if (!_booWriter) _booWriter = new GMCProductWriter('boo')
    return (_booWriter as any)[prop]
  },
})

export const gmcWriterTeelixir = new Proxy({} as GMCProductWriter, {
  get(_, prop) {
    if (!_teelixirWriter) _teelixirWriter = new GMCProductWriter('teelixir')
    return (_teelixirWriter as any)[prop]
  },
})

export const gmcWriterRhf = new Proxy({} as GMCProductWriter, {
  get(_, prop) {
    if (!_rhfWriter) _rhfWriter = new GMCProductWriter('redhillfresh')
    return (_rhfWriter as any)[prop]
  },
})
