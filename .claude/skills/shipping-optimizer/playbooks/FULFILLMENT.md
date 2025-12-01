# Fulfillment Playbook

## Daily Fulfillment Workflow

### Morning Setup (8:00 AM)

```
[ ] Check overnight orders
[ ] Print pick lists
[ ] Review any issues from previous day
[ ] Check inventory availability
[ ] Confirm carrier pickup times
```

### Order Processing

```
Step 1: Retrieve Orders
- Export unfulfilled orders
- Sort by priority (express first)
- Group by shipping method

Step 2: Pick Items
- Work through pick list
- Verify SKU matches
- Note any out of stock
- Mark picked items

Step 3: Pack Orders
- Select appropriate box/satchel
- Include packing slip
- Add marketing inserts
- Seal securely

Step 4: Label & Ship
- Generate shipping label
- Apply label clearly
- Scan for tracking
- Stage for pickup

Step 5: Complete
- Mark as fulfilled
- Send tracking email
- Update inventory
```

---

## Picking Strategies

### Zone Picking

```
Warehouse Layout:
Zone A: Superfoods/Powders
Zone B: Capsules/Tablets
Zone C: Personal Care
Zone D: Pantry Items
Zone E: Heavy/Bulk

Process:
1. Generate pick lists by zone
2. Assign picker per zone
3. Consolidate at packing station
```

### Batch Picking

```
Batch Size: 20-30 orders
Best For: Similar products

Process:
1. Group orders with common SKUs
2. Pick total quantities
3. Sort into individual orders
4. Proceed to packing
```

### Wave Picking

```
Wave Schedule:
Wave 1: Express orders (10:00 AM)
Wave 2: Standard orders (2:00 PM)
Wave 3: Next-day prep (4:00 PM)
```

---

## Packing Guidelines

### Box Selection

```
Rule of Thumb:
- Item(s) should fit with 2-3cm padding
- Weight should not exceed box limit
- Use smallest appropriate size

Satchel Use:
- Soft goods only
- Under weight limit
- No fragile items
```

### Packing Materials

```
Void Fill:
- Paper void fill (eco-friendly)
- Air pillows (lightweight)
- Biodegradable peanuts

Protection:
- Bubble wrap for fragile
- Cardboard dividers for glass
- Thermal liners for temperature
```

### Packing Checklist

```
[ ] Correct items in order
[ ] Items secure, won't shift
[ ] Fragile items protected
[ ] Packing slip included
[ ] Marketing insert added
[ ] Box sealed properly
[ ] No excessive void space
```

---

## Label Generation

### Single Label

```typescript
// Generate shipping label
const label = await createShipment({
  order_id: 'ORD-12345',
  carrier: 'auspost',
  service: 'parcel_post',
  package: {
    weight: 1.5,
    length: 30,
    width: 20,
    height: 15
  },
  sender: warehouseAddress,
  receiver: customerAddress
})

// Print label
await printLabel(label.label_url)
```

### Batch Labels

```typescript
// Generate multiple labels
const orders = await getUnfulfilledOrders()

for (const order of orders) {
  const label = await createShipment({
    order_id: order.id,
    carrier: selectCarrier(order),
    ...orderToShipment(order)
  })

  labels.push(label)
}

// Print all labels
await printBatchLabels(labels)
```

---

## Express Order Handling

### Priority Cutoff Times

```
Express Post:
- Cutoff: 1:00 PM
- Pickup: 2:30 PM
- Delivery: Next business day (metro)

Standard:
- Cutoff: 3:00 PM
- Pickup: 4:30 PM
- Delivery: 2-6 business days
```

### Express Workflow

```
1. Filter express orders immediately
2. Process before standard orders
3. Use express-rated labels
4. Ensure early pickup
5. Notify customer of tracking
```

---

## Quality Control

### Pre-Ship Checks

```
[ ] Order contents match packing slip
[ ] Items in good condition
[ ] Expiry dates acceptable (food/supplements)
[ ] Label matches order details
[ ] Correct shipping service applied
[ ] Package weight within limits
```

