/**
 * Sync UHP Supplier Data to Supabase
 *
 * Logs into UHP website and downloads their product CSV
 */

import { createClient } from '@supabase/supabase-js'
import axios from 'axios'
import csv from 'csv-parser'
import { Readable } from 'stream'
import * as cheerio from 'cheerio'

const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'

const UHP_LOGIN_URL = 'https://shop.uhp.com.au/login'
const UHP_EXPORT_URL = 'https://shop.uhp.com.au/uhp_products_export.php'
const UHP_EMAIL = 'sales@buyorganicsonline.com.au'
const UHP_PASSWORD = '10386'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface UHPProduct {
  SKU: string
  Description: string
  Brand: string
  Barcode: string
  Size: string
  Price: string // Cost price (wholesale)
  RRP: string
  'In Stock': string // 'Y' or 'N'
  Tax: string // 'Y' or 'N' (GST)
  Imageurl?: string
}

async function loginAndFetchCsv(): Promise<UHPProduct[]> {
  console.log('🔐 Logging into UHP website...')

  // Create axios instance with cookie jar
  const client = axios.create({
    withCredentials: true,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  })

  // Step 1: Get login page to retrieve session cookies
  const loginPageResponse = await client.get(UHP_LOGIN_URL)
  const $ = cheerio.load(loginPageResponse.data)
  const loginFormAction = $('#login').attr('action') || ''
  const fullLoginUrl = `https://shop.uhp.com.au/${loginFormAction}`

  // Extract cookies from headers
  const cookies = loginPageResponse.headers['set-cookie'] || []
  const cookieString = cookies.map(c => c.split(';')[0]).join('; ')

  // Step 2: Perform login
  console.log('  → Submitting login credentials...')
  const loginData = new URLSearchParams({
    customers_email_address: UHP_EMAIL,
    customers_password: UHP_PASSWORD,
    'labels[customers_email_address]': 'Email',
    'labels[customers_password]': 'Password',
    'labels[login]': '',
    'groups[]': '11',
    callback: 'login.php'
  })

  const loginResponse = await client.post(fullLoginUrl, loginData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookieString
    },
    maxRedirects: 0,
    validateStatus: (status) => status >= 200 && status < 400
  })

  // Update cookies after login
  const loginCookies = loginResponse.headers['set-cookie'] || []
  const updatedCookieString = [...cookies, ...loginCookies]
    .map(c => c.split(';')[0])
    .join('; ')

  console.log('  ✓ Login successful')

  // Step 3: Download CSV export
  console.log('📥 Downloading product CSV...')
  const csvResponse = await client.get(UHP_EXPORT_URL, {
    headers: {
      'Cookie': updatedCookieString
    },
    responseType: 'text'
  })

  console.log('  ✓ CSV downloaded')

  // Parse CSV
  return new Promise((resolve, reject) => {
    const results: UHPProduct[] = []
    const stream = Readable.from(csvResponse.data)

    stream
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject)
  })
}

function transformUHPProduct(product: UHPProduct) {
  const costPrice = parseFloat(product.Price) || 0
  const rrp = parseFloat(product.RRP) || 0

  // Calculate stock level based on 'In Stock'
  let stockLevel = 0
  if (product['In Stock'] === 'Y') {
    stockLevel = 1000
  }

  return {
    supplier_name: 'UHP',
    supplier_sku: product.SKU,
    barcode: product.Barcode || null,
    product_name: product.Description,
    brand: product.Brand || null,
    cost_price: costPrice,
    rrp: rrp,
    stock_level: stockLevel,
    moq: null,
    cartononly: null,
    metadata: {
      in_stock: product['In Stock'],
      tax: product.Tax,
      size: product.Size,
      imageurl: product.Imageurl || null
    }
  }
}

async function syncUHPToSupabase() {
  console.log('🚀 UHP → Supabase Supplier Sync')
  console.log('================================\n')

  try {
    // Login and fetch CSV
    const uhpProducts = await loginAndFetchCsv()
    console.log(`✅ Fetched ${uhpProducts.length} products\n`)

    // Transform products
    console.log('🔄 Transforming product data...')
    const transformedProducts = uhpProducts.map(transformUHPProduct)
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
      workflow_name: 'UHP → Supabase Supplier Sync',
      workflow_type: 'supplier_sync',
      status: errors === 0 ? 'success' : 'error',
      records_processed: uhpProducts.length,
      records_updated: synced,
      records_failed: errors,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('\n❌ Sync failed:', error.message)

    await supabase.from('automation_logs').insert({
      workflow_name: 'UHP → Supabase Supplier Sync',
      workflow_type: 'supplier_sync',
      status: 'error',
      error_details: { message: error.message, stack: error.stack },
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    })

    process.exit(1)
  }
}

syncUHPToSupabase()
