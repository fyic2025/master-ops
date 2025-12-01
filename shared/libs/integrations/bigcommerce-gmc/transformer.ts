/**
 * BigCommerce to Google Merchant Center Product Transformer
 *
 * Converts BigCommerce product data to GMC format with:
 * - Field mapping and transformation
 * - Data validation and sanitization
 * - Issue detection during transformation
 * - Optimization suggestions
 */

import { BigCommerceProduct } from '../bigcommerce/types'
import {
  GMCProduct,
  GMCPrice,
  GMCAvailability,
  GMCIssue,
  BCToGMCMapping,
  ProductIssueReport,
  AutoFixAction,
  ProductOptimization,
  OptimizationSuggestion,
  CustomLabelSource,
  GMC_ISSUE_FIXES,
} from './types'

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_TITLE_LENGTH = 150
const MAX_DESCRIPTION_LENGTH = 5000
const MIN_IMAGE_SIZE = 100  // pixels
const RECOMMENDED_IMAGE_SIZE = 800

// GTIN validation patterns
const GTIN_PATTERNS = {
  GTIN8: /^\d{8}$/,
  GTIN12: /^\d{12}$/,
  GTIN13: /^\d{13}$/,
  GTIN14: /^\d{14}$/,
}

// ============================================================================
// TRANSFORMER CLASS
// ============================================================================

export class BCToGMCTransformer {
  private mapping: BCToGMCMapping
  private brandCache: Map<number, string> = new Map()
  private categoryCache: Map<number, string> = new Map()

  constructor(mapping: BCToGMCMapping) {
    this.mapping = mapping
  }

  /**
   * Transform a BigCommerce product to GMC format
   */
  transform(
    bcProduct: BigCommerceProduct,
    options: {
      brandName?: string
      categoryPath?: string
      images?: string[]
      variants?: any[]
    } = {}
  ): {
    product: GMCProduct
    issues: GMCIssue[]
    warnings: string[]
  } {
    const issues: GMCIssue[] = []
    const warnings: string[] = []

    // Build the GMC product
    const product: GMCProduct = {
      // Required fields
      offerId: this.transformOfferId(bcProduct),
      title: this.transformTitle(bcProduct, options.brandName, issues),
      description: this.transformDescription(bcProduct, issues),
      link: this.transformLink(bcProduct),
      imageLink: this.transformImageLink(bcProduct, options.images, issues),
      availability: this.transformAvailability(bcProduct),
      price: this.transformPrice(bcProduct),

      // Target settings
      targetCountry: 'AU',
      contentLanguage: 'en',
      channel: 'online',

      // Condition
      condition: this.transformCondition(bcProduct),

      // Identifiers
      brand: this.transformBrand(bcProduct, options.brandName, issues),
      gtin: this.transformGTIN(bcProduct, issues),
      mpn: this.transformMPN(bcProduct),
      identifierExists: this.determineIdentifierExists(bcProduct, options.brandName),

      // Categories
      googleProductCategory: this.transformGoogleCategory(bcProduct, options.categoryPath),
      productType: options.categoryPath || undefined,

      // Additional images
      additionalImageLinks: this.transformAdditionalImages(bcProduct, options.images),

      // Sale price
      ...(bcProduct.sale_price > 0 && bcProduct.sale_price < bcProduct.price
        ? { salePrice: this.formatPrice(bcProduct.sale_price) }
        : {}),

      // Shipping weight
      ...(bcProduct.weight > 0
        ? {
            shippingWeight: {
              value: bcProduct.weight,
              unit: 'kg' as const,
            },
          }
        : {}),

      // Dimensions
      ...(bcProduct.width > 0 || bcProduct.height > 0 || bcProduct.depth > 0
        ? {
            shippingWidth: bcProduct.width > 0 ? { value: bcProduct.width, unit: 'cm' as const } : undefined,
            shippingHeight: bcProduct.height > 0 ? { value: bcProduct.height, unit: 'cm' as const } : undefined,
            shippingLength: bcProduct.depth > 0 ? { value: bcProduct.depth, unit: 'cm' as const } : undefined,
          }
        : {}),

      // Custom labels
      customLabel0: this.transformCustomLabel(bcProduct, this.mapping.customLabel0Source, options),
      customLabel1: this.transformCustomLabel(bcProduct, this.mapping.customLabel1Source, options),
      customLabel2: this.transformCustomLabel(bcProduct, this.mapping.customLabel2Source, options),
      customLabel3: this.transformCustomLabel(bcProduct, this.mapping.customLabel3Source, options),
      customLabel4: this.transformCustomLabel(bcProduct, this.mapping.customLabel4Source, options),

      // Default shipping if configured
      shipping: this.mapping.defaultShipping,
    }

    // Clean undefined values
    Object.keys(product).forEach((key) => {
      if ((product as any)[key] === undefined) {
        delete (product as any)[key]
      }
    })

    return { product, issues, warnings }
  }

