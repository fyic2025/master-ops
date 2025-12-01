/**
 * BigCommerce to Google Merchant Center Types
 *
 * Type definitions for the BC-GMC connector that replaces paid apps
 * and provides full product feed management capabilities.
 */

// ============================================================================
// GOOGLE MERCHANT CENTER PRODUCT FORMAT
// ============================================================================

/**
 * Google Merchant Center Product structure
 * Reference: https://developers.google.com/shopping-content/reference/rest/v2.1/products
 */
export interface GMCProduct {
  // Required fields
  offerId: string                    // Unique product identifier (SKU)
  title: string                      // Product title (max 150 chars)
  description: string                // Product description (max 5000 chars)
  link: string                       // Product page URL
  imageLink: string                  // Main product image URL
  availability: GMCAvailability      // Stock status
  price: GMCPrice                    // Product price

  // Required for apparel/variants
  brand?: string                     // Product brand
  gtin?: string                      // Global Trade Item Number (barcode)
  mpn?: string                       // Manufacturer Part Number

  // Strongly recommended
  condition?: 'new' | 'refurbished' | 'used'
  googleProductCategory?: string     // Google product category
  productType?: string               // Your product category path
  additionalImageLinks?: string[]    // Additional images (up to 10)
  salePrice?: GMCPrice               // Sale price
  salePriceEffectiveDate?: string    // Sale date range (ISO 8601)

  // Optional identifiers
  identifierExists?: boolean         // False if no GTIN/MPN/brand
  itemGroupId?: string               // For variant grouping

  // Shipping & tax
  shipping?: GMCShipping[]           // Shipping details
  shippingWeight?: GMCWeight         // Product weight for shipping
  shippingLength?: GMCDimension      // Shipping dimensions
  shippingWidth?: GMCDimension
  shippingHeight?: GMCDimension

  // Product details
  color?: string
  size?: string
  sizeType?: string
  sizeSystem?: string
  gender?: 'male' | 'female' | 'unisex'
  ageGroup?: 'newborn' | 'infant' | 'toddler' | 'kids' | 'adult'
  material?: string
  pattern?: string

  // Custom labels for Shopping campaigns
  customLabel0?: string
  customLabel1?: string
  customLabel2?: string
  customLabel3?: string
  customLabel4?: string

  // Additional attributes
  productHighlights?: string[]       // Key product features (up to 10)
  productDetails?: GMCProductDetail[]

  // Targeting
  targetCountry: string              // ISO 3166-1 alpha-2 (e.g., 'AU')
  contentLanguage: string            // ISO 639-1 (e.g., 'en')
  channel: 'online' | 'local'

  // For updates
  id?: string                        // GMC product ID (channel:language:country:offerId)
}

export interface GMCPrice {
  value: string                      // Price as string (e.g., "29.99")
  currency: string                   // ISO 4217 (e.g., "AUD")
}

export interface GMCWeight {
  value: number
  unit: 'kg' | 'g' | 'lb' | 'oz'
}

export interface GMCDimension {
  value: number
  unit: 'cm' | 'in'
}

export interface GMCShipping {
  country: string
  service?: string
  price: GMCPrice
  minHandlingTime?: number
  maxHandlingTime?: number
  minTransitTime?: number
  maxTransitTime?: number
}

export interface GMCProductDetail {
  sectionName?: string
  attributeName: string
  attributeValue: string
}

export type GMCAvailability =
  | 'in_stock'
  | 'out_of_stock'
  | 'preorder'
  | 'backorder'

// ============================================================================
// BIGCOMMERCE TO GMC MAPPING
// ============================================================================

export interface BCToGMCMapping {
  // Field mappings
  titleTemplate?: string             // Template for title (e.g., "{brand} - {name}")
  descriptionField?: 'description' | 'meta_description' | 'search_keywords'
  categoryMapping?: Record<number, string>  // BC category ID -> Google category
  brandMapping?: Record<number, string>     // BC brand ID -> brand name

  // Default values
  defaultCondition?: 'new' | 'refurbished' | 'used'
  defaultShipping?: GMCShipping[]
  defaultGoogleCategory?: string

  // URL configuration
  storeUrl: string                   // Base store URL

  // Custom label mappings
  customLabel0Source?: CustomLabelSource
  customLabel1Source?: CustomLabelSource
  customLabel2Source?: CustomLabelSource
  customLabel3Source?: CustomLabelSource
  customLabel4Source?: CustomLabelSource

  // Filtering
  excludeCategories?: number[]       // BC category IDs to exclude
  excludeBrands?: number[]           // BC brand IDs to exclude
  excludeSkuPatterns?: string[]      // SKU patterns to exclude (regex)
  minPrice?: number                  // Minimum price to include
  maxPrice?: number                  // Maximum price to include
  requireImages?: boolean            // Only include products with images
  requireInventory?: boolean         // Only include products with stock

  // Transformations
  titlePrefix?: string
  titleSuffix?: string
  priceMarkup?: number               // Percentage markup (1.1 = 10%)
  priceRounding?: 'none' | 'up' | 'down' | 'nearest'
}

export interface CustomLabelSource {
  type: 'category' | 'brand' | 'price_range' | 'margin' | 'inventory' | 'custom_field' | 'static'
  field?: string                     // For custom_field type
  value?: string                     // For static type
  ranges?: Array<{ min: number; max: number; label: string }>  // For range types
}

// ============================================================================
// ISSUE DETECTION & REMEDIATION
// ============================================================================

export interface GMCIssue {
  code: string
  severity: 'error' | 'warning' | 'suggestion'
  description: string
  detail?: string
  attributeName?: string
  resolution?: string
  documentation?: string
}

