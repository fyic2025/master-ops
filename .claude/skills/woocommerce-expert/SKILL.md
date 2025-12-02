---
name: woocommerce-expert
description: Expert-level WooCommerce platform management for Red Hill Fresh (RHF). Handles products, orders, inventory, and WordPress integration. Use for any RHF e-commerce operations.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task
---

# WooCommerce Expert Skill

> Expert-level WooCommerce platform management for Red Hill Fresh (RHF).

---

## Skill Identity

**Name:** woocommerce-expert
**Version:** 1.0.0
**Status:** Active
**Last Updated:** 2025-12-01

---

## Capabilities

### Core Functions

1. **Product Management**
   - Simple and variable products
   - Product attributes and variations
   - Category and tag management
   - Inventory management
   - Bulk operations

2. **Order Management**
   - Order processing workflows
   - Fulfillment handling
   - Refund processing
   - Order notes and communication

3. **Store Configuration**
   - Settings management
   - Shipping zones and methods
   - Payment gateways
   - Tax configuration

4. **API Operations**
   - REST API integration
   - Webhook management
   - Third-party connections
   - WP-CLI commands

5. **Performance & SEO**
   - Database optimization
   - Caching strategies
   - SEO plugins integration
   - Site speed optimization

---

## When to Use This Skill

### Activate For:
- "Update product on WooCommerce"
- "RHF store configuration"
- "WooCommerce API"
- "WordPress e-commerce"
- "Order issue in WooCommerce"
- "WooCommerce shipping setup"
- "Product variations"

### Defer To:
- **product-description-generator**: Product copy
- **pricing-optimizer**: Pricing decisions
- **shipping-optimizer**: Shipping strategy

---

## Store Profile

### Red Hill Fresh

**Platform:** WooCommerce + WordPress
**Store URL:** https://redhillfresh.com.au
**WooCommerce Version:** Latest stable
**WordPress Version:** Latest stable

**Business Model:**
Red Hill Fresh is a local farm-to-table fresh produce business serving the Mornington Peninsula and Melbourne metro areas. They specialize in locally sourced organic fruits, vegetables, dairy, eggs, and prepared foods with a focus on seasonal availability and farm-gate freshness.

**Store Stats:**
- Products: 200+ (fresh produce, seasonal rotation)
- Categories: 20+ organized by product type
- Orders/week: Variable (influenced by seasonal demand)
- Delivery zones: Mornington Peninsula (local), Melbourne Metro, Rest of Australia
- Customer accounts: Active with repeat customer loyalty programs

**Key Features:**
- Farm gate pickup available at Red Hill location
- Local delivery scheduling (same-day/next-day for peninsula)
- Seasonal product rotation based on harvest availability
- Weight-based variable products (1kg, 2kg, 3kg options)
- Fresh produce with short shelf-life inventory management

**Payment Methods:**
- Stripe (primary credit/debit card processor)
- PayPal
- Bank transfer (for wholesale/large orders)

**Shipping Configuration:**
- Zone 1: Mornington Peninsula - Free delivery over $50, $8 flat rate under $50
- Zone 2: Melbourne Metro - $15 flat rate, free over $100
- Zone 3: Rest of Australia - Australia Post calculated rates
- Farm gate pickup: Free (Red Hill location)

**Key Integrations:**
- Xero accounting (automated invoice sync)
- Stripe payment gateway
- Local delivery scheduling system
- Australia Post shipping calculator
- Inventory management for perishable goods

---

## Credential Setup

This skill uses the unified credential system via `creds.js` to securely load Red Hill Fresh WooCommerce credentials from the encrypted vault.

### Available Credentials

All credentials are stored in the vault under the `redhillfresh` project:

| Vault Name | Environment Variable | Purpose |
|------------|---------------------|---------|
| `wc_consumer_key` | `REDHILLFRESH_WC_CONSUMER_KEY` | WooCommerce REST API consumer key |
| `wc_consumer_secret` | `REDHILLFRESH_WC_CONSUMER_SECRET` | WooCommerce REST API consumer secret |
| `wp_url` | `REDHILLFRESH_WP_URL` | WordPress/WooCommerce store URL |
| `wp_admin_user` | `REDHILLFRESH_WP_ADMIN_USER` | WordPress admin username |
| `wp_admin_password` | `REDHILLFRESH_WP_ADMIN_PASSWORD` | WordPress admin password |
| `wp_app_password` | `REDHILLFRESH_WP_APP_PASSWORD` | WordPress application password |

### Loading Credentials

