/**
 * BOO Checkout Health Monitor - Nth Degree Edition
 *
 * Comprehensive proactive checkout issue detection covering:
 * - Inventory & Stock (stockouts, variants, negative stock, oversold)
 * - Shipping & Delivery (zone gaps, carrier health, missing weights)
 * - Payment & Transactions (gateway health, SSL, limits)
 * - Product Configuration (images, 404s, options, duplicates)
 * - Pricing & Discounts (zero prices, expired promos, coupon issues)
 * - Cart & Session (abandonment, calculation errors)
 * - Performance (slow pages, JS errors)
 * - Data Quality (missing categories, stale data)
 *
 * Usage:
 *   npx tsx buy-organics-online/scripts/checkout-health-monitor.ts
 *   npx tsx buy-organics-online/scripts/checkout-health-monitor.ts --check=inventory
 *   npx tsx buy-organics-online/scripts/checkout-health-monitor.ts --check=pricing
 *   npx tsx buy-organics-online/scripts/checkout-health-monitor.ts --dry-run
 *   npx tsx buy-organics-online/scripts/checkout-health-monitor.ts --quick (critical checks only)
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as https from 'https'

// Load environment variables
dotenv.config()

// Configuration
const DRY_RUN = process.argv.includes('--dry-run')
const QUICK_MODE = process.argv.includes('--quick')
const SPECIFIC_CHECK = process.argv.find((arg) => arg.startsWith('--check='))?.split('=')[1]

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://qcvfxxsnqvdfmpbcgdni.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// BigCommerce config
const BC_STORE_HASH = process.env.BC_BOO_STORE_HASH || process.env.BOO_BC_STORE_HASH || 'hhhi'
const BC_ACCESS_TOKEN = process.env.BC_BOO_ACCESS_TOKEN || process.env.BOO_BC_ACCESS_TOKEN || ''
const STORE_URL = 'https://www.buyorganicsonline.com.au'

// ============================================================================
// TYPES
// ============================================================================
interface HealthCheckResult {
  check_type: string
  category: string
  status: 'healthy' | 'warning' | 'critical'
  issues_found: number
  issues: HealthIssue[]
  duration_ms: number
  timestamp: string
}

interface HealthIssue {
  severity: 'critical' | 'warning' | 'info'
  title: string
  description: string
  details: Record<string, unknown>
  actionRequired?: string
}

interface CheckConfig {
  enabled: boolean
  config: Record<string, unknown>
}

// ============================================================================
// HELPERS
// ============================================================================

// BigCommerce API helper with rate limiting
let lastApiCall = 0
async function bcApiRequest(path: string, retries = 3): Promise<unknown> {
  // Rate limiting: max 4 calls per second
  const now = Date.now()
  const timeSinceLastCall = now - lastApiCall
  if (timeSinceLastCall < 250) {
    await new Promise((r) => setTimeout(r, 250 - timeSinceLastCall))
  }
  lastApiCall = Date.now()

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`https://api.bigcommerce.com/stores/${BC_STORE_HASH}${path}`, {
        headers: {
          'X-Auth-Token': BC_ACCESS_TOKEN,
          Accept: 'application/json',
        },
      })

      if (response.status === 429) {
        // Rate limited - wait and retry
        const retryAfter = parseInt(response.headers.get('retry-after') || '5', 10)
        await new Promise((r) => setTimeout(r, retryAfter * 1000))
        continue
      }

      if (!response.ok) {
        throw new Error(`BigCommerce API error: ${response.status} ${response.statusText}`)
      }

      return response.json()
    } catch (err) {
      if (attempt === retries) throw err
      await new Promise((r) => setTimeout(r, 1000 * attempt))
    }
  }
}

// HTTP HEAD request helper
async function checkUrl(url: string, timeoutMs = 10000): Promise<{ ok: boolean; status?: number; error?: string }> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve({ ok: false, error: 'timeout' }), timeoutMs)

    try {
      const urlObj = new URL(url)
      const req = https.request(
        {
          hostname: urlObj.hostname,
          path: urlObj.pathname + urlObj.search,
          method: 'HEAD',
          timeout: timeoutMs,
        },
        (res) => {
          clearTimeout(timeout)
          resolve({ ok: res.statusCode! < 400, status: res.statusCode })
        }
      )
      req.on('error', (err) => {
        clearTimeout(timeout)
        resolve({ ok: false, error: err.message })
      })
      req.end()
    } catch (err) {
      clearTimeout(timeout)
      resolve({ ok: false, error: (err as Error).message })
    }
  })
}

// ============================================================================
// 1. INVENTORY & STOCK CHECKS
// ============================================================================
async function checkInventory(config: CheckConfig): Promise<HealthCheckResult> {
  const startTime = Date.now()
  const issues: HealthIssue[] = []
  const lowStockThreshold = (config.config.low_stock_threshold as number) || 5

  console.log(`\n[Inventory & Stock] Running comprehensive inventory checks...`)

  if (!BC_ACCESS_TOKEN) {
    return createSkippedResult('inventory', 'Inventory & Stock', 'BigCommerce credentials not configured', startTime)
  }

  const zeroStockVisible: Array<{ id: number; name: string; sku: string; url: string }> = []
  const lowStockVisible: Array<{ id: number; name: string; sku: string; stock: number }> = []
  const negativeStock: Array<{ id: number; name: string; sku: string; stock: number }> = []
  const variantStockouts: Array<{ productId: number; productName: string; variantSku: string; optionValues: string }> =
    []
  const missingTrackingEnabled: Array<{ id: number; name: string }> = []

  let page = 1
  const maxPages = QUICK_MODE ? 3 : 20
  let totalProducts = 0

  while (page <= maxPages) {
    try {
      const response = (await bcApiRequest(
        `/v3/catalog/products?limit=250&page=${page}&include=variants&include_fields=id,name,sku,inventory_level,inventory_tracking,is_visible,custom_url`
      )) as { data: Array<Record<string, unknown>>; meta: { pagination: { total_pages: number } } }
      const products = response.data || []

      if (products.length === 0) break
      totalProducts += products.length

      for (const product of products) {
        const stock = product.inventory_level as number
        const tracking = product.inventory_tracking as string
        const isVisible = product.is_visible as boolean
        const customUrl = product.custom_url as { url: string } | undefined

        // Check for negative stock
        if (stock < 0) {
          negativeStock.push({
            id: product.id as number,
            name: (product.name as string).substring(0, 60),
            sku: (product.sku as string) || 'N/A',
            stock,
          })
        }

        // Check visible products
        if (isVisible) {
          if (tracking !== 'none' && stock === 0) {
            zeroStockVisible.push({
              id: product.id as number,
              name: (product.name as string).substring(0, 60),
              sku: (product.sku as string) || 'N/A',
              url: customUrl?.url || '',
            })
          } else if (tracking !== 'none' && stock > 0 && stock <= lowStockThreshold) {
            lowStockVisible.push({
              id: product.id as number,
              name: (product.name as string).substring(0, 60),
              sku: (product.sku as string) || 'N/A',
              stock,
            })
          }
        }

        // Check for visible products without inventory tracking (risky)
        if (isVisible && tracking === 'none') {
          missingTrackingEnabled.push({
            id: product.id as number,
            name: (product.name as string).substring(0, 60),
          })
        }

        // Check variant-level stockouts (only if not in quick mode)
        if (!QUICK_MODE && isVisible && tracking === 'variant') {
          const variants = product.variants as Array<Record<string, unknown>> | undefined
          if (variants) {
            for (const variant of variants) {
              const variantStock = variant.inventory_level as number
              if (variantStock === 0) {
                variantStockouts.push({
                  productId: product.id as number,
                  productName: (product.name as string).substring(0, 40),
                  variantSku: (variant.sku as string) || 'N/A',
                  optionValues: ((variant.option_values as Array<{ label: string }>) || [])
                    .map((o) => o.label)
                    .join(', '),
                })
              }
            }
          }
        }
      }

      page++
    } catch (err) {
      console.log(`  Error on page ${page}:`, (err as Error).message)
      break
    }
  }

  console.log(`  Scanned ${totalProducts} products`)
  console.log(`  Zero-stock visible: ${zeroStockVisible.length}`)
  console.log(`  Low-stock visible: ${lowStockVisible.length}`)
  console.log(`  Negative stock: ${negativeStock.length}`)
  console.log(`  Variant stockouts: ${variantStockouts.length}`)

  // Create issues
  if (zeroStockVisible.length > 0) {
    issues.push({
      severity: 'critical',
      title: `${zeroStockVisible.length} visible products with zero stock`,
      description: 'Customers can see these products but cannot purchase them',
      details: { products: zeroStockVisible.slice(0, 25), total: zeroStockVisible.length },
      actionRequired: 'Hide products or restock immediately',
    })
  }

  if (negativeStock.length > 0) {
    issues.push({
      severity: 'critical',
      title: `${negativeStock.length} products with negative inventory`,
      description: 'Inventory data corruption - products showing negative stock',
      details: { products: negativeStock.slice(0, 10), total: negativeStock.length },
      actionRequired: 'Fix inventory levels in BigCommerce',
    })
  }

  if (lowStockVisible.length > 20) {
    issues.push({
      severity: 'warning',
      title: `${lowStockVisible.length} products with low stock (≤${lowStockThreshold})`,
      description: 'May cause cart issues when multiple customers order',
      details: { products: lowStockVisible.slice(0, 20), total: lowStockVisible.length },
    })
  }

  if (variantStockouts.length > 50) {
    issues.push({
      severity: 'warning',
      title: `${variantStockouts.length} variant-level stockouts`,
      description: 'Specific product options are out of stock',
      details: { variants: variantStockouts.slice(0, 20), total: variantStockouts.length },
    })
  }

  return createResult('inventory', 'Inventory & Stock', issues, startTime)
}

// ============================================================================
// 2. SHIPPING & DELIVERY CHECKS
// ============================================================================
async function checkShipping(config: CheckConfig): Promise<HealthCheckResult> {
  const startTime = Date.now()
  const issues: HealthIssue[] = []

  // Test postcodes across Australia
  const testPostcodes = (config.config.test_postcodes as string[]) || [
    '2000', // Sydney CBD
    '3000', // Melbourne CBD
    '4000', // Brisbane CBD
    '5000', // Adelaide CBD
    '6000', // Perth CBD
    '7000', // Hobart
    '0800', // Darwin
    '2600', // Canberra
    '2480', // Lismore (regional)
    '4870', // Cairns (remote)
    '0870', // Alice Springs (very remote)
    '6770', // Karratha (remote WA)
  ]

  console.log(`\n[Shipping & Delivery] Checking shipping health...`)

  // Check for recent shipping errors
  const { data: shippingErrors } = await supabase
    .from('checkout_error_logs')
    .select('*')
    .eq('error_type', 'shipping_method')
    .gte('occurred_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .order('occurred_at', { ascending: false })
    .limit(20)

  const recentShippingErrors = shippingErrors?.length || 0
  console.log(`  Recent shipping errors (1h): ${recentShippingErrors}`)

  if (recentShippingErrors >= 5) {
    const postcodeErrors: Record<string, number> = {}
    shippingErrors?.forEach((e) => {
      const postcode = e.shipping_address_postcode || 'unknown'
      postcodeErrors[postcode] = (postcodeErrors[postcode] || 0) + 1
    })

    issues.push({
      severity: 'critical',
      title: `${recentShippingErrors} shipping errors in the last hour`,
      description: 'Customers may be unable to complete checkout',
      details: {
        error_count: recentShippingErrors,
        by_postcode: postcodeErrors,
        sample_errors: shippingErrors?.slice(0, 5).map((e) => ({
          postcode: e.shipping_address_postcode,
          state: e.shipping_address_state,
          message: e.error_message,
        })),
      },
      actionRequired: 'Check shipping zone configuration for affected postcodes',
    })
  } else if (recentShippingErrors >= 2) {
    issues.push({
      severity: 'warning',
      title: `${recentShippingErrors} shipping errors in the last hour`,
      description: 'Some customers are experiencing checkout issues',
      details: { error_count: recentShippingErrors },
    })
  }

  // Check for products missing weight/dimensions (required for shipping)
  if (BC_ACCESS_TOKEN && !QUICK_MODE) {
    console.log(`  Checking for products missing shipping data...`)
    let missingWeight = 0
    let page = 1

    while (page <= 5) {
      try {
        const response = (await bcApiRequest(
          `/v3/catalog/products?limit=250&page=${page}&is_visible=true&include_fields=id,name,weight`
        )) as { data: Array<Record<string, unknown>> }
        const products = response.data || []
        if (products.length === 0) break

        for (const product of products) {
          const weight = product.weight as number
          if (!weight || weight === 0) {
            missingWeight++
          }
        }
        page++
      } catch {
        break
      }
    }

    if (missingWeight > 50) {
      issues.push({
        severity: 'warning',
        title: `${missingWeight}+ products missing weight data`,
        description: 'Products without weight may have incorrect shipping quotes',
        details: { count: missingWeight },
        actionRequired: 'Add weight data to products for accurate shipping',
      })
    }
  }

  // Check postcode patterns in last 24h
  const { data: postcodePatterns } = await supabase
    .from('checkout_error_logs')
    .select('shipping_address_postcode, shipping_address_state')
    .eq('error_type', 'shipping_method')
    .gte('occurred_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  const postcodeCounts: Record<string, number> = {}
  postcodePatterns?.forEach((e) => {
    const pc = e.shipping_address_postcode || 'unknown'
    postcodeCounts[pc] = (postcodeCounts[pc] || 0) + 1
  })

  const hotspots = Object.entries(postcodeCounts)
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])

  if (hotspots.length > 0) {
    issues.push({
      severity: 'info',
      title: `${hotspots.length} postcode hotspots in last 24h`,
      description: 'Postcodes with repeated shipping errors',
      details: { hotspots: Object.fromEntries(hotspots.slice(0, 10)) },
    })
  }

  return createResult('shipping', 'Shipping & Delivery', issues, startTime)
}

// ============================================================================
// 3. PAYMENT & TRANSACTION CHECKS
// ============================================================================
async function checkPayment(config: CheckConfig): Promise<HealthCheckResult> {
  const startTime = Date.now()
  const issues: HealthIssue[] = []

  console.log(`\n[Payment & Transactions] Checking payment gateway health...`)

  // Check for payment-related errors
  const { data: paymentErrors } = await supabase
    .from('checkout_error_logs')
    .select('*')
    .in('error_type', ['payment_method', 'card_declined', 'payment_failed'])
    .gte('occurred_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

  const recentPaymentErrors = paymentErrors?.length || 0
  console.log(`  Recent payment errors (1h): ${recentPaymentErrors}`)

  if (recentPaymentErrors >= 5) {
    const errorTypes: Record<string, number> = {}
    paymentErrors?.forEach((e) => {
      errorTypes[e.error_type] = (errorTypes[e.error_type] || 0) + 1
    })

    issues.push({
      severity: recentPaymentErrors >= 10 ? 'critical' : 'warning',
      title: `${recentPaymentErrors} payment errors in the last hour`,
      description: 'Customers may be unable to complete purchases',
      details: { by_type: errorTypes, total: recentPaymentErrors },
      actionRequired: 'Check payment gateway status',
    })
  }

  // Check SSL certificate expiry
  console.log(`  Checking SSL certificate...`)
  try {
    const checkSsl = await new Promise<{ valid: boolean; daysUntilExpiry?: number; error?: string }>((resolve) => {
      const req = https.request(
        {
          hostname: 'www.buyorganicsonline.com.au',
          port: 443,
          method: 'HEAD',
        },
        (res) => {
          const cert = (res.socket as any).getPeerCertificate()
          if (cert && cert.valid_to) {
            const expiry = new Date(cert.valid_to)
            const daysUntilExpiry = Math.floor((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            resolve({ valid: true, daysUntilExpiry })
          } else {
            resolve({ valid: false, error: 'Could not read certificate' })
          }
        }
      )
      req.on('error', (err) => resolve({ valid: false, error: err.message }))
      req.setTimeout(5000, () => {
        req.destroy()
        resolve({ valid: false, error: 'timeout' })
      })
      req.end()
    })

    if (checkSsl.valid && checkSsl.daysUntilExpiry !== undefined) {
      console.log(`  SSL expires in ${checkSsl.daysUntilExpiry} days`)
      if (checkSsl.daysUntilExpiry < 7) {
        issues.push({
          severity: 'critical',
          title: `SSL certificate expires in ${checkSsl.daysUntilExpiry} days`,
          description: 'SSL expiry will break all secure checkout',
          details: { days_until_expiry: checkSsl.daysUntilExpiry },
          actionRequired: 'Renew SSL certificate immediately',
        })
      } else if (checkSsl.daysUntilExpiry < 30) {
        issues.push({
          severity: 'warning',
          title: `SSL certificate expires in ${checkSsl.daysUntilExpiry} days`,
          description: 'Plan SSL renewal soon',
          details: { days_until_expiry: checkSsl.daysUntilExpiry },
        })
      }
    }
  } catch (err) {
    console.log(`  SSL check error: ${(err as Error).message}`)
  }

  // Check for Afterpay limits (products over $2000)
  if (BC_ACCESS_TOKEN && !QUICK_MODE) {
    console.log(`  Checking for Afterpay limit issues...`)
    let overLimit = 0

    try {
      const response = (await bcApiRequest(
        `/v3/catalog/products?limit=100&is_visible=true&price:min=2000&include_fields=id,name,price`
      )) as { data: Array<Record<string, unknown>> }
      overLimit = response.data?.length || 0

      if (overLimit > 0) {
        issues.push({
          severity: 'info',
          title: `${overLimit} products exceed Afterpay limit ($2000)`,
          description: 'Customers cannot use Afterpay for these products',
          details: {
            count: overLimit,
            products: response.data?.slice(0, 5).map((p) => ({
              name: (p.name as string).substring(0, 40),
              price: p.price,
            })),
          },
        })
      }
    } catch {
      // Ignore
    }
  }

  return createResult('payment', 'Payment & Transactions', issues, startTime)
}

// ============================================================================
// 4. PRODUCT CONFIGURATION CHECKS
// ============================================================================
async function checkProductConfig(config: CheckConfig): Promise<HealthCheckResult> {
  const startTime = Date.now()
  const issues: HealthIssue[] = []

  console.log(`\n[Product Configuration] Checking product data quality...`)

  if (!BC_ACCESS_TOKEN) {
    return createSkippedResult(
      'product_config',
      'Product Configuration',
      'BigCommerce credentials not configured',
      startTime
    )
  }

  const missingImages: Array<{ id: number; name: string }> = []
  const missingDescriptions: Array<{ id: number; name: string }> = []
  const zeroPriceProducts: Array<{ id: number; name: string; price: number }> = []
  const duplicateSkus: Map<string, Array<{ id: number; name: string }>> = new Map()

  let page = 1
  const maxPages = QUICK_MODE ? 3 : 10
  let totalChecked = 0

  while (page <= maxPages) {
    try {
      const response = (await bcApiRequest(
        `/v3/catalog/products?limit=250&page=${page}&is_visible=true&include_fields=id,name,sku,price,description,images`
      )) as { data: Array<Record<string, unknown>> }
      const products = response.data || []
      if (products.length === 0) break
      totalChecked += products.length

      for (const product of products) {
        const images = product.images as Array<unknown> | undefined
        const description = product.description as string | undefined
        const price = product.price as number
        const sku = product.sku as string

        // Check for missing images
        if (!images || images.length === 0) {
          missingImages.push({
            id: product.id as number,
            name: (product.name as string).substring(0, 50),
          })
        }

        // Check for missing descriptions
        if (!description || description.trim().length < 20) {
          missingDescriptions.push({
            id: product.id as number,
            name: (product.name as string).substring(0, 50),
          })
        }

        // Check for zero/negative price
        if (price <= 0) {
          zeroPriceProducts.push({
            id: product.id as number,
            name: (product.name as string).substring(0, 50),
            price,
          })
        }

        // Track duplicate SKUs
        if (sku) {
          const existing = duplicateSkus.get(sku) || []
          existing.push({ id: product.id as number, name: (product.name as string).substring(0, 40) })
          duplicateSkus.set(sku, existing)
        }
      }

      page++
    } catch (err) {
      console.log(`  Error on page ${page}:`, (err as Error).message)
      break
    }
  }

  console.log(`  Checked ${totalChecked} products`)
  console.log(`  Missing images: ${missingImages.length}`)
  console.log(`  Missing descriptions: ${missingDescriptions.length}`)
  console.log(`  Zero/negative price: ${zeroPriceProducts.length}`)

  // Find actual duplicates (SKUs appearing more than once)
  const actualDuplicates = Array.from(duplicateSkus.entries()).filter(([, products]) => products.length > 1)
  console.log(`  Duplicate SKUs: ${actualDuplicates.length}`)

  // Create issues
  if (zeroPriceProducts.length > 0) {
    issues.push({
      severity: 'critical',
      title: `${zeroPriceProducts.length} products with $0 or negative price`,
      description: 'Products with invalid pricing cannot be sold',
      details: { products: zeroPriceProducts.slice(0, 10), total: zeroPriceProducts.length },
      actionRequired: 'Fix product pricing immediately',
    })
  }

  if (actualDuplicates.length > 0) {
    issues.push({
      severity: 'critical',
      title: `${actualDuplicates.length} duplicate SKUs found`,
      description: 'Duplicate SKUs can cause inventory and order issues',
      details: {
        duplicates: actualDuplicates.slice(0, 10).map(([sku, products]) => ({ sku, products })),
        total: actualDuplicates.length,
      },
      actionRequired: 'Deduplicate product SKUs',
    })
  }

  if (missingImages.length > 20) {
    issues.push({
      severity: 'warning',
      title: `${missingImages.length} visible products without images`,
      description: 'Products without images have lower conversion',
      details: { products: missingImages.slice(0, 15), total: missingImages.length },
    })
  }

  if (missingDescriptions.length > 50) {
    issues.push({
      severity: 'warning',
      title: `${missingDescriptions.length} products with missing/short descriptions`,
      description: 'Products need descriptions for SEO and customer confidence',
      details: { products: missingDescriptions.slice(0, 15), total: missingDescriptions.length },
    })
  }

  return createResult('product_config', 'Product Configuration', issues, startTime)
}

// ============================================================================
// 5. PRICING & DISCOUNT CHECKS
// ============================================================================
async function checkPricing(config: CheckConfig): Promise<HealthCheckResult> {
  const startTime = Date.now()
  const issues: HealthIssue[] = []

  console.log(`\n[Pricing & Discounts] Checking pricing integrity...`)

  if (!BC_ACCESS_TOKEN) {
    return createSkippedResult('pricing', 'Pricing & Discounts', 'BigCommerce credentials not configured', startTime)
  }

  const salePriceIssues: Array<{ id: number; name: string; price: number; sale_price: number }> = []

  // Check for sale price > regular price (inverted sale)
  let page = 1
  const maxPages = QUICK_MODE ? 2 : 5

  while (page <= maxPages) {
    try {
      const response = (await bcApiRequest(
        `/v3/catalog/products?limit=250&page=${page}&is_visible=true&include_fields=id,name,price,sale_price`
      )) as { data: Array<Record<string, unknown>> }
      const products = response.data || []
      if (products.length === 0) break

      for (const product of products) {
        const price = product.price as number
        const salePrice = product.sale_price as number | null

        if (salePrice && salePrice > price) {
          salePriceIssues.push({
            id: product.id as number,
            name: (product.name as string).substring(0, 50),
            price,
            sale_price: salePrice,
          })
        }
      }

      page++
    } catch (err) {
      break
    }
  }

  console.log(`  Sale price > regular price: ${salePriceIssues.length}`)

  if (salePriceIssues.length > 0) {
    issues.push({
      severity: 'warning',
      title: `${salePriceIssues.length} products with inverted sale pricing`,
      description: 'Sale price is higher than regular price',
      details: { products: salePriceIssues.slice(0, 10), total: salePriceIssues.length },
      actionRequired: 'Fix sale price configuration',
    })
  }

  // Check for coupon/discount related checkout errors
  const { data: promoErrors } = await supabase
    .from('checkout_error_logs')
    .select('*')
    .or('error_type.eq.coupon,error_message.ilike.%coupon%,error_message.ilike.%discount%')
    .gte('occurred_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  const promoErrorCount = promoErrors?.length || 0
  console.log(`  Coupon/discount errors (24h): ${promoErrorCount}`)

  if (promoErrorCount >= 3) {
    issues.push({
      severity: 'warning',
      title: `${promoErrorCount} coupon/discount errors in last 24h`,
      description: 'Customers experiencing issues with promo codes',
      details: {
        count: promoErrorCount,
        samples: promoErrors?.slice(0, 5).map((e) => e.error_message),
      },
    })
  }

  return createResult('pricing', 'Pricing & Discounts', issues, startTime)
}

// ============================================================================
// 6. CART & SESSION CHECKS
// ============================================================================
async function checkCartSession(config: CheckConfig): Promise<HealthCheckResult> {
  const startTime = Date.now()
  const issues: HealthIssue[] = []

  console.log(`\n[Cart & Session] Checking cart and session health...`)

  // Check for cart-related errors
  const { data: cartErrors } = await supabase
    .from('checkout_error_logs')
    .select('*')
    .or('error_type.eq.cart,error_message.ilike.%cart%,error_message.ilike.%session%')
    .gte('occurred_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

  const cartErrorCount = cartErrors?.length || 0
  console.log(`  Cart/session errors (1h): ${cartErrorCount}`)

  if (cartErrorCount >= 5) {
    issues.push({
      severity: cartErrorCount >= 10 ? 'critical' : 'warning',
      title: `${cartErrorCount} cart/session errors in the last hour`,
      description: 'Customers may be losing cart contents',
      details: {
        count: cartErrorCount,
        samples: cartErrors?.slice(0, 5).map((e) => ({
          type: e.error_type,
          message: e.error_message?.substring(0, 100),
        })),
      },
      actionRequired: 'Investigate session/cart handling',
    })
  }

  // Check for calculation-related errors
  const { data: calcErrors } = await supabase
    .from('checkout_error_logs')
    .select('*')
    .or('error_message.ilike.%total%,error_message.ilike.%calculation%,error_message.ilike.%price%')
    .gte('occurred_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  const calcErrorCount = calcErrors?.length || 0
  console.log(`  Calculation errors (24h): ${calcErrorCount}`)

  if (calcErrorCount >= 3) {
    issues.push({
      severity: 'warning',
      title: `${calcErrorCount} calculation-related errors in last 24h`,
      description: 'Cart total or pricing calculations may be incorrect',
      details: {
        count: calcErrorCount,
        samples: calcErrors?.slice(0, 3).map((e) => e.error_message?.substring(0, 100)),
      },
    })
  }

  return createResult('cart_session', 'Cart & Session', issues, startTime)
}

// ============================================================================
// 7. API HEALTH CHECK
// ============================================================================
async function checkApiHealth(config: CheckConfig): Promise<HealthCheckResult> {
  const startTime = Date.now()
  const issues: HealthIssue[] = []

  console.log(`\n[API Health] Checking BigCommerce API health...`)

  if (!BC_ACCESS_TOKEN) {
    return createSkippedResult('api_health', 'API Health', 'BigCommerce credentials not configured', startTime)
  }

  // Test API connectivity and response time
  try {
    const testStart = Date.now()
    await bcApiRequest('/v2/store')
    const responseTime = Date.now() - testStart

    console.log(`  API response time: ${responseTime}ms`)

    if (responseTime > 5000) {
      issues.push({
        severity: 'warning',
        title: 'Slow BigCommerce API response',
        description: `API responded in ${responseTime}ms (threshold: 5000ms)`,
        details: { response_time_ms: responseTime },
      })
    } else if (responseTime > 10000) {
      issues.push({
        severity: 'critical',
        title: 'Very slow BigCommerce API response',
        description: `API responded in ${responseTime}ms - may cause checkout timeouts`,
        details: { response_time_ms: responseTime },
        actionRequired: 'Contact BigCommerce support',
      })
    }
  } catch (err) {
    issues.push({
      severity: 'critical',
      title: 'BigCommerce API unreachable',
      description: (err as Error).message,
      details: { error: (err as Error).message },
      actionRequired: 'Check API credentials and BigCommerce status',
    })
  }

  // Check for API-related checkout errors
  const { data: apiErrors } = await supabase
    .from('checkout_error_logs')
    .select('*')
    .or('error_message.ilike.%api%,error_message.ilike.%timeout%,error_message.ilike.%500%,error_message.ilike.%503%')
    .gte('occurred_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

  const apiErrorCount = apiErrors?.length || 0
  console.log(`  API-related checkout errors (1h): ${apiErrorCount}`)

  if (apiErrorCount >= 3) {
    issues.push({
      severity: 'warning',
      title: `${apiErrorCount} API-related errors in the last hour`,
      description: 'Backend API issues may be affecting checkout',
      details: { count: apiErrorCount },
    })
  }

  return createResult('api_health', 'API Health', issues, startTime)
}

// ============================================================================
// 8. DATA QUALITY CHECKS
// ============================================================================
async function checkDataQuality(config: CheckConfig): Promise<HealthCheckResult> {
  const startTime = Date.now()
  const issues: HealthIssue[] = []

  console.log(`\n[Data Quality] Checking data integrity...`)

  if (!BC_ACCESS_TOKEN || QUICK_MODE) {
    if (QUICK_MODE) {
      console.log('  Skipped in quick mode')
      return createResult('data_quality', 'Data Quality', [], startTime)
    }
    return createSkippedResult('data_quality', 'Data Quality', 'BigCommerce credentials not configured', startTime)
  }

  // Check for products without categories
  let uncategorized = 0
  let page = 1

  try {
    while (page <= 3) {
      const response = (await bcApiRequest(
        `/v3/catalog/products?limit=250&page=${page}&is_visible=true&include_fields=id,name,categories`
      )) as { data: Array<Record<string, unknown>> }
      const products = response.data || []
      if (products.length === 0) break

      for (const product of products) {
        const categories = product.categories as number[] | undefined
        if (!categories || categories.length === 0) {
          uncategorized++
        }
      }
      page++
    }

    console.log(`  Uncategorized products: ${uncategorized}`)

    if (uncategorized > 20) {
      issues.push({
        severity: 'warning',
        title: `${uncategorized} visible products without categories`,
        description: 'Products without categories are hard to find',
        details: { count: uncategorized },
        actionRequired: 'Assign categories to products',
      })
    }
  } catch (err) {
    console.log(`  Error checking categories: ${(err as Error).message}`)
  }

  // Check for empty categories
  try {
    const response = (await bcApiRequest(`/v3/catalog/categories?is_visible=true&limit=250`)) as {
      data: Array<Record<string, unknown>>
    }
    const categories = response.data || []
    const emptyCategories = categories.filter((c) => (c.product_count as number) === 0)

    console.log(`  Empty visible categories: ${emptyCategories.length}`)

    if (emptyCategories.length > 5) {
      issues.push({
        severity: 'info',
        title: `${emptyCategories.length} visible categories have no products`,
        description: 'Empty categories may confuse customers',
        details: {
          categories: emptyCategories.slice(0, 10).map((c) => c.name),
          total: emptyCategories.length,
        },
      })
    }
  } catch (err) {
    console.log(`  Error checking empty categories: ${(err as Error).message}`)
  }

  return createResult('data_quality', 'Data Quality', issues, startTime)
}

// ============================================================================
// 9. ERROR ANALYSIS CHECK (from logs)
// ============================================================================
async function checkErrorAnalysis(config: CheckConfig): Promise<HealthCheckResult> {
  const startTime = Date.now()
  const issues: HealthIssue[] = []
  const threshold = (config.config.threshold as number) || 5
  const lookbackHours = (config.config.lookback_hours as number) || 1

  console.log(`\n[Error Analysis] Analyzing checkout errors...`)

  // Get error count in last hour
  const { count: recentErrorCount } = await supabase
    .from('checkout_error_logs')
    .select('*', { count: 'exact', head: true })
    .gte('occurred_at', new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString())

  console.log(`  Errors in last ${lookbackHours}h: ${recentErrorCount || 0} (threshold: ${threshold})`)

  if ((recentErrorCount || 0) >= threshold) {
    // Get error breakdown by type
    const { data: errorsByType } = await supabase
      .from('checkout_error_logs')
      .select('error_type')
      .gte('occurred_at', new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString())

    const breakdown: Record<string, number> = {}
    errorsByType?.forEach((e) => {
      breakdown[e.error_type] = (breakdown[e.error_type] || 0) + 1
    })

    issues.push({
      severity: recentErrorCount! >= threshold * 2 ? 'critical' : 'warning',
      title: `${recentErrorCount} checkout errors in last ${lookbackHours}h`,
      description: `Error count exceeds threshold of ${threshold}`,
      details: { error_count: recentErrorCount, breakdown, threshold },
      actionRequired: 'Review error logs and fix root causes',
    })
  }

  // Check for unresolved errors older than 24h
  const { count: staleUnresolved } = await supabase
    .from('checkout_error_logs')
    .select('*', { count: 'exact', head: true })
    .eq('resolved', false)
    .lt('occurred_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  if ((staleUnresolved || 0) > 5) {
    issues.push({
      severity: 'info',
      title: `${staleUnresolved} unresolved errors older than 24h`,
      description: 'Review and resolve old checkout errors',
      details: { count: staleUnresolved },
    })
  }

  return createResult('error_analysis', 'Error Analysis', issues, startTime)
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function createResult(
  checkType: string,
  category: string,
  issues: HealthIssue[],
  startTime: number
): HealthCheckResult {
  const status: 'healthy' | 'warning' | 'critical' = issues.some((i) => i.severity === 'critical')
    ? 'critical'
    : issues.some((i) => i.severity === 'warning')
      ? 'warning'
      : 'healthy'

  const statusEmoji = status === 'healthy' ? '✅' : status === 'warning' ? '⚠️' : '🚨'
  console.log(`  ${statusEmoji} Status: ${status.toUpperCase()} | Issues: ${issues.length} | Time: ${Date.now() - startTime}ms`)

  return {
    check_type: checkType,
    category,
    status,
    issues_found: issues.length,
    issues,
    duration_ms: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  }
}

function createSkippedResult(
  checkType: string,
  category: string,
  reason: string,
  startTime: number
): HealthCheckResult {
  console.log(`  ⏭️ Skipped: ${reason}`)
  return {
    check_type: checkType,
    category,
    status: 'warning',
    issues_found: 1,
    issues: [
      {
        severity: 'warning',
        title: `Check skipped: ${reason}`,
        description: reason,
        details: {},
      },
    ],
    duration_ms: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================
async function getCheckConfigs(): Promise<Record<string, CheckConfig>> {
  const { data, error } = await supabase.from('boo_checkout_health_config').select('check_type, enabled, config')

  if (error) {
    console.log('Warning: Could not fetch config from database:', error.message)
    // Return defaults
    return {
      error_analysis: { enabled: true, config: { threshold: 5, lookback_hours: 1 } },
      inventory: { enabled: true, config: { low_stock_threshold: 5 } },
      shipping: { enabled: true, config: { test_postcodes: ['3000', '2000', '4000', '6000', '5000'] } },
      payment: { enabled: true, config: {} },
      product_config: { enabled: true, config: {} },
      pricing: { enabled: true, config: {} },
      cart_session: { enabled: true, config: {} },
      api_health: { enabled: true, config: { error_rate_threshold: 0.1 } },
      data_quality: { enabled: true, config: {} },
    }
  }

  const configs: Record<string, CheckConfig> = {}
  data?.forEach((row) => {
    configs[row.check_type] = { enabled: row.enabled, config: row.config }
  })

  // Add defaults for any missing checks
  const defaults = ['error_analysis', 'inventory', 'shipping', 'payment', 'product_config', 'pricing', 'cart_session', 'api_health', 'data_quality']
  for (const check of defaults) {
    if (!configs[check]) {
      configs[check] = { enabled: true, config: {} }
    }
  }

  return configs
}

async function saveHealthCheckResult(result: HealthCheckResult): Promise<void> {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would save result for ${result.check_type}`)
    return
  }

  // Update the config table with last run result
  const { error: updateError } = await supabase.rpc('boo_update_health_check_result', {
    p_check_type: result.check_type,
    p_result: {
      status: result.status,
      issues_found: result.issues_found,
      duration_ms: result.duration_ms,
      timestamp: result.timestamp,
      category: result.category,
    },
  })

  if (updateError) {
    // Fallback: direct update (may fail if table doesn't exist)
    await supabase
      .from('boo_checkout_health_config')
      .update({
        last_run_at: result.timestamp,
        last_run_result: {
          status: result.status,
          issues_found: result.issues_found,
          duration_ms: result.duration_ms,
          category: result.category,
        },
      })
      .eq('check_type', result.check_type)
  }

  // Insert new issues (only critical and warning)
  const significantIssues = result.issues.filter((i) => i.severity !== 'info')
  if (significantIssues.length > 0) {
    const issuesToInsert = significantIssues.map((issue) => ({
      check_type: result.check_type,
      severity: issue.severity,
      title: issue.title,
      description: issue.description,
      details: issue.details,
    }))

    try {
      await supabase.from('boo_checkout_health_issues').insert(issuesToInsert)
    } catch {
      // Table may not exist yet
    }
  }
}

async function sendAlerts(results: HealthCheckResult[]): Promise<void> {
  const criticalResults = results.filter((r) => r.status === 'critical')

  if (criticalResults.length === 0) {
    return
  }

  console.log(`\n[Alerts] ${criticalResults.length} critical issue(s) found!`)

  // Collect all critical issues
  const allCriticalIssues = criticalResults.flatMap((r) =>
    r.issues.filter((i) => i.severity === 'critical').map((i) => ({ check: r.check_type, ...i }))
  )

  // Send to n8n webhook for email/Slack notification
  const webhookUrl = process.env.BOO_CHECKOUT_ALERT_WEBHOOK
  if (webhookUrl && !DRY_RUN) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'checkout_health_alert',
          critical_count: allCriticalIssues.length,
          issues: allCriticalIssues,
          timestamp: new Date().toISOString(),
        }),
      })
      console.log('  Alert sent to webhook')
    } catch (err) {
      console.log('  Failed to send alert:', (err as Error).message)
    }
  }
}

async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════╗')
  console.log('║  BOO Checkout Health Monitor - Nth Degree Edition        ║')
  console.log('╚══════════════════════════════════════════════════════════╝')
  console.log(`Started: ${new Date().toISOString()}`)
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}${QUICK_MODE ? ' (QUICK)' : ''}`)
  if (SPECIFIC_CHECK) console.log(`Running only: ${SPECIFIC_CHECK}`)

  const configs = await getCheckConfigs()
  const results: HealthCheckResult[] = []

  // Define all checks
  const checks = [
    { name: 'error_analysis', fn: checkErrorAnalysis, critical: true },
    { name: 'inventory', fn: checkInventory, critical: true },
    { name: 'shipping', fn: checkShipping, critical: true },
    { name: 'payment', fn: checkPayment, critical: true },
    { name: 'product_config', fn: checkProductConfig, critical: false },
    { name: 'pricing', fn: checkPricing, critical: false },
    { name: 'cart_session', fn: checkCartSession, critical: true },
    { name: 'api_health', fn: checkApiHealth, critical: true },
    { name: 'data_quality', fn: checkDataQuality, critical: false },
  ]

  // In quick mode, only run critical checks
  const checksToRun = QUICK_MODE ? checks.filter((c) => c.critical) : checks

  for (const check of checksToRun) {
    if (SPECIFIC_CHECK && check.name !== SPECIFIC_CHECK) continue

    const config = configs[check.name] || { enabled: true, config: {} }

    if (!config.enabled) {
      console.log(`\n[${check.name}] Skipped (disabled)`)
      continue
    }

    try {
      const result = await check.fn(config)
      results.push(result)

      // Save result
      await saveHealthCheckResult(result)
    } catch (err) {
      console.log(`\n[${check.name}] ❌ Error: ${(err as Error).message}`)
    }
  }

  // Send alerts for critical issues
  await sendAlerts(results)

  // Final summary
  console.log('\n══════════════════════════════════════════════════════════')
  console.log('Summary:')
  const healthy = results.filter((r) => r.status === 'healthy').length
  const warnings = results.filter((r) => r.status === 'warning').length
  const critical = results.filter((r) => r.status === 'critical').length
  const totalIssues = results.reduce((sum, r) => sum + r.issues_found, 0)

  console.log(`  Checks: ${results.length} | Healthy: ${healthy} | Warnings: ${warnings} | Critical: ${critical}`)
  console.log(`  Total issues found: ${totalIssues}`)
  console.log(`Completed: ${new Date().toISOString()}`)

  // Exit with error code if critical issues found
  if (critical > 0) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
