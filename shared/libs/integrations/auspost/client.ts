/**
 * Australia Post eParcel API Client
 *
 * Provides type-safe Australia Post Shipping API client with built-in:
 * - Rate limiting
 * - Automatic retries
 * - Error handling and logging
 * - HMAC Authentication
 *
 * Usage:
 * ```typescript
 * import { createAusPostClient } from '@/shared/libs/integrations/auspost'
 *
 * const auspost = createAusPostClient('teelixir')
 * const shipment = await auspost.shipments.create({ ... })
 * const label = await auspost.labels.generate(shipmentId, 'PDF_100x150')
 * ```
 *
 * API Docs: https://developers.auspost.com.au/apis/shipping-and-tracking
 */

import { BaseConnector } from '../base/base-connector'
import * as dotenv from 'dotenv'
import {
  AusPostShipment,
  AusPostShipmentCreate,
  AusPostLabelRequest,
  AusPostLabelResponse,
  AusPostLabelFormat,
  AusPostManifest,
  AusPostManifestCreate,
  AusPostTrackingResponse,
  AusPostQuote,
  AusPostQuoteRequest,
  AusPostQuoteRequestInternational,
  AusPostAddressValidation,
  AusPostAddress,
  AusPostApiError,
} from './types'

dotenv.config()

// ============================================
// Configuration
// ============================================

export interface AusPostConfig {
  accountNumber?: string
  apiKey?: string
  apiSecret?: string
  rateLimitPerSecond?: number
}

export type BusinessCode = 'teelixir' | 'boo' | 'elevate'

// AusPost API base URLs
const API_BASE_URL = 'https://digitalapi.auspost.com.au'
const POSTAGE_API_BASE = 'https://auspost.com.au/api'  // For rate quotes

// Get credentials based on business code
function getCredentials(businessCode: BusinessCode): {
  accountNumber: string
  apiKey: string
  apiSecret: string
} {
  // All businesses share the same API Key/Secret (BOO is master account)
  const apiKey = process.env.AUSPOST_API_KEY || ''
  const apiSecret = process.env.AUSPOST_API_SECRET || ''

  let accountNumber: string
  switch (businessCode) {
    case 'teelixir':
      accountNumber = process.env.TEELIXIR_AUSPOST_ACCOUNT || ''
      break
    case 'boo':
      accountNumber = process.env.BOO_AUSPOST_ACCOUNT || ''
      break
    case 'elevate':
      accountNumber = process.env.ELEVATE_AUSPOST_ACCOUNT || ''
      break
    default:
      throw new Error(`Unknown business code: ${businessCode}`)
  }

  return { accountNumber, apiKey, apiSecret }
}

// ============================================
// AusPost Connector Class
// ============================================

class AusPostConnector extends BaseConnector {
  private accountNumber: string
  private apiKey: string
  private apiSecret: string
  private authHeader: string

  constructor(config: AusPostConfig & { businessCode?: BusinessCode } = {}) {
    super('auspost', {
      rateLimiter: {
        maxRequests: config.rateLimitPerSecond || 10,
        windowMs: 1000, // 10 requests per second
      },
      retry: {
        maxRetries: 3,
        retryableStatusCodes: [429, 500, 502, 503, 504],
      },
      timeout: 60000, // 60 second timeout (label generation can be slow)
    })

    // Get credentials from config or environment
    if (config.accountNumber && config.apiKey && config.apiSecret) {
      this.accountNumber = config.accountNumber
      this.apiKey = config.apiKey
      this.apiSecret = config.apiSecret
    } else if (config.businessCode) {
      const creds = getCredentials(config.businessCode)
      this.accountNumber = creds.accountNumber
      this.apiKey = creds.apiKey
      this.apiSecret = creds.apiSecret
    } else {
      throw new Error(
        'AusPost credentials required. Provide accountNumber/apiKey/apiSecret or businessCode in config.'
      )
    }

    if (!this.accountNumber || !this.apiKey || !this.apiSecret) {
      throw new Error(
        'AusPost credentials are incomplete. Ensure AUSPOST_API_KEY, AUSPOST_API_SECRET, and account number environment variables are set.'
      )
    }

    // AusPost uses HTTP Basic Auth with API Key:Secret
    this.authHeader = 'Basic ' + Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64')
  }

