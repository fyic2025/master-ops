/**
 * Klaviyo API Client
 *
 * TypeScript client for Klaviyo API v2024-10-15
 * Supports: Profiles, Segments, Lists, and Profile Properties
 *
 * Usage:
 * ```typescript
 * import { createKlaviyoClient } from '@/shared/libs/integrations/klaviyo'
 *
 * const client = await createKlaviyoClient('teelixir')
 * const segments = await client.segments.list()
 * const profiles = await client.segments.getProfiles(segmentId)
 * ```
 */

import { BaseConnector } from '../base/base-connector'
import { ErrorHandler } from '../base/error-handler'

const creds = require('../../../../creds')

// ============================================================================
// Types
// ============================================================================

export interface KlaviyoConfig {
  apiKey?: string
  business?: string
  rateLimitPerSecond?: number
}

export interface KlaviyoProfile {
  id: string
  type: 'profile'
  attributes: {
    email: string
    phone_number?: string
    first_name?: string
    last_name?: string
    organization?: string
    title?: string
    image?: string
    created?: string
    updated?: string
    last_event_date?: string
    location?: {
      address1?: string
      address2?: string
      city?: string
      country?: string
      region?: string
      zip?: string
      timezone?: string
    }
    properties?: Record<string, any>
  }
}

export interface KlaviyoSegment {
  id: string
  type: 'segment'
  attributes: {
    name: string
    definition?: any
    is_active: boolean
    is_processing: boolean
    is_starred: boolean
    created: string
    updated: string
  }
}

export interface KlaviyoList {
  id: string
  type: 'list'
  attributes: {
    name: string
    created: string
    updated: string
    opt_in_process?: string
  }
}

export interface KlaviyoMetric {
  id: string
  type: 'metric'
  attributes: {
    name: string
    created: string
    updated: string
    integration?: {
      id: string
      name: string
    }
  }
}

export interface PaginatedResponse<T> {
  data: T[]
  links?: {
    self?: string
    next?: string
    prev?: string
  }
}

// ============================================================================
// Klaviyo Client
// ============================================================================

class KlaviyoConnector extends BaseConnector {
  private apiKey: string
  private baseUrl = 'https://a.klaviyo.com'
  private apiRevision = '2024-10-15'

  constructor(config: KlaviyoConfig = {}) {
    super('klaviyo', {
      rateLimiter: {
        maxRequests: config.rateLimitPerSecond || 75,
        windowMs: 1000, // 75 requests per second
      },
      retry: {
        maxRetries: 3,
        retryableStatusCodes: [429, 500, 502, 503, 504],
      },
      timeout: 30000,
    })

    this.apiKey = config.apiKey || ''
  }

  /**
   * Initialize with API key from creds vault
   */
  async init(business: string): Promise<void> {
    if (!this.apiKey) {
      this.apiKey = await creds.get(business, 'klaviyo_api_key')
      if (!this.apiKey) {
        throw new Error(`No Klaviyo API key found for business: ${business}`)
      }
    }
  }

  /**
   * Make authenticated request to Klaviyo API
   */
  private async request<T>(
    method: string,
    path: string,
    params?: Record<string, any>,
    body?: any
  ): Promise<T> {
    const url = new URL(`/api${path}`, this.baseUrl)

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
        'Authorization': `Klaviyo-API-Key ${this.apiKey}`,
        'revision': this.apiRevision,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : 2000
      await this.sleep(waitMs)
      return this.request<T>(method, path, params, body)
    }

