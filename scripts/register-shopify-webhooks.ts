#!/usr/bin/env npx tsx
/**
 * Shopify Webhook Registration Script
 *
 * Registers webhooks for both Teelixir and Elevate Wholesale stores
 * to trigger n8n workflows for customer and order syncing.
 *
 * Usage:
 *   npx tsx scripts/register-shopify-webhooks.ts
 *   npx tsx scripts/register-shopify-webhooks.ts --dry-run
 *   npx tsx scripts/register-shopify-webhooks.ts --store teelixir
 *   npx tsx scripts/register-shopify-webhooks.ts --store elevate
 *   npx tsx scripts/register-shopify-webhooks.ts --list
 *   npx tsx scripts/register-shopify-webhooks.ts --delete
 */

import * as dotenv from 'dotenv'

dotenv.config()

// =============================================================================
// Configuration
// =============================================================================

const N8N_BASE_URL = process.env.N8N_BASE_URL || 'https://automation.growthcohq.com'

interface WebhookConfig {
  topic: string
  address: string
  format: 'json'
}

const WEBHOOKS: Record<string, WebhookConfig[]> = {
  teelixir: [
    {
      topic: 'customers/create',
      address: `${N8N_BASE_URL}/webhook/shopify-customer-sync`,
      format: 'json',
    },
    {
      topic: 'customers/update',
      address: `${N8N_BASE_URL}/webhook/shopify-customer-sync`,
      format: 'json',
    },
    {
      topic: 'orders/create',
      address: `${N8N_BASE_URL}/webhook/shopify-order-sync`,
      format: 'json',
    },
    {
      topic: 'orders/updated',
      address: `${N8N_BASE_URL}/webhook/shopify-order-sync`,
      format: 'json',
    },
  ],
  elevate: [
    {
      topic: 'customers/create',
      address: `${N8N_BASE_URL}/webhook/shopify-customer-sync`,
      format: 'json',
    },
    {
      topic: 'customers/update',
      address: `${N8N_BASE_URL}/webhook/shopify-customer-sync`,
      format: 'json',
    },
    {
      topic: 'orders/create',
      address: `${N8N_BASE_URL}/webhook/shopify-order-sync`,
      format: 'json',
    },
    {
      topic: 'orders/updated',
      address: `${N8N_BASE_URL}/webhook/shopify-order-sync`,
      format: 'json',
    },
  ],
}

interface StoreConfig {
  name: string
  domain: string
  accessToken: string
}

const STORES: Record<string, StoreConfig> = {
  teelixir: {
    name: 'Teelixir',
    domain: process.env.SHOPIFY_TEELIXIR_DOMAIN || 'teelixir-au.myshopify.com',
    accessToken: process.env.SHOPIFY_TEELIXIR_ACCESS_TOKEN || '',
  },
  elevate: {
    name: 'Elevate Wholesale',
    domain: process.env.SHOPIFY_ELEVATE_DOMAIN || 'elevatewholesale.myshopify.com',
    accessToken: process.env.SHOPIFY_ELEVATE_ACCESS_TOKEN || '',
  },
}

// =============================================================================
// Shopify API Client
// =============================================================================

async function shopifyRequest(
  store: StoreConfig,
  method: string,
  path: string,
  data?: any
): Promise<any> {
  const url = `https://${store.domain}/admin/api/2024-01${path}`

  const response = await fetch(url, {
    method,
    headers: {
      'X-Shopify-Access-Token': store.accessToken,
      'Content-Type': 'application/json',
    },
    body: data ? JSON.stringify(data) : undefined,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `Shopify API error (${response.status}): ${response.statusText}\n${errorText}`
    )
  }

  // Handle empty responses
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return {}
  }

  return response.json()
}

// =============================================================================
// Webhook Management Functions
// =============================================================================

async function listWebhooks(store: StoreConfig): Promise<any[]> {
  const response = await shopifyRequest(store, 'GET', '/webhooks.json')
  return response.webhooks || []
}

async function createWebhook(
  store: StoreConfig,
  webhook: WebhookConfig,
  dryRun: boolean = false
): Promise<{ success: boolean; message: string }> {
  try {
    if (dryRun) {
      return {
        success: true,
        message: `🔍 [DRY RUN] Would create webhook: ${webhook.topic} → ${webhook.address}`,
      }
    }

    const response = await shopifyRequest(store, 'POST', '/webhooks.json', {
      webhook,
    })

    return {
      success: true,
      message: `✅ Created webhook: ${webhook.topic} (ID: ${response.webhook.id})`,
    }
  } catch (error: any) {
    return {
      success: false,
      message: `❌ Failed to create webhook ${webhook.topic}: ${error.message}`,
    }
  }
}

async function deleteWebhook(
  store: StoreConfig,
  webhookId: string,
  dryRun: boolean = false
): Promise<{ success: boolean; message: string }> {
  try {
    if (dryRun) {
      return {
        success: true,
        message: `🔍 [DRY RUN] Would delete webhook: ${webhookId}`,
      }
    }

    await shopifyRequest(store, 'DELETE', `/webhooks/${webhookId}.json`)

    return {
      success: true,
      message: `✅ Deleted webhook: ${webhookId}`,
    }
  } catch (error: any) {
    return {
      success: false,
      message: `❌ Failed to delete webhook ${webhookId}: ${error.message}`,
    }
  }
}

