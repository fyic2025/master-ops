# BigCommerce Operations Playbook

## Daily Operations

### Morning Checks

```
[ ] Check overnight orders
[ ] Review low stock alerts
[ ] Check for failed payments
[ ] Review any error logs
```

### Order Processing

#### New Orders
1. Orders arrive in "Awaiting Fulfillment" (status 11)
2. Pick and pack items
3. Update to "Shipped" (status 2) with tracking
4. Customer receives shipping notification

#### Order Issues
```
Problem: Payment declined
Action: Contact customer, update to status 6

Problem: Out of stock after order
Action: Contact customer, partial refund or backorder

Problem: Wrong item shipped
Action: Arrange return, send correct item
```

---

## Product Management

### Adding New Product

```
Step 1: Gather Information
[ ] Product name, SKU
[ ] Description (use product-description-generator)
[ ] Price, cost, weight
[ ] Categories
[ ] Images (min 3, lifestyle shots)

Step 2: Create in BigCommerce
[ ] POST /catalog/products
[ ] Upload images
[ ] Add to categories
[ ] Set inventory level
[ ] Add custom fields if needed

Step 3: SEO Setup
[ ] Meta title (60 chars)
[ ] Meta description (160 chars)
[ ] Custom URL slug
[ ] Search keywords

Step 4: Verify
[ ] Preview on storefront
[ ] Check mobile display
[ ] Verify pricing
[ ] Test add to cart
```

### Updating Prices

#### Single Product
```bash
PUT /v3/catalog/products/{id}
{ "price": 34.95, "sale_price": 29.95 }
```

#### Bulk Price Update
```typescript
const updates = [
  { id: 123, price: 34.95 },
  { id: 124, price: 39.95 },
  { id: 125, price: 44.95 }
]
await bulkUpdateProducts(updates)
```

#### Price Change Checklist
```
[ ] Update base price
[ ] Update sale price if applicable
[ ] Clear sale price if ending sale
[ ] Verify Google Shopping feed updates
[ ] Update any manual price lists
```

### Managing Inventory

#### Stock Level Updates
```bash
# Product-level inventory
PUT /v3/catalog/products/{id}
{ "inventory_level": 100 }

# Variant-level inventory
PUT /v3/catalog/products/{id}/variants/{vid}
{ "inventory_level": 50 }
```

#### Low Stock Alert Response
```
1. Run low stock report
2. Export to purchasing team
3. Create purchase orders
4. Update expected restock dates
5. Hide products if truly unavailable
```

#### Stock Adjustment Reasons
- Received stock
- Damaged goods
- Shrinkage/theft
- Customer returns
- Cycle count correction

---

## Category Management

### Category Structure

```
Root (0)
├── Superfoods
│   ├── Powders
│   ├── Capsules
│   └── Raw
├── Personal Care
│   ├── Skincare
│   ├── Hair Care
│   └── Body Care
├── Pantry
│   ├── Snacks
│   ├── Cooking
│   └── Drinks
└── Sale
```

### Creating Category

```typescript
const category = {
  name: "New Category",
  parent_id: 0,  // Top level
  description: "Category description for SEO",
  is_visible: true,
  sort_order: 10,
  page_title: "SEO Title | Buy Organics Online",
  meta_description: "Shop our range of..."
}
await createCategory(category)
```

### Reorganizing Products

```typescript
// Add product to additional category
const product = await getProduct(123)
const newCategories = [...product.categories, 456]
await updateProduct(123, { categories: newCategories })
```

---

## Promotional Operations

### Creating a Sale

#### Site-Wide Sale
```
1. Select products for sale
2. Bulk update sale_price
3. Create promotion banner
4. Update home page
5. Send email campaign (Klaviyo)
6. Schedule end date
```

#### Category Sale
```typescript
// Get all products in category
const products = await getProducts({ categories: [123] })

// Apply 20% discount
const updates = products.map(p => ({
  id: p.id,
  sale_price: Math.round(p.price * 0.8 * 100) / 100
}))

await bulkUpdateProducts(updates)
```

### Ending a Sale

```typescript
// Clear sale prices
const updates = products.map(p => ({
  id: p.id,
  sale_price: 0  // Setting to 0 clears the sale price
}))

await bulkUpdateProducts(updates)
```

### Coupon Codes

