/**
 * Sync BigCommerce Products to Supabase - Version 2 (Complete Fields)
 *
 * This enhanced script:
 * 1. Fetches ALL product attributes from BigCommerce API
 * 2. Includes all sub-resources: variants, images, custom_fields, videos, options, modifiers, bulk_pricing_rules
 * 3. Maps all fields to dedicated Supabase columns (not metadata JSONB)
 * 4. Supports the expanded schema from migration 005
 */

import { createClient } from '@supabase/supabase-js'
import axios from 'axios'

// Configuration - Load from environment or use defaults
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://usibnysqelovfuctmkqw.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'

const BC_STORE_HASH = process.env.BC_STORE_HASH || 'hhhi'
const BC_ACCESS_TOKEN = process.env.BC_ACCESS_TOKEN || 'd9y2srla3treynpbtmp4f3u1bomdna2'

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const bcApi = axios.create({
  baseURL: `https://api.bigcommerce.com/stores/${BC_STORE_HASH}/v3`,
  headers: {
    'X-Auth-Token': BC_ACCESS_TOKEN,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

// Complete BigCommerce Product Interface with ALL fields
interface BCProduct {
  // Core fields
  id: number
  name: string
  type: 'physical' | 'digital'
  sku: string
  description?: string

  // Pricing
  price: number
  cost_price?: number
  retail_price?: number
  sale_price?: number
  map_price?: number
  calculated_price?: number
  is_price_hidden?: boolean
  price_hidden_label?: string

  // Tax
  tax_class_id?: number
  product_tax_code?: string

  // Dimensions & Weight
  weight?: number
  width?: number
  depth?: number
  height?: number

  // Inventory
  inventory_level?: number
  inventory_warning_level?: number
  inventory_tracking?: 'none' | 'product' | 'variant'

  // Identifiers
  upc?: string
  gtin?: string
  mpn?: string

  // Availability
  availability?: 'available' | 'disabled' | 'preorder'
  availability_description?: string
  is_visible?: boolean

  // Preorder
  is_preorder_only?: boolean
  preorder_release_date?: string
  preorder_message?: string

  // Shipping
  is_free_shipping?: boolean
  fixed_cost_shipping_price?: number

  // Order limits
  order_quantity_minimum?: number
  order_quantity_maximum?: number

  // Display & Organization
  sort_order?: number
  is_featured?: boolean
  condition?: 'New' | 'Used' | 'Refurbished'
  is_condition_shown?: boolean
  layout_file?: string

  // Brand
  brand_id?: number
  brand_name?: string

  // Categories
  categories?: number[]

  // Related products
  related_products?: number[]
  warranty?: string

  // Gift wrapping
  gift_wrapping_options_type?: string
  gift_wrapping_options_list?: number[]

  // SEO
  page_title?: string
  meta_keywords?: string[]
  meta_description?: string
  search_keywords?: string

  // Open Graph
  open_graph_type?: string
  open_graph_title?: string
  open_graph_description?: string
  open_graph_use_meta_description?: boolean
  open_graph_use_product_name?: boolean
  open_graph_use_image?: boolean

  // Custom URL
  custom_url?: {
    url?: string
    is_customized?: boolean
  }

  // Statistics
  view_count?: number
  reviews_rating_sum?: number
  reviews_count?: number
  total_sold?: number

  // Variants & Options
  base_variant_id?: number

  // Warehouse/bin
  bin_picking_number?: string

  // Dates
  date_created?: string
  date_modified?: string

  // Sub-resources (included via ?include= parameter)
  images?: BCImage[]
  videos?: BCVideo[]
  custom_fields?: BCCustomField[]
  bulk_pricing_rules?: BCBulkPricingRule[]
  options?: BCOption[]
  modifiers?: BCModifier[]
  variants?: BCVariant[]
}

interface BCImage {
  id: number
  product_id: number
  is_thumbnail: boolean
  sort_order: number
  description?: string
  image_file?: string
  url_zoom?: string
  url_standard?: string
  url_thumbnail?: string
  url_tiny?: string
  date_modified?: string
}

interface BCVideo {
  id: number
  product_id: number
  sort_order: number
  title?: string
  description?: string
  video_id?: string
  type?: string
}

interface BCCustomField {
  id: number
  name: string
  value: string
}

interface BCBulkPricingRule {
  id: number
  quantity_min: number
  quantity_max: number
  type: 'price' | 'percent' | 'fixed'
  amount: number
}

interface BCOption {
  id: number
  product_id: number
  display_name: string
  type: string
  sort_order: number
  option_values?: any[]
}

interface BCModifier {
  id: number
  product_id: number
  name: string
  display_name: string
  type: string
  required: boolean
  sort_order: number
  config?: any
  option_values?: any[]
}

interface BCVariant {
  id: number
  product_id: number
  sku: string
  sku_id?: number
  price?: number
  calculated_price?: number
  sale_price?: number
  retail_price?: number
  map_price?: number
  weight?: number
  width?: number
  height?: number
  depth?: number
  is_free_shipping?: boolean
  fixed_cost_shipping_price?: number
  purchasing_disabled?: boolean
  purchasing_disabled_message?: string
  upc?: string
  gtin?: string
  mpn?: string
  inventory_level?: number
  inventory_warning_level?: number
  bin_picking_number?: string
  image_url?: string
  cost_price?: number
  option_values?: any[]
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

// Helper functions
function parseNumber(value: any): number | null {
  if (value === undefined || value === null || value === '') return null
  const num = parseFloat(String(value))
  return isNaN(num) ? null : num
}

function parseInt_(value: any): number | null {
  if (value === undefined || value === null || value === '') return null
  const num = parseInt(String(value), 10)
  return isNaN(num) ? null : num
}

function parseDate(value: any): string | null {
  if (!value) return null
  try {
    return new Date(value).toISOString()
  } catch {
    return null
  }
}

async function checkTablesExist() {
  console.log('Checking if Supabase tables exist...')

  const { error } = await supabase
    .from('ecommerce_products')
    .select('id')
    .limit(1)

  if (error) {
    console.error('\nTable ecommerce_products does not exist!')
    console.error('Please run the SQL migrations first:')
    console.error('  1. Go to: https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/sql/new')
    console.error('  2. Run migrations 001 through 005')
    process.exit(1)
  }

  console.log('Tables exist\n')
}

async function fetchAllBCProducts(): Promise<BCProduct[]> {
  console.log('Fetching BigCommerce products with ALL sub-resources...')

  let allProducts: BCProduct[] = []
  let page = 1
  let totalPages = 1

  // Include ALL sub-resources in one request
  const includeParams = [
    'variants',
    'images',
    'custom_fields',
    'bulk_pricing_rules',
    'options',
    'modifiers',
    'videos'
  ].join(',')

  while (page <= totalPages) {
    console.log(`  Fetching page ${page}/${totalPages}...`)

    try {
      const response = await bcApi.get<BCApiResponse>('/catalog/products', {
        params: {
          include: includeParams,
          limit: 100, // Reduced limit due to larger payload with all sub-resources
          page: page
        }
      })

      const { data, meta } = response.data
      allProducts = allProducts.concat(data)

      totalPages = meta.pagination.total_pages
      console.log(`  Fetched ${data.length} products (Total: ${allProducts.length}/${meta.pagination.total})`)

      page++

      // Rate limit protection
      await new Promise(resolve => setTimeout(resolve, 300))

    } catch (error: any) {
      console.error(`  Error fetching page ${page}:`, error.message)
      if (error.response?.status === 429) {
        console.log('  Rate limited, waiting 60 seconds...')
        await new Promise(resolve => setTimeout(resolve, 60000))
        continue
      }
      throw error
    }
  }

  console.log(`Fetched ${allProducts.length} products total\n`)
  return allProducts
}

function transformBCProduct(product: BCProduct) {
  // Transform to match expanded Supabase schema
  return {
    // Core identifiers
    product_id: product.id,
    variant_id: null,
    sku: product.sku,
    name: product.name,

    // Product type & description - NOW DEDICATED COLUMNS
    type: product.type || 'physical',
    description: product.description || null,
    condition: product.condition || 'New',
    is_condition_shown: product.is_condition_shown ?? false,

    // Pricing - ALL DEDICATED COLUMNS
    price: parseNumber(product.price) || 0,
    sale_price: parseNumber(product.sale_price),
    cost_price: parseNumber(product.cost_price),
    retail_price: parseNumber(product.retail_price),
    map_price: parseNumber(product.map_price),
    calculated_price: parseNumber(product.calculated_price),
    is_price_hidden: product.is_price_hidden ?? false,
    price_hidden_label: product.price_hidden_label || null,

    // Tax
    tax_class_id: parseInt_(product.tax_class_id),
    product_tax_code: product.product_tax_code || null,

    // Inventory
    inventory_level: parseInt_(product.inventory_level) ?? 0,
    inventory_tracking: product.inventory_tracking || 'product',
    inventory_warning_level: parseInt_(product.inventory_warning_level) ?? 0,

    // Visibility & Availability
    is_visible: product.is_visible ?? true,
    availability: product.availability || 'available',
    availability_description: product.availability_description || null,

    // Preorder
    is_preorder_only: product.is_preorder_only ?? false,
    preorder_release_date: parseDate(product.preorder_release_date),
    preorder_message: product.preorder_message || null,

    // Identifiers
    barcode: product.upc || product.gtin || null,
    gtin: product.gtin || null,
    upc: product.upc || null,
    ean: null, // BC doesn't have EAN, but we keep the field
    mpn: product.mpn || null,

    // Brand
    brand: product.brand_name || null,
    brand_id: parseInt_(product.brand_id),

    // Dimensions
    weight: parseNumber(product.weight),
    width: parseNumber(product.width),
    height: parseNumber(product.height),
    depth: parseNumber(product.depth),

    // Shipping
    is_free_shipping: product.is_free_shipping ?? false,
    fixed_cost_shipping_price: parseNumber(product.fixed_cost_shipping_price),

    // Order limits
    order_quantity_minimum: parseInt_(product.order_quantity_minimum) ?? 1,
    order_quantity_maximum: parseInt_(product.order_quantity_maximum) ?? 0,

    // Display
    sort_order: parseInt_(product.sort_order) ?? 0,
    is_featured: product.is_featured ?? false,
    layout_file: product.layout_file || null,

    // Related & Warranty
    related_products: product.related_products || [],
    warranty: product.warranty || null,

    // Gift wrapping
    gift_wrapping_options_type: product.gift_wrapping_options_type || null,
    gift_wrapping_options_list: product.gift_wrapping_options_list || [],

    // SEO - NOW DEDICATED COLUMNS
    page_title: product.page_title || null,
    meta_description: product.meta_description || null,
    meta_keywords: product.meta_keywords || [],
    search_keywords: product.search_keywords || null,

    // Open Graph
    open_graph_type: product.open_graph_type || 'product',
    open_graph_title: product.open_graph_title || null,
    open_graph_description: product.open_graph_description || null,
    open_graph_use_meta_description: product.open_graph_use_meta_description ?? true,
    open_graph_use_product_name: product.open_graph_use_product_name ?? true,
    open_graph_use_image: product.open_graph_use_image ?? true,

    // Custom URL
    custom_url: product.custom_url || null,

    // Statistics
    view_count: parseInt_(product.view_count) ?? 0,
    reviews_rating_sum: parseNumber(product.reviews_rating_sum) ?? 0,
    reviews_count: parseInt_(product.reviews_count) ?? 0,
    total_sold: parseInt_(product.total_sold) ?? 0,

    // Base variant
    base_variant_id: parseInt_(product.base_variant_id),

    // Categories (array of IDs)
    categories: product.categories || [],

    // Sub-resources as JSONB
    images: product.images || [],
    videos: product.videos || [],
    custom_fields: product.custom_fields || [],
    bulk_pricing_rules: product.bulk_pricing_rules || [],
    options: product.options || [],
    modifiers: product.modifiers || [],
    variants: product.variants || [],

    // BigCommerce dates
    bc_date_created: parseDate(product.date_created),
    bc_date_modified: parseDate(product.date_modified),

    // Metadata for any remaining fields not in schema
    metadata: {
      bin_picking_number: product.bin_picking_number || null
    },

    // Sync timestamp
    last_synced_at: new Date().toISOString()
  }
}

async function syncProductsToSupabase(products: BCProduct[]) {
  console.log(`Syncing ${products.length} products to Supabase...`)

  const transformedProducts = products.map(transformBCProduct)

  // Smaller batch size due to larger payload
  const BATCH_SIZE = 500
  let synced = 0
  let errors = 0

  for (let i = 0; i < transformedProducts.length; i += BATCH_SIZE) {
    const batch = transformedProducts.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(transformedProducts.length / BATCH_SIZE)

    console.log(`  Batch ${batchNum}/${totalBatches} (${batch.length} products)...`)

    try {
      const { error } = await supabase
        .from('ecommerce_products')
        .upsert(batch, {
          onConflict: 'sku',
          ignoreDuplicates: false
        })

      if (error) {
        console.error(`  Batch ${batchNum} error:`, error.message)
        // Try to identify problematic products
        if (error.message.includes('violates')) {
          console.error('  Constraint violation - some products may have duplicate SKUs or invalid data')
        }
        errors += batch.length
      } else {
        synced += batch.length
        console.log(`  Batch ${batchNum} synced (${synced}/${transformedProducts.length})`)
      }

      await new Promise(resolve => setTimeout(resolve, 100))

    } catch (error: any) {
      console.error(`  Batch ${batchNum} exception:`, error.message)
      errors += batch.length
    }
  }

  console.log(`\nSync complete!`)
  console.log(`  Synced: ${synced} products`)
  if (errors > 0) {
    console.log(`  Errors: ${errors} products`)
  }

  return { synced, errors }
}

async function logAutomation(status: 'running' | 'success' | 'error', details?: any) {
  try {
    await supabase.from('automation_logs').insert({
      workflow_name: 'BC -> Supabase Product Sync v2 (Complete)',
      workflow_type: 'product_sync',
      status,
      records_processed: details?.total || 0,
      records_updated: details?.synced || 0,
      records_failed: details?.errors || 0,
      error_details: details?.error || null,
      started_at: details?.startedAt || new Date().toISOString(),
      completed_at: status !== 'running' ? new Date().toISOString() : null
    })
  } catch (e) {
    console.log('Note: Could not log to automation_logs table')
  }
}

async function main() {
  const startTime = Date.now()

  console.log('==========================================')
  console.log('BigCommerce -> Supabase Product Sync v2')
  console.log('(Complete Product Attributes)')
  console.log('==========================================\n')

  try {
    await logAutomation('running', { startedAt: new Date().toISOString() })

    // Step 1: Check tables exist
    await checkTablesExist()

    // Step 2: Fetch products from BC with ALL sub-resources
    const products = await fetchAllBCProducts()

    if (products.length === 0) {
      console.log('No products found in BigCommerce')
      return
    }

    // Step 3: Sync to Supabase
    const result = await syncProductsToSupabase(products)

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`\nTotal time: ${duration}s`)

    await logAutomation('success', {
      total: products.length,
      synced: result.synced,
      errors: result.errors,
      startedAt: new Date(startTime).toISOString()
    })

    // Verify
    console.log('\nVerifying sync...')
    const { count } = await supabase
      .from('ecommerce_products')
      .select('*', { count: 'exact', head: true })

    console.log(`Supabase now has ${count} products with complete attributes`)

  } catch (error: any) {
    console.error('\nSync failed:', error.message)

    await logAutomation('error', {
      error: { message: error.message, stack: error.stack }
    })

    process.exit(1)
  }
}

// Run
main()
