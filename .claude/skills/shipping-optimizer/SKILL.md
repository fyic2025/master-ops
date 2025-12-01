# Shipping Optimizer Skill

> Expert-level shipping strategy and fulfillment optimization across all businesses.

---

## Skill Identity

**Name:** shipping-optimizer
**Version:** 1.0.0
**Status:** Active
**Last Updated:** 2025-12-01

---

## Capabilities

### Core Functions

1. **Carrier Selection**
   - Australia Post integration
   - Sendle integration
   - Local delivery optimization
   - Rate comparison

2. **Shipping Zone Management**
   - Zone configuration
   - Rate tables
   - Free shipping thresholds
   - Location-based rules

3. **Fulfillment Optimization**
   - Packing optimization
   - Label generation
   - Batch processing
   - Tracking management

4. **Cost Analysis**
   - Shipping cost breakdown
   - Margin impact analysis
   - Rate negotiation support
   - Volume discount tracking

5. **Customer Experience**
   - Delivery time estimates
   - Shipping communication
   - Returns handling
   - Tracking integration

---

## When to Use This Skill

### Activate For:
- "Shipping rates"
- "Delivery optimization"
- "Australia Post setup"
- "Sendle integration"
- "Free shipping threshold"
- "Shipping cost analysis"
- "Returns process"

### Defer To:
- **bigcommerce-expert**: BOO shipping config
- **shopify-expert**: Teelixir shipping config
- **woocommerce-expert**: RHF shipping config
- **pricing-optimizer**: Price adjustments for shipping

---

## Business Shipping Profiles

### BOO (Buy Organics Online)

**Primary Carriers:**
- Australia Post (parcel post, express)
- Sendle (economy option)

**Shipping Strategy:**
```
Free Shipping: Orders $99+
Flat Rate: $9.95 (under $99)
Express: $14.95 flat
Click & Collect: Free (warehouse pickup)

Zones:
- Metro (2-4 days): Standard rates
- Regional (4-7 days): Standard rates
- Remote (7-14 days): + $5-15 surcharge
```

**Average Order Weight:** 1.5kg
**Packaging:** Cartons, satchels, tubes

### Teelixir

**Primary Carriers:**
- Australia Post (parcel post)
- Sendle (primary)

**Shipping Strategy:**
```
Free Shipping: Orders $75+
Flat Rate: $8.95 (under $75)
Express: $12.95 flat
International: Via Australia Post

Zones:
- Domestic Australia
- New Zealand: $15 flat
- International: Calculated
```

**Average Order Weight:** 400g
**Packaging:** Small satchels, padded bags

### Elevate Wholesale

**Primary Carriers:**
- Sendle (B2B)
- Direct courier (large orders)
- Pallet freight (bulk)

**Shipping Strategy:**
```
Free Shipping: Orders $500+ (metro)
Calculated: Weight-based rates
Pallet: Quote required
Minimum Order: $150
```

**Average Order Weight:** 15kg
**Packaging:** Cartons, pallets

### Red Hill Fresh (RHF)

**Primary Carriers:**
- Own delivery fleet (local)
- Australia Post (extended area)

**Shipping Strategy:**
```
Local Delivery (Mornington Peninsula):
- Free: Orders $50+
- $8 flat: Under $50
- Time slots: Morning/Afternoon/Evening

Melbourne Metro:
- $15 flat rate
- Free over $100

Farm Gate Pickup: Free
```

**Delivery Schedule:** Tue, Thu, Sat local delivery

---

## Carrier Integration

### Australia Post API

```typescript
const auspostConfig = {
  accountNumber: process.env.AUSPOST_ACCOUNT,
  apiKey: process.env.AUSPOST_API_KEY,
  password: process.env.AUSPOST_PASSWORD,
  baseUrl: 'https://digitalapi.auspost.com.au'
}

const headers = {
  'AUTH-KEY': auspostConfig.apiKey,
  'Content-Type': 'application/json'
}
```

#### Get Shipping Rates

```typescript
async function getAuspostRates(params: {
  from_postcode: string
  to_postcode: string
  weight: number  // kg
  length: number  // cm
  width: number
  height: number
}) {
  const response = await fetch(
    `${baseUrl}/postage/parcel/domestic/calculate.json?` +
    `from_postcode=${params.from_postcode}&` +
    `to_postcode=${params.to_postcode}&` +
    `length=${params.length}&` +
    `width=${params.width}&` +
    `height=${params.height}&` +
    `weight=${params.weight}`,
    { headers }
  )
  return response.json()
}
```

#### Create Shipment

