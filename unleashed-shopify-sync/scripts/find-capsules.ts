/**
 * Find capsule products in Shopify
 */

import { getStoreConfig } from '../src/config.js'

async function main() {
  const config = getStoreConfig('teelixir')
  if (!config) return

  console.log('Fetching all Teelixir products...\n')

  let allProducts: any[] = []
  let sinceId = 0
  let hasMore = true

  while (hasMore) {
    const url = `https://${config.shopify.shopDomain}/admin/api/${config.shopify.apiVersion}/products.json?limit=250&since_id=${sinceId}`

    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': config.shopify.accessToken,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    const products = data.products || []

    if (products.length === 0) {
      hasMore = false
    } else {
      allProducts.push(...products)
      sinceId = products[products.length - 1].id
    }
  }

  console.log(`Total products: ${allProducts.length}\n`)

  // Find capsule products or products with missing SKUs
  console.log('=== CAPSULE PRODUCTS ===\n')

  for (const p of allProducts) {
    const titleLower = p.title.toLowerCase()
    if (titleLower.includes('capsule')) {
      console.log(`Product: ${p.title}`)
      console.log(`  Product ID: ${p.id}`)
      for (const v of p.variants) {
        const skuStatus = v.sku ? v.sku : '❌ MISSING'
        console.log(`  Variant: ${v.title} | SKU: ${skuStatus} | Variant ID: ${v.id}`)
      }
      console.log('')
    }
  }

  // Also show products with missing SKUs
  console.log('\n=== PRODUCTS WITH MISSING SKUs ===\n')

  for (const p of allProducts) {
    for (const v of p.variants) {
      if (!v.sku) {
        console.log(`${p.title} (${v.title}) - Variant ID: ${v.id}`)
      }
    }
  }
}

main().catch(console.error)
