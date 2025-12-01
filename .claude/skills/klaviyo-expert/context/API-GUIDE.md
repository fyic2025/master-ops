# Klaviyo API Guide

## Overview

Klaviyo provides a REST API for managing email marketing, profiles, events, and automations. The API uses JSON:API specification.

---

## Authentication

### API Keys

1. Go to Account > Settings > API Keys
2. Create Private API Key
3. Set appropriate scopes

### Request Headers

```typescript
const config = {
  apiKey: process.env.KLAVIYO_API_KEY,
  revision: '2024-02-15'  // API version
}

const headers = {
  'Authorization': `Klaviyo-API-Key ${config.apiKey}`,
  'revision': config.revision,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
}

const baseUrl = 'https://a.klaviyo.com/api'
```

### Required Scopes

| Scope | Description |
|-------|-------------|
| profiles:read | Read profiles |
| profiles:write | Create/update profiles |
| lists:read | Read lists |
| lists:write | Manage lists |
| campaigns:read | Read campaigns |
| campaigns:write | Create/send campaigns |
| flows:read | Read flows |
| events:write | Track events |
| metrics:read | Read metrics |

---

## Profiles API

### Get Profiles

```typescript
async function getProfiles(params?: {
  page?: { cursor?: string; size?: number }
  filter?: string
  sort?: string
}) {
  const query = new URLSearchParams()
  if (params?.page?.size) query.set('page[size]', String(params.page.size))
  if (params?.page?.cursor) query.set('page[cursor]', params.page.cursor)
  if (params?.filter) query.set('filter', params.filter)

  const response = await fetch(`${baseUrl}/profiles?${query}`, { headers })
  return response.json()
}
```

### Get Profile by ID

```typescript
async function getProfile(id: string) {
  const response = await fetch(`${baseUrl}/profiles/${id}`, { headers })
  return response.json()
}
```

### Get Profile by Email

```typescript
async function getProfileByEmail(email: string) {
  const response = await fetch(
    `${baseUrl}/profiles?filter=equals(email,"${encodeURIComponent(email)}")`,
    { headers }
  )
  return response.json()
}
```

### Create Profile

```typescript
interface ProfileAttributes {
  email: string
  phone_number?: string
  external_id?: string
  first_name?: string
  last_name?: string
  organization?: string
  title?: string
  image?: string
  location?: {
    address1?: string
    address2?: string
    city?: string
    region?: string
    zip?: string
    country?: string
    latitude?: number
    longitude?: number
    timezone?: string
  }
  properties?: Record<string, any>
}

async function createProfile(attributes: ProfileAttributes) {
  const response = await fetch(`${baseUrl}/profiles`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: {
        type: 'profile',
        attributes
      }
    })
  })
  return response.json()
}
```

### Update Profile

