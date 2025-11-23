/**
 * Sync Oborne Supplier Data to Supabase
 *
 * Note: This script currently reads from a local CSV file.
 * TODO: Add IMAP email fetching to download the latest CSV from kylie@buyorganicsonline.com.au
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import csv from 'csv-parser'

const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'

const CSV_FILE_PATH = './oborne_new.csv'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface OborneProduct {
  Name: string // SKU from supplier
  'Display Name': string
  Brand: string
  'W/S ex gst': string // Cost price
  RRP: string
  Barcode: string
  Availability: string // 'In Stock', 'Out of Stock'
  'To Be Discontinued': string // 'Yes', 'No'
  'GST Status': string // 'GST applies', etc
  size?: string
}

async function parseCsv(filePath: string): Promise<OborneProduct[]> {
  return new Promise((resolve, reject) => {
    const results: OborneProduct[] = []

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject)
  })
}

function transformOborneProduct(product: OborneProduct) {
  const isGSTApplies = product['GST Status'] === 'GST applies'
  const costPrice = parseFloat(product['W/S ex gst']) || 0
  const rrp = parseFloat(product.RRP) || 0

  // Calculate stock level based on availability
  let stockLevel = 0
  if (product.Availability === 'In Stock' && product['To Be Discontinued'] === 'No') {
    stockLevel = 1000 // Large number to indicate in stock
  }

  return {
    supplier_name: 'Oborne',
    supplier_sku: product.Name,
    barcode: product.Barcode || null,
    product_name: product['Display Name'] || product.Name,
    brand: product.Brand || null,
    cost_price: costPrice,
    rrp: rrp,
    stock_level: stockLevel,
    moq: null, // Oborne doesn't use MOQ
    cartononly: null,
    metadata: {
      availability: product.Availability,
      to_be_discontinued: product['To Be Discontinued'],
      gst_status: product['GST Status'],
      size: product.size || null
    }
  }
}

async function syncOborneToSupabase() {
  console.log('🚀 Oborne → Supabase Supplier Sync')
  console.log('===================================\n')

  try {
    // Check if CSV file exists
    if (!fs.existsSync(CSV_FILE_PATH)) {
      console.error(`❌ CSV file not found: ${CSV_FILE_PATH}`)
      console.log('\nPlease download the latest Oborne CSV file to this location.')
      console.log('Or implement IMAP email fetching to download it automatically.\n')
      process.exit(1)
    }

    // Parse CSV
    console.log(`📄 Parsing CSV file: ${CSV_FILE_PATH}`)
    const oborneProducts = await parseCsv(CSV_FILE_PATH)
    console.log(`✅ Parsed ${oborneProducts.length} products\n`)

    // Transform products
    console.log('🔄 Transforming product data...')
    const transformedProducts = oborneProducts.map(transformOborneProduct)
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
      workflow_name: 'Oborne → Supabase Supplier Sync',
      workflow_type: 'supplier_sync',
      status: errors === 0 ? 'success' : 'error',
      records_processed: oborneProducts.length,
      records_updated: synced,
      records_failed: errors,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('\n❌ Sync failed:', error.message)

    await supabase.from('automation_logs').insert({
      workflow_name: 'Oborne → Supabase Supplier Sync',
      workflow_type: 'supplier_sync',
      status: 'error',
      error_details: { message: error.message, stack: error.stack },
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    })

    process.exit(1)
  }
}

syncOborneToSupabase()
