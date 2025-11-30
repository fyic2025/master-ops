/**
 * SKU Matcher Utilities
 *
 * Handles SKU matching between Shopify and Unleashed with:
 * - Primary matching by SKU
 * - Name similarity validation to catch promo gift mismatches
 * - Fuzzy matching for edge cases
 */

/**
 * Normalize a string for comparison (lowercase, remove special chars)
 */
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '')  // Remove special characters
    .replace(/\s+/g, ' ')      // Collapse whitespace
    .trim()
}

/**
 * Calculate similarity between two strings (0-1 scale)
 * Uses Jaccard similarity on word tokens
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(normalizeString(str1).split(' ').filter(w => w.length > 2))
  const words2 = new Set(normalizeString(str2).split(' ').filter(w => w.length > 2))

  if (words1.size === 0 && words2.size === 0) return 1
  if (words1.size === 0 || words2.size === 0) return 0

  const intersection = new Set([...words1].filter(w => words2.has(w)))
  const union = new Set([...words1, ...words2])

  return intersection.size / union.size
}

/**
 * Check if a line item appears to be a promo gift
 */
export function isPromoGift(item: {
  title: string
  price: string
  sku: string
}): boolean {
  const title = item.title.toLowerCase()
  const price = parseFloat(item.price)

  // Common indicators of promo gifts
  const promoIndicators = [
    'gift',
    'free',
    'promo',
    'bonus',
    'sample',
    'complimentary',
    'gwp',  // Gift With Purchase
    'giveaway',
  ]

  const hasPromoIndicator = promoIndicators.some(indicator => title.includes(indicator))
  const isFree = price === 0 || price < 0.01

  return hasPromoIndicator || isFree
}

/**
 * Result of SKU matching attempt
 */
export interface SkuMatchResult {
  matched: boolean
  sku: string
  shopifyTitle: string
  unleashedProductCode: string | null
  unleashedDescription: string | null
  similarity: number
  isPromoGift: boolean
  warning: string | null
}

/**
 * Match a Shopify line item to an Unleashed product
 *
 * Matching strategy:
 * 1. Direct SKU match (primary)
 * 2. If promo gift detected, apply stricter name validation
 * 3. Warn if name similarity is too low
 */
export function matchSku(
  shopifyItem: {
    sku: string
    title: string
    price: string
  },
  unleashedProducts: Map<string, { ProductCode: string; ProductDescription: string }>,
  options: {
    similarityThreshold?: number  // Minimum similarity for valid match (default: 0.3)
    warnThreshold?: number        // Warn if below this (default: 0.5)
  } = {}
): SkuMatchResult {
  const { similarityThreshold = 0.3, warnThreshold = 0.5 } = options

  const result: SkuMatchResult = {
    matched: false,
    sku: shopifyItem.sku,
    shopifyTitle: shopifyItem.title,
    unleashedProductCode: null,
    unleashedDescription: null,
    similarity: 0,
    isPromoGift: isPromoGift(shopifyItem),
    warning: null,
  }

  // Skip if no SKU
  if (!shopifyItem.sku) {
    result.warning = 'No SKU on line item'
    return result
  }

  // Try direct SKU match
  const unleashedProduct = unleashedProducts.get(shopifyItem.sku)

  if (!unleashedProduct) {
    result.warning = `SKU "${shopifyItem.sku}" not found in Unleashed`
    return result
  }

  result.unleashedProductCode = unleashedProduct.ProductCode
  result.unleashedDescription = unleashedProduct.ProductDescription

  // Calculate name similarity
  result.similarity = calculateSimilarity(
    shopifyItem.title,
    unleashedProduct.ProductDescription
  )

  // Apply stricter validation for promo gifts
  const effectiveThreshold = result.isPromoGift ? 0.4 : similarityThreshold

  if (result.similarity < effectiveThreshold) {
    result.warning = `Low name similarity (${(result.similarity * 100).toFixed(0)}%) - possible promo gift mismatch. ` +
      `Shopify: "${shopifyItem.title}" vs Unleashed: "${unleashedProduct.ProductDescription}"`

    // For promo gifts with very low similarity, don't match
    if (result.isPromoGift && result.similarity < 0.2) {
      result.matched = false
      result.warning = `Promo gift SKU mismatch - "${shopifyItem.title}" doesn't match "${unleashedProduct.ProductDescription}". ` +
        `This item may need manual review or a SKU mapping entry.`
      return result
    }
  } else if (result.similarity < warnThreshold) {
    result.warning = `Name similarity (${(result.similarity * 100).toFixed(0)}%) is below expected threshold. ` +
      `Shopify: "${shopifyItem.title}" vs Unleashed: "${unleashedProduct.ProductDescription}"`
  }

  result.matched = true
  return result
}

/**
 * Extract the "base" product from a promo gift title
 * E.g., "FREE: Sample Pack of Mushroom Coffee" -> "Sample Pack Mushroom Coffee"
 */
export function extractBaseProductName(promoTitle: string): string {
  let cleaned = promoTitle
    .replace(/^(free|gift|bonus|promo|sample|gwp)[:\-\s]*/i, '')
    .replace(/\s*(free|gift|bonus|promo|sample)\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return cleaned || promoTitle
}

/**
 * Try to find the best matching Unleashed product for a promo item
 * when direct SKU match fails or has low confidence
 */
export function findBestUnleashedMatch(
  shopifyTitle: string,
  unleashedProducts: Array<{ ProductCode: string; ProductDescription: string }>,
  minSimilarity: number = 0.4
): { product: typeof unleashedProducts[0]; similarity: number } | null {
  const baseName = extractBaseProductName(shopifyTitle)

  let bestMatch: typeof unleashedProducts[0] | null = null
  let bestSimilarity = 0

  for (const product of unleashedProducts) {
    const similarity = calculateSimilarity(baseName, product.ProductDescription)
    if (similarity > bestSimilarity && similarity >= minSimilarity) {
      bestSimilarity = similarity
      bestMatch = product
    }
  }

  return bestMatch ? { product: bestMatch, similarity: bestSimilarity } : null
}
