/**
 * Google Ads Connector
 *
 * Provides type-safe Google Ads API client with built-in:
 * - Rate limiting (15,000 requests per day standard)
 * - Automatic OAuth2 token refresh
 * - Retry with exponential backoff
 * - Multi-account support (BOO, Teelixir, Red Hill Fresh)
 * - GAQL query execution
 *
 * Usage:
 * ```typescript
 * import { GoogleAdsConnector } from '@/shared/libs/integrations/google-ads'
 *
 * // Create connector for specific business
 * const client = new GoogleAdsConnector('boo')
 *
 * // Get campaign metrics
 * const metrics = await client.campaigns.getMetrics({
 *   dateRange: { startDate: '2025-01-01', endDate: '2025-01-31' }
 * })
 *
 * // Search terms analysis
 * const searchTerms = await client.searchTerms.list({
 *   dateRange: { startDate: '2025-01-01', endDate: '2025-01-07' },
 *   minClicks: 5
 * })
 * ```
 */

import { BaseConnector } from '../base/base-connector'
import { ErrorHandler } from '../base/error-handler'
import * as dotenv from 'dotenv'
import {
  BusinessId,
  GoogleAdsCredentials,
  Campaign,
  AdGroup,
  Keyword,
  CampaignMetrics,
  KeywordMetrics,
  SearchTermMetrics,
  AccountMetrics,
  GaqlResponse,
  CampaignListOptions,
  MetricsOptions,
  SearchTermOptions,
  BidAdjustment,
  NegativeKeyword,
  CampaignBudgetUpdate,
  GoogleAdsHealthCheck,
  AccountConfig,
  DateRange,
} from './types'

dotenv.config()

// Environment variable mapping per business
const ENV_MAPPING: Record<BusinessId, { prefix: string; displayName: string }> = {
  boo: { prefix: 'GOOGLE_ADS_BOO', displayName: 'Buy Organics Online' },
  teelixir: { prefix: 'GOOGLE_ADS_TEELIXIR', displayName: 'Teelixir' },
  redhillfresh: { prefix: 'GOOGLE_ADS_RHF', displayName: 'Red Hill Fresh' },
}

export interface GoogleAdsConnectorConfig {
  business: BusinessId
  credentials?: Partial<GoogleAdsCredentials>
  rateLimitPerDay?: number
}

export class GoogleAdsConnector extends BaseConnector {
  private readonly business: BusinessId
  private readonly customerId: string
  private readonly developerToken: string
  private readonly clientId: string
  private readonly clientSecret: string
  private refreshToken: string
  private accessToken?: string
  private tokenExpiresAt?: number
  private readonly baseUrl = 'https://googleads.googleapis.com/v17'

  constructor(config: GoogleAdsConnectorConfig | BusinessId) {
    const businessId = typeof config === 'string' ? config : config.business
    const configObj = typeof config === 'string' ? { business: config } : config

    super('google-ads', {
      rateLimiter: {
        // Google Ads: 15,000 operations/day for basic access
        // Spread across 24 hours = ~10 requests/minute sustained
        maxRequests: configObj.rateLimitPerDay || 500,
        windowMs: 3600000, // 500 per hour (safe buffer)
        minDelay: 100, // 100ms between requests
      },
      retry: {
        maxRetries: 3,
        retryableStatusCodes: [429, 500, 502, 503, 504],
        retryableErrors: ['DEADLINE_EXCEEDED', 'UNAVAILABLE', 'INTERNAL'],
      },
      timeout: 60000, // 60 second timeout for reports
    })

    this.business = businessId
    const envPrefix = ENV_MAPPING[businessId].prefix

    // Load credentials from environment or config
    this.developerToken =
      configObj.credentials?.developerToken ||
      process.env.GOOGLE_ADS_DEVELOPER_TOKEN ||
      ''
    this.clientId =
      configObj.credentials?.clientId ||
      process.env.GOOGLE_ADS_CLIENT_ID ||
      ''
    this.clientSecret =
      configObj.credentials?.clientSecret ||
      process.env.GOOGLE_ADS_CLIENT_SECRET ||
      ''
    this.refreshToken =
      configObj.credentials?.refreshToken ||
      process.env[`${envPrefix}_REFRESH_TOKEN`] ||
      ''
    this.customerId =
      configObj.credentials?.customerId ||
      process.env[`${envPrefix}_CUSTOMER_ID`] ||
      ''

    // Validate required credentials
    if (!this.developerToken) {
      console.warn(
        'Google Ads developer token not set. Set GOOGLE_ADS_DEVELOPER_TOKEN or pass in config.'
      )
    }

    if (!this.customerId) {
      console.warn(
        `Google Ads customer ID for ${businessId} not set. Set ${envPrefix}_CUSTOMER_ID or pass in config.`
      )
    }
  }

