# Shipping Optimizer - Quick Reference

## Business Shipping Summary

| Business | Free Ship | Flat Rate | Primary Carrier |
|----------|-----------|-----------|-----------------|
| BOO | $99+ | $9.95 | Australia Post |
| Teelixir | $75+ | $8.95 | Sendle |
| Elevate | $500+ | Calculated | Sendle |
| RHF | $50+ (local) | $8/$15 | Own fleet/AP |

---

## Australia Post API

### Authentication
```typescript
const headers = {
  'AUTH-KEY': process.env.AUSPOST_API_KEY,
  'Account-Number': process.env.AUSPOST_ACCOUNT
}
```

### Get Rates
```
GET /postage/parcel/domestic/calculate.json
  ?from_postcode=3000
  &to_postcode=2000
  &length=30&width=20&height=15
  &weight=2
```

### Service Codes
| Code | Service |
|------|---------|
| 7E55 | Parcel Post |
| 7B05 | Express Post |
| 7C54 | Express Post Satchel |
| 7D65 | Parcel Post Satchel |

---

## Sendle API

### Authentication
```typescript
const auth = Buffer.from(`${sendleId}:${apiKey}`).toString('base64')
const headers = { 'Authorization': `Basic ${auth}` }
```

### Get Quote
```
GET /api/quote
Body: {
  "pickup_suburb": "Melbourne",
  "pickup_postcode": "3000",
  "delivery_suburb": "Sydney",
  "delivery_postcode": "2000",
  "weight_value": 1,
  "weight_units": "kg"
}
```

### Create Order
```
POST /api/orders
Body: {
  "description": "Product shipment",
  "weight": { "value": 1, "units": "kg" },
  "sender": { ... },
  "receiver": { ... },
  "product_code": "STANDARD"
}
```

### Product Codes
| Code | Service |
|------|---------|
| STANDARD | Standard delivery |
| EXPRESS | Express delivery |
| PREMIUM | Premium service |

---

## Zone Classifications

### Metro Postcodes
```
Sydney: 2000-2234
Melbourne: 3000-3207
Brisbane: 4000-4179
Adelaide: 5000-5199
Perth: 6000-6199
```

### Transit Times (Business Days)
| Route | Standard | Express |
|-------|----------|---------|
| Metro-Metro | 2-4 | 1-2 |
| Metro-Regional | 4-7 | 2-3 |
| Metro-Remote | 7-14 | 4-7 |
| Interstate Metro | 3-5 | 1-2 |

---

## Weight Brackets

| Weight | Economy | Standard | Express |
|--------|---------|----------|---------|
| < 500g | $6.95 | $8.95 | $12.95 |
| 500g-1kg | $8.95 | $10.95 | $14.95 |
| 1-3kg | $10.95 | $12.95 | $18.95 |
| 3-5kg | $13.95 | $15.95 | $22.95 |
| 5-10kg | $17.95 | $19.95 | $29.95 |

---

## Box Sizes

| Size | Dimensions (cm) | Max Weight |
|------|-----------------|------------|
| Satchel S | 22x14x5 | 500g |
| Satchel M | 32x24x8 | 1.5kg |
| Satchel L | 42x32x10 | 3kg |
| Box S | 20x15x10 | 3kg |
| Box M | 30x25x15 | 8kg |
| Box L | 40x30x25 | 15kg |

---

## Free Shipping Thresholds

### Calculation
```typescript
const eligibleForFree = orderTotal >= freeThreshold
const shippingRate = eligibleForFree ? 0 : baseRate
```

### Upsell Message
```
"Add $X.XX more for FREE shipping!"
```

---

## RHF Local Delivery

### Zones
```
Mornington Peninsula: 3939, 3938, 3937...
  - Free over $50
  - $8 under $50

Melbourne Metro: 3xxx
  - Free over $100
  - $15 flat
```

### Time Slots
- Morning: 8am-12pm
- Afternoon: 12pm-4pm
- Evening: 4pm-7pm

### Delivery Days
- Tuesday, Thursday, Saturday (local)
- Wednesday, Friday (metro)

---

## Return Shipping

| Business | Policy | Who Pays |
|----------|--------|----------|
| BOO | 30 days | Customer |
| Teelixir | 30 days | Conditional |
| RHF | No returns | N/A (fresh) |
| Elevate | 14 days | Customer |

---

## Cost Formula

```typescript
totalShippingCost =
  carrierRate +
  packagingCost +
  handlingFee +
  surcharges

margin = customerPays - totalShippingCost
```

---

## Surcharges

| Type | Amount |
|------|--------|
| Remote area | $5-15 |
| Signature required | $3-5 |
| Saturday delivery | $8-10 |
| Dangerous goods | $15+ |
| Oversized | Calculated |

---

## Troubleshooting

| Issue | Check |
|-------|-------|
| Rate not showing | Postcode validity |
| Label failed | Address completeness |
| Wrong rate | Weight/dimensions |
| No tracking | API sync delay |

---

## API Endpoints

### Australia Post
```
Base: https://digitalapi.auspost.com.au
Rate: /postage/parcel/domestic/calculate.json
Ship: /shipping/v1/shipments
Track: /shipping/v1/track
```

### Sendle
```
Base: https://api.sendle.com
Quote: /api/quote
Order: /api/orders
Track: /api/tracking/{ref}
```

---

## Related Skills

| Task | Skill |
|------|-------|
| BigCommerce shipping | bigcommerce-expert |
| Shopify shipping | shopify-expert |
| WooCommerce shipping | woocommerce-expert |
| Pricing for shipping | pricing-optimizer |