```typescript
async function createAuspostShipment(shipment: {
  shipments: Array<{
    shipment_reference: string
    sender: Address
    receiver: Address
    items: Array<{
      item_reference: string
      product_id: string  // e.g., '7E55'
      length: number
      width: number
      height: number
      weight: number
    }>
  }>
}) {
  const response = await fetch(`${baseUrl}/shipping/v1/shipments`, {
    method: 'POST',
    headers: {
      ...headers,
      'Account-Number': auspostConfig.accountNumber
    },
    body: JSON.stringify(shipment)
  })
  return response.json()
}
```

### Sendle API

```typescript
const sendleConfig = {
  sendleId: process.env.SENDLE_ID,
  apiKey: process.env.SENDLE_API_KEY,
  baseUrl: 'https://api.sendle.com'
}

const sendleAuth = Buffer.from(`${sendleConfig.sendleId}:${sendleConfig.apiKey}`).toString('base64')

const sendleHeaders = {
  'Authorization': `Basic ${sendleAuth}`,
  'Content-Type': 'application/json'
}
```

#### Get Sendle Quote

```typescript
async function getSendleQuote(params: {
  pickup_suburb: string
  pickup_postcode: string
  delivery_suburb: string
  delivery_postcode: string
  weight_value: number  // kg
  weight_units: 'kg'
  volume_value?: number  // litres
  volume_units?: 'l'
}) {
  const response = await fetch(`${sendleConfig.baseUrl}/api/quote`, {
    method: 'GET',
    headers: sendleHeaders,
    body: JSON.stringify(params)
  })
  return response.json()
}
```

#### Create Sendle Order

```typescript
async function createSendleOrder(order: {
  pickup_date?: string
  description: string
  weight: { value: number; units: 'kg' }
  volume?: { value: number; units: 'l' }
  sender: {
    contact: { name: string; phone?: string; email: string }
    address: { address_line1: string; suburb: string; postcode: string; state_name: string; country: string }
    instructions?: string
  }
  receiver: {
    contact: { name: string; phone?: string; email: string }
    address: { address_line1: string; suburb: string; postcode: string; state_name: string; country: string }
    instructions?: string
  }
  product_code?: string  // 'STANDARD', 'EXPRESS', 'PREMIUM'
}) {
  const response = await fetch(`${sendleConfig.baseUrl}/api/orders`, {
    method: 'POST',
    headers: sendleHeaders,
    body: JSON.stringify(order)
  })
  return response.json()
}
```

---

## Rate Calculation

### Zone-Based Pricing

```typescript
interface ShippingZone {
  name: string
  postcodeRanges: Array<{ from: string; to: string }>
  baseRate: number
  freeThreshold: number
  deliveryDays: { min: number; max: number }
}

const zones: ShippingZone[] = [
  {
    name: 'Metro',
    postcodeRanges: [
      { from: '3000', to: '3207' },
      { from: '2000', to: '2234' },
      { from: '4000', to: '4179' }
    ],
    baseRate: 9.95,
    freeThreshold: 99,
    deliveryDays: { min: 2, max: 4 }
  },
  {
    name: 'Regional',
    postcodeRanges: [
      { from: '2250', to: '2999' },
      { from: '3208', to: '3999' }
    ],
    baseRate: 12.95,
    freeThreshold: 99,
    deliveryDays: { min: 4, max: 7 }
  },
  {
    name: 'Remote',
    postcodeRanges: [
      { from: '0800', to: '0899' },
      { from: '4700', to: '4999' }
    ],
    baseRate: 19.95,
    freeThreshold: 149,
    deliveryDays: { min: 7, max: 14 }
  }
]

function getZone(postcode: string): ShippingZone | null {
  for (const zone of zones) {
    for (const range of zone.postcodeRanges) {
      if (postcode >= range.from && postcode <= range.to) {
        return zone
      }
    }
  }
  return null
}
```

### Weight-Based Pricing

```typescript
interface WeightBracket {
  maxWeight: number  // kg
  rate: number
}

const weightBrackets: WeightBracket[] = [
  { maxWeight: 0.5, rate: 8.95 },
  { maxWeight: 1, rate: 10.95 },
  { maxWeight: 3, rate: 12.95 },
  { maxWeight: 5, rate: 15.95 },
  { maxWeight: 10, rate: 19.95 },
  { maxWeight: 20, rate: 29.95 }
]

function getWeightRate(weight: number): number {
  for (const bracket of weightBrackets) {
    if (weight <= bracket.maxWeight) {
      return bracket.rate
    }
  }
  return weightBrackets[weightBrackets.length - 1].rate
}
```

### Combined Calculation

