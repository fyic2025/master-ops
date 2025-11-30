#!/usr/bin/env npx tsx
/**
 * Teelixir - Unleashed Products Sync
 *
 * Syncs all products from Unleashed to Supabase for distributor intelligence.
 * This is Step 1 of the data foundation - get all SKUs and product names.
 *
 * Usage:
 *   npx tsx teelixir/scripts/sync-teelixir-products.ts [options]
 *
 * Options:
 *   --full          Full sync (all products)
 *   --dry-run       Preview without writing to database
 *
 * Environment Variables Required:
 *   UNLEASHED_TEELIXIR_API_ID      - Teelixir Unleashed API ID
 *   UNLEASHED_TEELIXIR_API_KEY     - Teelixir Unleashed API Key
 *   SUPABASE_URL                   - Supabase URL (main hub)
 *   SUPABASE_SERVICE_KEY           - Supabase service role key
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as crypto from 'crypto'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config()

// Load credentials from vault
const credsPath = path.join(__dirname, '../../creds.js')
const creds = require(credsPath)

// ============================================================================
// CONFIGURATION
// ============================================================================

const BATCH_SIZE = 50
const PAGE_SIZE = 200  // Unleashed max is 200
const MIN_DELAY_MS = 200  // Rate limit safety

interface SyncConfig {
  dryRun: boolean
  fullSync: boolean
}

interface SyncResult {
  success: boolean
  recordsProcessed: number
  recordsCreated: number
  recordsUpdated: number
  recordsFailed: number
  errors: Array<{ error: string; productCode?: string }>
  duration: number
}

// ============================================================================
// UNLEASHED API CLIENT (Teelixir-specific)
// ============================================================================

class TeelixirUnleashedClient {
  private apiId: string
  private apiKey: string
  private baseUrl: string = 'https://api.unleashedsoftware.com'

  constructor() {
    // Try multiple env var naming conventions
    this.apiId = process.env.TEELIXIR_UNLEASHED_API_ID || process.env.UNLEASHED_TEELIXIR_API_ID || ''
    this.apiKey = process.env.TEELIXIR_UNLEASHED_API_KEY || process.env.UNLEASHED_TEELIXIR_API_KEY || ''

    if (!this.apiId || !this.apiKey) {
      throw new Error(
        'Teelixir Unleashed credentials required. Run: node creds.js load teelixir'
      )
    }
  }

  private generateSignature(queryString: string): string {
    const hmac = crypto.createHmac('sha256', this.apiKey)
    hmac.update(queryString)
    return hmac.digest('base64')
  }

  private async request<T>(path: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(path, this.baseUrl)

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    const queryString = url.search.substring(1)  // Remove leading '?'
    const signature = this.generateSignature(queryString)

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-auth-id': this.apiId,
        'api-auth-signature': signature,
      },
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`Unleashed API error: ${response.status} - ${errorBody}`)
    }

    return response.json()
  }

  async listProducts(page: number = 1): Promise<{
    Items: UnleashedProduct[]
    Pagination: { NumberOfItems: number; PageSize: number; PageNumber: number; NumberOfPages: number }
  }> {
    // Unleashed requires page number in URL path, not query params
    return this.request(`/Products/${page}`, {
      pageSize: PAGE_SIZE,
    })
  }

  async listAllProducts(): Promise<UnleashedProduct[]> {
    const allProducts: UnleashedProduct[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      console.log(`    Fetching page ${page}...`)
      const response = await this.listProducts(page)

      allProducts.push(...response.Items)

      hasMore = page < response.Pagination.NumberOfPages
      page++

      // Rate limit safety
      if (hasMore) {
        await sleep(MIN_DELAY_MS)
      }
    }

    return allProducts
  }
}

// Extended product interface with all fields we care about
interface UnleashedProduct {
  Guid: string
  ProductCode: string
  ProductDescription: string
  ProductGroup?: {
    GroupName?: string
    Guid?: string
  }
  UnitOfMeasure?: {
    Name?: string
  }
  DefaultSellPrice?: number
  DefaultPurchasePrice?: number
  AverageLandPrice?: number
  LastCost?: number
  Barcode?: string
  IsSellable?: boolean
  IsObsolete?: boolean
  AvailableQty?: number
  NeverDiminishing?: boolean
  CreatedOn?: string
  LastModifiedOn?: string
}

// ============================================================================
// PARSE CLI ARGUMENTS
// ============================================================================

function parseArgs(): SyncConfig {
  const args = process.argv.slice(2)

  return {
    dryRun: args.includes('--dry-run'),
    fullSync: args.includes('--full') || true,  // Default to full for products
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Try to parse size information from product name
 * e.g., "Lions Mane 100g" -> { size_value: 100, size_unit: 'g' }
 */
