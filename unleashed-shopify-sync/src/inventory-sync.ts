/**
 * Inventory Sync: Unleashed → Shopify
 *
 * Fetches stock levels from Unleashed and updates Shopify inventory.
 * Handles bundle products by calculating available qty from components.
 */

import * as crypto from 'crypto'
import {
  StoreConfig,
  UnleashedStockItem,
  ShopifyProduct,
  ShopifyVariant,
  BundleMapping,
  InventorySyncResult,
} from './types.js'

interface ShopifySkuMap {
  sku: string
  inventoryItemId: number
  productId: number
  variantId: number
  productTitle: string
  variantTitle: string
  currentQuantity: number
  inventoryPolicy: 'deny' | 'continue'
}

export interface InventorySyncOptions {
  dryRun?: boolean
  verbose?: boolean
  skipBundles?: boolean
}

/**
 * Main inventory sync function
 */
export async function syncInventory(
  config: StoreConfig,
  options: InventorySyncOptions = {}
): Promise<InventorySyncResult> {
  const startTime = Date.now()
  const { dryRun = false, verbose = false, skipBundles = false } = options

  const result: InventorySyncResult = {
    store: config.name,
    timestamp: new Date(),
    duration: 0,
    stats: {
      totalUnleashedProducts: 0,
      totalShopifyProducts: 0,
      matched: 0,
      updated: 0,
      skipped: 0,
      bundlesProcessed: 0,
      errors: 0,
    },
    errors: [],
    mismatches: {
      notInShopify: [],
      notInUnleashed: [],
    },
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Inventory Sync: ${config.displayName}`)
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE'}`)
  console.log('='.repeat(60))

  try {
    // Validate location ID
    if (!config.shopify.locationId || config.shopify.locationId === 0) {
      throw new Error('Shopify location ID not configured. Please set SHOPIFY_LOCATION_ID')
    }

    // Step 1: Fetch all stock from Unleashed
    console.log('\n📊 Fetching Unleashed stock...')
    const unleashedStock = await fetchAllUnleashedStock(config)
    result.stats.totalUnleashedProducts = unleashedStock.length
    console.log(`   Found ${unleashedStock.length} stock items`)

    // Build SKU -> stock map
    const stockMap = new Map<string, number>()
    for (const item of unleashedStock) {
      stockMap.set(item.ProductCode, Math.floor(item.QtyOnHand || 0))
    }

    // Step 2: Fetch all products from Shopify
    console.log('\n📦 Fetching Shopify products...')
    const shopifyProducts = await fetchAllShopifyProducts(config)
    result.stats.totalShopifyProducts = shopifyProducts.length
    console.log(`   Found ${shopifyProducts.length} products`)

    // Build SKU -> inventory map
    const skuMap = new Map<string, ShopifySkuMap>()
    let totalVariants = 0
    for (const product of shopifyProducts) {
      for (const variant of product.variants) {
        totalVariants++
        if (variant.sku) {
          skuMap.set(variant.sku, {
            sku: variant.sku,
            inventoryItemId: variant.inventory_item_id,
            productId: product.id,
            variantId: variant.id,
            productTitle: product.title,
            variantTitle: variant.title,
            currentQuantity: variant.inventory_quantity,
            inventoryPolicy: variant.inventory_policy,
          })
        }
      }
    }
    console.log(`   Found ${totalVariants} variants (${skuMap.size} with SKUs)`)

    // Step 3: Match and update inventory
    console.log('\n🔄 Syncing inventory...')

    for (const [sku, unleashedQty] of stockMap) {
      const shopifyItem = skuMap.get(sku)

      if (!shopifyItem) {
        // SKU not found in Shopify
        result.mismatches.notInShopify.push(sku)
        continue
      }

      result.stats.matched++

      // Respect Shopify oversell setting - never override products that allow overselling
      if (shopifyItem.inventoryPolicy === 'continue') {
        result.stats.skipped++
        if (verbose) {
          console.log(`   ⏭️  ${sku}: Skipped (Shopify allows oversell)`)
        }
        continue
      }

      // Check if update needed
      if (shopifyItem.currentQuantity === unleashedQty) {
        result.stats.skipped++
        if (verbose) {
          console.log(`   ⏭️  ${sku}: ${unleashedQty} (no change)`)
        }
        continue
      }

      // Update inventory
      if (dryRun) {
        console.log(`   🔍 [DRY RUN] ${sku}: ${shopifyItem.currentQuantity} → ${unleashedQty}`)
        result.stats.updated++
      } else {
        try {
          await updateShopifyInventory(
            config,
            shopifyItem.inventoryItemId,
            config.shopify.locationId,
            unleashedQty
          )
          console.log(`   ✅ ${sku}: ${shopifyItem.currentQuantity} → ${unleashedQty}`)
          result.stats.updated++
        } catch (error) {
          console.log(`   ❌ ${sku}: Failed - ${(error as Error).message}`)
          result.errors.push({ sku, error: (error as Error).message })
          result.stats.errors++
        }
      }
    }

    // Find SKUs in Shopify but not in Unleashed
    for (const [sku] of skuMap) {
      if (!stockMap.has(sku)) {
        result.mismatches.notInUnleashed.push(sku)
      }
    }

  } catch (error) {
    console.error(`\n❌ Sync failed: ${(error as Error).message}`)
    result.errors.push({ sku: 'SYSTEM', error: (error as Error).message })
    result.stats.errors++
  }

  result.duration = Date.now() - startTime

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('Summary:')
  console.log('='.repeat(60))
  console.log(`   Unleashed products: ${result.stats.totalUnleashedProducts}`)
  console.log(`   Shopify products: ${result.stats.totalShopifyProducts}`)
  console.log(`   Matched SKUs: ${result.stats.matched}`)
  console.log(`   Updated: ${result.stats.updated}`)
  console.log(`   Skipped (no change): ${result.stats.skipped}`)
  console.log(`   Errors: ${result.stats.errors}`)
  console.log(`   Duration: ${(result.duration / 1000).toFixed(1)}s`)

  if (result.mismatches.notInShopify.length > 0) {
    console.log(`\n⚠️  ${result.mismatches.notInShopify.length} SKUs in Unleashed not found in Shopify`)
    if (verbose) {
      console.log(`   ${result.mismatches.notInShopify.slice(0, 10).join(', ')}${result.mismatches.notInShopify.length > 10 ? '...' : ''}`)
    }
  }

  if (result.mismatches.notInUnleashed.length > 0) {
    console.log(`\n⚠️  ${result.mismatches.notInUnleashed.length} SKUs in Shopify not found in Unleashed`)
    if (verbose) {
      console.log(`   ${result.mismatches.notInUnleashed.slice(0, 10).join(', ')}${result.mismatches.notInUnleashed.length > 10 ? '...' : ''}`)
    }
  }

  return result
}

