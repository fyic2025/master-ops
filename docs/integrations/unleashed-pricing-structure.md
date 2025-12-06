# Unleashed Pricing Structure - Teelixir & Kikai

## Price Tiers (Teelixir Unleashed)

| Field | Unleashed Location | Description |
|-------|-------------------|-------------|
| **Cost** | `LastCost` | Production/purchase cost |
| **Distributor** | `SellPriceTier2` | What Kikai pays Teelixir |
| **Wholesale** | `SellPriceTier1` | What retailers pay Teelixir direct |
| **RRP** | `DefaultSellPrice` | Recommended retail price |

## Price Chain

```
Cost → Distributor → Wholesale → RRP → Shopify
       (Kikai pays)  (Retailers)  (Unleashed)  (Actual retail)
```

## Example: Pearl 250g

| Tier | Price | Source |
|------|-------|--------|
| Cost | $32.53 | Teelixir `LastCost` |
| Distributor | $52.50 | Teelixir `SellPriceTier2` |
| Wholesale | $75.00 | Teelixir `SellPriceTier1` = Kikai `DefaultSellPrice` |
| RRP | $125.00 | Teelixir `DefaultSellPrice` |
| Shopify | $129.00 | Actual retail price |

## Current $/kg Analysis (Wholesale Tier)

| Product | 50g | 100g | 250g | 500g | 1000g |
|---------|-----|------|------|------|-------|
| Pearl | $564 | $451 | $300 | $300 | - |
| Tremella | $451 | - | $240 | $240 | $240 |
| Reishi | $451 | $361 | $240 | $240 | $240 |
| Turkey Tail | $451 | $361 | $240 | $240 | - |
| Chaga | $496 | $395 | $264 | $264 | $264 |
| Cordyceps | $473 | $378 | $252 | $252 | $252 |
| Pine Pollen | $428 | - | $228 | $228 | - |

## Issue Identified

250g, 500g, and 1000g sizes all have the **same $/kg** - no tier incentive for buying larger sizes.

## Target Pricing Structure

Working backwards from largest size as anchor:
- **1000g/500g**: Anchor price (e.g., $240/kg)
- **500g**: +8% premium over 1kg
- **250g**: $300/kg target

## Tier Ratios (Current)

Based on Pearl 250g:
- Distributor/Cost: $52.50 / $32.53 = 1.61x
- Wholesale/Distributor: $75.00 / $52.50 = 1.43x
- RRP/Wholesale: $125.00 / $75.00 = 1.67x

## API Access

### Teelixir Unleashed
- API ID: Configured in `.env` (TEELIXIR_UNLEASHED_API_ID)
- Contains: Cost, Distributor, Wholesale, RRP tiers

### Kikai/Elevate Unleashed
- API ID: Configured in `.env` (ELEVATE_UNLEASHED_API_ID)
- `DefaultSellPrice` = Wholesale price to retailers (matches Teelixir `SellPriceTier1`)

### Shopify Teelixir
- Domain: `teelixir-au.myshopify.com`
- Contains actual RRP prices

## Scripts

- `scripts/unleashed-pricing-analysis.js` - Fetches and analyzes all products
- `scripts/shopify-rrp-check.js` - Compares Shopify RRP to Unleashed prices

---

## PROPOSED PRICING CHANGES (Dec 2024)

### Tier Ratios (maintained from current structure)
- **Distributor** = Wholesale × 0.70
- **RRP** = Wholesale × 1.67

### Target Structure
- 250g @ $300/kg wholesale
- 500g @ $260/kg (for products with 1000g anchor)
- 1000g @ $240/kg anchor (keep as is)

---

### PEARL (500g anchor @ $300/kg)

| Size | Tier | Current | New | Change |
|------|------|---------|-----|--------|
| 250g | Distributor | $52.50 | $60.38 | +$7.88 |
| 250g | Wholesale | $75.00 | $86.25 | +$11.25 |
| 250g | RRP | $125.00 | $144.00 | +$19.00 |

*250g moves from $300/kg to $345/kg (+15% premium over 500g)*

---

### TREMELLA (1000g anchor @ $240/kg)

| Size | Tier | Current | New | Change |
|------|------|---------|-----|--------|
| 250g | Distributor | $42.00 | $52.50 | +$10.50 |
| 250g | Wholesale | $60.00 | $75.00 | +$15.00 |
| 250g | RRP | $100.00 | $125.00 | +$25.00 |
| 500g | Distributor | $84.00 | $91.00 | +$7.00 |
| 500g | Wholesale | $120.00 | $130.00 | +$10.00 |
| 500g | RRP | $200.00 | $217.00 | +$17.00 |

*250g: $240/kg → $300/kg | 500g: $240/kg → $260/kg*

---

### REISHI (1000g anchor @ $240/kg)

| Size | Tier | Current | New | Change |
|------|------|---------|-----|--------|
| 250g | Distributor | $42.00 | $52.50 | +$10.50 |
| 250g | Wholesale | $60.00 | $75.00 | +$15.00 |
| 250g | RRP | $100.00 | $125.00 | +$25.00 |
| 500g | Distributor | $84.00 | $91.00 | +$7.00 |
| 500g | Wholesale | $120.00 | $130.00 | +$10.00 |
| 500g | RRP | $200.00 | $217.00 | +$17.00 |

*250g: $240/kg → $300/kg | 500g: $240/kg → $260/kg*

---

### TURKEY TAIL (500g anchor @ $240/kg)

| Size | Tier | Current | New | Change |
|------|------|---------|-----|--------|
| 250g | Distributor | $42.00 | $52.50 | +$10.50 |
| 250g | Wholesale | $60.00 | $75.00 | +$15.00 |
| 250g | RRP | $100.00 | $125.00 | +$25.00 |

*250g: $240/kg → $300/kg*

---

### PINE POLLEN (500g anchor @ $228/kg)

| Size | Tier | Current | New | Change |
|------|------|---------|-----|--------|
| 250g | Distributor | $39.90 | $49.88 | +$9.98 |
| 250g | Wholesale | $57.00 | $71.25 | +$14.25 |
| 250g | RRP | $95.00 | $119.00 | +$24.00 |

*250g: $228/kg → $285/kg (+25% premium)*

---

### NO CHANGES NEEDED

- **Chaga**: No 250g size in Kikai (jumps 100g → 500g)
- **Cordyceps**: No 250g size in Kikai (jumps 100g → 500g)
- **Resveratrol**: Only 50g and 250g available

---

### QUICK REFERENCE - ALL CHANGES

| Product | Size | Distributor | Wholesale | RRP |
|---------|------|-------------|-----------|-----|
| Pearl | 250g | $52.50 → $60.38 | $75 → $86.25 | $125 → $144 |
| Tremella | 250g | $42 → $52.50 | $60 → $75 | $100 → $125 |
| Tremella | 500g | $84 → $91 | $120 → $130 | $200 → $217 |
| Reishi | 250g | $42 → $52.50 | $60 → $75 | $100 → $125 |
| Reishi | 500g | $84 → $91 | $120 → $130 | $200 → $217 |
| Turkey Tail | 250g | $42 → $52.50 | $60 → $75 | $100 → $125 |
| Pine Pollen | 250g | $39.90 → $49.88 | $57 → $71.25 | $95 → $119 |
