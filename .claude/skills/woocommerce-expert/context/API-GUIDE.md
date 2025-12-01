# WooCommerce API Guide

## Overview

WooCommerce provides a REST API for managing store data. The API is built into WooCommerce core and follows WordPress REST API conventions.

---

## Authentication

### API Keys

1. Go to WooCommerce > Settings > Advanced > REST API
2. Click "Add Key"
3. Set permissions (Read/Write)
4. Copy Consumer Key and Consumer Secret

### Basic Authentication

```typescript
const config = {
  url: process.env.WC_STORE_URL,
  consumerKey: process.env.WC_CONSUMER_KEY,
  consumerSecret: process.env.WC_CONSUMER_SECRET
}

const auth = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64')

const headers = {
  'Authorization': `Basic ${auth}`,
  'Content-Type': 'application/json'
}

const baseUrl = `${config.url}/wp-json/wc/v3`
```

### OAuth 1.0a (for HTTP sites)

```typescript
import OAuth from 'oauth-1.0a'
import crypto from 'crypto'

const oauth = new OAuth({
  consumer: {
    key: config.consumerKey,
    secret: config.consumerSecret
  },
  signature_method: 'HMAC-SHA256',
  hash_function(base_string, key) {
    return crypto.createHmac('sha256', key).update(base_string).digest('base64')
  }
})

function getAuthHeader(url: string, method: string) {
  const request_data = { url, method }
  return oauth.toHeader(oauth.authorize(request_data))
}
```

---

## Products API

### List Products

```typescript
async function getProducts(params?: {
  per_page?: number
  page?: number
  status?: 'draft' | 'pending' | 'private' | 'publish' | 'any'
  category?: number
  tag?: number
  sku?: string
  featured?: boolean
  on_sale?: boolean
  min_price?: string
  max_price?: string
  stock_status?: 'instock' | 'outofstock' | 'onbackorder'
  orderby?: 'date' | 'id' | 'title' | 'slug' | 'price' | 'popularity' | 'rating'
  order?: 'asc' | 'desc'
}) {
  const query = new URLSearchParams(params as any)
  const response = await fetch(`${baseUrl}/products?${query}`, { headers })
  return response.json()
}
```

### Get Product

```typescript
async function getProduct(id: number) {
  const response = await fetch(`${baseUrl}/products/${id}`, { headers })
  return response.json()
}
```

### Create Product

```typescript
interface CreateProductInput {
  name: string
  type?: 'simple' | 'grouped' | 'external' | 'variable'
  status?: 'draft' | 'pending' | 'private' | 'publish'
  description?: string
  short_description?: string
  sku?: string
  regular_price?: string
  sale_price?: string
  virtual?: boolean
  downloadable?: boolean
  manage_stock?: boolean
  stock_quantity?: number
  stock_status?: 'instock' | 'outofstock' | 'onbackorder'
  backorders?: 'no' | 'notify' | 'yes'
  sold_individually?: boolean
  weight?: string
  dimensions?: { length: string; width: string; height: string }
  shipping_class?: string
  categories?: Array<{ id: number }>
  tags?: Array<{ id: number }>
  images?: Array<{ src: string; name?: string; alt?: string }>
  attributes?: Array<{
    name: string
    position: number
    visible: boolean
    variation: boolean
    options: string[]
  }>
  meta_data?: Array<{ key: string; value: string }>
}

async function createProduct(product: CreateProductInput) {
  const response = await fetch(`${baseUrl}/products`, {
    method: 'POST',
    headers,
    body: JSON.stringify(product)
  })
  return response.json()
}
```

### Update Product

```typescript
async function updateProduct(id: number, updates: Partial<CreateProductInput>) {
  const response = await fetch(`${baseUrl}/products/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updates)
  })
  return response.json()
}
```

### Delete Product

```typescript
async function deleteProduct(id: number, force = false) {
  const response = await fetch(`${baseUrl}/products/${id}?force=${force}`, {
    method: 'DELETE',
    headers
  })
  return response.json()
}
```

### Batch Operations

```typescript
async function batchProducts(batch: {
  create?: CreateProductInput[]
  update?: Array<{ id: number } & Partial<CreateProductInput>>
  delete?: number[]
}) {
  const response = await fetch(`${baseUrl}/products/batch`, {
    method: 'POST',
    headers,
    body: JSON.stringify(batch)
  })
  return response.json()
}
```

---

## Variations API

### Get Variations

```typescript
async function getVariations(productId: number) {
  const response = await fetch(`${baseUrl}/products/${productId}/variations`, { headers })
  return response.json()
}
```

### Create Variation

```typescript
interface CreateVariationInput {
  description?: string
  sku?: string
  regular_price: string
  sale_price?: string
  manage_stock?: boolean
  stock_quantity?: number
  stock_status?: 'instock' | 'outofstock' | 'onbackorder'
  weight?: string
  dimensions?: { length: string; width: string; height: string }
  image?: { src: string; name?: string; alt?: string }
  attributes: Array<{ name: string; option: string }>
}

