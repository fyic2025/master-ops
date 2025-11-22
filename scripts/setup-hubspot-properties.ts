#!/usr/bin/env npx tsx
/**
 * HubSpot Custom Properties Setup Script
 *
 * Creates all custom properties needed for the outreach team system:
 * - Contact properties (ambassador tracking, customer intelligence)
 * - Company properties (wholesale accounts, distributor info)
 * - Deal properties (order tracking, campaign attribution)
 *
 * Usage:
 *   npx tsx scripts/setup-hubspot-properties.ts
 *   npx tsx scripts/setup-hubspot-properties.ts --dry-run
 *   npx tsx scripts/setup-hubspot-properties.ts --only contacts
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
// CONTACT PROPERTIES
// =============================================================================

const CONTACT_PROPERTIES: PropertyDefinition[] = [
  {
    name: 'contact_type',
    label: 'Contact Type',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'contactinformation',
    description: 'Type of contact (customer, ambassador, distributor, stockist)',
    options: [
      { label: 'Customer', value: 'customer', displayOrder: 0 },
      { label: 'Ambassador', value: 'ambassador', displayOrder: 1 },
      { label: 'Distributor', value: 'distributor', displayOrder: 2 },
      { label: 'Stockist', value: 'stockist', displayOrder: 3 },
      { label: 'Partner', value: 'partner', displayOrder: 4 },
    ],
  },
  {
    name: 'ambassador_status',
    label: 'Ambassador Status',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'contactinformation',
    description: 'Current status in ambassador program',
    options: [
      { label: 'Prospect', value: 'prospect', displayOrder: 0 },
      { label: 'Active', value: 'active', displayOrder: 1 },
      { label: 'Inactive', value: 'inactive', displayOrder: 2 },
      { label: 'Churned', value: 'churned', displayOrder: 3 },
    ],
  },
  {
    name: 'ambassador_tier',
    label: 'Ambassador Tier',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'contactinformation',
    description: 'Ambassador tier level for commission rates',
    options: [
      { label: 'Tier 1', value: 'tier_1', displayOrder: 0 },
      { label: 'Tier 2', value: 'tier_2', displayOrder: 1 },
      { label: 'Tier 3', value: 'tier_3', displayOrder: 2 },
      { label: 'VIP', value: 'vip', displayOrder: 3 },
    ],
  },
  {
    name: 'source_business',
    label: 'Source Business',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'contactinformation',
    description: 'Which business this contact originated from',
    options: [
      { label: 'Teelixir', value: 'teelixir', displayOrder: 0 },
      { label: 'Elevate Wholesale', value: 'elevate', displayOrder: 1 },
      { label: 'Buy Organics Online', value: 'boo', displayOrder: 2 },
      { label: 'Red Hill Fresh', value: 'rhf', displayOrder: 3 },
    ],
  },
  {
    name: 'wholesale_account',
    label: 'Wholesale Account',
    type: 'bool',
    fieldType: 'booleancheckbox',
    groupName: 'contactinformation',
    description: 'Is this a wholesale account?',
  },
  {
    name: 'application_date',
    label: 'Application Date',
    type: 'date',
    fieldType: 'date',
    groupName: 'contactinformation',
    description: 'Date ambassador application was submitted',
  },
  {
    name: 'approval_date',
    label: 'Approval Date',
    type: 'date',
    fieldType: 'date',
    groupName: 'contactinformation',
    description: 'Date ambassador was approved',
  },
  {
    name: 'territory',
    label: 'Territory',
    type: 'string',
    fieldType: 'text',
    groupName: 'contactinformation',
    description: 'Geographic territory or region (e.g., Melbourne, NSW, QLD)',
  },
  {
    name: 'commission_rate',
    label: 'Commission Rate',
    type: 'number',
    fieldType: 'number',
    groupName: 'contactinformation',
    description: 'Commission rate percentage for ambassador',
  },
  {
    name: 'total_orders_value',
    label: 'Total Orders Value',
    type: 'number',
    fieldType: 'number',
    groupName: 'contactinformation',
    description: 'Total value of all orders (calculated field)',
  },
  {
    name: 'last_order_date',
    label: 'Last Order Date',
    type: 'date',
    fieldType: 'date',
    groupName: 'contactinformation',
    description: 'Date of most recent order',
  },
  {
    name: 'shopify_customer_id',
    label: 'Shopify Customer ID',
    type: 'string',
    fieldType: 'text',
    groupName: 'contactinformation',
    description: 'Shopify customer ID for sync tracking',
  },
  {
    name: 'unleashed_customer_code',
    label: 'Unleashed Customer Code',
    type: 'string',
    fieldType: 'text',
    groupName: 'contactinformation',
    description: 'Unleashed customer code for sync tracking',
  },
  {
    name: 'klaviyo_subscriber_id',
    label: 'Klaviyo Subscriber ID',
    type: 'string',
    fieldType: 'text',
    groupName: 'contactinformation',
    description: 'Klaviyo subscriber ID for email engagement tracking',
  },
  {
    name: 'last_campaign_engagement',
    label: 'Last Campaign Engagement',
    type: 'datetime',
    fieldType: 'date',
    groupName: 'contactinformation',
    description: 'Last time contact engaged with a campaign (open/click)',
  },
  {
    name: 'campaign_opens_30d',
    label: 'Campaign Opens (30 days)',
    type: 'number',
    fieldType: 'number',
    groupName: 'contactinformation',
    description: 'Number of campaign opens in last 30 days',
  },
  {
    name: 'campaign_clicks_30d',
    label: 'Campaign Clicks (30 days)',
    type: 'number',
    fieldType: 'number',
    groupName: 'contactinformation',
    description: 'Number of campaign clicks in last 30 days',
  },
  {
    name: 'engagement_score',
    label: 'Engagement Score',
    type: 'number',
    fieldType: 'number',
    groupName: 'contactinformation',
    description: 'Calculated engagement score (0-100)',
  },
  {
    name: 'shopify_total_spent',
    label: 'Shopify Total Spent',
    type: 'number',
    fieldType: 'number',
    groupName: 'contactinformation',
    description: 'Total amount spent in Shopify (synced)',
  },
  {
    name: 'shopify_order_count',
    label: 'Shopify Order Count',
    type: 'number',
    fieldType: 'number',
    groupName: 'contactinformation',
    description: 'Total number of Shopify orders (synced)',
  },
  {
    name: 'shopify_customer_status',
    label: 'Shopify Customer Status',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'contactinformation',
    description: 'Customer status in Shopify',
    options: [
      { label: 'Enabled', value: 'enabled', displayOrder: 0 },
      { label: 'Disabled', value: 'disabled', displayOrder: 1 },
      { label: 'Invited', value: 'invited', displayOrder: 2 },
    ],
  },
]

// =============================================================================
// COMPANY PROPERTIES
// =============================================================================

const COMPANY_PROPERTIES: PropertyDefinition[] = [
  {
    name: 'company_type',
    label: 'Company Type',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'companyinformation',
    description: 'Type of company/business',
    options: [
      { label: 'Distributor', value: 'distributor', displayOrder: 0 },
      { label: 'Stockist', value: 'stockist', displayOrder: 1 },
      { label: 'Retail Partner', value: 'retail_partner', displayOrder: 2 },
      { label: 'Supplier', value: 'supplier', displayOrder: 3 },
      { label: 'Service Provider', value: 'service_provider', displayOrder: 4 },
    ],
  },
  {
    name: 'source_business',
    label: 'Source Business',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'companyinformation',
    description: 'Which business this company originated from',
    options: [
      { label: 'Teelixir', value: 'teelixir', displayOrder: 0 },
      { label: 'Elevate Wholesale', value: 'elevate', displayOrder: 1 },
      { label: 'Buy Organics Online', value: 'boo', displayOrder: 2 },
      { label: 'Red Hill Fresh', value: 'rhf', displayOrder: 3 },
    ],
  },
  {
    name: 'account_status',
    label: 'Account Status',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'companyinformation',
    description: 'Current account status',
    options: [
      { label: 'Prospect', value: 'prospect', displayOrder: 0 },
      { label: 'Active', value: 'active', displayOrder: 1 },
      { label: 'Inactive', value: 'inactive', displayOrder: 2 },
      { label: 'Suspended', value: 'suspended', displayOrder: 3 },
    ],
  },
  {
    name: 'minimum_order_value',
    label: 'Minimum Order Value',
    type: 'number',
    fieldType: 'number',
    groupName: 'companyinformation',
    description: 'Minimum order value required (in AUD)',
  },
  {
    name: 'payment_terms',
    label: 'Payment Terms',
    type: 'string',
    fieldType: 'text',
    groupName: 'companyinformation',
    description: 'Payment terms (e.g., Net 30, COD, Credit Card)',
  },
  {
    name: 'tax_id',
    label: 'Tax ID (ABN)',
    type: 'string',
    fieldType: 'text',
    groupName: 'companyinformation',
    description: 'Australian Business Number (ABN)',
  },
  {
    name: 'wholesale_discount_tier',
    label: 'Wholesale Discount Tier',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'companyinformation',
    description: 'Wholesale discount tier level',
    options: [
      { label: 'Tier 1', value: 'tier_1', displayOrder: 0 },
      { label: 'Tier 2', value: 'tier_2', displayOrder: 1 },
      { label: 'Tier 3', value: 'tier_3', displayOrder: 2 },
      { label: 'Custom', value: 'custom', displayOrder: 3 },
    ],
  },
  {
    name: 'total_order_value',
    label: 'Total Order Value',
    type: 'number',
    fieldType: 'number',
    groupName: 'companyinformation',
    description: 'Total value of all orders (calculated field)',
  },
  {
    name: 'last_order_date',
    label: 'Last Order Date',
    type: 'date',
    fieldType: 'date',
    groupName: 'companyinformation',
    description: 'Date of most recent order',
  },
  {
    name: 'preferred_delivery_schedule',
    label: 'Preferred Delivery Schedule',
    type: 'string',
    fieldType: 'text',
    groupName: 'companyinformation',
    description: 'Preferred delivery days/schedule (e.g., Tuesday/Thursday)',
  },
  {
    name: 'shopify_company_id',
    label: 'Shopify Company ID',
    type: 'string',
    fieldType: 'text',
    groupName: 'companyinformation',
    description: 'Shopify company ID for sync tracking',
  },
  {
    name: 'unleashed_customer_code',
    label: 'Unleashed Customer Code',
    type: 'string',
    fieldType: 'text',
    groupName: 'companyinformation',
    description: 'Unleashed customer code for sync tracking',
  },
]

// =============================================================================
// DEAL PROPERTIES
// =============================================================================

const DEAL_PROPERTIES: PropertyDefinition[] = [
  {
    name: 'deal_source',
    label: 'Deal Source',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'dealinformation',
    description: 'How this deal originated',
    options: [
      { label: 'Website Form', value: 'website_form', displayOrder: 0 },
      { label: 'Email Inquiry', value: 'email_inquiry', displayOrder: 1 },
      { label: 'Referral', value: 'referral', displayOrder: 2 },
      { label: 'Event', value: 'event', displayOrder: 3 },
      { label: 'Cold Outreach', value: 'cold_outreach', displayOrder: 4 },
      { label: 'Shopify Order', value: 'shopify_order', displayOrder: 5 },
    ],
  },
  {
    name: 'source_business',
    label: 'Source Business',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'dealinformation',
    description: 'Which business this deal is for',
    options: [
      { label: 'Teelixir', value: 'teelixir', displayOrder: 0 },
      { label: 'Elevate Wholesale', value: 'elevate', displayOrder: 1 },
      { label: 'Buy Organics Online', value: 'boo', displayOrder: 2 },
      { label: 'Red Hill Fresh', value: 'rhf', displayOrder: 3 },
    ],
  },
  {
    name: 'shopify_order_id',
    label: 'Shopify Order ID',
    type: 'string',
    fieldType: 'text',
    groupName: 'dealinformation',
    description: 'Shopify order ID (for synced orders)',
  },
  {
    name: 'shopify_order_name',
    label: 'Shopify Order Name',
    type: 'string',
    fieldType: 'text',
    groupName: 'dealinformation',
    description: 'Shopify order name (e.g., #1001)',
  },
  {
    name: 'unleashed_order_id',
    label: 'Unleashed Order ID',
    type: 'string',
    fieldType: 'text',
    groupName: 'dealinformation',
    description: 'Unleashed sales order GUID',
  },
  {
    name: 'unleashed_order_number',
    label: 'Unleashed Order Number',
    type: 'string',
    fieldType: 'text',
    groupName: 'dealinformation',
    description: 'Unleashed sales order number',
  },
  {
    name: 'order_total',
    label: 'Order Total',
    type: 'number',
    fieldType: 'number',
    groupName: 'dealinformation',
    description: 'Total order value (synced from Shopify/Unleashed)',
  },
  {
    name: 'products_ordered',
    label: 'Products Ordered',
    type: 'string',
    fieldType: 'textarea',
    groupName: 'dealinformation',
    description: 'List of products ordered (JSON or text)',
  },
  {
    name: 'fulfillment_status',
    label: 'Fulfillment Status',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'dealinformation',
    description: 'Order fulfillment status',
    options: [
      { label: 'Pending', value: 'pending', displayOrder: 0 },
      { label: 'Processing', value: 'processing', displayOrder: 1 },
      { label: 'Shipped', value: 'shipped', displayOrder: 2 },
      { label: 'Delivered', value: 'delivered', displayOrder: 3 },
      { label: 'Cancelled', value: 'cancelled', displayOrder: 4 },
    ],
  },
  {
    name: 'payment_status',
    label: 'Payment Status',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'dealinformation',
    description: 'Payment status',
    options: [
      { label: 'Pending', value: 'pending', displayOrder: 0 },
      { label: 'Partial', value: 'partial', displayOrder: 1 },
      { label: 'Paid', value: 'paid', displayOrder: 2 },
      { label: 'Refunded', value: 'refunded', displayOrder: 3 },
    ],
  },
  {
    name: 'campaign_name',
    label: 'Campaign Name',
    type: 'string',
    fieldType: 'text',
    groupName: 'dealinformation',
    description: 'Marketing campaign that generated this deal',
  },
]

// =============================================================================
// Main Setup Function
// =============================================================================

async function setupProperty(
  objectType: 'contacts' | 'companies' | 'deals',
  property: PropertyDefinition,
  dryRun: boolean = false
): Promise<{ success: boolean; message: string }> {
  try {
    // Check if property already exists
    try {
      const existing = await hubspotClient.properties.get(objectType, property.name)
      return {
        success: true,
        message: `⏭️  ${property.name} already exists (${objectType})`,
      }
    } catch (error: any) {
      // Property doesn't exist, create it
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        if (dryRun) {
          return {
            success: true,
            message: `🔍 [DRY RUN] Would create ${property.name} (${objectType})`,
          }
        }

        await hubspotClient.properties.create(objectType, property)
        return {
          success: true,
          message: `✅ Created ${property.name} (${objectType})`,
        }
      }

      throw error
    }
  } catch (error: any) {
    return {
      success: false,
      message: `❌ Failed to create ${property.name} (${objectType}): ${error.message}`,
    }
  }
}

async function setupAllProperties(
  options: {
    dryRun?: boolean
    only?: 'contacts' | 'companies' | 'deals'
  } = {}
) {
  console.log('🚀 HubSpot Custom Properties Setup\n')

  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No properties will be created\n')
  }

  const results: Array<{ success: boolean; message: string }> = []

  // Setup Contact Properties
  if (!options.only || options.only === 'contacts') {
    console.log(`📋 Setting up ${CONTACT_PROPERTIES.length} Contact Properties...\n`)
    for (const property of CONTACT_PROPERTIES) {
      const result = await setupProperty('contacts', property, options.dryRun)
      console.log(result.message)
      results.push(result)
    }
    console.log('')
  }

  // Setup Company Properties
  if (!options.only || options.only === 'companies') {
    console.log(`🏢 Setting up ${COMPANY_PROPERTIES.length} Company Properties...\n`)
    for (const property of COMPANY_PROPERTIES) {
      const result = await setupProperty('companies', property, options.dryRun)
      console.log(result.message)
      results.push(result)
    }
    console.log('')
  }

  // Setup Deal Properties
  if (!options.only || options.only === 'deals') {
    console.log(`💼 Setting up ${DEAL_PROPERTIES.length} Deal Properties...\n`)
    for (const property of DEAL_PROPERTIES) {
      const result = await setupProperty('deals', property, options.dryRun)
      console.log(result.message)
      results.push(result)
    }
    console.log('')
  }

  // Summary
  const successful = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success).length

  console.log('=' .repeat(60))
  console.log('📊 Summary')
  console.log('=' .repeat(60))
  console.log(`✅ Successful: ${successful}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📝 Total: ${results.length}`)

  if (failed > 0) {
    console.log('\n❌ Failed Properties:')
    results.filter((r) => !r.success).forEach((r) => console.log(`  - ${r.message}`))
    process.exit(1)
  }

  console.log('\n✅ All properties setup successfully!')
}

// =============================================================================
// CLI Interface
// =============================================================================

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const onlyArg = args.find((arg) => arg.startsWith('--only'))
const only = onlyArg?.split('=')[1] as 'contacts' | 'companies' | 'deals' | undefined

setupAllProperties({ dryRun, only }).catch((error) => {
  console.error('❌ Setup failed:', error.message)
  process.exit(1)
})
