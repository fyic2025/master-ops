/**
 * Smartlead Connector
 *
 * Provides type-safe Smartlead API client with built-in:
 * - Rate limiting (10 requests per 2 seconds)
 * - Automatic retries
 * - Error handling and logging
 * - Connection pooling
 *
 * Usage:
 * ```typescript
 * import { smartleadClient } from '@/shared/libs/integrations/smartlead'
 *
 * const leads = await smartleadClient.leads.add(campaignId, [{ email: 'test@example.com' }])
 * const campaigns = await smartleadClient.campaigns.list()
 * ```
 */

import { BaseConnector } from '../base/base-connector'
import { ErrorHandler } from '../base/error-handler'
import * as dotenv from 'dotenv'
import type {
  SmartleadConfig,
  SmartleadLead,
  SmartleadCampaign,
  SmartleadEmailAccount,
  SmartleadWebhook,
  SmartleadClient,
  AddLeadsRequest,
  AddLeadsResponse,
  CreateCampaignRequest,
  UpdateCampaignSettingsRequest,
  CampaignSchedule,
  CampaignSequence,
  SaveSequenceRequest,
  CreateEmailAccountRequest,
  UpdateEmailAccountRequest,
  WarmupDetails,
  WarmupStatsResponse,
  CampaignStatistics,
  CampaignAnalytics,
  AnalyticsByDateRange,
  MessageHistory,
  ReplyToLeadRequest,
  LeadCategory,
  ListOptions,
  ListResponse,
  WebhookEventType,
} from './types'

dotenv.config()

class SmartleadConnector extends BaseConnector {
  private apiKey: string
  private baseUrl: string

  constructor(config: SmartleadConfig = {}) {
    super('smartlead', {
      rateLimiter: {
        maxRequests: 10,
        windowMs: 2000, // 10 requests per 2 seconds
      },
      retry: {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
      },
      timeout: 30000, // 30 second timeout
    })

    this.apiKey = config.apiKey || process.env.SMARTLEAD_API_KEY || ''
    this.baseUrl = config.baseUrl || 'https://server.smartlead.ai/api/v1'

    if (!this.apiKey) {
      throw ErrorHandler.config('SMARTLEAD_API_KEY is required', {
        service: 'smartlead',
      })
    }
  }

  /**
   * Perform health check
   */
  protected async performHealthCheck(): Promise<void> {
    try {
      // Note: Smartlead API doesn't support limit/offset on campaigns endpoint
      await this.campaigns.list()
    } catch (error) {
      throw ErrorHandler.connection('Health check failed', {
        service: 'smartlead',
        details: { originalError: (error as Error).message },
      })
    }
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`)
    url.searchParams.append('api_key', this.apiKey)

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data)
    }

    const response = await fetch(url.toString(), options)

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`

      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.message || errorMessage
      } catch {
        // Use default error message if not JSON
      }

      if (response.status === 401) {
        throw ErrorHandler.auth('Invalid API key', {
          service: 'smartlead',
          details: { statusCode: response.status },
        })
      }

      if (response.status === 429) {
        throw ErrorHandler.rateLimit('Rate limit exceeded', {
          service: 'smartlead',
          details: { statusCode: response.status },
        })
      }

