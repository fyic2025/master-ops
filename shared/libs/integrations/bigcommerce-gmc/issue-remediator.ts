/**
 * GMC Issue Detection and Remediation Engine
 *
 * Automatically detects and fixes common Google Merchant Center issues:
 * - Data quality issues (titles, descriptions, identifiers)
 * - Price and availability mismatches
 * - Missing required attributes
 * - Policy violations
 *
 * Integrates with BigCommerce to fix issues at the source.
 */

import { BigCommerceProduct } from '../bigcommerce/types'
import { BigCommerceConnector } from '../bigcommerce/client'
import { GMCProductWriter } from './gmc-writer'
import { BCToGMCTransformer } from './transformer'
import {
  GMCIssue,
  ProductIssueReport,
  AutoFixAction,
  GMC_ISSUE_FIXES,
  SyncResult,
  SyncError,
  SupplementalFeedEntry,
} from './types'

// ============================================================================
// ISSUE CATEGORIES
// ============================================================================

export type IssueCategory =
  | 'data_quality'
  | 'identifiers'
  | 'pricing'
  | 'availability'
  | 'images'
  | 'shipping'
  | 'policy'
  | 'landing_page'

export const ISSUE_CATEGORIES: Record<string, IssueCategory> = {
  // Data quality
  title_too_long: 'data_quality',
  title_too_short: 'data_quality',
  description_too_long: 'data_quality',
  missing_description: 'data_quality',
  duplicate_title: 'data_quality',

  // Identifiers
  missing_gtin: 'identifiers',
  invalid_gtin: 'identifiers',
  missing_brand: 'identifiers',
  missing_mpn: 'identifiers',

  // Pricing
  price_mismatch: 'pricing',
  missing_price: 'pricing',
  invalid_price: 'pricing',

  // Availability
  availability_mismatch: 'availability',
  out_of_stock: 'availability',

  // Images
  missing_image: 'images',
  image_too_small: 'images',
  promotional_overlay_on_image: 'images',
  generic_image: 'images',

  // Shipping
  missing_shipping: 'shipping',
  invalid_shipping: 'shipping',

  // Policy
  policy_violation: 'policy',
  adult_only_content: 'policy',
  trademark_violation: 'policy',

  // Landing page
  landing_page_error: 'landing_page',
  mobile_landing_page_error: 'landing_page',
}

// ============================================================================
// REMEDIATION STRATEGIES
// ============================================================================

export interface RemediationStrategy {
  issueCode: string
  priority: number // 1-10, higher = more urgent
  autoFixable: boolean
  fixInGMC: boolean // Can be fixed by updating GMC directly
  fixInBC: boolean // Requires fix in BigCommerce source
  strategy: (
    context: RemediationContext
  ) => Promise<RemediationResult>
}

export interface RemediationContext {
  bcProduct: BigCommerceProduct
  gmcIssue: GMCIssue
  transformer: BCToGMCTransformer
  bcClient?: BigCommerceConnector
  gmcWriter: GMCProductWriter
  brandName?: string
  categoryPath?: string
  images?: string[]
}

export interface RemediationResult {
  success: boolean
  action: 'fixed_gmc' | 'fixed_bc' | 'supplemental' | 'manual_required' | 'skipped'
  details: string
  changes?: Array<{
    field: string
    oldValue?: string | number | boolean
    newValue: string | number | boolean
  }>
}

// ============================================================================
// ISSUE REMEDIATOR CLASS
// ============================================================================

export class IssueRemediator {
  private strategies: Map<string, RemediationStrategy> = new Map()
  private bcClient: BigCommerceConnector
  private gmcWriter: GMCProductWriter
  private transformer: BCToGMCTransformer

  constructor(
    bcClient: BigCommerceConnector,
    gmcWriter: GMCProductWriter,
    transformer: BCToGMCTransformer
  ) {
    this.bcClient = bcClient
    this.gmcWriter = gmcWriter
    this.transformer = transformer
    this.registerDefaultStrategies()
  }

  // ============================================================================
  // STRATEGY REGISTRATION
  // ============================================================================

