# Shopify API Guide

## Overview

Shopify provides multiple APIs:
- **REST Admin API**: Traditional REST endpoints
- **GraphQL Admin API**: More efficient for complex queries
- **Storefront API**: For customer-facing applications

---

## Authentication

### Private App Access

```typescript
const config = {
  shop: process.env.SHOPIFY_SHOP_DOMAIN,  // store.myshopify.com
  accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
  apiVersion: '2024-01'
}

const headers = {
  'X-Shopify-Access-Token': config.accessToken,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
}

const baseUrl = `https://${config.shop}/admin/api/${config.apiVersion}`
```

### Required Scopes

```
read_products, write_products
read_orders, write_orders
read_customers, write_customers
read_inventory, write_inventory
read_locations
read_fulfillments, write_fulfillments
```

---

## REST Admin API

### Products

#### List Products

```typescript
async function getProducts(params?: {
  limit?: number
  status?: 'active' | 'draft' | 'archived'
  product_type?: string
  vendor?: string
  collection_id?: number
  since_id?: number
}) {
  const query = new URLSearchParams(params as any)
  const response = await fetch(`${baseUrl}/products.json?${query}`, { headers })
  return response.json()
}
```

#### Get Product

```typescript
async function getProduct(id: number) {
  const response = await fetch(`${baseUrl}/products/${id}.json`, { headers })
  return response.json()
}
```

#### Create Product

```typescript
interface CreateProductInput {
  title: string
  body_html?: string
  vendor?: string
  product_type?: string
  tags?: string[]
  status?: 'active' | 'draft' | 'archived'
  variants?: Array<{
    price: string
    compare_at_price?: string
    sku?: string
    barcode?: string
    weight?: number
    weight_unit?: 'kg' | 'g' | 'lb' | 'oz'
    inventory_management?: 'shopify' | null
    inventory_policy?: 'deny' | 'continue'
    inventory_quantity?: number
    option1?: string
    option2?: string
    option3?: string
  }>
  options?: Array<{
    name: string
    values: string[]
  }>
  images?: Array<{
    src?: string
    position?: number
    alt?: string
  }>
}

async function createProduct(product: CreateProductInput) {
  const response = await fetch(`${baseUrl}/products.json`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ product })
  })
  return response.json()
}
```

#### Update Product

```typescript
async function updateProduct(id: number, updates: Partial<CreateProductInput>) {
  const response = await fetch(`${baseUrl}/products/${id}.json`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ product: updates })
  })
  return response.json()
}
```

#### Delete Product

```typescript
async function deleteProduct(id: number) {
  const response = await fetch(`${baseUrl}/products/${id}.json`, {
    method: 'DELETE',
    headers
  })
  return response.status === 200
}
```

### Variants

#### Get Variants

```typescript
async function getVariants(productId: number) {
  const response = await fetch(
    `${baseUrl}/products/${productId}/variants.json`,
    { headers }
  )
  return response.json()
}
```

#### Update Variant

```typescript
async function updateVariant(variantId: number, updates: {
  price?: string
  compare_at_price?: string
  sku?: string
  inventory_quantity?: number
}) {
  const response = await fetch(`${baseUrl}/variants/${variantId}.json`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ variant: updates })
  })
  return response.json()
}
```

### Collections

#### Get Collections

```typescript
async function getSmartCollections() {
  const response = await fetch(`${baseUrl}/smart_collections.json`, { headers })
  return response.json()
}

async function getCustomCollections() {
  const response = await fetch(`${baseUrl}/custom_collections.json`, { headers })
  return response.json()
}
```

#### Create Smart Collection

```typescript
interface SmartCollectionRule {
  column: 'tag' | 'title' | 'type' | 'vendor' | 'variant_price' | 'variant_compare_at_price' | 'variant_weight' | 'variant_inventory' | 'variant_title'
  relation: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'starts_with' | 'ends_with' | 'contains' | 'not_contains'
  condition: string
}

