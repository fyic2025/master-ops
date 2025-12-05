#!/usr/bin/env npx tsx
/**
 * Teelixir - Shopify Inventory Sync
 *
 * Syncs all products, variants, locations, and inventory levels from Shopify to Supabase.
 * This replaces Unleashed as the source of truth for inventory.
 *
 * Usage:
 *   npx tsx teelixir/scripts/sync-shopify-inventory.ts [options]
 *
 * Options:
 *   --full          Full sync (all products, variants, levels)
 *   --products      Sync products only
 *   --levels        Sync inventory levels only
 *   --dry-run       Preview without writing to database
 *
 * Environment Variables Required:
 *   TEELIXIR_SHOPIFY_ACCESS_TOKEN   - Shopify Admin API access token
 *   TEELIXIR_SHOPIFY_SHOP_DOMAIN    - Shop domain (e.g., teelixir-au.myshopify.com)
 *   SUPABASE_URL                    - Supabase URL
 *   SUPABASE_SERVICE_KEY            - Supabase service role key
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config()

// Load credentials from vault
const credsPath = path.join(__dirname, '../../creds.js')
const creds = require(credsPath)

// ============================================================================
// CONFIGURATION
// ============================================================================

const STORE = 'teelixir'
const API_VERSION = '2024-01'
const BATCH_SIZE = 50
const RATE_LIMIT_DELAY = 500 // ms between API calls

interface SyncConfig {
  dryRun: boolean
  syncProducts: boolean
  syncLevels: boolean
  fullSync: boolean
}

interface SyncResult {
  success: boolean
  type: string
  recordsProcessed: number
  recordsCreated: number
  recordsUpdated: number
  recordsFailed: number
  errors: Array<{ error: string; id?: string }>
  duration: number
}

// ============================================================================
// SHOPIFY API CLIENT
// ============================================================================

class ShopifyClient {
  private accessToken: string
  private shopDomain: string
  private baseUrl: string

  constructor() {
    this.accessToken = process.env.TEELIXIR_SHOPIFY_ACCESS_TOKEN || process.env.SHOPIFY_ACCESS_TOKEN || ''
    this.shopDomain = process.env.TEELIXIR_SHOPIFY_SHOP_DOMAIN || process.env.SHOPIFY_SHOP_DOMAIN || 'teelixir-au.myshopify.com'

    if (!this.accessToken) {
      throw new Error('Shopify access token required. Run: node creds.js load teelixir')
    }

    this.baseUrl = `https://${this.shopDomain}/admin/api/${API_VERSION}`
  }

  private async request<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}/${endpoint}`)

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value)
      })
    }

    const response = await fetch(url.toString(), {
      headers: {
        'X-Shopify-Access-Token': this.accessToken,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Shopify API error ${response.status}: ${errorText}`)
    }

    // Rate limit handling
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY))

    return response.json() as T
  }

  async getLocations(): Promise<ShopifyLocation[]> {
    const data = await this.request<{ locations: ShopifyLocation[] }>('locations.json')
    return data.locations
  }

  async getProducts(limit: number = 250, sinceId?: number): Promise<ShopifyProduct[]> {
    const params: Record<string, string> = { limit: String(limit) }
    if (sinceId) params.since_id = String(sinceId)

    const data = await this.request<{ products: ShopifyProduct[] }>('products.json', params)
    return data.products
  }

  async getAllProducts(): Promise<ShopifyProduct[]> {
    const allProducts: ShopifyProduct[] = []
    let sinceId: number | undefined

    while (true) {
      const products = await this.getProducts(250, sinceId)
      if (products.length === 0) break

      allProducts.push(...products)
      sinceId = products[products.length - 1].id
      console.log(`    Fetched ${allProducts.length} products...`)
    }

    return allProducts
  }

  async getInventoryLevels(locationId: number, limit: number = 250): Promise<ShopifyInventoryLevel[]> {
    const params: Record<string, string> = {
      location_ids: String(locationId),
      limit: String(limit),
    }

    const data = await this.request<{ inventory_levels: ShopifyInventoryLevel[] }>('inventory_levels.json', params)
    return data.inventory_levels
  }

  async getAllInventoryLevels(locationIds: number[]): Promise<ShopifyInventoryLevel[]> {
    const allLevels: ShopifyInventoryLevel[] = []

    for (const locationId of locationIds) {
      console.log(`    Fetching levels for location ${locationId}...`)
      const levels = await this.getInventoryLevels(locationId)
      allLevels.push(...levels)
    }

    return allLevels
  }
}

// ============================================================================
// TYPES
// ============================================================================

interface ShopifyLocation {
  id: number
  name: string
  address1: string | null
  address2: string | null
  city: string | null
  province: string | null
  country: string | null
  zip: string | null
  active: boolean
  legacy: boolean
}

interface ShopifyProduct {
  id: number
  title: string
  handle: string
  product_type: string
  vendor: string
  status: string
  tags: string
  created_at: string
  updated_at: string
  published_at: string | null
  image: { src: string } | null
  images: Array<{ src: string }>
  options: Array<{ name: string }>
  variants: ShopifyVariant[]
}

interface ShopifyVariant {
  id: number
  product_id: number
  title: string
  sku: string | null
  barcode: string | null
  price: string
  compare_at_price: string | null
  weight: number
  weight_unit: string
  inventory_item_id: number
  inventory_quantity: number
  inventory_policy: string
  inventory_management: string | null
  option1: string | null
  option2: string | null
  option3: string | null
}

interface ShopifyInventoryLevel {
  inventory_item_id: number
  location_id: number
  available: number | null
  updated_at: string
}

// ============================================================================
// SYNC FUNCTIONS
// ============================================================================

async function syncLocations(
  shopify: ShopifyClient,
  supabase: SupabaseClient,
  config: SyncConfig
): Promise<SyncResult> {
  console.log('\n📍 Syncing Locations...')
  const startTime = Date.now()
  const errors: Array<{ error: string; id?: string }> = []

  try {
    const locations = await shopify.getLocations()
    console.log(`  Found ${locations.length} locations`)

    if (config.dryRun) {
      locations.forEach(loc => console.log(`    - ${loc.name} (${loc.id})`))
      return {
        success: true,
        type: 'locations',
        recordsProcessed: locations.length,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsFailed: 0,
        errors: [],
        duration: Date.now() - startTime,
      }
    }

    const records = locations.map(loc => ({
      store: STORE,
      shopify_location_id: loc.id,
      location_code: loc.name.toLowerCase().replace(/\s+/g, '_'),
      location_name: loc.name,
      location_type: loc.legacy ? 'legacy' : 'warehouse',
      address1: loc.address1,
      city: loc.city,
      province: loc.province,
      country: loc.country || 'AU',
      postcode: loc.zip,
      is_active: loc.active,
    }))

    const { error } = await supabase
      .from('inv_locations')
      .upsert(records, { onConflict: 'shopify_location_id' })

    if (error) {
      errors.push({ error: error.message })
    }

    return {
      success: errors.length === 0,
      type: 'locations',
      recordsProcessed: locations.length,
      recordsCreated: locations.length,
      recordsUpdated: 0,
      recordsFailed: errors.length,
      errors,
      duration: Date.now() - startTime,
    }
  } catch (e) {
    return {
      success: false,
      type: 'locations',
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsFailed: 1,
      errors: [{ error: (e as Error).message }],
      duration: Date.now() - startTime,
    }
  }
}

async function syncProducts(
  shopify: ShopifyClient,
  supabase: SupabaseClient,
  config: SyncConfig
): Promise<SyncResult> {
  console.log('\n📦 Syncing Products & Variants...')
  const startTime = Date.now()
  const errors: Array<{ error: string; id?: string }> = []
  let created = 0
  let updated = 0

  try {
    const products = await shopify.getAllProducts()
    console.log(`  Found ${products.length} products`)

    if (config.dryRun) {
      products.slice(0, 10).forEach(p =>
        console.log(`    - ${p.title} (${p.variants.length} variants)`)
      )
      if (products.length > 10) console.log(`    ... and ${products.length - 10} more`)
      return {
        success: true,
        type: 'products',
        recordsProcessed: products.length,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsFailed: 0,
        errors: [],
        duration: Date.now() - startTime,
      }
    }

    // Process products in batches
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE)
      console.log(`  Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(products.length / BATCH_SIZE)}...`)

      // Upsert products
      const productRecords = batch.map(p => ({
        store: STORE,
        shopify_product_id: p.id,
        product_title: p.title,
        product_handle: p.handle,
        product_type: p.product_type || null,
        vendor: p.vendor || null,
        product_status: p.status,
        product_category: p.product_type || null,
        tags: p.tags ? p.tags.split(', ').filter(Boolean) : [],
        featured_image_url: p.image?.src || p.images?.[0]?.src || null,
        has_variants: p.variants.length > 1,
        option1_name: p.options?.[0]?.name || null,
        option2_name: p.options?.[1]?.name || null,
        option3_name: p.options?.[2]?.name || null,
        total_inventory: p.variants.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0),
        last_synced_at: new Date().toISOString(),
      }))

      const { error: productError } = await supabase
        .from('inv_products')
        .upsert(productRecords, { onConflict: 'store,shopify_product_id' })

      if (productError) {
        errors.push({ error: `Product batch error: ${productError.message}` })
        continue
      }

      // Get product IDs for variants
      const { data: insertedProducts } = await supabase
        .from('inv_products')
        .select('id, shopify_product_id')
        .eq('store', STORE)
        .in('shopify_product_id', batch.map(p => p.id))

      const productIdMap = new Map(
        insertedProducts?.map(p => [p.shopify_product_id, p.id]) || []
      )

      // Upsert variants
      const variantRecords: any[] = []
      for (const product of batch) {
        const productId = productIdMap.get(product.id)
        if (!productId) continue

        for (const variant of product.variants) {
          variantRecords.push({
            product_id: productId,
            store: STORE,
            shopify_variant_id: variant.id,
            shopify_inventory_item_id: variant.inventory_item_id,
            variant_title: variant.title === 'Default Title' ? null : variant.title,
            sku: variant.sku || null,
            barcode: variant.barcode || null,
            option1: variant.option1,
            option2: variant.option2,
            option3: variant.option3,
            price: parseFloat(variant.price) || 0,
            compare_at_price: variant.compare_at_price ? parseFloat(variant.compare_at_price) : null,
            weight: variant.weight,
            weight_unit: variant.weight_unit || 'g',
            inventory_management: variant.inventory_management,
            inventory_policy: variant.inventory_policy,
            total_inventory: variant.inventory_quantity || 0,
            available_inventory: variant.inventory_quantity || 0,
            is_active: true,
            last_synced_at: new Date().toISOString(),
          })
        }
      }

      if (variantRecords.length > 0) {
        const { error: variantError } = await supabase
          .from('inv_variants')
          .upsert(variantRecords, { onConflict: 'store,shopify_variant_id' })

        if (variantError) {
          errors.push({ error: `Variant batch error: ${variantError.message}` })
        } else {
          created += variantRecords.length
        }
      }
    }

    console.log(`  ✅ Synced ${products.length} products, ${created} variants`)

    return {
      success: errors.length === 0,
      type: 'products',
      recordsProcessed: products.length,
      recordsCreated: created,
      recordsUpdated: updated,
      recordsFailed: errors.length,
      errors,
      duration: Date.now() - startTime,
    }
  } catch (e) {
    return {
      success: false,
      type: 'products',
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsFailed: 1,
      errors: [{ error: (e as Error).message }],
      duration: Date.now() - startTime,
    }
  }
}

async function syncInventoryLevels(
  shopify: ShopifyClient,
  supabase: SupabaseClient,
  config: SyncConfig
): Promise<SyncResult> {
  console.log('\n📊 Syncing Inventory Levels...')
  const startTime = Date.now()
  const errors: Array<{ error: string; id?: string }> = []
  let updated = 0

  try {
    // Get locations from DB
    const { data: locations } = await supabase
      .from('inv_locations')
      .select('id, shopify_location_id')
      .eq('store', STORE)
      .eq('is_active', true)

    if (!locations || locations.length === 0) {
      console.log('  No locations found - run location sync first')
      return {
        success: false,
        type: 'levels',
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsFailed: 1,
        errors: [{ error: 'No locations found' }],
        duration: Date.now() - startTime,
      }
    }

    const locationMap = new Map(locations.map(l => [l.shopify_location_id, l.id]))
    const locationIds = locations.map(l => l.shopify_location_id)

    // Get all inventory levels
    const levels = await shopify.getAllInventoryLevels(locationIds)
    console.log(`  Found ${levels.length} inventory levels`)

    if (config.dryRun) {
      console.log(`    Would update ${levels.length} inventory levels`)
      return {
        success: true,
        type: 'levels',
        recordsProcessed: levels.length,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsFailed: 0,
        errors: [],
        duration: Date.now() - startTime,
      }
    }

    // Get variant mapping
    const { data: variants } = await supabase
      .from('inv_variants')
      .select('id, shopify_inventory_item_id')
      .eq('store', STORE)

    const variantMap = new Map(variants?.map(v => [v.shopify_inventory_item_id, v.id]) || [])

    // Prepare level records
    const levelRecords = levels
      .filter(l => variantMap.has(l.inventory_item_id) && locationMap.has(l.location_id))
      .map(l => ({
        variant_id: variantMap.get(l.inventory_item_id),
        location_id: locationMap.get(l.location_id),
        store: STORE,
        shopify_inventory_item_id: l.inventory_item_id,
        shopify_location_id: l.location_id,
        quantity_on_hand: l.available || 0,
        quantity_available: l.available || 0,
        quantity_committed: 0,
        quantity_incoming: 0,
        last_synced_at: new Date().toISOString(),
        sync_source: 'shopify',
      }))

    // Upsert in batches
    for (let i = 0; i < levelRecords.length; i += BATCH_SIZE) {
      const batch = levelRecords.slice(i, i + BATCH_SIZE)

      const { error } = await supabase
        .from('inv_levels')
        .upsert(batch, { onConflict: 'variant_id,location_id' })

      if (error) {
        errors.push({ error: `Level batch error: ${error.message}` })
      } else {
        updated += batch.length
      }
    }

    console.log(`  ✅ Updated ${updated} inventory levels`)

    return {
      success: errors.length === 0,
      type: 'levels',
      recordsProcessed: levels.length,
      recordsCreated: 0,
      recordsUpdated: updated,
      recordsFailed: errors.length,
      errors,
      duration: Date.now() - startTime,
    }
  } catch (e) {
    return {
      success: false,
      type: 'levels',
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsFailed: 1,
      errors: [{ error: (e as Error).message }],
      duration: Date.now() - startTime,
    }
  }
}

// ============================================================================
// SYNC LOG
// ============================================================================

async function logSync(
  supabase: SupabaseClient,
  syncType: string,
  result: SyncResult
): Promise<void> {
  await supabase.from('inv_sync_log').insert({
    store: STORE,
    sync_type: syncType,
    status: result.success ? 'success' : 'failed',
    records_fetched: result.recordsProcessed,
    records_created: result.recordsCreated,
    records_updated: result.recordsUpdated,
    records_failed: result.recordsFailed,
    started_at: new Date(Date.now() - result.duration).toISOString(),
    completed_at: new Date().toISOString(),
    duration_ms: result.duration,
    error_message: result.errors.length > 0 ? result.errors[0].error : null,
    error_details: result.errors.length > 0 ? { errors: result.errors } : null,
  })
}

// ============================================================================
// CLI ARGS
// ============================================================================

function parseArgs(): SyncConfig {
  const args = process.argv.slice(2)

  const config: SyncConfig = {
    dryRun: args.includes('--dry-run'),
    syncProducts: args.includes('--products') || args.includes('--full') || args.length === 0,
    syncLevels: args.includes('--levels') || args.includes('--full') || args.length === 0,
    fullSync: args.includes('--full') || args.length === 0,
  }

  return config
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  Teelixir - Shopify Inventory Sync')
  console.log('  Replacing Unleashed with Shopify as inventory source')
  console.log('═══════════════════════════════════════════════════════════')

  const config = parseArgs()

  if (config.dryRun) {
    console.log('\n🔍 DRY RUN MODE - No data will be written\n')
  }

  // Load credentials
  console.log('🔐 Loading credentials from vault...')
  await creds.load('teelixir')
  await creds.load('global')

  // Initialize Shopify client
  let shopify: ShopifyClient
  try {
    shopify = new ShopifyClient()
    console.log(`📡 Connected to Shopify (${process.env.TEELIXIR_SHOPIFY_SHOP_DOMAIN || 'teelixir-au.myshopify.com'})`)
  } catch (e) {
    console.error(`❌ ${(e as Error).message}`)
    process.exit(1)
  }

  // Initialize Supabase
  const supabaseUrl = process.env.MASTER_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.MASTER_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials!')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  console.log('📦 Connected to Supabase')

  const results: SyncResult[] = []

  // Step 1: Sync locations (always needed)
  const locationResult = await syncLocations(shopify, supabase, config)
  results.push(locationResult)
  if (!config.dryRun) await logSync(supabase, 'locations', locationResult)

  // Step 2: Sync products and variants
  if (config.syncProducts) {
    const productResult = await syncProducts(shopify, supabase, config)
    results.push(productResult)
    if (!config.dryRun) await logSync(supabase, 'products', productResult)
  }

  // Step 3: Sync inventory levels
  if (config.syncLevels) {
    const levelResult = await syncInventoryLevels(shopify, supabase, config)
    results.push(levelResult)
    if (!config.dryRun) await logSync(supabase, 'levels', levelResult)
  }

  // Summary
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)
  const allSuccess = results.every(r => r.success)

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('  SYNC COMPLETE')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`  Status: ${allSuccess ? '✅ SUCCESS' : '❌ FAILED'}`)
  console.log(`  Duration: ${(totalDuration / 1000).toFixed(1)}s`)
  console.log('')

  for (const result of results) {
    const icon = result.success ? '✅' : '❌'
    console.log(`  ${icon} ${result.type}: ${result.recordsProcessed} processed, ${result.recordsCreated + result.recordsUpdated} synced`)
    if (result.errors.length > 0) {
      console.log(`     Errors: ${result.errors.map(e => e.error).join(', ')}`)
    }
  }

  console.log('═══════════════════════════════════════════════════════════\n')

  if (allSuccess) {
    console.log('Next steps:')
    console.log('  1. View inventory in dashboard: https://ops.growthcohq.com/teelixir/inventory')
    console.log('  2. Set up scheduled sync via n8n or cron')
    console.log('')
  }

  process.exit(allSuccess ? 0 : 1)
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
