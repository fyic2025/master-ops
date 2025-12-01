# WooCommerce Operations Playbook

## Daily Operations

### Morning Checks

```
[ ] Review overnight orders
[ ] Check processing queue
[ ] Review low stock alerts
[ ] Check failed payments
[ ] Verify website is up
```

### Order Processing Workflow (RHF)

```
1. Order received → Status: Processing
2. Check delivery date/time slot
3. Pick items from inventory
4. Pack order with care (fresh produce!)
5. Schedule delivery/pickup
6. Mark as Completed
```

---

## Product Management

### Adding New Product (Simple)

```
Step 1: Gather Information
[ ] Product name
[ ] Description (HTML)
[ ] Short description
[ ] SKU
[ ] Price
[ ] Stock quantity
[ ] Weight/dimensions
[ ] Category
[ ] Images

Step 2: Create Product
[ ] POST /products
[ ] Upload images
[ ] Set stock levels
[ ] Assign categories
[ ] Add tags

Step 3: Verify
[ ] Check product page
[ ] Test add to cart
[ ] Verify stock displays
[ ] Check mobile view
```

### Fresh Produce Product Template

```json
{
  "name": "Organic Tomatoes (500g)",
  "type": "simple",
  "status": "publish",
  "description": "<p>Freshly picked organic tomatoes from our local farm partners. Perfectly ripened on the vine for maximum flavour.</p><ul><li>Locally sourced</li><li>Certified organic</li><li>Hand-picked</li></ul>",
  "short_description": "Fresh local organic tomatoes, vine-ripened for peak flavour.",
  "sku": "RHF-TOM-500",
  "regular_price": "6.95",
  "manage_stock": true,
  "stock_quantity": 30,
  "stock_status": "instock",
  "weight": "0.5",
  "categories": [{ "id": 22 }],
  "tags": [{ "id": 5 }, { "id": 8 }]
}
```

### Adding Variable Product

```
Step 1: Create Parent
[ ] Set type: variable
[ ] Add attributes (variation: true)
[ ] Define attribute options

Step 2: Create Variations
[ ] POST /products/{id}/variations
[ ] Set price per variation
[ ] Set SKU per variation
[ ] Set stock per variation

Step 3: Verify
[ ] All options appear
[ ] Prices correct
[ ] Stock accurate
```

### Variable Product Example

```json
// Parent product
{
  "name": "Organic Apple Box",
  "type": "variable",
  "status": "publish",
  "description": "<p>Fresh organic apples...</p>",
  "attributes": [{
    "name": "Size",
    "position": 0,
    "visible": true,
    "variation": true,
    "options": ["Small (1kg)", "Medium (2kg)", "Large (5kg)"]
  }]
}

// Variations
[
  {
    "regular_price": "8.95",
    "sku": "RHF-APP-1KG",
    "stock_quantity": 20,
    "attributes": [{ "name": "Size", "option": "Small (1kg)" }]
  },
  {
    "regular_price": "15.95",
    "sku": "RHF-APP-2KG",
    "stock_quantity": 15,
    "attributes": [{ "name": "Size", "option": "Medium (2kg)" }]
  },
  {
    "regular_price": "34.95",
    "sku": "RHF-APP-5KG",
    "stock_quantity": 10,
    "attributes": [{ "name": "Size", "option": "Large (5kg)" }]
  }
]
```

---

## Inventory Management

### Stock Level Updates

```typescript
// Update simple product stock
await updateProduct(productId, {
  manage_stock: true,
  stock_quantity: newQuantity
})

// Update variation stock
await updateVariation(productId, variationId, {
  stock_quantity: newQuantity
})
```

### Low Stock Response

```
1. Run low stock report
2. Contact suppliers
3. Update expected dates
4. Consider hiding out-of-stock items
5. Set backorder if appropriate
```

### Stock Status Management

```
instock     → Available for purchase
outofstock  → Hide from shop (or show "Sold Out")
onbackorder → Show "Available for backorder"
```

