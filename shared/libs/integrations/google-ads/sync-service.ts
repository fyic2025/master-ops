/**
 * Google Ads Sync Service
 *
 * Handles periodic synchronization of Google Ads data to Supabase.
 * Designed for daily batch syncs and real-time updates.
 *
 * Usage:
 * ```typescript
 * import { GoogleAdsSyncService } from '@/shared/libs/integrations/google-ads/sync-service'
 *
 * const syncService = new GoogleAdsSyncService('boo')
 *
 * // Sync yesterday's data
 * await syncService.syncYesterdaysData()
 *
 * // Sync specific date range
 * await syncService.syncCampaignMetrics({
 *   startDate: '2025-01-01',
 *   endDate: '2025-01-31'
 * })
 * ```
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { GoogleAdsConnector } from './client'
import { BusinessId, DateRange, CampaignMetrics, KeywordMetrics, SearchTermMetrics } from './types'
import * as dotenv from 'dotenv'

dotenv.config()

export interface SyncResult {
  syncType: string
  business: BusinessId
  dateRange: DateRange
  recordsFetched: number
  recordsInserted: number
  recordsUpdated: number
  errors: string[]
  durationMs: number
}

export class GoogleAdsSyncService {
  private readonly business: BusinessId
  private readonly googleAds: GoogleAdsConnector
  private readonly supabase: SupabaseClient
  private accountId: string | null = null

  constructor(business: BusinessId) {
    this.business = business
    this.googleAds = new GoogleAdsConnector(business)

    const supabaseUrl = process.env.BOO_SUPABASE_URL || process.env.SUPABASE_URL || ''
    const supabaseKey = process.env.BOO_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured')
    }

    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  /**
   * Get account ID from database
   */
  private async getAccountId(): Promise<string> {
    if (this.accountId) return this.accountId

    const { data, error } = await this.supabase
      .from('google_ads_accounts')
      .select('id')
      .eq('business', this.business)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      throw new Error(`Account not found for business: ${this.business}`)
    }

    this.accountId = data.id as string
    return this.accountId
  }

  /**
   * Log sync operation
   */
  private async logSync(
    syncType: string,
    dateRange: DateRange,
    status: 'running' | 'success' | 'failed' | 'partial',
    result?: Partial<SyncResult>,
    errorMessage?: string
  ): Promise<string> {
    const accountId = await this.getAccountId()

    const { data, error } = await this.supabase
      .from('google_ads_sync_log')
      .insert({
        account_id: accountId,
        sync_type: syncType,
        date_range_start: dateRange.startDate,
        date_range_end: dateRange.endDate,
        status,
        records_fetched: result?.recordsFetched || 0,
        records_inserted: result?.recordsInserted || 0,
        records_updated: result?.recordsUpdated || 0,
        error_message: errorMessage,
        completed_at: status !== 'running' ? new Date().toISOString() : null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Failed to log sync:', error)
      return ''
    }

    return data?.id || ''
  }

  /**
   * Update sync log
   */
  private async updateSyncLog(
    logId: string,
    status: 'success' | 'failed' | 'partial',
    result: Partial<SyncResult>,
    errorMessage?: string
  ): Promise<void> {
    await this.supabase
      .from('google_ads_sync_log')
      .update({
        status,
        records_fetched: result.recordsFetched || 0,
        records_inserted: result.recordsInserted || 0,
        records_updated: result.recordsUpdated || 0,
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq('id', logId)
  }

  /**
   * Sync campaign metrics for date range
   */
  async syncCampaignMetrics(dateRange: DateRange): Promise<SyncResult> {
    const startTime = Date.now()
    const result: SyncResult = {
      syncType: 'campaigns',
      business: this.business,
      dateRange,
      recordsFetched: 0,
      recordsInserted: 0,
      recordsUpdated: 0,
      errors: [],
      durationMs: 0,
    }

    const logId = await this.logSync('campaigns', dateRange, 'running')

    try {
      const accountId = await this.getAccountId()

      // Fetch metrics from Google Ads
      const metrics = await this.googleAds.campaigns.getMetrics({ dateRange })
      result.recordsFetched = metrics.length

      // Upsert to Supabase
      for (const m of metrics) {
        const record = {
          account_id: accountId,
          campaign_id: m.campaignId,
          campaign_name: m.campaignName,
          campaign_type: m.campaignType,
          campaign_status: m.campaignStatus,
          date: m.date,
          impressions: m.impressions,
          clicks: m.clicks,
          cost_micros: parseInt(m.costMicros),
          conversions: m.conversions,
          conversion_value: m.conversionValue,
          ctr: m.ctr,
          avg_cpc_micros: Math.round(m.avgCpc * 1_000_000),
          roas: m.roas,
          impression_share: m.impressionShare,
          raw_metrics: m,
        }

        const { error } = await this.supabase
          .from('google_ads_campaign_metrics')
          .upsert(record, {
            onConflict: 'account_id,campaign_id,date',
          })

        if (error) {
          result.errors.push(`Campaign ${m.campaignId}: ${error.message}`)
        } else {
          result.recordsInserted++
        }
      }

      result.durationMs = Date.now() - startTime
      await this.updateSyncLog(logId, 'success', result)

    } catch (error) {
      result.durationMs = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)
      result.errors.push(errorMessage)
      await this.updateSyncLog(logId, 'failed', result, errorMessage)
    }

    return result
  }

  /**
   * Sync keyword metrics for date range
   */
  async syncKeywordMetrics(dateRange: DateRange, limit = 1000): Promise<SyncResult> {
    const startTime = Date.now()
    const result: SyncResult = {
      syncType: 'keywords',
      business: this.business,
      dateRange,
      recordsFetched: 0,
      recordsInserted: 0,
      recordsUpdated: 0,
      errors: [],
      durationMs: 0,
    }

    const logId = await this.logSync('keywords', dateRange, 'running')

    try {
      const accountId = await this.getAccountId()

      // Fetch metrics from Google Ads
      const metrics = await this.googleAds.keywords.getMetrics({ dateRange, limit })
      result.recordsFetched = metrics.length

      // Upsert to Supabase
      for (const m of metrics) {
        const record = {
          account_id: accountId,
          campaign_id: m.campaignId,
          ad_group_id: m.adGroupId,
          keyword_id: m.keywordId,
          keyword_text: m.keywordText,
          match_type: m.matchType,
          date: m.date,
          impressions: m.impressions,
          clicks: m.clicks,
          cost_micros: parseInt(m.costMicros),
          conversions: m.conversions,
          conversion_value: m.conversionValue,
          quality_score: m.qualityScore,
          expected_ctr: m.expectedCtr,
          ad_relevance: m.adRelevance,
          landing_page_experience: m.landingPageExperience,
          avg_position: m.avgPosition,
        }

        const { error } = await this.supabase
          .from('google_ads_keyword_metrics')
          .upsert(record, {
            onConflict: 'account_id,keyword_id,date',
          })

        if (error) {
          result.errors.push(`Keyword ${m.keywordId}: ${error.message}`)
        } else {
          result.recordsInserted++
        }
      }

      result.durationMs = Date.now() - startTime
      await this.updateSyncLog(logId, 'success', result)

    } catch (error) {
      result.durationMs = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)
      result.errors.push(errorMessage)
      await this.updateSyncLog(logId, 'failed', result, errorMessage)
    }

    return result
  }

  /**
   * Sync search terms for date range
   */
  async syncSearchTerms(dateRange: DateRange, limit = 2000): Promise<SyncResult> {
    const startTime = Date.now()
    const result: SyncResult = {
      syncType: 'search_terms',
      business: this.business,
      dateRange,
      recordsFetched: 0,
      recordsInserted: 0,
      recordsUpdated: 0,
      errors: [],
      durationMs: 0,
    }

    const logId = await this.logSync('search_terms', dateRange, 'running')

    try {
      const accountId = await this.getAccountId()

      // Fetch metrics from Google Ads
      const metrics = await this.googleAds.searchTerms.list({ dateRange, limit })
      result.recordsFetched = metrics.length

      // Upsert to Supabase
      for (const m of metrics) {
        const record = {
          account_id: accountId,
          campaign_id: m.campaignId,
          ad_group_id: m.adGroupId,
          keyword_id: m.keywordId,
          search_term: m.searchTerm,
          date: m.date,
          impressions: m.impressions,
          clicks: m.clicks,
          cost_micros: parseInt(m.costMicros),
          conversions: m.conversions,
          conversion_value: m.conversionValue,
        }

        const { error } = await this.supabase
          .from('google_ads_search_terms')
          .upsert(record, {
            onConflict: 'account_id,ad_group_id,search_term,date',
          })

        if (error) {
          result.errors.push(`Search term "${m.searchTerm}": ${error.message}`)
        } else {
          result.recordsInserted++
        }
      }

      result.durationMs = Date.now() - startTime
      await this.updateSyncLog(logId, 'success', result)

    } catch (error) {
      result.durationMs = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)
      result.errors.push(errorMessage)
      await this.updateSyncLog(logId, 'failed', result, errorMessage)
    }

    return result
  }

  /**
   * Sync yesterday's data (for daily cron)
   */
  async syncYesterdaysData(): Promise<{
    campaigns: SyncResult
    keywords: SyncResult
    searchTerms: SyncResult
  }> {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const dateStr = yesterday.toISOString().split('T')[0]

    const dateRange: DateRange = {
      startDate: dateStr,
      endDate: dateStr,
    }

    console.log(`[${this.business}] Syncing data for ${dateStr}...`)

    const campaigns = await this.syncCampaignMetrics(dateRange)
    console.log(`[${this.business}] Campaigns: ${campaigns.recordsInserted} synced`)

    const keywords = await this.syncKeywordMetrics(dateRange)
    console.log(`[${this.business}] Keywords: ${keywords.recordsInserted} synced`)

    const searchTerms = await this.syncSearchTerms(dateRange)
    console.log(`[${this.business}] Search terms: ${searchTerms.recordsInserted} synced`)

    return { campaigns, keywords, searchTerms }
  }

  /**
   * Sync last N days (for backfill)
   */
  async syncLastNDays(days: number): Promise<void> {
    const endDate = new Date()
    endDate.setDate(endDate.getDate() - 1) // Yesterday

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const dateRange: DateRange = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    }

    console.log(`[${this.business}] Syncing ${days} days: ${dateRange.startDate} to ${dateRange.endDate}`)

    await this.syncCampaignMetrics(dateRange)
    await this.syncKeywordMetrics(dateRange, 5000)
    await this.syncSearchTerms(dateRange, 10000)

    console.log(`[${this.business}] Backfill complete`)
  }

  /**
   * Update account configuration
   */
  async updateAccountConfig(customerId: string, merchantCenterId?: string): Promise<void> {
    const { error } = await this.supabase
      .from('google_ads_accounts')
      .update({
        customer_id: customerId,
        merchant_center_id: merchantCenterId,
        updated_at: new Date().toISOString(),
      })
      .eq('business', this.business)

    if (error) {
      throw new Error(`Failed to update account config: ${error.message}`)
    }
  }
}

/**
 * Sync all businesses (for daily cron)
 */
export async function syncAllBusinesses(): Promise<void> {
  const businesses: BusinessId[] = ['boo', 'teelixir', 'redhillfresh']

  console.log('Starting daily Google Ads sync for all businesses...')

  for (const business of businesses) {
    try {
      const syncService = new GoogleAdsSyncService(business)
      await syncService.syncYesterdaysData()
    } catch (error) {
      console.error(`[${business}] Sync failed:`, error)
    }
  }

  console.log('Daily sync complete')
}

// Export for direct execution
export { GoogleAdsSyncService as default }