```typescript
async function updateProfile(id: string, attributes: Partial<ProfileAttributes>) {
  const response = await fetch(`${baseUrl}/profiles/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      data: {
        type: 'profile',
        id,
        attributes
      }
    })
  })
  return response.json()
}
```

### Suppress Profile

```typescript
async function suppressProfile(email: string) {
  const response = await fetch(`${baseUrl}/profile-suppression-bulk-create-jobs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: {
        type: 'profile-suppression-bulk-create-job',
        attributes: {
          profiles: {
            data: [{
              type: 'profile',
              attributes: { email }
            }]
          }
        }
      }
    })
  })
  return response.json()
}
```

---

## Lists API

### Get Lists

```typescript
async function getLists() {
  const response = await fetch(`${baseUrl}/lists`, { headers })
  return response.json()
}
```

### Get List

```typescript
async function getList(id: string) {
  const response = await fetch(`${baseUrl}/lists/${id}`, { headers })
  return response.json()
}
```

### Create List

```typescript
async function createList(name: string) {
  const response = await fetch(`${baseUrl}/lists`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: {
        type: 'list',
        attributes: { name }
      }
    })
  })
  return response.json()
}
```

### Get List Profiles

```typescript
async function getListProfiles(listId: string) {
  const response = await fetch(
    `${baseUrl}/lists/${listId}/profiles`,
    { headers }
  )
  return response.json()
}
```

### Add Profiles to List

```typescript
async function addProfilesToList(listId: string, profileIds: string[]) {
  const response = await fetch(
    `${baseUrl}/lists/${listId}/relationships/profiles`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        data: profileIds.map(id => ({ type: 'profile', id }))
      })
    }
  )
  return response.json()
}
```

### Subscribe to List (with consent)

```typescript
async function subscribeToList(listId: string, profiles: Array<{
  email: string
  phone_number?: string
  first_name?: string
  last_name?: string
  properties?: Record<string, any>
}>) {
  const response = await fetch(
    `${baseUrl}/lists/${listId}/relationships/profiles`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        data: profiles.map(p => ({
          type: 'profile',
          attributes: {
            ...p,
            subscriptions: {
              email: {
                marketing: {
                  consent: 'SUBSCRIBED'
                }
              }
            }
          }
        }))
      })
    }
  )
  return response.json()
}
```

### Remove from List

```typescript
async function removeFromList(listId: string, profileIds: string[]) {
  const response = await fetch(
    `${baseUrl}/lists/${listId}/relationships/profiles`,
    {
      method: 'DELETE',
      headers,
      body: JSON.stringify({
        data: profileIds.map(id => ({ type: 'profile', id }))
      })
    }
  )
  return response.status === 204
}
```

---

## Segments API

### Get Segments

```typescript
async function getSegments() {
  const response = await fetch(`${baseUrl}/segments`, { headers })
  return response.json()
}
```

### Get Segment Profiles

```typescript
async function getSegmentProfiles(segmentId: string) {
  const response = await fetch(
    `${baseUrl}/segments/${segmentId}/profiles`,
    { headers }
  )
  return response.json()
}
```

### Create Segment

```typescript
async function createSegment(segment: {
  name: string
  definition: {
    condition_groups: Array<{
      conditions: Array<{
        type: string
        property?: string
        metric_id?: string
        operator: string
        value?: any
        timeframe?: { type: string; value: number; unit: string }
      }>
    }>
  }
}) {
  const response = await fetch(`${baseUrl}/segments`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: {
        type: 'segment',
        attributes: segment
      }
    })
  })
  return response.json()
}
```

---

## Events API

### Create Event

```typescript
interface EventData {
  metric: string
  profile: { email: string } | { id: string }
  properties?: Record<string, any>
  value?: number
  unique_id?: string
  time?: string  // ISO 8601
}

async function createEvent(event: EventData) {
  const response = await fetch(`${baseUrl}/events`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: {
        type: 'event',
        attributes: {
          metric: {
            data: {
              type: 'metric',
              attributes: { name: event.metric }
            }
          },
          profile: {
            data: {
              type: 'profile',
              attributes: 'email' in event.profile
                ? { email: event.profile.email }
                : { id: event.profile.id }
            }
          },
          properties: event.properties || {},
          value: event.value,
          unique_id: event.unique_id,
          time: event.time || new Date().toISOString()
        }
      }
    })
  })
  return response.json()
}
```

### Standard E-commerce Events

```typescript
// Viewed Product
async function trackViewedProduct(email: string, product: {
  ProductID: string
  ProductName: string
  SKU: string
  Categories: string[]
  ImageURL: string
  URL: string
  Price: number
  CompareAtPrice?: number
}) {
  return createEvent({
    metric: 'Viewed Product',
    profile: { email },
    properties: product
  })
}

// Added to Cart
async function trackAddedToCart(email: string, item: {
  ProductID: string
  ProductName: string
  SKU: string
  Quantity: number
  Price: number
  ImageURL: string
  URL: string
}) {
  return createEvent({
    metric: 'Added to Cart',
    profile: { email },
    properties: item,
    value: item.Price * item.Quantity
  })
}

// Started Checkout
async function trackStartedCheckout(email: string, checkout: {
  CheckoutURL: string
  ItemCount: number
  Items: Array<{ ProductName: string; SKU: string; Quantity: number; Price: number }>
}) {
  const value = checkout.Items.reduce((sum, item) => sum + item.Price * item.Quantity, 0)
  return createEvent({
    metric: 'Started Checkout',
    profile: { email },
    properties: checkout,
    value
  })
}

// Placed Order
async function trackPlacedOrder(email: string, order: {
  OrderId: string
  Items: Array<{ ProductName: string; SKU: string; Quantity: number; Price: number }>
  ItemCount: number
  DiscountCode?: string
  DiscountValue?: number
  ShippingCost?: number
}) {
  const subtotal = order.Items.reduce((sum, item) => sum + item.Price * item.Quantity, 0)
  const value = subtotal - (order.DiscountValue || 0)

  return createEvent({
    metric: 'Placed Order',
    profile: { email },
    properties: order,
    value,
    unique_id: order.OrderId
  })
}

// Fulfilled Order
async function trackFulfilledOrder(email: string, fulfillment: {
  OrderId: string
  TrackingNumber?: string
  TrackingCompany?: string
  TrackingURL?: string
}) {
  return createEvent({
    metric: 'Fulfilled Order',
    profile: { email },
    properties: fulfillment,
    unique_id: `${fulfillment.OrderId}_fulfilled`
  })
}
```

---

## Campaigns API

### Get Campaigns

```typescript
async function getCampaigns(params?: {
  filter?: string
  sort?: string
}) {
  const query = new URLSearchParams()
  if (params?.filter) query.set('filter', params.filter)
  if (params?.sort) query.set('sort', params.sort)

  const response = await fetch(`${baseUrl}/campaigns?${query}`, { headers })
  return response.json()
}
```

### Get Campaign

```typescript
async function getCampaign(id: string) {
  const response = await fetch(`${baseUrl}/campaigns/${id}`, { headers })
  return response.json()
}
```

### Create Campaign

```typescript
async function createCampaign(campaign: {
  name: string
  audiences: {
    included: Array<{ type: 'list' | 'segment'; id: string }>
    excluded?: Array<{ type: 'list' | 'segment'; id: string }>
  }
  send_strategy: { method: 'static' | 'smart_sending' }
  message: {
    channel: 'email' | 'sms'
    label: string
    content: {
      template_id?: string
      subject?: string
      preview_text?: string
      from_email?: string
      from_name?: string
      reply_to_email?: string
    }
  }
}) {
  const response = await fetch(`${baseUrl}/campaigns`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: {
        type: 'campaign',
        attributes: campaign
      }
    })
  })
  return response.json()
}
```

### Schedule Campaign

```typescript
async function scheduleCampaign(campaignId: string, sendTime: Date) {
  const response = await fetch(`${baseUrl}/campaigns/${campaignId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      data: {
        type: 'campaign',
        id: campaignId,
        attributes: {
          send_time: sendTime.toISOString()
        }
      }
    })
  })
  return response.json()
}
```

### Send Campaign Now

```typescript
async function sendCampaignNow(campaignId: string) {
  const response = await fetch(`${baseUrl}/campaign-send-jobs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: {
        type: 'campaign-send-job',
        attributes: {
          campaign_id: campaignId
        }
      }
    })
  })
  return response.json()
}
```

---

## Flows API

### Get Flows

```typescript
async function getFlows() {
  const response = await fetch(`${baseUrl}/flows`, { headers })
  return response.json()
}
```

### Get Flow

```typescript
async function getFlow(id: string) {
  const response = await fetch(
    `${baseUrl}/flows/${id}?include=flow-actions`,
    { headers }
  )
  return response.json()
}
```

### Update Flow Status

```typescript
async function updateFlowStatus(flowId: string, status: 'live' | 'draft' | 'manual') {
  const response = await fetch(`${baseUrl}/flows/${flowId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      data: {
        type: 'flow',
        id: flowId,
        attributes: { status }
      }
    })
  })
  return response.json()
}
```

---

## Templates API

### Get Templates

```typescript
async function getTemplates() {
  const response = await fetch(`${baseUrl}/templates`, { headers })
  return response.json()
}
```

### Create Template

```typescript
async function createTemplate(template: {
  name: string
  html: string
  text?: string
}) {
  const response = await fetch(`${baseUrl}/templates`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: {
        type: 'template',
        attributes: template
      }
    })
  })
  return response.json()
}
```

---

## Metrics API

### Get Metrics

```typescript
async function getMetrics() {
  const response = await fetch(`${baseUrl}/metrics`, { headers })
  return response.json()
}
```

### Query Metric Aggregates

```typescript
async function queryMetricAggregates(metricId: string, params: {
  measurement: 'count' | 'sum' | 'unique'
  interval?: 'day' | 'week' | 'month'
  filter?: string
  page_size?: number
}) {
  const response = await fetch(`${baseUrl}/metric-aggregates`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: {
        type: 'metric-aggregate',
        attributes: {
          metric_id: metricId,
          ...params
        }
      }
    })
  })
  return response.json()
}
```

---

## Pagination

### Cursor-Based Pagination

```typescript
async function getAllProfiles() {
  const allProfiles = []
  let cursor: string | undefined

  do {
    const url = cursor
      ? `${baseUrl}/profiles?page[cursor]=${cursor}&page[size]=100`
      : `${baseUrl}/profiles?page[size]=100`

    const response = await fetch(url, { headers })
    const data = await response.json()

    allProfiles.push(...data.data)
    cursor = data.links?.next ? new URL(data.links.next).searchParams.get('page[cursor]') : undefined
  } while (cursor)

  return allProfiles
}
```

---

## Error Handling

### Error Response Format

```json
{
  "errors": [{
    "id": "uuid",
    "code": "invalid",
    "title": "Invalid field",
    "detail": "Email is required",
    "source": { "pointer": "/data/attributes/email" }
  }]
}
```

### Error Handler

```typescript
async function handleKlaviyoResponse(response: Response) {
  if (!response.ok) {
    const error = await response.json()
    const messages = error.errors?.map((e: any) => e.detail).join('; ') || 'Unknown error'
    throw new Error(`Klaviyo Error: ${messages}`)
  }
  return response.json()
}
```

---

## Rate Limiting

### Limits

| Type | Limit |
|------|-------|
| Standard | 75 requests/second |
| Burst | 350 requests/second |
| Daily | Varies by plan |

### Rate Limit Headers

```
RateLimit-Limit: 75
RateLimit-Remaining: 74
RateLimit-Reset: 1
Retry-After: 1
```

### Rate Limit Handler

```typescript
async function rateLimitedFetch(url: string, options: RequestInit) {
  const response = await fetch(url, options)

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After') || '1')
    await new Promise(r => setTimeout(r, retryAfter * 1000))
    return rateLimitedFetch(url, options)
  }

  return response
}
```