### Random Audits

```
Frequency: 10% of orders
Check:
- Correct items
- Proper packaging
- Label accuracy
- Packing quality
```

---

## Problem Order Handling

### Out of Stock

```
1. Check alternate warehouse/location
2. If unavailable:
   - Contact customer immediately
   - Offer alternatives:
     a. Wait for restock
     b. Partial ship now
     c. Substitute product
     d. Full refund
3. Document decision
4. Adjust inventory
```

### Damaged Item Found

```
1. Remove from inventory
2. Check if replacements available
3. Process as above
4. Log damage report
5. Review packaging process
```

### Address Issues

```
1. Verify with customer (if contact available)
2. Use address validation service
3. If cannot resolve:
   - Hold order
   - Contact customer
   - Set 48hr response deadline
```

---

## Carrier Pickup

### Australia Post

```
Pickup Schedule:
- Time: 2:30 PM daily
- Location: Loading dock
- Manifest required

Preparation:
[ ] All parcels labelled
[ ] Manifest printed
[ ] Parcels counted
[ ] Express separated
```

### Sendle

```
Pickup Schedule:
- Time: Flexible (book via app)
- Location: Front desk or dock
- No manifest required

Booking:
1. Log into Sendle
2. Schedule pickup
3. Confirm parcel count
4. Print summary
```

---

## Returns Processing

### Receiving Returns

```
1. Check return authorization
2. Inspect returned item
3. Verify condition
4. Process based on condition:
   - Good: Restock
   - Damaged: Write off
   - Opened: Cannot restock (food/supplements)
5. Process refund/exchange
6. Update inventory
```

### Return Inspection Checklist

```
[ ] Original packaging intact
[ ] Product sealed/unused
[ ] Within return window
[ ] Return reason documented
[ ] Refund method confirmed
```

---

## Inventory Updates

### Post-Fulfillment

```typescript
// After successful shipment
async function updateInventory(order: Order) {
  for (const item of order.line_items) {
    await decrementStock(item.sku, item.quantity)

    // Check for low stock
    const currentStock = await getStockLevel(item.sku)
    if (currentStock < LOW_STOCK_THRESHOLD) {
      await sendLowStockAlert(item.sku, currentStock)
    }
  }
}
```

### End of Day Reconciliation

```
[ ] Compare shipped vs system count
[ ] Investigate discrepancies
[ ] Update any manual adjustments
[ ] Review low stock alerts
[ ] Generate reorder report
```

---

## Performance Metrics

### Key KPIs

| Metric | Target |
|--------|--------|
| Order accuracy | 99.5%+ |
| On-time shipping | 98%+ |
| Average pick time | < 5 min |
| Pack time per order | < 3 min |
| Customer complaints | < 0.5% |

### Tracking

```
Daily:
- Orders processed
- Express vs standard
- Errors found

Weekly:
- Average fulfillment time
- Carrier performance
- Return rate

Monthly:
- Cost per order
- Accuracy rate
- Customer feedback
```

---

## Seasonal Preparation

### Peak Season (Nov-Dec)

```
Preparation (October):
[ ] Increase packing supplies
[ ] Confirm carrier capacity
[ ] Schedule additional staff
[ ] Review cutoff times
[ ] Test systems under load

During Peak:
[ ] Extended hours if needed
[ ] Daily carrier check-ins
[ ] Proactive customer comms
[ ] Monitor delay alerts
```

### Post-Peak (January)

```
[ ] Process returns surge
[ ] Debrief on issues
[ ] Review carrier performance
[ ] Negotiate rates for next year
[ ] Update processes
```

---

## Emergency Procedures

### Carrier Failure

```
1. Contact backup carrier immediately
2. Re-route pending shipments
3. Notify affected customers
4. Document affected orders
5. File claim if needed
```

### System Outage

```
1. Switch to manual process
2. Use backup label generation
3. Document manually processed
4. Reconcile when back online
```
