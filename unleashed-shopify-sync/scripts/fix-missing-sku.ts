/**
 * Fix missing SKU for Lion's Mane Capsules product
 */

import { getStoreConfig } from '../src/config.js'

async function main() {
  const config = getStoreConfig('teelixir')
  if (!config) {
    console.error('Could not load teelixir config')
    return
  }

  // Search for the product
  console.log('Searching for Lion\'s Mane Capsules product...\n')

  const searchUrl = `https://${config.shopify.shopDomain}/admin/api/${config.shopify.apiVersion}/products.json?title=Lion%27s+Mane+Capsules`

  const searchResponse = await fetch(searchUrl, {
    headers: {
      'X-Shopify-Access-Token': config.shopify.accessToken,
      'Content-Type': 'application/json',
    },
  })

  if (!searchResponse.ok) {
    console.error('Search failed:', await searchResponse.text())
    return
  }

  const searchData = await searchResponse.json() as { products?: Array<{ id: number; title: string; variants: Array<{ id: number; title: string; sku: string | null }> }> }
  const products = searchData.products || []

  console.log(`Found ${products.length} matching products:\n`)

  for (const product of products) {
    console.log(`Product: ${product.title}`)
    console.log(`  ID: ${product.id}`)

    for (const variant of product.variants) {
      console.log(`  Variant: ${variant.title}`)
      console.log(`    Variant ID: ${variant.id}`)
      console.log(`    Current SKU: ${variant.sku || '(empty)'}`)

      // If SKU is empty and title matches, update it
      if (!variant.sku && product.title.includes('90 Capsules')) {
        console.log(`\n  >> Updating SKU to CAPS90LION...`)

        const updateUrl = `https://${config.shopify.shopDomain}/admin/api/${config.shopify.apiVersion}/variants/${variant.id}.json`

        const updateResponse = await fetch(updateUrl, {
          method: 'PUT',
          headers: {
            'X-Shopify-Access-Token': config.shopify.accessToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            variant: {
              id: variant.id,
              sku: 'CAPS90LION',
            },
          }),
        })

        if (updateResponse.ok) {
          const updated = await updateResponse.json() as { variant: { sku: string } }
          console.log(`  ✅ SKU updated to: ${updated.variant.sku}`)
        } else {
          console.log(`  ❌ Update failed: ${await updateResponse.text()}`)
        }
      }
    }
    console.log('')
  }
}

main().catch(console.error)