  /**
   * Refresh OAuth2 access token
   */
  private async refreshAccessToken(): Promise<void> {
    if (!this.clientId || !this.clientSecret || !this.refreshToken) {
      throw new Error('OAuth2 credentials not configured. Set CLIENT_ID, CLIENT_SECRET, and REFRESH_TOKEN.')
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
    // Set expiry 5 minutes before actual expiry for safety
    this.tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000
  }

  /**
   * Get valid access token (refresh if needed)
   */
  private async getAccessToken(): Promise<string> {
    if (!this.accessToken || !this.tokenExpiresAt || Date.now() >= this.tokenExpiresAt) {
      await this.refreshAccessToken()
    }
    return this.accessToken!
  }

  /**
   * Format customer ID (remove dashes)
   */
  private formatCustomerId(id: string): string {
    return id.replace(/-/g, '')
  }

  /**
   * Execute GAQL query
   */
  private async executeGaql<T>(query: string): Promise<GaqlResponse<T>> {
    const accessToken = await this.getAccessToken()
    const customerId = this.formatCustomerId(this.customerId)

    const response = await fetch(
      `${this.baseUrl}/customers/${customerId}/googleAds:searchStream`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': this.developerToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      }
    )

    if (!response.ok) {
      const errorBody = await response.text()
      let errorMessage = `Google Ads API error: ${response.status}`

      try {
        const errorJson = JSON.parse(errorBody)
        errorMessage = errorJson.error?.message || errorMessage
      } catch {
        // Use default
      }

      if (response.status === 429) {
        throw ErrorHandler.rateLimit(errorMessage, {
          service: 'google-ads',
          details: { business: this.business, query: query.substring(0, 100) },
        })
      }

      throw ErrorHandler.wrap(new Error(errorMessage), {
        statusCode: response.status,
        service: 'google-ads',
        details: { business: this.business },
      })
    }

    // Handle streaming response (NDJSON)
    const text = await response.text()
    const results: T[] = []

    // Parse NDJSON (newline-delimited JSON)
    const lines = text.split('\n').filter(line => line.trim())
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line)
        if (parsed.results) {
          results.push(...parsed.results)
        }
      } catch {
        // Skip invalid lines
      }
    }

    return { results }
  }

  /**
   * Execute mutation operation
   */
  private async executeMutation(operations: any[]): Promise<any> {
    const accessToken = await this.getAccessToken()
    const customerId = this.formatCustomerId(this.customerId)

    const response = await fetch(
      `${this.baseUrl}/customers/${customerId}/googleAds:mutate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': this.developerToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mutateOperations: operations }),
      }
    )

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`Mutation failed: ${errorBody}`)
    }

    return response.json()
  }

  /**
   * Build date filter for GAQL
   */
  private buildDateFilter(dateRange: DateRange): string {
    return `segments.date BETWEEN '${dateRange.startDate}' AND '${dateRange.endDate}'`
  }

  // ============================================
  // CAMPAIGNS API
  // ============================================
  readonly campaigns = {
    /**
     * List all campaigns
     */
    list: async (options: CampaignListOptions = {}): Promise<Campaign[]> => {
      return this.execute('campaigns.list', async () => {
        let query = `
          SELECT
            campaign.id,
            campaign.name,
            campaign.status,
            campaign.advertising_channel_type,
            campaign.bidding_strategy_type,
            campaign.campaign_budget,
            campaign.start_date,
            campaign.end_date
          FROM campaign
        `

        const conditions: string[] = []
        if (options.status) {
          const statuses = Array.isArray(options.status) ? options.status : [options.status]
          conditions.push(`campaign.status IN (${statuses.map(s => `'${s}'`).join(',')})`)
        }
        if (options.type) {
          const types = Array.isArray(options.type) ? options.type : [options.type]
          conditions.push(`campaign.advertising_channel_type IN (${types.map(t => `'${t}'`).join(',')})`)
        }
        if (options.ids?.length) {
          conditions.push(`campaign.id IN (${options.ids.join(',')})`)
        }

        if (conditions.length > 0) {
          query += ` WHERE ${conditions.join(' AND ')}`
        }

        if (options.limit) {
          query += ` LIMIT ${options.limit}`
        }

        const response = await this.executeGaql<any>(query)
        return response.results.map((r: any) => ({
          id: r.campaign?.id,
          name: r.campaign?.name,
          status: r.campaign?.status,
          type: r.campaign?.advertisingChannelType,
          biddingStrategy: r.campaign?.biddingStrategyType,
          startDate: r.campaign?.startDate,
          endDate: r.campaign?.endDate,
        }))
      })
    },

    /**
     * Get campaign performance metrics
     */
    getMetrics: async (options: MetricsOptions): Promise<CampaignMetrics[]> => {
      return this.execute('campaigns.getMetrics', async () => {
        let query = `
          SELECT
            campaign.id,
            campaign.name,
            campaign.status,
            campaign.advertising_channel_type,
            campaign.campaign_budget,
            segments.date,
            metrics.impressions,
            metrics.clicks,
            metrics.cost_micros,
            metrics.conversions,
            metrics.conversions_value,
            metrics.ctr,
            metrics.average_cpc,
            metrics.search_impression_share
          FROM campaign
          WHERE ${this.buildDateFilter(options.dateRange)}
        `

        if (options.campaignIds?.length) {
          query += ` AND campaign.id IN (${options.campaignIds.join(',')})`
        }

        query += ` ORDER BY segments.date DESC`

        if (options.limit) {
          query += ` LIMIT ${options.limit}`
        }

        const response = await this.executeGaql<any>(query)
        return response.results.map((r: any) => {
          const costMicros = parseInt(r.metrics?.costMicros || '0')
          const conversionValue = parseFloat(r.metrics?.conversionsValue || '0')
          const cost = costMicros / 1_000_000

          return {
            campaignId: r.campaign?.id,
            campaignName: r.campaign?.name,
            campaignType: r.campaign?.advertisingChannelType,
            campaignStatus: r.campaign?.status,
            date: r.segments?.date,
            impressions: parseInt(r.metrics?.impressions || '0'),
            clicks: parseInt(r.metrics?.clicks || '0'),
            costMicros: r.metrics?.costMicros || '0',
            conversions: parseFloat(r.metrics?.conversions || '0'),
            conversionValue,
            ctr: parseFloat(r.metrics?.ctr || '0'),
            avgCpc: parseFloat(r.metrics?.averageCpc || '0') / 1_000_000,
            roas: cost > 0 ? conversionValue / cost : 0,
            impressionShare: parseFloat(r.metrics?.searchImpressionShare || '0'),
          }
        })
      })
    },

    /**
     * Get today's performance summary
     */
    getTodaysSummary: async (): Promise<CampaignMetrics[]> => {
      const today = new Date().toISOString().split('T')[0]
      return this.campaigns.getMetrics({
        dateRange: { startDate: today, endDate: today },
      })
    },

    /**
     * Update campaign budget
     */
    updateBudget: async (update: CampaignBudgetUpdate): Promise<void> => {
      return this.execute('campaigns.updateBudget', async () => {
        // Get current campaign budget resource name
        const query = `
          SELECT campaign.campaign_budget
          FROM campaign
          WHERE campaign.id = ${update.campaignId}
        `
        const response = await this.executeGaql<any>(query)
        if (!response.results.length) {
          throw new Error(`Campaign ${update.campaignId} not found`)
        }

        const budgetResourceName = response.results[0].campaign?.campaignBudget
        if (!budgetResourceName) {
          throw new Error(`No budget found for campaign ${update.campaignId}`)
        }

        // Update budget
        await this.executeMutation([
          {
            campaignBudgetOperation: {
              update: {
                resourceName: budgetResourceName,
                amountMicros: update.budgetAmountMicros,
              },
              updateMask: 'amount_micros',
            },
          },
        ])
      })
    },
  }

  // ============================================
  // KEYWORDS API
  // ============================================
  readonly keywords = {
    /**
     * Get keyword performance metrics
     */
    getMetrics: async (options: MetricsOptions): Promise<KeywordMetrics[]> => {
      return this.execute('keywords.getMetrics', async () => {
        let query = `
          SELECT
            ad_group_criterion.criterion_id,
            ad_group_criterion.keyword.text,
            ad_group_criterion.keyword.match_type,
            ad_group_criterion.quality_info.quality_score,
            ad_group_criterion.quality_info.creative_quality_score,
            ad_group_criterion.quality_info.post_click_quality_score,
            ad_group_criterion.quality_info.search_predicted_ctr,
            ad_group.id,
            campaign.id,
            segments.date,
            metrics.impressions,
            metrics.clicks,
            metrics.cost_micros,
            metrics.conversions,
            metrics.conversions_value,
            metrics.average_position
          FROM keyword_view
          WHERE ${this.buildDateFilter(options.dateRange)}
        `

        if (options.campaignIds?.length) {
          query += ` AND campaign.id IN (${options.campaignIds.join(',')})`
        }
        if (options.adGroupIds?.length) {
          query += ` AND ad_group.id IN (${options.adGroupIds.join(',')})`
        }

        query += ` ORDER BY metrics.cost_micros DESC`

        if (options.limit) {
          query += ` LIMIT ${options.limit}`
        }

        const response = await this.executeGaql<any>(query)
        return response.results.map((r: any) => ({
          keywordId: r.adGroupCriterion?.criterionId,
          keywordText: r.adGroupCriterion?.keyword?.text,
          matchType: r.adGroupCriterion?.keyword?.matchType,
          adGroupId: r.adGroup?.id,
          campaignId: r.campaign?.id,
          date: r.segments?.date,
          impressions: parseInt(r.metrics?.impressions || '0'),
          clicks: parseInt(r.metrics?.clicks || '0'),
          costMicros: r.metrics?.costMicros || '0',
          conversions: parseFloat(r.metrics?.conversions || '0'),
          conversionValue: parseFloat(r.metrics?.conversionsValue || '0'),
          qualityScore: r.adGroupCriterion?.qualityInfo?.qualityScore,
          expectedCtr: r.adGroupCriterion?.qualityInfo?.searchPredictedCtr,
          adRelevance: r.adGroupCriterion?.qualityInfo?.creativeQualityScore,
          landingPageExperience: r.adGroupCriterion?.qualityInfo?.postClickQualityScore,
          avgPosition: parseFloat(r.metrics?.averagePosition || '0'),
        }))
      })
    },

    /**
     * Get keywords with quality score issues
     */
    getQualityIssues: async (options: MetricsOptions): Promise<KeywordMetrics[]> => {
      const metrics = await this.keywords.getMetrics(options)
      return metrics.filter(k => k.qualityScore && k.qualityScore < 5)
    },

    /**
     * Adjust keyword bid
     */
    adjustBid: async (adjustment: BidAdjustment): Promise<void> => {
      return this.execute('keywords.adjustBid', async () => {
        await this.executeMutation([
          {
            adGroupCriterionOperation: {
              update: {
                resourceName: `customers/${this.formatCustomerId(this.customerId)}/adGroupCriteria/${adjustment.keywordId}`,
                cpcBidMicros: adjustment.newBidMicros,
              },
              updateMask: 'cpc_bid_micros',
            },
          },
        ])
      })
    },
  }

  // ============================================
  // SEARCH TERMS API
  // ============================================
  readonly searchTerms = {
    /**
     * Get search term report
     */
    list: async (options: SearchTermOptions): Promise<SearchTermMetrics[]> => {
      return this.execute('searchTerms.list', async () => {
        let query = `
          SELECT
            search_term_view.search_term,
            ad_group.id,
            campaign.id,
            segments.date,
            metrics.impressions,
            metrics.clicks,
            metrics.cost_micros,
            metrics.conversions,
            metrics.conversions_value
          FROM search_term_view
          WHERE ${this.buildDateFilter(options.dateRange)}
        `

        if (options.campaignIds?.length) {
          query += ` AND campaign.id IN (${options.campaignIds.join(',')})`
        }
        if (options.adGroupIds?.length) {
          query += ` AND ad_group.id IN (${options.adGroupIds.join(',')})`
        }
        if (options.minImpressions) {
          query += ` AND metrics.impressions >= ${options.minImpressions}`
        }
        if (options.minClicks) {
          query += ` AND metrics.clicks >= ${options.minClicks}`
        }

        query += ` ORDER BY metrics.cost_micros DESC`

        if (options.limit) {
          query += ` LIMIT ${options.limit}`
        }

        const response = await this.executeGaql<any>(query)
        return response.results.map((r: any) => ({
          searchTerm: r.searchTermView?.searchTerm,
          adGroupId: r.adGroup?.id,
          campaignId: r.campaign?.id,
          date: r.segments?.date,
          impressions: parseInt(r.metrics?.impressions || '0'),
          clicks: parseInt(r.metrics?.clicks || '0'),
          costMicros: r.metrics?.costMicros || '0',
          conversions: parseFloat(r.metrics?.conversions || '0'),
          conversionValue: parseFloat(r.metrics?.conversionsValue || '0'),
        }))
      })
    },

    /**
     * Find wasteful search terms (high spend, no conversions)
     */
    findWasteful: async (
      options: SearchTermOptions & { minSpendMicros?: number }
    ): Promise<SearchTermMetrics[]> => {
      const terms = await this.searchTerms.list(options)
      const minSpend = options.minSpendMicros || 10_000_000 // $10 default
      return terms.filter(
        t => parseInt(t.costMicros) >= minSpend && t.conversions === 0
      )
    },

    /**
     * Add negative keyword
     */
    addNegative: async (negative: NegativeKeyword): Promise<void> => {
      return this.execute('searchTerms.addNegative', async () => {
        await this.executeMutation([
          {
            campaignCriterionOperation: {
              create: {
                campaign: `customers/${this.formatCustomerId(this.customerId)}/campaigns/${negative.campaignId}`,
                negative: true,
                keyword: {
                  text: negative.text,
                  matchType: negative.matchType,
                },
              },
            },
          },
        ])
      })
    },
  }

  // ============================================
  // ACCOUNT API
  // ============================================
  readonly account = {
    /**
     * Get account-level metrics
     */
    getMetrics: async (options: { dateRange: DateRange }): Promise<AccountMetrics[]> => {
      return this.execute('account.getMetrics', async () => {
        const query = `
          SELECT
            customer.id,
            segments.date,
            metrics.impressions,
            metrics.clicks,
            metrics.cost_micros,
            metrics.conversions,
            metrics.conversions_value,
            metrics.ctr,
            metrics.average_cpc
          FROM customer
          WHERE ${this.buildDateFilter(options.dateRange)}
          ORDER BY segments.date DESC
        `

        const response = await this.executeGaql<any>(query)
        return response.results.map((r: any) => {
          const costMicros = parseInt(r.metrics?.costMicros || '0')
          const conversionValue = parseFloat(r.metrics?.conversionsValue || '0')
          const cost = costMicros / 1_000_000

          return {
            customerId: r.customer?.id,
            date: r.segments?.date,
            impressions: parseInt(r.metrics?.impressions || '0'),
            clicks: parseInt(r.metrics?.clicks || '0'),
            costMicros: r.metrics?.costMicros || '0',
            conversions: parseFloat(r.metrics?.conversions || '0'),
            conversionValue,
            ctr: parseFloat(r.metrics?.ctr || '0'),
            avgCpc: parseFloat(r.metrics?.averageCpc || '0') / 1_000_000,
            roas: cost > 0 ? conversionValue / cost : 0,
          }
        })
      })
    },

    /**
     * Get account info
     */
    getInfo: async (): Promise<{ id: string; name: string; currency: string; timezone: string }> => {
      return this.execute('account.getInfo', async () => {
        const query = `
          SELECT
            customer.id,
            customer.descriptive_name,
            customer.currency_code,
            customer.time_zone
          FROM customer
          LIMIT 1
        `

        const response = await this.executeGaql<any>(query)
        if (!response.results.length) {
          throw new Error('Failed to get account info')
        }

        const customer = response.results[0].customer
        return {
          id: customer?.id,
          name: customer?.descriptiveName,
          currency: customer?.currencyCode,
          timezone: customer?.timeZone,
        }
      })
    },
  }

  // ============================================
  // HEALTH CHECK
  // ============================================
  protected async performHealthCheck(): Promise<void> {
    await this.account.getInfo()
  }

  async healthCheck(): Promise<GoogleAdsHealthCheck> {
    try {
      const info = await this.account.getInfo()
      const campaigns = await this.campaigns.list({ limit: 1 })

      return {
        status: 'healthy',
        customerId: info.id,
        accountName: info.name,
        currencyCode: info.currency,
        timezone: info.timezone,
        campaignCount: campaigns.length > 0 ? undefined : 0,
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
      customerId: this.customerId,
      hasCredentials: !!(this.developerToken && this.refreshToken),
    }
  }
}

// Export factory function for creating business-specific connectors
export function createGoogleAdsConnector(business: BusinessId): GoogleAdsConnector {
  return new GoogleAdsConnector(business)
}

// Export connectors for each business (lazy initialization)
let _booClient: GoogleAdsConnector | null = null
let _teelixirClient: GoogleAdsConnector | null = null
let _rhfClient: GoogleAdsConnector | null = null

export const googleAdsBoo = new Proxy({} as GoogleAdsConnector, {
  get(_, prop) {
    if (!_booClient) _booClient = new GoogleAdsConnector('boo')
    return (_booClient as any)[prop]
  },
})

export const googleAdsTeelixir = new Proxy({} as GoogleAdsConnector, {
  get(_, prop) {
    if (!_teelixirClient) _teelixirClient = new GoogleAdsConnector('teelixir')
    return (_teelixirClient as any)[prop]
  },
})

export const googleAdsRhf = new Proxy({} as GoogleAdsConnector, {
  get(_, prop) {
    if (!_rhfClient) _rhfClient = new GoogleAdsConnector('redhillfresh')
    return (_rhfClient as any)[prop]
  },
})