  private registerDefaultStrategies(): void {
    // Title too long
    this.registerStrategy({
      issueCode: 'title_too_long',
      priority: 7,
      autoFixable: true,
      fixInGMC: true,
      fixInBC: false,
      strategy: async (ctx) => {
        const maxLength = 150
        const truncatedTitle = ctx.bcProduct.name.substring(0, maxLength - 3) + '...'

        const result = await ctx.gmcWriter.upsertProduct({
          offerId: ctx.bcProduct.sku || `BC-${ctx.bcProduct.id}`,
          title: truncatedTitle,
          description: '', // Required field
          link: '',
          imageLink: '',
          availability: 'in_stock',
          price: { value: '0', currency: 'AUD' },
          targetCountry: 'AU',
          contentLanguage: 'en',
          channel: 'online',
        })

        return {
          success: result.success,
          action: 'fixed_gmc',
          details: `Truncated title from ${ctx.bcProduct.name.length} to ${truncatedTitle.length} characters`,
          changes: [
            {
              field: 'title',
              oldValue: ctx.bcProduct.name,
              newValue: truncatedTitle,
            },
          ],
        }
      },
    })

    // Missing GTIN - set identifier_exists to false
    this.registerStrategy({
      issueCode: 'missing_gtin',
      priority: 6,
      autoFixable: true,
      fixInGMC: true,
      fixInBC: false,
      strategy: async (ctx) => {
        // Check if we have brand + MPN as alternative
        const hasBrandMPN = ctx.brandName && ctx.bcProduct.mpn

        const supplemental: SupplementalFeedEntry = {
          offerId: ctx.bcProduct.sku || `BC-${ctx.bcProduct.id}`,
          attributes: {
            identifierExists: hasBrandMPN ? true : false,
          },
          reason: 'Auto-fix: Missing GTIN, set identifier_exists appropriately',
          createdAt: new Date(),
        }

        const result = await ctx.gmcWriter.applySupplementalFeed([supplemental])

        return {
          success: result.success,
          action: 'supplemental',
          details: `Set identifier_exists to ${hasBrandMPN ? 'true (has brand+MPN)' : 'false'}`,
          changes: [
            {
              field: 'identifierExists',
              oldValue: undefined,
              newValue: hasBrandMPN,
            },
          ],
        }
      },
    })

    // Invalid GTIN
    this.registerStrategy({
      issueCode: 'invalid_gtin',
      priority: 8,
      autoFixable: true,
      fixInGMC: true,
      fixInBC: true,
      strategy: async (ctx) => {
        // First, try to fix in GMC by setting identifier_exists false
        const supplemental: SupplementalFeedEntry = {
          offerId: ctx.bcProduct.sku || `BC-${ctx.bcProduct.id}`,
          attributes: {
            gtin: undefined as any, // Remove invalid GTIN
            identifierExists: false,
          },
          reason: 'Auto-fix: Removed invalid GTIN',
          createdAt: new Date(),
        }

        const result = await ctx.gmcWriter.applySupplementalFeed([supplemental])

        // Also flag for BC update
        return {
          success: result.success,
          action: 'supplemental',
          details: `Removed invalid GTIN "${ctx.bcProduct.gtin}" and set identifier_exists to false. Consider fixing in BigCommerce.`,
          changes: [
            {
              field: 'gtin',
              oldValue: ctx.bcProduct.gtin,
              newValue: '',
            },
            {
              field: 'identifierExists',
              oldValue: true,
              newValue: false,
            },
          ],
        }
      },
    })

    // Price mismatch
    this.registerStrategy({
      issueCode: 'price_mismatch',
      priority: 9,
      autoFixable: true,
      fixInGMC: true,
      fixInBC: false,
      strategy: async (ctx) => {
        const correctPrice = ctx.bcProduct.calculated_price || ctx.bcProduct.price

        const supplemental: SupplementalFeedEntry = {
          offerId: ctx.bcProduct.sku || `BC-${ctx.bcProduct.id}`,
          attributes: {
            price: {
              value: correctPrice.toFixed(2),
              currency: 'AUD',
            },
            ...(ctx.bcProduct.sale_price > 0 && ctx.bcProduct.sale_price < correctPrice
              ? {
                  salePrice: {
                    value: ctx.bcProduct.sale_price.toFixed(2),
                    currency: 'AUD',
                  },
                }
              : {}),
          },
          reason: 'Auto-fix: Synced price from BigCommerce',
          createdAt: new Date(),
        }

        const result = await ctx.gmcWriter.applySupplementalFeed([supplemental])

        return {
          success: result.success,
          action: 'fixed_gmc',
          details: `Updated price to $${correctPrice.toFixed(2)} AUD`,
          changes: [
            {
              field: 'price',
              oldValue: undefined,
              newValue: correctPrice,
            },
          ],
        }
      },
    })

    // Availability mismatch
    this.registerStrategy({
      issueCode: 'availability_mismatch',
      priority: 9,
      autoFixable: true,
      fixInGMC: true,
      fixInBC: false,
      strategy: async (ctx) => {
        const availability = ctx.bcProduct.inventory_level > 0 ? 'in_stock' : 'out_of_stock'

        const supplemental: SupplementalFeedEntry = {
          offerId: ctx.bcProduct.sku || `BC-${ctx.bcProduct.id}`,
          attributes: {
            availability,
          },
          reason: 'Auto-fix: Synced availability from BigCommerce',
          createdAt: new Date(),
        }

        const result = await ctx.gmcWriter.applySupplementalFeed([supplemental])

        return {
          success: result.success,
          action: 'fixed_gmc',
          details: `Updated availability to "${availability}" (inventory: ${ctx.bcProduct.inventory_level})`,
          changes: [
            {
              field: 'availability',
              oldValue: undefined,
              newValue: availability,
            },
          ],
        }
      },
    })

    // Missing shipping
    this.registerStrategy({
      issueCode: 'missing_shipping',
      priority: 7,
      autoFixable: true,
      fixInGMC: true,
      fixInBC: false,
      strategy: async (ctx) => {
        // Add default Australian shipping
        const defaultShipping = [
          {
            country: 'AU',
            service: 'Standard Shipping',
            price: {
              value: '9.95',
              currency: 'AUD',
            },
            minHandlingTime: 1,
            maxHandlingTime: 2,
            minTransitTime: 2,
            maxTransitTime: 5,
          },
        ]

        const supplemental: SupplementalFeedEntry = {
          offerId: ctx.bcProduct.sku || `BC-${ctx.bcProduct.id}`,
          attributes: {
            shipping: defaultShipping,
          },
          reason: 'Auto-fix: Added default Australian shipping',
          createdAt: new Date(),
        }

        const result = await ctx.gmcWriter.applySupplementalFeed([supplemental])

        return {
          success: result.success,
          action: 'supplemental',
          details: 'Added default shipping: $9.95 AUD, 2-5 days transit',
          changes: [
            {
              field: 'shipping',
              oldValue: undefined,
              newValue: JSON.stringify(defaultShipping),
            },
          ],
        }
      },
    })

    // Duplicate title
    this.registerStrategy({
      issueCode: 'duplicate_title',
      priority: 5,
      autoFixable: true,
      fixInGMC: true,
      fixInBC: false,
      strategy: async (ctx) => {
        // Add SKU to make title unique
        const uniqueTitle = ctx.bcProduct.sku
          ? `${ctx.bcProduct.name} (${ctx.bcProduct.sku})`
          : `${ctx.bcProduct.name} (#${ctx.bcProduct.id})`

        const supplemental: SupplementalFeedEntry = {
          offerId: ctx.bcProduct.sku || `BC-${ctx.bcProduct.id}`,
          attributes: {
            title: uniqueTitle.substring(0, 150),
          },
          reason: 'Auto-fix: Made title unique by adding SKU',
          createdAt: new Date(),
        }

        const result = await ctx.gmcWriter.applySupplementalFeed([supplemental])

        return {
          success: result.success,
          action: 'supplemental',
          details: `Made title unique: "${uniqueTitle.substring(0, 50)}..."`,
          changes: [
            {
              field: 'title',
              oldValue: ctx.bcProduct.name,
              newValue: uniqueTitle,
            },
          ],
        }
      },
    })

    // Missing brand
    this.registerStrategy({
      issueCode: 'missing_brand',
      priority: 6,
      autoFixable: false, // Requires manual mapping
      fixInGMC: true,
      fixInBC: true,
      strategy: async (ctx) => {
        // Check if we can extract brand from title or category
        if (ctx.brandName) {
          const supplemental: SupplementalFeedEntry = {
            offerId: ctx.bcProduct.sku || `BC-${ctx.bcProduct.id}`,
            attributes: {
              brand: ctx.brandName,
            },
            reason: 'Auto-fix: Added brand from BC brand mapping',
            createdAt: new Date(),
          }

          const result = await ctx.gmcWriter.applySupplementalFeed([supplemental])

          return {
            success: result.success,
            action: 'supplemental',
            details: `Added brand: "${ctx.brandName}"`,
            changes: [
              {
                field: 'brand',
                oldValue: undefined,
                newValue: ctx.brandName,
              },
            ],
          }
        }

        // Otherwise set identifier_exists to false
        const supplemental: SupplementalFeedEntry = {
          offerId: ctx.bcProduct.sku || `BC-${ctx.bcProduct.id}`,
          attributes: {
            identifierExists: false,
          },
          reason: 'Auto-fix: No brand available, set identifier_exists to false',
          createdAt: new Date(),
        }

        const result = await ctx.gmcWriter.applySupplementalFeed([supplemental])

        return {
          success: result.success,
          action: 'supplemental',
          details: 'No brand available. Set identifier_exists to false.',
          changes: [
            {
              field: 'identifierExists',
              oldValue: undefined,
              newValue: false,
            },
          ],
        }
      },
    })

    // Non-auto-fixable issues
    const manualIssues = [
      'image_too_small',
      'missing_image',
      'promotional_overlay_on_image',
      'generic_image',
      'landing_page_error',
      'policy_violation',
      'title_too_short',
    ]

    for (const issueCode of manualIssues) {
      this.registerStrategy({
        issueCode,
        priority: ISSUE_CATEGORIES[issueCode] === 'policy' ? 10 : 5,
        autoFixable: false,
        fixInGMC: false,
        fixInBC: true,
        strategy: async (ctx) => {
          return {
            success: false,
            action: 'manual_required',
            details: `Issue "${issueCode}" requires manual intervention in BigCommerce`,
          }
        },
      })
    }
  }