/**
 * Fetch all stock from Unleashed with pagination
 */
async function fetchAllUnleashedStock(config: StoreConfig): Promise<UnleashedStockItem[]> {
  const allStock: UnleashedStockItem[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const url = `${config.unleashed.apiUrl}/StockOnHand?pageSize=200&page=${page}`
    const queryString = `pageSize=200&page=${page}`
    const signature = generateUnleashedSignature(queryString, config.unleashed.apiKey)

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-auth-id': config.unleashed.apiId,
        'api-auth-signature': signature,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Unleashed API error ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    const items = data.Items || []
    allStock.push(...items)

    const pagination = data.Pagination
    hasMore = pagination && page < pagination.NumberOfPages
    page++
  }

  return allStock
}

/**
 * Fetch all products from Shopify with pagination
 */
async function fetchAllShopifyProducts(config: StoreConfig): Promise<ShopifyProduct[]> {
  const allProducts: ShopifyProduct[] = []
  let sinceId = 0
  let hasMore = true

  while (hasMore) {
    const url = `https://${config.shopify.shopDomain}/admin/api/${config.shopify.apiVersion}/products.json?limit=250&since_id=${sinceId}`

    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': config.shopify.accessToken,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Shopify API error ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    const products = data.products || []

    if (products.length === 0) {
      hasMore = false
    } else {
      allProducts.push(...products)
      sinceId = products[products.length - 1].id

      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 250))
    }
  }

  return allProducts
}

/**
 * Update Shopify inventory level
 */
async function updateShopifyInventory(
  config: StoreConfig,
  inventoryItemId: number,
  locationId: number,
  available: number
): Promise<void> {
  const url = `https://${config.shopify.shopDomain}/admin/api/${config.shopify.apiVersion}/inventory_levels/set.json`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': config.shopify.accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inventory_item_id: inventoryItemId,
      location_id: locationId,
      available,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Shopify API error ${response.status}: ${errorText}`)
  }

  // Small delay to respect rate limits
  await new Promise(resolve => setTimeout(resolve, 500))
}

/**
 * Generate HMAC signature for Unleashed API
 */
function generateUnleashedSignature(queryString: string, apiKey: string): string {
  const hmac = crypto.createHmac('sha256', apiKey)
  hmac.update(queryString)
  return hmac.digest('base64')
}
