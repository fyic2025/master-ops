// Elevate Wholesale - Sync Trial Expirations Edge Function
// Daily cron job to expire trial accounts and disable discount codes

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Environment variables
const SHOPIFY_STORE_URL = Deno.env.get('SHOPIFY_STORE_URL')!
const SHOPIFY_ACCESS_TOKEN = Deno.env.get('SHOPIFY_ACCESS_TOKEN')!
const SHOPIFY_API_VERSION = Deno.env.get('SHOPIFY_API_VERSION') || '2024-10'
const HUBSPOT_API_KEY = Deno.env.get('HUBSPOT_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Types
interface TrialCustomer {
  id: string
  email: string
  firstname: string
  lastname: string
  business_name: string
  trial_status: string
  trial_end_date: string
  trial_coupon_code: string | null
  hubspot_contact_id: string | null
  shopify_customer_id: string | null
  order_count: number
  login_count: number
  last_login_at: string | null
}

interface ExpirationResult {
  total_checked: number
  expired_count: number
  errors: Array<{ customerId: string; error: string }>
}

// Utility: Generate correlation ID
function generateCorrelationId(): string {
  return `expire-trials-${Date.now()}-${Math.random().toString(36).substring(7)}`
}

// Utility: Log sync operation
async function logSync(
  customerId: string | null,
  integration: string,
  operation: string,
  endpoint: string,
  method: string,
  requestPayload: any,
  responsePayload: any,
  status: string,
  statusCode?: number,
  errorMessage?: string,
  correlationId?: string
) {
  await supabase.from('integration_sync_log').insert({
    customer_id: customerId,
    integration,
    operation,
    endpoint,
    http_method: method,
    request_payload: requestPayload,
    response_payload: responsePayload,
    response_status_code: statusCode,
    status,
    error_message: errorMessage,
    function_name: 'sync-trial-expirations',
    correlation_id: correlationId,
  })
}

// Utility: Log activity
async function logActivity(
  customerId: string,
  eventType: string,
  description: string,
  eventData?: any
) {
  await supabase.from('customer_activity_log').insert({
    customer_id: customerId,
    event_type: eventType,
    event_description: description,
    event_data: eventData,
    source: 'sync-trial-expirations',
  })
}

// Find all expired trials
async function findExpiredTrials(): Promise<TrialCustomer[]> {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('trial_customers')
    .select('*')
    .lte('trial_end_date', today)
    .in('trial_status', ['active', 'logged_in', 'pending'])
    .order('trial_end_date', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch expired trials: ${error.message}`)
  }

  return data || []
}

// Disable Shopify discount code
async function disableShopifyDiscount(
  couponCode: string,
  customerId: string,
  correlationId: string
): Promise<boolean> {
  if (!couponCode) {
    return true // No coupon to disable
  }

  try {
    // First, find the discount code
    const searchEndpoint = `https://${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/discount_codes/lookup.json?code=${couponCode}`

    const searchResponse = await fetch(searchEndpoint, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      },
    })

    if (!searchResponse.ok) {
      console.warn(`Could not find discount code ${couponCode}`)
      return false
    }

    const searchData = await searchResponse.json()
    const priceRuleId = searchData.discount_code?.price_rule_id

    if (!priceRuleId) {
      console.warn(`No price rule found for discount code ${couponCode}`)
      return false
    }

    // Delete the price rule (this also deletes the discount code)
    const deleteEndpoint = `https://${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/price_rules/${priceRuleId}.json`

    const deleteResponse = await fetch(deleteEndpoint, {
      method: 'DELETE',
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      },
    })

    await logSync(
      customerId,
      'shopify',
      'delete',
      deleteEndpoint,
      'DELETE',
      { priceRuleId, couponCode },
      null,
      deleteResponse.ok ? 'success' : 'failed',
      deleteResponse.status,
      deleteResponse.ok ? undefined : `Failed to delete price rule ${priceRuleId}`,
      correlationId
    )

    return deleteResponse.ok
  } catch (error) {
    console.error(`Error disabling Shopify discount: ${error.message}`)
    await logSync(
      customerId,
      'shopify',
      'delete',
      'N/A',
      'DELETE',
      { couponCode },
      null,
      'failed',
      undefined,
      error.message,
      correlationId
    )
    return false
  }
}

