// Elevate Wholesale - Form Intake Edge Function
// Processes Google Form submissions and creates HubSpot contacts + companies

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Constants
const HUBSPOT_API_BASE = 'https://api.hubapi.com'
const TRIAL_DURATION_DAYS = 30

// Environment variables
const HUBSPOT_API_KEY = Deno.env.get('HUBSPOT_API_KEY')!
const HUBSPOT_TRIAL_WORKFLOW_ID = Deno.env.get('HUBSPOT_TRIAL_WORKFLOW_ID')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GOOGLE_FORM_WEBHOOK_SECRET = Deno.env.get('GOOGLE_FORM_WEBHOOK_SECRET')

// Types
interface FormSubmission {
  email: string
  firstname: string
  lastname: string
  phone?: string
  business_name: string
  abn?: string
  business_type?: 'Retail Store' | 'Online Store' | 'Both'
  website?: string
  street_address?: string
  city?: string
  state?: string
  postcode?: string
  lead_source?: string
  referral_source?: string
  product_interests?: string[]
  estimated_order_volume?: string
  webhookSecret?: string
}

interface HubSpotContact {
  id: string
  properties: Record<string, any>
}

interface HubSpotCompany {
  id: string
  properties: Record<string, any>
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Utility: Generate correlation ID for tracing
function generateCorrelationId(): string {
  return `form-${Date.now()}-${Math.random().toString(36).substring(7)}`
}

// Utility: Log integration sync
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
  functionName = 'form-intake',
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
    function_name: functionName,
    correlation_id: correlationId,
  })
}

// Utility: Log customer activity
async function logActivity(
  customerId: string,
  eventType: string,
  description: string,
  eventData?: any,
  source = 'form-intake'
) {
  await supabase.from('customer_activity_log').insert({
    customer_id: customerId,
    event_type: eventType,
    event_description: description,
    event_data: eventData,
    source,
  })
}

// Create HubSpot Contact
async function createHubSpotContact(
  formData: FormSubmission,
  correlationId: string
): Promise<HubSpotContact> {
  const endpoint = `${HUBSPOT_API_BASE}/crm/v3/objects/contacts`

  const trialStartDate = new Date()
  const trialEndDate = new Date(trialStartDate)
  trialEndDate.setDate(trialEndDate.getDate() + TRIAL_DURATION_DAYS)

  const contactProperties: Record<string, any> = {
    email: formData.email,
    firstname: formData.firstname,
    lastname: formData.lastname,
    phone: formData.phone || '',
    business_name: formData.business_name,
    abn: formData.abn || '',
    business_type: formData.business_type || '',
    website: formData.website || '',
    address: formData.street_address || '',
    city: formData.city || '',
    state: formData.state || '',
    zip: formData.postcode || '',
    country: 'Australia',

    // Trial properties
    trial_status: 'pending',
    trial_start_date: trialStartDate.toISOString().split('T')[0],
    trial_end_date: trialEndDate.toISOString().split('T')[0],

    // Lifecycle
    lifecyclestage: 'lead',
    hs_lead_status: 'NEW',

    // Lead source
    hs_lead_source: formData.lead_source || 'Google Form',
  }

  // Add optional fields if provided
  if (formData.product_interests && formData.product_interests.length > 0) {
    contactProperties.product_interests = formData.product_interests.join(';')
  }

  if (formData.estimated_order_volume) {
    contactProperties.estimated_order_volume = formData.estimated_order_volume
  }

  if (formData.referral_source) {
    contactProperties.referral_source = formData.referral_source
  }

  const requestPayload = { properties: contactProperties }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestPayload),
  })

  const responseData = await response.json()

  await logSync(
    null, // customer_id not yet available
    'hubspot',
    'create',
    endpoint,
    'POST',
    requestPayload,
    responseData,
    response.ok ? 'success' : 'failed',
    response.status,
    response.ok ? undefined : responseData.message,
    'form-intake',
    correlationId
  )

  if (!response.ok) {
    throw new Error(`HubSpot contact creation failed: ${responseData.message}`)
  }

  return responseData
}

// Create HubSpot Company
async function createHubSpotCompany(
  formData: FormSubmission,
  correlationId: string
): Promise<HubSpotCompany> {
  const endpoint = `${HUBSPOT_API_BASE}/crm/v3/objects/companies`

  const companyProperties = {
    name: formData.business_name,
    domain: formData.website || '',
    company_abn: formData.abn || '',
    industry: 'Retail',
    country: 'Australia',
    city: formData.city || '',
    state: formData.state || '',
    zip: formData.postcode || '',
    primary_contact_email: formData.email,
  }

  const requestPayload = { properties: companyProperties }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestPayload),
  })

  const responseData = await response.json()

  await logSync(
    null,
    'hubspot',
    'create',
    endpoint,
    'POST',
    requestPayload,
    responseData,
    response.ok ? 'success' : 'failed',
    response.status,
    response.ok ? undefined : responseData.message,
    'form-intake',
    correlationId
  )

  if (!response.ok) {
    throw new Error(`HubSpot company creation failed: ${responseData.message}`)
  }

  return responseData
}

