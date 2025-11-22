# BigCommerce Integration Library

Type-safe BigCommerce V3 REST API client for Buy Organics Online.

## Features

- ✅ **Type-safe** - Full TypeScript definitions for all API responses
- ✅ **Rate limiting** - Automatic rate limiting (450 req/30sec)
- ✅ **Auto-retry** - Exponential backoff for failed requests
- ✅ **Error handling** - Standardized error messages and logging
- ✅ **Health checks** - Built-in connection monitoring

## Installation

No installation needed - already part of master-ops.

## Configuration

Set environment variables in `.env`:

```bash
BIGCOMMERCE_BOO_STORE_HASH=hhhi
BIGCOMMERCE_BOO_ACCESS_TOKEN=your-access-token
BIGCOMMERCE_BOO_CLIENT_ID=your-client-id
BIGCOMMERCE_BOO_CLIENT_SECRET=your-client-secret
```

## Usage

### Basic Example

```typescript
import { bigcommerceClient } from '@/shared/libs/integrations/bigcommerce'

// Get store information
const store = await bigcommerceClient.store.get()
console.log(store.name, store.domain, store.currency)

// List products
const products = await bigcommerceClient.products.list({ limit: 10 })

// Get single product
const product = await bigcommerceClient.products.get(123)

// Count products
const totalProducts = await bigcommerceClient.products.count()
```

### Products API

```typescript
// List with filters
const products = await bigcommerceClient.products.list({
  limit: 50,
  page: 1,
  is_visible: true,
  type: 'physical',
  name: 'organic',
})

// Get specific product
const product = await bigcommerceClient.products.get(123)

// Create product
const newProduct = await bigcommerceClient.products.create({
  name: 'Organic Coffee',
  type: 'physical',
  price: 29.99,
  weight: 500,
  categories: [12, 34],
})

// Update product
await bigcommerceClient.products.update(123, {
  price: 24.99,
  inventory_level: 100,
})

// Delete product
await bigcommerceClient.products.delete(123)
```

### Orders API

```typescript
// List recent orders
const orders = await bigcommerceClient.orders.list({
  limit: 50,
  sort: 'date_created',
  direction: 'desc',
})

// Filter by status
const pendingOrders = await bigcommerceClient.orders.list({
  status_id: 11, // Awaiting Fulfillment
})

// Get specific order
const order = await bigcommerceClient.orders.get(98765)

// Count orders
const totalOrders = await bigcommerceClient.orders.count()

// Update order status
await bigcommerceClient.orders.update(98765, {
  status_id: 10, // Completed
})
```

### Customers API

```typescript
// List customers
const customers = await bigcommerceClient.customers.list({
  limit: 100,
})

// Search by email
const customers = await bigcommerceClient.customers.list({
  email: 'customer@example.com',
})

// Get specific customer
const customer = await bigcommerceClient.customers.get(456)

// Create customer
const newCustomer = await bigcommerceClient.customers.create({
  email: 'new@example.com',
  first_name: 'John',
  last_name: 'Doe',
})

// Update customer
await bigcommerceClient.customers.update(456, {
  customer_group_id: 2,
})
```

### Shipping API

```typescript
// List shipping zones
const zones = await bigcommerceClient.shipping.listZones()

// Get specific zone
const zone = await bigcommerceClient.shipping.getZone(1)

// List shipping methods for a zone
const methods = await bigcommerceClient.shipping.listMethods(1)

// Get specific method
const method = await bigcommerceClient.shipping.getMethod(1, 2)
```

### Carts & Checkout API

```typescript
// Create a cart
const cart = await bigcommerceClient.carts.create({
  line_items: [
    {
      quantity: 2,
      product_id: 123,
    },
  ],
})

// Get cart
const existingCart = await bigcommerceClient.carts.get(cart.id)

// Get checkout
const checkout = await bigcommerceClient.checkouts.get(cart.id)

// Add billing address
await bigcommerceClient.checkouts.addBillingAddress(checkout.id, {
  billing_address: {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    address1: '123 Main St',
    city: 'Sydney',
    state: 'NSW',
    zip: '2000',
    country: 'Australia',
    country_iso2: 'AU',
  },
})
```