  /**
   * Make authenticated request to AusPost Shipping API
   */
  private async request<T>(
    method: string,
    path: string,
    data?: any,
    options: {
      baseUrl?: string
      headers?: Record<string, string>
      includeAccount?: boolean
    } = {}
  ): Promise<T> {
    const baseUrl = options.baseUrl || API_BASE_URL
    const url = new URL(`${baseUrl}${path}`)

    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    }

    // Include account number for most shipping endpoints
    if (options.includeAccount !== false) {
      headers['Account-Number'] = this.accountNumber
    }

    const requestOptions: RequestInit = {
      method,
      headers,
    }

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      requestOptions.body = JSON.stringify(data)
    }

    const response = await fetch(url.toString(), requestOptions)

    // Handle non-JSON responses (like label PDFs)
    const contentType = response.headers.get('content-type') || ''

    if (!response.ok) {
      let errorData: AusPostApiError | string
      try {
        errorData = await response.json()
      } catch {
        errorData = await response.text()
      }

      const errorMessage =
        typeof errorData === 'object' && errorData.errors?.length
          ? errorData.errors.map(e => `${e.code}: ${e.message}`).join(', ')
          : typeof errorData === 'string'
          ? errorData
          : `AusPost API error: ${response.status}`

      const error = new Error(errorMessage) as any
      error.status = response.status
      error.auspostError = errorData
      throw error
    }

    // Return JSON for most responses
    if (contentType.includes('application/json')) {
      return response.json()
    }

    // For PDF/binary responses, return the response itself
    return response as any
  }

  /**
   * Health check implementation
   */
  protected async performHealthCheck(): Promise<void> {
    // Get account details as health check
    await this.request('GET', `/shipping/v1/accounts/${this.accountNumber}`)
  }

  // ============================================
  // Shipments API
  // ============================================

  shipments = {
    /**
     * Create a new shipment
     */
    create: async (shipment: AusPostShipmentCreate): Promise<AusPostShipment> => {
      return this.execute('shipments.create', () =>
        this.request<{ shipments: AusPostShipment[] }>('POST', '/shipping/v1/shipments', {
          shipments: [shipment],
        }).then(res => res.shipments[0])
      )
    },

    /**
     * Create multiple shipments in one request
     */
    createBatch: async (shipments: AusPostShipmentCreate[]): Promise<AusPostShipment[]> => {
      return this.execute('shipments.createBatch', () =>
        this.request<{ shipments: AusPostShipment[] }>('POST', '/shipping/v1/shipments', {
          shipments,
        }).then(res => res.shipments)
      )
    },

    /**
     * Get shipment by ID
     */
    get: async (shipmentId: string): Promise<AusPostShipment> => {
      return this.execute('shipments.get', () =>
        this.request<{ shipments: AusPostShipment[] }>(
          'GET',
          `/shipping/v1/shipments/${shipmentId}`
        ).then(res => res.shipments[0])
      )
    },

    /**
     * Delete a shipment (before manifesting)
     */
    delete: async (shipmentId: string): Promise<void> => {
      return this.execute('shipments.delete', () =>
        this.request<void>('DELETE', `/shipping/v1/shipments/${shipmentId}`)
      )
    },

    /**
     * Get all shipments for account
     */
    list: async (options?: {
      status?: 'CREATED' | 'LABELLED' | 'MANIFESTED'
      limit?: number
      offset?: number
    }): Promise<AusPostShipment[]> => {
      const params = new URLSearchParams()
      if (options?.status) params.append('status', options.status)
      if (options?.limit) params.append('limit', String(options.limit))
      if (options?.offset) params.append('offset', String(options.offset))

      const query = params.toString() ? `?${params.toString()}` : ''

      return this.execute('shipments.list', () =>
        this.request<{ shipments: AusPostShipment[] }>(
          'GET',
          `/shipping/v1/shipments${query}`
        ).then(res => res.shipments)
      )
    },
  }

  // ============================================
  // Labels API
  // ============================================

  labels = {
    /**
     * Generate labels for shipments
     */
    generate: async (
      shipmentIds: string | string[],
      format: AusPostLabelFormat = 'PDF_100x150'
    ): Promise<AusPostLabelResponse> => {
      const ids = Array.isArray(shipmentIds) ? shipmentIds : [shipmentIds]

      const request: AusPostLabelRequest = {
        shipments: ids.map(id => ({ shipment_id: id })),
        preferences: {
          type: 'PRINT',
          format,
          branded: false,
        },
      }

      return this.execute('labels.generate', () =>
        this.request<AusPostLabelResponse>('POST', '/shipping/v1/labels', request)
      )
    },

    /**
     * Get label URL (convenience method)
     * Generates label and returns the download URL
     */
    getUrl: async (
      shipmentId: string,
      format: AusPostLabelFormat = 'PDF_100x150'
    ): Promise<string> => {
      return this.execute('labels.getUrl', async () => {
        const response = await this.labels.generate(shipmentId, format)
        const label = response.labels[0]

        if (label.status === 'ERROR') {
          const errorMsg = label.errors?.map(e => e.message).join(', ') || 'Label generation failed'
          throw new Error(errorMsg)
        }

        if (!label.url) {
          throw new Error('Label URL not available')
        }

        return label.url
      })
    },

    /**
     * Download label as Buffer
     */
    download: async (
      shipmentId: string,
      format: AusPostLabelFormat = 'PDF_100x150'
    ): Promise<Buffer> => {
      return this.execute('labels.download', async () => {
        const labelUrl = await this.labels.getUrl(shipmentId, format)

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
  // Manifests API
  // ============================================

  manifests = {
    /**
     * Create a manifest (end of day lodgement)
     * This commits all unmanifested shipments
     */
    create: async (options?: AusPostManifestCreate): Promise<AusPostManifest> => {
      return this.execute('manifests.create', () =>
        this.request<AusPostManifest>('POST', '/shipping/v1/manifests', options || {})
      )
    },

    /**
     * Get manifest by ID
     */
    get: async (manifestId: string): Promise<AusPostManifest> => {
      return this.execute('manifests.get', () =>
        this.request<AusPostManifest>('GET', `/shipping/v1/manifests/${manifestId}`)
      )
    },

    /**
     * List all manifests
     */
    list: async (options?: {
      from_date?: string  // ISO 8601
      to_date?: string
      limit?: number
      offset?: number
    }): Promise<AusPostManifest[]> => {
      const params = new URLSearchParams()
      if (options?.from_date) params.append('from_date', options.from_date)
      if (options?.to_date) params.append('to_date', options.to_date)
      if (options?.limit) params.append('limit', String(options.limit))
      if (options?.offset) params.append('offset', String(options.offset))

      const query = params.toString() ? `?${params.toString()}` : ''

      return this.execute('manifests.list', () =>
        this.request<{ manifests: AusPostManifest[] }>(
          'GET',
          `/shipping/v1/manifests${query}`
        ).then(res => res.manifests)
      )
    },

    /**
     * Get manifest PDF URL
     */
    getPdfUrl: async (manifestId: string): Promise<string> => {
      return this.execute('manifests.getPdfUrl', async () => {
        const manifest = await this.manifests.get(manifestId)
        if (!manifest.manifest_pdf_url) {
          throw new Error('Manifest PDF not available yet')
        }
        return manifest.manifest_pdf_url
      })
    },
  }

  // ============================================
  // Tracking API
  // ============================================

  tracking = {
    /**
     * Track shipments by article/tracking IDs
     */
    track: async (trackingIds: string | string[]): Promise<AusPostTrackingResponse> => {
      const ids = Array.isArray(trackingIds) ? trackingIds : [trackingIds]

      // Tracking API uses query parameter
      const params = new URLSearchParams()
      params.append('tracking_ids', ids.join(','))

      return this.execute('tracking.track', () =>
        this.request<AusPostTrackingResponse>(
          'GET',
          `/shipping/v1/track?${params.toString()}`
        )
      )
    },

    /**
     * Get single tracking result (convenience method)
     */
    getStatus: async (trackingId: string): Promise<string> => {
      return this.execute('tracking.getStatus', async () => {
        const response = await this.tracking.track(trackingId)
        const result = response.tracking_results[0]
        return result?.status || 'Unknown'
      })
    },
  }

  // ============================================
  // Address API
  // ============================================

  address = {
    /**
     * Validate an address
     */
    validate: async (address: AusPostAddress): Promise<AusPostAddressValidation> => {
      return this.execute('address.validate', () =>
        this.request<AusPostAddressValidation>('POST', '/shipping/v1/address/validate', address)
      )
    },
  }

  // ============================================
  // Quotes API (Postage Calculator)
  // ============================================

  quotes = {
    /**
     * Get domestic shipping quotes
     */
    domestic: async (params: AusPostQuoteRequest): Promise<AusPostQuote[]> => {
      const queryParams = new URLSearchParams({
        from_postcode: params.from_postcode,
        to_postcode: params.to_postcode,
        length: String(params.length),
        width: String(params.width),
        height: String(params.height),
        weight: String(params.weight),
      })

      if (params.service_code) {
        queryParams.append('service_code', params.service_code)
      }

      return this.execute('quotes.domestic', () =>
        this.request<{ services: { service: AusPostQuote[] } }>(
          'GET',
          `/postage/parcel/domestic/service.json?${queryParams.toString()}`,
          undefined,
          {
            baseUrl: POSTAGE_API_BASE,
            includeAccount: false,
            headers: {
              'AUTH-KEY': this.apiKey,
            },
          }
        ).then(res => res.services.service)
      )
    },

    /**
     * Get international shipping quotes
     */
    international: async (params: AusPostQuoteRequestInternational): Promise<AusPostQuote[]> => {
      const queryParams = new URLSearchParams({
        country_code: params.country_code,
        weight: String(params.weight),
      })

      if (params.service_code) {
        queryParams.append('service_code', params.service_code)
      }

      return this.execute('quotes.international', () =>
        this.request<{ services: { service: AusPostQuote[] } }>(
          'GET',
          `/postage/parcel/international/service.json?${queryParams.toString()}`,
          undefined,
          {
            baseUrl: POSTAGE_API_BASE,
            includeAccount: false,
            headers: {
              'AUTH-KEY': this.apiKey,
            },
          }
        ).then(res => res.services.service)
      )
    },

    /**
     * Calculate domestic postage cost
     */
    calculateDomestic: async (
      params: AusPostQuoteRequest & { service_code: string }
    ): Promise<number> => {
      const queryParams = new URLSearchParams({
        from_postcode: params.from_postcode,
        to_postcode: params.to_postcode,
        length: String(params.length),
        width: String(params.width),
        height: String(params.height),
        weight: String(params.weight),
        service_code: params.service_code,
      })

      return this.execute('quotes.calculateDomestic', () =>
        this.request<{ postage_result: { total_cost: string } }>(
          'GET',
          `/postage/parcel/domestic/calculate.json?${queryParams.toString()}`,
          undefined,
          {
            baseUrl: POSTAGE_API_BASE,
            includeAccount: false,
            headers: {
              'AUTH-KEY': this.apiKey,
            },
          }
        ).then(res => parseFloat(res.postage_result.total_cost))
      )
    },
  }

  // ============================================
  // Account API
  // ============================================

  account = {
    /**
     * Get account details
     */
    get: async (): Promise<{
      account_number: string
      name: string
      status: string
    }> => {
      return this.execute('account.get', () =>
        this.request<{ account_number: string; name: string; status: string }>(
          'GET',
          `/shipping/v1/accounts/${this.accountNumber}`
        )
      )
    },
  }
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create an AusPost client for a specific business
 */
export function createAusPostClient(
  businessCode: BusinessCode,
  config: Partial<AusPostConfig> = {}
): AusPostConnector {
  return new AusPostConnector({
    ...config,
    businessCode,
  })
}

/**
 * Create an AusPost client with custom credentials
 */
export function createCustomAusPostClient(config: AusPostConfig): AusPostConnector {
  return new AusPostConnector(config)
}

// Export the connector class for advanced usage
export { AusPostConnector }

// ============================================
// Helper Functions
// ============================================

/**
 * Create an AusPost address from common address format
 */
export function createAusPostAddress(address: {
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
}): AusPostAddress {
  const lines: string[] = [address.address1]
  if (address.address2) {
    lines.push(address.address2)
  }

  return {
    name: address.name,
    business_name: address.company,
    lines,
    suburb: address.city,
    state: address.state,
    postcode: address.postcode,
    country: address.country || 'AU',
    phone: address.phone,
    email: address.email,
  }
}

/**
 * Determine if destination is domestic or international
 */
export function isDomestic(countryCode: string): boolean {
  return countryCode.toUpperCase() === 'AU'
}

/**
 * Get default product code based on destination
 */
export function getDefaultProductCode(
  countryCode: string,
  isExpress: boolean = false
): string {
  if (isDomestic(countryCode)) {
    return isExpress ? '3J85' : '3D85'  // Express or Parcel Post + Signature
  }
  return 'PTI8'  // Pack & Track International
}