```javascript
// In any script within this skill
const creds = require('../../../../creds');

// Load Red Hill Fresh + global credentials into process.env
await creds.load('redhillfresh');

// Now access via environment variables
const consumerKey = process.env.REDHILLFRESH_WC_CONSUMER_KEY;
const consumerSecret = process.env.REDHILLFRESH_WC_CONSUMER_SECRET;
const storeUrl = process.env.REDHILLFRESH_WP_URL;
```

### Manual Credential Access

```bash
# List all Red Hill Fresh credentials
node creds.js list redhillfresh

# Get specific credential
node creds.js get redhillfresh wc_consumer_key

# Export as .env format
node creds.js export redhillfresh > .env.rhf
```

---

## WooCommerce API Reference

### Authentication

```typescript
// WooCommerce REST API with Red Hill Fresh credentials
const config = {
  url: process.env.REDHILLFRESH_WP_URL || 'https://redhillfresh.com.au',
  consumerKey: process.env.REDHILLFRESH_WC_CONSUMER_KEY,
  consumerSecret: process.env.REDHILLFRESH_WC_CONSUMER_SECRET,
  version: 'wc/v3'
}

const baseUrl = `${config.url}/wp-json/${config.version}`

// Generate OAuth signature for HTTP Basic Auth
const auth = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64')

const headers = {
  'Authorization': `Basic ${auth}`,
  'Content-Type': 'application/json'
}
```

### Common Endpoints

| Resource | Endpoint | Methods |
|----------|----------|---------|
| Products | /products | GET, POST, PUT, DELETE |
| Variations | /products/{id}/variations | GET, POST, PUT |
| Categories | /products/categories | GET, POST, PUT |
| Orders | /orders | GET, POST, PUT |
| Customers | /customers | GET, POST, PUT |
| Shipping Zones | /shipping/zones | GET, POST |
| Coupons | /coupons | GET, POST, PUT |
| Reports | /reports | GET |

### Rate Limits

WooCommerce doesn't have built-in rate limits, but:
- Server-side limits may apply
- Recommended: 10 requests/second max
- Batch endpoints for bulk operations

---

## Product Management

### Product Types

| Type | Description |
|------|-------------|
| simple | Standard single product |
| variable | Product with variations |
| grouped | Collection of products |
| external | Affiliate/external link |

### Product Structure

```typescript
interface WCProduct {
  id?: number
  name: string
  slug?: string
  type: 'simple' | 'variable' | 'grouped' | 'external'
  status: 'draft' | 'pending' | 'private' | 'publish'
  description: string
  short_description: string
  sku: string
  price?: string
  regular_price: string
  sale_price?: string
  manage_stock: boolean
  stock_quantity?: number
  stock_status: 'instock' | 'outofstock' | 'onbackorder'
  weight?: string
  dimensions?: { length: string; width: string; height: string }
  categories: Array<{ id: number }>
  tags?: Array<{ id: number }>
  images?: Array<{ src: string; alt?: string }>
  attributes?: WCAttribute[]
  variations?: number[]
}

interface WCAttribute {
  id?: number
  name: string
  position: number
  visible: boolean
  variation: boolean
  options: string[]
}
```

### Create Simple Product

```typescript
async function createProduct(product: Partial<WCProduct>) {
  const response = await fetch(`${baseUrl}/products`, {
    method: 'POST',
    headers,
    body: JSON.stringify(product)
  })
  return response.json()
}

// Example: Fresh produce product
const product = {
  name: "Organic Avocados (3 pack)",
  type: "simple",
  status: "publish",
  description: "<p>Fresh organic avocados from local Mornington Peninsula farms.</p>",
  short_description: "Locally grown organic avocados, perfect ripeness.",
  sku: "RHF-AVO-3PK",
  regular_price: "12.95",
  manage_stock: true,
  stock_quantity: 50,
  categories: [{ id: 15 }],  // Fruit category
  images: [{ src: "https://..." }]
}
```

### Create Variable Product

```typescript
// 1. Create parent product with attributes
const variableProduct = {
  name: "Organic Apples",
  type: "variable",
  status: "publish",
  description: "<p>Fresh organic apples.</p>",
  attributes: [
    {
      name: "Size",
      visible: true,
      variation: true,
      options: ["Small (1kg)", "Medium (2kg)", "Large (3kg)"]
    }
  ]
}

const parent = await createProduct(variableProduct)

// 2. Create variations
const variations = [
  { regular_price: "8.95", attributes: [{ name: "Size", option: "Small (1kg)" }], sku: "RHF-APP-SM" },
  { regular_price: "15.95", attributes: [{ name: "Size", option: "Medium (2kg)" }], sku: "RHF-APP-MD" },
  { regular_price: "21.95", attributes: [{ name: "Size", option: "Large (3kg)" }], sku: "RHF-APP-LG" }
]

for (const variation of variations) {
  await fetch(`${baseUrl}/products/${parent.id}/variations`, {
    method: 'POST',
    headers,
    body: JSON.stringify(variation)
  })
}
```

