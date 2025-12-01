#!/usr/bin/env npx tsx
/**
 * Direct BigCommerce to Supabase Product Sync
 * Syncs all BOO BigCommerce products to Supabase ecommerce_products table
 * Logs to automation_logs for dashboard tracking
 */

import 'dotenv/config'

const BC_STORE_HASH = 'hhhi'
const BC_ACCESS_TOKEN = 'eeikmonznnsxcq4f24m9d6uvv1e0qjn'
const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'

const WORKFLOW_NAME = 'BC → Supabase Product Sync (Script)'

async function logStart(): Promise<string | null> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/automation_logs`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        workflow_name: WORKFLOW_NAME,
        workflow_type: 'product_sync',
        status: 'running',
        started_at: new Date().toISOString()
      })
    })
    if (!response.ok) return null
    const data = await response.json()
    return data[0]?.id || null
  } catch {
    return null
  }
}

async function logComplete(logId: string | null, totalProducts: number, success: boolean, error?: string): Promise<void> {
  if (!logId) return
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/automation_logs?id=eq.${logId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: success ? 'success' : 'error',
        records_processed: totalProducts,
        records_updated: totalProducts,
        completed_at: new Date().toISOString(),
        error_details: error ? { message: error } : null
      })
    })
  } catch {
    // Ignore logging errors
  }
}

interface Product {
  sku: string
  product_id: number
  name: string
  price: number
  sale_price: number | null
  cost_price: number | null
  inventory_level: number
  is_visible: boolean
  availability: string
  barcode: string | null
  brand: string | null
  weight: number | null
  categories: number[]
  images: string[]
  last_synced_at: string
}

async function fetchPage(page: number): Promise<{ products: any[], hasMore: boolean, total: number }> {
  const url = `https://api.bigcommerce.com/stores/${BC_STORE_HASH}/v3/catalog/products?include=variants,images&limit=250&page=${page}`

  const response = await fetch(url, {
    headers: {
      'X-Auth-Token': BC_ACCESS_TOKEN,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`BigCommerce API error: ${response.status}`)
  }

  const data = await response.json()
  const pagination = data.meta?.pagination || {}

  return {
    products: data.data || [],
    hasMore: pagination.current_page < pagination.total_pages,
    total: pagination.total || 0
  }
}

function transformProduct(p: any): Product {
  return {
    sku: p.sku || `BC-${p.id}`,
    product_id: p.id,
    name: p.name,
    price: parseFloat(p.price) || 0,
    sale_price: p.sale_price ? parseFloat(p.sale_price) : null,
    cost_price: p.cost_price ? parseFloat(p.cost_price) : null,
    inventory_level: parseInt(p.inventory_level) || 0,
    is_visible: p.is_visible !== false,
    availability: p.availability || 'available',
    barcode: p.upc || p.gtin || p.ean || null,
    brand: p.brand_name || null,
    weight: p.weight ? parseFloat(p.weight) : null,
    categories: p.categories || [],
    images: (p.images || []).map((img: any) => img.url_standard || img.url_thumbnail),
    last_synced_at: new Date().toISOString()
  }
}

async function upsertToSupabase(products: Product[]): Promise<void> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/ecommerce_products?on_conflict=sku`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(products)
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Supabase upsert failed: ${response.status} - ${error}`)
  }
}

async function sync() {
  console.log('=== BOO BigCommerce Product Sync ===\n')
  const startTime = Date.now()

  // Log start to automation_logs
  const logId = await logStart()
  if (logId) {
    console.log(`Logging to automation_logs (id: ${logId})`)
  }

  let page = 1
  let totalProducts = 0
  let hasMore = true

  try {
    while (hasMore) {
      console.log(`Fetching page ${page}...`)
      const { products, hasMore: more, total } = await fetchPage(page)

      if (products.length === 0) break

      console.log(`  Transforming ${products.length} products...`)
      const transformed = products.map(transformProduct)

      console.log(`  Upserting to Supabase...`)
      await upsertToSupabase(transformed)

      totalProducts += products.length
      hasMore = more
      page++

      console.log(`  Progress: ${totalProducts}/${total} products synced`)
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1)

    console.log('\n=== Sync Complete ===')
    console.log(`Total products: ${totalProducts}`)
    console.log(`Pages processed: ${page - 1}`)
    console.log(`Duration: ${duration}s`)
    console.log(`Time: ${new Date().toISOString()}`)

    // Log success
    await logComplete(logId, totalProducts, true)
    console.log('Logged success to automation_logs')
  } catch (err: any) {
    // Log failure
    await logComplete(logId, totalProducts, false, err.message)
    throw err
  }
}

sync().catch(err => {
  console.error('Sync failed:', err)
  process.exit(1)
})