### Fresh Produce Considerations

```
- Daily stock updates (fresh items)
- Short shelf life tracking
- Supplier delivery schedule alignment
- Seasonal availability management
- Weather impact on stock
```

---

## Category Management

### RHF Category Structure

```
Fresh Produce
├── Fruit
│   ├── Citrus
│   ├── Stone Fruit
│   ├── Berries
│   └── Seasonal Fruit
├── Vegetables
│   ├── Leafy Greens
│   ├── Root Vegetables
│   ├── Tomatoes & Peppers
│   └── Seasonal Vegetables
├── Herbs
└── Mushrooms

Dairy & Eggs
├── Milk & Cream
├── Cheese
├── Yogurt
└── Eggs

Meat & Poultry
├── Beef
├── Lamb
├── Pork
├── Chicken
└── Sausages

Pantry
├── Bread & Bakery
├── Condiments
├── Oils & Vinegars
└── Dry Goods
```

### Creating Categories

```typescript
// Create parent category
const parent = await createCategory({
  name: "Fresh Produce",
  description: "Locally sourced fresh produce",
  slug: "fresh-produce"
})

// Create child categories
await createCategory({
  name: "Fruit",
  parent: parent.id,
  slug: "fruit"
})
```

---

## Order Operations

### Order Status Workflow

```
pending     → Customer hasn't paid
processing  → Paid, ready to fulfill
on-hold     → Waiting for something
completed   → Order delivered
cancelled   → Order cancelled
refunded    → Fully refunded
failed      → Payment failed
```

### Processing Orders

```typescript
// Get orders ready to process
const orders = await getOrders({
  status: 'processing',
  per_page: 50
})

// Process each order
for (const order of orders) {
  // 1. Check delivery slot
  const deliverySlot = order.meta_data.find(m => m.key === '_delivery_slot')

  // 2. Prepare items
  console.log(`Order ${order.number}: ${order.line_items.length} items`)

  // 3. Mark complete when ready
  await updateOrder(order.id, { status: 'completed' })
}
```

### Adding Order Notes

```typescript
// Internal note
await addOrderNote(orderId, "Picked and packed by John", false)

// Customer note (sends email)
await addOrderNote(orderId, "Your order is ready for delivery!", true)
```

### Handling Refunds

```
1. Customer requests refund
2. Review order details
3. Process via WooCommerce admin:
   - WooCommerce > Orders > Order > Refund
4. Select items to refund
5. Optionally restock items
6. Add refund note
```

---

## Shipping Configuration

### RHF Shipping Zones

```
Zone 1: Local Delivery (Mornington Peninsula)
  Postcodes: 3939, 3938, 3937, 3936, 3934, 3933...
  Methods:
    - Free delivery over $50
    - $8 flat rate under $50

Zone 2: Melbourne Metro
  Postcodes: 3000-3999 (excluding local)
  Methods:
    - $15 flat rate
    - Free over $100

Zone 3: Farm Gate Pickup
  Methods:
    - Local Pickup (free)
    - Collection from Red Hill
```

### Delivery Time Slots

```
Meta field: _delivery_slot
Values:
  - Morning (8am-12pm)
  - Afternoon (12pm-4pm)
  - Evening (4pm-7pm)

Meta field: _delivery_date
Format: YYYY-MM-DD
```

---

## Customer Management

### Customer Lookup

```typescript
// Find by email
const customers = await getCustomers({ email: 'customer@email.com' })

// Get customer orders
const orders = await getOrders({ customer: customerId })
```

### Customer Issues

**Address change:**
1. Get order details
2. Update shipping address if not shipped
3. Add order note documenting change

**Wrong item delivered:**
1. Document issue
2. Arrange replacement
3. Consider discount/credit
4. Update processes

---

## Promotional Operations

### Creating Sales

