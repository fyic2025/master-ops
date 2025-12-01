/**
 * BigCommerce to Google Merchant Center Sync Orchestrator
 *
 * Main orchestration service that coordinates:
 * - Full and incremental product syncs
 * - Issue detection and remediation
 * - Product optimization
 * - Reporting and monitoring
 */

import { BigCommerceConnector } from '../bigcommerce/client'
import { BigCommerceProduct } from '../bigcommerce/types'
import { GoogleMerchantConnector, ProductStatus } from '../google-merchant/client'
import { GMCProductWriter, BusinessId } from './gmc-writer'
import { BCToGMCTransformer, createTransformer } from './transformer'
import { IssueRemediator, createIssueRemediator } from './issue-remediator'
import {
  GMCProduct,
  SyncResult,
  SyncState,
  FeedConfig,
  BCToGMCMapping,
  ProductIssueReport,
  ProductOptimization,
  FeedHealthReport,
  GMCIssue,
} from './types'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

// ============================================================================
// SYNC ORCHESTRATOR CLASS
// ============================================================================

export class SyncOrchestrator {
  private business: BusinessId
  private bcClient: BigCommerceConnector
  private gmcReader: GoogleMerchantConnector
  private gmcWriter: GMCProductWriter
  private transformer: BCToGMCTransformer
  private remediator: IssueRemediator
  private supabase: SupabaseClient
  private brandCache: Map<number, string> = new Map()
  private categoryCache: Map<number, string> = new Map()

