/**
 * Sync Oborne Supplier Data to Supabase (FTP Method)
 *
 * Downloads product and inventory data from CH2 (Oborne's parent company) via FTP
 * CH2 provides direct FTP access to Oborne's product catalog and stock levels
 */

import { createClient } from '@supabase/supabase-js'
import * as ftp from 'basic-ftp'
import * as fs from 'fs'
import * as path from 'path'
import csv from 'csv-parser'

const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'

// FTP credentials for CH2 (Oborne's parent company)
const FTP_CONFIG = {
  host: 'ftp3.ch2.net.au',
  user: 'retail_310',
  password: 'am2SH6wWevAY&#+Q'
}

const DOWNLOAD_DIR = path.resolve('download-files')

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface OborneProduct {
  id: string
  name: string
  brandid: string
  brand: string
  weight: string
  upccode: string
  baseprice: string
  rrp: string
  oborne_id: string
  oborne_sku: string
  taxschedule: string
  obsolete: string
}

interface OborneInventory {
  id: string
  branch: string
  availablequantity: string
}

async function downloadFTPFiles(): Promise<{ products: string; inventory: string }> {
  console.log('📡 Connecting to CH2 FTP server...')

  // Ensure download directory exists
  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true })
  }

  const inventoryFilePath = path.join(DOWNLOAD_DIR, 'ob-inventory-ftp.csv')
  const productsFilePath = path.join(DOWNLOAD_DIR, 'ob-products-ftp.csv')

  const client = new ftp.Client()
  client.ftp.verbose = false

  try {
    await client.access(FTP_CONFIG)
    console.log('  ✓ Connected to FTP')

    console.log('📥 Downloading inventory.csv...')
    await client.downloadTo(inventoryFilePath, 'prod_retail_310/inventory.csv')
    console.log('  ✓ Inventory downloaded')

    console.log('📥 Downloading products.csv...')
    await client.downloadTo(productsFilePath, 'prod_retail_product/products.csv')
    console.log('  ✓ Products downloaded')

  } catch (err: any) {
    throw new Error(`FTP download failed: ${err.message}`)
  } finally {
    client.close()
  }

  return {
    products: productsFilePath,
    inventory: inventoryFilePath
  }
}

async function parsePipedCSV<T>(filePath: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const results: T[] = []

    fs.createReadStream(filePath)
      .pipe(csv({ separator: '|' })) // Pipe-delimited CSV
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject)
  })
}

async function fetchOborneData(): Promise<any[]> {
  // Download files from FTP
  const files = await downloadFTPFiles()

  console.log('\n🔄 Parsing CSV files...')
  const products = await parsePipedCSV<OborneProduct>(files.products)
  const inventory = await parsePipedCSV<OborneInventory>(files.inventory)

  console.log(`  ✓ Parsed ${products.length} products`)
  console.log(`  ✓ Parsed ${inventory.length} inventory records\n`)

  // Join products with inventory by ID
  const finalData = products.map((product) => {
    const stock = inventory.find((inv) => inv.id === product.id)
    const availableQuantity = parseInt(stock?.availablequantity || '0', 10)

    return {
      Brand: product.brand || '',
      Name: product.oborne_sku || '',
      'Display Name': product.name || '',
      'W/S ex gst': product.baseprice || '0',
      RRP: product.rrp || '0',
      'GST Status': 'GST applies',
      Availability: availableQuantity > 0 ? 'In Stock' : 'Out of Stock',
      Barcode: product.upccode || '',
      StockQty: availableQuantity,
      Id: product.id || ''
    }
  })

  return finalData
}

function transformOborneProduct(product: any) {
  const costPrice = parseFloat(product['W/S ex gst']) || 0
  const rrp = parseFloat(product.RRP) || 0
  const stockQty = parseInt(product.StockQty || '0', 10)

  return {
    supplier_name: 'Oborne',
    supplier_sku: product.Name,
    barcode: product.Barcode || null,
    product_name: product['Display Name'] || product.Name,
    brand: product.Brand || null,
    cost_price: costPrice,
    rrp: rrp,
    stock_level: stockQty,
    moq: null,
    cartononly: null,
    metadata: {
      availability: product.Availability,
      gst_status: product['GST Status'],
      oborne_id: product.Id
    }
  }
}

async function syncOborneToSupabase() {
  console.log('🚀 Oborne (CH2 FTP) → Supabase Supplier Sync')
  console.log('==============================================\n')

  try {
    // Fetch data from CH2 FTP
    const oborneProducts = await fetchOborneData()
    console.log(`✅ Fetched ${oborneProducts.length} products\n`)

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
      workflow_name: 'Oborne (CH2 FTP) → Supabase Supplier Sync',
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
      workflow_name: 'Oborne (CH2 FTP) → Supabase Supplier Sync',
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
