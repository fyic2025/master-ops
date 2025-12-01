# Shopify Expert - Quick Reference

## API Basics

```typescript
// Headers for all requests
const headers = {
  'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
  'Content-Type': 'application/json'
}

// Base URL
const baseUrl = `https://${shop}/admin/api/2024-01`
```

---

## Common Endpoints

| Resource | Endpoint |
|----------|----------|
| Products | `/products.json` |
| Variants | `/products/{id}/variants.json` |
| Collections | `/collections/{id}.json` |
| Smart Collections | `/smart_collections.json` |
| Custom Collections | `/custom_collections.json` |
| Orders | `/orders.json` |
| Customers | `/customers.json` |
| Inventory | `/inventory_levels.json` |
| Locations | `/locations.json` |
| Metafields | `/{resource}/{id}/metafields.json` |
| Webhooks | `/webhooks.json` |

---

## Product Operations

### Get Products
```bash
GET /products.json?limit=50&status=active
```

### Get Single Product
```bash
GET /products/{id}.json
```

### Create Product
```json
POST /products.json
{
  "product": {
    "title": "Product Name",
    "body_html": "<p>Description</p>",
    "vendor": "Teelixir",
    "product_type": "Mushroom Extract",
    "tags": ["mushroom", "adaptogen"],
    "status": "active",
    "variants": [{
      "price": "49.95",
      "sku": "SKU-001",
      "inventory_management": "shopify"
    }]
  }
}
```

### Update Product
```json
PUT /products/{id}.json
{ "product": { "title": "New Title" } }
```

---

## Inventory Operations

### Get Inventory
```bash
GET /inventory_levels.json?inventory_item_ids=123,456
```

### Set Inventory
```json
POST /inventory_levels/set.json
{
  "inventory_item_id": 123,
  "location_id": 456,
  "available": 100
}
```

### Adjust Inventory
```json
POST /inventory_levels/adjust.json
{
  "inventory_item_id": 123,
  "location_id": 456,
  "available_adjustment": -5
}
```

---

## Order Statuses

### Fulfillment Status
| Status | Meaning |
|--------|---------|
| unfulfilled | Not shipped |
| partial | Partially shipped |
| fulfilled | Fully shipped |
| restocked | Returned |

### Financial Status
| Status | Meaning |
|--------|---------|
| pending | Awaiting payment |
| paid | Payment received |
| partially_paid | Partial payment |
| refunded | Full refund |
| partially_refunded | Partial refund |

---

## Query Parameters

### Pagination
```
?limit=50&page_info={cursor}
```

### Filtering Products
```
?status=active
?product_type=Mushroom
?vendor=Teelixir
?collection_id=123
?created_at_min=2024-01-01
```

### Filtering Orders
```
?status=open
?fulfillment_status=unfulfilled
?financial_status=paid
?created_at_min=2024-01-01
```

---

## Rate Limits

| API | Limit |
|-----|-------|
| REST | 40/min (leaky bucket) |
| GraphQL | 1000 points/request |

**Headers to Check:**
- `X-Shopify-Shop-Api-Call-Limit: 39/40`
- `Retry-After: 2.0`

---

## GraphQL Quick Reference

```graphql
# Get products
{
  products(first: 10) {
    edges {
      node {
        id
        title
        handle
        variants(first: 5) {
          edges {
            node {
              id
              price
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

## Metafield Types

| Type | Use For |
|------|---------|
| single_line_text_field | Short text |
| multi_line_text_field | Long text |
| number_integer | Whole numbers |
| number_decimal | Decimals |
| json | Structured data |
| boolean | True/false |
| date | Date values |
| url | Links |

---

## Webhook Topics

| Topic | Trigger |
|-------|---------|
| orders/create | New order |
| orders/fulfilled | Order shipped |
| products/update | Product changed |
| inventory_levels/update | Stock changed |
| customers/create | New customer |

---

## Teelixir Store Details

```
Shop: teelixir.myshopify.com
Platform: Shopify Plus
API Version: 2024-01
Products: 50+
Collections: 15+
```

---

## Quick Commands

```bash
# List products
curl -H "X-Shopify-Access-Token: $TOKEN" \
  "https://$SHOP/admin/api/2024-01/products.json?limit=10"

# Get product
curl -H "X-Shopify-Access-Token: $TOKEN" \
  "https://$SHOP/admin/api/2024-01/products/123.json"

# Get inventory
curl -H "X-Shopify-Access-Token: $TOKEN" \
  "https://$SHOP/admin/api/2024-01/inventory_levels.json?inventory_item_ids=123"
```

---

## Error Codes

| Code | Meaning |
|------|---------|
| 401 | Unauthorized |
| 404 | Not Found |
| 422 | Validation Error |
| 429 | Rate Limited |

---

## Related Skills

| Task | Skill |
|------|-------|
| Product copy | product-description-generator |
| Pricing | pricing-optimizer |
| Email marketing | klaviyo-expert |
| Competitor prices | competitor-monitor |
