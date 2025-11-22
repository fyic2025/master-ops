import { supabase } from '../../../infra/supabase/client'
import { hubspotClient } from '../integrations/hubspot/client'
import { unleashedClient } from '../integrations/unleashed/client'
import { logger } from '../logger'
import { mapFields } from '../utils/data-transformers'
import { slackAlerter } from '../alerts/slack-alerts'
import { emailAlerter } from '../alerts/email-alerts'

/**
 * Business record from Supabase
 */
export interface Business {
  id: string
  slug: string
  name: string
  hubspot_company_id?: string
  unleashed_customer_guid?: string
  status: 'active' | 'inactive' | 'suspended'
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

/**
 * Business sync options
 */
export interface BusinessSyncOptions {
  businessId?: string
  businessSlug?: string
  services?: Array<'hubspot' | 'unleashed'>
  dryRun?: boolean
  sendAlerts?: boolean
}

/**
 * Business sync result
 */
export interface BusinessSyncResult {
  businessId: string
  businessSlug: string
  services: {
    hubspot?: {
      success: boolean
      companyId?: string
      error?: string
    }
    unleashed?: {
      success: boolean
      customerGuid?: string
      error?: string
    }
  }
  duration: number
}

/**
 * Business health status
 */
export interface BusinessHealthStatus {
  businessId: string
  businessSlug: string
  healthy: boolean
  services: {
    hubspot: { connected: boolean; lastSync?: Date; error?: string }
    unleashed: { connected: boolean; lastSync?: Date; error?: string }
  }
  recentErrors: Array<{ source: string; message: string; timestamp: Date }>
  lastActivity?: Date
}

/**
 * Business Automation Helpers
 *
 * Pre-built automation functions for common business operations.
 * Handles synchronization, health monitoring, and data management.
 *
 * @example
 * ```typescript
 * import { businessAutomation } from './shared/libs/automation/business-automation'
 *
 * // Sync all businesses to HubSpot
 * const results = await businessAutomation.syncAllBusinesses({ services: ['hubspot'] })
 *
 * // Check health of a specific business
 * const health = await businessAutomation.checkBusinessHealth('teelixir')
 *
 * // Get businesses needing attention
 * const attention = await businessAutomation.getBusinessesNeedingAttention()
 * ```
 */
export class BusinessAutomation {
  /**
   * Sync a single business to external services
   */
  async syncBusiness(
    businessIdOrSlug: string,
    options: BusinessSyncOptions = {}
  ): Promise<BusinessSyncResult> {
    const startTime = Date.now()
    const services = options.services || ['hubspot', 'unleashed']

    // Fetch business from Supabase
    const business = await this.getBusinessByIdOrSlug(businessIdOrSlug)

    if (!business) {
      throw new Error(`Business not found: ${businessIdOrSlug}`)
    }

    logger.info('Starting business sync', {
      source: 'business-automation',
      businessId: business.id,
      businessSlug: business.slug,
      metadata: { services, dryRun: options.dryRun }
    })

    const result: BusinessSyncResult = {
      businessId: business.id,
      businessSlug: business.slug,
      services: {},
      duration: 0
    }

    // Sync to HubSpot
    if (services.includes('hubspot')) {
      try {
        const hubspotResult = await this.syncToHubSpot(business, options.dryRun)
        result.services.hubspot = { success: true, companyId: hubspotResult.id }

        // Update business record with HubSpot ID
        if (!options.dryRun && !business.hubspot_company_id) {
          await this.updateBusinessExternalId(business.id, 'hubspot', hubspotResult.id)
        }
      } catch (error) {
        result.services.hubspot = {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }

        logger.error('HubSpot sync failed', {
          source: 'business-automation',
          businessId: business.id,
          metadata: { error: result.services.hubspot.error }
        }, error as Error)
      }
    }

    // Sync to Unleashed
    if (services.includes('unleashed')) {
      try {
        const unleashedResult = await this.syncToUnleashed(business, options.dryRun)
        result.services.unleashed = { success: true, customerGuid: unleashedResult.Guid }

        // Update business record with Unleashed GUID
        if (!options.dryRun && !business.unleashed_customer_guid) {
          await this.updateBusinessExternalId(business.id, 'unleashed', unleashedResult.Guid)
        }
      } catch (error) {
        result.services.unleashed = {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }

        logger.error('Unleashed sync failed', {
          source: 'business-automation',
          businessId: business.id,
          metadata: { error: result.services.unleashed.error }
        }, error as Error)
      }
    }

    result.duration = Date.now() - startTime

    // Send alerts if configured
    if (options.sendAlerts) {
      await this.sendSyncAlerts(result)
    }

    logger.info('Business sync completed', {
      source: 'business-automation',
      businessId: business.id,
      metadata: {
        success: Object.values(result.services).every(s => s.success),
        duration: result.duration
      }
    })

    return result
  }