### Update Product

```typescript
async function updateProduct(productId: number, updates: Partial<WCProduct>) {
  const response = await fetch(`${baseUrl}/products/${productId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updates)
  })
  return response.json()
}
```

### Batch Operations

```typescript
async function batchProducts(operations: {
  create?: Partial<WCProduct>[]
  update?: Partial<WCProduct>[]
  delete?: number[]
}) {
  const response = await fetch(`${baseUrl}/products/batch`, {
    method: 'POST',
    headers,
    body: JSON.stringify(operations)
  })
  return response.json()
}
```

---

## Inventory Management

### Stock Status Values

| Status | Description |
|--------|-------------|
| instock | Available for purchase |
| outofstock | Not available |
| onbackorder | Accepting orders, shipping later |

### Update Stock

```typescript
async function updateStock(productId: number, quantity: number) {
  return updateProduct(productId, {
    manage_stock: true,
    stock_quantity: quantity
  })
}
```

### Get Low Stock Products

```typescript
async function getLowStockProducts(threshold = 10) {
  const response = await fetch(
    `${baseUrl}/products?stock_status=instock&per_page=100`,
    { headers }
  )
  const products = await response.json()

  return products.filter(p =>
    p.manage_stock && p.stock_quantity !== null && p.stock_quantity < threshold
  )
}
```

---

## Category Management

### Category Structure

```typescript
interface WCCategory {
  id?: number
  name: string
  slug?: string
  parent?: number  // 0 for top-level
  description?: string
  image?: { src: string }
  menu_order?: number
}
```

### Create Category

```typescript
async function createCategory(category: WCCategory) {
  const response = await fetch(`${baseUrl}/products/categories`, {
    method: 'POST',
    headers,
    body: JSON.stringify(category)
  })
  return response.json()
}
```

### RHF Category Structure

```
Fresh Produce (0)
├── Fruit
│   ├── Citrus
│   ├── Stone Fruit
│   └── Berries
├── Vegetables
│   ├── Leafy Greens
│   ├── Root Vegetables
│   └── Tomatoes & Peppers
├── Dairy & Eggs
├── Meat & Poultry
├── Pantry Staples
└── Prepared Foods
```

---

## Order Management

### Order Structure

```typescript
interface WCOrder {
  id?: number
  status: 'pending' | 'processing' | 'on-hold' | 'completed' | 'cancelled' | 'refunded' | 'failed'
  billing: WCAddress
  shipping: WCAddress
  line_items: WCLineItem[]
  shipping_lines: Array<{ method_id: string; method_title: string; total: string }>
  payment_method: string
  customer_note?: string
  meta_data?: Array<{ key: string; value: string }>
}

