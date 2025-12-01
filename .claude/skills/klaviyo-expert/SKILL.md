# Klaviyo Expert Skill

> Expert-level Klaviyo email marketing platform management across all businesses.

---

## Skill Identity

**Name:** klaviyo-expert
**Version:** 1.0.0
**Status:** Active
**Last Updated:** 2025-12-01

---

## Capabilities

### Core Functions

1. **Campaign Management**
   - Email campaign creation
   - A/B testing setup
   - Scheduling and sending
   - Performance analysis

2. **Flow Automation**
   - Welcome series
   - Abandoned cart
   - Post-purchase
   - Win-back campaigns
   - Browse abandonment

3. **List & Segment Management**
   - List creation and maintenance
   - Advanced segmentation
   - Subscriber management
   - Suppression handling

4. **Template & Design**
   - Email template creation
   - Brand-specific styling
   - Mobile optimization
   - Dynamic content

5. **Analytics & Reporting**
   - Campaign metrics
   - Flow performance
   - Revenue attribution
   - Deliverability monitoring

---

## When to Use This Skill

### Activate For:
- "Create email campaign"
- "Klaviyo automation"
- "Email flow setup"
- "Subscriber segment"
- "Email deliverability"
- "Abandoned cart email"
- "Email template"

### Defer To:
- **email-copywriter**: Email content creation
- **customer-churn-predictor**: Churn-based targeting
- **bigcommerce-expert**: BOO integration issues
- **shopify-expert**: Teelixir integration issues

---

## Account Profiles

### BOO (Buy Organics Online)

**Platform:** Klaviyo + BigCommerce
**List Size:** Large (40,000+)
**Key Flows:**
- Welcome series (5 emails)
- Abandoned cart (3 emails)
- Post-purchase (3 emails)
- Win-back (3 emails)
- Browse abandonment

**Segments:**
- VIP customers ($500+ lifetime)
- Repeat purchasers (3+ orders)
- Organic enthusiasts (by category)
- Lapsed customers (90+ days)

### Teelixir

**Platform:** Klaviyo + Shopify
**List Size:** Medium (15,000+)
**Key Flows:**
- Welcome series (7 emails)
- Abandoned cart (3 emails)
- Post-purchase education
- Subscription reminder
- Win-back

**Segments:**
- Mushroom enthusiasts
- Subscription customers
- First-time buyers
- Health practitioners

### RHF (Red Hill Fresh)

**Platform:** Klaviyo + WooCommerce
**List Size:** Small (5,000+)
**Key Flows:**
- Welcome + first order
- Weekly specials
- Delivery reminder
- Reorder prompts

**Segments:**
- Local delivery zone
- Weekly subscribers
- Seasonal produce fans

---

## Klaviyo API Reference

### Authentication

```typescript
const config = {
  apiKey: process.env.KLAVIYO_API_KEY,  // Private API key
  publicKey: process.env.KLAVIYO_PUBLIC_KEY,  // Site ID
  revision: '2024-02-15'  // API revision date
}

const headers = {
  'Authorization': `Klaviyo-API-Key ${config.apiKey}`,
  'revision': config.revision,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
}

const baseUrl = 'https://a.klaviyo.com/api'
```

### Common Endpoints

| Resource | Endpoint | Methods |
|----------|----------|---------|
| Profiles | /profiles | GET, POST, PATCH |
| Lists | /lists | GET, POST |
| Segments | /segments | GET, POST |
| Campaigns | /campaigns | GET, POST |
| Flows | /flows | GET |
| Templates | /templates | GET, POST |
| Events | /events | POST |
| Metrics | /metrics | GET |

### Rate Limits

| Endpoint Type | Limit |
|---------------|-------|
| General | 75 requests/second |
| Bulk operations | 350 requests/second (burst) |
| Profile imports | 10,000/batch |

---

## Profile Management

### Profile Structure

```typescript
interface KlaviyoProfile {
  type: 'profile'
  id?: string
  attributes: {
    email: string
    phone_number?: string
    external_id?: string
    first_name?: string
    last_name?: string
    organization?: string
    title?: string
    location?: {
      address1?: string
      address2?: string
      city?: string
      region?: string
      zip?: string
      country?: string
    }
    properties?: Record<string, any>
  }
}
```

### Create/Update Profile

```typescript
async function upsertProfile(profile: Partial<KlaviyoProfile>) {
  const response = await fetch(`${baseUrl}/profiles`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ data: profile })
  })
  return response.json()
}
```

### Get Profile by Email

```typescript
async function getProfileByEmail(email: string) {
  const response = await fetch(
    `${baseUrl}/profiles?filter=equals(email,"${email}")`,
    { headers }
  )
  return response.json()
}
```