async function createSmartCollection(collection: {
  title: string
  rules: SmartCollectionRule[]
  disjunctive?: boolean
  sort_order?: string
}) {
  const response = await fetch(`${baseUrl}/smart_collections.json`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ smart_collection: collection })
  })
  return response.json()
}
```

#### Add Product to Custom Collection

```typescript
async function addProductToCollection(collectionId: number, productId: number) {
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

### Inventory

#### Get Inventory Levels

```typescript
async function getInventoryLevels(params: {
  inventory_item_ids?: string  // comma-separated
  location_ids?: string  // comma-separated
}) {
  const query = new URLSearchParams(params)
  const response = await fetch(
    `${baseUrl}/inventory_levels.json?${query}`,
    { headers }
  )
  return response.json()
}
```

#### Set Inventory Level

```typescript
async function setInventory(
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

#### Adjust Inventory

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

#### Get Locations

```typescript
async function getLocations() {
  const response = await fetch(`${baseUrl}/locations.json`, { headers })
  return response.json()
}
```

### Orders

#### Get Orders

```typescript
async function getOrders(params: {
  status?: 'open' | 'closed' | 'cancelled' | 'any'
  fulfillment_status?: 'shipped' | 'partial' | 'unshipped' | 'unfulfilled' | 'any'
  financial_status?: 'paid' | 'pending' | 'refunded' | 'partially_refunded' | 'any'
  created_at_min?: string
  created_at_max?: string
  updated_at_min?: string
  limit?: number
}) {
  const query = new URLSearchParams(params as any)
  const response = await fetch(`${baseUrl}/orders.json?${query}`, { headers })
  return response.json()
}
```

#### Get Order

```typescript
async function getOrder(orderId: number) {
  const response = await fetch(`${baseUrl}/orders/${orderId}.json`, { headers })
  return response.json()
}
```

#### Close Order

```typescript
async function closeOrder(orderId: number) {
  const response = await fetch(`${baseUrl}/orders/${orderId}/close.json`, {
    method: 'POST',
    headers
  })
  return response.json()
}
```

### Fulfillments

#### Create Fulfillment

```typescript
async function createFulfillment(orderId: number, fulfillment: {
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

#### Update Tracking

```typescript
async function updateTracking(fulfillmentId: number, tracking: {
  tracking_number: string
  tracking_company?: string
  tracking_url?: string
  notify_customer?: boolean
}) {
  const response = await fetch(`${baseUrl}/fulfillments/${fulfillmentId}/update_tracking.json`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ fulfillment: tracking })
  })
  return response.json()
}
```

### Customers

#### Get Customers

```typescript
async function getCustomers(params?: {
  ids?: string
  email?: string
  created_at_min?: string
  limit?: number
}) {
  const query = new URLSearchParams(params as any)
  const response = await fetch(`${baseUrl}/customers.json?${query}`, { headers })
  return response.json()
}
```

#### Search Customers

```typescript
async function searchCustomers(query: string) {
  const response = await fetch(
    `${baseUrl}/customers/search.json?query=${encodeURIComponent(query)}`,
    { headers }
  )
  return response.json()
}
```

### Metafields

#### Get Metafields

```typescript
async function getMetafields(
  resourceType: 'products' | 'customers' | 'orders' | 'shop',
  resourceId?: number
) {
  const path = resourceId
    ? `${baseUrl}/${resourceType}/${resourceId}/metafields.json`
    : `${baseUrl}/metafields.json`

  const response = await fetch(path, { headers })
  return response.json()
}
```

#### Create Metafield

```typescript
async function createMetafield(
  resourceType: 'products' | 'customers' | 'orders',
  resourceId: number,
  metafield: {
    namespace: string
    key: string
    value: string
    type: 'single_line_text_field' | 'multi_line_text_field' | 'number_integer' | 'number_decimal' | 'json' | 'boolean' | 'date' | 'url'
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

---

## GraphQL Admin API

### Setup

```typescript
const graphqlUrl = `https://${shop}/admin/api/2024-01/graphql.json`

async function graphql(query: string, variables?: Record<string, any>) {
  const response = await fetch(graphqlUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables })
  })
  return response.json()
}
```

### Product Queries

```graphql
# Get products with variants
query getProducts($first: Int!) {
  products(first: $first) {
    edges {
      node {
        id
        title
        handle
        status
        totalInventory
        variants(first: 10) {
          edges {
            node {
              id
              title
              price
              sku
              inventoryQuantity
            }
          }
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

### Product Mutations

```graphql
mutation productUpdate($input: ProductInput!) {
  productUpdate(input: $input) {
    product {
      id
      title
    }
    userErrors {
      field
      message
    }
  }
}

# Usage
variables: {
  input: {
    id: "gid://shopify/Product/123",
    title: "New Title"
  }
}
```

### Inventory Mutations

```graphql
mutation inventorySetOnHandQuantities($input: InventorySetOnHandQuantitiesInput!) {
  inventorySetOnHandQuantities(input: $input) {
    inventoryAdjustmentGroup {
      createdAt
      reason
    }
    userErrors {
      field
      message
    }
  }
}

# Usage
variables: {
  input: {
    reason: "correction",
    setQuantities: [{
      inventoryItemId: "gid://shopify/InventoryItem/123",
      locationId: "gid://shopify/Location/456",
      quantity: 100
    }]
  }
}
```

### Bulk Operations

```graphql
mutation bulkOperationRunQuery($query: String!) {
  bulkOperationRunQuery(query: $query) {
    bulkOperation {
      id
      status
    }
    userErrors {
      field
      message
    }
  }
}

# Query to run in bulk
{
  products {
    edges {
      node {
        id
        title
        variants {
          edges {
            node {
              id
              sku
              inventoryQuantity
            }
          }
        }
      }
    }
  }
}
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

### Webhook Topics

| Category | Topics |
|----------|--------|
| Orders | orders/create, orders/updated, orders/paid, orders/fulfilled, orders/cancelled |
| Products | products/create, products/update, products/delete |
| Inventory | inventory_levels/connect, inventory_levels/update, inventory_levels/disconnect |
| Customers | customers/create, customers/update, customers/delete |
| Fulfillments | fulfillments/create, fulfillments/update |
| Checkouts | checkouts/create, checkouts/update |

### Webhook Verification

```typescript
import crypto from 'crypto'

function verifyWebhook(body: string, hmacHeader: string, secret: string): boolean {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('base64')

  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(hmacHeader)
  )
}
```

---

## Rate Limiting

### REST API

- Leaky bucket algorithm
- 40 requests per app per store
- Check headers: `X-Shopify-Shop-Api-Call-Limit`

```typescript
async function rateLimitedFetch(url: string, options: RequestInit) {
  const response = await fetch(url, options)

  if (response.status === 429) {
    const retryAfter = parseFloat(response.headers.get('Retry-After') || '2')
    await new Promise(r => setTimeout(r, retryAfter * 1000))
    return rateLimitedFetch(url, options)
  }

  return response
}
```

### GraphQL API

- 1,000 cost points per query
- Cost calculated per query complexity
- Use `extensions.cost` in response

---

## Pagination

### Cursor-Based (Recommended)

```typescript
async function getAllProducts() {
  const allProducts = []
  let pageInfo: string | null = null

  do {
    const url = pageInfo
      ? `${baseUrl}/products.json?limit=250&page_info=${pageInfo}`
      : `${baseUrl}/products.json?limit=250`

    const response = await fetch(url, { headers })
    const data = await response.json()

    allProducts.push(...data.products)

    // Get next page cursor from Link header
    const linkHeader = response.headers.get('Link')
    pageInfo = extractNextPageInfo(linkHeader)
  } while (pageInfo)

  return allProducts
}

function extractNextPageInfo(linkHeader: string | null): string | null {
  if (!linkHeader) return null
  const match = linkHeader.match(/<[^>]*page_info=([^>&]*).*>; rel="next"/)
  return match ? match[1] : null
}
```

---

## Error Handling

### Error Response

```json
{
  "errors": {
    "title": ["can't be blank"],
    "price": ["must be greater than 0"]
  }
}
```

### Error Handler

```typescript
async function handleResponse(response: Response) {
  if (!response.ok) {
    const error = await response.json()
    if (error.errors) {
      const messages = Object.entries(error.errors)
        .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`)
        .join('; ')
      throw new Error(`Shopify Error: ${messages}`)
    }
    throw new Error(`Shopify Error: ${response.statusText}`)
  }
  return response.json()
}
```

---

## Best Practices

1. **Use GraphQL for Complex Queries**: More efficient than multiple REST calls
2. **Implement Retry Logic**: Handle 429 errors gracefully
3. **Use Webhooks**: Instead of polling for changes
4. **Batch Updates**: Use bulk operations for large datasets
5. **Cache Static Data**: Locations, shipping zones rarely change
6. **Use Cursor Pagination**: More reliable than page numbers