    if (!response.ok) {
      const errorBody = await response.text()
      let errorMessage = `Klaviyo API error: ${response.status} ${response.statusText}`

      try {
        const errorJson = JSON.parse(errorBody)
        errorMessage = errorJson.errors?.[0]?.detail || errorMessage
      } catch {
        // Use default error message
      }

      throw ErrorHandler.wrap(new Error(errorMessage), {
        statusCode: response.status,
        service: 'klaviyo',
        details: { path, method, responseBody: errorBody },
      })
    }

    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return {} as T
    }

    return response.json() as Promise<T>
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  protected async performHealthCheck(): Promise<void> {
    await this.execute('healthCheck', async () => {
      await this.request('GET', '/metrics', { 'page[size]': '1' })
    })
  }

  // ==========================================================================
  // SEGMENTS API
  // ==========================================================================

  segments = {
    /**
     * List all segments
     */
    list: async (): Promise<KlaviyoSegment[]> => {
      return this.execute('segments.list', async () => {
        const allSegments: KlaviyoSegment[] = []
        let nextCursor: string | null = null

        do {
          const params: Record<string, any> = {}
          if (nextCursor) {
            params['page[cursor]'] = nextCursor
          }

          const response = await this.request<PaginatedResponse<KlaviyoSegment>>(
            'GET',
            '/segments',
            params
          )

          if (response.data) {
            allSegments.push(...response.data)
          }

          nextCursor = response.links?.next
            ? new URL(response.links.next).searchParams.get('page[cursor]')
            : null

          await this.sleep(100)
        } while (nextCursor)

        return allSegments
      })
    },

    /**
     * Get segment by ID
     */
    get: async (segmentId: string): Promise<KlaviyoSegment> => {
      return this.execute('segments.get', async () => {
        const response = await this.request<{ data: KlaviyoSegment }>(
          'GET',
          `/segments/${segmentId}`
        )
        return response.data
      }, { metadata: { segmentId } })
    },

    /**
     * Get all profiles in a segment (paginated)
     * @param segmentId - Klaviyo segment ID
     * @param options - Optional: limit results or specific fields
     */
    getProfiles: async (
      segmentId: string,
      options?: {
        maxProfiles?: number
        fields?: string[]
      }
    ): Promise<KlaviyoProfile[]> => {
      return this.execute('segments.getProfiles', async () => {
        const allProfiles: KlaviyoProfile[] = []
        let nextCursor: string | null = null
        const maxProfiles = options?.maxProfiles || Infinity

        do {
          const params: Record<string, any> = {
            'page[size]': '100',
          }

          if (options?.fields) {
            params['fields[profile]'] = options.fields.join(',')
          }

          if (nextCursor) {
            params['page[cursor]'] = nextCursor
          }

          const response = await this.request<PaginatedResponse<KlaviyoProfile>>(
            'GET',
            `/segments/${segmentId}/profiles`,
            params
          )

          if (response.data) {
            allProfiles.push(...response.data)
          }

          if (allProfiles.length >= maxProfiles) {
            break
          }

          nextCursor = response.links?.next
            ? new URL(response.links.next).searchParams.get('page[cursor]')
            : null

          await this.sleep(50) // Rate limiting
        } while (nextCursor)

        return allProfiles.slice(0, maxProfiles)
      }, { metadata: { segmentId } })
    },
  }

  // ==========================================================================
  // PROFILES API
  // ==========================================================================

  profiles = {
    /**
     * Get profile by ID
     */
    get: async (profileId: string): Promise<KlaviyoProfile> => {
      return this.execute('profiles.get', async () => {
        const response = await this.request<{ data: KlaviyoProfile }>(
          'GET',
          `/profiles/${profileId}`
        )
        return response.data
      }, { metadata: { profileId } })
    },

    /**
     * Get profile by email
     */
    getByEmail: async (email: string): Promise<KlaviyoProfile | null> => {
      return this.execute('profiles.getByEmail', async () => {
        const response = await this.request<PaginatedResponse<KlaviyoProfile>>(
          'GET',
          '/profiles',
          { 'filter': `equals(email,"${email}")` }
        )
        return response.data?.[0] || null
      }, { metadata: { email } })
    },

    /**
     * Update profile properties
     */
    updateProperties: async (
      profileId: string,
      properties: Record<string, any>
    ): Promise<KlaviyoProfile> => {
      return this.execute('profiles.updateProperties', async () => {
        const response = await this.request<{ data: KlaviyoProfile }>(
          'PATCH',
          `/profiles/${profileId}`,
          undefined,
          {
            data: {
              type: 'profile',
              id: profileId,
              attributes: {
                properties,
              },
            },
          }
        )
        return response.data
      }, { metadata: { profileId, properties } })
    },

    /**
     * Create or update profile
     */
    upsert: async (
      email: string,
      attributes: Partial<KlaviyoProfile['attributes']>
    ): Promise<KlaviyoProfile> => {
      return this.execute('profiles.upsert', async () => {
        const response = await this.request<{ data: KlaviyoProfile }>(
          'POST',
          '/profile-import',
          undefined,
          {
            data: {
              type: 'profile',
              attributes: {
                email,
                ...attributes,
              },
            },
          }
        )
        return response.data
      }, { metadata: { email } })
    },
  }

  // ==========================================================================
  // LISTS API
  // ==========================================================================

  lists = {
    /**
     * List all lists
     */
    list: async (): Promise<KlaviyoList[]> => {
      return this.execute('lists.list', async () => {
        const allLists: KlaviyoList[] = []
        let nextCursor: string | null = null

        do {
          const params: Record<string, any> = {}
          if (nextCursor) {
            params['page[cursor]'] = nextCursor
          }

          const response = await this.request<PaginatedResponse<KlaviyoList>>(
            'GET',
            '/lists',
            params
          )

          if (response.data) {
            allLists.push(...response.data)
          }

          nextCursor = response.links?.next
            ? new URL(response.links.next).searchParams.get('page[cursor]')
            : null

          await this.sleep(100)
        } while (nextCursor)

        return allLists
      })
    },

    /**
     * Get profiles in a list
     */
    getProfiles: async (
      listId: string,
      options?: { maxProfiles?: number }
    ): Promise<KlaviyoProfile[]> => {
      return this.execute('lists.getProfiles', async () => {
        const allProfiles: KlaviyoProfile[] = []
        let nextCursor: string | null = null
        const maxProfiles = options?.maxProfiles || Infinity

        do {
          const params: Record<string, any> = {
            'page[size]': '100',
          }

          if (nextCursor) {
            params['page[cursor]'] = nextCursor
          }

          const response = await this.request<PaginatedResponse<KlaviyoProfile>>(
            'GET',
            `/lists/${listId}/profiles`,
            params
          )

          if (response.data) {
            allProfiles.push(...response.data)
          }

          if (allProfiles.length >= maxProfiles) {
            break
          }

          nextCursor = response.links?.next
            ? new URL(response.links.next).searchParams.get('page[cursor]')
            : null

          await this.sleep(50)
        } while (nextCursor)

        return allProfiles.slice(0, maxProfiles)
      }, { metadata: { listId } })
    },
  }

  // ==========================================================================
  // METRICS API
  // ==========================================================================

  metrics = {
    /**
     * List all metrics
     */
    list: async (): Promise<KlaviyoMetric[]> => {
      return this.execute('metrics.list', async () => {
        const allMetrics: KlaviyoMetric[] = []
        let nextCursor: string | null = null

        do {
          const params: Record<string, any> = {}
          if (nextCursor) {
            params['page[cursor]'] = nextCursor
          }

          const response = await this.request<PaginatedResponse<KlaviyoMetric>>(
            'GET',
            '/metrics',
            params
          )

          if (response.data) {
            allMetrics.push(...response.data)
          }

          nextCursor = response.links?.next
            ? new URL(response.links.next).searchParams.get('page[cursor]')
            : null

          await this.sleep(100)
        } while (nextCursor)

        return allMetrics
      })
    },
  }
}

// ============================================================================
// Factory function
// ============================================================================

/**
 * Create a Klaviyo client for a specific business
 * @param business - Business name (teelixir, boo, elevate)
 */
export async function createKlaviyoClient(business: string): Promise<KlaviyoConnector> {
  const client = new KlaviyoConnector()
  await client.init(business)
  return client
}

/**
 * Create a Klaviyo client with explicit API key
 * @param apiKey - Klaviyo API key
 */
export function createKlaviyoClientWithKey(apiKey: string): KlaviyoConnector {
  return new KlaviyoConnector({ apiKey })
}

// Export class for testing
export { KlaviyoConnector }
