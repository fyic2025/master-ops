# Shopify Expert Skill

> Expert-level Shopify platform management for Teelixir.

---

## Skill Identity

**Name:** shopify-expert
**Version:** 1.0.0
**Status:** Active
**Last Updated:** 2025-12-01

---

## Capabilities

### Core Functions

1. **Product Management**
   - Product creation and updates
   - Variant configuration
   - Collection management
   - Inventory management
   - Metafield operations

2. **Order Management**
   - Order processing
   - Fulfillment workflows
   - Return/refund handling
   - Draft orders

3. **Store Configuration**
   - Settings management
   - Shipping configuration
   - Payment setup
   - Theme customization

4. **API Operations**
   - REST Admin API
   - GraphQL Admin API
   - Storefront API
   - Webhook management

5. **Performance & SEO**
   - Page optimization
   - Meta content management
   - URL handles
   - Liquid templates

---

## When to Use This Skill

### Activate For:
- "Update product on Shopify"
- "Teelixir store configuration"
- "Shopify API"
- "Collection management"
- "Shopify order issue"
- "Inventory sync Shopify"
- "Liquid template"

### Defer To:
- **product-description-generator**: Product copy
- **pricing-optimizer**: Pricing decisions
- **klaviyo-expert**: Email marketing

---

## Store Profile

### Teelixir

**Platform:** Shopify Plus
**Store URL:** teelixir.com
**API Version:** 2024-01 (latest stable)

**Store Stats:**
- Products: 50+ SKUs
- Collections: 15+
- Orders/month: Variable
- Customer accounts: Active

**Key Integrations:**
- Klaviyo (email marketing)
- Google Analytics (GA4)
- Google Merchant Center
- ReCharge (subscriptions)
- ShipStation

---

## Shopify API Reference

### Authentication

```typescript
// REST Admin API
const config = {
  shop: process.env.SHOPIFY_SHOP_DOMAIN,
  accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
  apiVersion: '2024-01'
}

const baseUrl = `https://${config.shop}/admin/api/${config.apiVersion}`

const headers = {
  'X-Shopify-Access-Token': config.accessToken,
  'Content-Type': 'application/json'
}
```

### GraphQL Admin API

```typescript
const graphqlUrl = `https://${config.shop}/admin/api/${config.apiVersion}/graphql.json`

async function graphqlQuery(query: string, variables?: Record<string, any>) {
  const response = await fetch(graphqlUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables })
  })
  return response.json()
}
```

### Common REST Endpoints

| Resource | Endpoint | Methods |
|----------|----------|---------|
| Products | /products.json | GET, POST |
| Product | /products/{id}.json | GET, PUT, DELETE |
| Variants | /products/{id}/variants.json | GET, POST |
| Collections | /collections.json | GET |
| Smart Collections | /smart_collections.json | GET, POST |
| Custom Collections | /custom_collections.json | GET, POST |
| Orders | /orders.json | GET, POST |
| Customers | /customers.json | GET, POST |
| Inventory Levels | /inventory_levels.json | GET, POST |
| Locations | /locations.json | GET |

### Rate Limits

| API | Limit |
|-----|-------|
| REST Admin | 40 requests/app/store/min (leaky bucket) |
| GraphQL Admin | 1,000 cost points/request |
| Storefront | 200 requests/IP/second |

---

## Product Management

### Product Structure

```typescript
interface ShopifyProduct {
  id?: number
  title: string
  body_html: string
  vendor: string
  product_type: string
  tags: string[]
  status: 'active' | 'draft' | 'archived'
  variants: ShopifyVariant[]
  options: ShopifyOption[]
  images: ShopifyImage[]
  handle?: string
  metafields?: ShopifyMetafield[]
}

