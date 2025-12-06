/**
 * Link BigCommerce Products to Suppliers
 *
 * This script matches ecommerce_products to supplier_products via barcode
 * and creates entries in the product_supplier_links table.
 *
 * Matching priority:
 * 1. Direct barcode match
 * 2. SKU-based match (OB - xxx, KAD - xxx, UN - xxx)
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface EcommerceProduct {
  id: string
  sku: string
  name: string
  barcode: string | null
  gtin: string | null
  upc: string | null
  ean: string | null
}

interface SupplierProduct {
  id: string
  supplier_name: string
  supplier_sku: string
  barcode: string | null
  product_name: string
}

interface ProductLink {
  ecommerce_product_id: string
  supplier_product_id: string
  supplier_name: string
  match_type: 'barcode' | 'sku_direct' | 'manual'
  is_active: boolean
  priority: number
}

async function fetchEcommerceProducts(): Promise<EcommerceProduct[]> {
  console.log('📦 Fetching BigCommerce products...')

  const PAGE_SIZE = 1000
  let allData: EcommerceProduct[] = []
  let page = 0
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from('ecommerce_products')
      .select('id, sku, name, barcode, gtin, upc, ean')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (error) {
      throw new Error(`Failed to fetch ecommerce products: ${error.message}`)
    }

    allData = allData.concat(data)
    hasMore = data.length === PAGE_SIZE
    page++
    console.log(`  → Fetched page ${page} (${allData.length} products so far)`)
  }

  console.log(`  ✓ Fetched ${allData.length} products total\n`)
  return allData
}

async function fetchSupplierProducts(): Promise<SupplierProduct[]> {
  console.log('🏭 Fetching supplier products...')

  const PAGE_SIZE = 1000
  let allData: SupplierProduct[] = []
  let page = 0
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from('supplier_products')
      .select('id, supplier_name, supplier_sku, barcode, product_name')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (error) {
      throw new Error(`Failed to fetch supplier products: ${error.message}`)
    }

    allData = allData.concat(data)
    hasMore = data.length === PAGE_SIZE
    page++
    console.log(`  → Fetched page ${page} (${allData.length} products so far)`)
  }

  console.log(`  ✓ Fetched ${allData.length} products total\n`)
  return allData
}

function normalizeBarcode(barcode: string | null | undefined): string | null {
  if (!barcode) return null
  // Remove spaces, leading zeros, convert to uppercase
  const normalized = barcode.trim().replace(/^0+/, '').toUpperCase()
  return normalized.length > 0 ? normalized : null
}

function extractSupplierSKU(bcSku: string, supplier: string): string | null {
  // Extract supplier SKU from BC SKU
  // E.g., "OB - ABC123" → "ABC123"
  // Note: Use lowercase supplier names to match DB values
  const patterns: Record<string, RegExp> = {
    'oborne': /^(OB|NEWOB)\s*-\s*(.+)$/i,
    'kadac': /^(KAD|NEWKAD)\s*-\s*(.+)$/i,
    'uhp': /^(UN|NEWUN)\s*-\s*(.+)$/i
  }

  const pattern = patterns[supplier]
  if (!pattern) return null

  const match = bcSku.match(pattern)
  return match ? match[2].trim() : null
}

async function clearExistingLinks() {
  console.log('🗑️  Clearing existing product links...')

  const { error } = await supabase
    .from('product_supplier_links')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

  if (error) {
    console.error(`  ⚠️  Warning: Could not clear links: ${error.message}`)
  } else {
    console.log(`  ✓ Cleared existing links\n`)
  }
}

async function linkProducts() {
  console.log('🚀 Product-Supplier Linking')
  console.log('============================\n')

  try {
    // Fetch data
    const ecommerceProducts = await fetchEcommerceProducts()
    const supplierProducts = await fetchSupplierProducts()

    // Clear existing links
    await clearExistingLinks()

    // Build barcode index for faster lookups
    console.log('🔍 Building barcode index...')
    const barcodeIndex = new Map<string, SupplierProduct[]>()

    for (const sp of supplierProducts) {
      const normalizedBarcode = normalizeBarcode(sp.barcode)
      if (normalizedBarcode) {
        if (!barcodeIndex.has(normalizedBarcode)) {
          barcodeIndex.set(normalizedBarcode, [])
        }
        barcodeIndex.get(normalizedBarcode)!.push(sp)
      }
    }
    console.log(`  ✓ Indexed ${barcodeIndex.size} unique barcodes\n`)

    // Build supplier SKU index
    console.log('🔍 Building supplier SKU index...')
    const supplierSkuIndex = new Map<string, SupplierProduct>()

    for (const sp of supplierProducts) {
      const key = `${sp.supplier_name}:${sp.supplier_sku}`
      supplierSkuIndex.set(key, sp)
    }
    console.log(`  ✓ Indexed ${supplierSkuIndex.size} supplier SKUs\n`)

    // Match products
    console.log('🔗 Matching products...')
    const links: ProductLink[] = []
    let barcodeMatches = 0
    let skuMatches = 0
    let multiSupplierProducts = 0

    for (const ep of ecommerceProducts) {
      const matchedSuppliers = new Set<string>()
      let productLinks: ProductLink[] = []

      // 1. Try barcode match
      const barcodes = [
        normalizeBarcode(ep.barcode),
        normalizeBarcode(ep.gtin),
        normalizeBarcode(ep.upc),
        normalizeBarcode(ep.ean)
      ].filter(b => b !== null) as string[]

      for (const barcode of barcodes) {
        const matches = barcodeIndex.get(barcode)
        if (matches) {
          for (const sp of matches) {
            if (!matchedSuppliers.has(sp.supplier_name)) {
              productLinks.push({
                ecommerce_product_id: ep.id,
                supplier_product_id: sp.id,
                supplier_name: sp.supplier_name,
                match_type: 'barcode',
                is_active: false, // Will set priority later
                priority: 999
              })
              matchedSuppliers.add(sp.supplier_name)
              barcodeMatches++
            }
          }
        }
      }

      // 2. Try SKU-based match (use lowercase to match DB values)
      for (const supplier of ['oborne', 'kadac', 'uhp']) {
        if (!matchedSuppliers.has(supplier)) {
          const supplierSku = extractSupplierSKU(ep.sku, supplier)
          if (supplierSku) {
            const key = `${supplier}:${supplierSku}`
            const sp = supplierSkuIndex.get(key)
            if (sp) {
              productLinks.push({
                ecommerce_product_id: ep.id,
                supplier_product_id: sp.id,
                supplier_name: sp.supplier_name,
                match_type: 'sku_direct',
                is_active: false,
                priority: 999
              })
              matchedSuppliers.add(sp.supplier_name)
              skuMatches++
            }
          }
        }
      }

      // Set priorities and active status
      if (productLinks.length > 0) {
        // Sort by supplier priority: oborne (1), kadac (2), uhp (3), unleashed (4)
        const supplierPriority: Record<string, number> = {
          'oborne': 1,
          'kadac': 2,
          'uhp': 3,
          'unleashed': 4
        }

        productLinks.sort((a, b) => {
          return (supplierPriority[a.supplier_name] || 999) -
                 (supplierPriority[b.supplier_name] || 999)
        })

        // Set priorities
        productLinks.forEach((link, index) => {
          link.priority = index + 1
        })

        // Set first supplier as active (if in stock)
        productLinks[0].is_active = true

        // Track multi-supplier products
        if (productLinks.length > 1) {
          multiSupplierProducts++
        }

        links.push(...productLinks)
      }
    }

    console.log(`  ✓ Barcode matches: ${barcodeMatches}`)
    console.log(`  ✓ SKU matches: ${skuMatches}`)
    console.log(`  ✓ Products with multiple suppliers: ${multiSupplierProducts}`)
    console.log(`  ✓ Total links created: ${links.length}\n`)

    // Insert links in batches
    if (links.length > 0) {
      console.log('💾 Saving links to Supabase...')
      const BATCH_SIZE = 500
      let saved = 0

      for (let i = 0; i < links.length; i += BATCH_SIZE) {
        const batch = links.slice(i, i + BATCH_SIZE)
        const batchNum = Math.floor(i / BATCH_SIZE) + 1
        const totalBatches = Math.ceil(links.length / BATCH_SIZE)

        console.log(`  → Batch ${batchNum}/${totalBatches} (${batch.length} links)...`)

        const { error } = await supabase
          .from('product_supplier_links')
          .insert(batch)

        if (error) {
          console.error(`  ❌ Batch ${batchNum} error:`, error.message)
        } else {
          saved += batch.length
          console.log(`  ✓ Batch ${batchNum} saved (${saved}/${links.length})`)
        }
      }

      console.log(`\n✅ Linking complete!`)
      console.log(`  ✓ Saved ${saved} links`)
    } else {
      console.log('⚠️  No links were created')
    }

    // Log to automation_logs
    await supabase.from('automation_logs').insert({
      workflow_name: 'Product-Supplier Linking',
      workflow_type: 'product_linking',
      status: 'success',
      records_processed: ecommerceProducts.length,
      records_updated: links.length,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    })

    // Show summary statistics
    console.log('\n📊 Summary Statistics')
    console.log('=====================')
    console.log(`BigCommerce products: ${ecommerceProducts.length}`)
    console.log(`Supplier products: ${supplierProducts.length}`)
    console.log(`Products with suppliers: ${links.length > 0 ? new Set(links.map(l => l.ecommerce_product_id)).size : 0}`)
    console.log(`Products without suppliers: ${ecommerceProducts.length - new Set(links.map(l => l.ecommerce_product_id)).size}`)
    console.log(`Products with multiple suppliers: ${multiSupplierProducts}`)

  } catch (error: any) {
    console.error('\n❌ Linking failed:', error.message)

    await supabase.from('automation_logs').insert({
      workflow_name: 'Product-Supplier Linking',
      workflow_type: 'product_linking',
      status: 'error',
      error_details: { message: error.message, stack: error.stack },
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    })

    process.exit(1)
  }
}

linkProducts()
