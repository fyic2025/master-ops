// Elevate Wholesale - Shopify to Unleashed Sync Edge Function
// Processes Shopify orders and creates sales orders in Unleashed

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts'

// Environment variables
const SHOPIFY_WEBHOOK_SECRET = Deno.env.get('SHOPIFY_WEBHOOK_SECRET')
const UNLEASHED_API_ID = Deno.env.get('UNLEASHED_API_ID')!
const UNLEASHED_API_KEY = Deno.env.get('UNLEASHED_API_KEY')!
const UNLEASHED_API_URL = Deno.env.get('UNLEASHED_API_URL') || 'https://api.unleashedsoftware.com'
const HUBSPOT_API_KEY = Deno.env.get('HUBSPOT_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Types
interface ShopifyOrder {
  id: number
  email: string
  created_at: string
  total_price: string
  financial_status: string
  fulfillment_status: string | null
  customer: {
    id: number
    email: string
    first_name: string
    last_name: string
  }
  line_items: Array<{
    id: number
    title: string
    sku: string
    quantity: number
    price: string
  }>
  shipping_address?: {
    address1: string
    address2?: string
    city: string
    province: string
    zip: string
    country: string
  }
}

// Utility: Generate correlation ID
function generateCorrelationId(): string {
  return `shopify-unleashed-${Date.now()}-${Math.random().toString(36).substring(7)}`
}

// Utility: Generate HMAC signature for Unleashed API
function generateUnleashedSignature(args: string): string {
  const hmac = createHmac('sha256', UNLEASHED_API_KEY)
  hmac.update(args)
  return hmac.digest('base64')
}

// Utility: Verify Shopify webhook HMAC
function verifyShopifyWebhook(body: string, hmacHeader: string | null): boolean {
  if (!SHOPIFY_WEBHOOK_SECRET || !hmacHeader) {
    console.warn('Shopify webhook secret not configured or HMAC header missing')
    return true // Skip verification if not configured
  }

  const hmac = createHmac('sha256', SHOPIFY_WEBHOOK_SECRET)
  hmac.update(body)
  const digest = hmac.digest('base64')

  return digest === hmacHeader
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
    function_name: 'shopify-to-unleashed-sync',
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
    source: 'shopify-to-unleashed-sync',
  })
}

// Find customer in Supabase by Shopify customer ID
async function findCustomer(shopifyCustomerId: string): Promise<any | null> {
  const { data, error } = await supabase
    .from('trial_customers')
    .select('*')
    .eq('shopify_customer_id', shopifyCustomerId.toString())
    .single()

  if (error) {
    console.warn(`Customer not found for Shopify ID ${shopifyCustomerId}: ${error.message}`)
    return null
  }

  return data
}

// Create or get Unleashed customer
async function ensureUnleashedCustomer(
  customer: any,
  correlationId: string
): Promise<string> {
  // If we already have an Unleashed customer code, return it
  if (customer.unleashed_customer_code) {
    return customer.unleashed_customer_code
  }

  // Create new Unleashed customer
  const endpoint = `${UNLEASHED_API_URL}/Customers`
  const customerCode = `TRIAL-${customer.id.substring(0, 8)}`

  const requestPayload = {
    CustomerCode: customerCode,
    CustomerName: customer.business_name,
    Email: customer.email,
    ContactName: `${customer.firstname} ${customer.lastname}`,
    PhoneNumber: customer.phone || '',
    MobileNumber: customer.phone || '',
    Address1: customer.street_address || '',
    City: customer.city || '',
    Region: customer.state || '',
    PostalCode: customer.postcode || '',
    Country: 'Australia',
    Notes: `Trial account - ABN: ${customer.abn || 'N/A'}. Created from Shopify order.`,
    CustomerType: 'B2B',
  }

  const args = `${UNLEASHED_API_ID}${JSON.stringify(requestPayload)}`
  const signature = generateUnleashedSignature(args)

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'api-auth-id': UNLEASHED_API_ID,
      'api-auth-signature': signature,
    },
    body: JSON.stringify(requestPayload),
  })

  const data = await response.json()

  await logSync(
    customer.id,
    'unleashed',
    'create',
    endpoint,
    'POST',
    requestPayload,
    data,
    response.ok ? 'success' : 'failed',
    response.status,
    response.ok ? undefined : data.Description,
    correlationId
  )

  if (!response.ok) {
    throw new Error(`Unleashed customer creation failed: ${data.Description}`)
  }

  // Update Supabase with Unleashed customer details
  await supabase
    .from('trial_customers')
    .update({
      unleashed_customer_code: customerCode,
      unleashed_customer_guid: data.Guid,
    })
    .eq('id', customer.id)

  return customerCode
}

