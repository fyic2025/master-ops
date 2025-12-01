# BigCommerce API Guide

## Overview

BigCommerce provides REST APIs for store management:
- **V3 API**: Modern, preferred for most operations
- **V2 API**: Legacy, still required for orders

---

## Authentication

### API Account Setup

1. Go to Store > Settings > API Accounts
2. Create V2/V3 API Token
3. Required scopes:
   - Products: `modify`
   - Orders: `read` (V2)
   - Customers: `modify`
   - Content: `modify`
   - Carts: `modify`
   - Checkouts: `modify`
   - Stored Payment Instruments: `read`

### Environment Variables

```env
BC_STORE_HASH=your_store_hash
BC_ACCESS_TOKEN=your_access_token
BC_CLIENT_ID=your_client_id
BC_CLIENT_SECRET=your_client_secret
```

### Request Headers

```typescript
const headers = {
  'X-Auth-Token': process.env.BC_ACCESS_TOKEN,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
}
```

---

## V3 Catalog API

### Products

#### Get All Products

```typescript
async function getProducts(params?: {
  page?: number
  limit?: number
  include?: string
  'sku:in'?: string
  'name:like'?: string
  is_visible?: boolean
}) {
  const query = new URLSearchParams(params as any)
  const response = await fetch(
    `${baseUrl}/catalog/products?${query}`,
    { headers }
  )
  return response.json()
}
```

#### Get Single Product

```typescript
async function getProduct(id: number, include?: string[]) {
  const query = include ? `?include=${include.join(',')}` : ''
  const response = await fetch(
    `${baseUrl}/catalog/products/${id}${query}`,
    { headers }
  )
  return response.json()
}
```

#### Create Product

```typescript
interface CreateProductInput {
  name: string
  type: 'physical' | 'digital'
  sku: string
  description?: string
  price: number
  cost_price?: number
  retail_price?: number
  sale_price?: number
  weight: number
  width?: number
  height?: number
  depth?: number
  categories: number[]
  brand_id?: number
  inventory_level?: number
  inventory_tracking?: 'none' | 'product' | 'variant'
  is_visible?: boolean
  is_featured?: boolean
  meta_title?: string
  meta_description?: string
  search_keywords?: string
  custom_url?: { url: string; is_customized: boolean }
}

async function createProduct(product: CreateProductInput) {
  const response = await fetch(`${baseUrl}/catalog/products`, {
    method: 'POST',
    headers,
    body: JSON.stringify(product)
  })
  return response.json()
}
```

#### Update Product

```typescript
async function updateProduct(id: number, updates: Partial<CreateProductInput>) {
  const response = await fetch(`${baseUrl}/catalog/products/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updates)
  })
  return response.json()
}
```

#### Bulk Update Products

```typescript
async function bulkUpdateProducts(
  products: Array<{ id: number } & Partial<CreateProductInput>>
) {
  const response = await fetch(`${baseUrl}/catalog/products`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(products)
  })
  return response.json()
}
```

#### Delete Product

```typescript
async function deleteProduct(id: number) {
  const response = await fetch(`${baseUrl}/catalog/products/${id}`, {
    method: 'DELETE',
    headers
  })
  return response.status === 204
}
```

### Variants

#### Get Variants

```typescript
async function getVariants(productId: number) {
  const response = await fetch(
    `${baseUrl}/catalog/products/${productId}/variants`,
    { headers }
  )
  return response.json()
}
```

#### Create Variant

```typescript
interface CreateVariantInput {
  sku: string
  price?: number
  cost_price?: number
  sale_price?: number
  weight?: number
  inventory_level?: number
  option_values: Array<{ option_id: number; id: number }>
}

async function createVariant(productId: number, variant: CreateVariantInput) {
  const response = await fetch(
    `${baseUrl}/catalog/products/${productId}/variants`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(variant)
    }
  )
  return response.json()
}
```

#### Update Variant

```typescript
async function updateVariant(
  productId: number,
  variantId: number,
  updates: Partial<CreateVariantInput>
) {
  const response = await fetch(
    `${baseUrl}/catalog/products/${productId}/variants/${variantId}`,
    {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates)
    }
  )
  return response.json()
}
```

### Categories

#### Get Categories

```typescript
async function getCategories(params?: {
  parent_id?: number
  name?: string
  is_visible?: boolean
}) {
  const query = new URLSearchParams(params as any)
  const response = await fetch(
    `${baseUrl}/catalog/categories?${query}`,
    { headers }
  )
  return response.json()
}
```

#### Create Category

```typescript
interface CreateCategoryInput {
  name: string
  parent_id: number  // 0 for top-level
  description?: string
  sort_order?: number
  is_visible?: boolean
  page_title?: string
  meta_keywords?: string[]
  meta_description?: string
  custom_url?: { url: string; is_customized: boolean }
}