async function createVariation(productId: number, variation: CreateVariationInput) {
  const response = await fetch(`${baseUrl}/products/${productId}/variations`, {
    method: 'POST',
    headers,
    body: JSON.stringify(variation)
  })
  return response.json()
}
```

### Update Variation

```typescript
async function updateVariation(
  productId: number,
  variationId: number,
  updates: Partial<CreateVariationInput>
) {
  const response = await fetch(`${baseUrl}/products/${productId}/variations/${variationId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updates)
  })
  return response.json()
}
```

---

## Categories API

### List Categories

```typescript
async function getCategories(params?: {
  per_page?: number
  parent?: number
  hide_empty?: boolean
}) {
  const query = new URLSearchParams(params as any)
  const response = await fetch(`${baseUrl}/products/categories?${query}`, { headers })
  return response.json()
}
```

### Create Category

```typescript
async function createCategory(category: {
  name: string
  slug?: string
  parent?: number
  description?: string
  image?: { src: string }
}) {
  const response = await fetch(`${baseUrl}/products/categories`, {
    method: 'POST',
    headers,
    body: JSON.stringify(category)
  })
  return response.json()
}
```

---

## Orders API

### List Orders

```typescript
async function getOrders(params?: {
  per_page?: number
  page?: number
  status?: string  // pending, processing, on-hold, completed, cancelled, refunded, failed
  customer?: number
  product?: number
  after?: string  // ISO8601 date
  before?: string
  orderby?: 'date' | 'id' | 'include' | 'title' | 'slug'
  order?: 'asc' | 'desc'
}) {
  const query = new URLSearchParams(params as any)
  const response = await fetch(`${baseUrl}/orders?${query}`, { headers })
  return response.json()
}
```

### Get Order

```typescript
async function getOrder(id: number) {
  const response = await fetch(`${baseUrl}/orders/${id}`, { headers })
  return response.json()
}
```

### Create Order

```typescript
interface CreateOrderInput {
  status?: string
  customer_id?: number
  billing?: {
    first_name: string
    last_name: string
    address_1: string
    address_2?: string
    city: string
    state: string
    postcode: string
    country: string
    email: string
    phone?: string
  }
  shipping?: {
    first_name: string
    last_name: string
    address_1: string
    address_2?: string
    city: string
    state: string
    postcode: string
    country: string
  }
  line_items: Array<{
    product_id: number
    variation_id?: number
    quantity: number
  }>
  shipping_lines?: Array<{
    method_id: string
    method_title: string
    total: string
  }>
  coupon_lines?: Array<{ code: string }>
  fee_lines?: Array<{ name: string; total: string }>
  meta_data?: Array<{ key: string; value: string }>
}

async function createOrder(order: CreateOrderInput) {
  const response = await fetch(`${baseUrl}/orders`, {
    method: 'POST',
    headers,
    body: JSON.stringify(order)
  })
  return response.json()
}
```

### Update Order

```typescript
async function updateOrder(id: number, updates: Partial<CreateOrderInput>) {
  const response = await fetch(`${baseUrl}/orders/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updates)
  })
  return response.json()
}
```

### Add Order Note

```typescript
async function addOrderNote(orderId: number, note: string, customerNote = false) {
  const response = await fetch(`${baseUrl}/orders/${orderId}/notes`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ note, customer_note: customerNote })
  })
  return response.json()
}
```

---

## Customers API

### List Customers

```typescript
async function getCustomers(params?: {
  per_page?: number
  page?: number
  email?: string
  role?: string
  orderby?: 'id' | 'include' | 'name' | 'registered_date'
  order?: 'asc' | 'desc'
}) {
  const query = new URLSearchParams(params as any)
  const response = await fetch(`${baseUrl}/customers?${query}`, { headers })
  return response.json()
}
```

### Create Customer

```typescript
async function createCustomer(customer: {
  email: string
  first_name: string
  last_name: string
  username?: string
  password?: string
  billing?: Record<string, string>
  shipping?: Record<string, string>
}) {
  const response = await fetch(`${baseUrl}/customers`, {
    method: 'POST',
    headers,
    body: JSON.stringify(customer)
  })
  return response.json()
}
```

---

## Coupons API

### Create Coupon

```typescript
async function createCoupon(coupon: {
  code: string
  discount_type: 'percent' | 'fixed_cart' | 'fixed_product'
  amount: string
  individual_use?: boolean
  exclude_sale_items?: boolean
  minimum_amount?: string
  maximum_amount?: string
  product_ids?: number[]
  excluded_product_ids?: number[]
  product_categories?: number[]
  excluded_product_categories?: number[]
  email_restrictions?: string[]
  usage_limit?: number
  usage_limit_per_user?: number
  limit_usage_to_x_items?: number
  free_shipping?: boolean
  date_expires?: string
}) {
  const response = await fetch(`${baseUrl}/coupons`, {
    method: 'POST',
    headers,
    body: JSON.stringify(coupon)
  })
  return response.json()
}
```

---

## Shipping API

### Get Shipping Zones

```typescript
async function getShippingZones() {
  const response = await fetch(`${baseUrl}/shipping/zones`, { headers })
  return response.json()
}
```

### Get Zone Methods

```typescript
async function getZoneMethods(zoneId: number) {
  const response = await fetch(`${baseUrl}/shipping/zones/${zoneId}/methods`, { headers })
  return response.json()
}
```

### Add Shipping Method

```typescript
async function addShippingMethod(zoneId: number, method: {
  method_id: string  // flat_rate, free_shipping, local_pickup
}) {
  const response = await fetch(`${baseUrl}/shipping/zones/${zoneId}/methods`, {
    method: 'POST',
    headers,
    body: JSON.stringify(method)
  })
  return response.json()
}
```

---

## Webhooks API

### Create Webhook

```typescript
async function createWebhook(webhook: {
  name: string
  topic: string  // e.g., order.created, product.updated
  delivery_url: string
  secret?: string
  status?: 'active' | 'paused' | 'disabled'
}) {
  const response = await fetch(`${baseUrl}/webhooks`, {
    method: 'POST',
    headers,
    body: JSON.stringify(webhook)
  })
  return response.json()
}
```

### Webhook Topics

| Resource | Actions |
|----------|---------|
| coupon | created, updated, deleted |
| customer | created, updated, deleted |
| order | created, updated, deleted |
| product | created, updated, deleted |

---

## Reports API

### Sales Report

```typescript
async function getSalesReport(params: {
  period?: 'week' | 'month' | 'last_month' | 'year'
  date_min?: string
  date_max?: string
}) {
  const query = new URLSearchParams(params as any)
  const response = await fetch(`${baseUrl}/reports/sales?${query}`, { headers })
  return response.json()
}
```

### Top Sellers

```typescript
async function getTopSellers(params: {
  period?: string
  date_min?: string
  date_max?: string
}) {
  const query = new URLSearchParams(params as any)
  const response = await fetch(`${baseUrl}/reports/top_sellers?${query}`, { headers })
  return response.json()
}
```

---

## System Status

```typescript
async function getSystemStatus() {
  const response = await fetch(`${baseUrl}/system_status`, { headers })
  return response.json()
}
```

---

## Error Handling

### Error Response Format

```json
{
  "code": "woocommerce_rest_product_invalid_id",
  "message": "Invalid ID.",
  "data": {
    "status": 404
  }
}
```

### Error Handler

```typescript
async function handleWCResponse(response: Response) {
  const data = await response.json()

  if (!response.ok) {
    throw new Error(`WooCommerce Error: ${data.code} - ${data.message}`)
  }

  return data
}
```

---

## Pagination

### Pagination Headers

```
X-WP-Total: 100
X-WP-TotalPages: 4
Link: <...?page=2>; rel="next", <...?page=4>; rel="last"
```

### Get All Items

```typescript
async function getAllProducts() {
  const allProducts = []
  let page = 1

  while (true) {
    const response = await fetch(`${baseUrl}/products?per_page=100&page=${page}`, { headers })
    const products = await response.json()

    if (products.length === 0) break

    allProducts.push(...products)
    page++
  }

  return allProducts
}
```

---

## Best Practices

1. **Use Batch Endpoints**: For bulk operations, use `/batch` endpoints
2. **Cache Responses**: Categories, attributes change rarely
3. **Handle Pagination**: Always check for more pages
4. **Use Webhooks**: Instead of polling for changes
5. **Optimize Queries**: Use filters to reduce data transfer