  constructor(business: BusinessId, config?: Partial<FeedConfig>) {
    this.business = business

    // Initialize clients
    this.bcClient = new BigCommerceConnector()
    this.gmcReader = new GoogleMerchantConnector(business)
    this.gmcWriter = new GMCProductWriter(business)

    // Initialize transformer with config
    const mapping: Partial<BCToGMCMapping> = config?.mapping || {
      storeUrl: 'https://www.buyorganicsonline.com.au',
      titleTemplate: '{brand} {name}',
      defaultCondition: 'new',
      defaultGoogleCategory: 'Health > Nutrition > Vitamins & Supplements',
    }
    this.transformer = createTransformer(mapping)

    // Initialize remediator
    this.remediator = createIssueRemediator(this.bcClient, this.gmcWriter, this.transformer)

    // Initialize Supabase
    const supabaseUrl = process.env.BOO_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseKey = process.env.BOO_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  // ============================================================================
  // SYNC OPERATIONS
  // ============================================================================

  /**
   * Run a full sync of all products from BigCommerce to Google Merchant Center
   */
  async runFullSync(options: {
    batchSize?: number
    remediateIssues?: boolean
    dryRun?: boolean
    onProgress?: (stage: string, completed: number, total: number) => void
  } = {}): Promise<SyncResult> {
    const startTime = Date.now()
    const batchSize = options.batchSize || 50
    const runId = await this.logSyncStart('full')

    try {
      options.onProgress?.('Fetching products from BigCommerce', 0, 100)

      // 1. Fetch all products from BigCommerce
      const bcProducts = await this.fetchAllBCProducts()
      console.log(`Fetched ${bcProducts.length} products from BigCommerce`)

      // 2. Load brand and category mappings
      options.onProgress?.('Loading brand mappings', 10, 100)
      await this.loadBrandMappings()
      await this.loadCategoryMappings()

      // 3. Fetch product images
      options.onProgress?.('Loading product images', 15, 100)
      const imageMap = await this.fetchProductImages(bcProducts)

      // 4. Transform products
      options.onProgress?.('Transforming products', 20, 100)
      const transformedProducts = bcProducts.map((product) => {
        const brandName = this.brandCache.get(product.brand_id)
        const categoryPath = this.getCategoryPath(product.categories)
        const images = imageMap.get(product.id) || []

        return {
          bcProduct: product,
          ...this.transformer.transform(product, { brandName, categoryPath, images }),
        }
      })

      // 5. Sync to GMC
      options.onProgress?.('Syncing to Google Merchant Center', 30, 100)
      const gmcProducts = transformedProducts.map((t) => t.product)

      let syncResult: SyncResult
      if (options.dryRun) {
        syncResult = {
          success: true,
          duration: 0,
          stats: {
            inserted: 0,
            updated: 0,
            deleted: 0,
            skipped: gmcProducts.length,
            errors: 0,
          },
          errors: [],
          timestamp: new Date(),
        }
      } else {
        syncResult = await this.gmcWriter.batchUpsert(gmcProducts, {
          batchSize,
          onProgress: (completed, total) => {
            const progress = 30 + Math.round((completed / total) * 40)
            options.onProgress?.('Uploading to GMC', progress, 100)
          },
        })
      }

      // 6. Fetch GMC statuses and detect issues
      options.onProgress?.('Checking GMC statuses', 75, 100)
      const gmcStatuses = await this.gmcReader.products.getStatuses(1000)
      const statusMap = new Map(gmcStatuses.map((s) => [s.offerId, s]))

      // 7. Update sync state in Supabase
      options.onProgress?.('Updating sync state', 85, 100)
      await this.updateSyncState(transformedProducts, statusMap)

      // 8. Remediate issues if requested
      let remediationStats = { detected: 0, autoFixed: 0, manualRequired: 0 }
      if (options.remediateIssues && !options.dryRun) {
        options.onProgress?.('Remediating issues', 90, 100)
        remediationStats = await this.remediateAllIssues(transformedProducts, statusMap)
      }

      // 9. Create daily snapshot
      await this.createDailySnapshot()

      // 10. Log completion
      options.onProgress?.('Completing sync', 100, 100)
      await this.logSyncComplete(runId, syncResult, remediationStats)

      return syncResult
    } catch (error) {
      await this.logSyncError(runId, error)
      throw error
    }
  }

  /**
   * Run incremental sync (only changed products)
   */
  async runIncrementalSync(options: {
    sinceHours?: number
    batchSize?: number
    remediateIssues?: boolean
    dryRun?: boolean
  } = {}): Promise<SyncResult> {
    const startTime = Date.now()
    const sinceHours = options.sinceHours || 24
    const runId = await this.logSyncStart('incremental')

    try {
      // Fetch recently modified products
      const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000)
      const bcProducts = await this.bcClient.products.list({
        date_modified: since.toISOString(),
        limit: 250,
      })

      console.log(`Found ${bcProducts.length} modified products in last ${sinceHours} hours`)

      if (bcProducts.length === 0) {
        const result: SyncResult = {
          success: true,
          duration: Date.now() - startTime,
          stats: { inserted: 0, updated: 0, deleted: 0, skipped: 0, errors: 0 },
          errors: [],
          timestamp: new Date(),
        }
        await this.logSyncComplete(runId, result, { detected: 0, autoFixed: 0, manualRequired: 0 })
        return result
      }

      // Load mappings
      await this.loadBrandMappings()
      const imageMap = await this.fetchProductImages(bcProducts)

      // Transform and sync
      const transformedProducts = bcProducts.map((product) => {
        const brandName = this.brandCache.get(product.brand_id)
        const images = imageMap.get(product.id) || []
        return {
          bcProduct: product,
          ...this.transformer.transform(product, { brandName, images }),
        }
      })

      const gmcProducts = transformedProducts.map((t) => t.product)

      let syncResult: SyncResult
      if (options.dryRun) {
        syncResult = {
          success: true,
          duration: 0,
          stats: { inserted: 0, updated: 0, deleted: 0, skipped: gmcProducts.length, errors: 0 },
          errors: [],
          timestamp: new Date(),
        }
      } else {
        syncResult = await this.gmcWriter.batchUpsert(gmcProducts, {
          batchSize: options.batchSize || 50,
        })
      }

      // Update sync state
      const gmcStatuses = await this.gmcReader.products.getStatuses(1000)
      const statusMap = new Map(gmcStatuses.map((s) => [s.offerId, s]))
      await this.updateSyncState(transformedProducts, statusMap)

      // Remediate if requested
      let remediationStats = { detected: 0, autoFixed: 0, manualRequired: 0 }
      if (options.remediateIssues && !options.dryRun) {
        remediationStats = await this.remediateAllIssues(transformedProducts, statusMap)
      }

      await this.logSyncComplete(runId, syncResult, remediationStats)
      return syncResult
    } catch (error) {
      await this.logSyncError(runId, error)
      throw error
    }
  }

