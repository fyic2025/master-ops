# BigCommerce Expert - Quick Reference

## API Basics

```typescript
// Load BOO credentials from vault
const creds = require('../../../../creds');
await creds.load('boo');

// Headers for all requests
const headers = {
  'X-Auth-Token': process.env.BOO_BC_ACCESS_TOKEN,
  'Content-Type': 'application/json'
}

// Base URLs
const storeHash = process.env.BOO_BC_STORE_HASH;
const v3 = `https://api.bigcommerce.com/stores/${storeHash}/v3`
const v2 = `https://api.bigcommerce.com/stores/${storeHash}/v2`
```

---

## Common Endpoints

| Resource | Endpoint | Version |
|----------|----------|---------|
| Products | `/catalog/products` | V3 |
| Variants | `/catalog/products/{id}/variants` | V3 |
| Categories | `/catalog/categories` | V3 |
| Brands | `/catalog/brands` | V3 |
| Orders | `/orders` | V2 |
| Customers | `/customers` | V3 |
| Inventory | `/inventory/items` | V3 |
| Redirects | `/storefront/redirects` | V3 |
| Webhooks | `/hooks` | V3 |

---

## Product Operations

### Get Product
```bash
GET /v3/catalog/products/{id}?include=variants,images
```

### Create Product
```bash
POST /v3/catalog/products
{
  "name": "Product Name",
  "type": "physical",
  "sku": "SKU-001",
  "price": 29.95,
  "weight": 1,
  "categories": [123]
}
```

### Update Product
```bash
PUT /v3/catalog/products/{id}
{ "price": 34.95 }
```

### Bulk Update
```bash
PUT /v3/catalog/products
[{ "id": 1, "price": 29.95 }, { "id": 2, "price": 34.95 }]
```

---

## Inventory Operations

### Get Inventory
```bash
GET /v3/catalog/products/{id}?include=variants
```

### Update Inventory
```bash
PUT /v3/catalog/products/{id}
{ "inventory_level": 100 }
```

### Variant Inventory
```bash
PUT /v3/catalog/products/{id}/variants/{vid}
{ "inventory_level": 50 }
```

---

## Order Statuses

| ID | Status |
|----|--------|
| 1 | Pending |
| 2 | Shipped |
| 5 | Cancelled |
| 7 | Awaiting Payment |
| 9 | Awaiting Shipment |
| 10 | Completed |
| 11 | Awaiting Fulfillment |

---

## Query Parameters

### Pagination
```
?page=1&limit=250
```

### Filtering
```
?sku=ABC123
?name:like=organic
?price:min=10&price:max=50
?is_visible=true
?inventory_level:less=10
```

### Sorting
```
?sort=name&direction=asc
?sort=date_modified&direction=desc
```

### Include Related
```
?include=variants,images,custom_fields
```

---

## Rate Limits

| Plan | Limit |
|------|-------|
| Enterprise | 450/sec |
| Pro | 60/sec |
| Standard | 20,000/hour |

**Headers to Check:**
- `X-Rate-Limit-Requests-Left`
- `X-Rate-Limit-Time-Reset-Ms`

---

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Validation Error |
| 429 | Rate Limited |

---

## Webhook Events

| Scope | Events |
|-------|--------|
| store/order/* | created, updated |
| store/product/* | created, updated, deleted |
| store/customer/* | created, updated |
| store/inventory/* | updated |
| store/cart/* | created, updated |

---

## BOO Store Details

```
Store URL: buyorganicsonline.com.au
Store Hash: BOO_BC_STORE_HASH (from vault)
API Version: V3 (primary)
Products: 3,000+
Categories: 50+
```

**Credentials Location:** Supabase vault under `boo` project

---

## Quick Commands

```bash
# Load credentials first
node creds.js load boo

# Test connection
curl -H "X-Auth-Token: $BOO_BC_ACCESS_TOKEN" \
  "https://api.bigcommerce.com/stores/$BOO_BC_STORE_HASH/v3/catalog/summary"

# Get product
curl -H "X-Auth-Token: $BOO_BC_ACCESS_TOKEN" \
  "https://api.bigcommerce.com/stores/$BOO_BC_STORE_HASH/v3/catalog/products/123"

# Low stock report
curl -H "X-Auth-Token: $BOO_BC_ACCESS_TOKEN" \
  "https://api.bigcommerce.com/stores/$BOO_BC_STORE_HASH/v3/catalog/products?inventory_level:less=10&is_visible=true"
```

---

## Related Skills

| Task | Skill |
|------|-------|
| Product copy | product-description-generator |
| Pricing | pricing-optimizer |
| SEO content | seo-content-writer |
| Competitor prices | competitor-monitor |
| Inventory alerts | stock-alert-predictor |