// Associate Contact to Company in HubSpot
async function associateContactToCompany(
  contactId: string,
  companyId: string,
  correlationId: string
): Promise<void> {
  const endpoint = `${HUBSPOT_API_BASE}/crm/v4/objects/contacts/${contactId}/associations/companies/${companyId}`

  const requestPayload = {
    associationCategory: 'HUBSPOT_DEFINED',
    associationTypeId: 1, // Standard contact-to-company association
  }

  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestPayload),
  })

  const responseData = response.status === 200 ? await response.json() : null

  await logSync(
    null,
    'hubspot',
    'associate',
    endpoint,
    'PUT',
    requestPayload,
    responseData,
    response.ok ? 'success' : 'failed',
    response.status,
    response.ok ? undefined : 'Association failed',
    'form-intake',
    correlationId
  )

  if (!response.ok) {
    throw new Error(`HubSpot contact-company association failed`)
  }
}

// Enroll Contact in HubSpot Workflow
async function enrollInTrialWorkflow(
  contactId: string,
  correlationId: string
): Promise<void> {
  const endpoint = `${HUBSPOT_API_BASE}/automation/v4/flows/${HUBSPOT_TRIAL_WORKFLOW_ID}/enrollments/contacts/${contactId}`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
    },
  })

  const responseData = response.status !== 204 ? await response.json() : null

  await logSync(
    null,
    'hubspot',
    'enroll_workflow',
    endpoint,
    'POST',
    { contactId, workflowId: HUBSPOT_TRIAL_WORKFLOW_ID },
    responseData,
    response.ok ? 'success' : 'failed',
    response.status,
    response.ok ? undefined : 'Workflow enrollment failed',
    'form-intake',
    correlationId
  )

  if (!response.ok) {
    console.warn(`HubSpot workflow enrollment failed: ${response.status}`)
    // Don't throw - workflow enrollment is not critical
  }
}

// Store customer in Supabase
async function storeCustomer(
  formData: FormSubmission,
  hubspotContact: HubSpotContact,
  hubspotCompany: HubSpotCompany
): Promise<string> {
  const trialStartDate = new Date()
  const trialEndDate = new Date(trialStartDate)
  trialEndDate.setDate(trialEndDate.getDate() + TRIAL_DURATION_DAYS)

  const { data, error } = await supabase
    .from('trial_customers')
    .insert({
      email: formData.email,
      firstname: formData.firstname,
      lastname: formData.lastname,
      phone: formData.phone,
      business_name: formData.business_name,
      abn: formData.abn,
      business_type: formData.business_type,
      website: formData.website,
      street_address: formData.street_address,
      city: formData.city,
      state: formData.state,
      postcode: formData.postcode,
      trial_status: 'pending',
      trial_start_date: trialStartDate.toISOString(),
      trial_end_date: trialEndDate.toISOString(),
      hubspot_contact_id: hubspotContact.id,
      hubspot_company_id: hubspotCompany.id,
      lead_source: formData.lead_source || 'Google Form',
      referral_source: formData.referral_source,
      product_interests: formData.product_interests,
      estimated_order_volume: formData.estimated_order_volume,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Supabase insert failed: ${error.message}`)
  }

  return data.id
}

// Main handler
serve(async (req) => {
  const correlationId = generateCorrelationId()

  try {
    // Verify request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const formData: FormSubmission = await req.json()

    // Validate webhook secret if configured
    if (GOOGLE_FORM_WEBHOOK_SECRET && formData.webhookSecret !== GOOGLE_FORM_WEBHOOK_SECRET) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate required fields
    if (!formData.email || !formData.firstname || !formData.lastname || !formData.business_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, firstname, lastname, business_name' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[${correlationId}] Processing form submission for: ${formData.email}`)

    // Step 1: Create HubSpot Contact
    console.log(`[${correlationId}] Creating HubSpot contact...`)
    const hubspotContact = await createHubSpotContact(formData, correlationId)
    console.log(`[${correlationId}] HubSpot contact created: ${hubspotContact.id}`)

    // Step 2: Create HubSpot Company
    console.log(`[${correlationId}] Creating HubSpot company...`)
    const hubspotCompany = await createHubSpotCompany(formData, correlationId)
    console.log(`[${correlationId}] HubSpot company created: ${hubspotCompany.id}`)

    // Step 3: Associate Contact to Company
    console.log(`[${correlationId}] Associating contact to company...`)
    await associateContactToCompany(hubspotContact.id, hubspotCompany.id, correlationId)
    console.log(`[${correlationId}] Association complete`)

    // Step 4: Store in Supabase
    console.log(`[${correlationId}] Storing customer in Supabase...`)
    const customerId = await storeCustomer(formData, hubspotContact, hubspotCompany)
    console.log(`[${correlationId}] Customer stored: ${customerId}`)

    // Step 5: Log activity
    await logActivity(
      customerId,
      'account_created',
      'Trial account created from Google Form submission',
      {
        hubspot_contact_id: hubspotContact.id,
        hubspot_company_id: hubspotCompany.id,
        lead_source: formData.lead_source || 'Google Form',
      }
    )

    // Step 6: Enroll in trial workflow (optional - triggers Shopify sync)
    if (HUBSPOT_TRIAL_WORKFLOW_ID) {
      console.log(`[${correlationId}] Enrolling in trial workflow...`)
      await enrollInTrialWorkflow(hubspotContact.id, correlationId)
    }

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        customerId,
        hubspotContactId: hubspotContact.id,
        hubspotCompanyId: hubspotCompany.id,
        correlationId,
        message: 'Trial account created successfully. Welcome email will be sent shortly.',
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