// Update HubSpot contact to expired status
async function updateHubSpotContactExpired(
  hubspotContactId: string,
  customerId: string,
  correlationId: string
): Promise<void> {
  const endpoint = `https://api.hubapi.com/crm/v3/objects/contacts/${hubspotContactId}`

  const updatePayload = {
    properties: {
      trial_status: 'expired',
      hs_lead_status: 'TRIAL_EXPIRED',
    },
  }

  try {
    const response = await fetch(endpoint, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    })

    const data = await response.json()

    await logSync(
      customerId,
      'hubspot',
      'update',
      endpoint,
      'PATCH',
      updatePayload,
      data,
      response.ok ? 'success' : 'failed',
      response.status,
      response.ok ? undefined : data.message,
      correlationId
    )

    if (!response.ok) {
      console.warn(`HubSpot contact update failed: ${data.message}`)
    }
  } catch (error) {
    console.error(`Error updating HubSpot contact: ${error.message}`)
  }
}

// Determine if customer should be deactivated
function shouldDeactivate(customer: TrialCustomer): boolean {
  // Deactivate if:
  // 1. Never logged in (login_count = 0)
  // 2. No orders placed
  // 3. Last login was more than 14 days ago

  if (customer.login_count === 0) {
    return true
  }

  if (customer.order_count === 0) {
    return true
  }

  if (customer.last_login_at) {
    const daysSinceLogin = Math.floor(
      (Date.now() - new Date(customer.last_login_at).getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysSinceLogin > 14) {
      return true
    }
  }

  return false
}

// Process single expired trial
async function processExpiredTrial(
  customer: TrialCustomer,
  correlationId: string
): Promise<void> {
  console.log(`[${correlationId}] Processing expired trial: ${customer.email}`)

  const deactivate = shouldDeactivate(customer)
  const newStatus = deactivate ? 'deactivated' : 'expired'

  // Step 1: Disable Shopify discount code
  if (customer.trial_coupon_code) {
    console.log(`[${correlationId}] Disabling discount code: ${customer.trial_coupon_code}`)
    await disableShopifyDiscount(customer.trial_coupon_code, customer.id, correlationId)
  }

  // Step 2: Update HubSpot contact
  if (customer.hubspot_contact_id) {
    console.log(`[${correlationId}] Updating HubSpot contact status to ${newStatus}`)
    await updateHubSpotContactExpired(customer.hubspot_contact_id, customer.id, correlationId)
  }

  // Step 3: Update Supabase
  await supabase
    .from('trial_customers')
    .update({
      trial_status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', customer.id)

  // Step 4: Log activity
  await logActivity(
    customer.id,
    'trial_expired',
    `Trial expired and status changed to ${newStatus}`,
    {
      previous_status: customer.trial_status,
      new_status: newStatus,
      trial_end_date: customer.trial_end_date,
      order_count: customer.order_count,
      login_count: customer.login_count,
      deactivated: deactivate,
    }
  )

  console.log(`[${correlationId}] Trial expired successfully: ${customer.email} -> ${newStatus}`)
}

// Main handler
serve(async (req) => {
  const correlationId = generateCorrelationId()

  try {
    console.log(`[${correlationId}] Starting trial expiration sync...`)

    // Step 1: Find all expired trials
    const expiredTrials = await findExpiredTrials()
    console.log(`[${correlationId}] Found ${expiredTrials.length} expired trials`)

    if (expiredTrials.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No expired trials found',
          total_checked: 0,
          expired_count: 0,
          correlationId,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Step 2: Process each expired trial
    const result: ExpirationResult = {
      total_checked: expiredTrials.length,
      expired_count: 0,
      errors: [],
    }

    for (const customer of expiredTrials) {
      try {
        await processExpiredTrial(customer, correlationId)
        result.expired_count++
      } catch (error) {
        console.error(`[${correlationId}] Error processing ${customer.email}:`, error)
        result.errors.push({
          customerId: customer.id,
          error: error.message,
        })
      }
    }

    console.log(`[${correlationId}] Trial expiration sync complete: ${result.expired_count}/${result.total_checked} succeeded`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${result.expired_count} expired trials`,
        ...result,
        correlationId,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error(`[${correlationId}] Fatal error:`, error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        correlationId,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

// Deno cron support (if deployed on Deno Deploy)
if (Deno.env.get('DENO_DEPLOYMENT_ID')) {
  Deno.cron('expire-trials', '0 2 * * *', async () => {
    console.log('Running scheduled trial expiration sync...')
    const response = await serve(new Request('http://localhost'))
    console.log('Trial expiration sync complete:', await response.text())
  })
}
