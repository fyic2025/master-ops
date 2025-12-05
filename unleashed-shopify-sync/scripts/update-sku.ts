/**
 * Update missing SKU for Lion's Mane Capsules
 */

import { getStoreConfig } from '../src/config.js'

async function main() {
  const config = getStoreConfig('teelixir')
  if (!config) return

  const variantId = 52748247105811
  const newSku = 'CAPS90LION'

  console.log(`Updating variant ${variantId} with SKU: ${newSku}`)

  const url = `https://${config.shopify.shopDomain}/admin/api/${config.shopify.apiVersion}/variants/${variantId}.json`

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'X-Shopify-Access-Token': config.shopify.accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      variant: {
        id: variantId,
        sku: newSku,
      },
    }),
  })

  if (response.ok) {
    const data = await response.json() as { variant: { sku: string } }
    console.log(`✅ SKU updated to: ${data.variant.sku}`)
  } else {
    console.log(`❌ Failed: ${await response.text()}`)
  }
}

main().catch(console.error)