      throw ErrorHandler.api(errorMessage, {
        service: 'smartlead',
        details: { statusCode: response.status },
      })
    }

    return response.json() as T
  }

  // ============================================================================
  // Lead Management
  // ============================================================================

  public leads = {
    /**
     * Add leads to a campaign
     */
    add: (campaignId: string, request: AddLeadsRequest) =>
      this.execute('leads.add', () =>
        this.request<AddLeadsResponse>(
          'POST',
          `/campaigns/${campaignId}/leads`,
          request
        )
      ),

    /**
     * Get lead by email
     */
    getByEmail: (email: string) =>
      this.execute('leads.getByEmail', () =>
        this.request<SmartleadLead>('GET', `/leads/?email=${encodeURIComponent(email)}`)
      ),

    /**
     * List leads in a campaign
     */
    list: (campaignId: string, options: ListOptions = {}) =>
      this.execute('leads.list', async () => {
        const params = new URLSearchParams()
        if (options.offset) params.append('offset', options.offset.toString())
        if (options.limit) params.append('limit', options.limit.toString())

        const response = await this.request<{ data: any[]; total_leads: string; offset: number; limit: number }>(
          'GET',
          `/campaigns/${campaignId}/leads?${params.toString()}`
        )

        // Transform from { data: [] } to { results: [] } format
        return {
          results: response.data,
          total: parseInt(response.total_leads) || response.data.length,
          offset: response.offset,
          limit: response.limit,
        }
      }),

    /**
     * Resume a paused lead
     */
    resume: (campaignId: string, leadId: string, delayDays?: number) =>
      this.execute('leads.resume', () =>
        this.request('POST', `/campaigns/${campaignId}/leads/${leadId}/resume`, {
          resume_lead_with_delay_days: delayDays,
        })
      ),

    /**
     * Pause a lead
     */
    pause: (campaignId: string, leadId: string) =>
      this.execute('leads.pause', () =>
        this.request('POST', `/campaigns/${campaignId}/leads/${leadId}/pause`)
      ),

    /**
     * Delete lead from campaign
     */
    delete: (campaignId: string, leadId: string) =>
      this.execute('leads.delete', () =>
        this.request('DELETE', `/campaigns/${campaignId}/leads/${leadId}`)
      ),

    /**
     * Unsubscribe lead from a campaign
     */
    unsubscribeFromCampaign: (campaignId: string, leadId: string) =>
      this.execute('leads.unsubscribeFromCampaign', () =>
        this.request('POST', `/campaigns/${campaignId}/leads/${leadId}/unsubscribe`)
      ),

    /**
     * Unsubscribe lead from all campaigns
     */
    unsubscribeFromAll: (leadId: string) =>
      this.execute('leads.unsubscribeFromAll', () =>
        this.request('POST', `/leads/${leadId}/unsubscribe`)
      ),

    /**
     * Fetch lead categories
     */
    getCategories: () =>
      this.execute('leads.getCategories', () =>
        this.request<{ results: LeadCategory[] }>('GET', '/leads/fetch-categories')
      ),

    /**
     * Get campaigns for a lead
     */
    getCampaigns: (leadId: string) =>
      this.execute('leads.getCampaigns', () =>
        this.request<ListResponse<SmartleadCampaign>>('GET', `/leads/${leadId}/campaigns`)
      ),
  }

  // ============================================================================
  // Campaign Management
  // ============================================================================

  public campaigns = {
    /**
     * Get campaign by ID
     */
    get: (campaignId: string) =>
      this.execute('campaigns.get', () =>
        this.request<SmartleadCampaign>('GET', `/campaigns/${campaignId}`)
      ),

    /**
     * List all campaigns
     * Note: Smartlead API returns a direct array, we wrap it in ListResponse format
     */
    list: () =>
      this.execute('campaigns.list', async () => {
        const response = await this.request<SmartleadCampaign[]>('GET', '/campaigns')
        // Wrap array response in ListResponse format
        return {
          results: response,
          total: response.length,
        }
      }),

    /**
     * Create a new campaign
     */
    create: (request: CreateCampaignRequest) =>
      this.execute('campaigns.create', () =>
        this.request<SmartleadCampaign>('POST', '/campaigns/create', request)
      ),

    /**
     * Update campaign schedule
     */
    updateSchedule: (campaignId: string, schedule: CampaignSchedule) =>
      this.execute('campaigns.updateSchedule', () =>
        this.request('POST', `/campaigns/${campaignId}/schedule`, schedule)
      ),

    /**
     * Update campaign settings
     */
    updateSettings: (campaignId: string, settings: UpdateCampaignSettingsRequest) =>
      this.execute('campaigns.updateSettings', () =>
        this.request('POST', `/campaigns/${campaignId}/settings`, settings)
      ),

    /**
     * Delete campaign
     */
    delete: (campaignId: string) =>
      this.execute('campaigns.delete', () =>
        this.request('DELETE', `/campaigns/${campaignId}`)
      ),

    /**
     * Get campaign sequence
     */
    getSequence: (campaignId: string) =>
      this.execute('campaigns.getSequence', () =>
        this.request<{ sequences: CampaignSequence[] }>(
          'GET',
          `/campaigns/${campaignId}/sequences`
        )
      ),

    /**
     * Save campaign sequence
     */
    saveSequence: (campaignId: string, sequences: SaveSequenceRequest) =>
      this.execute('campaigns.saveSequence', () =>
        this.request('POST', `/campaigns/${campaignId}/sequences`, sequences)
      ),
  }

  // ============================================================================
  // Email Account Management
  // ============================================================================

  public emailAccounts = {
    /**
     * List email accounts
     * Note: Smartlead API returns a direct array, we wrap it in ListResponse format
     */
    list: () =>
      this.execute('emailAccounts.list', async () => {
        const response = await this.request<SmartleadEmailAccount[]>('GET', '/email-accounts')
        // Wrap array response in ListResponse format
        return {
          results: response,
          total: response.length,
        }
      }),

    /**
     * Create email account
     */
    create: (request: CreateEmailAccountRequest) =>
      this.execute('emailAccounts.create', () =>
        this.request<SmartleadEmailAccount>('POST', '/email-accounts/save', request)
      ),

    /**
     * Update email account
     */
    update: (accountId: string, updates: UpdateEmailAccountRequest) =>
      this.execute('emailAccounts.update', () =>
        this.request('POST', `/email-accounts/${accountId}`, updates)
      ),

    /**
     * Get email account by ID
     */
    get: (accountId: string) =>
      this.execute('emailAccounts.get', () =>
        this.request<SmartleadEmailAccount>('GET', `/email-accounts/${accountId}/`)
      ),

    /**
     * Update warmup settings
     */
    updateWarmup: (accountId: string, warmup: WarmupDetails) =>
      this.execute('emailAccounts.updateWarmup', () =>
        this.request('POST', `/email-accounts/${accountId}/warmup`, warmup)
      ),

    /**
     * Get warmup statistics
     */
    getWarmupStats: (accountId: string) =>
      this.execute('emailAccounts.getWarmupStats', () =>
        this.request<WarmupStatsResponse>('GET', `/email-accounts/${accountId}/warmup-stats`)
      ),

    /**
     * List campaign email accounts
     * Note: API returns direct array, we wrap it in ListResponse format
     */
    listForCampaign: (campaignId: string) =>
      this.execute('emailAccounts.listForCampaign', async () => {
        const response = await this.request<SmartleadEmailAccount[]>(
          'GET',
          `/campaigns/${campaignId}/email-accounts`
        )
        // Wrap array response in ListResponse format
        return {
          results: response,
          total: response.length,
        }
      }),

    /**
     * Add email accounts to campaign
     */
    addToCampaign: (campaignId: string, accountIds: string[]) =>
      this.execute('emailAccounts.addToCampaign', () =>
        this.request('POST', `/campaigns/${campaignId}/email-accounts`, {
          email_account_ids: accountIds,
        })
      ),

    /**
     * Remove email accounts from campaign
     */
    removeFromCampaign: (campaignId: string, accountIds: string[]) =>
      this.execute('emailAccounts.removeFromCampaign', () =>
        this.request('DELETE', `/campaigns/${campaignId}/email-accounts`, {
          email_account_ids: accountIds,
        })
      ),
  }

  // ============================================================================
  // Analytics & Statistics
  // ============================================================================

  public analytics = {
    /**
     * Get campaign statistics
     */
    getCampaignStats: (
      campaignId: string,
      options: {
        offset?: number
        limit?: number
        email_sequence_number?: number
        email_status?: 'opened' | 'clicked' | 'replied' | 'unsubscribed' | 'bounced'
      } = {}
    ) =>
      this.execute('analytics.getCampaignStats', () => {
        const params = new URLSearchParams()
        if (options.offset) params.append('offset', options.offset.toString())
        if (options.limit) params.append('limit', options.limit.toString())
        if (options.email_sequence_number) {
          params.append('email_sequence_number', options.email_sequence_number.toString())
        }
        if (options.email_status) params.append('email_status', options.email_status)

        return this.request<ListResponse<CampaignStatistics>>(
          'GET',
          `/campaigns/${campaignId}/statistics?${params.toString()}`
        )
      }),

    /**
     * Get campaign analytics by date range
     */
    getByDateRange: (campaignId: string, startDate: string, endDate: string) =>
      this.execute('analytics.getByDateRange', () =>
        this.request<AnalyticsByDateRange>(
          'GET',
          `/campaigns/${campaignId}/analytics-by-date?start_date=${startDate}&end_date=${endDate}`
        )
      ),

    /**
     * Get comprehensive campaign analytics
     */
    getCampaignAnalytics: (campaignId: string) =>
      this.execute('analytics.getCampaignAnalytics', () =>
        this.request<CampaignAnalytics>('GET', `/campaigns/${campaignId}/analytics`)
      ),

    /**
     * Get lead message history
     */
    getMessageHistory: (campaignId: string, leadId: string) =>
      this.execute('analytics.getMessageHistory', () =>
        this.request<{ messages: MessageHistory[] }>(
          'GET',
          `/campaigns/${campaignId}/leads/${leadId}/message-history`
        )
      ),

    /**
     * Export campaign data as CSV
     */
    exportLeads: (campaignId: string) =>
      this.execute('analytics.exportLeads', async () => {
        const response = await fetch(
          `${this.baseUrl}/campaigns/${campaignId}/leads-export?api_key=${this.apiKey}`
        )

        if (!response.ok) {
          throw ErrorHandler.api(`Failed to export leads: ${response.statusText}`, {
            service: 'smartlead',
            details: { statusCode: response.status },
          })
        }

        return response.text()
      }),
  }

  // ============================================================================
  // Inbox/Reply Management
  // ============================================================================

  public inbox = {
    /**
     * Reply to a lead
     */
    reply: (campaignId: string, request: ReplyToLeadRequest) =>
      this.execute('inbox.reply', () =>
        this.request('POST', `/campaigns/${campaignId}/reply-email-thread`, request)
      ),
  }

  // ============================================================================
  // Webhook Management
  // ============================================================================

  public webhooks = {
    /**
     * Add or update campaign webhook
     */
    addToCampaign: (campaignId: string, webhookUrl: string, eventTypes: WebhookEventType[]) =>
      this.execute('webhooks.addToCampaign', () =>
        this.request<SmartleadWebhook>('POST', `/campaigns/${campaignId}/webhooks`, {
          webhook_url: webhookUrl,
          event_types: eventTypes,
        })
      ),

    /**
     * Fetch webhooks for campaign
     */
    listForCampaign: (campaignId: string) =>
      this.execute('webhooks.listForCampaign', () =>
        this.request<{ webhooks: SmartleadWebhook[] }>(
          'GET',
          `/campaigns/${campaignId}/webhooks`
        )
      ),
  }

  // ============================================================================
  // Client Management
  // ============================================================================

  public clients = {
    /**
     * List all clients
     */
    list: () =>
      this.execute('clients.list', () =>
        this.request<{ clients: SmartleadClient[] }>('GET', '/clients')
      ),
  }
}

// Export singleton instance
export const smartleadClient = new SmartleadConnector()

// Export class for custom instances
export { SmartleadConnector }