async function deleteAllWebhooks(
  store: StoreConfig,
  dryRun: boolean = false
): Promise<{ success: boolean; message: string }[]> {
  const webhooks = await listWebhooks(store)
  const results: Array<{ success: boolean; message: string }> = []

  console.log(`\nFound ${webhooks.length} existing webhooks for ${store.name}`)

  for (const webhook of webhooks) {
    const result = await deleteWebhook(store, webhook.id, dryRun)
    console.log(result.message)
    results.push(result)
  }

  return results
}

// =============================================================================
// Main Functions
// =============================================================================

async function registerWebhooksForStore(
  storeKey: string,
  dryRun: boolean = false
): Promise<{ success: boolean; message: string }[]> {
  const store = STORES[storeKey]
  const webhooks = WEBHOOKS[storeKey]

  if (!store.accessToken) {
    return [
      {
        success: false,
        message: `❌ ${store.name}: Access token not configured`,
      },
    ]
  }

  console.log(`\n🏪 Registering webhooks for ${store.name}...`)
  console.log(`   Domain: ${store.domain}`)
  console.log(`   Webhooks to register: ${webhooks.length}\n`)

  const results: Array<{ success: boolean; message: string }> = []

  // Check existing webhooks
  const existingWebhooks = await listWebhooks(store)
  console.log(`   Found ${existingWebhooks.length} existing webhooks\n`)

  for (const webhook of webhooks) {
    // Check if webhook already exists
    const exists = existingWebhooks.some(
      (existing) => existing.topic === webhook.topic && existing.address === webhook.address
    )

    if (exists) {
      console.log(`⏭️  Webhook already exists: ${webhook.topic}`)
      results.push({
        success: true,
        message: `⏭️  Webhook already exists: ${webhook.topic}`,
      })
      continue
    }

    const result = await createWebhook(store, webhook, dryRun)
    console.log(result.message)
    results.push(result)
  }

  return results
}

async function listAllWebhooks(): Promise<void> {
  console.log('📋 Listing all Shopify webhooks\n')

  for (const [storeKey, store] of Object.entries(STORES)) {
    if (!store.accessToken) {
      console.log(`\n❌ ${store.name}: Access token not configured`)
      continue
    }

    console.log(`\n🏪 ${store.name} (${store.domain})`)
    console.log('=' .repeat(60))

    try {
      const webhooks = await listWebhooks(store)

      if (webhooks.length === 0) {
        console.log('   No webhooks registered')
      } else {
        webhooks.forEach((webhook, index) => {
          console.log(`\n   Webhook ${index + 1}:`)
          console.log(`   ID: ${webhook.id}`)
          console.log(`   Topic: ${webhook.topic}`)
          console.log(`   Address: ${webhook.address}`)
          console.log(`   Format: ${webhook.format}`)
          console.log(`   Created: ${webhook.created_at}`)
        })
      }
    } catch (error: any) {
      console.log(`   ❌ Error listing webhooks: ${error.message}`)
    }
  }
}

async function deleteAllWebhooksFromAllStores(dryRun: boolean = false): Promise<void> {
  console.log('🗑️  Deleting all Shopify webhooks\n')

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No webhooks will be deleted\n')
  }

  for (const [storeKey, store] of Object.entries(STORES)) {
    if (!store.accessToken) {
      console.log(`\n❌ ${store.name}: Access token not configured`)
      continue
    }

    console.log(`\n🏪 ${store.name}`)
    await deleteAllWebhooks(store, dryRun)
  }
}

async function registerAllWebhooks(
  options: {
    dryRun?: boolean
    storeKey?: string
  } = {}
): Promise<void> {
  console.log('🚀 Shopify Webhook Registration\n')

  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No webhooks will be created\n')
  }

  const allResults: Array<{ success: boolean; message: string }> = []

  const storesToRegister = options.storeKey
    ? [options.storeKey]
    : Object.keys(STORES)

  for (const storeKey of storesToRegister) {
    const results = await registerWebhooksForStore(storeKey, options.dryRun)
    allResults.push(...results)
  }

  // Summary
  const successful = allResults.filter((r) => r.success).length
  const failed = allResults.filter((r) => !r.success).length

  console.log('\n' + '=' .repeat(60))
  console.log('📊 Summary')
  console.log('=' .repeat(60))
  console.log(`✅ Successful: ${successful}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📝 Total: ${allResults.length}`)

  if (failed > 0) {
    console.log('\n❌ Failed Webhooks:')
    allResults.filter((r) => !r.success).forEach((r) => console.log(`  - ${r.message}`))
    process.exit(1)
  }

  console.log('\n✅ All webhooks registered successfully!')
}

// =============================================================================
// CLI Interface
// =============================================================================

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const listFlag = args.includes('--list')
const deleteFlag = args.includes('--delete')
const storeArg = args.find((arg) => arg.startsWith('--store'))
const storeKey = storeArg?.split('=')[1]

if (listFlag) {
  listAllWebhooks().catch((error) => {
    console.error('❌ Failed to list webhooks:', error.message)
    process.exit(1)
  })
} else if (deleteFlag) {
  deleteAllWebhooksFromAllStores(dryRun).catch((error) => {
    console.error('❌ Failed to delete webhooks:', error.message)
    process.exit(1)
  })
} else {
  registerAllWebhooks({ dryRun, storeKey }).catch((error) => {
    console.error('❌ Registration failed:', error.message)
    process.exit(1)
  })
}
