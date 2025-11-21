// Elevate Wholesale - HubSpot to Shopify Sync Edge Function
// Creates Shopify B2B customer accounts and trial discount codes

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts'

// Constants
const SHOPIFY_API_VERSION = Deno.env.get('SHOPIFY_API_VERSION') || '2024-10'
const TRIAL_DURATION_DAYS = parseInt(Deno.env.get('TRIAL_DURATION_DAYS') || '30')
const TRIAL_DISCOUNT_VALUE = parseInt(Deno.env.get('TRIAL_DISCOUNT_VALUE') || '10')

// Environment variables
const SHOPIFY_STORE_URL = Deno.env.get('SHOPIFY_STORE_URL')!
const SHOPIFY_ACCESS_TOKEN = Deno.env.get('SHOPIFY_ACCESS_TOKEN')!
const SHOPIFY_STOREFRONT_URL = Deno.env.get('SHOPIFY_STOREFRONT_URL')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const HUBSPOT_API_KEY = Deno.env.get('HUBSPOT_API_KEY')!

// Types
interface HubSpotWebhookPayload {
  hubspotContactId?: string
  email?: string
  objectId?: string
}

interface ShopifyCustomer {
  id: string
  email: string
  admin_graphql_api_id: string
}

interface ShopifyCompany {
  id: string
  name: string
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Utility: Generate correlation ID
function generateCorrelationId(): string {
  return `hubspot-shopify-${Date.now()}-${Math.random().toString(36).substring(7)}`
}

// Utility: Generate unique discount code
function generateDiscountCode(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `TRIAL-${timestamp}${random}`
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
  const startedAt = new Date()
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
    started_at: startedAt,
    completed_at: new Date(),
    duration_ms: Date.now() - startedAt.getTime(),
    error_message: errorMessage,
    function_name: 'hubspot-to-shopify-sync',
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
    source: 'hubspot-to-shopify-sync',
  })
}

// Fetch customer from HubSpot
async function getHubSpotContact(contactId: string, correlationId: string): Promise<any> {
  const endpoint = `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}?properties=email,firstname,lastname,phone,business_name,abn,business_type,trial_end_date,hubspot_company_id`

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
      'Content-Type': 'application/json',
    },
  })

  const data = await response.json()

  await logSync(
    null,
    'hubspot',
    'read',
    endpoint,
    'GET',
    { contactId },
    data,
    response.ok ? 'success' : 'failed',
    response.status,
    response.ok ? undefined : data.message,
    correlationId
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch HubSpot contact: ${data.message}`)
  }

  return data
}

// Create Shopify B2B Company via GraphQL
async function createShopifyCompany(
  companyName: string,
  abn: string | undefined,
  hubspotCompanyId: string,
  correlationId: string
): Promise<string> {
  const endpoint = `https://${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`

  const mutation = `
    mutation companyCreate($input: CompanyCreateInput!) {
      companyCreate(input: $input) {
        company {
          id
          name
          externalId
        }
        userErrors {
          field
          message
        }
      }
    }
  `

  const variables = {
    input: {
      company: {
        name: companyName,
        externalId: hubspotCompanyId,
        note: `ABN: ${abn || 'Not provided'}. Trial account created from HubSpot.`,
      },
    },
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: mutation, variables }),
  })

  const data = await response.json()

  await logSync(
    null,
    'shopify',
    'create',
    endpoint,
    'POST',
    { mutation, variables },
    data,
    response.ok && data.data?.companyCreate?.company ? 'success' : 'failed',
    response.status,
    data.data?.companyCreate?.userErrors?.[0]?.message,
    correlationId
  )

  if (data.data?.companyCreate?.userErrors?.length > 0) {
    throw new Error(`Shopify company creation failed: ${data.data.companyCreate.userErrors[0].message}`)
  }

  return data.data.companyCreate.company.id
}

