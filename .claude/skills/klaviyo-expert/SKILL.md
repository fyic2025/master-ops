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

## Multi-Account Configuration

This skill supports **3 active Klaviyo accounts** with real credential integration:

### Credential Loading

```javascript
// Load credentials from vault
const creds = require('../../../../creds');

// Load BOO credentials
await creds.load('boo');
// Sets: process.env.BOO_KLAVIYO_API_KEY

// Load Teelixir credentials
await creds.load('teelixir');
// Sets: process.env.TEELIXIR_KLAVIYO_API_KEY

// Load Elevate credentials
await creds.load('elevate');
// Sets: process.env.ELEVATE_KLAVIYO_API_KEY
```

### Account Selection

When executing operations, always specify which account:

```bash
# Using scripts
ACCOUNT=boo npx tsx scripts/klaviyo-client.ts profiles --recent
ACCOUNT=teelixir npx tsx scripts/klaviyo-client.ts campaigns --list
ACCOUNT=elevate npx tsx scripts/klaviyo-client.ts flows --list
```

---

## Account Profiles

### 1. BOO (Buy Organics Online)

**Platform:** Klaviyo + BigCommerce
**Credential:** `BOO_KLAVIYO_API_KEY`
**List Size:** Large (40,000+)
**Integration:** Native BigCommerce
**Project Code:** `boo`

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

**Credential Access:**
```javascript
await creds.load('boo');
const apiKey = process.env.BOO_KLAVIYO_API_KEY;
```

### 2. Teelixir

**Platform:** Klaviyo + Shopify
**Credential:** `TEELIXIR_KLAVIYO_API_KEY`
**List Size:** Medium (15,000+)
**Integration:** Native Shopify
**Project Code:** `teelixir`

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

**Credential Access:**
```javascript
await creds.load('teelixir');
const apiKey = process.env.TEELIXIR_KLAVIYO_API_KEY;
```

### 3. Elevate Wholesale

**Platform:** Klaviyo + Shopify
**Credential:** `ELEVATE_KLAVIYO_API_KEY`
**List Size:** Small (3,000+)
**Integration:** Native Shopify
**Project Code:** `elevate`
**Business Model:** B2B Wholesale

**Key Flows:**
- B2B welcome series
- Bulk order follow-up
- Reorder reminders
- Quarterly check-ins
- Trade show follow-up

**Segments:**
- Active wholesale accounts
- High-value retailers
- Inactive accounts (90+ days)
- First-time wholesale buyers
- Distributor partners

**Credential Access:**
```javascript
await creds.load('elevate');
const apiKey = process.env.ELEVATE_KLAVIYO_API_KEY;
```

### Account Comparison

| Feature | BOO | Teelixir | Elevate |
|---------|-----|----------|---------|
| Platform | BigCommerce | Shopify | Shopify |
| List Size | 40,000+ | 15,000+ | 3,000+ |
| Business Model | B2C Retail | B2C eCommerce | B2B Wholesale |
| Primary Focus | Organic products | Mushroom extracts | Wholesale distribution |
| Key Metric | Order frequency | Subscription retention | Account value |

---

## Klaviyo API Reference

### Authentication

#### Multi-Account Setup

```typescript
// Load credentials for specific account
const creds = require('../../../../creds');

// Determine which account to use
const account = process.env.ACCOUNT || 'boo'; // Default to BOO

// Load account credentials
await creds.load(account);

// Get the appropriate API key
const API_KEY_MAP = {
  boo: process.env.BOO_KLAVIYO_API_KEY,
  teelixir: process.env.TEELIXIR_KLAVIYO_API_KEY,
  elevate: process.env.ELEVATE_KLAVIYO_API_KEY
};

const config = {
  account: account,
  apiKey: API_KEY_MAP[account],
  revision: '2024-02-15',
  baseUrl: 'https://a.klaviyo.com/api'
}

const headers = {
  'Authorization': `Klaviyo-API-Key ${config.apiKey}`,
  'revision': config.revision,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
}
```

#### Single Account (Legacy)

```typescript
const config = {
  apiKey: process.env.KLAVIYO_API_KEY,  // Private API key
  revision: '2024-02-15'
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

## Usage Examples

### Example 1: Load Credentials and Query Profiles

```javascript
// Load BOO credentials from vault
const creds = require('../../../../creds');
await creds.load('boo');