function parseSizeFromName(productName: string): {
  size_value: number | null
  size_unit: string | null
  variant_type: string | null
} {
  // Match patterns like "50g", "100ml", "60 capsules", "250g"
  const sizeMatch = productName.match(/(\d+(?:\.\d+)?)\s*(g|kg|ml|l|caps?|capsules?)/i)

  let size_value: number | null = null
  let size_unit: string | null = null

  if (sizeMatch) {
    size_value = parseFloat(sizeMatch[1])
    size_unit = sizeMatch[2].toLowerCase()
    // Normalize unit
    if (size_unit === 'cap' || size_unit === 'caps' || size_unit === 'capsule') {
      size_unit = 'capsules'
    }
  }

  // Detect variant type
  let variant_type: string | null = null
  const nameLower = productName.toLowerCase()
  if (nameLower.includes('capsule') || nameLower.includes('caps')) {
    variant_type = 'capsule'
  } else if (nameLower.includes('tincture') || nameLower.includes('extract') && nameLower.includes('liquid')) {
    variant_type = 'tincture'
  } else if (nameLower.includes('powder') || size_unit === 'g' || size_unit === 'kg') {
    variant_type = 'powder'
  } else {
    variant_type = 'extract'
  }

  return { size_value, size_unit, variant_type }
}

// ============================================================================
// SYNC FUNCTIONS
// ============================================================================

async function syncProducts(
  unleashed: TeelixirUnleashedClient,
  supabase: SupabaseClient,
  config: SyncConfig
): Promise<SyncResult> {
  console.log('\n📦 Syncing Teelixir Products from Unleashed...')
  const startTime = Date.now()
  const errors: Array<{ error: string; productCode?: string }> = []
  let created = 0
  let updated = 0

  try {
    // Fetch all products
    console.log('  Fetching products from Unleashed...')
    const products = await unleashed.listAllProducts()
    console.log(`  ✓ Found ${products.length} products`)

    if (config.dryRun) {
      console.log('\n  [DRY RUN] Would sync these products:')
      products.slice(0, 10).forEach(p =>
        console.log(`    - ${p.ProductCode}: ${p.ProductDescription}`)
      )
      if (products.length > 10) console.log(`    ... and ${products.length - 10} more`)

      return {
        success: true,
        recordsProcessed: products.length,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsFailed: 0,
        errors: [],
        duration: Date.now() - startTime,
      }
    }

    // Transform and upsert in batches
    console.log('\n  Upserting to Supabase...')

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE)
      console.log(`    Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(products.length / BATCH_SIZE)}...`)

      const records = batch.map(product => {
        const { size_value, size_unit, variant_type } = parseSizeFromName(product.ProductDescription || '')

        return {
          unleashed_guid: product.Guid,
          product_code: product.ProductCode,
          product_name: product.ProductDescription || product.ProductCode,
          product_description: product.ProductDescription,

          // Size parsing
          size_value,
          size_unit,
          variant_type,

          // Pricing
          wholesale_price: product.DefaultSellPrice || null,
          cost_price: product.LastCost || product.DefaultPurchasePrice || null,

          // Status
          is_active: product.IsSellable !== false,
          is_sellable: product.IsSellable !== false,
          is_discontinued: product.IsObsolete === true,

          // Stock
          stock_on_hand: product.AvailableQty || 0,

          // Sync tracking
          last_synced_at: new Date().toISOString(),
          metadata: {
            unleashed_product_group: product.ProductGroup?.GroupName,
            unleashed_product_group_guid: product.ProductGroup?.Guid,
            unit_of_measure: product.UnitOfMeasure?.Name,
            barcode: product.Barcode,
            never_diminishing: product.NeverDiminishing,
            average_land_price: product.AverageLandPrice,
          },
        }
      })

      const { data, error } = await supabase
        .from('tlx_products')
        .upsert(records, {
          onConflict: 'product_code',
          ignoreDuplicates: false,
        })
        .select('id')

      if (error) {
        errors.push({ error: `Batch upsert failed: ${error.message}` })
        console.error(`    ❌ Batch failed: ${error.message}`)
      } else {
        updated += batch.length
      }
    }

    console.log(`\n  ✅ Products synced: ${updated} upserted, ${errors.length} errors`)

    return {
      success: errors.length === 0,
      recordsProcessed: products.length,
      recordsCreated: created,
      recordsUpdated: updated,
      recordsFailed: errors.length,
      errors,
      duration: Date.now() - startTime,
    }
  } catch (e) {
    const error = e as Error
    console.error(`\n  ❌ Products sync failed: ${error.message}`)
    return {
      success: false,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsFailed: 1,
      errors: [{ error: error.message }],
      duration: Date.now() - startTime,
    }
  }
}

