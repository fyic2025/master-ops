import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes

// Lazy init Supabase
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface StoreConfig {
  name: string
  shopify: {
    shopDomain: string
    accessToken: string
    locationId: number
  }
  unleashed: {
    apiId: string
    apiKey: string
    apiUrl: string
  }
}

// Get store config from environment
function getStoreConfig(store: string): StoreConfig | null {
  if (store === 'teelixir') {
    return {
      name: 'teelixir',
      shopify: {
        shopDomain: process.env.TEELIXIR_SHOPIFY_STORE_URL || '',
        accessToken: process.env.TEELIXIR_SHOPIFY_ACCESS_TOKEN || '',
        locationId: parseInt(process.env.TEELIXIR_SHOPIFY_LOCATION_ID || '78624784659'),
      },
      unleashed: {
        apiId: process.env.TEELIXIR_UNLEASHED_API_ID || '',
        apiKey: process.env.TEELIXIR_UNLEASHED_API_KEY || '',
        apiUrl: 'https://api.unleashedsoftware.com',
      },
    }
  }
  if (store === 'elevate') {
    return {
      name: 'elevate',
      shopify: {
        shopDomain: process.env.ELEVATE_SHOPIFY_STORE_URL || '',
        accessToken: process.env.ELEVATE_SHOPIFY_ACCESS_TOKEN || '',
        locationId: parseInt(process.env.ELEVATE_SHOPIFY_LOCATION_ID || '69425791219'),
      },
      unleashed: {
        apiId: process.env.ELEVATE_UNLEASHED_API_ID || '',
        apiKey: process.env.ELEVATE_UNLEASHED_API_KEY || '',
        apiUrl: 'https://api.unleashedsoftware.com',
      },
    }
  }
  return null
}

// Generate HMAC signature for Unleashed
function generateUnleashedSignature(queryString: string, apiKey: string): string {
  const hmac = crypto.createHmac('sha256', apiKey)
  hmac.update(queryString)
  return hmac.digest('base64')
}

// Fetch stock from Unleashed
async function fetchUnleashedStock(config: StoreConfig) {
  const allStock: any[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const queryString = `pageSize=200&page=${page}`
    const signature = generateUnleashedSignature(queryString, config.unleashed.apiKey)

    const response = await fetch(`${config.unleashed.apiUrl}/StockOnHand?${queryString}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-auth-id': config.unleashed.apiId,
        'api-auth-signature': signature,
      },
    })

    if (!response.ok) {
      throw new Error(`Unleashed API error: ${response.status}`)
    }

    const data = await response.json()
    allStock.push(...(data.Items || []))

    const pagination = data.Pagination
    hasMore = pagination && page < pagination.NumberOfPages
    page++
  }

  return allStock
}

// Fetch products from Shopify
async function fetchShopifyProducts(config: StoreConfig) {
  const allProducts: any[] = []
  let sinceId = 0
  let hasMore = true

  while (hasMore) {
    const response = await fetch(
      `https://${config.shopify.shopDomain}/admin/api/2024-01/products.json?limit=250&since_id=${sinceId}`,
      {
        headers: {
          'X-Shopify-Access-Token': config.shopify.accessToken,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status}`)
    }

    const data = await response.json()
    const products = data.products || []

    if (products.length === 0) {
      hasMore = false
    } else {
      allProducts.push(...products)
      sinceId = products[products.length - 1].id
      await new Promise(r => setTimeout(r, 250))
    }
  }

  return allProducts
}

// Update Shopify inventory
async function updateShopifyInventory(
  config: StoreConfig,
  inventoryItemId: number,
  quantity: number
) {
  const response = await fetch(
    `https://${config.shopify.shopDomain}/admin/api/2024-01/inventory_levels/set.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': config.shopify.accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inventory_item_id: inventoryItemId,
        location_id: config.shopify.locationId,
        available: quantity,
      }),
    }
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Shopify API error ${response.status}: ${text}`)
  }

  await new Promise(r => setTimeout(r, 500))
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const supabase = getSupabase()

  try {
    const body = await request.json().catch(() => ({}))
    const store = body.store || 'teelixir'
    const dryRun = body.dryRun === true

    const config = getStoreConfig(store)
    if (!config) {
      return NextResponse.json({ error: `Unknown store: ${store}` }, { status: 400 })
    }

    if (!config.shopify.accessToken || !config.unleashed.apiKey) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 500 })
    }

    console.log(`Starting inventory sync for ${store} (dryRun: ${dryRun})`)

    // Fetch data from both systems
    const [unleashedStock, shopifyProducts] = await Promise.all([
      fetchUnleashedStock(config),
      fetchShopifyProducts(config),
    ])

    // Build maps
    const stockMap = new Map<string, number>()
    for (const item of unleashedStock) {
      stockMap.set(item.ProductCode, Math.floor(item.QtyOnHand || 0))
    }

    const skuMap = new Map<string, any>()
    for (const product of shopifyProducts) {
      for (const variant of product.variants || []) {
        if (variant.sku) {
          skuMap.set(variant.sku, {
            inventoryItemId: variant.inventory_item_id,
            currentQuantity: variant.inventory_quantity,
            inventoryPolicy: variant.inventory_policy,
          })
        }
      }
    }

    // Sync inventory
    let matched = 0, updated = 0, skipped = 0, errors = 0
    const errorDetails: string[] = []

    for (const [sku, unleashedQty] of stockMap) {
      const shopifyItem = skuMap.get(sku)
      if (!shopifyItem) continue

      matched++

      // Respect Shopify oversell setting
      if (shopifyItem.inventoryPolicy === 'continue') {
        skipped++
        continue
      }

      // No change needed
      if (shopifyItem.currentQuantity === unleashedQty) {
        skipped++
        continue
      }

      if (dryRun) {
        updated++
        continue
      }

      try {
        await updateShopifyInventory(config, shopifyItem.inventoryItemId, unleashedQty)
        updated++
      } catch (err: any) {
        errors++
        errorDetails.push(`${sku}: ${err.message}`)
      }
    }

    const duration = Date.now() - startTime

    // Log to Supabase
    try {
      await supabase.from('cron_job_logs').insert({
        job_id: `${store}-unleashed-inventory-sync`,
        business: store,
        status: errors > 0 ? 'partial' : 'success',
        items_processed: matched,
        items_updated: updated,
        items_skipped: skipped,
        errors: errors,
        error_details: errorDetails.length > 0 ? errorDetails.slice(0, 10) : null,
        duration_ms: duration,
        dry_run: dryRun,
      })
    } catch (logError) {
      console.error('Failed to log to Supabase:', logError)
    }

    return NextResponse.json({
      success: true,
      store,
      dryRun,
      stats: {
        unleashedProducts: unleashedStock.length,
        shopifyProducts: shopifyProducts.length,
        matched,
        updated,
        skipped,
        errors,
      },
      duration,
    })

  } catch (error: any) {
    console.error('Inventory sync error:', error)

    // Log error
    try {
      await supabase.from('cron_job_logs').insert({
        job_id: 'unleashed-inventory-sync',
        status: 'error',
        error_details: [error.message],
        duration_ms: Date.now() - startTime,
      })
    } catch (logError) {
      console.error('Failed to log error to Supabase:', logError)
    }

    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Allow GET for simple health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    job: 'unleashed-inventory-sync',
    description: 'Syncs Unleashed stock to Shopify',
  })
}