### Channels API

```typescript
// List all channels
const channels = await bigcommerceClient.channels.list()

// Get specific channel
const channel = await bigcommerceClient.channels.get(1)
```

### Health Check

```typescript
// Check API connectivity
const health = await bigcommerceClient.healthCheck()

if (health.status === 'healthy') {
  console.log(`✅ Connected to ${health.store?.name}`)
  console.log(`📦 ${health.productCount} products`)
} else {
  console.error(`❌ Error: ${health.error}`)
}
```

### Error Handling

```typescript
import { bigcommerceClient } from '@/shared/libs/integrations/bigcommerce'

try {
  const product = await bigcommerceClient.products.get(99999)
} catch (error) {
  if (error.statusCode === 404) {
    console.log('Product not found')
  } else if (error.statusCode === 429) {
    console.log('Rate limit exceeded, retry after:', error.details.retryAfter)
  } else {
    console.error('API error:', error.message)
  }
}
```

### Custom Configuration

```typescript
import { BigCommerceConnector } from '@/shared/libs/integrations/bigcommerce'

// Create custom instance with different rate limits
const customClient = new BigCommerceConnector({
  storeHash: 'custom-store',
  accessToken: 'custom-token',
  rateLimitPerWindow: 300, // Slower rate limit
})

const products = await customClient.products.list()
```

## API Reference

### Store API
- `store.get()` - Get store information

### Products API
- `products.list(options)` - List products with filters
- `products.get(id)` - Get single product
- `products.count(filters)` - Count products
- `products.create(data)` - Create product
- `products.update(id, data)` - Update product
- `products.delete(id)` - Delete product

### Orders API
- `orders.list(options)` - List orders with filters
- `orders.get(id)` - Get single order
- `orders.count(filters)` - Count orders
- `orders.update(id, data)` - Update order

### Customers API
- `customers.list(options)` - List customers with filters
- `customers.get(id)` - Get single customer
- `customers.count(filters)` - Count customers
- `customers.create(data)` - Create customer
- `customers.update(id, data)` - Update customer
- `customers.delete(ids)` - Delete customers

### Shipping API
- `shipping.listZones()` - List shipping zones
- `shipping.getZone(id)` - Get shipping zone
- `shipping.listMethods(zoneId)` - List shipping methods
- `shipping.getMethod(zoneId, methodId)` - Get shipping method

### Carts API
- `carts.create(data)` - Create cart
- `carts.get(id)` - Get cart
- `carts.update(id, data)` - Update cart
- `carts.delete(id)` - Delete cart

### Checkout API
- `checkouts.get(id)` - Get checkout
- `checkouts.addBillingAddress(id, address)` - Add billing address

### Channels API
- `channels.list()` - List channels
- `channels.get(id)` - Get channel

### Payment API
- `payments.getMethods(orderId)` - Get payment methods

## Rate Limits

BigCommerce enforces:
- **450 requests per 30 seconds** (default)
- **3 concurrent requests** max

This library handles rate limiting automatically.

## Testing

Run integration test:

```bash
npx tsx test/bigcommerce-boo-integration-test.ts
```

## Troubleshooting

### 401 Unauthorized
- Check `BIGCOMMERCE_BOO_ACCESS_TOKEN` is set correctly
- Verify API account is still active

### 403 Forbidden
- Check API account has required scopes (see BIGCOMMERCE-API-SETUP.md)
- Update permissions in BigCommerce admin

### 429 Too Many Requests
- Library handles this automatically with retry
- Reduce `rateLimitPerWindow` if needed

### Connection Issues
- Run `npx tsx validate-bigcommerce-credentials.ts`
- Check store hash is correct (`hhhi`)

## Links

- [BigCommerce API Docs](https://developer.bigcommerce.com/docs/rest-management)
- [Store Admin](https://store-hhhi.mybigcommerce.com/manage/)
- [API Accounts](https://store-hhhi.mybigcommerce.com/manage/settings/api-accounts)