  /**
   * Run issue remediation only (no product sync)
   */
  async runRemediation(options: {
    autoFixOnly?: boolean
    dryRun?: boolean
    limit?: number
    onProgress?: (completed: number, total: number, current: string) => void
  } = {}): Promise<{
    detected: number
    autoFixed: number
    manualRequired: number
    details: Array<{ offerId: string; issues: string[]; fixed: string[] }>
  }> {
    const runId = await this.logSyncStart('remediation')

    try {
      // Fetch products with issues from GMC
      const productsWithIssues = await this.gmcReader.products.getWithIssues()
      const limit = options.limit || productsWithIssues.length

      console.log(`Found ${productsWithIssues.length} products with issues, processing ${limit}`)

      // Fetch corresponding BC products
      const offerIds = productsWithIssues.slice(0, limit).map((p) => p.offerId)
      const bcProducts = await this.fetchBCProductsBySkus(offerIds)

      await this.loadBrandMappings()

      // Prepare remediation batch
      const batch = productsWithIssues.slice(0, limit).map((gmcStatus) => {
        const bcProduct = bcProducts.get(gmcStatus.offerId)
        if (!bcProduct) return null

        const issues: GMCIssue[] = gmcStatus.itemLevelIssues?.map((i) => ({
          code: i.code,
          severity: i.severity,
          description: i.description,
          detail: i.detail,
          attributeName: i.attributeName,
          resolution: i.resolution,
        })) || []

        return {
          bcProduct,
          issues,
          brandName: this.brandCache.get(bcProduct.brand_id),
        }
      }).filter((item): item is NonNullable<typeof item> => item !== null)

      // Run remediation
      const result = await this.remediator.remediateBatch(batch, {
        autoFixOnly: options.autoFixOnly,
        dryRun: options.dryRun,
        onProgress: options.onProgress,
      })

      // Log results
      const stats = {
        detected: result.summary.total * batch.reduce((sum, b) => sum + b.issues.length, 0) / batch.length,
        autoFixed: result.summary.fullyFixed + result.summary.partiallyFixed,
        manualRequired: result.summary.failed,
      }

      await this.logSyncComplete(runId, {
        success: true,
        duration: 0,
        stats: { inserted: 0, updated: stats.autoFixed, deleted: 0, skipped: 0, errors: stats.manualRequired },
        errors: [],
        timestamp: new Date(),
      }, stats)

      return {
        ...stats,
        details: result.results.map((r) => ({
          offerId: r.offerId,
          issues: batch.find((b) => b.bcProduct.sku === r.offerId)?.issues.map((i) => i.code) || [],
          fixed: r.fixedCount > 0 ? ['auto-fixed'] : [],
        })),
      }
    } catch (error) {
      await this.logSyncError(runId, error)
      throw error
    }
  }

  // ============================================================================
  // REPORTING
  // ============================================================================

  /**
   * Generate feed health report
   */
  async generateHealthReport(): Promise<FeedHealthReport> {
    // Get GMC account status
    const accountStatus = await this.gmcReader.account.getStatus()

    // Get products with issues
    const productsWithIssues = await this.gmcReader.products.getWithIssues()
    const allStatuses = await this.gmcReader.products.getStatuses(1000)

    // Calculate counts
    const totalProducts = allStatuses.length
    const approvedProducts = allStatuses.filter(
      (p) => p.destinationStatuses?.some((d) => d.status === 'approved')
    ).length
    const disapprovedProducts = allStatuses.filter(
      (p) => p.destinationStatuses?.some((d) => d.status === 'disapproved')
    ).length
    const pendingProducts = allStatuses.filter(
      (p) => p.destinationStatuses?.some((d) => d.status === 'pending')
    ).length

    // Aggregate issues by code
    const issuesByCode: Record<string, number> = {}
    const issuesBySeverity = { error: 0, warning: 0, suggestion: 0 }

    for (const product of productsWithIssues) {
      for (const issue of product.itemLevelIssues || []) {
        issuesByCode[issue.code] = (issuesByCode[issue.code] || 0) + 1
        if (issue.severity in issuesBySeverity) {
          issuesBySeverity[issue.severity as keyof typeof issuesBySeverity]++
        }
      }
    }

    // Get top issues
    const topIssues = Object.entries(issuesByCode)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([code, count]) => ({
        code,
        count,
        affectedImpressions: 0, // Would need performance data
      }))

    // Get trend data from Supabase
    const { data: trendData } = await this.supabase
      .from('bc_gmc_daily_snapshots')
      .select('approval_rate, total_issues')
      .eq('business', this.business)
      .order('snapshot_date', { ascending: false })
      .limit(30)

    const approvalRateTrend = trendData?.map((d) => d.approval_rate || 0).reverse() || []
    const issueCountTrend = trendData?.map((d) => d.total_issues || 0).reverse() || []

    // Generate recommendations
    const recommendations: string[] = []
    if (disapprovedProducts > totalProducts * 0.05) {
      recommendations.push('High disapproval rate detected. Review and fix product issues.')
    }
    if (issuesBySeverity.error > 0) {
      recommendations.push(`${issuesBySeverity.error} products have errors that need attention.`)
    }
    if (topIssues[0]?.count > 100) {
      recommendations.push(`Common issue "${topIssues[0].code}" affects ${topIssues[0].count} products.`)
    }

