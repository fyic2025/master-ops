/**
 * HubSpot Connector
 *
 * Provides type-safe HubSpot API client with built-in:
 * - Rate limiting (100 requests per 10 seconds)
 * - Automatic retries
 * - Error handling and logging
 * - Connection pooling
 *
 * Usage:
 * ```typescript
 * import { hubspotClient } from '@/shared/libs/integrations/hubspot'
 *
 * const contact = await hubspotClient.contacts.get('12345')
 * const companies = await hubspotClient.companies.list({ limit: 100 })
 * ```
 */

import { BaseConnector } from '../base/base-connector'
import { ErrorHandler } from '../base/error-handler'
import * as dotenv from 'dotenv'

dotenv.config()

export interface HubSpotConfig {
  accessToken?: string
  rateLimitPerSecond?: number
}

export interface HubSpotContact {
  id: string
  properties: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface HubSpotCompany {
  id: string
  properties: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface HubSpotDeal {
  id: string
  properties: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface HubSpotProperty {
  name: string
  label: string
  type: string
  fieldType: string
  groupName: string
  description?: string
  options?: Array<{ label: string; value: string }>
}

export interface ListResponse<T> {
  results: T[]
  paging?: {
    next?: { after: string }
  }
}

export interface SearchResponse<T> {
  total: number
  results: T[]
  paging?: {
    next?: { after: string }
  }
}

export interface BatchResponse<T> {
  status: string
  results: T[]
  errors?: Array<{
    status: string
    message: string
    category: string
  }>
}

export interface AssociationResponse {
  results: Array<{
    id: string
    type: string
  }>
  paging?: {
    next?: { after: string }
  }
}

class HubSpotConnector extends BaseConnector {
  private accessToken: string
  private baseUrl = 'https://api.hubapi.com'

  constructor(config: HubSpotConfig = {}) {
    super('hubspot', {
      rateLimiter: {
        maxRequests: config.rateLimitPerSecond || 100,
        windowMs: 10000, // 10 seconds
      },
      retry: {
        maxRetries: 3,
        retryableStatusCodes: [429, 500, 502, 503, 504],
      },
      timeout: 30000, // 30 second timeout
    })

    this.accessToken = config.accessToken || process.env.HUBSPOT_ACCESS_TOKEN || ''

    if (!this.accessToken) {
      throw new Error(
        'HubSpot access token is required. Set HUBSPOT_ACCESS_TOKEN environment variable or pass accessToken in config.'
      )
    }
  }

  /**
   * Make authenticated request to HubSpot API
   */
  private async request<T>(
    method: string,
    path: string,
    data?: any,
    params?: Record<string, any>
  ): Promise<T> {
    const url = new URL(path, this.baseUrl)

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
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    })

    if (!response.ok) {
      const errorBody = await response.text()
      let errorMessage = `HubSpot API error: ${response.status} ${response.statusText}`

      try {
        const errorJson = JSON.parse(errorBody)
        errorMessage = errorJson.message || errorMessage
      } catch {
        // Use default error message
      }

      throw ErrorHandler.wrap(new Error(errorMessage), {
        statusCode: response.status,
        service: 'hubspot',
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

    return response.json() as Promise<T>
  }

  /**
   * Health check implementation
   */
  protected async performHealthCheck(): Promise<void> {
    await this.execute('healthCheck', async () => {
      // Try to fetch a single contact to verify API access
      await this.request('GET', '/crm/v3/objects/contacts', undefined, { limit: 1 })
    })
  }

  // ==========================================================================
  // CONTACTS API
  // ==========================================================================

  contacts = {
    /**
     * Get contact by ID
     */
    get: async (contactId: string, properties?: string[]): Promise<HubSpotContact> => {
      return this.execute('contacts.get', async () => {
        return this.request<HubSpotContact>(
          'GET',
          `/crm/v3/objects/contacts/${contactId}`,
          undefined,
          properties ? { properties: properties.join(',') } : undefined
        )
      }, { metadata: { contactId } })
    },

    /**
     * List contacts with pagination
     */
    list: async (options?: {
      limit?: number
      after?: string
      properties?: string[]
    }): Promise<ListResponse<HubSpotContact>> => {
      return this.execute('contacts.list', async () => {
        return this.request<ListResponse<HubSpotContact>>(
          'GET',
          '/crm/v3/objects/contacts',
          undefined,
          {
            limit: options?.limit || 100,
            after: options?.after,
            properties: options?.properties?.join(','),
          }
        )
      })
    },

    /**
     * Create contact
     */
    create: async (properties: Record<string, any>): Promise<HubSpotContact> => {
      return this.execute('contacts.create', async () => {
        return this.request<HubSpotContact>(
          'POST',
          '/crm/v3/objects/contacts',
          { properties }
        )
      }, { metadata: { email: properties.email } })
    },

    /**
     * Update contact
     */
    update: async (contactId: string, properties: Record<string, any>): Promise<HubSpotContact> => {
      return this.execute('contacts.update', async () => {
        return this.request<HubSpotContact>(
          'PATCH',
          `/crm/v3/objects/contacts/${contactId}`,
          { properties }
        )
      }, { metadata: { contactId } })
    },

    /**
     * Delete contact
     */
    delete: async (contactId: string): Promise<void> => {
      return this.execute('contacts.delete', async () => {
        return this.request<void>(
          'DELETE',
          `/crm/v3/objects/contacts/${contactId}`
        )
      }, { metadata: { contactId } })
    },
  }

  // ==========================================================================
  // COMPANIES API
  // ==========================================================================

  companies = {
    /**
     * Get company by ID
     */
    get: async (companyId: string, properties?: string[]): Promise<HubSpotCompany> => {
      return this.execute('companies.get', async () => {
        return this.request<HubSpotCompany>(
          'GET',
          `/crm/v3/objects/companies/${companyId}`,
          undefined,
          properties ? { properties: properties.join(',') } : undefined
        )
      }, { metadata: { companyId } })
    },

    /**
     * List companies with pagination
     */
    list: async (options?: {
      limit?: number
      after?: string
      properties?: string[]
    }): Promise<ListResponse<HubSpotCompany>> => {
      return this.execute('companies.list', async () => {
        return this.request<ListResponse<HubSpotCompany>>(
          'GET',
          '/crm/v3/objects/companies',
          undefined,
          {
            limit: options?.limit || 100,
            after: options?.after,
            properties: options?.properties?.join(','),
          }
        )
      })
    },

    /**
     * Create company
     */
    create: async (properties: Record<string, any>): Promise<HubSpotCompany> => {
      return this.execute('companies.create', async () => {
        return this.request<HubSpotCompany>(
          'POST',
          '/crm/v3/objects/companies',
          { properties }
        )
      }, { metadata: { name: properties.name } })
    },

    /**
     * Update company
     */
    update: async (companyId: string, properties: Record<string, any>): Promise<HubSpotCompany> => {
      return this.execute('companies.update', async () => {
        return this.request<HubSpotCompany>(
          'PATCH',
          `/crm/v3/objects/companies/${companyId}`,
          { properties }
        )
      }, { metadata: { companyId } })
    },

    /**
     * Delete company
     */
    delete: async (companyId: string): Promise<void> => {
      return this.execute('companies.delete', async () => {
        return this.request<void>(
          'DELETE',
          `/crm/v3/objects/companies/${companyId}`
        )
      }, { metadata: { companyId } })
    },
  }

  // ==========================================================================
  // DEALS API
  // ==========================================================================

  deals = {
    /**
     * Get deal by ID
     */
    get: async (dealId: string, properties?: string[]): Promise<HubSpotDeal> => {
      return this.execute('deals.get', async () => {
        return this.request<HubSpotDeal>(
          'GET',
          `/crm/v3/objects/deals/${dealId}`,
          undefined,
          properties ? { properties: properties.join(',') } : undefined
        )
      }, { metadata: { dealId } })
    },

    /**
     * List deals with pagination
     */
    list: async (options?: {
      limit?: number
      after?: string
      properties?: string[]
    }): Promise<ListResponse<HubSpotDeal>> => {
      return this.execute('deals.list', async () => {
        return this.request<ListResponse<HubSpotDeal>>(
          'GET',
          '/crm/v3/objects/deals',
          undefined,
          {
            limit: options?.limit || 100,
            after: options?.after,
            properties: options?.properties?.join(','),
          }
        )
      })
    },

    /**
     * Create deal
     */
    create: async (properties: Record<string, any>): Promise<HubSpotDeal> => {
      return this.execute('deals.create', async () => {
        return this.request<HubSpotDeal>(
          'POST',
          '/crm/v3/objects/deals',
          { properties }
        )
      }, { metadata: { dealname: properties.dealname } })
    },

    /**
     * Update deal
     */
    update: async (dealId: string, properties: Record<string, any>): Promise<HubSpotDeal> => {
      return this.execute('deals.update', async () => {
        return this.request<HubSpotDeal>(
          'PATCH',
          `/crm/v3/objects/deals/${dealId}`,
          { properties }
        )
      }, { metadata: { dealId } })
    },

    /**
     * Delete deal
     */
    delete: async (dealId: string): Promise<void> => {
      return this.execute('deals.delete', async () => {
        return this.request<void>(
          'DELETE',
          `/crm/v3/objects/deals/${dealId}`
        )
      }, { metadata: { dealId } })
    },
  }

  // ==========================================================================
  // ASSOCIATIONS API
  // ==========================================================================

  associations = {
    /**
     * Create association between objects
     * @param fromObjectType - Source object type (contacts, companies, deals, etc.)
     * @param fromObjectId - Source object ID
     * @param toObjectType - Target object type
     * @param toObjectId - Target object ID
     * @param associationTypeId - Association type ID (e.g., "1" for contact_to_company)
     */
    create: async (
      fromObjectType: string,
      fromObjectId: string,
      toObjectType: string,
      toObjectId: string,
      associationTypeId: string = '1'
    ): Promise<AssociationResponse> => {
      return this.execute('associations.create', async () => {
        return this.request<AssociationResponse>(
          'PUT',
          `/crm/v3/objects/${fromObjectType}/${fromObjectId}/associations/${toObjectType}/${toObjectId}/${associationTypeId}`
        )
      }, { metadata: { fromObjectType, fromObjectId, toObjectType, toObjectId } })
    },

    /**
     * Delete association between objects
     */
    delete: async (
      fromObjectType: string,
      fromObjectId: string,
      toObjectType: string,
      toObjectId: string,
      associationTypeId: string = '1'
    ): Promise<void> => {
      return this.execute('associations.delete', async () => {
        return this.request<void>(
          'DELETE',
          `/crm/v3/objects/${fromObjectType}/${fromObjectId}/associations/${toObjectType}/${toObjectId}/${associationTypeId}`
        )
      }, { metadata: { fromObjectType, fromObjectId, toObjectType, toObjectId } })
    },

    /**
     * List associations for an object
     */
    list: async (
      fromObjectType: string,
      fromObjectId: string,
      toObjectType: string
    ): Promise<AssociationResponse> => {
      return this.execute('associations.list', async () => {
        return this.request<AssociationResponse>(
          'GET',
          `/crm/v3/objects/${fromObjectType}/${fromObjectId}/associations/${toObjectType}`
        )
      }, { metadata: { fromObjectType, fromObjectId, toObjectType } })
    },
  }

  // ==========================================================================
  // BATCH API
  // ==========================================================================

  batch = {
    /**
     * Create multiple contacts in batch
     */
    createContacts: async (contacts: Array<Record<string, any>>): Promise<BatchResponse<HubSpotContact>> => {
      return this.execute('batch.createContacts', async () => {
        return this.request<BatchResponse<HubSpotContact>>(
          'POST',
          '/crm/v3/objects/contacts/batch/create',
          { inputs: contacts.map(properties => ({ properties })) }
        )
      }, { metadata: { count: contacts.length } })
    },

    /**
     * Update multiple contacts in batch
     */
    updateContacts: async (
      updates: Array<{ id: string; properties: Record<string, any> }>
    ): Promise<BatchResponse<HubSpotContact>> => {
      return this.execute('batch.updateContacts', async () => {
        return this.request<BatchResponse<HubSpotContact>>(
          'POST',
          '/crm/v3/objects/contacts/batch/update',
          { inputs: updates }
        )
      }, { metadata: { count: updates.length } })
    },

    /**
     * Create multiple companies in batch
     */
    createCompanies: async (companies: Array<Record<string, any>>): Promise<BatchResponse<HubSpotCompany>> => {
      return this.execute('batch.createCompanies', async () => {
        return this.request<BatchResponse<HubSpotCompany>>(
          'POST',
          '/crm/v3/objects/companies/batch/create',
          { inputs: companies.map(properties => ({ properties })) }
        )
      }, { metadata: { count: companies.length } })
    },

    /**
     * Update multiple companies in batch
     */
    updateCompanies: async (
      updates: Array<{ id: string; properties: Record<string, any> }>
    ): Promise<BatchResponse<HubSpotCompany>> => {
      return this.execute('batch.updateCompanies', async () => {
        return this.request<BatchResponse<HubSpotCompany>>(
          'POST',
          '/crm/v3/objects/companies/batch/update',
          { inputs: updates }
        )
      }, { metadata: { count: updates.length } })
    },

    /**
     * Create multiple deals in batch
     */
    createDeals: async (deals: Array<Record<string, any>>): Promise<BatchResponse<HubSpotDeal>> => {
      return this.execute('batch.createDeals', async () => {
        return this.request<BatchResponse<HubSpotDeal>>(
          'POST',
          '/crm/v3/objects/deals/batch/create',
          { inputs: deals.map(properties => ({ properties })) }
        )
      }, { metadata: { count: deals.length } })
    },

    /**
     * Update multiple deals in batch
     */
    updateDeals: async (
      updates: Array<{ id: string; properties: Record<string, any> }>
    ): Promise<BatchResponse<HubSpotDeal>> => {
      return this.execute('batch.updateDeals', async () => {
        return this.request<BatchResponse<HubSpotDeal>>(
          'POST',
          '/crm/v3/objects/deals/batch/update',
          { inputs: updates }
        )
      }, { metadata: { count: updates.length } })
    },
  }

  // ==========================================================================
  // SEARCH API
  // ==========================================================================

  search = {
    /**
     * Search contacts with filters
     */
    contacts: async (
      filterGroups: Array<{
        filters: Array<{
          propertyName: string
          operator: string
          value: string
        }>
      }>,
      options?: {
        properties?: string[]
        limit?: number
        after?: string
        sorts?: Array<{
          propertyName: string
          direction: 'ASCENDING' | 'DESCENDING'
        }>
      }
    ): Promise<SearchResponse<HubSpotContact>> => {
      return this.execute('search.contacts', async () => {
        return this.request<SearchResponse<HubSpotContact>>(
          'POST',
          '/crm/v3/objects/contacts/search',
          {
            filterGroups,
            properties: options?.properties || [],
            limit: options?.limit || 100,
            after: options?.after,
            sorts: options?.sorts || [],
          }
        )
      })
    },

    /**
     * Search companies with filters
     */
    companies: async (
      filterGroups: Array<{
        filters: Array<{
          propertyName: string
          operator: string
          value: string
        }>
      }>,
      options?: {
        properties?: string[]
        limit?: number
        after?: string
        sorts?: Array<{
          propertyName: string
          direction: 'ASCENDING' | 'DESCENDING'
        }>
      }
    ): Promise<SearchResponse<HubSpotCompany>> => {
      return this.execute('search.companies', async () => {
        return this.request<SearchResponse<HubSpotCompany>>(
          'POST',
          '/crm/v3/objects/companies/search',
          {
            filterGroups,
            properties: options?.properties || [],
            limit: options?.limit || 100,
            after: options?.after,
            sorts: options?.sorts || [],
          }
        )
      })
    },

    /**
     * Search deals with filters
     */
    deals: async (
      filterGroups: Array<{
        filters: Array<{
          propertyName: string
          operator: string
          value: string
        }>
      }>,
      options?: {
        properties?: string[]
        limit?: number
        after?: string
        sorts?: Array<{
          propertyName: string
          direction: 'ASCENDING' | 'DESCENDING'
        }>
      }
    ): Promise<SearchResponse<HubSpotDeal>> => {
      return this.execute('search.deals', async () => {
        return this.request<SearchResponse<HubSpotDeal>>(
          'POST',
          '/crm/v3/objects/deals/search',
          {
            filterGroups,
            properties: options?.properties || [],
            limit: options?.limit || 100,
            after: options?.after,
            sorts: options?.sorts || [],
          }
        )
      })
    },
  }

  // ==========================================================================
  // PROPERTIES API
  // ==========================================================================

  properties = {
    /**
     * Get all properties for an object type
     */
    list: async (objectType: 'contacts' | 'companies' | 'deals' | 'tickets'): Promise<HubSpotProperty[]> => {
      return this.execute('properties.list', async () => {
        const response = await this.request<{ results: HubSpotProperty[] }>(
          'GET',
          `/crm/v3/properties/${objectType}`
        )
        return response.results
      }, { metadata: { objectType } })
    },

    /**
     * Get property by name
     */
    get: async (
      objectType: 'contacts' | 'companies' | 'deals' | 'tickets',
      propertyName: string
    ): Promise<HubSpotProperty> => {
      return this.execute('properties.get', async () => {
        return this.request<HubSpotProperty>(
          'GET',
          `/crm/v3/properties/${objectType}/${propertyName}`
        )
      }, { metadata: { objectType, propertyName } })
    },

    /**
     * Create property
     */
    create: async (
      objectType: 'contacts' | 'companies' | 'deals' | 'tickets',
      property: Partial<HubSpotProperty>
    ): Promise<HubSpotProperty> => {
      return this.execute('properties.create', async () => {
        return this.request<HubSpotProperty>(
          'POST',
          `/crm/v3/properties/${objectType}`,
          property
        )
      }, { metadata: { objectType, propertyName: property.name } })
    },
  }
}

// Export singleton instance
export const hubspotClient = new HubSpotConnector()

// Export class for custom instances
export { HubSpotConnector }