  /**
   * Sync all active businesses
   */
  async syncAllBusinesses(options: BusinessSyncOptions = {}): Promise<BusinessSyncResult[]> {
    const businesses = await this.getAllActiveBusinesses()

    logger.info('Starting sync for all businesses', {
      source: 'business-automation',
      metadata: { count: businesses.length, services: options.services }
    })

    const results: BusinessSyncResult[] = []

    for (const business of businesses) {
      try {
        const result = await this.syncBusiness(business.id, options)
        results.push(result)
      } catch (error) {
        logger.error('Failed to sync business', {
          source: 'business-automation',
          businessId: business.id,
          metadata: { error: error instanceof Error ? error.message : String(error) }
        }, error as Error)

        results.push({
          businessId: business.id,
          businessSlug: business.slug,
          services: {
            hubspot: { success: false, error: 'Sync failed' },
            unleashed: { success: false, error: 'Sync failed' }
          },
          duration: 0
        })
      }
    }

    return results
  }

  /**
   * Check health status of a business
   */
  async checkBusinessHealth(businessIdOrSlug: string): Promise<BusinessHealthStatus> {
    const business = await this.getBusinessByIdOrSlug(businessIdOrSlug)

    if (!business) {
      throw new Error(`Business not found: ${businessIdOrSlug}`)
    }

    const status: BusinessHealthStatus = {
      businessId: business.id,
      businessSlug: business.slug,
      healthy: true,
      services: {
        hubspot: { connected: false },
        unleashed: { connected: false }
      },
      recentErrors: []
    }

    // Check HubSpot connection
    if (business.hubspot_company_id) {
      try {
        await hubspotClient.companies.get(business.hubspot_company_id, ['name'])
        status.services.hubspot.connected = true

        // Get last sync time
        const { data: lastSync } = await supabase
          .from('integration_logs')
          .select('created_at')
          .eq('source', 'hubspot')
          .eq('metadata->>businessId', business.id)
          .eq('level', 'info')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (lastSync) {
          status.services.hubspot.lastSync = new Date(lastSync.created_at)
        }
      } catch (error) {
        status.services.hubspot.connected = false
        status.services.hubspot.error = error instanceof Error ? error.message : String(error)
        status.healthy = false
      }
    }

    // Check Unleashed connection
    if (business.unleashed_customer_guid) {
      try {
        await unleashedClient.customers.get(business.unleashed_customer_guid)
        status.services.unleashed.connected = true

        // Get last sync time
        const { data: lastSync } = await supabase
          .from('integration_logs')
          .select('created_at')
          .eq('source', 'unleashed')
          .eq('metadata->>businessId', business.id)
          .eq('level', 'info')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (lastSync) {
          status.services.unleashed.lastSync = new Date(lastSync.created_at)
        }
      } catch (error) {
        status.services.unleashed.connected = false
        status.services.unleashed.error = error instanceof Error ? error.message : String(error)
        status.healthy = false
      }
    }

    // Get recent errors (last 24 hours)
    const { data: errors } = await supabase
      .from('integration_logs')
      .select('source, message, created_at')
      .eq('metadata->>businessId', business.id)
      .eq('level', 'error')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10)

    if (errors && errors.length > 0) {
      status.recentErrors = errors.map(e => ({
        source: e.source,
        message: e.message,
        timestamp: new Date(e.created_at)
      }))

      if (errors.length >= 5) {
        status.healthy = false
      }
    }