    return {
      feedId: `${this.business}-gmc`,
      generatedAt: new Date(),
      totalProducts,
      approvedProducts,
      disapprovedProducts,
      pendingProducts,
      expiringProducts: accountStatus.products?.expiring || 0,
      issuesByCode,
      issuesBySeverity,
      approvalRateTrend,
      issueCountTrend,
      topIssues,
      recommendations,
    }
  }

  /**
   * Get current sync state
   */
  async getSyncState(): Promise<SyncState> {
    const { data: lastSync } = await this.supabase
      .from('bc_gmc_sync_runs')
      .select('*')
      .eq('business', this.business)
      .eq('run_type', 'full')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()

    const { data: productCounts } = await this.supabase
      .from('bc_gmc_product_sync')
      .select('sync_status, gmc_status, has_issues')
      .eq('business', this.business)

    const accountStatus = await this.gmcReader.account.getStatus()
    const bcProductCount = await this.bcClient.products.count()

    return {
      lastFullSync: lastSync?.completed_at ? new Date(lastSync.completed_at) : undefined,
      productsInBC: bcProductCount,
      productsInGMC: accountStatus.products?.active || 0,
      productsSynced: productCounts?.length || 0,
      productsWithIssues: productCounts?.filter((p) => p.has_issues).length || 0,
      productsDisapproved: accountStatus.products?.disapproved || 0,
      syncErrors: [],
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async fetchAllBCProducts(): Promise<BigCommerceProduct[]> {
    const allProducts: BigCommerceProduct[] = []
    let page = 1
    const limit = 250

    while (true) {
      const products = await this.bcClient.products.list({ limit, page })
      allProducts.push(...products)

      if (products.length < limit) break
      page++
    }

    return allProducts
  }

  private async fetchBCProductsBySkus(skus: string[]): Promise<Map<string, BigCommerceProduct>> {
    const productMap = new Map<string, BigCommerceProduct>()

    // Fetch in batches
    for (let i = 0; i < skus.length; i += 10) {
      const batch = skus.slice(i, i + 10)
      for (const sku of batch) {
        try {
          const products = await this.bcClient.products.list({ sku, limit: 1 })
          if (products[0]) {
            productMap.set(sku, products[0])
          }
        } catch (error) {
          console.warn(`Failed to fetch product ${sku}:`, error)
        }
      }
    }

    return productMap
  }

  private async loadBrandMappings(): Promise<void> {
    const { data: brands } = await this.supabase
      .from('bc_brands')
      .select('id, name')
      .eq('business', this.business)

    if (brands) {
      for (const brand of brands) {
        this.brandCache.set(brand.id, brand.name)
      }
    }
  }

  private async loadCategoryMappings(): Promise<void> {
    const { data: categories } = await this.supabase
      .from('bc_categories')
      .select('id, name, parent_id')
      .eq('business', this.business)

    if (categories) {
      // Build category paths
      const categoryMap = new Map(categories.map((c) => [c.id, c]))
      for (const category of categories) {
        const path = this.buildCategoryPath(category.id, categoryMap)
        this.categoryCache.set(category.id, path)
      }
    }
  }

  private buildCategoryPath(categoryId: number, categoryMap: Map<number, any>): string {
    const parts: string[] = []
    let current = categoryMap.get(categoryId)

    while (current) {
      parts.unshift(current.name)
      current = current.parent_id ? categoryMap.get(current.parent_id) : null
    }

    return parts.join(' > ')
  }

  private getCategoryPath(categoryIds: number[]): string | undefined {
    for (const catId of categoryIds || []) {
      const path = this.categoryCache.get(catId)
      if (path) return path
    }
    return undefined
  }

  private async fetchProductImages(products: BigCommerceProduct[]): Promise<Map<number, string[]>> {
    const imageMap = new Map<number, string[]>()

    // In a real implementation, you would fetch images from BigCommerce
    // For now, we'll assume images are included in the product data or fetched separately
    for (const product of products) {
      // Placeholder: would need to call BC images API
      imageMap.set(product.id, [])
    }

    return imageMap
  }

  private async updateSyncState(
    transformedProducts: Array<{ bcProduct: BigCommerceProduct; product: GMCProduct; issues: GMCIssue[] }>,
    statusMap: Map<string, ProductStatus>
  ): Promise<void> {
    const updates = transformedProducts.map((item) => {
      const gmcStatus = statusMap.get(item.product.offerId)
      const status = gmcStatus?.destinationStatuses?.[0]?.status || 'pending'
      const gmcIssues = gmcStatus?.itemLevelIssues || []
      const allIssues = [...item.issues, ...gmcIssues.map((i) => ({
        code: i.code,
        severity: i.severity,
        description: i.description,
      }))]

      return {
        business: this.business,
        bc_product_id: item.bcProduct.id,
        offer_id: item.product.offerId,
        sync_status: 'synced',
        gmc_status: status,
        has_issues: allIssues.length > 0,
        issue_count: allIssues.length,
        error_count: allIssues.filter((i) => i.severity === 'error').length,
        warning_count: allIssues.filter((i) => i.severity === 'warning').length,
        last_issues: allIssues,
        last_gmc_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    })

    // Batch upsert to Supabase
    for (let i = 0; i < updates.length; i += 100) {
      const batch = updates.slice(i, i + 100)
      await this.supabase.from('bc_gmc_product_sync').upsert(batch, {
        onConflict: 'business,bc_product_id',
      })
    }
  }

  private async remediateAllIssues(
    transformedProducts: Array<{ bcProduct: BigCommerceProduct; product: GMCProduct; issues: GMCIssue[] }>,
    statusMap: Map<string, ProductStatus>
  ): Promise<{ detected: number; autoFixed: number; manualRequired: number }> {
    const batch = transformedProducts
      .filter((item) => item.issues.length > 0 || statusMap.get(item.product.offerId)?.itemLevelIssues?.length)
      .map((item) => {
        const gmcStatus = statusMap.get(item.product.offerId)
        const allIssues: GMCIssue[] = [
          ...item.issues,
          ...(gmcStatus?.itemLevelIssues?.map((i) => ({
            code: i.code,
            severity: i.severity,
            description: i.description,
            detail: i.detail,
            attributeName: i.attributeName,
            resolution: i.resolution,
          })) || []),
        ]

        return {
          bcProduct: item.bcProduct,
          issues: allIssues,
          brandName: this.brandCache.get(item.bcProduct.brand_id),
        }
      })

    if (batch.length === 0) {
      return { detected: 0, autoFixed: 0, manualRequired: 0 }
    }

    const result = await this.remediator.remediateBatch(batch, { autoFixOnly: true })

    return {
      detected: batch.reduce((sum, b) => sum + b.issues.length, 0),
      autoFixed: result.results.reduce((sum, r) => sum + r.fixedCount, 0),
      manualRequired: result.results.reduce((sum, r) => sum + r.remainingCount, 0),
    }
  }

  private async createDailySnapshot(): Promise<void> {
    await this.supabase.rpc('create_bc_gmc_daily_snapshot', { p_business: this.business })
  }

  private async logSyncStart(runType: string): Promise<string> {
    const { data } = await this.supabase
      .from('bc_gmc_sync_runs')
      .insert({
        business: this.business,
        run_type: runType,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    return data?.id || ''
  }

  private async logSyncComplete(
    runId: string,
    result: SyncResult,
    remediationStats: { detected: number; autoFixed: number; manualRequired: number }
  ): Promise<void> {
    await this.supabase.from('bc_gmc_sync_runs').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      duration_ms: result.duration,
      products_processed: result.stats.inserted + result.stats.updated + result.stats.skipped,
      products_inserted: result.stats.inserted,
      products_updated: result.stats.updated,
      products_deleted: result.stats.deleted,
      products_skipped: result.stats.skipped,
      products_errored: result.stats.errors,
      issues_detected: remediationStats.detected,
      issues_auto_fixed: remediationStats.autoFixed,
      issues_manual_required: remediationStats.manualRequired,
    }).eq('id', runId)
  }

  private async logSyncError(runId: string, error: unknown): Promise<void> {
    await this.supabase.from('bc_gmc_sync_runs').update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: error instanceof Error ? error.message : String(error),
    }).eq('id', runId)
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createSyncOrchestrator(
  business: BusinessId,
  config?: Partial<FeedConfig>
): SyncOrchestrator {
  return new SyncOrchestrator(business, config)
}

// Export pre-configured BOO orchestrator
let _booOrchestrator: SyncOrchestrator | null = null

export const booSyncOrchestrator = new Proxy({} as SyncOrchestrator, {
  get(_, prop) {
    if (!_booOrchestrator) _booOrchestrator = new SyncOrchestrator('boo')
    return (_booOrchestrator as any)[prop]
  },
})
