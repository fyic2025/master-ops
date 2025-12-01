# Klaviyo Expert - Quick Reference

## API Basics

```typescript
const headers = {
  'Authorization': `Klaviyo-API-Key ${apiKey}`,
  'revision': '2024-02-15',
  'Content-Type': 'application/json'
}

const baseUrl = 'https://a.klaviyo.com/api'
```

---

## Common Endpoints

| Resource | Endpoint |
|----------|----------|
| Profiles | `/profiles` |
| Lists | `/lists` |
| Segments | `/segments` |
| Campaigns | `/campaigns` |
| Flows | `/flows` |
| Templates | `/templates` |
| Events | `/events` |
| Metrics | `/metrics` |

---

## Profile Operations

### Create/Update Profile
```json
POST /profiles
{
  "data": {
    "type": "profile",
    "attributes": {
      "email": "test@example.com",
      "first_name": "John",
      "properties": { "custom_field": "value" }
    }
  }
}
```

### Get Profile by Email
```
GET /profiles?filter=equals(email,"test@example.com")
```

### Update Properties
```json
PATCH /profiles/{id}
{
  "data": {
    "type": "profile",
    "id": "{id}",
    "attributes": {
      "properties": { "vip_status": true }
    }
  }
}
```

---

## List Operations

### Get Lists
```
GET /lists
```

### Add to List
```json
POST /lists/{id}/relationships/profiles
{
  "data": [
    { "type": "profile", "id": "profile_id_1" },
    { "type": "profile", "id": "profile_id_2" }
  ]
}
```

### Subscribe with Consent
```json
POST /lists/{id}/relationships/profiles
{
  "data": [{
    "type": "profile",
    "attributes": {
      "email": "test@example.com",
      "subscriptions": {
        "email": { "marketing": { "consent": "SUBSCRIBED" } }
      }
    }
  }]
}
```

---

## Event Tracking

### Track Event
```json
POST /events
{
  "data": {
    "type": "event",
    "attributes": {
      "metric": {
        "data": {
          "type": "metric",
          "attributes": { "name": "Placed Order" }
        }
      },
      "profile": {
        "data": {
          "type": "profile",
          "attributes": { "email": "customer@example.com" }
        }
      },
      "properties": {
        "OrderId": "12345",
        "Value": 99.95
      },
      "value": 99.95
    }
  }
}
```

---

## Standard Events

| Event | Trigger |
|-------|---------|
| Viewed Product | Product page view |
| Added to Cart | Cart add |
| Started Checkout | Checkout begin |
| Placed Order | Order complete |
| Fulfilled Order | Order shipped |

---

## Segment Operators

| Operator | Use |
|----------|-----|
| equals | Exact match |
| contains | Partial match |
| greater-than | Numeric comparison |
| less-than | Numeric comparison |
| exists | Property exists |
| does-not-exist | Property missing |

---

## Flow Types

| Flow | Trigger |
|------|---------|
| Welcome | List subscription |
| Abandoned Cart | Added to cart, no order |
| Browse Abandon | Viewed product, no cart |
| Post-Purchase | Order placed |
| Win-Back | No order in X days |
| Sunset | Inactive engagement |

---

## Key Metrics

| Metric | Good | Great |
|--------|------|-------|
| Open Rate | 20% | 30%+ |
| Click Rate | 2% | 5%+ |
| Conversion | 0.5% | 2%+ |
| Unsubscribe | <0.5% | <0.2% |
| Bounce | <2% | <0.5% |
| Spam | <0.1% | <0.05% |

---

## Rate Limits

| Type | Limit |
|------|-------|
| General | 75/sec |
| Bulk | 350/sec burst |
| Profile Import | 10,000/batch |

---

## Template Variables

```liquid
{{ first_name|default:'there' }}
{{ email }}
{{ event.ProductName }}
{{ event.Price|floatformat:2 }}

{% if condition %}
  content
{% endif %}

{% for item in event.Items %}
  {{ item.Name }}
{% endfor %}
```

---

## Account Details

| Business | Platform | List Size |
|----------|----------|-----------|
| BOO | BigCommerce | 40,000+ |
| Teelixir | Shopify | 15,000+ |
| RHF | WooCommerce | 5,000+ |

---

## Quick Commands

```bash
# Get profiles
curl -H "Authorization: Klaviyo-API-Key $KEY" \
  -H "revision: 2024-02-15" \
  "https://a.klaviyo.com/api/profiles?page[size]=10"

# Get lists
curl -H "Authorization: Klaviyo-API-Key $KEY" \
  -H "revision: 2024-02-15" \
  "https://a.klaviyo.com/api/lists"
```

---

## Related Skills

| Task | Skill |
|------|-------|
| Email copy | email-copywriter |
| Churn targeting | customer-churn-predictor |
| BigCommerce | bigcommerce-expert |
| Shopify | shopify-expert |
