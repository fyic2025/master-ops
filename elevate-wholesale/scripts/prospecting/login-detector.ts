#!/usr/bin/env npx tsx
/**
 * Elevate Wholesale Prospecting Login Detector
 *
 * Runs daily to:
 * 1. Check Shopify customer state for contacts awaiting login
 * 2. Mark as 'active' if customer has logged in (state = 'enabled')
 * 3. Remove 'approved' tag and mark as 'expired' if 30+ days without login
 *
 * Usage:
 *   npx tsx elevate-wholesale/scripts/prospecting/login-detector.ts
 *   npx tsx elevate-wholesale/scripts/prospecting/login-detector.ts --dry-run
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

// =============================================================================
// Configuration
// =============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN || ''
const SHOPIFY_STORE_URL = process.env.ELEVATE_SHOPIFY_STORE_URL || ''
const SHOPIFY_ACCESS_TOKEN = process.env.ELEVATE_SHOPIFY_ACCESS_TOKEN || ''
const SHOPIFY_API_VERSION = '2024-10'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Default expiry days (can be overridden by config)
const DEFAULT_EXPIRY_DAYS = 30

// =============================================================================
// Types
// =============================================================================

interface QueueEntry {
  id: string
  hubspot_contact_id: string
  email: string
  company_name: string
  shopify_customer_id: string
  approved_tag_added_at: string
  first_login_at: string | null
}

interface ShopifyCustomer {
  id: number
  email: string
  state: 'disabled' | 'invited' | 'enabled' | 'declined'
  tags: string
  orders_count: number
}

interface CheckResult {
  queueId: string
  email: string
  action: 'active' | 'expired' | 'waiting' | 'error'
  shopifyState?: string
  daysSinceApproved?: number
  error?: string
}

// =============================================================================
// Shopify Functions
// =============================================================================

async function getShopifyCustomer(customerId: string): Promise<ShopifyCustomer | null> {
  const response = await fetch(
    `https://${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/customers/${customerId}.json`,
    {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      },
    }
  )

  if (!response.ok) {
    if (response.status === 404) return null
    const error = await response.text()
    throw new Error(`Shopify API error: ${error}`)
  }

  const data = await response.json() as any
  return data.customer
}

async function removeApprovedTag(customerId: string, currentTags: string): Promise<void> {
  // Parse tags and remove 'approved'
  const tags = currentTags
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.toLowerCase() !== 'approved')
    .join(', ')

  const response = await fetch(
    `https://${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/customers/${customerId}.json`,
    {
      method: 'PUT',
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer: {
          id: customerId,
          tags,
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to update Shopify customer tags: ${error}`)
  }
}

// =============================================================================
// HubSpot Functions
// =============================================================================

async function updateHubSpotContact(contactId: string, properties: Record<string, any>): Promise<void> {
  const response = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ properties }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`HubSpot update failed: ${error}`)
  }
}

// =============================================================================
// Supabase Functions
// =============================================================================

async function getConfig(): Promise<{ expiryDays: number }> {
  const { data } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'prospecting_expiry_days')
    .single()

  return {
    expiryDays: data ? JSON.parse(data.value) : DEFAULT_EXPIRY_DAYS,
  }
}

async function getContactsAwaitingLogin(): Promise<QueueEntry[]> {
  const { data, error } = await supabase
    .from('prospecting_queue')
    .select('id, hubspot_contact_id, email, company_name, shopify_customer_id, approved_tag_added_at, first_login_at')
    .eq('queue_status', 'sent')
    .not('shopify_customer_id', 'is', null)
    .order('approved_tag_added_at', { ascending: true })

  if (error) throw new Error(`Failed to fetch queue entries: ${error.message}`)
  return data || []
}

async function markAsActive(queueId: string): Promise<void> {
  const { error } = await supabase
    .from('prospecting_queue')
    .update({
      queue_status: 'active',
      first_login_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', queueId)

  if (error) throw new Error(`Failed to mark as active: ${error.message}`)
}

async function markAsExpired(queueId: string): Promise<void> {
  const { error } = await supabase
    .from('prospecting_queue')
    .update({
      queue_status: 'expired',
      approved_tag_removed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', queueId)

  if (error) throw new Error(`Failed to mark as expired: ${error.message}`)
}

async function cancelPendingEmails(queueId: string): Promise<number> {
  const { data, error } = await supabase
    .from('prospecting_emails')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('queue_id', queueId)
    .eq('status', 'pending')
    .select('id')

  if (error) {
    console.error(`Failed to cancel pending emails: ${error.message}`)
    return 0
  }

  return data?.length || 0
}

// =============================================================================
// Main Logic
// =============================================================================

async function checkContact(entry: QueueEntry, expiryDays: number, dryRun: boolean): Promise<CheckResult> {
  const result: CheckResult = {
    queueId: entry.id,
    email: entry.email,
    action: 'waiting',
  }

  try {
    // Calculate days since approved
    const approvedAt = new Date(entry.approved_tag_added_at)
    const now = new Date()
    const daysSinceApproved = Math.floor((now.getTime() - approvedAt.getTime()) / (1000 * 60 * 60 * 24))
    result.daysSinceApproved = daysSinceApproved

    // Get Shopify customer state
    const customer = await getShopifyCustomer(entry.shopify_customer_id)

    if (!customer) {
      result.action = 'error'
      result.error = 'Customer not found in Shopify'
      return result
    }

    result.shopifyState = customer.state

    // Check if customer has logged in (state = 'enabled')
    if (customer.state === 'enabled') {
      console.log(`  ✅ Login detected (state: enabled)`)
      result.action = 'active'

      if (!dryRun) {
        // Mark as active in Supabase
        await markAsActive(entry.id)

        // Cancel pending reminder emails
        const cancelled = await cancelPendingEmails(entry.id)
        if (cancelled > 0) {
          console.log(`    Cancelled ${cancelled} pending reminder emails`)
        }

        // Update HubSpot
        await updateHubSpotContact(entry.hubspot_contact_id, {
          outreach_status: 'active',
        })
      }

      return result
    }

    // Check if expired (30+ days without login)
    if (daysSinceApproved >= expiryDays) {
      console.log(`  ⏰ Expired (${daysSinceApproved} days, no login)`)
      result.action = 'expired'

      if (!dryRun) {
        // Remove 'approved' tag from Shopify
        await removeApprovedTag(entry.shopify_customer_id, customer.tags)
        console.log(`    Removed 'approved' tag from Shopify`)

        // Mark as expired in Supabase
        await markAsExpired(entry.id)

        // Cancel any remaining pending emails
        const cancelled = await cancelPendingEmails(entry.id)
        if (cancelled > 0) {
          console.log(`    Cancelled ${cancelled} pending emails`)
        }

        // Update HubSpot
        await updateHubSpotContact(entry.hubspot_contact_id, {
          outreach_status: 'expired',
        })
      }

      return result
    }

    // Still waiting
    console.log(`  ⏳ Waiting (${daysSinceApproved} days, state: ${customer.state})`)
    result.action = 'waiting'

  } catch (error) {
    result.action = 'error'
    result.error = error instanceof Error ? error.message : String(error)
    console.error(`  ❌ Error: ${result.error}`)
  }

  return result
}

async function runLoginDetector(options: { dryRun?: boolean } = {}): Promise<void> {
  console.log('═'.repeat(60))
  console.log('🔍 Elevate Wholesale Prospecting Login Detector')
  console.log('═'.repeat(60))
  console.log(`Started at: ${new Date().toISOString()}`)

  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n')
  }

  // Load config
  console.log('\n📋 Loading configuration...')
  const config = await getConfig()
  console.log(`  Expiry days: ${config.expiryDays}`)

  // Get contacts awaiting login
  console.log('\n📧 Fetching contacts awaiting login...')
  const entries = await getContactsAwaitingLogin()
  console.log(`  Found ${entries.length} contacts to check`)

  if (entries.length === 0) {
    console.log('\n✅ No contacts to check. Exiting.')
    return
  }

  // Check each contact
  console.log('\n🔄 Checking contacts...\n')
  const results: CheckResult[] = []

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    console.log(`[${i + 1}/${entries.length}] ${entry.email} (${entry.company_name})`)
    const result = await checkContact(entry, config.expiryDays, options.dryRun || false)
    results.push(result)
    console.log('')

    // Small delay to avoid rate limits
    if (i < entries.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
  }

  // Summary
  console.log('═'.repeat(60))
  console.log('📊 Summary')
  console.log('═'.repeat(60))
  console.log(`  Total checked: ${results.length}`)
  console.log(`  Logged in (active): ${results.filter((r) => r.action === 'active').length}`)
  console.log(`  Expired (tag removed): ${results.filter((r) => r.action === 'expired').length}`)
  console.log(`  Still waiting: ${results.filter((r) => r.action === 'waiting').length}`)
  console.log(`  Errors: ${results.filter((r) => r.action === 'error').length}`)

  if (results.some((r) => r.action === 'error')) {
    console.log('\n❌ Errors:')
    results
      .filter((r) => r.action === 'error')
      .forEach((r) => console.log(`  - ${r.email}: ${r.error}`))
  }

  console.log(`\nCompleted at: ${new Date().toISOString()}`)
}

// =============================================================================
// CLI Entry Point
// =============================================================================

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')

runLoginDetector({ dryRun }).catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
