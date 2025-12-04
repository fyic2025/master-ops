---
name: shopify-expert
description: Expert-level Shopify platform management for Teelixir and Elevate Wholesale. Handles products, orders, metafields, themes, REST and GraphQL APIs. Use for any Teelixir or Elevate e-commerce operations.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task
---

# Shopify Expert Skill

> Expert-level Shopify platform management for Teelixir and Elevate Wholesale.

---

## Skill Identity

**Name:** shopify-expert
**Version:** 2.0.0
**Status:** Active
**Last Updated:** 2025-12-02
**Stores Supported:** Teelixir, Elevate Wholesale

---

## MCP Server Access

Direct Shopify development tools available via VS Code MCP:

| MCP Server | Capabilities |
|------------|--------------|
| `shopify-dev` | API docs, GraphQL schema introspection, dev tools |

The MCP server provides instant access to Shopify documentation, Admin GraphQL schema, and API references without needing to search external docs.

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
- "Elevate Wholesale store"
- "Shopify API"
- "Collection management"
- "Shopify order issue"
- "Inventory sync Shopify"
- "Liquid template"
- "Wholesale Shopify"

### Defer To:
- **product-description-generator**: Product copy
- **pricing-optimizer**: Pricing decisions
- **klaviyo-expert**: Email marketing
- **email-campaign-manager**: Campaign management

---

## Multi-Store Configuration

This skill supports multiple Shopify stores with automatic credential management. Each store has its own configuration and credentials loaded from the Supabase vault.

### Store Selection

When working with Shopify, specify the store:
- **teelixir**: Teelixir.com (consumer DTC)
- **elevate**: Elevate Wholesale (B2B wholesale)

### Available Credentials

**Teelixir:**
- `TEELIXIR_SHOPIFY_STORE_URL` - Store domain (teelixir.myshopify.com)
- `TEELIXIR_SHOPIFY_ACCESS_TOKEN` - Admin API access token
- `TEELIXIR_SHOPIFY_API_KEY` - App API key
- `TEELIXIR_SHOPIFY_API_SECRET` - App API secret

**Elevate Wholesale:**
- `ELEVATE_SHOPIFY_STORE_URL` - Store domain (elevatewholesale.myshopify.com)
- `ELEVATE_SHOPIFY_ACCESS_TOKEN` - Admin API access token

---

## Store Profiles

### Teelixir

**Platform:** Shopify Plus
**Store URL:** teelixir.com
**Business Model:** Direct-to-Consumer (DTC)
**API Version:** 2024-01 (latest stable)

**Store Stats:**
- Products: ~50 SKUs
- Collections: 15+
- Orders/month: Variable
- Customer accounts: Active
- Market: Australia + International

**Key Integrations:**
- Klaviyo (email marketing)
- Google Analytics (GA4)
- Google Merchant Center
- ReCharge (subscriptions)
- ShipStation (fulfillment)
- Unleashed (inventory)

**Focus Areas:**
- Product variants (sizes, bundles)
- Subscription management
- International shipping
- SEO optimization
- Customer reviews

### Elevate Wholesale

**Platform:** Shopify
**Store URL:** elevatewholesale.com.au
**Business Model:** B2B Wholesale
**API Version:** 2024-01 (latest stable)

**Store Stats:**
- Products: Wholesale catalog
- Collections: Category-based
- Orders/month: B2B orders
- Customer accounts: Wholesale customers only
- Market: Australia

**Key Integrations:**
- Custom wholesale pricing
- Bulk order processing
- Invoice generation
- B2B payment terms

**Focus Areas:**
- Wholesale pricing tiers
- Bulk order management
- Customer-specific catalogs
- MOQ (minimum order quantities)
- Trade accounts

---

## Shopify API Reference

### Authentication

#### Multi-Store Credential Loading

All scripts use the unified credential loader to access store credentials:

```typescript
// Load credentials from vault
const creds = require('../../../../creds');

// Load Teelixir credentials
await creds.load('teelixir');
// Now available: process.env.TEELIXIR_SHOPIFY_STORE_URL, process.env.TEELIXIR_SHOPIFY_ACCESS_TOKEN

// OR load Elevate credentials
await creds.load('elevate');
// Now available: process.env.ELEVATE_SHOPIFY_STORE_URL, process.env.ELEVATE_SHOPIFY_ACCESS_TOKEN
```

#### Store-Specific Configuration

