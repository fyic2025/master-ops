# Carrier Reference Guide

## Australia Post

### Overview

Australia's national postal service, offering comprehensive domestic and international shipping.

### Account Setup

1. Create business account at auspost.com.au/business
2. Apply for eParcel/StarTrack contract
3. Get API credentials from Business Portal
4. Configure in e-commerce platform

### Services

| Service | Transit | Best For |
|---------|---------|----------|
| Parcel Post | 2-6 days | Standard delivery |
| Express Post | 1-3 days | Urgent items |
| eParcel | 2-6 days | High volume |
| StarTrack Express | 1-2 days | Business express |

### Pricing Tiers

**Retail Rates:**
- Standard pricing from post office
- No account required
- Higher rates

**Contract Rates:**
- Negotiated based on volume
- Typically 10-30% discount
- Monthly minimum requirements

**eParcel Rates:**
- Best rates for high volume
- Integrated label printing
- Pickup service included

### API Integration

```typescript
// Base URLs
const auspostAPI = {
  postage: 'https://digitalapi.auspost.com.au/postage',
  shipping: 'https://digitalapi.auspost.com.au/shipping/v1',
  tracking: 'https://digitalapi.auspost.com.au/tracking'
}

// Rate calculation
async function getRate(params: {
  from_postcode: string
  to_postcode: string
  length: number  // cm
  width: number   // cm
  height: number  // cm
  weight: number  // kg
  service_code?: string
}) {
  const query = new URLSearchParams(params as any)
  const response = await fetch(
    `${auspostAPI.postage}/parcel/domestic/calculate.json?${query}`,
    {
      headers: { 'AUTH-KEY': process.env.AUSPOST_API_KEY }
    }
  )
  return response.json()
}
```

### Size & Weight Limits

| Service | Max Weight | Max Length | Max Girth |
|---------|------------|------------|-----------|
| Parcel Post | 22kg | 105cm | 140cm |
| Express Post | 20kg | 105cm | 140cm |
| Satchels | Varies | Pre-set | Pre-set |

### Surcharges

| Type | Amount |
|------|--------|
| Signature on Delivery | $3.50 |
| Dangerous Goods | $15+ |
| Extra Cover | From $2.50 |
| Saturday Delivery | $8.50 |
| Remote/Regional | $5-15 |

### Tracking States

```
Received      → Parcel received
In Transit    → Moving through network
Arrived       → At delivery facility
Delivered     → Successfully delivered
Carded        → Card left (no one home)
Returned      → Returned to sender
```

---

## Sendle

### Overview

Australian tech-enabled delivery service offering competitive rates for small-medium businesses.

### Account Setup

1. Sign up at sendle.com
2. Verify business details
3. Get API credentials from dashboard
4. No minimum volume required

### Services

| Service | Transit | Best For |
|---------|---------|----------|
| Standard | 2-5 days | Regular shipments |
| Express | 1-3 days | Faster delivery |
| Premium | 1-2 days | Priority service |

### Pricing

**No Volume Commitment:**
- Pay per parcel
- No monthly fees
- Competitive rates

**Volume Discounts:**
- 100+ parcels/month: 5% off
- 500+ parcels/month: 10% off
- 1000+ parcels/month: Custom rates

### API Integration

```typescript
const sendleAPI = {
  base: 'https://api.sendle.com',
  sandbox: 'https://sandbox.sendle.com'
}

const auth = Buffer.from(
  `${process.env.SENDLE_ID}:${process.env.SENDLE_API_KEY}`
).toString('base64')

// Get quote
async function getQuote(params: {
  pickup_suburb: string
  pickup_postcode: string
  delivery_suburb: string
  delivery_postcode: string
  weight_value: number
  weight_units: 'kg' | 'g'
  volume_value?: number
  volume_units?: 'l' | 'ml'
}) {
  const response = await fetch(`${sendleAPI.base}/api/quote`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params)
  })
  return response.json()
}

// Create order
async function createOrder(order: SendleOrder) {
  const response = await fetch(`${sendleAPI.base}/api/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(order)
  })
  return response.json()
}
```

### Size Limits

| Type | Max Dimensions | Max Weight |
|------|----------------|------------|
| Satchel | Pre-set | 5kg |
| Parcel | 120cm longest | 25kg |
| Large Parcel | 150cm longest | 25kg |

### Features

- Carbon neutral shipping (all services)
- Free pickup (metro areas)
- Integrated returns solution
- Real-time tracking
- SMS/email notifications

---

## Direct Freight Express (DFE)

### Overview

Regional and B2B freight specialist, good for larger shipments and regional deliveries.

### Best For

- B2B shipments
- Regional Australia
- Pallet freight
- Time-critical deliveries

### Services

| Service | Transit |
|---------|---------|
| Road Express | 1-3 days |
| Priority | Next day |
| Economy | 3-7 days |

---

## Toll IPEC

### Overview

Major freight and logistics provider for business-to-business deliveries.

### Best For

- Wholesale orders
- Pallet freight
- Regular B2B routes
- Large volume

### Services

| Service | Best For |
|---------|----------|
| Priority | Urgent B2B |
| Express | Standard B2B |
| Economy | Cost-sensitive |
| Pallet | Large volume |

---

## Local Delivery (RHF)

### Overview

Own delivery fleet for Mornington Peninsula area.

### Coverage

**Primary Zone (Free over $50):**
```
3939 - Red Hill
3938 - Red Hill South
3937 - Flinders
3936 - Shoreham
3934 - Balnarring
3933 - Somers
3931 - Mornington
3930 - Mount Eliza
3929 - Flinders
```

**Extended Zone ($15):**
```
3xxx - Melbourne Metro
```

### Delivery Schedule

| Day | Zone |
|-----|------|
| Tuesday | Peninsula South |
| Thursday | Peninsula North |
| Saturday | All Peninsula |
| Wednesday | Melbourne South |
| Friday | Melbourne East |

### Fleet Management

```
Vehicles: 2 refrigerated vans
Capacity: 50-75 orders/day
Temperature: 2-8°C maintained
```

---

## Carrier Selection Matrix

| Criteria | Best Carrier |
|----------|--------------|
| Lowest cost | Sendle |
| Fastest | Australia Post Express |
| Most coverage | Australia Post |
| B2B | Toll/DFE |
| Eco-friendly | Sendle |
| Large items | DFE |
| Local fresh | Own fleet |

---

## Integration Priority

1. **Australia Post** - Primary domestic
2. **Sendle** - Cost-effective alternative
3. **Own Fleet** - Local delivery (RHF)
4. **Toll/DFE** - B2B/wholesale

---

## Rate Negotiation Tips

1. **Provide volume data** - Monthly parcel counts
2. **Commit to exclusivity** - Better rates for sole carrier
3. **Review annually** - Renegotiate based on growth
4. **Bundle services** - Combine domestic + international
5. **Peak season** - Lock in rates before Q4
