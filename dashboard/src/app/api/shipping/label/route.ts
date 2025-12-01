import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSenderAddress } from '@/lib/sender-addresses'

export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// AusPost API configuration
const AUSPOST_API_URL = 'https://digitalapi.auspost.com.au'

function getAusPostCredentials(businessCode: string) {
  const apiKey = process.env.AUSPOST_API_KEY || ''
  const apiSecret = process.env.AUSPOST_API_SECRET || ''

  let accountNumber: string
  switch (businessCode) {
    case 'teelixir':
      accountNumber = process.env.TEELIXIR_AUSPOST_ACCOUNT || ''
      break
    case 'boo':
      accountNumber = process.env.BOO_AUSPOST_ACCOUNT || ''
      break
    case 'elevate':
      accountNumber = process.env.ELEVATE_AUSPOST_ACCOUNT || ''
      break
    default:
      accountNumber = ''
  }

  const authHeader = 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')

  return { accountNumber, authHeader }
}

// Sendle API configuration
const SENDLE_API_URL = 'https://api.sendle.com/api'

function getSendleCredentials(businessCode: string) {
  const sendleId = process.env.SENDLE_ID || ''

  let apiKey: string
  switch (businessCode) {
    case 'teelixir':
      apiKey = process.env.TEELIXIR_SENDLE_API_KEY || ''
      break
    case 'boo':
      apiKey = process.env.BOO_SENDLE_API_KEY || ''
      break
    default:
      apiKey = ''
  }

  const authHeader = 'Basic ' + Buffer.from(`${sendleId}:${apiKey}`).toString('base64')

  return { authHeader }
}

// Create AusPost shipment
async function createAusPostShipment(
  order: any,
  sender: any,
  weightKg: number,
  dimensions: { length: number; width: number; height: number },
  serviceCode: string,
  businessCode: string
) {
  const { accountNumber, authHeader } = getAusPostCredentials(businessCode)

  if (!accountNumber) {
    throw new Error(`AusPost account not configured for ${businessCode}`)
  }

  const shipmentData = {
    shipments: [{
      shipment_reference: order.source_order_number || order.source_order_id,
      customer_reference_1: order.id,
      email_tracking_enabled: true,
      from: {
        name: sender.name,
        business_name: sender.businessName,
        lines: [sender.address1, sender.address2].filter(Boolean),
        suburb: sender.city,
        state: sender.state,
        postcode: sender.postcode,
        country: sender.country,
        phone: sender.phone,
        email: sender.email
      },
      to: {
        name: order.ship_to_name || order.customer_name,
        lines: [order.ship_to_address1, order.ship_to_address2].filter(Boolean),
        suburb: order.ship_to_city,
        state: order.ship_to_state,
        postcode: order.ship_to_postcode,
        country: order.ship_to_country || 'AU',
        phone: order.customer_phone,
        email: order.customer_email
      },
      items: [{
        product_id: serviceCode,
        length: dimensions.length,
        width: dimensions.width,
        height: dimensions.height,
        weight: weightKg,
        authority_to_leave: false
      }]
    }]
  }

  const response = await fetch(`${AUSPOST_API_URL}/shipping/v1/shipments`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Account-Number': accountNumber,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(shipmentData)
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const errorMsg = errorData.errors?.map((e: any) => e.message).join(', ') || `AusPost API error: ${response.status}`
    throw new Error(errorMsg)
  }

  const data = await response.json()
  const shipment = data.shipments[0]
  const trackingNumber = shipment.items[0]?.tracking_details?.article_id

  return {
    shipmentId: shipment.shipment_id,
    trackingNumber
  }
}

// Generate AusPost label
async function generateAusPostLabel(
  shipmentId: string,
  businessCode: string,
  format: string = 'PDF_100x150'
): Promise<{ url: string; zplData?: string }> {
  const { accountNumber, authHeader } = getAusPostCredentials(businessCode)

  const labelRequest = {
    shipments: [{ shipment_id: shipmentId }],
    preferences: {
      type: 'PRINT',
      format,
      branded: false
    }
  }

  const response = await fetch(`${AUSPOST_API_URL}/shipping/v1/labels`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Account-Number': accountNumber,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(labelRequest)
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.errors?.map((e: any) => e.message).join(', ') || 'Label generation failed')
  }

  const data = await response.json()
  const label = data.labels[0]

  if (label.status === 'ERROR') {
    throw new Error(label.errors?.map((e: any) => e.message).join(', ') || 'Label generation failed')
  }

  // If ZPL format, fetch the actual ZPL data
  let zplData: string | undefined
  if (format.startsWith('ZPL') && label.url) {
    try {
      const zplResponse = await fetch(label.url)
      if (zplResponse.ok) {
        zplData = await zplResponse.text()
      }
    } catch (err) {
      console.error('Failed to fetch ZPL data:', err)
    }
  }

  return { url: label.url, zplData }
}

