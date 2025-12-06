#!/usr/bin/env npx tsx
/**
 * Smartlead Cold Outreach Properties Setup Script
 *
 * Creates HubSpot custom properties for tracking Smartlead cold email campaigns
 *
 * Usage:
 *   npx tsx scripts/setup-smartlead-properties.ts
 *   npx tsx scripts/setup-smartlead-properties.ts --dry-run
 */

import { hubspotClient } from '../shared/libs/integrations/hubspot/client'
import { HubSpotProperty } from '../shared/libs/integrations/hubspot/client'

// =============================================================================
// Configuration
// =============================================================================

interface PropertyDefinition extends Partial<HubSpotProperty> {
  name: string
  label: string
  type: string
  fieldType: string
  groupName: string
  description?: string
  options?: Array<{ label: string; value: string; displayOrder?: number }>
}

// =============================================================================
// COLD OUTREACH CONTACT PROPERTIES
// =============================================================================

const CONTACT_PROPERTIES: PropertyDefinition[] = [
  {
    name: 'cold_outreach_status',
    label: 'Cold Outreach Status',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'contactinformation',
    description: 'Current status in cold outreach sequence',
    options: [
      { label: 'Not Contacted', value: 'not_contacted', displayOrder: 0 },
      { label: 'Contacted', value: 'contacted', displayOrder: 1 },
      { label: 'Engaged', value: 'engaged', displayOrder: 2 },
      { label: 'Highly Engaged', value: 'highly_engaged', displayOrder: 3 },
      { label: 'Replied', value: 'replied', displayOrder: 4 },
      { label: 'Unsubscribed', value: 'unsubscribed', displayOrder: 5 },
      { label: 'Bounced', value: 'bounced', displayOrder: 6 },
    ],
  },
  {
    name: 'smartlead_campaign_id',
    label: 'Smartlead Campaign ID',
    type: 'string',
    fieldType: 'text',
    groupName: 'contactinformation',
    description: 'Smartlead campaign ID this lead belongs to',
  },
  {
    name: 'smartlead_campaign_name',
    label: 'Smartlead Campaign Name',
    type: 'string',
    fieldType: 'text',
    groupName: 'contactinformation',
    description: 'Name of the Smartlead campaign',
  },
  {
    name: 'smartlead_lead_id',
    label: 'Smartlead Lead ID',
    type: 'string',
    fieldType: 'text',
    groupName: 'contactinformation',
    description: 'Smartlead internal lead ID for sync tracking',
  },
  {
    name: 'first_outreach_date',
    label: 'First Outreach Date',
    type: 'datetime',
    fieldType: 'date',
    groupName: 'contactinformation',
    description: 'Date when first cold outreach email was sent',
  },
  {
    name: 'last_outreach_email_sent',
    label: 'Last Outreach Email Sent',
    type: 'datetime',
    fieldType: 'date',
    groupName: 'contactinformation',
    description: 'Date of last outreach email sent',
  },
  {
    name: 'last_email_open_date',
    label: 'Last Email Open Date',
    type: 'datetime',
    fieldType: 'date',
    groupName: 'contactinformation',
    description: 'Date when lead last opened an outreach email',
  },
  {
    name: 'last_email_click_date',
    label: 'Last Email Click Date',
    type: 'datetime',
    fieldType: 'date',
    groupName: 'contactinformation',
    description: 'Date when lead last clicked a link in outreach email',
  },
  {
    name: 'last_email_reply_date',
    label: 'Last Email Reply Date',
    type: 'datetime',
    fieldType: 'date',
    groupName: 'contactinformation',
    description: 'Date when lead last replied to outreach email',
  },
  {
    name: 'outreach_email_count',
    label: 'Outreach Email Count',
    type: 'number',
    fieldType: 'number',
    groupName: 'contactinformation',
    description: 'Total number of outreach emails sent to this lead',
  },
  {
    name: 'email_open_count',
    label: 'Email Open Count',
    type: 'number',
    fieldType: 'number',
    groupName: 'contactinformation',
    description: 'Total number of times lead opened outreach emails',
  },
  {
    name: 'email_click_count',
    label: 'Email Click Count',
    type: 'number',
    fieldType: 'number',
    groupName: 'contactinformation',
    description: 'Total number of times lead clicked links in emails',
  },
  {
    name: 'email_reply_count',
    label: 'Email Reply Count',
    type: 'number',
    fieldType: 'number',
    groupName: 'contactinformation',
    description: 'Total number of replies from lead',
  },
  {
    name: 'last_email_sequence_number',
    label: 'Last Email Sequence Number',
    type: 'number',
    fieldType: 'number',
    groupName: 'contactinformation',
    description: 'Sequence number of last email sent (e.g., 1, 2, 3)',
  },
  {
    name: 'last_email_subject',
    label: 'Last Email Subject',
    type: 'string',
    fieldType: 'text',
    groupName: 'contactinformation',
    description: 'Subject line of last outreach email sent',
  },
  {
    name: 'unsubscribe_date',
    label: 'Unsubscribe Date',
    type: 'datetime',
    fieldType: 'date',
    groupName: 'contactinformation',
    description: 'Date when lead unsubscribed from cold outreach',
  },
  {
    name: 'outreach_engagement_rate',
    label: 'Outreach Engagement Rate',
    type: 'number',
    fieldType: 'number',
    groupName: 'contactinformation',
    description: 'Engagement rate percentage (opens + clicks / emails sent)',
  },
  {
    name: 'source_system',
    label: 'Source System',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'contactinformation',
    description: 'System where this contact originated',
    options: [
      { label: 'Shopify', value: 'shopify', displayOrder: 0 },
      { label: 'Unleashed', value: 'unleashed', displayOrder: 1 },
      { label: 'Smartlead', value: 'smartlead', displayOrder: 2 },
      { label: 'Klaviyo', value: 'klaviyo', displayOrder: 3 },
      { label: 'Manual', value: 'manual', displayOrder: 4 },
    ],
  },
]