async function createCategory(category: CreateCategoryInput) {
  const response = await fetch(`${baseUrl}/catalog/categories`, {
    method: 'POST',
    headers,
    body: JSON.stringify(category)
  })
  return response.json()
}
```

#### Category Tree

```typescript
async function getCategoryTree() {
  const response = await fetch(
    `${baseUrl}/catalog/categories/tree`,
    { headers }
  )
  return response.json()
}
```

### Brands

```typescript
async function getBrands() {
  const response = await fetch(`${baseUrl}/catalog/brands`, { headers })
  return response.json()
}

async function createBrand(brand: {
  name: string
  page_title?: string
  meta_keywords?: string[]
  meta_description?: string
  image_url?: string
}) {
  const response = await fetch(`${baseUrl}/catalog/brands`, {
    method: 'POST',
    headers,
    body: JSON.stringify(brand)
  })
  return response.json()
}
```

### Product Images

```typescript
// Get images
async function getProductImages(productId: number) {
  const response = await fetch(
    `${baseUrl}/catalog/products/${productId}/images`,
    { headers }
  )
  return response.json()
}

// Create image from URL
async function createProductImage(productId: number, imageUrl: string, isThumbnail = false) {
  const response = await fetch(
    `${baseUrl}/catalog/products/${productId}/images`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        image_url: imageUrl,
        is_thumbnail: isThumbnail
      })
    }
  )
  return response.json()
}
```

---

## V2 Orders API

### Get Orders

```typescript
async function getOrders(params?: {
  status_id?: number
  min_date_created?: string
  max_date_created?: string
  customer_id?: number
  limit?: number
  page?: number
  sort?: string
}) {
  const query = new URLSearchParams(params as any)
  const response = await fetch(
    `https://api.bigcommerce.com/stores/${storeHash}/v2/orders?${query}`,
    { headers }
  )
  return response.json()
}
```

### Get Single Order

```typescript
async function getOrder(orderId: number) {
  const response = await fetch(
    `https://api.bigcommerce.com/stores/${storeHash}/v2/orders/${orderId}`,
    { headers }
  )
  return response.json()
}
```

### Get Order Products

```typescript
async function getOrderProducts(orderId: number) {
  const response = await fetch(
    `https://api.bigcommerce.com/stores/${storeHash}/v2/orders/${orderId}/products`,
    { headers }
  )
  return response.json()
}
```

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

### Order Status Reference

| ID | Status | Description |
|----|--------|-------------|
| 0 | Incomplete | Cart not converted |
| 1 | Pending | Awaiting payment |
| 2 | Shipped | Order shipped |
| 3 | Partially Shipped | Some items shipped |
| 4 | Refunded | Full refund issued |
| 5 | Cancelled | Order cancelled |
| 6 | Declined | Payment declined |
| 7 | Awaiting Payment | Manual payment pending |
| 8 | Awaiting Pickup | Ready for pickup |
| 9 | Awaiting Shipment | Ready to ship |
| 10 | Completed | Order complete |
| 11 | Awaiting Fulfillment | Processing |
| 12 | Manual Verification | Fraud review |
| 13 | Disputed | Chargeback filed |
| 14 | Partially Refunded | Partial refund |

---

## V3 Customers API

### Get Customers

```typescript
async function getCustomers(params?: {
  'email:in'?: string
  'id:in'?: string
  'name:like'?: string
  customer_group_id?: number
}) {
  const query = new URLSearchParams(params as any)
  const response = await fetch(
    `${baseUrl}/customers?${query}`,
    { headers }
  )
  return response.json()
}
```

### Create Customer

```typescript
async function createCustomer(customer: {
  email: string
  first_name: string
  last_name: string
  company?: string
  phone?: string
  customer_group_id?: number
}) {
  const response = await fetch(`${baseUrl}/customers`, {
    method: 'POST',
    headers,
    body: JSON.stringify([customer]) // Array required
  })
  return response.json()
}
```

### Customer Addresses

```typescript
async function getCustomerAddresses(customerId: number) {
  const response = await fetch(
    `${baseUrl}/customers/addresses?customer_id:in=${customerId}`,
    { headers }
  )
  return response.json()
}
```

---

## Webhooks

### Create Webhook

```typescript
async function createWebhook(
  scope: string,
  destination: string,
  headers?: Record<string, string>
) {
  const response = await fetch(`${baseUrl}/hooks`, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify({
      scope,
      destination,
      is_active: true,
      headers: headers || {}
    })
  })
  return response.json()
}
```

### Available Scopes

```
store/order/created
store/order/updated
store/order/archived
store/order/statusUpdated
store/order/message/created