// Create Shopify Customer via GraphQL
async function createShopifyCustomer(
  email: string,
  firstName: string,
  lastName: string,
  phone: string | undefined,
  companyId: string,
  trialEndDate: string,
  hubspotContactId: string,
  correlationId: string
): Promise<string> {
  const endpoint = `https://${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`

  const mutation = `
    mutation customerCreate($input: CustomerInput!) {
      customerCreate(input: $input) {
        customer {
          id
          email
        }
        userErrors {
          field
          message
        }
      }
    }
  `

  const tags = ['trial', 'wholesale', `trial_expires_${trialEndDate}`]

  const variables = {
    input: {
      email,
      firstName,
      lastName,
      phone: phone || '',
      tags,
      note: `Trial account. HubSpot Contact ID: ${hubspotContactId}`,
      metafields: [
        {
          namespace: 'b2b',
          key: 'trial_end_date',
          value: trialEndDate,
          type: 'date',
        },
        {
          namespace: 'b2b',
          key: 'hubspot_contact_id',
          value: hubspotContactId,
          type: 'single_line_text_field',
        },
        {
          namespace: 'b2b',
          key: 'account_type',
          value: 'trial',
          type: 'single_line_text_field',
        },
      ],
    },
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: mutation, variables }),
  })

  const data = await response.json()

  await logSync(
    null,
    'shopify',
    'create',
    endpoint,
    'POST',
    { mutation, variables },
    data,
    response.ok && data.data?.customerCreate?.customer ? 'success' : 'failed',
    response.status,
    data.data?.customerCreate?.userErrors?.[0]?.message,
    correlationId
  )

  if (data.data?.customerCreate?.userErrors?.length > 0) {
    throw new Error(`Shopify customer creation failed: ${data.data.customerCreate.userErrors[0].message}`)
  }

  // Extract numeric ID from GraphQL global ID (e.g., "gid://shopify/Customer/123" -> "123")
  const gqlId = data.data.customerCreate.customer.id
  const numericId = gqlId.split('/').pop()

  return numericId
}

// Associate Customer to Company via GraphQL
async function associateCustomerToCompany(
  customerId: string,
  companyId: string,
  correlationId: string
): Promise<void> {
  const endpoint = `https://${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`

  const mutation = `
    mutation companyAssignCustomerAsContact($companyId: ID!, $customerId: ID!) {
      companyAssignCustomerAsContact(companyId: $companyId, customerId: $customerId) {
        companyContact {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `

  const variables = {
    companyId: `gid://shopify/Company/${companyId}`,
    customerId: `gid://shopify/Customer/${customerId}`,
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: mutation, variables }),
  })

  const data = await response.json()

  await logSync(
    null,
    'shopify',
    'associate',
    endpoint,
    'POST',
    { mutation, variables },
    data,
    response.ok ? 'success' : 'failed',
    response.status,
    data.data?.companyAssignCustomerAsContact?.userErrors?.[0]?.message,
    correlationId
  )

  if (data.data?.companyAssignCustomerAsContact?.userErrors?.length > 0) {
    console.warn(`Customer-company association warning: ${data.data.companyAssignCustomerAsContact.userErrors[0].message}`)
  }
}

// Create Shopify Discount Code (REST API)
async function createDiscountCode(
  customerId: string,
  trialEndDate: string,
  correlationId: string
): Promise<string> {
  const code = generateDiscountCode()
  const startsAt = new Date().toISOString()
  const endsAt = new Date(trialEndDate).toISOString()

  // Step 1: Create price rule
  const priceRuleEndpoint = `https://${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/price_rules.json`

  const priceRulePayload = {
    price_rule: {
      title: `Trial Discount - ${code}`,
      target_type: 'line_item',
      target_selection: 'all',
      allocation_method: 'across',
      value_type: 'percentage',
      value: `-${TRIAL_DISCOUNT_VALUE}.0`,
      customer_selection: 'prerequisite',
      prerequisite_customer_ids: [parseInt(customerId)],
      starts_at: startsAt,
      ends_at: endsAt,
      once_per_customer: true,
      usage_limit: 1,
    },
  }

  const priceRuleResponse = await fetch(priceRuleEndpoint, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(priceRulePayload),
  })

  const priceRuleData = await priceRuleResponse.json()

  await logSync(
    null,
    'shopify',
    'create',
    priceRuleEndpoint,
    'POST',
    priceRulePayload,
    priceRuleData,
    priceRuleResponse.ok ? 'success' : 'failed',
    priceRuleResponse.status,
    priceRuleResponse.ok ? undefined : priceRuleData.errors,
    correlationId
  )

  if (!priceRuleResponse.ok) {
    throw new Error(`Shopify price rule creation failed: ${JSON.stringify(priceRuleData.errors)}`)
  }

  const priceRuleId = priceRuleData.price_rule.id

  // Step 2: Create discount code
  const discountEndpoint = `https://${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/price_rules/${priceRuleId}/discount_codes.json`

  const discountPayload = {
    discount_code: {
      code,
    },
  }

  const discountResponse = await fetch(discountEndpoint, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(discountPayload),
  })

  const discountData = await discountResponse.json()

  await logSync(
    null,
    'shopify',
    'create',
    discountEndpoint,
    'POST',
    discountPayload,
    discountData,
    discountResponse.ok ? 'success' : 'failed',
    discountResponse.status,
    discountResponse.ok ? undefined : discountData.errors,
    correlationId
  )

  if (!discountResponse.ok) {
    throw new Error(`Shopify discount code creation failed: ${JSON.stringify(discountData.errors)}`)
  }

  return code
}