// Create Unleashed sales order
async function createUnleashedSalesOrder(
  customerCode: string,
  order: ShopifyOrder,
  correlationId: string,
  customerId: string
): Promise<any> {
  const endpoint = `${UNLEASHED_API_URL}/SalesOrders`

  const requestPayload = {
    CustomerCode: customerCode,
    OrderDate: new Date(order.created_at).toISOString(),
    RequiredDate: new Date(order.created_at).toISOString(),
    Comments: `Shopify Order #${order.id}. Email: ${order.email}`,
    ExternalReference: order.id.toString(),
    OrderStatus: order.financial_status === 'paid' ? 'Completed' : 'Parked',
    DeliveryMethod: 'Standard Shipping',
    SalesOrderLines: order.line_items.map((item) => ({
      ProductCode: item.sku || `SHOPIFY-${item.id}`,
      ProductDescription: item.title,
      OrderQuantity: item.quantity,
      UnitPrice: parseFloat(item.price),
      LineTotal: item.quantity * parseFloat(item.price),
    })),
  }

  // Add delivery address if available
  if (order.shipping_address) {
    requestPayload['DeliveryName'] = `${order.customer.first_name} ${order.customer.last_name}`
    requestPayload['DeliveryStreetAddress'] = order.shipping_address.address1
    requestPayload['DeliveryStreetAddress2'] = order.shipping_address.address2 || ''
    requestPayload['DeliveryCity'] = order.shipping_address.city
    requestPayload['DeliveryRegion'] = order.shipping_address.province
    requestPayload['DeliveryPostalCode'] = order.shipping_address.zip
    requestPayload['DeliveryCountry'] = order.shipping_address.country
  }

  const args = `${UNLEASHED_API_ID}${JSON.stringify(requestPayload)}`
  const signature = generateUnleashedSignature(args)

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'api-auth-id': UNLEASHED_API_ID,
      'api-auth-signature': signature,
    },
    body: JSON.stringify(requestPayload),
  })

  const data = await response.json()

  await logSync(
    customerId,
    'unleashed',
    'create',
    endpoint,
    'POST',
    requestPayload,
    data,
    response.ok ? 'success' : 'failed',
    response.status,
    response.ok ? undefined : data.Description,
    correlationId
  )

  if (!response.ok) {
    throw new Error(`Unleashed sales order creation failed: ${data.Description}`)
  }

  return data
}

