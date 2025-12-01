# Shopify Operations Playbook

## Daily Operations

### Morning Checks

```
[ ] Review overnight orders
[ ] Check unfulfilled orders queue
[ ] Review low stock alerts
[ ] Check for failed payments
[ ] Review any error notifications
```

### Order Processing Workflow

```
1. Order received → Status: Unfulfilled, Paid
2. Pick and pack items
3. Create fulfillment with tracking
4. Customer notified automatically
5. Order moves to Fulfilled
```

---

## Product Management

### Adding New Product

```
Step 1: Gather Information
[ ] Product title
[ ] Full description (body_html)
[ ] Vendor: Teelixir
[ ] Product type (e.g., Mushroom Extract)
[ ] Tags for collections
[ ] SKU
[ ] Price and compare_at_price
[ ] Weight and dimensions
[ ] Images (multiple angles)

Step 2: Create Product
[ ] POST /products.json
[ ] Upload images
[ ] Set inventory quantity
[ ] Assign to collections
[ ] Add metafields

Step 3: SEO Setup
[ ] Set handle (URL slug)
[ ] Meta title
[ ] Meta description
[ ] Alt text on images

Step 4: Verify
[ ] Preview product page
[ ] Test add to cart
[ ] Check mobile display
[ ] Verify in collections
```

### Product Structure for Teelixir

```json
{
  "product": {
    "title": "Lion's Mane Mushroom Extract",
    "body_html": "<p>Premium dual-extracted...</p>",
    "vendor": "Teelixir",
    "product_type": "Mushroom Extract",
    "tags": ["mushroom", "adaptogen", "brain-health", "lions-mane"],
    "status": "active",
    "variants": [{
      "price": "49.95",
      "compare_at_price": "59.95",
      "sku": "TLX-LM-100",
      "inventory_management": "shopify",
      "inventory_policy": "deny",
      "weight": 100,
      "weight_unit": "g"
    }]
  }
}
```

### Updating Prices

#### Single Product
```bash
PUT /products/{id}.json
{
  "product": {
    "variants": [{
      "id": {variant_id},
      "price": "54.95"
    }]
  }
}
```

#### Sale Pricing
```bash
PUT /variants/{id}.json
{
  "variant": {
    "price": "39.95",
    "compare_at_price": "49.95"
  }
}
```

#### End Sale
```bash
PUT /variants/{id}.json
{
  "variant": {
    "price": "49.95",
    "compare_at_price": null
  }
}
```

---

## Inventory Management

### Stock Level Updates

```typescript
// Get current inventory
const levels = await getInventoryLevels({
  inventory_item_ids: '123,456,789'
})

// Set absolute level
await setInventory(inventoryItemId, locationId, 100)

// Adjust relatively
await adjustInventory(inventoryItemId, locationId, -5)  // Sold 5
await adjustInventory(inventoryItemId, locationId, 50)  // Received 50
```

### Low Stock Alert Response

```
1. Export products with low inventory
2. Generate purchase order
3. Send to supplier
4. Track expected delivery
5. Update inventory on receipt
```

### Stock Check Script

```typescript
// Get all products with low stock
const products = await graphql(`
  query {
    products(first: 100, query: "inventory_total:<10") {
      edges {
        node {
          title
          totalInventory
          variants(first: 10) {
            edges {
              node {
                sku
                inventoryQuantity
              }
            }
          }
        }
      }
    }
  }
`)
```

---

## Collection Management

### Teelixir Collections

```
Main Collections:
├── All Products
├── Mushroom Extracts
├── Superfoods
├── Adaptogenic Blends
├── Bundles & Packs
└── Sale

Smart Collection Rules:
- Mushroom Extracts: tag = "mushroom"
- Superfoods: type = "Superfood"
- On Sale: compare_at_price > 0
```

### Creating Smart Collection

```typescript
const collection = {
  title: "Mushroom Extracts",
  rules: [
    { column: "tag", relation: "equals", condition: "mushroom" },
    { column: "vendor", relation: "equals", condition: "Teelixir" }
  ],
  disjunctive: false,  // AND logic
  sort_order: "best-selling"
}

await createSmartCollection(collection)
```

### Manual Collection Curation

```typescript
// Add product to custom collection
await addProductToCollection(collectionId, productId)

// Reorder products in collection
await fetch(`${baseUrl}/custom_collections/${id}.json`, {
  method: 'PUT',
  body: JSON.stringify({
    custom_collection: {
      sort_order: "manual",
      collects: [
        { product_id: 123, position: 1 },
        { product_id: 456, position: 2 }
      ]
    }
  })
})
```

---

## Order Operations

### Order Workflow

```
Unfulfilled + Paid
    ↓
Pick items from warehouse
    ↓
Pack with packing slip
    ↓
Create fulfillment
    ↓
Add tracking info
    ↓
Customer notified
    ↓
Fulfilled
```

### Creating Fulfillment

```typescript
const fulfillment = {
  location_id: PRIMARY_LOCATION_ID,
  tracking_number: "TRACK123456",
  tracking_company: "Australia Post",
  tracking_urls: ["https://auspost.com.au/track/TRACK123456"],
  notify_customer: true,
  line_items: [
    { id: lineItemId, quantity: 1 }
  ]
}

await createFulfillment(orderId, fulfillment)
```

### Processing Refunds

```
1. Customer requests refund
2. Verify order details
3. Calculate refund amount
4. Process refund
5. Restock items if applicable
6. Notify customer
```

