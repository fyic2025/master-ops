#!/usr/bin/env npx tsx
/**
 * Teelixir - Shopify Product Variants Sync
 *
 * Syncs Shopify products and variants to Supabase for upsell pricing lookups.
 * Used by anniversary emails to find upsell products and calculate savings.
 *
 * Usage:
 *   npx tsx teelixir/scripts/sync-shopify-variants.ts [options]
 *
 * Options:
 *   --dry-run       Preview without writing to database
 *   --verbose       Show detailed progress
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Parse command line arguments
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const VERBOSE = args.includes('--verbose')

// Constants
const SHOPIFY_DOMAIN = 'teelixir-au.myshopify.com'
const SHOPIFY_API_VERSION = '2024-01'
const BATCH_SIZE = 250
const SUPABASE_URL = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co'

// Load credentials
const creds = require('../../creds')

interface ShopifyProduct {
  id: number
  title: string
  handle: string
  vendor: string
  product_type: string
  status: string
  images: Array<{
    id: number
    src: string
    position: number
  }>
  variants: Array<{
    id: number
    product_id: number
    title: string
    price: string
    compare_at_price: string | null
    sku: string
    inventory_quantity: number
    inventory_management: string | null
    image_id: number | null
  }>
}

interface VariantRecord {
  shopify_product_id: number
  shopify_variant_id: number
  product_title: string
  product_handle: string
  product_type: string
  variant_title: string
  size_grams: number | null
  size_unit: string
  price: number
  compare_at_price: number | null
  image_url: string | null
  inventory_quantity: number
  is_available: boolean
}

interface SyncStats {
  productsProcessed: number
  variantsCreated: number
  variantsUpdated: number
  variantsSkipped: number
  errors: number
}

// Product type classification
function classifyProductType(title: string): string {
  const t = (title || '').toLowerCase()

  // Lions Mane
  if ((t.includes('lions mane') || t.includes("lion's mane") || t.includes('lion mane')) && t.includes('pure')) return 'Lions Mane Pure'
  if (t.includes('lions mane') || t.includes("lion's mane") || t.includes('lion mane')) return 'Lions Mane'

  // Ashwagandha
  if ((t.includes('ashwa') || t.includes('ashwagan')) && t.includes('pure')) return 'Ashwagandha Pure'
  if (t.includes('ashwa') || t.includes('ashwagan')) return 'Ashwagandha'

  // Reishi
  if (t.includes('reishi') && t.includes('pure')) return 'Reishi Pure'
  if (t.includes('reishi')) return 'Reishi'

  // Chaga
  if (t.includes('chaga') && t.includes('pure')) return 'Chaga Pure'
  if (t.includes('chaga')) return 'Chaga'

  // Cordyceps
  if (t.includes('cordyceps') && t.includes('pure')) return 'Cordyceps Pure'
  if (t.includes('cordyceps')) return 'Cordyceps'

  // Other mushrooms
  if (t.includes('tremella')) return 'Tremella'
  if (t.includes('maitake')) return 'Maitake'
  if (t.includes('shiitake')) return 'Shiitake'
  if (t.includes('turkey tail')) return 'Turkey Tail'
  if (t.includes('pearl')) return 'Pearl'

  // Immunity
  if (t.includes('immun')) return 'Immunity'

  // Cans
  if (t.includes('sparkling') && t.includes('elixir')) return 'Cans'

  // Lattes
  if (t.includes('cacao') && (t.includes('latte') || t.includes('blend'))) return 'Latte - Cacao Rose'
  if (t.includes('turmeric') && (t.includes('latte') || t.includes('blend'))) return 'Latte - Turmeric'
  if (t.includes('beet') && (t.includes('latte') || t.includes('blend'))) return 'Latte - Beet'
  if (t.includes('matcha') && (t.includes('latte') || t.includes('blend'))) return 'Latte - Matcha'
  if (t.includes('latte')) return 'Latte'

  // Japanese Matcha
  if (t.includes('japanese matcha')) return 'Japanese Matcha'

  // Body blends
  if (t.includes('body build')) return 'Body Build'
  if (t.includes('body repair')) return 'Body Repair'

  // Supplements
  if (t.includes('siberian ginseng')) return 'Siberian Ginseng'
  if (t.includes('bee pollen')) return 'Bee Pollen'
  if (t.includes('fulvic')) return 'Fulvic Acid'
  if (t.includes('resveratrol')) return 'Resveratrol'
  if (t.includes('schizandra') || t.includes('schisandra')) return 'Schizandra'
  if (t.includes('red pine') || t.includes('pine needle')) return 'Red Pine Needle'
  if (t.includes('camu camu')) return 'Camu Camu'
  if (t.includes('spirulina')) return 'Spirulina'
  if (t.includes('stress less') && !t.includes('bundle')) return 'Stress Less'
  if (t.includes('maca')) return 'Maca'
  if (t.includes('shilajit')) return 'Shilajit'
  if (t.includes('he shou wu') || t.includes('fo-ti')) return 'He Shou Wu'
  if (t.includes('astragalus')) return 'Astragalus'
  if (t.includes('goji')) return 'Goji'
  if (t.includes('eucommia')) return 'Eucommia'
  if (t.includes('gynostemma')) return 'Gynostemma'
  if (t.includes('mucuna')) return 'Mucuna'
  if (t.includes('rhodiola')) return 'Rhodiola'
  if (t.includes('tocos')) return 'Tocos'
  if (t.includes('deer antler') || t.includes('velvet antler')) return 'Deer Antler'
  if (t.includes('pine pollen')) return 'Pine Pollen'
  if (t.includes('beauty') || t.includes('skin') || t.includes('glow')) return 'Beauty'

  // Capsules
  if (t.includes('capsule')) return 'Capsules'

  // Gift cards
  if (t.includes('gift card') || t.includes('gift voucher')) return 'Gift Card'

  // Bundles
  if (t.includes('bundle') || t.includes('pack') || t.includes('starter')) return 'Bundle'

  return 'Other'
}

// Parse size from variant title
function parseSize(variantTitle: string | null): { grams: number | null; unit: string } {
  if (!variantTitle) return { grams: null, unit: 'g' }

  const title = variantTitle.toLowerCase()

  // Check for kg first
  const kgMatch = title.match(/(\d+(?:\.\d+)?)\s*kg/)
  if (kgMatch) {
    return { grams: Math.round(parseFloat(kgMatch[1]) * 1000), unit: 'g' }
  }

  // Check for grams
  const gMatch = title.match(/(\d+)\s*g(?:rams?)?/)
  if (gMatch) {
    return { grams: parseInt(gMatch[1]), unit: 'g' }
  }

  // Check for capsules/caps
  const capsMatch = title.match(/(\d+)\s*(?:caps?|capsules?)/)
  if (capsMatch) {
    return { grams: parseInt(capsMatch[1]), unit: 'caps' }
  }

  return { grams: null, unit: 'g' }
}

// Shopify API request helper
async function shopifyRequest(
  accessToken: string,
  path: string,
  params: Record<string, any> = {}
): Promise<any> {
  const url = new URL(`https://${SHOPIFY_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}${path}`)

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value))
    }
  })

  const response = await fetch(url.toString(), {
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
  })

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After')
    const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 2000
    console.log(`Rate limited, waiting ${waitTime}ms...`)
    await new Promise(resolve => setTimeout(resolve, waitTime))
    return shopifyRequest(accessToken, path, params)
  }

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

// Get all products with pagination
async function* getAllProducts(accessToken: string): AsyncGenerator<ShopifyProduct> {
  let pageInfo: string | null = null
  let hasNextPage = true

  while (hasNextPage) {
    const params: Record<string, any> = {
      limit: BATCH_SIZE,
      status: 'active',
      fields: 'id,title,handle,vendor,product_type,status,images,variants'
    }

    if (pageInfo) {
      params.page_info = pageInfo
    }

    const response = await shopifyRequest(accessToken, '/products.json', params)

    for (const product of response.products || []) {
      yield product
    }

    // Check for next page via Link header (Shopify uses cursor pagination)
    // For simplicity, we'll check if we got a full page
    hasNextPage = (response.products || []).length === BATCH_SIZE
    if (hasNextPage && response.products.length > 0) {
      // Fetch next page by created_at
      const lastProduct = response.products[response.products.length - 1]
      pageInfo = null // Reset and use since_id instead
      params.since_id = lastProduct.id
    } else {
      hasNextPage = false
    }
  }
}

// Main sync function
async function syncVariants(): Promise<SyncStats> {
  const stats: SyncStats = {
    productsProcessed: 0,
    variantsCreated: 0,
    variantsUpdated: 0,
    variantsSkipped: 0,
    errors: 0
  }

  console.log('\n═'.repeat(60))
  console.log('  TEELIXIR SHOPIFY VARIANTS SYNC')
  console.log('═'.repeat(60))

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be made\n')
  }

  // Load credentials
  console.log('🔐 Loading credentials...')
  const shopifyToken = await creds.get('teelixir', 'shopify_access_token')
  const supabaseKey = await creds.get('global', 'master_supabase_service_role_key')

  if (!shopifyToken) {
    throw new Error('Missing Teelixir Shopify access token')
  }
  if (!supabaseKey) {
    throw new Error('Missing Supabase service role key')
  }

  const supabase = createClient(SUPABASE_URL, supabaseKey)

  // Fetch all products
  console.log('\n📦 Fetching products from Shopify...')

  const variantsToUpsert: VariantRecord[] = []

  for await (const product of getAllProducts(shopifyToken)) {
    stats.productsProcessed++

    // Skip gift cards and bundles for upsell
    const productType = classifyProductType(product.title)
    if (productType === 'Gift Card') {
      if (VERBOSE) console.log(`   Skipping gift card: ${product.title}`)
      continue
    }

    // Get primary image
    const primaryImage = product.images?.find(img => img.position === 1) || product.images?.[0]
    const imageUrl = primaryImage?.src || null

    // Process each variant
    for (const variant of product.variants || []) {
      const { grams, unit } = parseSize(variant.title)

      // Skip variants without size (likely bundles or special items)
      if (grams === null && productType !== 'Capsules') {
        stats.variantsSkipped++
        if (VERBOSE) console.log(`   Skipping variant without size: ${product.title} - ${variant.title}`)
        continue
      }

      const variantRecord: VariantRecord = {
        shopify_product_id: product.id,
        shopify_variant_id: variant.id,
        product_title: product.title,
        product_handle: product.handle,
        product_type: productType,
        variant_title: variant.title,
        size_grams: grams,
        size_unit: unit,
        price: parseFloat(variant.price),
        compare_at_price: variant.compare_at_price ? parseFloat(variant.compare_at_price) : null,
        image_url: imageUrl,
        inventory_quantity: variant.inventory_quantity || 0,
        is_available: variant.inventory_quantity > 0 || variant.inventory_management === null
      }

      variantsToUpsert.push(variantRecord)

      if (VERBOSE) {
        console.log(`   ${product.title} - ${variant.title}: ${grams}${unit} @ $${variant.price}`)
      }
    }

    if (stats.productsProcessed % 50 === 0) {
      console.log(`   Processed ${stats.productsProcessed} products...`)
    }
  }

  console.log(`\n📊 Found ${variantsToUpsert.length} variants to sync`)

  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN - Would upsert:')

    // Group by product type
    const byType = new Map<string, number>()
    for (const v of variantsToUpsert) {
      byType.set(v.product_type, (byType.get(v.product_type) || 0) + 1)
    }

    for (const [type, count] of Array.from(byType.entries()).sort((a, b) => b[1] - a[1])) {
      console.log(`   ${type}: ${count} variants`)
    }

    stats.variantsCreated = variantsToUpsert.length
    return stats
  }

  // Upsert to Supabase in batches
  console.log('\n💾 Upserting to Supabase...')

  const UPSERT_BATCH = 100
  for (let i = 0; i < variantsToUpsert.length; i += UPSERT_BATCH) {
    const batch = variantsToUpsert.slice(i, i + UPSERT_BATCH)

    const { data, error } = await supabase
      .from('tlx_shopify_variants')
      .upsert(batch.map(v => ({
        ...v,
        last_synced_at: new Date().toISOString()
      })), {
        onConflict: 'shopify_variant_id'
      })
      .select('id')

    if (error) {
      console.error(`   Error upserting batch: ${error.message}`)
      stats.errors++
    } else {
      stats.variantsCreated += batch.length
      process.stdout.write(`\r   Upserted ${Math.min(i + UPSERT_BATCH, variantsToUpsert.length)}/${variantsToUpsert.length}...`)
    }
  }

  console.log('')

  // Update job status
  await supabase
    .from('dashboard_job_status')
    .update({
      status: 'healthy',
      last_run_at: new Date().toISOString(),
      last_success_at: new Date().toISOString(),
      error_message: null
    })
    .eq('job_name', 'shopify-variants-sync')

  return stats
}

// Main entry point
async function main() {
  const startTime = Date.now()

  try {
    const stats = await syncVariants()

    const duration = Math.round((Date.now() - startTime) / 1000)

    console.log('\n' + '═'.repeat(60))
    console.log('  SYNC COMPLETE')
    console.log('═'.repeat(60))
    console.log(`  Products processed: ${stats.productsProcessed}`)
    console.log(`  Variants synced:    ${stats.variantsCreated}`)
    console.log(`  Variants skipped:   ${stats.variantsSkipped}`)
    console.log(`  Errors:             ${stats.errors}`)
    console.log(`  Duration:           ${duration}s`)
    console.log('═'.repeat(60))

    process.exit(stats.errors > 0 ? 1 : 0)

  } catch (error: any) {
    console.error('\n❌ Sync failed:', error.message)
    process.exit(1)
  }
}

main().catch(console.error)