```typescript
// Teelixir configuration
const teelixirConfig = {
  shop: process.env.TEELIXIR_SHOPIFY_STORE_URL,
  accessToken: process.env.TEELIXIR_SHOPIFY_ACCESS_TOKEN,
  apiVersion: '2024-01',
  get baseUrl() {
    return `https://${this.shop}/admin/api/${this.apiVersion}`
  }
}

// Elevate configuration
const elevateConfig = {
  shop: process.env.ELEVATE_SHOPIFY_STORE_URL,
  accessToken: process.env.ELEVATE_SHOPIFY_ACCESS_TOKEN,
  apiVersion: '2024-01',
  get baseUrl() {
    return `https://${this.shop}/admin/api/${this.apiVersion}`
  }
}

// Generic helper for any store
function getStoreConfig(storeName: 'teelixir' | 'elevate') {
  const prefix = storeName.toUpperCase();
  return {
    shop: process.env[`${prefix}_SHOPIFY_STORE_URL`],
    accessToken: process.env[`${prefix}_SHOPIFY_ACCESS_TOKEN`],
    apiVersion: '2024-01',
    get baseUrl() {
      return `https://${this.shop}/admin/api/${this.apiVersion}`
    }
  };
}

// Headers for API calls
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

## B2B / Wholesale Operations (Elevate)

### Customer Tag Management

Elevate uses customer tags for wholesale pricing tiers and access control:

```typescript
// Get customer with tags
async function getCustomer(customerId: number) {
  const response = await fetch(`${baseUrl}/customers/${customerId}.json`, { headers })
  return response.json()
}

// Update customer tags
async function updateCustomerTags(customerId: number, tags: string[]) {
  const response = await fetch(`${baseUrl}/customers/${customerId}.json`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      customer: {
        id: customerId,
        tags: tags.join(', ')
      }
    })
  })
  return response.json()
}

// Common wholesale tags
const wholesaleTags = [
  'wholesale',
  'tier-1',  // Standard wholesale
  'tier-2',  // Volume discount
  'tier-3',  // VIP pricing
  'verified-retailer',
  'distributor'
]
```

### Wholesale Pricing

```typescript
// Set customer-specific pricing via metafields
async function setWholesalePrice(customerId: number, priceRule: {
  productId: number
  discountPercent: number
}) {
  await createMetafield('customers', customerId, {
    namespace: 'wholesale',
    key: `price_rule_${priceRule.productId}`,
    value: JSON.stringify(priceRule),
    type: 'json'
  })
}

// Get all wholesale orders (B2B)
async function getWholesaleOrders(minAmount = 500) {
  const response = await fetch(
    `${baseUrl}/orders.json?status=any&financial_status=paid&limit=250`,
    { headers }
  )
  const data = await response.json()

  // Filter for wholesale customers
  return data.orders.filter((order: any) => {
    const customerTags = order.customer?.tags || ''
    return customerTags.includes('wholesale') &&
           parseFloat(order.total_price) >= minAmount
  })
}
```

### Draft Orders for B2B Quotes

```typescript
// Create draft order (for quotes/custom pricing)
async function createDraftOrder(draftOrder: {
  line_items: Array<{
    variant_id: number
    quantity: number
    price?: string
  }>
  customer: { id: number }
  note?: string
  tags?: string
  invoice_sent_at?: null  // null = not sent yet
}) {
  const response = await fetch(`${baseUrl}/draft_orders.json`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ draft_order: draftOrder })
  })
  return response.json()
}

// Send invoice for draft order
async function sendDraftOrderInvoice(draftOrderId: number) {
  const response = await fetch(
    `${baseUrl}/draft_orders/${draftOrderId}/send_invoice.json`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        draft_order_invoice: {
          to: 'customer',  // or specific email
          subject: 'Your Wholesale Quote from Elevate',
          custom_message: 'Thank you for your wholesale inquiry...'
        }
      })
    }
  )
  return response.json()
}

// Complete draft order (convert to order)
async function completeDraftOrder(draftOrderId: number) {
  const response = await fetch(
    `${baseUrl}/draft_orders/${draftOrderId}/complete.json`,
    {
      method: 'PUT',
      headers,
      body: JSON.stringify({ payment_pending: false })
    }
  )
  return response.json()
}
```

### Minimum Order Quantities (MOQ)