```typescript
function calculateShipping(
  postcode: string,
  weight: number,
  orderTotal: number
): {
  rate: number
  carrier: string
  deliveryEstimate: string
  freeShippingEligible: boolean
} {
  const zone = getZone(postcode)
  if (!zone) {
    return {
      rate: 24.95,  // Default remote rate
      carrier: 'Australia Post',
      deliveryEstimate: '7-14 business days',
      freeShippingEligible: false
    }
  }

  const weightRate = getWeightRate(weight)
  const baseRate = Math.max(zone.baseRate, weightRate)
  const freeShippingEligible = orderTotal >= zone.freeThreshold

  return {
    rate: freeShippingEligible ? 0 : baseRate,
    carrier: 'Australia Post',
    deliveryEstimate: `${zone.deliveryDays.min}-${zone.deliveryDays.max} business days`,
    freeShippingEligible
  }
}
```

---

## Packing Optimization

### Box Sizes

```typescript
interface BoxSize {
  name: string
  length: number  // cm
  width: number
  height: number
  maxWeight: number  // kg
  cost: number  // box cost
}

const boxSizes: BoxBox[] = [
  { name: 'Satchel Small', length: 22, width: 14, height: 5, maxWeight: 0.5, cost: 0.50 },
  { name: 'Satchel Medium', length: 32, width: 24, height: 8, maxWeight: 1.5, cost: 0.75 },
  { name: 'Satchel Large', length: 42, width: 32, height: 10, maxWeight: 3, cost: 1.00 },
  { name: 'Box Small', length: 20, width: 15, height: 10, maxWeight: 3, cost: 1.50 },
  { name: 'Box Medium', length: 30, width: 25, height: 15, maxWeight: 8, cost: 2.00 },
  { name: 'Box Large', length: 40, width: 30, height: 25, maxWeight: 15, cost: 3.00 }
]
```

### Box Selection

```typescript
function selectBox(items: Array<{ length: number; width: number; height: number; weight: number }>): BoxSize | null {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0)
  const totalVolume = items.reduce((sum, item) => sum + (item.length * item.width * item.height), 0)

  for (const box of boxSizes) {
    const boxVolume = box.length * box.width * box.height
    if (totalWeight <= box.maxWeight && totalVolume <= boxVolume * 0.8) {  // 80% fill rate
      return box
    }
  }

  return null  // Need multiple boxes or custom solution
}
```

---

## Free Shipping Strategy

### Threshold Analysis

```typescript
interface FreeShippingAnalysis {
  currentThreshold: number
  averageOrderValue: number
  ordersAboveThreshold: number
  ordersBelowThreshold: number
  shippingRevenue: number
  shippingCost: number
  recommendations: string[]
}

function analyzeFreeShippingThreshold(
  orders: Array<{ total: number; shippingPaid: number; shippingCost: number }>,
  currentThreshold: number
): FreeShippingAnalysis {
  const aboveThreshold = orders.filter(o => o.total >= currentThreshold)
  const belowThreshold = orders.filter(o => o.total < currentThreshold)

  const avgOrderValue = orders.reduce((sum, o) => sum + o.total, 0) / orders.length
  const shippingRevenue = belowThreshold.reduce((sum, o) => sum + o.shippingPaid, 0)
  const totalShippingCost = orders.reduce((sum, o) => sum + o.shippingCost, 0)

  const recommendations: string[] = []

  // Threshold too high?
  if (aboveThreshold.length < orders.length * 0.3) {
    recommendations.push(`Consider lowering threshold - only ${Math.round(aboveThreshold.length/orders.length*100)}% qualify`)
  }

  // Threshold too low?
  if (aboveThreshold.length > orders.length * 0.8) {
    recommendations.push(`Threshold may be too low - ${Math.round(aboveThreshold.length/orders.length*100)}% qualify. Consider raising.`)
  }

  // Average order analysis
  if (avgOrderValue < currentThreshold * 0.7) {
    recommendations.push(`Average order ($${avgOrderValue.toFixed(2)}) is well below threshold. May be deterring conversions.`)
  }

  return {
    currentThreshold,
    averageOrderValue: avgOrderValue,
    ordersAboveThreshold: aboveThreshold.length,
    ordersBelowThreshold: belowThreshold.length,
    shippingRevenue,
    shippingCost: totalShippingCost,
    recommendations
  }
}
```

---

## Delivery Estimation

### Australia Post Transit Times

```typescript
const transitTimes: Record<string, Record<string, { min: number; max: number }>> = {
  '3000': {  // Melbourne
    '3000': { min: 1, max: 2 },  // Metro Melbourne
    '2000': { min: 2, max: 4 },  // Sydney
    '4000': { min: 3, max: 5 },  // Brisbane
    '5000': { min: 2, max: 4 },  // Adelaide
    '6000': { min: 4, max: 7 },  // Perth
    '7000': { min: 3, max: 5 },  // Hobart
    '0800': { min: 5, max: 10 } // Darwin
  }
}

function estimateDelivery(
  originPostcode: string,
  destPostcode: string,
  expressShipping: boolean
): { min: number; max: number; description: string } {
  // Simplified lookup
  const originPrefix = originPostcode.substring(0, 1) + '000'
  const destPrefix = destPostcode.substring(0, 1) + '000'

  let transit = transitTimes[originPrefix]?.[destPrefix] || { min: 5, max: 10 }

  if (expressShipping) {
    transit = {
      min: Math.max(1, transit.min - 1),
      max: Math.max(2, Math.ceil(transit.max / 2))
    }
  }

  const description = transit.max <= 3
    ? 'Fast delivery'
    : transit.max <= 7
    ? 'Standard delivery'
    : 'Extended delivery'

  return { ...transit, description }
}
```

