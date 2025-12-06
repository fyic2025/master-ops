/**
 * Sync Kadac Supplier Data to Supabase
 *
 * Fetches CSV from Kadac API and syncs to supplier_products table
 */

import { createClient } from '@supabase/supabase-js'
import axios from 'axios'
import csv from 'csv-parser'
import { Readable } from 'stream'

const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'

// TODO: Get actual Kadac API URL from the user
const KADAC_CSV_URL = process.env.KADAC_CSV_URL || 'https://remote.kadac.com.au/customers/products.asp?uid=d83f42d2f1224d94856ea35c4323a94d&format=csv'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface KadacProduct {
  sku: string
  description: string
  brand: string
  barcode: string
  size: string
  wholesale: string // Cost price
  rrp: string
  stockstatus: string // 'available', 'outofstock', 'deleted', 'discontinued'
  gst: string // 'Y' or 'N'
  imageurl?: string
}

async function fetchKadacCsv(): Promise<KadacProduct[]> {
  console.log(`🌐 Fetching CSV from: ${KADAC_CSV_URL}`)

  const response = await axios.get(KADAC_CSV_URL, {
    responseType: 'text'
  })

  return new Promise((resolve, reject) => {
    const results: KadacProduct[] = []
    const stream = Readable.from(response.data)

    stream
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject)
  })
}

function transformKadacProduct(product: KadacProduct) {
  const costPrice = parseFloat(product.wholesale) || 0
  const rrp = parseFloat(product.rrp) || 0

  // Calculate stock level based on stock status
  let stockLevel = 0
  if (product.stockstatus === 'available') {
    stockLevel = 1000
  }

  return {
    supplier_name: 'Kadac',
    supplier_sku: product.sku,
    barcode: product.barcode || null,
    product_name: product.description,
    brand: product.brand || null,
    cost_price: costPrice,
    rrp: rrp,
    stock_level: stockLevel,
    moq: null,
    cartononly: null,
    metadata: {
      stockstatus: product.stockstatus,
      gst: product.gst,
      size: product.size,
      imageurl: product.imageurl || null
    }
  }
}

async function syncKadacToSupabase() {
  console.log('🚀 Kadac → Supabase Supplier Sync')
  console.log('==================================\n')

  try {
    // Fetch CSV from Kadac
    const kadacProducts = await fetchKadacCsv()
    console.log(`✅ Fetched ${kadacProducts.length} products\n`)

    // Filter out specific SKUs (as per original code)
    const filtered = kadacProducts.filter(p => p.sku !== '471174')
    console.log(`📊 After filtering: ${filtered.length} products\n`)

    // Transform products
    console.log('🔄 Transforming product data...')
    const transformedProducts = filtered.map(transformKadacProduct)
    console.log(`✅ Transformed ${transformedProducts.length} products\n`)

    // Batch upsert to Supabase
    console.log('💾 Syncing to Supabase...')
    const BATCH_SIZE = 500
    let synced = 0
    let errors = 0

    for (let i = 0; i < transformedProducts.length; i += BATCH_SIZE) {
      const batch = transformedProducts.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(transformedProducts.length / BATCH_SIZE)

      console.log(`  → Batch ${batchNum}/${totalBatches} (${batch.length} products)...`)

      const { data, error } = await supabase
        .from('supplier_products')
        .upsert(batch, {
          onConflict: 'supplier_name,supplier_sku',
          ignoreDuplicates: false
        })

      if (error) {
        console.error(`  ❌ Batch ${batchNum} error:`, error.message)
        errors += batch.length
      } else {
        synced += batch.length
        console.log(`  ✓ Batch ${batchNum} synced (${synced}/${transformedProducts.length})`)
      }
    }

    console.log(`\n✅ Sync complete!`)
    console.log(`  ✓ Synced: ${synced} products`)
    if (errors > 0) {
      console.log(`  ❌ Errors: ${errors} products`)
    }

    // Log to automation_logs
    await supabase.from('automation_logs').insert({
      workflow_name: 'Kadac → Supabase Supplier Sync',
      workflow_type: 'supplier_sync',
      status: errors === 0 ? 'success' : 'error',
      records_processed: kadacProducts.length,
      records_updated: synced,
      records_failed: errors,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('\n❌ Sync failed:', error.message)

    await supabase.from('automation_logs').insert({
      workflow_name: 'Kadac → Supabase Supplier Sync',
      workflow_type: 'supplier_sync',
      status: 'error',
      error_details: { message: error.message, stack: error.stack },
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    })

    process.exit(1)
  }
}

syncKadacToSupabase()