    // Get last activity
    const { data: lastActivity } = await supabase
      .from('integration_logs')
      .select('created_at')
      .eq('metadata->>businessId', business.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (lastActivity) {
      status.lastActivity = new Date(lastActivity.created_at)

      // Flag as unhealthy if no activity in 7 days
      const daysSinceActivity = (Date.now() - status.lastActivity.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceActivity > 7) {
        status.healthy = false
      }
    }

    return status
  }

  /**
   * Get all businesses needing attention
   */
  async getBusinessesNeedingAttention(): Promise<BusinessHealthStatus[]> {
    const businesses = await this.getAllActiveBusinesses()
    const needingAttention: BusinessHealthStatus[] = []

    for (const business of businesses) {
      const health = await this.checkBusinessHealth(business.id)

      if (!health.healthy) {
        needingAttention.push(health)
      }
    }

    return needingAttention
  }

  /**
   * Archive old business data
   */
  async archiveBusinessData(
    businessIdOrSlug: string,
    beforeDate: Date
  ): Promise<{ archived: number }> {
    const business = await this.getBusinessByIdOrSlug(businessIdOrSlug)

    if (!business) {
      throw new Error(`Business not found: ${businessIdOrSlug}`)
    }

    logger.info('Archiving business data', {
      source: 'business-automation',
      businessId: business.id,
      metadata: { beforeDate: beforeDate.toISOString() }
    })

    // Archive integration logs
    const { data: logsToArchive } = await supabase
      .from('integration_logs')
      .select('*')
      .eq('metadata->>businessId', business.id)
      .lt('created_at', beforeDate.toISOString())

    if (logsToArchive && logsToArchive.length > 0) {
      // In a real implementation, you would:
      // 1. Export to S3 or archive storage
      // 2. Delete from main table
      // For now, we'll just count them

      logger.info('Business data archived', {
        source: 'business-automation',
        businessId: business.id,
        metadata: { count: logsToArchive.length }
      })

      return { archived: logsToArchive.length }
    }

    return { archived: 0 }
  }

