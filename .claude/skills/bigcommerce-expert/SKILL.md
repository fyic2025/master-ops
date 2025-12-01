# BigCommerce Expert Skill

> Expert-level BigCommerce platform management for Buy Organics Online (BOO).

---

## Skill Identity

**Name:** bigcommerce-expert
**Version:** 1.0.0
**Status:** Active
**Last Updated:** 2025-12-01

---

## Capabilities

### Core Functions

1. **Product Management**
   - Product creation and updates
   - Variant configuration
   - Category management
   - Inventory management
   - Bulk operations

2. **Order Management**
   - Order processing
   - Fulfillment workflows
   - Return/refund handling
   - Customer service operations

3. **Store Configuration**
   - Settings management
   - Shipping configuration
   - Payment setup
   - Tax configuration

4. **API Operations**
   - REST API integration
   - Webhook management
   - Third-party connections
   - Data synchronization

5. **Performance & SEO**
   - Page optimization
   - Meta content management
   - URL structure
   - Site speed

---

## When to Use This Skill

### Activate For:
- "Update product on BigCommerce"
- "BigCommerce API"
- "BOO store configuration"
- "Product import/export"
- "Order issue in BigCommerce"
- "BigCommerce shipping setup"
- "Category management"

### Defer To:
- **product-description-generator**: Product copy
- **pricing-optimizer**: Pricing decisions
- **shipping-optimizer**: Shipping strategy

---

## Store Profile

### Buy Organics Online

**Platform:** BigCommerce Enterprise
**Store URL:** buyorganicsonline.com.au
**API Version:** V3 (current)

**Store Stats:**
- Products: 3,000+
- Categories: 50+
- Orders/month: Variable
- Customer accounts: Active

**Key Integrations:**
- Klaviyo (email)
- Google Analytics (GA4)
- Google Merchant Center
- Accounting system
- Inventory/ERP

---

## BigCommerce API Reference

### Authentication

```typescript
const config = {
  storeHash: process.env.BC_STORE_HASH,
  accessToken: process.env.BC_ACCESS_TOKEN,
  baseUrl: `https://api.bigcommerce.com/stores/${storeHash}/v3`
}

const headers = {
  'X-Auth-Token': accessToken,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
}
```

### Common Endpoints

| Resource | Endpoint | Methods |
|----------|----------|---------|
| Products | /catalog/products | GET, POST, PUT, DELETE |
| Variants | /catalog/products/{id}/variants | GET, POST, PUT |
| Categories | /catalog/categories | GET, POST, PUT |
| Orders | /orders | GET (v2) |
| Customers | /customers | GET, POST, PUT |
| Inventory | /inventory/items | GET, PUT |

### Rate Limits

| Plan | Requests/sec | Requests/hour |
|------|--------------|---------------|
| Enterprise | 450 | N/A |
| Pro | 60 | N/A |
| Standard | 20,000 | Per hour |

---

## Product Management

### Product Structure

```typescript
interface BCProduct {
  id?: number
  name: string
  type: 'physical' | 'digital'
  sku: string
  description: string
  price: number
  sale_price?: number
  retail_price?: number
  cost_price?: number
  weight: number
  width: number
  height: number
  depth: number
  categories: number[]
  brand_id?: number
  inventory_level?: number
  inventory_tracking: 'none' | 'product' | 'variant'
  is_visible: boolean
  is_featured: boolean
  meta_title?: string
  meta_description?: string
  custom_url?: { url: string; is_customized: boolean }
}
```

### Create Product

```typescript
async function createProduct(product: BCProduct) {
  const response = await fetch(`${baseUrl}/catalog/products`, {
    method: 'POST',
    headers,
    body: JSON.stringify(product)
  })
  return response.json()
}
```

### Update Product

```typescript
async function updateProduct(productId: number, updates: Partial<BCProduct>) {
  const response = await fetch(`${baseUrl}/catalog/products/${productId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updates)
  })
  return response.json()
}
```

### Bulk Update

```typescript
async function bulkUpdateProducts(products: Partial<BCProduct>[]) {
  const response = await fetch(`${baseUrl}/catalog/products`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(products) // Array of products with IDs
  })
  return response.json()
}
```

---

## Inventory Management

### Get Inventory

```typescript
async function getInventory(productId: number) {
  const response = await fetch(
    `${baseUrl}/catalog/products/${productId}?include=variants`,
    { headers }
  )
  const data = await response.json()
  return {
    product: data.data.name,
    inventory_level: data.data.inventory_level,
    variants: data.data.variants?.map(v => ({
      sku: v.sku,
      inventory_level: v.inventory_level
    }))
  }
}
```

### Update Inventory

```typescript
async function updateInventory(productId: number, quantity: number) {
  const response = await fetch(`${baseUrl}/catalog/products/${productId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ inventory_level: quantity })
  })
  return response.json()
}
```

### Low Stock Alert

```typescript
async function getLowStockProducts(threshold: number = 10) {
  const response = await fetch(
    `${baseUrl}/catalog/products?inventory_level:less=${threshold}&is_visible=true`,
    { headers }
  )
  return response.json()
}
```

---

## Category Management

### Category Structure

```typescript
interface BCCategory {
  id?: number
  name: string
  parent_id: number  // 0 for top-level
  description?: string
  sort_order?: number
  is_visible: boolean
  meta_title?: string
  meta_description?: string
  custom_url?: { url: string; is_customized: boolean }
}
```

### Category Operations

```typescript
// Get all categories
async function getCategories() {
  const response = await fetch(`${baseUrl}/catalog/categories`, { headers })
  return response.json()
}

