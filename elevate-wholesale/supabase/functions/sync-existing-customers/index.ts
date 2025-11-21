// Elevate Wholesale - Sync Existing Customers Edge Function
// One-time migration to sync existing customers across HubSpot, Shopify, and Unleashed

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Environment variables
const HUBSPOT_API_KEY = Deno.env.get('HUBSPOT_API_KEY')!
const SHOPIFY_STORE_URL = Deno.env.get('SHOPIFY_STORE_URL')!
const SHOPIFY_ACCESS_TOKEN = Deno.env.get('SHOPIFY_ACCESS_TOKEN')!
const SHOPIFY_API_VERSION = Deno.env.get('SHOPIFY_API_VERSION') || '2024-10'
const UNLEASHED_API_ID = Deno.env.get('UNLEASHED_API_ID')!
const UNLEASHED_API_KEY = Deno.env.get('UNLEASHED_API_KEY')!
const UNLEASHED_API_URL = Deno.env.get('UNLEASHED_API_URL') || 'https://api.unleashedsoftware.com'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Types
interface HubSpotContact {
  id: string
  properties: {
    email: string
    firstname?: string
    lastname?: string
    phone?: string
    business_name?: string
    shopify_customer_id?: string
    unleashed_customer_code?: string
    [key: string]: any
  }
}

interface ShopifyCustomer {
  id: number
  email: string
  first_name: string
  last_name: string
  phone?: string
  tags: string
  created_at: string
  orders_count: number
  total_spent: string
}

interface SyncResult {
  total_hubspot: number
  total_shopify: number
  matched: number
  hubspot_updated: number
  supabase_created: number
  errors: Array<{ email: string; error: string }>
}

// Utility: Generate correlation ID
function generateCorrelationId(): string {
  return `sync-existing-${Date.now()}-${Math.random().toString(36).substring(7)}`
}