// =============================================================================
// Script Logic
// =============================================================================

type HubSpotObjectType = 'contacts' | 'companies' | 'deals' | 'tickets'

async function createProperty(objectType: HubSpotObjectType, property: PropertyDefinition, dryRun: boolean) {
  if (dryRun) {
    console.log(`[DRY RUN] Would create ${property.name} (${objectType})`)
    return { success: true, dryRun: true }
  }

  try {
    await hubspotClient.properties.create(objectType, property)
    console.log(`✅ Created ${property.name} (${objectType})`)
    return { success: true }
  } catch (error: any) {
    // Property might already exist
    if (error.message?.includes('already exists') || error.message?.includes('409')) {
      console.log(`⚠️  ${property.name} already exists (${objectType})`)
      return { success: true, existed: true }
    }

    console.error(`❌ Failed to create ${property.name}:`, error.message)
    return { success: false, error: error.message }
  }
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')

  console.log('\n🚀 Smartlead Cold Outreach Properties Setup')
  console.log('==========================================\n')

  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n')
  }

  // Create contact properties
  console.log(`📋 Setting up ${CONTACT_PROPERTIES.length} Contact Properties...`)
  const contactResults = []

  for (const property of CONTACT_PROPERTIES) {
    const result = await createProperty('contacts', property, dryRun)
    contactResults.push(result)

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  // Summary
  console.log('\n📊 Summary')
  console.log('==========\n')

  const contactSuccess = contactResults.filter(r => r.success).length
  const contactFailed = contactResults.filter(r => !r.success).length
  const contactExisted = contactResults.filter(r => r.existed).length

  console.log(`Contact Properties:`)
  console.log(`  ✅ Successful: ${contactSuccess - contactExisted}`)
  console.log(`  ⚠️  Already Existed: ${contactExisted}`)
  console.log(`  ❌ Failed: ${contactFailed}`)
  console.log()

  if (dryRun) {
    console.log('ℹ️  This was a dry run. Run without --dry-run to create properties.')
  } else {
    console.log('✅ Setup complete!')
    console.log('\nNext steps:')
    console.log('1. Import n8n workflow: infra/n8n-workflows/templates/smartlead-hubspot-sync.json')
    console.log('2. Set up Smartlead webhook: https://app.smartlead.ai/app/settings/webhooks')
    console.log('3. Point webhook to: https://automation.growthcohq.com/webhook/smartlead-webhook')
  }

  process.exit(contactFailed > 0 ? 1 : 0)
}

// Run
main().catch(error => {
  console.error('\n💥 Fatal error:', error)
  process.exit(1)
})