  /**
   * Generate business activity report
   */
  async generateBusinessReport(
    businessIdOrSlug: string,
    days: number = 7
  ): Promise<{
    business: Business
    period: { start: Date; end: Date }
    operations: {
      total: number
      byService: Record<string, number>
      successRate: number
    }
    errors: {
      total: number
      byService: Record<string, number>
      topErrors: Array<{ message: string; count: number }>
    }
    performance: {
      avgDuration: number
      p95Duration: number
    }
  }> {
    const business = await this.getBusinessByIdOrSlug(businessIdOrSlug)

    if (!business) {
      throw new Error(`Business not found: ${businessIdOrSlug}`)
    }

    const endDate = new Date()
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Get all operations
    const { data: operations } = await supabase
      .from('integration_logs')
      .select('source, level, duration_ms, message')
      .eq('metadata->>businessId', business.id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    if (!operations || operations.length === 0) {
      return {
        business,
        period: { start: startDate, end: endDate },
        operations: { total: 0, byService: {}, successRate: 0 },
        errors: { total: 0, byService: {}, topErrors: [] },
        performance: { avgDuration: 0, p95Duration: 0 }
      }
    }

    // Calculate operations stats
    const byService: Record<string, number> = {}
    const errorsByService: Record<string, number> = {}
    const errorMessages: Record<string, number> = {}
    const durations: number[] = []

    let errorCount = 0

    for (const op of operations) {
      byService[op.source] = (byService[op.source] || 0) + 1

      if (op.level === 'error') {
        errorCount++
        errorsByService[op.source] = (errorsByService[op.source] || 0) + 1
        errorMessages[op.message] = (errorMessages[op.message] || 0) + 1
      }

      if (op.duration_ms) {
        durations.push(op.duration_ms)
      }
    }

    const successRate = ((operations.length - errorCount) / operations.length) * 100

    // Calculate performance metrics
    const avgDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0

    const sortedDurations = durations.sort((a, b) => a - b)
    const p95Index = Math.floor(sortedDurations.length * 0.95)
    const p95Duration = sortedDurations[p95Index] || 0

    // Get top errors
    const topErrors = Object.entries(errorMessages)
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return {
      business,
      period: { start: startDate, end: endDate },
      operations: {
        total: operations.length,
        byService,
        successRate
      },
      errors: {
        total: errorCount,
        byService: errorsByService,
        topErrors
      },
      performance: {
        avgDuration,
        p95Duration
      }
    }
  }

  /**
   * Private helper: Get business by ID or slug
   */
  private async getBusinessByIdOrSlug(idOrSlug: string): Promise<Business | null> {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
      .single()

    if (error || !data) {
      return null
    }

    return data as Business
  }

  /**
   * Private helper: Get all active businesses
   */
  private async getAllActiveBusinesses(): Promise<Business[]> {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('status', 'active')
      .order('name')

    if (error || !data) {
      return []
    }

    return data as Business[]
  }

  /**
   * Private helper: Sync business to HubSpot
   */
  private async syncToHubSpot(business: Business, dryRun?: boolean): Promise<{ id: string }> {
    const properties = {
      name: business.name,
      domain: business.metadata?.domain,
      business_slug: business.slug,
      business_id: business.id,
      status: business.status
    }

    if (dryRun) {
      logger.info('Dry run: Would sync to HubSpot', {
        source: 'business-automation',
        businessId: business.id,
        metadata: { properties }
      })
      return { id: 'dry-run-id' }
    }

    if (business.hubspot_company_id) {
      // Update existing
      await hubspotClient.companies.update(business.hubspot_company_id, properties)
      return { id: business.hubspot_company_id }
    } else {
      // Create new
      const company = await hubspotClient.companies.create(properties)
      return { id: company.id }
    }
  }

  /**
   * Private helper: Sync business to Unleashed
   */
  private async syncToUnleashed(business: Business, dryRun?: boolean): Promise<{ Guid: string }> {
    const customer = {
      CustomerName: business.name,
      CustomerCode: business.slug.toUpperCase(),
      Email: business.metadata?.email,
      Phone: business.metadata?.phone
    }

    if (dryRun) {
      logger.info('Dry run: Would sync to Unleashed', {
        source: 'business-automation',
        businessId: business.id,
        metadata: { customer }
      })
      return { Guid: 'dry-run-guid' }
    }

    if (business.unleashed_customer_guid) {
      // Update existing
      await unleashedClient.customers.update(business.unleashed_customer_guid, customer)
      return { Guid: business.unleashed_customer_guid }
    } else {
      // Create new
      const createdCustomer = await unleashedClient.customers.create(customer)
      return { Guid: createdCustomer.Guid }
    }
  }

  /**
   * Private helper: Update business external ID
   */
  private async updateBusinessExternalId(
    businessId: string,
    service: 'hubspot' | 'unleashed',
    externalId: string
  ): Promise<void> {
    const field = service === 'hubspot' ? 'hubspot_company_id' : 'unleashed_customer_guid'

    await supabase
      .from('businesses')
      .update({ [field]: externalId })
      .eq('id', businessId)

    logger.info('Updated business external ID', {
      source: 'business-automation',
      businessId,
      metadata: { service, externalId }
    })
  }

  /**
   * Private helper: Send sync alerts
   */
  private async sendSyncAlerts(result: BusinessSyncResult): Promise<void> {
    const hasFailures = Object.values(result.services).some(s => !s.success)

    if (hasFailures) {
      const failedServices = Object.entries(result.services)
        .filter(([_, s]) => !s.success)
        .map(([service, s]) => `${service}: ${s.error}`)
        .join('\n')

      await slackAlerter.sendIntegrationFailure(
        'business-sync',
        `Failed to sync ${result.businessSlug}\n${failedServices}`,
        Object.values(result.services).filter(s => !s.success).length,
        { businessId: result.businessId, businessSlug: result.businessSlug }
      )

      await emailAlerter.sendIntegrationFailure(
        'business-sync',
        `Failed to sync ${result.businessSlug}\n${failedServices}`,
        Object.values(result.services).filter(s => !s.success).length,
        { businessId: result.businessId, businessSlug: result.businessSlug }
      )
    }
  }
}

/**
 * Singleton instance
 */
export const businessAutomation = new BusinessAutomation()