// Update HubSpot contact with Shopify details
async function updateHubSpotContact(
  contactId: string,
  shopifyCustomerId: string,
  shopifyCompanyId: string,
  couponCode: string,
  correlationId: string
): Promise<void> {
  const endpoint = `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`

  const updatePayload = {
    properties: {
      shopify_customer_id: shopifyCustomerId,
      shopify_company_id: shopifyCompanyId,
      trial_coupon_code: couponCode,
      trial_status: 'active',
      hs_lead_status: 'TRIAL_ACTIVE',
    },
  }

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
    null,
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
    throw new Error(`HubSpot contact update failed: ${data.message}`)
  }
}

// Main handler
serve(async (req) => {
  const correlationId = generateCorrelationId()

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const payload: HubSpotWebhookPayload = await req.json()
    const contactId = payload.hubspotContactId || payload.objectId

    if (!contactId) {
      return new Response(
        JSON.stringify({ error: 'Missing hubspotContactId or objectId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[${correlationId}] Processing HubSpot contact: ${contactId}`)

    // Step 1: Fetch contact from HubSpot
    console.log(`[${correlationId}] Fetching HubSpot contact...`)
    const contact = await getHubSpotContact(contactId, correlationId)
    const props = contact.properties

    // Step 2: Find customer in Supabase
    const { data: customer, error: customerError } = await supabase
      .from('trial_customers')
      .select('*')
      .eq('hubspot_contact_id', contactId)
      .single()

    if (customerError || !customer) {
      throw new Error(`Customer not found in Supabase for HubSpot contact: ${contactId}`)
    }

    console.log(`[${correlationId}] Found customer: ${customer.id}`)

    // Step 3: Create Shopify company
    console.log(`[${correlationId}] Creating Shopify company...`)
    const shopifyCompanyId = await createShopifyCompany(
      props.business_name,
      props.abn,
      customer.hubspot_company_id,
      correlationId
    )
    console.log(`[${correlationId}] Shopify company created: ${shopifyCompanyId}`)

    // Step 4: Create Shopify customer
    console.log(`[${correlationId}] Creating Shopify customer...`)
    const shopifyCustomerId = await createShopifyCustomer(
      props.email,
      props.firstname,
      props.lastname,
      props.phone,
      shopifyCompanyId,
      props.trial_end_date,
      contactId,
      correlationId
    )
    console.log(`[${correlationId}] Shopify customer created: ${shopifyCustomerId}`)

    // Step 5: Associate customer to company
    console.log(`[${correlationId}] Associating customer to company...`)
    await associateCustomerToCompany(shopifyCustomerId, shopifyCompanyId, correlationId)

    // Step 6: Create discount code
    console.log(`[${correlationId}] Creating discount code...`)
    const couponCode = await createDiscountCode(shopifyCustomerId, props.trial_end_date, correlationId)
    console.log(`[${correlationId}] Discount code created: ${couponCode}`)

    // Step 7: Update Supabase
    await supabase
      .from('trial_customers')
      .update({
        shopify_customer_id: shopifyCustomerId,
        shopify_company_id: shopifyCompanyId,
        trial_coupon_code: couponCode,
        trial_status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', customer.id)

    // Step 8: Update HubSpot
    console.log(`[${correlationId}] Updating HubSpot contact...`)
    await updateHubSpotContact(contactId, shopifyCustomerId, shopifyCompanyId, couponCode, correlationId)

    // Step 9: Log activity
    await logActivity(
      customer.id,
      'shopify_account_created',
      `Shopify B2B account and trial discount code created`,
      {
        shopify_customer_id: shopifyCustomerId,
        shopify_company_id: shopifyCompanyId,
        coupon_code: couponCode,
        trial_end_date: props.trial_end_date,
      }
    )

    return new Response(
      JSON.stringify({
        success: true,
        customerId: customer.id,
        shopifyCustomerId,
        shopifyCompanyId,
        couponCode,
        correlationId,
        loginUrl: `${SHOPIFY_STOREFRONT_URL}/account/login`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error(`[${correlationId}] Error:`, error)

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