store/product/created
store/product/updated
store/product/deleted
store/product/inventory/updated
store/product/inventory/order/updated

store/customer/created
store/customer/updated
store/customer/deleted

store/cart/created
store/cart/updated
store/cart/deleted
store/cart/converted

store/shipment/created
store/shipment/updated
store/shipment/deleted
```

### List Webhooks

```typescript
async function listWebhooks() {
  const response = await fetch(`${baseUrl}/hooks`, { headers })
  return response.json()
}
```

### Delete Webhook

```typescript
async function deleteWebhook(webhookId: number) {
  const response = await fetch(`${baseUrl}/hooks/${webhookId}`, {
    method: 'DELETE',
    headers
  })
  return response.status === 204
}
```

---

## Storefront API

### Redirects

```typescript
// Create redirect
async function createRedirect(fromPath: string, toUrl: string) {
  const response = await fetch(`${baseUrl}/storefront/redirects`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      from_path: fromPath,
      to: { type: 'url', url: toUrl },
      site_id: 1
    })
  })
  return response.json()
}

// Get redirects
async function getRedirects() {
  const response = await fetch(
    `${baseUrl}/storefront/redirects`,
    { headers }
  )
  return response.json()
}
```

---

## Rate Limiting

### Limits by Plan

| Plan | Per Second | Strategy |
|------|------------|----------|
| Enterprise | 450 | Token bucket |
| Pro | 60 | Token bucket |
| Standard | 20,000/hr | Rolling window |

### Response Headers

```
X-Rate-Limit-Requests-Left: 448
X-Rate-Limit-Requests-Quota: 450
X-Rate-Limit-Time-Reset-Ms: 1000
X-Rate-Limit-Time-Window-Ms: 30000
```

### Rate Limit Handler

```typescript
async function rateLimitedFetch(url: string, options: RequestInit) {
  const response = await fetch(url, options)

  if (response.status === 429) {
    const resetMs = parseInt(
      response.headers.get('X-Rate-Limit-Time-Reset-Ms') || '1000'
    )
    await new Promise(resolve => setTimeout(resolve, resetMs))
    return rateLimitedFetch(url, options)
  }

  return response
}
```

---

## Pagination

### Standard Pagination

```typescript
async function getAllProducts() {
  const allProducts = []
  let page = 1
  const limit = 250

  while (true) {
    const response = await fetch(
      `${baseUrl}/catalog/products?page=${page}&limit=${limit}`,
      { headers }
    )
    const data = await response.json()

    allProducts.push(...data.data)

    if (data.data.length < limit) break
    page++
  }

  return allProducts
}
```

### Pagination Response

```json
{
  "data": [...],
  "meta": {
    "pagination": {
      "total": 3000,
      "count": 250,
      "per_page": 250,
      "current_page": 1,
      "total_pages": 12
    }
  }
}
```

---

## Error Handling

### Error Response Format

```json
{
  "status": 422,
  "title": "Validation Error",
  "errors": {
    "sku": ["SKU already exists"]
  }
}
```

### Error Handler

```typescript
async function handleBCResponse(response: Response) {
  if (!response.ok) {
    const error = await response.json()
    throw new Error(`BigCommerce Error: ${error.title} - ${JSON.stringify(error.errors)}`)
  }
  return response.json()
}
```

---

## Best Practices

### Batch Operations

```typescript
// Update up to 10 products at once
const batches = chunk(products, 10)
for (const batch of batches) {
  await bulkUpdateProducts(batch)
  await delay(100) // Small delay between batches
}
```

### Include Related Data

```typescript
// Get product with all related data in one call
const product = await getProduct(123, ['variants', 'images', 'custom_fields', 'bulk_pricing_rules'])
```

### Efficient Filtering

```typescript
// Use API filters instead of client-side
const lowStock = await getProducts({
  'inventory_level:less': 10,
  is_visible: true,
  limit: 250
})
```

### Cache Static Data

```typescript
// Cache categories and brands (change infrequently)
const categories = await redis.get('bc:categories') || await getCategories()
await redis.setex('bc:categories', 3600, categories)
```