```typescript
// Calculate refund first
const calculation = await fetch(
  `${baseUrl}/orders/${orderId}/refunds/calculate.json`,
  {
    method: 'POST',
    body: JSON.stringify({
      refund: {
        shipping: { full_refund: false },
        refund_line_items: [
          { line_item_id: 123, quantity: 1 }
        ]
      }
    })
  }
)

// Create refund
await fetch(`${baseUrl}/orders/${orderId}/refunds.json`, {
  method: 'POST',
  body: JSON.stringify({
    refund: {
      notify: true,
      note: "Customer requested refund",
      transactions: calculation.refund.transactions,
      refund_line_items: [
        { line_item_id: 123, quantity: 1, restock_type: "return" }
      ]
    }
  })
})
```

---

## Promotional Operations

### Creating a Sale

```
1. Identify sale products
2. Set compare_at_price (original)
3. Set new price (sale)
4. Add to Sale collection
5. Update marketing (Klaviyo)
6. Schedule sale end
```

### Bulk Sale Pricing

```typescript
// Get products in collection
const products = await getCollectionProducts(saleCollectionId)

// Apply 20% discount
for (const product of products) {
  for (const variant of product.variants) {
    await updateVariant(variant.id, {
      compare_at_price: variant.price,
      price: (parseFloat(variant.price) * 0.8).toFixed(2)
    })
  }
}
```

### Discount Codes

```typescript
// Create price rule
const priceRule = await fetch(`${baseUrl}/price_rules.json`, {
  method: 'POST',
  body: JSON.stringify({
    price_rule: {
      title: "SUMMER20",
      target_type: "line_item",
      target_selection: "all",
      allocation_method: "across",
      value_type: "percentage",
      value: "-20.0",
      customer_selection: "all",
      starts_at: "2024-01-01T00:00:00Z",
      ends_at: "2024-01-31T23:59:59Z"
    }
  })
})

// Create discount code
await fetch(`${baseUrl}/price_rules/${priceRule.id}/discount_codes.json`, {
  method: 'POST',
  body: JSON.stringify({
    discount_code: { code: "SUMMER20" }
  })
})
```

---

## Customer Service

### Finding Customer Orders

```typescript
// Search by email
const customers = await searchCustomers(`email:${email}`)
const customerId = customers.customers[0].id

// Get customer orders
const orders = await getOrders({ customer_id: customerId })
```

### Order Issues

**Wrong Address:**
```
Before shipping:
1. Edit order address
2. Verify with customer
3. Update shipping label

After shipping:
1. Contact carrier
2. If returned, reship
3. Offer store credit for inconvenience
```

**Missing Items:**
```
1. Verify order contents
2. Check warehouse records
3. Ship missing items
4. Offer discount/credit
5. Update processes
```

---

## Metafields for Teelixir

### Product Metafields

```typescript
const metafields = {
  benefits: {
    namespace: "custom",
    key: "benefits",
    type: "multi_line_text_field",
    value: "• Supports cognitive function\n• Promotes nerve health\n• Enhances focus"
  },
  ingredients: {
    namespace: "custom",
    key: "ingredients",
    type: "single_line_text_field",
    value: "100% Lion's Mane (Hericium erinaceus) fruiting body extract"
  },
  usage: {
    namespace: "custom",
    key: "usage",
    type: "multi_line_text_field",
    value: "Add 1/2 tsp to hot water, tea, coffee, or smoothies. Take daily."
  },
  origin: {
    namespace: "custom",
    key: "origin",
    type: "single_line_text_field",
    value: "Sourced from certified organic farms in China"
  }
}
```

### Reading Metafields in Theme

```liquid
{% if product.metafields.custom.benefits %}
  <div class="product-benefits">
    {{ product.metafields.custom.benefits | newline_to_br }}
  </div>
{% endif %}
```

---

## SEO Configuration

### Product SEO Checklist

```
[ ] Handle (URL): /products/lions-mane-mushroom-extract
[ ] Meta title: Lion's Mane Extract | Brain Support | Teelixir
[ ] Meta description: Premium dual-extracted Lion's Mane for cognitive support. Organic, potent, Australian owned. Shop now.
[ ] Image alt text: Lion's Mane Mushroom Extract powder 100g jar
```

### URL Redirects

```typescript
// When changing product handle
await fetch(`${baseUrl}/redirects.json`, {
  method: 'POST',
  body: JSON.stringify({
    redirect: {
      path: "/products/old-handle",
      target: "/products/new-handle"
    }
  })
})
```

---

## Integration Points

### ReCharge Subscriptions

```
Subscription products:
- Monthly mushroom delivery
- Auto-ship discounts (10%)
- Pause/cancel handling
```

### Klaviyo Integration

```
Synced automatically:
- Customers
- Orders
- Product catalog
- Browse behavior

Triggers:
- Abandoned cart
- Post-purchase
- Win-back
- Browse abandonment
```

### ShipStation

```
Sync:
- Orders → ShipStation
- Tracking → Shopify
- Inventory updates
```

---

## Troubleshooting

### Product Not Appearing

```
[ ] Status = active?
[ ] In visible collection?
[ ] Published to Online Store?
[ ] Has available inventory?
[ ] Check URL handle works
```

### Inventory Issues

```
[ ] Inventory tracking enabled?
[ ] Correct location selected?
[ ] Stock level > 0?
[ ] Inventory policy = deny?
```

### Checkout Problems

```
[ ] Payment gateway active?
[ ] Shipping rates configured?
[ ] Tax settings correct?
[ ] Stock available?
```

---

## Maintenance Tasks

### Weekly
```
[ ] Review order backlog
[ ] Check inventory levels
[ ] Review abandoned carts
[ ] Check site speed
```

### Monthly
```
[ ] Audit collections
[ ] Review SEO rankings
[ ] Check redirect list
[ ] Update seasonal content
```

### Quarterly
```
[ ] Full product audit
[ ] Review integrations
[ ] Performance review
[ ] Theme updates check
```