---

## Returns Processing

### Return Policy by Business

```typescript
interface ReturnPolicy {
  business: string
  daysAllowed: number
  conditions: string[]
  returnShipping: 'free' | 'customer' | 'conditional'
  refundMethod: 'original' | 'store_credit' | 'choice'
}

const returnPolicies: ReturnPolicy[] = [
  {
    business: 'boo',
    daysAllowed: 30,
    conditions: ['Unopened', 'Original packaging', 'Excludes perishables'],
    returnShipping: 'customer',
    refundMethod: 'original'
  },
  {
    business: 'teelixir',
    daysAllowed: 30,
    conditions: ['Unopened', 'Damaged in transit = free return'],
    returnShipping: 'conditional',
    refundMethod: 'choice'
  },
  {
    business: 'rhf',
    daysAllowed: 0,  // Fresh produce - no returns
    conditions: ['Fresh produce not returnable', 'Quality issues addressed case by case'],
    returnShipping: 'free',
    refundMethod: 'store_credit'
  }
]
```

### Generate Return Label

```typescript
async function generateReturnLabel(
  orderId: string,
  customerAddress: Address,
  warehouseAddress: Address
): Promise<{ labelUrl: string; trackingNumber: string }> {
  // Using Sendle for return shipping
  const returnOrder = await createSendleOrder({
    description: `Return for order ${orderId}`,
    weight: { value: 1, units: 'kg' },
    sender: {
      contact: { name: customerAddress.name, email: customerAddress.email },
      address: customerAddress
    },
    receiver: {
      contact: { name: 'Returns Dept', email: 'returns@business.com' },
      address: warehouseAddress
    },
    product_code: 'STANDARD'
  })

  return {
    labelUrl: returnOrder.labels[0].url,
    trackingNumber: returnOrder.sendle_reference
  }
}
```

---

## Cost Optimization

### Carrier Comparison

```typescript
async function compareCarriers(
  origin: Address,
  destination: Address,
  weight: number,
  dimensions: { length: number; width: number; height: number }
): Promise<Array<{ carrier: string; service: string; rate: number; days: string }>> {
  const results: Array<{ carrier: string; service: string; rate: number; days: string }> = []

  // Australia Post
  try {
    const auspostRates = await getAuspostRates({
      from_postcode: origin.postcode,
      to_postcode: destination.postcode,
      weight,
      ...dimensions
    })

    for (const service of auspostRates.services) {
      results.push({
        carrier: 'Australia Post',
        service: service.name,
        rate: service.price,
        days: service.delivery_time
      })
    }
  } catch (e) {
    console.error('AusPost error:', e)
  }

  // Sendle
  try {
    const sendleQuote = await getSendleQuote({
      pickup_suburb: origin.suburb,
      pickup_postcode: origin.postcode,
      delivery_suburb: destination.suburb,
      delivery_postcode: destination.postcode,
      weight_value: weight,
      weight_units: 'kg'
    })

    for (const quote of sendleQuote.quotes) {
      results.push({
        carrier: 'Sendle',
        service: quote.plan_name,
        rate: quote.gross.amount,
        days: `${quote.route.delivery_guarantee_status}`
      })
    }
  } catch (e) {
    console.error('Sendle error:', e)
  }

  return results.sort((a, b) => a.rate - b.rate)
}
```

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Rate not calculating | Invalid postcode | Validate postcode format |
| Label generation fail | Missing fields | Check required address fields |
| Tracking not updating | API delay | Allow 24h for updates |
| Wrong zone assigned | Postcode mapping | Review zone definitions |

### Debug Checklist

```
[ ] Verify carrier API credentials
[ ] Check postcode format (4 digits)
[ ] Confirm weight is in correct units
[ ] Validate all address fields present
[ ] Test with known working postcode
[ ] Review carrier service availability
```

---

## Skill Documentation

| Document | Purpose |
|----------|---------|
| `QUICK-REFERENCE.md` | Quick reference |
| `context/CARRIERS.md` | Carrier details |
| `playbooks/FULFILLMENT.md` | Fulfillment workflows |
| `scripts/shipping-calc.ts` | Rate calculator |

---

**Skill Level:** Expert (Level 3)
**Confidence:** 95%