```
Created via: Marketing > Coupons
Types:
- Percentage discount
- Fixed amount
- Free shipping
- Buy X get Y

Settings:
- Usage limits
- Minimum spend
- Specific products/categories
- Date range
```

---

## Customer Service Operations

### Finding Customer Orders

```typescript
// By email
const customers = await getCustomers({ 'email:in': 'customer@email.com' })
const orders = await getOrders({ customer_id: customers.data[0].id })
```

### Processing Refunds

```
1. Find order in Orders section
2. Click Refund
3. Select items to refund
4. Choose refund method:
   - Original payment method
   - Store credit
5. Add note explaining reason
6. Process refund
```

### Address Changes

```
Before shipping:
1. Find order
2. Edit shipping address
3. Verify with customer
4. Update shipping label

After shipping:
1. Contact carrier for intercept
2. If returned, reship to correct address
3. Consider offering discount for inconvenience
```

---

## SEO Operations

### Product SEO Checklist

```
[ ] Meta title: Brand - Product Name - Category | BOO
[ ] Meta description: 150-160 chars, includes keywords
[ ] Custom URL: /category/product-name/
[ ] Search keywords: relevant terms
[ ] Alt text on all images
[ ] Structured data (automatic via BC)
```

### URL Redirects

```typescript
// When URL changes
await createRedirect(
  '/old-product-url/',
  'https://buyorganicsonline.com.au/new-product-url/'
)

// When product deleted
await createRedirect(
  '/deleted-product/',
  'https://buyorganicsonline.com.au/category/'
)
```

### Category SEO

```
Page title: Category Name | Buy Organics Online
Meta description: Unique, keyword-rich description
URL: /category-name/
```

---

## Integration Management

### Google Shopping Feed

```
Feed URL: /xmlfeeds/
Update frequency: Every 4 hours

Common issues:
- Missing GTIN
- Price mismatch
- Image requirements
- Disapproved products

Resolution:
1. Check Google Merchant Center
2. Fix product data in BC
3. Wait for feed refresh
4. Request manual review if needed
```

### Klaviyo Integration

```
Synced data:
- Customers
- Orders
- Products (catalog)
- Viewed products
- Added to cart

Triggers:
- Abandoned cart
- Purchase complete
- Browse abandonment
```

### Accounting Integration

```
Sync:
- Orders → Invoices
- Refunds → Credit notes
- Customer data

Schedule: Real-time or hourly
Verify: Daily reconciliation
```

---

## Troubleshooting

### Product Not Showing

```
Checklist:
[ ] is_visible = true?
[ ] In visible category?
[ ] Has price?
[ ] Has inventory (if tracking)?
[ ] Custom URL working?

Test:
1. Try direct product URL
2. Check category page
3. Search for product
4. Clear cache
```

### Checkout Issues

```
Problem: Can't complete checkout
Checks:
[ ] Payment gateway status
[ ] Shipping zones configured
[ ] Product in stock
[ ] Customer email valid

Problem: Shipping not calculating
Checks:
[ ] Weight on product
[ ] Dimensions set
[ ] Shipping zone includes address
[ ] Real-time quotes working
```

### API Errors

| Error | Cause | Fix |
|-------|-------|-----|
| 401 | Bad token | Regenerate API token |
| 404 | Wrong ID | Verify resource exists |
| 422 | Validation | Check field requirements |
| 429 | Rate limit | Add delays, reduce calls |

---

## Maintenance Tasks

### Weekly

```
[ ] Review order status backlog
[ ] Clear abandoned carts (>7 days)
[ ] Check redirect list
[ ] Review low stock items
```

### Monthly

```
[ ] Audit category structure
[ ] Review product images
[ ] Check broken links
[ ] Update seasonal content
[ ] Review API usage
```

### Quarterly

```
[ ] Full product audit
[ ] Review API integrations
[ ] Performance optimization
[ ] Security review
[ ] Theme updates
```

---

## Emergency Procedures

### Site Down

```
1. Check BigCommerce status page
2. Verify DNS resolution
3. Check SSL certificate
4. Contact BC support if needed
5. Notify customers via social
```

### Payment Gateway Down

```
1. Enable backup payment method
2. Notify customers of issue
3. Monitor gateway status
4. Process pending orders when restored
```

### Data Corruption

```
1. Identify affected records
2. Export current data (backup)
3. Restore from backup if available
4. Manual correction if needed
5. Document incident
```