  /**
   * Batch transform multiple products
   */
  transformBatch(
    products: Array<{
      product: BigCommerceProduct
      brandName?: string
      categoryPath?: string
      images?: string[]
    }>
  ): {
    products: GMCProduct[]
    issueReports: ProductIssueReport[]
    summary: {
      total: number
      successful: number
      withIssues: number
      skipped: number
    }
  } {
    const gmcProducts: GMCProduct[] = []
    const issueReports: ProductIssueReport[] = []
    let skipped = 0

    for (const item of products) {
      // Check if product should be excluded
      if (this.shouldExclude(item.product)) {
        skipped++
        continue
      }

      const result = this.transform(item.product, {
        brandName: item.brandName,
        categoryPath: item.categoryPath,
        images: item.images,
      })

      gmcProducts.push(result.product)

      if (result.issues.length > 0) {
        issueReports.push({
          offerId: result.product.offerId,
          bcProductId: item.product.id,
          title: item.product.name,
          issues: result.issues,
          canAutoFix: result.issues.some((i) => GMC_ISSUE_FIXES[i.code]?.autoFixable),
          autoFixActions: this.generateAutoFixActions(item.product, result.issues),
          status: result.issues.some((i) => i.severity === 'error') ? 'disapproved' : 'pending',
          lastChecked: new Date(),
        })
      }
    }

    return {
      products: gmcProducts,
      issueReports,
      summary: {
        total: products.length,
        successful: gmcProducts.length - issueReports.filter((r) => r.status === 'disapproved').length,
        withIssues: issueReports.length,
        skipped,
      },
    }
  }

  // ============================================================================
  // FIELD TRANSFORMERS
  // ============================================================================

  private transformOfferId(product: BigCommerceProduct): string {
    // Use SKU as the offer ID, fallback to product ID
    return product.sku || `BC-${product.id}`
  }

  private transformTitle(
    product: BigCommerceProduct,
    brandName?: string,
    issues?: GMCIssue[]
  ): string {
    let title = product.name

    // Apply template if configured
    if (this.mapping.titleTemplate) {
      title = this.mapping.titleTemplate
        .replace('{name}', product.name)
        .replace('{brand}', brandName || '')
        .replace('{sku}', product.sku || '')
        .trim()
        .replace(/\s+/g, ' ')  // Normalize whitespace
    }

    // Add prefix/suffix
    if (this.mapping.titlePrefix) {
      title = `${this.mapping.titlePrefix} ${title}`
    }
    if (this.mapping.titleSuffix) {
      title = `${title} ${this.mapping.titleSuffix}`
    }

    // Check length
    if (title.length > MAX_TITLE_LENGTH) {
      issues?.push({
        code: 'title_too_long',
        severity: 'warning',
        description: `Title exceeds ${MAX_TITLE_LENGTH} characters`,
        detail: `Current length: ${title.length}`,
        attributeName: 'title',
        resolution: 'Truncate title to fit within limit',
      })
      title = title.substring(0, MAX_TITLE_LENGTH - 3) + '...'
    }

    if (title.length < 10) {
      issues?.push({
        code: 'title_too_short',
        severity: 'warning',
        description: 'Title is very short and may not be descriptive enough',
        detail: `Current length: ${title.length}`,
        attributeName: 'title',
        resolution: 'Add more descriptive information to the title',
      })
    }

    return title
  }