  registerStrategy(strategy: RemediationStrategy): void {
    this.strategies.set(strategy.issueCode, strategy)
  }

  // ============================================================================
  // REMEDIATION EXECUTION
  // ============================================================================

  /**
   * Remediate issues for a single product
   */
  async remediateProduct(
    bcProduct: BigCommerceProduct,
    issues: GMCIssue[],
    options: {
      brandName?: string
      categoryPath?: string
      images?: string[]
      autoFixOnly?: boolean
      dryRun?: boolean
    } = {}
  ): Promise<{
    success: boolean
    results: Array<{
      issueCode: string
      result: RemediationResult
    }>
    remainingIssues: GMCIssue[]
  }> {
    const results: Array<{ issueCode: string; result: RemediationResult }> = []
    const remainingIssues: GMCIssue[] = []

    // Sort issues by priority
    const sortedIssues = [...issues].sort((a, b) => {
      const strategyA = this.strategies.get(a.code)
      const strategyB = this.strategies.get(b.code)
      return (strategyB?.priority || 0) - (strategyA?.priority || 0)
    })

    for (const issue of sortedIssues) {
      const strategy = this.strategies.get(issue.code)

      if (!strategy) {
        remainingIssues.push(issue)
        continue
      }

      if (options.autoFixOnly && !strategy.autoFixable) {
        remainingIssues.push(issue)
        continue
      }

      if (options.dryRun) {
        results.push({
          issueCode: issue.code,
          result: {
            success: true,
            action: 'skipped',
            details: `[DRY RUN] Would apply strategy: ${strategy.issueCode}`,
          },
        })
        continue
      }

      try {
        const result = await strategy.strategy({
          bcProduct,
          gmcIssue: issue,
          transformer: this.transformer,
          bcClient: this.bcClient,
          gmcWriter: this.gmcWriter,
          brandName: options.brandName,
          categoryPath: options.categoryPath,
          images: options.images,
        })

        results.push({ issueCode: issue.code, result })

        if (!result.success || result.action === 'manual_required') {
          remainingIssues.push(issue)
        }
      } catch (error) {
        results.push({
          issueCode: issue.code,
          result: {
            success: false,
            action: 'manual_required',
            details: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        })
        remainingIssues.push(issue)
      }
    }

    return {
      success: remainingIssues.length === 0,
      results,
      remainingIssues,
    }
  }

  /**
   * Batch remediate issues for multiple products
   */
  async remediateBatch(
    products: Array<{
      bcProduct: BigCommerceProduct
      issues: GMCIssue[]
      brandName?: string
      categoryPath?: string
      images?: string[]
    }>,
    options: {
      autoFixOnly?: boolean
      dryRun?: boolean
      onProgress?: (completed: number, total: number, current: string) => void
    } = {}
  ): Promise<{
    summary: {
      total: number
      fullyFixed: number
      partiallyFixed: number
      failed: number
      skipped: number
    }
    results: Array<{
      offerId: string
      productId: number
      success: boolean
      fixedCount: number
      remainingCount: number
    }>
  }> {
    const results: Array<{
      offerId: string
      productId: number
      success: boolean
      fixedCount: number
      remainingCount: number
    }> = []

    let fullyFixed = 0
    let partiallyFixed = 0
    let failed = 0
    let skipped = 0

    for (let i = 0; i < products.length; i++) {
      const item = products[i]
      const offerId = item.bcProduct.sku || `BC-${item.bcProduct.id}`

      options.onProgress?.(i + 1, products.length, offerId)

      if (item.issues.length === 0) {
        skipped++
        continue
      }

      const result = await this.remediateProduct(item.bcProduct, item.issues, {
        brandName: item.brandName,
        categoryPath: item.categoryPath,
        images: item.images,
        autoFixOnly: options.autoFixOnly,
        dryRun: options.dryRun,
      })

      const fixedCount = item.issues.length - result.remainingIssues.length

      results.push({
        offerId,
        productId: item.bcProduct.id,
        success: result.success,
        fixedCount,
        remainingCount: result.remainingIssues.length,
      })

      if (result.success) {
        fullyFixed++
      } else if (fixedCount > 0) {
        partiallyFixed++
      } else {
        failed++
      }
    }

    return {
      summary: {
        total: products.length,
        fullyFixed,
        partiallyFixed,
        failed,
        skipped,
      },
      results,
    }
  }

  // ============================================================================
  // ISSUE ANALYSIS
  // ============================================================================

  /**
   * Analyze issues and generate remediation plan
   */
  analyzeIssues(issues: GMCIssue[]): {
    byCategory: Record<IssueCategory, GMCIssue[]>
    byAutoFixable: {
      autoFixable: GMCIssue[]
      manualRequired: GMCIssue[]
    }
    priorityOrder: GMCIssue[]
    estimatedFixTime: number // minutes
  } {
    const byCategory: Record<IssueCategory, GMCIssue[]> = {
      data_quality: [],
      identifiers: [],
      pricing: [],
      availability: [],
      images: [],
      shipping: [],
      policy: [],
      landing_page: [],
    }

    const autoFixable: GMCIssue[] = []
    const manualRequired: GMCIssue[] = []

    for (const issue of issues) {
      const category = ISSUE_CATEGORIES[issue.code] || 'data_quality'
      byCategory[category].push(issue)

      const strategy = this.strategies.get(issue.code)
      if (strategy?.autoFixable) {
        autoFixable.push(issue)
      } else {
        manualRequired.push(issue)
      }
    }

    // Sort by priority
    const priorityOrder = [...issues].sort((a, b) => {
      const strategyA = this.strategies.get(a.code)
      const strategyB = this.strategies.get(b.code)
      return (strategyB?.priority || 0) - (strategyA?.priority || 0)
    })

    // Estimate fix time (rough estimates)
    const estimatedFixTime =
      autoFixable.length * 0.1 + // 6 seconds per auto-fix
      manualRequired.length * 5 // 5 minutes per manual fix

    return {
      byCategory,
      byAutoFixable: { autoFixable, manualRequired },
      priorityOrder,
      estimatedFixTime,
    }
  }

  /**
   * Get strategy info for an issue
   */
  getStrategyInfo(issueCode: string): RemediationStrategy | undefined {
    return this.strategies.get(issueCode)
  }

  /**
   * List all registered strategies
   */
  listStrategies(): RemediationStrategy[] {
    return Array.from(this.strategies.values())
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createIssueRemediator(
  bcClient: BigCommerceConnector,
  gmcWriter: GMCProductWriter,
  transformer: BCToGMCTransformer
): IssueRemediator {
  return new IssueRemediator(bcClient, gmcWriter, transformer)
}
