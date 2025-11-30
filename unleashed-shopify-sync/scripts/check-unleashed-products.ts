/**
 * Check Unleashed products to understand bundle handling
 */

import * as crypto from 'crypto'
import { getStoreConfig } from '../src/config.js'

function generateSignature(queryString: string, apiKey: string): string {
  const hmac = crypto.createHmac('sha256', apiKey)
  hmac.update(queryString)
  return hmac.digest('base64')
}

async function fetchUnleashedProducts(config: any, search?: string) {
  let queryString = 'pageSize=50'
  if (search) {
    queryString += `&productCode=${encodeURIComponent(search)}`
  }

  const url = `${config.unleashed.apiUrl}/Products?${queryString}`
  const signature = generateSignature(queryString, config.unleashed.apiKey)

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'api-auth-id': config.unleashed.apiId,
      'api-auth-signature': signature,
    },
  })

  if (!response.ok) {
    throw new Error(`Unleashed API error: ${await response.text()}`)
  }

  return response.json()
}

async function main() {
  const config = getStoreConfig('teelixir')
  if (!config) {
    console.error('Could not load teelixir config')
    return
  }

  console.log('=== Unleashed Products (Teelixir) ===\n')

  // Fetch all products
  const data = await fetchUnleashedProducts(config)
  const products = data.Items || []

  console.log(`Total products: ${products.length}\n`)

  // Look for bundles, packs, kits
  const bundleKeywords = ['bundle', 'pack', 'kit', 'set', 'sample', 'box', 'combo']
  const potentialBundles = products.filter((p: any) => {
    const desc = (p.ProductDescription || '').toLowerCase()
    const code = (p.ProductCode || '').toLowerCase()
    return bundleKeywords.some(kw => desc.includes(kw) || code.includes(kw))
  })

  if (potentialBundles.length > 0) {
    console.log('POTENTIAL BUNDLES IN UNLEASHED:')
    console.log('='.repeat(60))
    for (const p of potentialBundles) {
      console.log(`  ${p.ProductCode}: ${p.ProductDescription}`)
      console.log(`    Price: $${p.DefaultSellPrice || 'N/A'}`)
    }
    console.log('')
  }

  // Show some sample regular products
  console.log('\nSAMPLE PRODUCTS:')
  console.log('='.repeat(60))
  for (const p of products.slice(0, 15)) {
    console.log(`  ${p.ProductCode}: ${p.ProductDescription} - $${p.DefaultSellPrice || 'N/A'}`)
  }

  // Check for promo/gift products
  const promoProducts = products.filter((p: any) => {
    const desc = (p.ProductDescription || '').toLowerCase()
    const code = (p.ProductCode || '').toLowerCase()
    return desc.includes('free') || desc.includes('gift') || desc.includes('promo') ||
           code.includes('ros') || code.includes('gift')
  })

  if (promoProducts.length > 0) {
    console.log('\n\nPROMO/GIFT PRODUCTS:')
    console.log('='.repeat(60))
    for (const p of promoProducts) {
      console.log(`  ${p.ProductCode}: ${p.ProductDescription}`)
    }
  }
}

main().catch(console.error)