export interface ProductIssueReport {
  offerId: string
  bcProductId: number
  title: string
  issues: GMCIssue[]
  canAutoFix: boolean
  autoFixActions?: AutoFixAction[]
  status: 'approved' | 'disapproved' | 'pending'
  lastChecked: Date
}

export interface AutoFixAction {
  type: 'update_bc' | 'update_gmc' | 'add_supplemental'
  field: string
  currentValue?: string | number | boolean
  newValue: string | number | boolean
  reason: string
  confidence: number                 // 0-100
}

// Common GMC issue codes and their auto-fix strategies
export const GMC_ISSUE_FIXES: Record<string, {
  autoFixable: boolean
  fixStrategy?: string
  bcField?: string
  transformer?: string
}> = {
  'title_too_long': {
    autoFixable: true,
    fixStrategy: 'truncate',
    bcField: 'name'
  },
  'title_too_short': {
    autoFixable: false
  },
  'description_too_long': {
    autoFixable: true,
    fixStrategy: 'truncate',
    bcField: 'description'
  },
  'missing_gtin': {
    autoFixable: true,
    fixStrategy: 'set_identifier_exists_false'
  },
  'invalid_gtin': {
    autoFixable: true,
    fixStrategy: 'remove_or_fix',
    bcField: 'gtin'
  },
  'missing_brand': {
    autoFixable: true,
    fixStrategy: 'extract_from_title_or_category'
  },
  'image_too_small': {
    autoFixable: false
  },
  'missing_image': {
    autoFixable: false
  },
  'price_mismatch': {
    autoFixable: true,
    fixStrategy: 'sync_from_bc'
  },
  'availability_mismatch': {
    autoFixable: true,
    fixStrategy: 'sync_from_bc'
  },
  'landing_page_error': {
    autoFixable: false
  },
  'duplicate_title': {
    autoFixable: true,
    fixStrategy: 'add_sku_suffix'
  },
  'promotional_overlay_on_image': {
    autoFixable: false
  },
  'missing_shipping': {
    autoFixable: true,
    fixStrategy: 'add_default_shipping'
  },
  'generic_image': {
    autoFixable: false
  },
  'unsupported_currency': {
    autoFixable: false
  },
  'missing_category': {
    autoFixable: true,
    fixStrategy: 'map_from_bc_category'
  },
}

// ============================================================================
// OPTIMIZATION TYPES
// ============================================================================

export interface ProductOptimization {
  offerId: string
  bcProductId: number
  optimizations: OptimizationSuggestion[]
  expectedImpact: 'high' | 'medium' | 'low'
  score: number                      // Current optimization score 0-100
  potentialScore: number             // Score after optimizations
}

export interface OptimizationSuggestion {
  type: OptimizationType
  field: string
  currentValue?: string
  suggestedValue: string
  reason: string
  impact: 'high' | 'medium' | 'low'
  autoApplicable: boolean
}

export type OptimizationType =
  | 'title_enhancement'              // Add brand, key attributes
  | 'description_enhancement'        // Expand description with features
  | 'add_product_highlights'         // Add bullet points
  | 'add_additional_images'          // More product images
  | 'improve_category'               // Better Google category
  | 'add_product_details'            // Add structured attributes
  | 'add_custom_labels'              // For campaign segmentation
  | 'price_competitiveness'          // Price recommendations
  | 'shipping_optimization'          // Faster/cheaper shipping

// ============================================================================
// SYNC STATE TYPES
// ============================================================================

export interface SyncState {
  lastFullSync?: Date
  lastIncrementalSync?: Date
  productsInBC: number
  productsInGMC: number
  productsSynced: number
  productsWithIssues: number
  productsDisapproved: number
  syncErrors: SyncError[]
}

export interface SyncError {
  timestamp: Date
  offerId?: string
  bcProductId?: number
  operation: 'insert' | 'update' | 'delete' | 'fetch'
  error: string
  retryable: boolean
  retryCount: number
}

export interface SyncResult {
  success: boolean
  duration: number
  stats: {
    inserted: number
    updated: number
    deleted: number
    skipped: number
    errors: number
  }
  errors: SyncError[]
  timestamp: Date
}

// ============================================================================
// FEED CONFIGURATION
// ============================================================================

export interface FeedConfig {
  id: string
  name: string
  business: 'boo' | 'teelixir' | 'redhillfresh'
  enabled: boolean

  // GMC settings
  merchantId: string
  targetCountry: string
  contentLanguage: string

  // Mapping configuration
  mapping: BCToGMCMapping

  // Sync settings
  syncSchedule: string               // Cron expression
  fullSyncDay?: number               // Day of week for full sync (0-6)
  incrementalEnabled: boolean

  // Thresholds
  maxProductsPerBatch: number
  issueThreshold: number             // Alert if issues exceed this %

  // Created/updated
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// SUPPLEMENTAL FEED
// ============================================================================

export interface SupplementalFeedEntry {
  offerId: string
  attributes: Partial<GMCProduct>
  reason: string
  createdAt: Date
  expiresAt?: Date
}

// ============================================================================
// REPORTING
// ============================================================================

export interface FeedHealthReport {
  feedId: string
  generatedAt: Date

  // Product counts
  totalProducts: number
  approvedProducts: number
  disapprovedProducts: number
  pendingProducts: number
  expiringProducts: number

  // Issue breakdown
  issuesByCode: Record<string, number>
  issuesBySeverity: {
    error: number
    warning: number
    suggestion: number
  }

  // Trends
  approvalRateTrend: number[]        // Last 30 days
  issueCountTrend: number[]          // Last 30 days

  // Top issues
  topIssues: Array<{
    code: string
    count: number
    affectedImpressions: number
  }>

  // Recommendations
  recommendations: string[]
}
