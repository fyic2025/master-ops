# Shopify Integration

Type-safe Shopify Admin API client with built-in rate limiting, retry logic, error handling, and logging.

## Features

- ✅ **Type-Safe**: Full TypeScript types for all Shopify resources
- ✅ **Rate Limiting**: Automatic rate limiting (2 requests/second - Shopify standard)
- ✅ **Retry Logic**: Automatic retries with exponential backoff
- ✅ **Error Handling**: Comprehensive error handling with detailed logging
- ✅ **Health Checks**: Built-in health check functionality
- ✅ **Logging**: Centralized logging to Supabase

## Setup

### 1. Environment Variables

Add to your `.env` file:

```bash
SHOPIFY_ACCESS_TOKEN=shpat_your_access_token_here
SHOPIFY_SHOP_DOMAIN=your-store.myshopify.com
SHOPIFY_API_VERSION=2024-01
```

### 2. Import and Use

```typescript
import { shopifyClient } from '@/shared/libs/integrations/shopify'

// Get products
const products = await shopifyClient.products.list({ limit: 250, status: 'active' })

// Get orders
const orders = await shopifyClient.orders.list({ status: 'any', limit: 100 })

// Get shop info
const shop = await shopifyClient.shop.get()
```

## Available APIs

### Products API

```typescript
// Get product by ID
const product = await shopifyClient.products.get('12345')

// List products
const products = await shopifyClient.products.list({
  limit: 250,
  status: 'active', // 'active' | 'archived' | 'draft'
  fields: ['id', 'title', 'variants']
})

// Count products
const count = await shopifyClient.products.count({ status: 'active' })

// Create product
const newProduct = await shopifyClient.products.create({
  title: 'New Product',
  body_html: '<p>Description</p>',
  vendor: 'Teelixir',
  product_type: 'Health',
  variants: [{
    price: '29.99',
    sku: 'PROD-001'
  }]
})

// Update product
const updated = await shopifyClient.products.update('12345', {
  title: 'Updated Title'
})

// Delete product
await shopifyClient.products.delete('12345')
```

### Orders API

```typescript
// Get order by ID
const order = await shopifyClient.orders.get('98765')

// List orders
const orders = await shopifyClient.orders.list({
  limit: 250,
  status: 'any', // 'open' | 'closed' | 'cancelled' | 'any'
  financial_status: 'paid',
  fulfillment_status: 'unfulfilled'
})

// Count orders
const orderCount = await shopifyClient.orders.count({ status: 'open' })

// Create order
const newOrder = await shopifyClient.orders.create({
  email: 'customer@example.com',
  line_items: [{
    variant_id: 12345,
    quantity: 2
  }]
})

// Update order
const updated = await shopifyClient.orders.update('98765', {
  note: 'Updated note'
})

// Cancel order
const cancelled = await shopifyClient.orders.cancel('98765', {
  reason: 'customer',
  restock: true
})
```

### Customers API

```typescript
// Get customer by ID
const customer = await shopifyClient.customers.get('54321')

// List customers
const customers = await shopifyClient.customers.list({
  limit: 250,
  fields: ['id', 'email', 'first_name', 'last_name']
})

// Search customers
const results = await shopifyClient.customers.search('email:john@example.com')

// Create customer
const newCustomer = await shopifyClient.customers.create({
  email: 'new@example.com',
  first_name: 'John',
  last_name: 'Doe'
})

// Update customer
const updated = await shopifyClient.customers.update('54321', {
  phone: '+61400000000'
})
```

### Inventory API

```typescript
// Get inventory levels
const levels = await shopifyClient.inventory.levels([12345, 67890])

// Adjust inventory (relative change)
const adjusted = await shopifyClient.inventory.adjust(
  12345, // inventory_item_id
  98765, // location_id
  -5     // adjust by -5
)

// Set inventory (absolute value)
const set = await shopifyClient.inventory.set(
  12345, // inventory_item_id
  98765, // location_id
  100    // set to 100
)
```

### Collections API

```typescript
// Get collection by ID
const collection = await shopifyClient.collections.get('11111')

// List collections
const collections = await shopifyClient.collections.list({ limit: 250 })
```

### Shop API

```typescript
// Get shop information
const shop = await shopifyClient.shop.get()
console.log(shop.name)
console.log(shop.domain)
console.log(shop.currency)
```

## Health Check

```typescript
const health = await shopifyClient.healthCheck()
console.log(health.healthy) // true/false
console.log(health.service) // 'shopify'
console.log(health.timestamp)
```

## Metrics

```typescript
const metrics = shopifyClient.getMetrics()
console.log(metrics.service)
console.log(metrics.rateLimiter.availableTokens)
console.log(metrics.timeout)
```

## Testing

Run the integration test:

```bash
npx tsx test/shopify-integration-test.ts
```

## Rate Limits

Shopify has a standard rate limit of **2 requests per second**. This client automatically handles rate limiting and will queue requests appropriately.

For higher limits, Shopify Plus stores have **4 requests per second**.

## Error Handling

All errors are wrapped in `IntegrationError` with detailed context:

```typescript
try {
  const product = await shopifyClient.products.get('12345')
} catch (error) {
  console.error(error.code) // e.g., 'NOT_FOUND', 'RATE_LIMIT'
  console.error(error.category) // e.g., 'client', 'server', 'network'
  console.error(error.message)
  console.error(error.details) // Additional context
}
```

## Logging

All operations are automatically logged to Supabase via the centralized logging system. Logs include:

- Operation name
- Duration
- Success/failure status
- Error details (if applicable)
- Request metadata

## Store Configuration

**Current Store**: Teelixir Australia
- Domain: teelixir.com.au
- Shop Domain: teelixir-au.myshopify.com
- Currency: AUD
- Active Products: 51
- Total Orders: 30,528+

## Advanced Usage

### Custom Configuration

```typescript
import { ShopifyConnector } from '@/shared/libs/integrations/shopify'

const customClient = new ShopifyConnector({
  accessToken: 'custom_token',
  shopDomain: 'custom-store.myshopify.com',
  apiVersion: '2024-01',
  rateLimitPerSecond: 4 // For Shopify Plus
})
```

### Batch Operations

```typescript
// Process multiple products
const productIds = ['123', '456', '789']
const results = await shopifyClient.batchExecute(
  productIds,
  'products.get',
  id => shopifyClient.products.get(id),
  { concurrency: 2, continueOnError: true }
)
```

## API Version

Currently using Shopify API version **2024-01**. Update `SHOPIFY_API_VERSION` in `.env` to change versions.

## Resources

- [Shopify Admin API Documentation](https://shopify.dev/docs/api/admin-rest)
- [Rate Limits](https://shopify.dev/docs/api/usage/rate-limits)
- [API Versioning](https://shopify.dev/docs/api/usage/versioning)
