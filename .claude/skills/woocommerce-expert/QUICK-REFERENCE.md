# WooCommerce Expert - Quick Reference

## API Basics

```typescript
// Authentication (Basic Auth with API keys)
const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')

const headers = {
  'Authorization': `Basic ${auth}`,
  'Content-Type': 'application/json'
}

// Base URL
const baseUrl = `${storeUrl}/wp-json/wc/v3`
```

---

## Common Endpoints

| Resource | Endpoint |
|----------|----------|
| Products | `/products` |
| Variations | `/products/{id}/variations` |
| Categories | `/products/categories` |
| Tags | `/products/tags` |
| Attributes | `/products/attributes` |
| Orders | `/orders` |
| Order Notes | `/orders/{id}/notes` |
| Customers | `/customers` |
| Coupons | `/coupons` |
| Shipping Zones | `/shipping/zones` |
| Reports | `/reports` |
| System Status | `/system_status` |

---

## Product Operations

### Get Products
```bash
GET /products?per_page=50&status=publish
```

### Get Single Product
```bash
GET /products/{id}
```

### Create Simple Product
```json
POST /products
{
  "name": "Product Name",
  "type": "simple",
  "status": "publish",
  "regular_price": "29.95",
  "description": "<p>Description</p>",
  "short_description": "Short desc",
  "sku": "SKU-001",
  "manage_stock": true,
  "stock_quantity": 100,
  "categories": [{ "id": 15 }]
}
```

### Update Product
```json
PUT /products/{id}
{ "regular_price": "34.95" }
```

### Batch Update
```json
POST /products/batch
{
  "update": [
    { "id": 1, "regular_price": "29.95" },
    { "id": 2, "regular_price": "34.95" }
  ]
}
```

---

## Product Types

| Type | Description |
|------|-------------|
| simple | Single product |
| variable | Has variations |
| grouped | Product bundle |
| external | Affiliate link |

---

## Order Statuses

| Status | Description |
|--------|-------------|
| pending | Awaiting payment |
| processing | Payment received |
| on-hold | Awaiting action |
| completed | Order complete |
| cancelled | Cancelled |
| refunded | Refunded |
| failed | Payment failed |

---

## Inventory Operations

### Update Stock
```json
PUT /products/{id}
{
  "manage_stock": true,
  "stock_quantity": 50
}
```

### Stock Status Values
```
instock | outofstock | onbackorder
```

---

## Query Parameters

### Pagination
```
?page=1&per_page=100
```

### Filtering Products
```
?status=publish
?category=15
?sku=ABC123
?stock_status=instock
?on_sale=true
?min_price=10&max_price=50
```

### Filtering Orders
```
?status=processing
?after=2024-01-01T00:00:00
?before=2024-01-31T23:59:59
?customer=123
```

### Sorting
```
?orderby=date&order=desc
?orderby=title&order=asc
```

---

## Variations

### Create Variation
```json
POST /products/{id}/variations
{
  "regular_price": "29.95",
  "sku": "VAR-001",
  "stock_quantity": 50,
  "attributes": [
    { "name": "Size", "option": "Large" }
  ]
}
```

### Update Variation
```json
PUT /products/{id}/variations/{variation_id}
{ "stock_quantity": 25 }
```

---

## Categories

### Create Category
```json
POST /products/categories
{
  "name": "New Category",
  "parent": 0,
  "description": "Description"
}
```

---

## Coupons

### Create Coupon
```json
POST /coupons
{
  "code": "SAVE20",
  "discount_type": "percent",
  "amount": "20",
  "minimum_amount": "50.00"
}
```

### Discount Types
```
percent | fixed_cart | fixed_product
```

---

## Webhooks

| Topic | Trigger |
|-------|---------|
| order.created | New order |
| order.updated | Order changed |
| product.created | Product created |
| product.updated | Product changed |
| customer.created | New customer |

---

## WP-CLI Quick Commands

```bash
# List products
wp wc product list --user=admin

# Update product
wp wc product update 123 --regular_price=29.95 --user=admin

# List orders
wp wc shop_order list --user=admin

# Clear transients
wp wc tool run clear_transients --user=admin
```

---

## RHF Store Details

```
URL: redhillfresh.com.au
Platform: WooCommerce + WordPress
Products: 200+
Categories: 20+
Focus: Fresh produce, local delivery
```

---

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Server Error |

---

## Related Skills

| Task | Skill |
|------|-------|
| Product copy | product-description-generator |
| Pricing | pricing-optimizer |
| Shipping | shipping-optimizer |
| SEO content | seo-content-writer |