// Update BigCommerce order with tracking
async function updateBigCommerceOrder(
  sourceOrderId: string,
  trackingNumber: string,
  carrier: string
): Promise<boolean> {
  const storeHash = process.env.BIGCOMMERCE_STORE_HASH
  const accessToken = process.env.BIGCOMMERCE_ACCESS_TOKEN

  if (!storeHash || !accessToken) {
    console.log('BigCommerce credentials not configured')
    return false
  }

  try {
    // Get order addresses to find shipping address ID
    const addressRes = await fetch(
      `https://api.bigcommerce.com/stores/${storeHash}/v2/orders/${sourceOrderId}/shipping_addresses`,
      {
        headers: {
          'X-Auth-Token': accessToken,
          'Accept': 'application/json'
        }
      }
    )

    if (!addressRes.ok) {
      console.error('Failed to get BC shipping addresses:', addressRes.status)
      return false
    }

    const addresses = await addressRes.json()
    const shippingAddressId = addresses[0]?.id

    if (!shippingAddressId) {
      console.error('No shipping address found')
      return false
    }

    // Create shipment with tracking
    const carrierName = carrier === 'auspost' ? 'Australia Post' : carrier === 'sendle' ? 'Sendle' : carrier
    const trackingUrl = carrier === 'auspost'
      ? `https://auspost.com.au/mypost/track/#/details/${trackingNumber}`
      : carrier === 'sendle'
        ? `https://track.sendle.com/tracking?ref=${trackingNumber}`
        : ''

    const shipmentRes = await fetch(
      `https://api.bigcommerce.com/stores/${storeHash}/v2/orders/${sourceOrderId}/shipments`,
      {
        method: 'POST',
        headers: {
          'X-Auth-Token': accessToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          order_address_id: shippingAddressId,
          tracking_number: trackingNumber,
          shipping_provider: carrierName,
          tracking_carrier: carrierName,
          tracking_link: trackingUrl,
          items: [] // Empty = ship all items
        })
      }
    )

    if (!shipmentRes.ok) {
      const error = await shipmentRes.text()
      console.error('Failed to create BC shipment:', error)
      return false
    }

    console.log(`BigCommerce order ${sourceOrderId} updated with tracking ${trackingNumber}`)
    return true

  } catch (error) {
    console.error('Error updating BigCommerce order:', error)
    return false
  }
}