interface WCLineItem {
  id?: number
  product_id: number
  variation_id?: number
  quantity: number
  subtotal?: string
  total?: string
}
```

### Get Orders

```typescript
async function getOrders(params: {
  status?: string
  after?: string
  before?: string
  per_page?: number
  page?: number
}) {
  const query = new URLSearchParams(params as any)
  const response = await fetch(`${baseUrl}/orders?${query}`, { headers })
  return response.json()
}
```

### Update Order Status

```typescript
async function updateOrderStatus(orderId: number, status: string, note?: string) {
  const update: any = { status }
  if (note) {
    // Add order note
    await fetch(`${baseUrl}/orders/${orderId}/notes`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ note, customer_note: false })
    })
  }

  const response = await fetch(`${baseUrl}/orders/${orderId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(update)
  })
  return response.json()
}
```

### Order Status Workflow

```
pending → processing → on-hold → completed
    ↓         ↓          ↓
 failed   cancelled  refunded
```

---

## Shipping Configuration

### Shipping Zones

```typescript
// Get shipping zones
async function getShippingZones() {
  const response = await fetch(`${baseUrl}/shipping/zones`, { headers })
  return response.json()
}

// Get zone methods
async function getZoneMethods(zoneId: number) {
  const response = await fetch(`${baseUrl}/shipping/zones/${zoneId}/methods`, { headers })
  return response.json()
}
```

### RHF Shipping Setup

```
Zone: Mornington Peninsula (Local Delivery)
  - Free local delivery over $50
  - $8 flat rate under $50

Zone: Melbourne Metro
  - $15 flat rate
  - Free over $100

Zone: Rest of Australia
  - Australia Post calculated
```

### Local Pickup Configuration

```typescript
const localPickupSettings = {
  method_id: "local_pickup",
  method_title: "Pick up from Red Hill",
  enabled: true,
  settings: {
    title: "Farm Gate Pickup - Red Hill",
    cost: "0"
  }
}
```

---

## Customer Management

### Customer Structure

```typescript
interface WCCustomer {
  id?: number
  email: string
  first_name: string
  last_name: string
  username?: string
  billing: WCAddress
  shipping: WCAddress
  meta_data?: Array<{ key: string; value: string }>
}
```

### Get Customers

```typescript
async function getCustomers(params: {
  email?: string
  role?: string
  per_page?: number
}) {
  const query = new URLSearchParams(params as any)
  const response = await fetch(`${baseUrl}/customers?${query}`, { headers })
  return response.json()
}
```

---

## Coupons

### Coupon Types

| Type | Description |
|------|-------------|
| percent | Percentage discount |
| fixed_cart | Fixed cart discount |
| fixed_product | Fixed product discount |

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
  email_restrictions?: string[]
  usage_limit?: number
  usage_limit_per_user?: number
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

## Webhooks

### Create Webhook

```typescript
async function createWebhook(topic: string, deliveryUrl: string) {
  const response = await fetch(`${baseUrl}/webhooks`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: topic.replace('.', ' '),
      topic,
      delivery_url: deliveryUrl,
      status: 'active'
    })
  })
  return response.json()
}
```

### Available Topics

| Topic | Trigger |
|-------|---------|
| order.created | New order |
| order.updated | Order modified |
| order.deleted | Order deleted |
| product.created | Product created |
| product.updated | Product modified |
| customer.created | New customer |
| coupon.created | Coupon created |

---

## WP-CLI Commands

### Product Management

```bash
# List products
wp wc product list --user=admin

# Get product
wp wc product get 123 --user=admin

# Update stock
wp wc product update 123 --stock_quantity=50 --user=admin

# Delete product
wp wc product delete 123 --force --user=admin
```

### Order Management

```bash
# List orders
wp wc shop_order list --user=admin

# Update order status
wp wc shop_order update 456 --status=completed --user=admin
```

### Database Optimization

```bash
# Clean up expired transients
wp transient delete --expired

# Optimize database tables
wp db optimize

# Clear WooCommerce transients
wp wc tool run clear_transients --user=admin
```

---

## Performance Optimization

### Database Cleanup

```sql
-- Remove old order notes (older than 90 days for completed orders)
DELETE FROM wp_comments
WHERE comment_type = 'order_note'
AND comment_post_ID IN (
  SELECT ID FROM wp_posts
  WHERE post_type = 'shop_order'
  AND post_status = 'wc-completed'
  AND post_date < DATE_SUB(NOW(), INTERVAL 90 DAY)
);

-- Clean up expired sessions
DELETE FROM wp_woocommerce_sessions
WHERE session_expiry < UNIX_TIMESTAMP();
```

### Caching Strategy

```
Page Cache: Full page caching (exclude cart/checkout)
Object Cache: Redis/Memcached for database queries
Transient Cache: Store API responses, counts
Browser Cache: Static assets, images
```

### Recommended Plugins

```
- WP Rocket (caching)
- Imagify (image optimization)
- Query Monitor (debugging)
- WooCommerce Admin (analytics)
```

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Invalid API keys | Regenerate keys |
| 403 Forbidden | Insufficient permissions | Check user role |
| REST disabled | Permalinks issue | Resave permalinks |
| Slow site | Database bloat | Run cleanup |

### Debug Checklist

```
[ ] Verify API keys are correct
[ ] Check user has proper capabilities
[ ] Confirm permalinks are set (not Plain)
[ ] Verify SSL certificate is valid
[ ] Check server error logs
[ ] Test with REST API disabled plugins
```

---

## Skill Documentation

| Document | Purpose |
|----------|---------|
| `QUICK-REFERENCE.md` | Quick API reference |
| `context/API-GUIDE.md` | Detailed API docs |
| `playbooks/OPERATIONS.md` | Common workflows |
| `scripts/wc-client.ts` | API client |

---

**Skill Level:** Expert (Level 3)
**Confidence:** 95%