// Create category
async function createCategory(category: BCCategory) {
  const response = await fetch(`${baseUrl}/catalog/categories`, {
    method: 'POST',
    headers,
    body: JSON.stringify(category)
  })
  return response.json()
}

// Assign product to categories
async function assignCategories(productId: number, categoryIds: number[]) {
  const response = await fetch(`${baseUrl}/catalog/products/${productId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ categories: categoryIds })
  })
  return response.json()
}
```

---

## Order Management

### Get Orders (V2 API)

```typescript
async function getOrders(params: {
  status_id?: number
  min_date_created?: string
  max_date_created?: string
  limit?: number
}) {
  const queryParams = new URLSearchParams(params as any)
  const response = await fetch(
    `https://api.bigcommerce.com/stores/${storeHash}/v2/orders?${queryParams}`,
    { headers }
  )
  return response.json()
}
```

### Order Statuses

| ID | Status | Description |
|----|--------|-------------|
| 1 | Pending | Awaiting payment |
| 2 | Shipped | Order shipped |
| 3 | Partially Shipped | Some items shipped |
| 4 | Refunded | Full refund |
| 5 | Cancelled | Order cancelled |
| 6 | Declined | Payment declined |
| 7 | Awaiting Payment | Payment pending |
| 8 | Awaiting Pickup | Ready for pickup |
| 9 | Awaiting Shipment | Ready to ship |
| 10 | Completed | Order complete |
| 11 | Awaiting Fulfillment | Processing |
| 12 | Manual Verification | Needs review |
| 13 | Disputed | Chargeback |
| 14 | Partially Refunded | Partial refund |

### Update Order Status

```typescript
async function updateOrderStatus(orderId: number, statusId: number) {
  const response = await fetch(
    `https://api.bigcommerce.com/stores/${storeHash}/v2/orders/${orderId}`,
    {
      method: 'PUT',
      headers,
      body: JSON.stringify({ status_id: statusId })
    }
  )
  return response.json()
}
```

---

## Customer Management

### Customer Structure

```typescript
interface BCCustomer {
  id?: number
  email: string
  first_name: string
  last_name: string
  company?: string
  phone?: string
  customer_group_id?: number
  addresses?: BCAddress[]
}
```

### Customer Operations

```typescript
// Get customer by email
async function getCustomerByEmail(email: string) {
  const response = await fetch(
    `${baseUrl}/customers?email:in=${email}`,
    { headers }
  )
  return response.json()
}

// Create customer
async function createCustomer(customer: BCCustomer) {
  const response = await fetch(`${baseUrl}/customers`, {
    method: 'POST',
    headers,
    body: JSON.stringify([customer]) // Array required
  })
  return response.json()
}
```

---

## SEO Configuration

### Product SEO Fields

```typescript
const seoFields = {
  meta_title: 'Title for search results (60 chars)',
  meta_description: 'Description for search results (160 chars)',
  search_keywords: 'Comma-separated keywords',
  custom_url: {
    url: '/product-url-slug/',
    is_customized: true
  }
}
```

### URL Structure Best Practices

```
Products: /[category]/[product-name]/
Categories: /[parent]/[child]/
Brands: /brands/[brand-name]/
```

### Redirect Management

```typescript
// Create redirect
async function createRedirect(fromPath: string, toPath: string) {
  const response = await fetch(`${baseUrl}/storefront/redirects`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      from_path: fromPath,
      to: { type: 'url', url: toPath },
      site_id: 1
    })
  })
  return response.json()
}
```

---

## Webhooks

### Available Events

| Scope | Events |
|-------|--------|
| store/order | created, updated, archived |
| store/product | created, updated, deleted |
| store/customer | created, updated, deleted |
| store/cart | created, updated, deleted |
| store/inventory | updated |

### Create Webhook

```typescript
async function createWebhook(scope: string, destination: string) {
  const response = await fetch(`${baseUrl}/hooks`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      scope,
      destination,
      is_active: true
    })
  })
  return response.json()
}
```

---

## Common Operations

### Price Update

```typescript
async function updatePrice(productId: number, price: number, salePrice?: number) {
  const update: any = { price }
  if (salePrice !== undefined) {
    update.sale_price = salePrice
  }
  return updateProduct(productId, update)
}
```

### Toggle Visibility

```typescript
async function toggleVisibility(productId: number, visible: boolean) {
  return updateProduct(productId, { is_visible: visible })
}
```

### Bulk Category Assignment

```typescript
async function bulkAssignCategory(productIds: number[], categoryId: number) {
  for (const id of productIds) {
    const product = await getProduct(id)
    const categories = [...new Set([...product.categories, categoryId])]
    await updateProduct(id, { categories })
  }
}
```

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Invalid token | Check API credentials |
| 404 Not Found | Wrong endpoint/ID | Verify resource exists |
| 422 Validation Error | Invalid data | Check field requirements |
| 429 Rate Limited | Too many requests | Implement backoff |

### Debug Checklist

```
[ ] Verify store hash is correct
[ ] Check API token has required scopes
[ ] Confirm endpoint URL is correct
[ ] Validate request body structure
[ ] Check rate limit status
[ ] Review response error details
```

---

## Skill Documentation

| Document | Purpose |
|----------|---------|
| `QUICK-REFERENCE.md` | Quick API reference |
| `context/API-GUIDE.md` | Detailed API docs |
| `playbooks/OPERATIONS.md` | Common workflows |
| `scripts/bc-client.ts` | API client |

---

**Skill Level:** Expert (Level 3)
**Confidence:** 95%