```typescript
// Set MOQ via product metafields
async function setProductMOQ(productId: number, moq: number) {
  await createMetafield('products', productId, {
    namespace: 'wholesale',
    key: 'minimum_order_quantity',
    value: moq.toString(),
    type: 'number_integer'
  })
}

// Validate order against MOQ
async function validateOrderMOQ(lineItems: Array<{ product_id: number; quantity: number }>) {
  const violations = []

  for (const item of lineItems) {
    const metafields = await getProductMetafields(item.product_id)
    const moqField = metafields.metafields.find(
      (m: any) => m.namespace === 'wholesale' && m.key === 'minimum_order_quantity'
    )

    const moq = moqField ? parseInt(moqField.value) : 1
    if (item.quantity < moq) {
      violations.push({
        product_id: item.product_id,
        required: moq,
        provided: item.quantity
      })
    }
  }

  return violations
}
```

### Bulk Order Processing

```typescript
// Get bulk orders (>= 10 items)
async function getBulkOrders(minLineItems = 10) {
  const response = await fetch(
    `${baseUrl}/orders.json?status=any&limit=250`,
    { headers }
  )
  const data = await response.json()

  return data.orders.filter((order: any) => {
    const totalItems = order.line_items.reduce(
      (sum: number, item: any) => sum + item.quantity,
      0
    )
    return totalItems >= minLineItems
  })
}
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
| Wrong store data | Using wrong credentials | Verify --store flag matches intended store |
| Missing credentials | Vault not loaded | Check creds.load() called for correct store |

### Debug Checklist

```
[ ] Verify correct store specified (teelixir vs elevate)
[ ] Check credentials loaded from vault (creds.load())
[ ] Verify shop domain is correct
[ ] Check access token has required scopes
[ ] Confirm API version in URL
[ ] Validate request body structure
[ ] Check rate limit headers
[ ] Review response error details
```

### Multi-Store Debugging

```typescript
// Verify which store is configured
console.log('Store:', currentConfig?.storeName)
console.log('Shop:', currentConfig?.shop)
console.log('Display Name:', currentConfig?.displayName)

// Test credentials
const testConnection = async (storeName: 'teelixir' | 'elevate') => {
  await creds.load(storeName)
  const config = getStoreConfig(storeName)

  const response = await fetch(`${config.baseUrl}/shop.json`, {
    headers: getHeaders(config)
  })

  if (response.ok) {
    const data = await response.json()
    console.log(`${storeName}: Connected to ${data.shop.name}`)
  } else {
    console.error(`${storeName}: Connection failed (${response.status})`)
  }
}
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
| `scripts/shopify-client.ts` | Multi-store API client with credential loading |

---

## Quick Start Examples

### Teelixir (DTC Store)

```bash
# List products
npx tsx scripts/shopify-client.ts --store teelixir products --list

# Check low stock
npx tsx scripts/shopify-client.ts --store teelixir products --low-stock 10

# View unfulfilled orders
npx tsx scripts/shopify-client.ts --store teelixir orders --unfulfilled

# Get shop info
npx tsx scripts/shopify-client.ts --store teelixir shop
```

### Elevate Wholesale (B2B Store)

```bash
# List wholesale products
npx tsx scripts/shopify-client.ts --store elevate products --list

# View recent B2B orders
npx tsx scripts/shopify-client.ts --store elevate orders --recent 20

# Check collections
npx tsx scripts/shopify-client.ts --store elevate collections --list

# Get shop info
npx tsx scripts/shopify-client.ts --store elevate shop
```

### Script Integration

```typescript
// In your custom scripts
import * as path from 'path'
const creds = require('../../../../creds')

async function myShopifyScript() {
  // Load Teelixir credentials
  await creds.load('teelixir')

  const config = {
    shop: process.env.TEELIXIR_SHOPIFY_STORE_URL,
    accessToken: process.env.TEELIXIR_SHOPIFY_ACCESS_TOKEN,
    apiVersion: '2024-01'
  }

  // Your Shopify API calls here...
}

// OR for Elevate
async function myElevateScript() {
  await creds.load('elevate')

  const config = {
    shop: process.env.ELEVATE_SHOPIFY_STORE_URL,
    accessToken: process.env.ELEVATE_SHOPIFY_ACCESS_TOKEN,
    apiVersion: '2024-01'
  }

  // Your B2B operations here...
}
```

---

**Skill Level:** Expert (Level 3)
**Confidence:** 95%
**Multi-Store:** Teelixir (DTC) + Elevate Wholesale (B2B)