interface ShopifyVariant {
  id?: number
  product_id: number
  title: string
  price: string
  compare_at_price?: string
  sku: string
  barcode?: string
  inventory_quantity?: number
  inventory_management: 'shopify' | null
  inventory_policy: 'deny' | 'continue'
  weight: number
  weight_unit: 'kg' | 'g' | 'lb' | 'oz'
  option1?: string
  option2?: string
  option3?: string
}
```

### Create Product

```typescript
async function createProduct(product: Partial<ShopifyProduct>) {
  const response = await fetch(`${baseUrl}/products.json`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ product })
  })
  return response.json()
}
```

### Update Product

```typescript
async function updateProduct(productId: number, updates: Partial<ShopifyProduct>) {
  const response = await fetch(`${baseUrl}/products/${productId}.json`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ product: updates })
  })
  return response.json()
}
```

### GraphQL Product Update

```typescript
const PRODUCT_UPDATE = `
  mutation productUpdate($input: ProductInput!) {
    productUpdate(input: $input) {
      product {
        id
        title
        handle
      }
      userErrors {
        field
        message
      }
    }
  }
`

async function updateProductGraphQL(id: string, input: Record<string, any>) {
  return graphqlQuery(PRODUCT_UPDATE, { input: { id, ...input } })
}
```

---

## Inventory Management

### Get Inventory Levels

```typescript
async function getInventoryLevels(inventoryItemIds: number[]) {
  const ids = inventoryItemIds.join(',')
  const response = await fetch(
    `${baseUrl}/inventory_levels.json?inventory_item_ids=${ids}`,
    { headers }
  )
  return response.json()
}
```

### Set Inventory Level

```typescript
async function setInventoryLevel(
  inventoryItemId: number,
  locationId: number,
  available: number
) {
  const response = await fetch(`${baseUrl}/inventory_levels/set.json`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      inventory_item_id: inventoryItemId,
      location_id: locationId,
      available
    })
  })
  return response.json()
}
```

### Adjust Inventory

```typescript
async function adjustInventory(
  inventoryItemId: number,
  locationId: number,
  adjustment: number
) {
  const response = await fetch(`${baseUrl}/inventory_levels/adjust.json`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      inventory_item_id: inventoryItemId,
      location_id: locationId,
      available_adjustment: adjustment
    })
  })
  return response.json()
}
```

---

## Collection Management

### Collection Types

**Smart Collections:** Auto-populate based on conditions
**Custom Collections:** Manually curated products

### Create Smart Collection

```typescript
async function createSmartCollection(collection: {
  title: string
  rules: Array<{ column: string; relation: string; condition: string }>
  disjunctive?: boolean  // true = OR, false = AND
}) {
  const response = await fetch(`${baseUrl}/smart_collections.json`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ smart_collection: collection })
  })
  return response.json()
}