// Update HubSpot contact with order data
async function updateHubSpotContact(
  hubspotContactId: string,
  orderCount: number,
  totalSpent: number,
  correlationId: string
): Promise<void> {
  const endpoint = `https://api.hubapi.com/crm/v3/objects/contacts/${hubspotContactId}`

  const updatePayload = {
    properties: {
      trial_orders_count: orderCount,
      trial_total_spent: totalSpent.toFixed(2),
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
    console.warn(`HubSpot contact update failed: ${data.message}`)
  }
}

// Create HubSpot deal for first order
async function createHubSpotDeal(
  hubspotContactId: string,
  hubspotCompanyId: string,
  businessName: string,
  orderValue: number,
  correlationId: string
): Promise<void> {
  const endpoint = 'https://api.hubapi.com/crm/v3/objects/deals'

  const dealPayload = {
    properties: {
      dealname: `Trial Conversion - ${businessName}`,
      amount: orderValue.toString(),
      dealstage: 'active_trial', // Custom deal stage
      pipeline: 'trial_conversion', // Custom pipeline
      closedate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    associations: [
      {
        to: { id: hubspotContactId },
        types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }], // Contact-to-deal
      },
      {
        to: { id: hubspotCompanyId },
        types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 5 }], // Company-to-deal
      },
    ],
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dealPayload),
  })

  const data = await response.json()

  await logSync(
    null,
    'hubspot',
    'create',
    endpoint,
    'POST',
    dealPayload,
    data,
    response.ok ? 'success' : 'failed',
    response.status,
    response.ok ? undefined : data.message,
    correlationId
  )

  if (!response.ok) {
    console.warn(`HubSpot deal creation failed: ${data.message}`)
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

    // Get raw body for HMAC verification
    const body = await req.text()
    const hmacHeader = req.headers.get('x-shopify-hmac-sha256')

    // Verify Shopify webhook
    if (!verifyShopifyWebhook(body, hmacHeader)) {
      return new Response(
        JSON.stringify({ error: 'Invalid webhook signature' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const order: ShopifyOrder = JSON.parse(body)

    console.log(`[${correlationId}] Processing Shopify order #${order.id}`)

    // Step 1: Find customer in Supabase
    const customer = await findCustomer(order.customer.id.toString())

    if (!customer) {
      console.log(`[${correlationId}] Customer not found in trial system, skipping sync`)
      return new Response(
        JSON.stringify({ success: true, message: 'Not a trial customer, no sync needed' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[${correlationId}] Found customer: ${customer.id}`)

    // Step 2: Ensure Unleashed customer exists
    console.log(`[${correlationId}] Ensuring Unleashed customer...`)
    const unleashedCustomerCode = await ensureUnleashedCustomer(customer, correlationId)
    console.log(`[${correlationId}] Unleashed customer code: ${unleashedCustomerCode}`)

    // Step 3: Create Unleashed sales order
    console.log(`[${correlationId}] Creating Unleashed sales order...`)
    const unleashedOrder = await createUnleashedSalesOrder(
      unleashedCustomerCode,
      order,
      correlationId,
      customer.id
    )
    console.log(`[${correlationId}] Unleashed sales order created: ${unleashedOrder.Guid}`)

    // Step 4: Update Supabase customer metrics
    const newOrderCount = (customer.order_count || 0) + 1
    const newTotalSpent = (customer.total_order_value || 0) + parseFloat(order.total_price)

    await supabase
      .from('trial_customers')
      .update({
        order_count: newOrderCount,
        total_order_value: newTotalSpent,
        trial_status: 'logged_in', // Placing an order implies they logged in
      })
      .eq('id', customer.id)

    // Step 5: Update HubSpot contact
    if (customer.hubspot_contact_id) {
      console.log(`[${correlationId}] Updating HubSpot contact...`)
      await updateHubSpotContact(
        customer.hubspot_contact_id,
        newOrderCount,
        newTotalSpent,
        correlationId
      )

      // Create HubSpot deal on first order
      if (newOrderCount === 1 && customer.hubspot_company_id) {
        console.log(`[${correlationId}] Creating HubSpot deal for first order...`)
        await createHubSpotDeal(
          customer.hubspot_contact_id,
          customer.hubspot_company_id,
          customer.business_name,
          parseFloat(order.total_price),
          correlationId
        )
      }
    }

    // Step 6: Log activity
    await logActivity(
      customer.id,
      'order_placed',
      `Shopify order #${order.id} placed and synced to Unleashed`,
      {
        shopify_order_id: order.id,
        unleashed_order_guid: unleashedOrder.Guid,
        order_value: parseFloat(order.total_price),
        order_count: newOrderCount,
        total_spent: newTotalSpent,
      }
    )

    return new Response(
      JSON.stringify({
        success: true,
        customerId: customer.id,
        shopifyOrderId: order.id,
        unleashedOrderGuid: unleashedOrder.Guid,
        correlationId,
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