// Utility: Delay for rate limiting
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Fetch all HubSpot contacts
async function fetchAllHubSpotContacts(): Promise<HubSpotContact[]> {
  const contacts: HubSpotContact[] = []
  let after: string | undefined

  do {
    const url = after
      ? `https://api.hubapi.com/crm/v3/objects/contacts?limit=100&after=${after}&properties=email,firstname,lastname,phone,business_name,shopify_customer_id,unleashed_customer_code,lifecyclestage`
      : `https://api.hubapi.com/crm/v3/objects/contacts?limit=100&properties=email,firstname,lastname,phone,business_name,shopify_customer_id,unleashed_customer_code,lifecyclestage`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch HubSpot contacts: ${response.statusText}`)
    }

    const data = await response.json()
    contacts.push(...data.results)

    after = data.paging?.next?.after

    // Rate limiting: Wait 100ms between requests
    if (after) {
      await delay(100)
    }
  } while (after)

  return contacts
}

// Fetch all Shopify customers
async function fetchAllShopifyCustomers(): Promise<ShopifyCustomer[]> {
  const customers: ShopifyCustomer[] = []
  let nextPageInfo: string | undefined

  do {
    const url = nextPageInfo
      ? `https://${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/customers.json?limit=250&page_info=${nextPageInfo}`
      : `https://${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/customers.json?limit=250`

    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch Shopify customers: ${response.statusText}`)
    }

    const data = await response.json()
    customers.push(...data.customers)

    // Get next page link from Link header
    const linkHeader = response.headers.get('link')
    if (linkHeader && linkHeader.includes('rel="next"')) {
      const match = linkHeader.match(/page_info=([^&>]+)/)
      nextPageInfo = match ? match[1] : undefined
    } else {
      nextPageInfo = undefined
    }

    // Rate limiting: Shopify allows 2 requests per second
    if (nextPageInfo) {
      await delay(500)
    }
  } while (nextPageInfo)

  return customers
}

// Match HubSpot contacts with Shopify customers by email
function matchCustomers(
  hubspotContacts: HubSpotContact[],
  shopifyCustomers: ShopifyCustomer[]
): Map<string, { hubspot: HubSpotContact; shopify?: ShopifyCustomer }> {
  const matched = new Map<string, { hubspot: HubSpotContact; shopify?: ShopifyCustomer }>()

  // Create email-based lookup for Shopify customers
  const shopifyByEmail = new Map<string, ShopifyCustomer>()
  for (const customer of shopifyCustomers) {
    if (customer.email) {
      shopifyByEmail.set(customer.email.toLowerCase(), customer)
    }
  }

  // Match HubSpot contacts
  for (const contact of hubspotContacts) {
    const email = contact.properties.email?.toLowerCase()
    if (!email) continue

    const shopifyCustomer = shopifyByEmail.get(email)
    matched.set(email, {
      hubspot: contact,
      shopify: shopifyCustomer,
    })
  }

  return matched
}

// Update HubSpot contact with Shopify ID
async function updateHubSpotContact(
  contactId: string,
  shopifyCustomerId: string,
  correlationId: string
): Promise<boolean> {
  const endpoint = `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`

  const updatePayload = {
    properties: {
      shopify_customer_id: shopifyCustomerId.toString(),
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

    if (!response.ok) {
      console.warn(`Failed to update HubSpot contact ${contactId}: ${response.statusText}`)
      return false
    }

    return true
  } catch (error) {
    console.error(`Error updating HubSpot contact ${contactId}:`, error.message)
    return false
  }
}

// Store customer in Supabase (for existing customers who are not trials)
async function storeExistingCustomer(
  hubspotContact: HubSpotContact,
  shopifyCustomer: ShopifyCustomer | undefined
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('trial_customers')
      .upsert({
        email: hubspotContact.properties.email,
        firstname: hubspotContact.properties.firstname || shopifyCustomer?.first_name || '',
        lastname: hubspotContact.properties.lastname || shopifyCustomer?.last_name || '',
        phone: hubspotContact.properties.phone || shopifyCustomer?.phone || '',
        business_name: hubspotContact.properties.business_name || '',
        trial_status: 'converted', // Existing customers are considered converted
        hubspot_contact_id: hubspotContact.id,
        shopify_customer_id: shopifyCustomer?.id.toString(),
        order_count: shopifyCustomer?.orders_count || 0,
        total_order_value: shopifyCustomer ? parseFloat(shopifyCustomer.total_spent) : 0,
        created_at: shopifyCustomer?.created_at || new Date().toISOString(),
        lead_source: 'Existing Customer Sync',
      }, {
        onConflict: 'email',
      })

    if (error) {
      console.warn(`Failed to store customer ${hubspotContact.properties.email}:`, error.message)
      return false
    }

    return true
  } catch (error) {
    console.error(`Error storing customer:`, error.message)
    return false
  }
}

// Main handler
serve(async (req) => {
  const correlationId = generateCorrelationId()

  try {
    console.log(`[${correlationId}] Starting existing customer sync...`)

    const result: SyncResult = {
      total_hubspot: 0,
      total_shopify: 0,
      matched: 0,
      hubspot_updated: 0,
      supabase_created: 0,
      errors: [],
    }

    // Step 1: Fetch all HubSpot contacts
    console.log(`[${correlationId}] Fetching HubSpot contacts...`)
    const hubspotContacts = await fetchAllHubSpotContacts()
    result.total_hubspot = hubspotContacts.length
    console.log(`[${correlationId}] Found ${result.total_hubspot} HubSpot contacts`)

    // Step 2: Fetch all Shopify customers
    console.log(`[${correlationId}] Fetching Shopify customers...`)
    const shopifyCustomers = await fetchAllShopifyCustomers()
    result.total_shopify = shopifyCustomers.length
    console.log(`[${correlationId}] Found ${result.total_shopify} Shopify customers`)

    // Step 3: Match customers by email
    console.log(`[${correlationId}] Matching customers by email...`)
    const matchedCustomers = matchCustomers(hubspotContacts, shopifyCustomers)
    result.matched = matchedCustomers.size
    console.log(`[${correlationId}] Matched ${result.matched} customers`)

    // Step 4: Process each matched customer
    console.log(`[${correlationId}] Processing matched customers...`)
    let processed = 0

    for (const [email, { hubspot, shopify }] of matchedCustomers) {
      try {
        // Update HubSpot with Shopify ID if missing
        if (shopify && !hubspot.properties.shopify_customer_id) {
          const updated = await updateHubSpotContact(
            hubspot.id,
            shopify.id.toString(),
            correlationId
          )
          if (updated) {
            result.hubspot_updated++
          }

          // Rate limiting for HubSpot API
          await delay(100)
        }

        // Store in Supabase for analytics
        const stored = await storeExistingCustomer(hubspot, shopify)
        if (stored) {
          result.supabase_created++
        }

        processed++
        if (processed % 100 === 0) {
          console.log(`[${correlationId}] Processed ${processed}/${result.matched} customers...`)
        }

      } catch (error) {
        console.error(`[${correlationId}] Error processing ${email}:`, error.message)
        result.errors.push({
          email,
          error: error.message,
        })
      }
    }

    console.log(`[${correlationId}] Sync complete!`)
    console.log(`[${correlationId}] HubSpot updated: ${result.hubspot_updated}`)
    console.log(`[${correlationId}] Supabase created: ${result.supabase_created}`)
    console.log(`[${correlationId}] Errors: ${result.errors.length}`)

    // Log sync summary to database
    await supabase.from('customer_activity_log').insert({
      customer_id: null,
      event_type: 'bulk_sync',
      event_description: 'Existing customer sync completed',
      event_data: result,
      source: 'sync-existing-customers',
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Existing customer sync completed',
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