### Update Profile Properties

```typescript
async function updateProfileProperties(profileId: string, properties: Record<string, any>) {
  const response = await fetch(`${baseUrl}/profiles/${profileId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      data: {
        type: 'profile',
        id: profileId,
        attributes: { properties }
      }
    })
  })
  return response.json()
}
```

---

## List Management

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

### Add Profiles to List

```typescript
async function addToList(listId: string, profileIds: string[]) {
  const response = await fetch(`${baseUrl}/lists/${listId}/relationships/profiles`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: profileIds.map(id => ({ type: 'profile', id }))
    })
  })
  return response.json()
}
```

### Subscribe to List

```typescript
async function subscribeToList(listId: string, email: string, properties?: Record<string, any>) {
  const response = await fetch(`${baseUrl}/lists/${listId}/relationships/profiles`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: [{
        type: 'profile',
        attributes: {
          email,
          properties,
          subscriptions: {
            email: { marketing: { consent: 'SUBSCRIBED' } }
          }
        }
      }]
    })
  })
  return response.json()
}
```

---

## Segmentation

### Segment Conditions

```typescript
interface SegmentCondition {
  type: 'profile-property' | 'metric' | 'list-membership' | 'predictive'
  property?: string
  operator: 'equals' | 'contains' | 'greater-than' | 'less-than' | 'exists' | 'does-not-exist'
  value?: any
}
```

### Common Segment Examples

```json
// VIP Customers ($500+ lifetime value)
{
  "definition": {
    "condition_groups": [{
      "conditions": [{
        "type": "metric",
        "metric_id": "placed_order",
        "operator": "greater-than",
        "measurement": "sum",
        "property": "value",
        "value": 500
      }]
    }]
  }
}

// Engaged Subscribers (opened in last 30 days)
{
  "definition": {
    "condition_groups": [{
      "conditions": [{
        "type": "metric",
        "metric_id": "opened_email",
        "operator": "greater-than",
        "measurement": "count",
        "value": 0,
        "timeframe": { "type": "relative", "value": 30, "unit": "days" }
      }]
    }]
  }
}