```
1. Identify sale products
2. Set sale_price on each
3. Create coupon if needed
4. Update homepage/banners
5. Send email campaign
```

### Bulk Sale Pricing

```typescript
// Get category products
const products = await getProducts({ category: categoryId })

// Apply 20% discount
const updates = products.map(p => ({
  id: p.id,
  sale_price: (parseFloat(p.regular_price) * 0.8).toFixed(2)
}))

await batchProducts({ update: updates })
```

### Coupon Examples

```typescript
// Percentage off
await createCoupon({
  code: "FRESH20",
  discount_type: "percent",
  amount: "20",
  minimum_amount: "40.00",
  individual_use: true
})

// Free shipping
await createCoupon({
  code: "FREESHIP",
  discount_type: "percent",
  amount: "0",
  free_shipping: true,
  minimum_amount: "30.00"
})

// Fixed amount
await createCoupon({
  code: "SAVE10",
  discount_type: "fixed_cart",
  amount: "10",
  minimum_amount: "50.00"
})
```

---

## Performance Maintenance

### Weekly Tasks

```
[ ] Clear expired transients
[ ] Check error logs
[ ] Review slow queries
[ ] Optimize images
[ ] Check backup status
```

### Monthly Tasks

```
[ ] Database optimization
[ ] Full backup verification
[ ] Plugin updates (staging first)
[ ] Security scan
[ ] Performance audit
```

### WP-CLI Maintenance

```bash
# Clear transients
wp transient delete --expired

# Optimize database
wp db optimize

# Clear WooCommerce caches
wp wc tool run clear_transients --user=admin

# Check for updates
wp plugin list --update=available
```

### Database Cleanup

```sql
-- Remove old revisions
DELETE FROM wp_posts WHERE post_type = 'revision';

-- Clear old sessions
DELETE FROM wp_woocommerce_sessions
WHERE session_expiry < UNIX_TIMESTAMP();

-- Optimize tables
OPTIMIZE TABLE wp_posts, wp_postmeta, wp_options;
```

---

## Troubleshooting

### Product Not Showing

```
[ ] Status = publish?
[ ] In visible category?
[ ] Stock status = instock?
[ ] Catalog visibility = visible?
[ ] Check shortcodes/blocks
```

### Checkout Issues

```
[ ] Payment gateway enabled?
[ ] Shipping zones configured?
[ ] SSL certificate valid?
[ ] Cart not empty?
[ ] Clear cache
```

### API Errors

| Error | Cause | Fix |
|-------|-------|-----|
| 401 | Invalid keys | Check API credentials |
| 403 | Wrong permissions | Update key permissions |
| 404 | Wrong endpoint | Check URL structure |
| 500 | Server error | Check error logs |

### Performance Issues

```
[ ] Enable caching plugin
[ ] Optimize images
[ ] Check hosting resources
[ ] Disable unused plugins
[ ] Update PHP version
```

---

## Integration Points

### Xero Accounting

```
Sync:
- Orders → Invoices
- Refunds → Credit notes
- Customers → Contacts

Trigger: Order completed
```

### Local Delivery Scheduling

```
Plugin: Local Pickup Plus / Delivery Slots
Features:
- Date picker at checkout
- Time slot selection
- Delivery capacity limits
- Admin calendar view
```

### Australia Post

```
Integration: Australia Post Shipping
Features:
- Real-time rates
- Label generation
- Tracking sync
```

---

## Emergency Procedures

### Site Down

```
1. Check hosting status
2. Check domain/DNS
3. Enable maintenance mode
4. Review error logs
5. Contact host if needed
6. Notify customers
```

### Payment Gateway Down

```
1. Enable backup payment (PayPal/bank transfer)
2. Add notice to checkout
3. Monitor gateway status
4. Process held orders when restored
```

### Stock Emergency

```
1. Bulk set to outofstock
2. Add site notice
3. Disable checkout if needed
4. Contact affected customers
5. Update when resolved
```