// Update Shopify order with tracking
async function updateShopifyOrder(
  sourceOrderId: string,
  trackingNumber: string,
  carrier: string,
  businessCode: string
): Promise<boolean> {
  const shopDomain = businessCode === 'teelixir'
    ? process.env.TEELIXIR_SHOPIFY_DOMAIN
    : process.env.ELEVATE_SHOPIFY_DOMAIN
  const accessToken = businessCode === 'teelixir'
    ? process.env.TEELIXIR_SHOPIFY_ACCESS_TOKEN
    : process.env.ELEVATE_SHOPIFY_ACCESS_TOKEN

  if (!shopDomain || !accessToken) {
    console.log(`Shopify credentials not configured for ${businessCode}`)
    return false
  }

  try {
    // Get order to find fulfillment order ID
    const orderRes = await fetch(
      `https://${shopDomain}/admin/api/2024-01/orders/${sourceOrderId}.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!orderRes.ok) {
      console.error('Failed to get Shopify order:', orderRes.status)
      return false
    }

    const orderData = await orderRes.json()
    const lineItems = orderData.order?.line_items || []

    if (lineItems.length === 0) {
      console.error('No line items found')
      return false
    }

    // Get fulfillment orders
    const fulfillmentOrdersRes = await fetch(
      `https://${shopDomain}/admin/api/2024-01/orders/${sourceOrderId}/fulfillment_orders.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!fulfillmentOrdersRes.ok) {
      console.error('Failed to get fulfillment orders:', fulfillmentOrdersRes.status)
      return false
    }

    const foData = await fulfillmentOrdersRes.json()
    const fulfillmentOrder = foData.fulfillment_orders?.[0]

    if (!fulfillmentOrder) {
      console.error('No fulfillment order found')
      return false
    }

    // Create fulfillment with tracking
    const carrierName = carrier === 'auspost' ? 'Australia Post' : carrier === 'sendle' ? 'Sendle' : carrier
    const trackingUrl = carrier === 'auspost'
      ? `https://auspost.com.au/mypost/track/#/details/${trackingNumber}`
      : carrier === 'sendle'
        ? `https://track.sendle.com/tracking?ref=${trackingNumber}`
        : ''

    const fulfillmentRes = await fetch(
      `https://${shopDomain}/admin/api/2024-01/fulfillments.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fulfillment: {
            line_items_by_fulfillment_order: [{
              fulfillment_order_id: fulfillmentOrder.id
            }],
            tracking_info: {
              number: trackingNumber,
              company: carrierName,
              url: trackingUrl
            },
            notify_customer: true
          }
        })
      }
    )

    if (!fulfillmentRes.ok) {
      const error = await fulfillmentRes.text()
      console.error('Failed to create Shopify fulfillment:', error)
      return false
    }

    console.log(`Shopify order ${sourceOrderId} fulfilled with tracking ${trackingNumber}`)
    return true

  } catch (error) {
    console.error('Error updating Shopify order:', error)
    return false
  }
}

// Update source platform with tracking
async function updateSourcePlatform(
  order: any,
  trackingNumber: string,
  carrier: string
): Promise<boolean> {
  switch (order.source) {
    case 'bigcommerce':
      return updateBigCommerceOrder(order.source_order_id, trackingNumber, carrier)
    case 'shopify':
      return updateShopifyOrder(order.source_order_id, trackingNumber, carrier, order.business_code)
    default:
      console.log(`Unknown source platform: ${order.source}`)
      return false
  }
}

// Create Sendle order
async function createSendleOrder(
  order: any,
  sender: any,
  weightKg: number,
  dimensions: { length: number; width: number; height: number },
  serviceCode: string,
  businessCode: string
) {
  const { authHeader } = getSendleCredentials(businessCode)

  const orderData = {
    sender: {
      contact: {
        name: sender.name,
        company: sender.businessName,
        email: sender.email,
        phone: sender.phone
      },
      address_line1: sender.address1,
      address_line2: sender.address2,
      suburb: sender.city,
      state_name: sender.state,
      postcode: sender.postcode,
      country: sender.country
    },
    receiver: {
      contact: {
        name: order.ship_to_name || order.customer_name,
        email: order.customer_email,
        phone: order.customer_phone
      },
      address_line1: order.ship_to_address1,
      address_line2: order.ship_to_address2,
      suburb: order.ship_to_city,
      state_name: order.ship_to_state,
      postcode: order.ship_to_postcode,
      country: order.ship_to_country || 'AU'
    },
    description: `Order ${order.source_order_number || order.source_order_id}`,
    weight: {
      value: weightKg,
      units: 'kg'
    },
    dimensions: {
      length: dimensions.length,
      width: dimensions.width,
      height: dimensions.height,
      units: 'cm'
    },
    product_code: serviceCode,
    customer_reference: order.id
  }

  const response = await fetch(`${SENDLE_API_URL}/orders`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'MasterOps/1.0'
    },
    body: JSON.stringify(orderData)
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error_description || `Sendle API error: ${response.status}`)
  }

  const data = await response.json()

  // Find the cropped PDF label
  const label = data.labels?.find((l: any) => l.format === 'pdf' && l.size === 'cropped')
    || data.labels?.[0]

  return {
    orderId: data.order_id,
    trackingNumber: data.sendle_reference,
    labelUrl: label?.url,
    trackingUrl: data.tracking_url
  }
}

// Request body type
interface LabelRequest {
  orderId: string
  weightGrams: number
  dimensions: {
    length: number
    width: number
    height: number
  }
  carrier: 'auspost' | 'sendle'
  serviceCode: string
  labelFormat?: 'PDF' | 'ZPL'
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase()

  try {
    const body: LabelRequest = await request.json()
    const { orderId, weightGrams, dimensions, carrier, serviceCode, labelFormat = 'PDF' } = body

    // Validate required fields
    if (!orderId || !weightGrams || !dimensions || !carrier || !serviceCode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get order from database
    const { data: order, error: orderError } = await supabase
      .from('shipping_orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Get sender address
    const sender = getSenderAddress(order.business_code)
    if (!sender) {
      return NextResponse.json(
        { error: `Sender address not configured for ${order.business_code}` },
        { status: 400 }
      )
    }

    // Convert weight to kg
    const weightKg = weightGrams / 1000

    let trackingNumber: string = ''
    let labelUrl: string = ''
    let shipmentId: string = ''
    let zplData: string | undefined

    if (carrier === 'auspost') {
      // Create AusPost shipment
      const shipment = await createAusPostShipment(
        order,
        sender,
        weightKg,
        dimensions,
        serviceCode,
        order.business_code
      )
      shipmentId = shipment.shipmentId
      trackingNumber = shipment.trackingNumber

      // Generate label - always use ZPL for Zebra
      const format = 'ZPL_100x150'
      const labelResult = await generateAusPostLabel(shipmentId, order.business_code, format)
      labelUrl = labelResult.url
      zplData = labelResult.zplData

    } else if (carrier === 'sendle') {
      // Create Sendle order - request ZPL format
      const sendleOrder = await createSendleOrder(
        order,
        sender,
        weightKg,
        dimensions,
        serviceCode,
        order.business_code
      )
      shipmentId = sendleOrder.orderId
      trackingNumber = sendleOrder.trackingNumber

      // Default to the label URL from order creation
      labelUrl = sendleOrder.labelUrl || ''

      // Try to get ZPL label separately
      const { authHeader } = getSendleCredentials(order.business_code)
      try {
        const zplRes = await fetch(`${SENDLE_API_URL}/orders/${sendleOrder.orderId}`, {
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/json',
            'User-Agent': 'MasterOps/1.0'
          }
        })
        if (zplRes.ok) {
          const orderData = await zplRes.json()
          const zplLabel = orderData.labels?.find((l: any) => l.format === 'zpl')
          if (zplLabel?.url) {
            labelUrl = zplLabel.url
            const zplDataRes = await fetch(zplLabel.url)
            if (zplDataRes.ok) {
              zplData = await zplDataRes.text()
            }
          } else {
            // Fall back to PDF if no ZPL
            const pdfLabel = orderData.labels?.find((l: any) => l.format === 'pdf' && l.size === 'cropped')
            if (pdfLabel?.url) {
              labelUrl = pdfLabel.url
            }
          }
        }
      } catch (err) {
        console.error('Failed to get Sendle ZPL label:', err)
      }

    } else {
      return NextResponse.json(
        { error: `Unknown carrier: ${carrier}` },
        { status: 400 }
      )
    }

    // Update source platform with tracking (BigCommerce/Shopify)
    let platformUpdated = false
    try {
      platformUpdated = await updateSourcePlatform(order, trackingNumber, carrier)
    } catch (err) {
      console.error('Failed to update source platform:', err)
      // Don't fail - label was created, platform update is secondary
    }

    // Update order in database - mark as shipped since we're updating platform
    const { error: updateError } = await supabase
      .from('shipping_orders')
      .update({
        status: 'shipped',
        carrier,
        service_code: serviceCode,
        tracking_number: trackingNumber,
        label_url: labelUrl,
        total_weight_grams: weightGrams,
        shipped_at: new Date().toISOString(),
        label_data: {
          shipment_id: shipmentId,
          dimensions,
          platform_updated: platformUpdated,
          created_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (updateError) {
      console.error('Failed to update order:', updateError)
      // Don't fail the request, label was created successfully
    }

    return NextResponse.json({
      success: true,
      trackingNumber,
      labelUrl,
      zplData, // Include ZPL data for direct Zebra printing
      shipmentId,
      carrier,
      serviceCode,
      platformUpdated
    })

  } catch (error: any) {
    console.error('Label creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create label' },
      { status: 500 }
    )
  }
}