// Abandoned Cart (cart created, no order in 1 hour)
{
  "definition": {
    "condition_groups": [{
      "conditions": [
        {
          "type": "metric",
          "metric_id": "added_to_cart",
          "operator": "greater-than",
          "value": 0,
          "timeframe": { "type": "relative", "value": 24, "unit": "hours" }
        },
        {
          "type": "metric",
          "metric_id": "placed_order",
          "operator": "equals",
          "value": 0,
          "timeframe": { "type": "relative", "value": 24, "unit": "hours" }
        }
      ]
    }]
  }
}
```

---

## Flow Automation

### Flow Types

| Flow Type | Trigger | Purpose |
|-----------|---------|---------|
| Welcome Series | List subscription | Onboard new subscribers |
| Abandoned Cart | Added to cart | Recover abandoned carts |
| Browse Abandonment | Viewed product | Re-engage browsers |
| Post-Purchase | Placed order | Build loyalty |
| Win-Back | Lapsed customer | Re-activate |
| Sunset | Inactive | Clean list |

### Flow Best Practices

**Welcome Series (7 emails):**
```
Email 1: Welcome + discount (immediate)
Email 2: Brand story (Day 2)
Email 3: Best sellers (Day 4)
Email 4: Social proof (Day 7)
Email 5: Category spotlight (Day 10)
Email 6: Values/mission (Day 14)
Email 7: Final discount reminder (Day 21)
```

**Abandoned Cart (3 emails):**
```
Email 1: Reminder (1 hour)
Email 2: Benefits + urgency (24 hours)
Email 3: Final call + discount (48 hours)
```

**Post-Purchase (3 emails):**
```
Email 1: Thank you + tips (immediate)
Email 2: Usage education (3 days)
Email 3: Review request (7 days)
```

---

## Campaign Management

### Create Campaign

```typescript
async function createCampaign(campaign: {
  name: string
  listIds: string[]
  templateId: string
  subject: string
  previewText?: string
  fromEmail: string
  fromName: string
}) {
  const response = await fetch(`${baseUrl}/campaigns`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: {
        type: 'campaign',
        attributes: {
          name: campaign.name,
          audiences: {
            included: campaign.listIds.map(id => ({ type: 'list', id })),
            excluded: []
          },
          send_strategy: { method: 'static' },
          message: {
            channel: 'email',
            label: campaign.name,
            content: {
              template_id: campaign.templateId,
              subject: campaign.subject,
              preview_text: campaign.previewText,
              from_email: campaign.fromEmail,
              from_name: campaign.fromName
            }
          }
        }
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

---

## Event Tracking

### Track Event

```typescript
async function trackEvent(event: {
  email: string
  metric: string
  properties?: Record<string, any>
  value?: number
  time?: Date
}) {
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
              attributes: { email: event.email }
            }
          },
          properties: event.properties || {},
          value: event.value,
          time: (event.time || new Date()).toISOString()
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
await trackEvent({
  email: 'customer@example.com',
  metric: 'Viewed Product',
  properties: {
    ProductName: 'Lion\'s Mane Extract',
    ProductID: '12345',
    SKU: 'TLX-LM-100',
    Categories: ['Mushroom Extracts'],
    ImageURL: 'https://...',
    URL: 'https://...',
    Price: 49.95
  }
})

// Added to Cart
await trackEvent({
  email: 'customer@example.com',
  metric: 'Added to Cart',
  properties: {
    ProductName: 'Lion\'s Mane Extract',
    ProductID: '12345',
    Quantity: 1,
    Price: 49.95
  },
  value: 49.95
})

// Placed Order
await trackEvent({
  email: 'customer@example.com',
  metric: 'Placed Order',
  properties: {
    OrderId: 'ORD-1234',
    Items: [{ ProductName: '...', Quantity: 1, Price: 49.95 }],
    ItemCount: 1,
    Discount: 0
  },
  value: 49.95
})
```

---

## Templates

### Template Variables

```html
<!-- Profile properties -->
{{ first_name|default:'there' }}
{{ email }}

<!-- Event properties -->
{{ event.ProductName }}
{{ event.Price|floatformat:2 }}

<!-- Dynamic content -->
{% if subscriber.custom_property %}
  Show this content
{% endif %}

<!-- Product blocks -->
{% for item in event.Items %}
  <div>{{ item.ProductName }} - ${{ item.Price }}</div>
{% endfor %}
```

### Brand-Specific Styles

**BOO:**
```css
.header { background: #4CAF50; }
.button { background: #2E7D32; color: white; }
.text { font-family: 'Open Sans', sans-serif; }
```

**Teelixir:**
```css
.header { background: #1a1a2e; }
.button { background: #e94560; color: white; }
.text { font-family: 'Montserrat', sans-serif; }
```

**RHF:**
```css
.header { background: #8B4513; }
.button { background: #228B22; color: white; }
.text { font-family: 'Georgia', serif; }
```

---

## Analytics & Reporting

### Get Campaign Metrics

```typescript
async function getCampaignMetrics(campaignId: string) {
  const response = await fetch(
    `${baseUrl}/campaigns/${campaignId}/campaign-values`,
    { headers }
  )
  return response.json()
}
```

### Key Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| Open Rate | % opened | 20-30% |
| Click Rate | % clicked | 2-5% |
| Conversion Rate | % ordered | 0.5-2% |
| Revenue per Email | $ earned | Varies |
| Unsubscribe Rate | % unsub | <0.5% |
| Bounce Rate | % bounced | <2% |
| Spam Rate | % spam | <0.1% |

### Deliverability Monitoring

```
Daily Checks:
[ ] Open rates normal
[ ] Bounce rate under 2%
[ ] Spam complaints under 0.1%
[ ] No blacklist issues

Weekly Checks:
[ ] List hygiene (remove bounces)
[ ] Engagement segments
[ ] Domain reputation
[ ] Authentication (SPF/DKIM/DMARC)
```

---

## Integration Points

### E-commerce Platforms

**BigCommerce (BOO):**
- Native integration
- Syncs: Customers, Orders, Products
- Real-time abandoned cart

**Shopify (Teelixir):**
- Native integration
- Syncs: Customers, Orders, Products
- Browse tracking enabled

**WooCommerce (RHF):**
- Plugin integration
- Manual event tracking for some features

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Low open rates | Subject lines, timing | A/B test, optimize send times |
| High unsubscribes | Frequency, relevance | Segment better, reduce sends |
| Deliverability issues | List hygiene | Clean list, warm up domain |
| Flow not triggering | Integration issue | Check triggers, re-sync |

### Debug Checklist

```
[ ] Verify API key permissions
[ ] Check profile exists in Klaviyo
[ ] Confirm event is being tracked
[ ] Review flow trigger conditions
[ ] Check for suppression
[ ] Verify email content renders
```

---

## Skill Documentation

| Document | Purpose |
|----------|---------|
| `QUICK-REFERENCE.md` | Quick API reference |
| `context/API-GUIDE.md` | Detailed API docs |
| `playbooks/FLOWS.md` | Flow best practices |
| `scripts/klaviyo-client.ts` | API client |

---

**Skill Level:** Expert (Level 3)
**Confidence:** 95%