  private transformDescription(
    product: BigCommerceProduct,
    issues?: GMCIssue[]
  ): string {
    let description = ''

    // Get description from configured source
    switch (this.mapping.descriptionField) {
      case 'meta_description':
        description = product.meta_description || product.description
        break
      case 'search_keywords':
        description = product.search_keywords || product.description
        break
      default:
        description = product.description
    }

    // Strip HTML tags
    description = this.stripHtml(description)

    // Check length
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      issues?.push({
        code: 'description_too_long',
        severity: 'warning',
        description: `Description exceeds ${MAX_DESCRIPTION_LENGTH} characters`,
        attributeName: 'description',
        resolution: 'Truncate description to fit within limit',
      })
      description = description.substring(0, MAX_DESCRIPTION_LENGTH - 3) + '...'
    }

    if (!description || description.length < 50) {
      issues?.push({
        code: 'missing_description',
        severity: 'warning',
        description: 'Product description is missing or too short',
        attributeName: 'description',
        resolution: 'Add a detailed product description',
      })
    }

    return description || product.name  // Fallback to name if no description
  }

  private transformLink(product: BigCommerceProduct): string {
    const baseUrl = this.mapping.storeUrl.replace(/\/$/, '')
    const productPath = product.custom_url?.url || `/products/${product.id}`
    return `${baseUrl}${productPath}`
  }

  private transformImageLink(
    product: BigCommerceProduct,
    images?: string[],
    issues?: GMCIssue[]
  ): string {
    // Use provided images or try to get from product
    const imageUrl = images?.[0] || ''

    if (!imageUrl) {
      issues?.push({
        code: 'missing_image',
        severity: 'error',
        description: 'Product has no image',
        attributeName: 'imageLink',
        resolution: 'Add a product image',
      })
      return ''
    }

    return imageUrl
  }

  private transformAdditionalImages(
    product: BigCommerceProduct,
    images?: string[]
  ): string[] | undefined {
    if (!images || images.length <= 1) return undefined
    // Return up to 10 additional images (excluding the main one)
    return images.slice(1, 11)
  }

  private transformAvailability(product: BigCommerceProduct): GMCAvailability {
    // Map BigCommerce availability to GMC format
    if (!product.is_visible) {
      return 'out_of_stock'
    }

    switch (product.availability) {
      case 'available':
        return product.inventory_level > 0 ? 'in_stock' : 'out_of_stock'
      case 'preorder':
        return 'preorder'
      case 'disabled':
        return 'out_of_stock'
      default:
        return product.inventory_level > 0 ? 'in_stock' : 'out_of_stock'
    }
  }

  private transformPrice(product: BigCommerceProduct): GMCPrice {
    let price = product.calculated_price || product.price

    // Apply markup if configured
    if (this.mapping.priceMarkup) {
      price = price * this.mapping.priceMarkup
    }

    // Apply rounding
    switch (this.mapping.priceRounding) {
      case 'up':
        price = Math.ceil(price * 100) / 100
        break
      case 'down':
        price = Math.floor(price * 100) / 100
        break
      case 'nearest':
        price = Math.round(price * 100) / 100
        break
    }

    return this.formatPrice(price)
  }

  private formatPrice(amount: number): GMCPrice {
    return {
      value: amount.toFixed(2),
      currency: 'AUD',
    }
  }

  private transformCondition(product: BigCommerceProduct): 'new' | 'refurbished' | 'used' {
    // Map BigCommerce condition to GMC format
    switch (product.condition?.toLowerCase()) {
      case 'new':
        return 'new'
      case 'refurbished':
        return 'refurbished'
      case 'used':
        return 'used'
      default:
        return this.mapping.defaultCondition || 'new'
    }
  }

  private transformBrand(
    product: BigCommerceProduct,
    brandName?: string,
    issues?: GMCIssue[]
  ): string | undefined {
    const brand = brandName || this.mapping.brandMapping?.[product.brand_id]

    if (!brand) {
      issues?.push({
        code: 'missing_brand',
        severity: 'warning',
        description: 'Product brand is not specified',
        attributeName: 'brand',
        resolution: 'Set a brand for this product or use identifier_exists=false',
      })
    }

    return brand
  }

  private transformGTIN(
    product: BigCommerceProduct,
    issues?: GMCIssue[]
  ): string | undefined {
    // Try GTIN, then UPC, then EAN
    const gtin = product.gtin || product.upc

    if (gtin) {
      // Validate GTIN format
      if (!this.isValidGTIN(gtin)) {
        issues?.push({
          code: 'invalid_gtin',
          severity: 'error',
          description: 'GTIN format is invalid',
          detail: `Value: ${gtin}`,
          attributeName: 'gtin',
          resolution: 'Correct the GTIN or remove it and set identifier_exists=false',
        })
        return undefined
      }
    }

    return gtin || undefined
  }

  private transformMPN(product: BigCommerceProduct): string | undefined {
    return product.mpn || undefined
  }

  private determineIdentifierExists(
    product: BigCommerceProduct,
    brandName?: string
  ): boolean {
    // If we have valid GTIN or (brand + MPN), identifiers exist
    const hasGTIN = product.gtin || product.upc
    const hasBrandAndMPN = brandName && product.mpn

    return !!(hasGTIN || hasBrandAndMPN)
  }

  private transformGoogleCategory(
    product: BigCommerceProduct,
    categoryPath?: string
  ): string | undefined {
    // Check mapping first
    for (const catId of product.categories || []) {
      if (this.mapping.categoryMapping?.[catId]) {
        return this.mapping.categoryMapping[catId]
      }
    }

    // Use default if available
    return this.mapping.defaultGoogleCategory
  }

  private transformCustomLabel(
    product: BigCommerceProduct,
    source?: CustomLabelSource,
    options?: { brandName?: string; categoryPath?: string }
  ): string | undefined {
    if (!source) return undefined

    switch (source.type) {
      case 'static':
        return source.value

      case 'brand':
        return options?.brandName

      case 'category':
        return options?.categoryPath?.split(' > ')[0]  // First category level

      case 'price_range':
        if (source.ranges) {
          const price = product.price
          for (const range of source.ranges) {
            if (price >= range.min && price < range.max) {
              return range.label
            }
          }
        }
        return undefined

      case 'margin':
        if (product.cost_price && product.price && source.ranges) {
          const margin = ((product.price - product.cost_price) / product.price) * 100
          for (const range of source.ranges) {
            if (margin >= range.min && margin < range.max) {
              return range.label
            }
          }
        }
        return undefined

      case 'inventory':
        if (source.ranges) {
          const stock = product.inventory_level
          for (const range of source.ranges) {
            if (stock >= range.min && stock < range.max) {
              return range.label
            }
          }
        }
        return undefined

      default:
        return undefined
    }
  }

  // ============================================================================
  // VALIDATION & UTILITIES
  // ============================================================================

  private isValidGTIN(gtin: string): boolean {
    // Remove any spaces or dashes
    const cleaned = gtin.replace(/[\s-]/g, '')

    // Check pattern
    if (
      !GTIN_PATTERNS.GTIN8.test(cleaned) &&
      !GTIN_PATTERNS.GTIN12.test(cleaned) &&
      !GTIN_PATTERNS.GTIN13.test(cleaned) &&
      !GTIN_PATTERNS.GTIN14.test(cleaned)
    ) {
      return false
    }

    // Validate check digit
    return this.validateGTINCheckDigit(cleaned)
  }

  private validateGTINCheckDigit(gtin: string): boolean {
    const digits = gtin.split('').map(Number)
    const checkDigit = digits.pop()!
    let sum = 0

    // For GTIN-13: multiply by 1 and 3 alternating from right
    // For GTIN-14: multiply by 3 and 1 alternating from right
    const multipliers = gtin.length === 14 ? [3, 1] : [1, 3]
    digits.reverse().forEach((digit, index) => {
      sum += digit * multipliers[index % 2]
    })

    const calculatedCheck = (10 - (sum % 10)) % 10
    return calculatedCheck === checkDigit
  }

  private stripHtml(html: string): string {
    if (!html) return ''
    return html
      .replace(/<[^>]*>/g, ' ')           // Remove HTML tags
      .replace(/&nbsp;/g, ' ')            // Replace nbsp
      .replace(/&amp;/g, '&')             // Replace amp
      .replace(/&lt;/g, '<')              // Replace lt
      .replace(/&gt;/g, '>')              // Replace gt
      .replace(/&quot;/g, '"')            // Replace quot
      .replace(/&#39;/g, "'")             // Replace apostrophe
      .replace(/\s+/g, ' ')               // Normalize whitespace
      .trim()
  }

  private shouldExclude(product: BigCommerceProduct): boolean {
    // Check category exclusions
    if (this.mapping.excludeCategories?.length) {
      for (const catId of product.categories || []) {
        if (this.mapping.excludeCategories.includes(catId)) {
          return true
        }
      }
    }

    // Check brand exclusions
    if (this.mapping.excludeBrands?.includes(product.brand_id)) {
      return true
    }

    // Check SKU patterns
    if (this.mapping.excludeSkuPatterns?.length && product.sku) {
      for (const pattern of this.mapping.excludeSkuPatterns) {
        if (new RegExp(pattern).test(product.sku)) {
          return true
        }
      }
    }

    // Check price thresholds
    if (this.mapping.minPrice && product.price < this.mapping.minPrice) {
      return true
    }
    if (this.mapping.maxPrice && product.price > this.mapping.maxPrice) {
      return true
    }

    // Check image requirement
    if (this.mapping.requireImages && !product.is_visible) {
      return true
    }

    // Check inventory requirement
    if (this.mapping.requireInventory && product.inventory_level <= 0) {
      return true
    }

    return false
  }

  // ============================================================================
  // AUTO-FIX GENERATION
  // ============================================================================

  private generateAutoFixActions(
    product: BigCommerceProduct,
    issues: GMCIssue[]
  ): AutoFixAction[] {
    const actions: AutoFixAction[] = []

    for (const issue of issues) {
      const fixConfig = GMC_ISSUE_FIXES[issue.code]
      if (!fixConfig?.autoFixable) continue

      switch (issue.code) {
        case 'title_too_long':
          actions.push({
            type: 'update_gmc',
            field: 'title',
            currentValue: product.name,
            newValue: product.name.substring(0, MAX_TITLE_LENGTH - 3) + '...',
            reason: 'Truncate title to meet GMC requirements',
            confidence: 100,
          })
          break

        case 'description_too_long':
          actions.push({
            type: 'update_gmc',
            field: 'description',
            currentValue: product.description?.substring(0, 100) + '...',
            newValue: this.stripHtml(product.description).substring(0, MAX_DESCRIPTION_LENGTH - 3) + '...',
            reason: 'Truncate description to meet GMC requirements',
            confidence: 100,
          })
          break

        case 'missing_gtin':
          actions.push({
            type: 'update_gmc',
            field: 'identifierExists',
            currentValue: undefined,
            newValue: false,
            reason: 'Set identifier_exists to false when GTIN is not available',
            confidence: 95,
          })
          break

        case 'invalid_gtin':
          actions.push({
            type: 'update_bc',
            field: 'gtin',
            currentValue: product.gtin,
            newValue: '',
            reason: 'Remove invalid GTIN and set identifier_exists to false',
            confidence: 80,
          })
          break

        case 'price_mismatch':
        case 'availability_mismatch':
          actions.push({
            type: 'update_gmc',
            field: issue.code === 'price_mismatch' ? 'price' : 'availability',
            currentValue: undefined,
            newValue: issue.code === 'price_mismatch'
              ? product.price.toString()
              : this.transformAvailability(product),
            reason: 'Sync from BigCommerce source of truth',
            confidence: 100,
          })
          break

        case 'duplicate_title':
          actions.push({
            type: 'update_gmc',
            field: 'title',
            currentValue: product.name,
            newValue: product.sku ? `${product.name} (${product.sku})` : product.name,
            reason: 'Add SKU to title to make it unique',
            confidence: 85,
          })
          break

        case 'missing_shipping':
          if (this.mapping.defaultShipping) {
            actions.push({
              type: 'update_gmc',
              field: 'shipping',
              currentValue: undefined,
              newValue: JSON.stringify(this.mapping.defaultShipping),
              reason: 'Add default shipping configuration',
              confidence: 90,
            })
          }
          break
      }
    }

    return actions
  }

  // ============================================================================
  // OPTIMIZATION SUGGESTIONS
  // ============================================================================

  generateOptimizations(
    product: BigCommerceProduct,
    gmcProduct: GMCProduct,
    options: { brandName?: string; categoryPath?: string } = {}
  ): ProductOptimization {
    const optimizations: OptimizationSuggestion[] = []
    let currentScore = 50  // Base score

    // Check title optimization
    if (!options.brandName || !gmcProduct.title.includes(options.brandName)) {
      optimizations.push({
        type: 'title_enhancement',
        field: 'title',
        currentValue: gmcProduct.title,
        suggestedValue: options.brandName
          ? `${options.brandName} ${gmcProduct.title}`
          : gmcProduct.title,
        reason: 'Adding brand name to title improves click-through rate',
        impact: 'medium',
        autoApplicable: !!options.brandName,
      })
    } else {
      currentScore += 10
    }

    // Check description quality
    if (gmcProduct.description.length < 200) {
      optimizations.push({
        type: 'description_enhancement',
        field: 'description',
        currentValue: gmcProduct.description.substring(0, 50) + '...',
        suggestedValue: 'Add detailed product features, benefits, and specifications',
        reason: 'Longer, detailed descriptions improve product visibility',
        impact: 'medium',
        autoApplicable: false,
      })
    } else {
      currentScore += 15
    }

    // Check for additional images
    if (!gmcProduct.additionalImageLinks || gmcProduct.additionalImageLinks.length < 3) {
      optimizations.push({
        type: 'add_additional_images',
        field: 'additionalImageLinks',
        currentValue: `${gmcProduct.additionalImageLinks?.length || 0} images`,
        suggestedValue: 'Add at least 3-5 additional product images',
        reason: 'Multiple images increase engagement and conversion',
        impact: 'high',
        autoApplicable: false,
      })
    } else {
      currentScore += 15
    }

    // Check Google category
    if (!gmcProduct.googleProductCategory) {
      optimizations.push({
        type: 'improve_category',
        field: 'googleProductCategory',
        currentValue: 'Not set',
        suggestedValue: 'Set a specific Google product category',
        reason: 'Proper categorization improves targeting and visibility',
        impact: 'high',
        autoApplicable: false,
      })
    } else {
      currentScore += 10
    }

    // Check custom labels for campaign optimization
    if (
      !gmcProduct.customLabel0 &&
      !gmcProduct.customLabel1 &&
      !gmcProduct.customLabel2
    ) {
      optimizations.push({
        type: 'add_custom_labels',
        field: 'customLabel0',
        currentValue: 'Not set',
        suggestedValue: 'Add custom labels for campaign segmentation (e.g., margin, bestseller)',
        reason: 'Custom labels enable better Shopping campaign structure',
        impact: 'medium',
        autoApplicable: true,
      })
    }

    // Calculate potential score
    const potentialScore = Math.min(
      100,
      currentScore +
        optimizations.reduce((sum, opt) => {
          switch (opt.impact) {
            case 'high':
              return sum + 15
            case 'medium':
              return sum + 10
            case 'low':
              return sum + 5
            default:
              return sum
          }
        }, 0)
    )

    return {
      offerId: gmcProduct.offerId,
      bcProductId: product.id,
      optimizations,
      expectedImpact: optimizations.some((o) => o.impact === 'high')
        ? 'high'
        : optimizations.some((o) => o.impact === 'medium')
        ? 'medium'
        : 'low',
      score: currentScore,
      potentialScore,
    }
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export function createTransformer(mapping: Partial<BCToGMCMapping>): BCToGMCTransformer {
  const defaultMapping: BCToGMCMapping = {
    storeUrl: 'https://www.buyorganicsonline.com.au',
    defaultCondition: 'new',
    defaultGoogleCategory: 'Health > Nutrition',
    descriptionField: 'description',
    requireImages: true,
    requireInventory: false,
    customLabel0Source: {
      type: 'price_range',
      ranges: [
        { min: 0, max: 25, label: 'budget' },
        { min: 25, max: 50, label: 'mid-range' },
        { min: 50, max: 100, label: 'premium' },
        { min: 100, max: 999999, label: 'luxury' },
      ],
    },
    customLabel1Source: {
      type: 'inventory',
      ranges: [
        { min: 0, max: 5, label: 'low-stock' },
        { min: 5, max: 20, label: 'medium-stock' },
        { min: 20, max: 999999, label: 'high-stock' },
      ],
    },
  }

  return new BCToGMCTransformer({ ...defaultMapping, ...mapping })
}

// Export default BOO transformer
export const booTransformer = createTransformer({
  storeUrl: 'https://www.buyorganicsonline.com.au',
  titleTemplate: '{brand} {name}',
  defaultGoogleCategory: 'Health > Nutrition > Vitamins & Supplements',
})