// API key is now available
const apiKey = process.env.BOO_KLAVIYO_API_KEY;

// Make API request
const response = await fetch('https://a.klaviyo.com/api/profiles?page[size]=10', {
  headers: {
    'Authorization': `Klaviyo-API-Key ${apiKey}`,
    'revision': '2024-02-15'
  }
});

const data = await response.json();
console.log(`Found ${data.data.length} profiles`);
```

### Example 2: Multi-Account Campaign Comparison

```bash
# Compare campaign performance across all accounts
node scripts/klaviyo.js boo campaigns --list > boo-campaigns.txt
node scripts/klaviyo.js teelixir campaigns --list > teelixir-campaigns.txt
node scripts/klaviyo.js elevate campaigns --list > elevate-campaigns.txt
```

### Example 3: Segment Creation for Each Account

```javascript
const creds = require('../../../../creds');

async function createVIPSegmentForAccount(account) {
  await creds.load(account);

  const apiKeyMap = {
    boo: process.env.BOO_KLAVIYO_API_KEY,
    teelixir: process.env.TEELIXIR_KLAVIYO_API_KEY,
    elevate: process.env.ELEVATE_KLAVIYO_API_KEY
  };

  const apiKey = apiKeyMap[account];

  // Create VIP segment with account-specific criteria
  const vipThreshold = {
    boo: 500,      // $500+ for BOO
    teelixir: 300, // $300+ for Teelixir
    elevate: 2000  // $2000+ for B2B Elevate
  };

  const segmentDef = {
    definition: {
      condition_groups: [{
        conditions: [{
          type: "metric",
          metric_id: "placed_order",
          operator: "greater-than",
          measurement: "sum",
          property: "value",
          value: vipThreshold[account]
        }]
      }]
    }
  };

  console.log(`Creating VIP segment for ${account} (threshold: $${vipThreshold[account]})`);
  // ... API call to create segment
}
```

### Example 4: Using the CLI Wrapper

```bash
# Search for a customer across all accounts
node scripts/klaviyo.js boo profiles --search customer@example.com
node scripts/klaviyo.js teelixir profiles --search customer@example.com
node scripts/klaviyo.js elevate profiles --search customer@example.com

# View recent flows for each account
node scripts/klaviyo.js boo flows --list
node scripts/klaviyo.js teelixir flows --list
node scripts/klaviyo.js elevate flows --list

# Check campaign status
ACCOUNT=boo node scripts/klaviyo.js campaigns --status sent
ACCOUNT=teelixir node scripts/klaviyo.js campaigns --status scheduled
```

### Example 5: Programmatic Event Tracking

```javascript
const creds = require('../../../../creds');

async function trackBulkOrderEvent(account, orderData) {
  await creds.load(account);

  const apiKeyMap = {
    boo: process.env.BOO_KLAVIYO_API_KEY,
    teelixir: process.env.TEELIXIR_KLAVIYO_API_KEY,
    elevate: process.env.ELEVATE_KLAVIYO_API_KEY
  };

  await fetch('https://a.klaviyo.com/api/events', {
    method: 'POST',
    headers: {
      'Authorization': `Klaviyo-API-Key ${apiKeyMap[account]}`,
      'revision': '2024-02-15',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      data: {
        type: 'event',
        attributes: {
          metric: {
            data: {
              type: 'metric',
              attributes: { name: 'Placed Order' }
            }
          },
          profile: {
            data: {
              type: 'profile',
              attributes: { email: orderData.email }
            }
          },
          properties: orderData,
          value: orderData.total
        }
      }
    })
  });
}

// Track order for BOO
await trackBulkOrderEvent('boo', {
  email: 'customer@example.com',
  orderId: 'BOO-12345',
  total: 89.99
});
```

---

## Skill Documentation

| Document | Purpose |
|----------|---------|
| `QUICK-REFERENCE.md` | Quick API reference with multi-account setup |
| `context/API-GUIDE.md` | Detailed API docs |
| `playbooks/FLOWS.md` | Flow best practices |
| `scripts/klaviyo-client.ts` | Multi-account TypeScript API client |
| `scripts/klaviyo.js` | Auto-loading credential wrapper script |

---

**Skill Level:** Expert (Level 3)
**Confidence:** 95%
**Multi-Account:** 3 active accounts (BOO, Teelixir, Elevate)