// ============================================================================
// SYNC LOG
// ============================================================================

async function logSyncStart(supabase: SupabaseClient, syncType: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('tlx_sync_log')
    .insert({
      sync_type: syncType,
      status: 'started',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    console.error(`Failed to create sync log: ${error.message}`)
    return null
  }

  return data.id
}

async function logSyncComplete(
  supabase: SupabaseClient,
  logId: string,
  result: SyncResult
): Promise<void> {
  const { error } = await supabase
    .from('tlx_sync_log')
    .update({
      status: result.success ? 'success' : 'failed',
      completed_at: new Date().toISOString(),
      duration_ms: result.duration,
      records_fetched: result.recordsProcessed,
      records_created: result.recordsCreated,
      records_updated: result.recordsUpdated,
      records_failed: result.recordsFailed,
      error_message: result.errors.length > 0 ? result.errors[0].error : null,
      error_details: result.errors.length > 0 ? { errors: result.errors } : null,
    })
    .eq('id', logId)

  if (error) {
    console.error(`Failed to update sync log: ${error.message}`)
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  Teelixir - Unleashed Products Sync')
  console.log('═══════════════════════════════════════════════════════════')

  const config = parseArgs()

  if (config.dryRun) {
    console.log('\n🔍 DRY RUN MODE - No data will be written\n')
  }

  // Load credentials from vault
  console.log('🔐 Loading credentials from vault...')
  await creds.load('teelixir')
  await creds.load('global')

  // Initialize Unleashed client
  let unleashed: TeelixirUnleashedClient
  try {
    unleashed = new TeelixirUnleashedClient()
    console.log('📡 Connected to Teelixir Unleashed API')
  } catch (e) {
    console.error(`❌ ${(e as Error).message}`)
    process.exit(1)
  }

  // Initialize Supabase
  const supabaseUrl = process.env.MASTER_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.MASTER_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials!')
    console.error('   Set SUPABASE_URL and SUPABASE_SERVICE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  console.log('📦 Connected to Supabase')

  // Run sync
  const logId = config.dryRun ? null : await logSyncStart(supabase, 'products')
  const result = await syncProducts(unleashed, supabase, config)
  if (logId) await logSyncComplete(supabase, logId, result)

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('  SYNC COMPLETE')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`  Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`)
  console.log(`  Duration: ${(result.duration / 1000).toFixed(1)}s`)
  console.log(`  Products Processed: ${result.recordsProcessed}`)
  console.log(`  Products Upserted: ${result.recordsUpdated}`)
  console.log(`  Errors: ${result.recordsFailed}`)
  console.log('═══════════════════════════════════════════════════════════\n')

  if (result.success) {
    console.log('Next steps:')
    console.log('  1. Review products in Supabase: SELECT * FROM tlx_products ORDER BY product_name')
    console.log('  2. Run distributor orders sync: npx tsx teelixir/scripts/sync-distributor-orders.ts')
    console.log('')
  }

  process.exit(result.success ? 0 : 1)
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
