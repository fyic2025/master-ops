/**
 * Sync BigCommerce Products to Supabase
 *
 * This script:
 * 1. Creates Supabase tables if they don't exist
 * 2. Fetches all products from BigCommerce API
 * 3. Syncs them to Supabase ecommerce_products table
 */

import { createClient } from '@supabase/supabase-js'
import axios from 'axios'

// Configuration
const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'

const BC_STORE_HASH = 'hhhi'
const BC_CLIENT_ID = 'nvmcwck5yr15lob1q911z68d4r6erxy'
const BC_ACCESS_TOKEN = 'd9y2srla3treynpbtmp4f3u1bomdna2'

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// BigCommerce API client
const bcApi = axios.create({
  baseURL: `https://api.bigcommerce.com/stores/${BC_STORE_HASH}/v3`,
  headers: {
    'X-Auth-Token': BC_ACCESS_TOKEN,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

interface BCProduct {
  id: number
  sku: string
  name: string
  type: string
  price: number
  sale_price?: number
  cost_price?: number
  retail_price?: number
  inventory_level?: number
  is_visible?: boolean
  availability?: string
  upc?: string
  gtin?: string
  ean?: string
  mpn?: string
  weight?: number
  width?: number
  height?: number
  depth?: number
  brand_name?: string
  categories?: number[]
  images?: any[]
  custom_fields?: any[]
  description?: string
  page_title?: string
  meta_description?: string
  condition?: string
  sort_order?: number
  bin_picking_number?: string
}

interface BCApiResponse {
  data: BCProduct[]
  meta: {
    pagination: {
      total: number
      count: number
      per_page: number
      current_page: number
      total_pages: number
    }
  }
}

async function checkTablesExist() {
  console.log('📊 Checking if Supabase tables exist...')

  const { data, error } = await supabase
    .from('ecommerce_products')
    .select('id')
    .limit(1)

  if (error) {
    console.error('\n❌ Table ecommerce_products does not exist!')
    console.error('Please run the SQL migrations first:')
    console.error('  1. Go to: https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/sql/new')
    console.error('  2. Run: c:\\Users\\jayso\\master-ops\\buy-organics-online\\supabase-migrations\\001_create_ecommerce_products.sql')
    process.exit(1)
  }

  console.log('✅ Tables exist\n')
}

async function fetchAllBCProducts(): Promise<BCProduct[]> {
  console.log('🛍️  Fetching BigCommerce products...')

  let allProducts: BCProduct[] = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    console.log(`  → Fetching page ${page}/${totalPages}...`)

    try {
      const response = await bcApi.get<BCApiResponse>('/catalog/products', {
        params: {
          include: 'variants,images',
          limit: 250,
          page: page
        }
      })

      const { data, meta } = response.data
      allProducts = allProducts.concat(data)

      totalPages = meta.pagination.total_pages
      console.log(`  ✓ Fetched ${data.length} products (Total: ${allProducts.length}/${meta.pagination.total})`)

      page++

      // Rate limit protection: 20k requests/hour = ~5.5 req/sec
      await new Promise(resolve => setTimeout(resolve, 200))

    } catch (error: any) {
      console.error(`  ❌ Error fetching page ${page}:`, error.message)
      if (error.response?.status === 429) {
        console.log('  ⏳ Rate limited, waiting 60 seconds...')
        await new Promise(resolve => setTimeout(resolve, 60000))
        continue // Retry same page
      }
      throw error
    }
  }

  console.log(`✅ Fetched ${allProducts.length} products total\n`)
  return allProducts
}

function transformBCProduct(product: BCProduct) {
  return {
    product_id: product.id,
    variant_id: null,
    sku: product.sku,
    name: product.name,
    price: parseFloat(String(product.price)) || 0,
    sale_price: product.sale_price ? parseFloat(String(product.sale_price)) : null,
    cost_price: product.cost_price ? parseFloat(String(product.cost_price)) : null,
    retail_price: product.retail_price ? parseFloat(String(product.retail_price)) : null,
    inventory_level: parseInt(String(product.inventory_level || 0)),
    is_visible: product.is_visible ?? true,
    availability: product.availability || 'available',
    barcode: product.upc || product.gtin || product.ean || null,
    gtin: product.gtin || null,
    upc: product.upc || null,
    ean: product.ean || null,
    mpn: product.mpn || null,
    brand: product.brand_name || null,
    weight: product.weight ? parseFloat(String(product.weight)) : null,
    width: product.width ? parseFloat(String(product.width)) : null,
    height: product.height ? parseFloat(String(product.height)) : null,
    depth: product.depth ? parseFloat(String(product.depth)) : null,
    categories: product.categories || [],
    images: product.images || [],
    custom_fields: product.custom_fields || [],
    metadata: {
      type: product.type,
      description: product.description,
      page_title: product.page_title,
      meta_description: product.meta_description,
      condition: product.condition,
      sort_order: product.sort_order,
      bin_picking_number: product.bin_picking_number
    },
    last_synced_at: new Date().toISOString()
  }
}

async function syncProductsToSupabase(products: BCProduct[]) {
  console.log(`💾 Syncing ${products.length} products to Supabase...`)

  // Transform products
  const transformedProducts = products.map(transformBCProduct)

  // Batch insert (Supabase can handle large arrays)
  // But let's do it in chunks of 1000 to be safe
  const BATCH_SIZE = 1000
  let synced = 0
  let errors = 0

  for (let i = 0; i < transformedProducts.length; i += BATCH_SIZE) {
    const batch = transformedProducts.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(transformedProducts.length / BATCH_SIZE)

    console.log(`  → Batch ${batchNum}/${totalBatches} (${batch.length} products)...`)

    try {
      const { data, error } = await supabase
        .from('ecommerce_products')
        .upsert(batch, {
          onConflict: 'sku',
          ignoreDuplicates: false
        })

      if (error) {
        console.error(`  ❌ Batch ${batchNum} error:`, error.message)
        errors += batch.length
      } else {
        synced += batch.length
        console.log(`  ✓ Batch ${batchNum} synced (${synced}/${transformedProducts.length})`)
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100))

    } catch (error: any) {
      console.error(`  ❌ Batch ${batchNum} exception:`, error.message)
      errors += batch.length
    }
  }

  console.log(`\n✅ Sync complete!`)
  console.log(`  ✓ Synced: ${synced} products`)
  if (errors > 0) {
    console.log(`  ❌ Errors: ${errors} products`)
  }
}

async function logAutomation(status: 'running' | 'success' | 'error', details?: any) {
  await supabase.from('automation_logs').insert({
    workflow_name: 'BC → Supabase Product Sync (Script)',
    workflow_type: 'product_sync',
    status,
    records_processed: details?.total || 0,
    records_updated: details?.synced || 0,
    records_failed: details?.errors || 0,
    error_details: details?.error || null,
    started_at: details?.startedAt || new Date().toISOString(),
    completed_at: status !== 'running' ? new Date().toISOString() : null
  })
}

async function main() {
  const startTime = Date.now()

  console.log('🚀 BigCommerce → Supabase Product Sync')
  console.log('=====================================\n')

  try {
    // Log start
    await logAutomation('running', { startedAt: new Date().toISOString() })

    // Step 1: Check tables exist
    await checkTablesExist()

    // Step 2: Fetch products from BC
    const products = await fetchAllBCProducts()

    if (products.length === 0) {
      console.log('⚠️  No products found in BigCommerce')
      return
    }

    // Step 3: Sync to Supabase
    await syncProductsToSupabase(products)

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`\n⏱️  Total time: ${duration}s`)

    // Log success
    await logAutomation('success', {
      total: products.length,
      synced: products.length,
      errors: 0,
      startedAt: new Date(startTime).toISOString()
    })

    // Verify
    console.log('\n🔍 Verifying sync...')
    const { count } = await supabase
      .from('ecommerce_products')
      .select('*', { count: 'exact', head: true })

    console.log(`✅ Supabase now has ${count} products`)

  } catch (error: any) {
    console.error('\n❌ Sync failed:', error.message)

    await logAutomation('error', {
      error: { message: error.message, stack: error.stack }
    })

    process.exit(1)
  }
}

// Run
main()