// Example rules
const rules = [
  { column: 'tag', relation: 'equals', condition: 'mushroom' },
  { column: 'vendor', relation: 'equals', condition: 'Teelixir' },
  { column: 'variant_price', relation: 'greater_than', condition: '20' }
]
```

### Add Products to Custom Collection

```typescript
async function addToCollection(collectionId: number, productId: number) {
  const response = await fetch(`${baseUrl}/collects.json`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      collect: {
        collection_id: collectionId,
        product_id: productId
      }
    })
  })
  return response.json()
}
```

---

## Order Management

### Get Orders

```typescript
async function getOrders(params: {
  status?: 'open' | 'closed' | 'cancelled' | 'any'
  fulfillment_status?: 'shipped' | 'partial' | 'unshipped' | 'unfulfilled'
  financial_status?: 'paid' | 'pending' | 'refunded' | 'partially_refunded'
  created_at_min?: string
  created_at_max?: string
  limit?: number
}) {
  const query = new URLSearchParams(params as any)
  const response = await fetch(`${baseUrl}/orders.json?${query}`, { headers })
  return response.json()
}
```

### Order Fulfillment

```typescript
async function fulfillOrder(orderId: number, fulfillment: {
  location_id: number
  tracking_number?: string
  tracking_company?: string
  tracking_urls?: string[]
  notify_customer?: boolean
  line_items?: Array<{ id: number; quantity: number }>
}) {
  const response = await fetch(`${baseUrl}/orders/${orderId}/fulfillments.json`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ fulfillment })
  })
  return response.json()
}
```

### Process Refund

```typescript
async function createRefund(orderId: number, refund: {
  reason: string
  notify: boolean
  shipping?: { full_refund: boolean }
  refund_line_items?: Array<{ line_item_id: number; quantity: number }>
}) {
  // First calculate refund
  const calculation = await fetch(`${baseUrl}/orders/${orderId}/refunds/calculate.json`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ refund })
  })
  const calcData = await calculation.json()

  // Then create refund
  const response = await fetch(`${baseUrl}/orders/${orderId}/refunds.json`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ refund: { ...refund, transactions: calcData.refund.transactions } })
  })
  return response.json()
}
```

---

## Metafields

### Get Product Metafields

```typescript
async function getProductMetafields(productId: number) {
  const response = await fetch(
    `${baseUrl}/products/${productId}/metafields.json`,
    { headers }
  )
  return response.json()
}
```

### Create Metafield

```typescript
async function createMetafield(
  resourceType: 'products' | 'customers' | 'orders',
  resourceId: number,
  metafield: {
    namespace: string
    key: string
    value: string
    type: 'single_line_text_field' | 'multi_line_text_field' | 'number_integer' | 'json'
  }
) {
  const response = await fetch(
    `${baseUrl}/${resourceType}/${resourceId}/metafields.json`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ metafield })
    }
  )
  return response.json()
}
```

### Common Metafield Namespaces

```
custom.benefits        Product benefits list
custom.ingredients     Ingredients information
custom.usage          Usage instructions
custom.origin         Origin/sourcing info
seo.hidden            Hide from search
```

---

## Webhooks

### Create Webhook

```typescript
async function createWebhook(topic: string, address: string) {
  const response = await fetch(`${baseUrl}/webhooks.json`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      webhook: {
        topic,
        address,
        format: 'json'
      }
    })
  })
  return response.json()
}
```

### Common Webhook Topics

| Topic | Trigger |
|-------|---------|
| orders/create | New order placed |
| orders/updated | Order modified |
| orders/fulfilled | Order fulfilled |
| products/create | Product created |
| products/update | Product updated |
| inventory_levels/update | Stock changed |
| customers/create | New customer |
| app/uninstalled | App removed |

---

## Liquid Templates

### Common Objects

```liquid
{{ product.title }}
{{ product.price | money }}
{{ product.description }}
{{ product.images | first | img_url: 'large' }}
{{ product.variants | first | json }}

{% for tag in product.tags %}
  {{ tag }}
{% endfor %}
```

### Metafield Access

```liquid
{{ product.metafields.custom.benefits }}
{{ product.metafields.custom['usage-instructions'] }}
```

### Collection Loop

```liquid
{% for product in collection.products %}
  <div class="product">
    <h2>{{ product.title }}</h2>
    <p>{{ product.price | money }}</p>
  </div>
{% endfor %}
```

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Invalid token | Regenerate access token |
| 404 Not Found | Wrong ID/endpoint | Verify resource exists |
| 422 Unprocessable | Validation error | Check required fields |
| 429 Too Many | Rate limited | Implement backoff |

### Debug Checklist

```
[ ] Verify shop domain is correct
[ ] Check access token has required scopes
[ ] Confirm API version in URL
[ ] Validate request body structure
[ ] Check rate limit headers
[ ] Review response error details
```

### Rate Limit Headers

```
X-Shopify-Shop-Api-Call-Limit: 39/40
Retry-After: 2.0
```

---

## Skill Documentation

| Document | Purpose |
|----------|---------|
| `QUICK-REFERENCE.md` | Quick API reference |
| `context/API-GUIDE.md` | Detailed API docs |
| `playbooks/OPERATIONS.md` | Common workflows |
| `scripts/shopify-client.ts` | API client |

---

**Skill Level:** Expert (Level 3)
**Confidence:** 95%
