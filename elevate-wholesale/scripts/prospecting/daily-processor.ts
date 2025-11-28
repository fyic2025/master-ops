#!/usr/bin/env npx tsx
/**
 * Elevate Wholesale Daily Prospecting Processor
 *
 * Runs daily to:
 * 1. Select N contacts from HubSpot (where outreach_status = pending)
 * 2. Create Shopify B2B accounts with "approved" tag
 * 3. Queue welcome emails
 * 4. Update HubSpot and Supabase tracking
 *
 * Usage:
 *   npx tsx elevate-wholesale/scripts/prospecting/daily-processor.ts
 *   npx tsx elevate-wholesale/scripts/prospecting/daily-processor.ts --dry-run
 *   npx tsx elevate-wholesale/scripts/prospecting/daily-processor.ts --limit 2
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

// =============================================================================
// Types
// =============================================================================

interface ProspectingConfig {
  enabled: boolean
  dailyLimit: number
  leadCategory: string | null
  expiryDays: number
}

interface HubSpotContact {
  id: string
  properties: {
    email?: string
    firstname?: string
    lastname?: string
    company?: string
    business_name?: string
    phone?: string
    lead_category?: string
    outreach_status?: string
  }
}

interface ProcessResult {
  hubspotId: string
  email: string
  companyName: string
  success: boolean
  shopifyCustomerId?: string
  error?: string
  durationMs: number
}

// =============================================================================
// HubSpot Functions
// =============================================================================

async function getEligibleContacts(limit: number, leadCategory: string | null): Promise<HubSpotContact[]> {
  const filters: any[] = [
    {
      propertyName: 'outreach_status',
      operator: 'NOT_HAS_PROPERTY',
    },
  ]

  // Alternative: status is pending (for contacts that were queued but not processed)
  // We look for contacts that don't have outreach_status set yet

  if (leadCategory) {
    filters.push({
      propertyName: 'lead_category',
      operator: 'EQ',
      value: leadCategory,
    })
  }

  const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filterGroups: [{ filters }],
      properties: ['email', 'firstname', 'lastname', 'company', 'business_name', 'phone', 'lead_category', 'outreach_status'],
      limit,
      sorts: [{ propertyName: 'createdate', direction: 'ASCENDING' }],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`HubSpot search failed: ${error}`)
  }

  const data = await response.json()
  return data.results || []
}

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
// Shopify Functions
// =============================================================================

async function createShopifyCustomer(contact: HubSpotContact): Promise<{ customerId: string; companyId?: string }> {
  const companyName = contact.properties.business_name || contact.properties.company || 'Unknown Company'

  // Create customer via REST API
  const customerResponse = await fetch(
    `https://${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/customers.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer: {
          email: contact.properties.email,
          first_name: contact.properties.firstname || '',
          last_name: contact.properties.lastname || companyName,
          phone: contact.properties.phone || '',
          tags: ['approved', 'wholesale', 'prospecting'],
          note: `HubSpot Contact ID: ${contact.id}\nCompany: ${companyName}\nCreated via Prospecting System`,
          send_email_welcome: false, // We send our own welcome email
          metafields: [
            {
              namespace: 'b2b',
              key: 'hubspot_contact_id',
              value: contact.id,
              type: 'single_line_text_field',
            },
            {
              namespace: 'b2b',
              key: 'account_type',
              value: 'prospecting_trial',
              type: 'single_line_text_field',
            },
          ],
        },
      }),
    }
  )

  if (!customerResponse.ok) {
    const error = await customerResponse.text()
    throw new Error(`Shopify customer creation failed: ${error}`)
  }

  const customerData = await customerResponse.json()
  return {
    customerId: customerData.customer.id.toString(),
  }
}

// =============================================================================
// Supabase Functions
// =============================================================================

async function getProspectingConfig(): Promise<ProspectingConfig> {
  const { data, error } = await supabase
    .from('system_config')
    .select('key, value')
    .in('key', ['prospecting_enabled', 'prospecting_daily_limit', 'prospecting_lead_category', 'prospecting_expiry_days'])

  if (error) {
    console.warn('Failed to load config from Supabase, using defaults:', error.message)
    return {
      enabled: true,
      dailyLimit: 5,
      leadCategory: null,
      expiryDays: 30,
    }
  }

  const configMap = Object.fromEntries(
    (data || []).map((row) => [row.key, JSON.parse(row.value)])
  )

  return {
    enabled: configMap.prospecting_enabled ?? true,
    dailyLimit: configMap.prospecting_daily_limit ?? 5,
    leadCategory: configMap.prospecting_lead_category ?? null,
    expiryDays: configMap.prospecting_expiry_days ?? 30,
  }
}

async function insertQueueEntry(
  contact: HubSpotContact,
  shopifyCustomerId: string,
  batchDate: Date,
  correlationId: string
): Promise<string> {
  const companyName = contact.properties.business_name || contact.properties.company || 'Unknown'
  const now = new Date()
  const expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days from now

  const { data, error } = await supabase
    .from('prospecting_queue')
    .insert({
      hubspot_contact_id: contact.id,
      email: contact.properties.email,
      company_name: companyName,
      lead_category: contact.properties.lead_category || null,
      queue_status: 'sent',
      processed_at: now.toISOString(),
      approved_tag_added_at: now.toISOString(),
      shopify_customer_id: shopifyCustomerId,
      batch_date: batchDate.toISOString().split('T')[0],
      correlation_id: correlationId,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to insert queue entry: ${error.message}`)
  return data.id
}

async function queueWelcomeEmail(
  queueId: string,
  email: string,
  companyName: string
): Promise<void> {
  const { error } = await supabase.from('prospecting_emails').insert({
    queue_id: queueId,
    email_type: 'welcome',
    recipient_email: email,
    subject: 'Welcome to Easy Wholesale Ordering – Your 30-Day Trial Is Live',
    template_name: 'welcome',
    template_data: { company_name: companyName },
    status: 'pending',
    scheduled_for: new Date().toISOString(),
  })

  if (error) throw new Error(`Failed to queue welcome email: ${error.message}`)
}

async function createRunLog(
  batchDate: Date,
  config: ProspectingConfig
): Promise<string> {
  const { data, error } = await supabase
    .from('prospecting_run_log')
    .insert({
      run_date: batchDate.toISOString().split('T')[0],
      started_at: new Date().toISOString(),
      config_snapshot: config,
      status: 'running',
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create run log: ${error.message}`)
  return data.id
}

async function updateRunLog(
  runLogId: string,
  results: ProcessResult[],
  status: 'completed' | 'partial' | 'failed'
): Promise<void> {
  const { error } = await supabase
    .from('prospecting_run_log')
    .update({
      completed_at: new Date().toISOString(),
      contacts_selected: results.length,
      contacts_processed: results.filter((r) => r.success).length,
      accounts_created: results.filter((r) => r.success).length,
      emails_queued: results.filter((r) => r.success).length,
      errors_count: results.filter((r) => !r.success).length,
      processed_contacts: results,
      status,
      error_summary: results
        .filter((r) => !r.success)
        .map((r) => `${r.email}: ${r.error}`)
        .join('; '),
    })
    .eq('id', runLogId)

  if (error) console.error('Failed to update run log:', error.message)
}

// =============================================================================
// Main Processor
// =============================================================================

async function processContact(
  contact: HubSpotContact,
  batchDate: Date,
  correlationId: string,
  dryRun: boolean
): Promise<ProcessResult> {
  const startTime = Date.now()
  const companyName = contact.properties.business_name || contact.properties.company || 'Unknown'

  const result: ProcessResult = {
    hubspotId: contact.id,
    email: contact.properties.email || '',
    companyName,
    success: false,
    durationMs: 0,
  }

  try {
    if (!contact.properties.email) {
      throw new Error('Contact has no email address')
    }

    if (dryRun) {
      console.log(`  [DRY RUN] Would process: ${contact.properties.email} (${companyName})`)
      result.success = true
      result.durationMs = Date.now() - startTime
      return result
    }

    // Step 1: Create Shopify customer with "approved" tag
    console.log(`  Creating Shopify account for ${contact.properties.email}...`)
    const { customerId } = await createShopifyCustomer(contact)
    result.shopifyCustomerId = customerId

    // Step 2: Insert into prospecting queue
    console.log(`  Inserting into prospecting queue...`)
    const queueId = await insertQueueEntry(contact, customerId, batchDate, correlationId)

    // Step 3: Queue welcome email
    console.log(`  Queueing welcome email...`)
    await queueWelcomeEmail(queueId, contact.properties.email, companyName)

    // Step 4: Update HubSpot contact
    console.log(`  Updating HubSpot contact...`)
    const now = new Date()
    const expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    await updateHubSpotContact(contact.id, {
      outreach_status: 'sent',
      outreach_start_date: now.toISOString().split('T')[0],
      outreach_end_date: expiryDate.toISOString().split('T')[0],
      shopify_customer_id: customerId,
    })

    result.success = true
    console.log(`  ✅ Success: ${contact.properties.email}`)
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error)
    console.error(`  ❌ Failed: ${contact.properties.email} - ${result.error}`)
  }

  result.durationMs = Date.now() - startTime
  return result
}

async function runDailyProcessor(options: { dryRun?: boolean; limit?: number } = {}): Promise<void> {
  console.log('═'.repeat(60))
  console.log('🚀 Elevate Wholesale Daily Prospecting Processor')
  console.log('═'.repeat(60))
  console.log(`Started at: ${new Date().toISOString()}`)

  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n')
  }

  // Load configuration
  console.log('\n📋 Loading configuration...')
  const config = await getProspectingConfig()

  if (!config.enabled && !options.dryRun) {
    console.log('⏸️  Prospecting is disabled. Set prospecting_enabled to true to enable.')
    return
  }

  const limit = options.limit ?? config.dailyLimit
  console.log(`  Daily limit: ${limit}`)
  console.log(`  Lead category filter: ${config.leadCategory || 'all'}`)
  console.log(`  Expiry days: ${config.expiryDays}`)

  // Create run log
  const batchDate = new Date()
  const correlationId = `batch_${batchDate.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)}`
  let runLogId: string | null = null

  if (!options.dryRun) {
    try {
      runLogId = await createRunLog(batchDate, config)
      console.log(`  Run log ID: ${runLogId}`)
    } catch (error) {
      console.warn('  Warning: Could not create run log:', error)
    }
  }

  // Get eligible contacts from HubSpot
  console.log('\n📧 Fetching eligible contacts from HubSpot...')
  const contacts = await getEligibleContacts(limit, config.leadCategory)
  console.log(`  Found ${contacts.length} eligible contacts`)

  if (contacts.length === 0) {
    console.log('\n✅ No contacts to process. Exiting.')
    if (runLogId) {
      await updateRunLog(runLogId, [], 'completed')
    }
    return
  }

  // Process each contact
  console.log('\n🔄 Processing contacts...\n')
  const results: ProcessResult[] = []

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i]
    console.log(`[${i + 1}/${contacts.length}] Processing ${contact.properties.email}...`)
    const result = await processContact(contact, batchDate, correlationId, options.dryRun || false)
    results.push(result)
    console.log('')
  }

  // Update run log
  if (runLogId) {
    const status = results.every((r) => r.success)
      ? 'completed'
      : results.some((r) => r.success)
        ? 'partial'
        : 'failed'
    await updateRunLog(runLogId, results, status)
  }

  // Summary
  console.log('═'.repeat(60))
  console.log('📊 Summary')
  console.log('═'.repeat(60))
  console.log(`  Processed: ${results.length}`)
  console.log(`  Successful: ${results.filter((r) => r.success).length}`)
  console.log(`  Failed: ${results.filter((r) => !r.success).length}`)
  console.log(`  Total time: ${results.reduce((sum, r) => sum + r.durationMs, 0)}ms`)

  if (results.some((r) => !r.success)) {
    console.log('\n❌ Failed contacts:')
    results
      .filter((r) => !r.success)
      .forEach((r) => console.log(`  - ${r.email}: ${r.error}`))
  }

  console.log(`\nCompleted at: ${new Date().toISOString()}`)
}

// =============================================================================
// CLI Entry Point
// =============================================================================

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const limitArg = args.find((a) => a.startsWith('--limit'))
const limit = limitArg ? parseInt(limitArg.split('=')[1] || limitArg.split(' ')[1], 10) : undefined

runDailyProcessor({ dryRun, limit }).catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
