---
name: pricing-optimizer
description: Strategic pricing analysis, margin optimization, and competitive positioning across all businesses. Handles margin analysis, price elasticity, and competitive pricing. Use for pricing strategy and margin optimization.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task
---

# Pricing Optimizer Skill

> Strategic pricing analysis, margin optimization, and competitive positioning across all businesses.

---

## Skill Identity

**Name:** pricing-optimizer
**Version:** 1.0.0
**Status:** Active
**Last Updated:** 2025-12-01

---

## Capabilities

### Core Functions

1. **Margin Analysis**
   - Cost-based pricing calculations
   - Margin percentage analysis
   - Break-even analysis
   - Profit optimization

2. **Competitive Pricing**
   - Market price comparison
   - Price positioning strategy
   - Price elasticity estimation
   - Competitor monitoring

3. **Promotional Pricing**
   - Discount strategy
   - Sale planning
   - Bundle pricing
   - Volume discounts

4. **Price Optimization**
   - Dynamic pricing recommendations
   - Seasonal adjustments
   - Category-level analysis
   - SKU-level optimization

5. **Reporting**
   - Margin reports
   - Price change tracking
   - Performance analysis
   - Anomaly detection

---

## When to Use This Skill

### Activate For:
- "Analyze margins"
- "Optimize pricing"
- "Price comparison"
- "What should we charge for..."
- "Margin too low on..."
- "Competitor pricing"
- "Discount strategy"
- "Price increase recommendations"

### Defer To:
- **competitor-monitor**: Detailed competitor tracking
- **ga4-analyst**: Conversion analysis
- **bigcommerce-expert/shopify-expert**: Platform-specific pricing

---

## Business Pricing Profiles

### Buy Organics Online (BOO)

**Platform:** BigCommerce
**Model:** B2C Retail

**Margin Targets:**
| Category | Target Margin | Minimum |
|----------|---------------|---------|
| Superfoods | 45-50% | 35% |
| Supplements | 50-55% | 40% |
| Pantry | 35-40% | 25% |
| Personal Care | 50-55% | 40% |
| Sale Items | 25-35% | 15% |

**Pricing Strategy:**
- Premium positioning
- Competitive with health food stores
- Free shipping threshold: $99
- Regular promotional cycles

### Teelixir

**Platform:** Shopify
**Model:** B2C Premium + B2B Wholesale

**Margin Targets:**
| Category | Retail Margin | Wholesale |
|----------|---------------|-----------|
| Single Mushrooms | 60-65% | 40-45% |
| Blends | 55-60% | 35-40% |
| Bundles | 50-55% | 30-35% |

**Pricing Strategy:**
- Premium/luxury positioning
- Strong wholesale program
- Bundle incentives
- Limited discounting (protects brand)

### Elevate Wholesale

**Platform:** Custom (Supabase)
**Model:** B2B Wholesale

**Margin Targets:**
| Tier | Retailer Margin | Our Margin |
|------|-----------------|------------|
| Standard | 35-40% | 20-25% |
| Volume | 40-45% | 15-20% |
| Distributor | 45-50% | 10-15% |

**Pricing Strategy:**
- Volume-based pricing tiers
- MAP (Minimum Advertised Price) enforcement
- Quarterly price reviews
- Exclusive deals for top accounts

### Red Hill Fresh

**Platform:** WooCommerce
**Model:** B2C Local Delivery

**Margin Targets:**
| Category | Target Margin | Notes |
|----------|---------------|-------|
| Fresh Produce | 25-35% | Perishable, variable |
| Dry Goods | 35-40% | Stable |
| Local Products | 30-35% | Support local |
| Meat/Dairy | 25-30% | High turn |

**Pricing Strategy:**
- Competitive with local markets
- Delivery fee structure
- Subscription discounts
- Seasonal pricing on produce

---

## Pricing Formulas

### Basic Margin Calculation

```
Cost-Based Pricing:
Selling Price = Cost / (1 - Target Margin %)

Example:
Cost = $10
Target Margin = 50%
Selling Price = $10 / (1 - 0.50) = $20
```

### Margin Percentage

```
Margin % = (Selling Price - Cost) / Selling Price × 100

Example:
Selling Price = $25
Cost = $10
Margin = ($25 - $10) / $25 × 100 = 60%
```

### Markup vs Margin

```
Markup % = (Selling Price - Cost) / Cost × 100
Margin % = (Selling Price - Cost) / Selling Price × 100

Conversion:
Margin = Markup / (1 + Markup)
Markup = Margin / (1 - Margin)

Example:
50% Margin = 100% Markup
33% Margin = 50% Markup
40% Margin = 66.7% Markup
```

### Break-Even Analysis

```
Break-Even Units = Fixed Costs / (Selling Price - Variable Cost)
Break-Even Revenue = Fixed Costs / Margin %

Example:
Fixed Costs = $10,000/month
Selling Price = $50
Variable Cost = $20
Break-Even = $10,000 / ($50 - $20) = 334 units
```

### Discount Impact

```
Units Needed to Maintain Profit:
Required Increase = Discount % / (Margin % - Discount %)

Example:
Original Margin = 50%
Discount = 20%
Required Increase = 0.20 / (0.50 - 0.20) = 67% more units
```

---

## Pricing Analysis Framework

### Step 1: Cost Analysis

```
Total Product Cost:
+ Purchase/Manufacturing Cost
+ Shipping/Freight (inbound)
+ Import Duties (if applicable)
+ Warehousing allocation
+ Handling costs
= Total Landed Cost

Additional Costs to Consider:
- Payment processing (2-3%)
- Platform fees
- Returns allowance
- Marketing allocation
```

### Step 2: Market Analysis

```
Competitive Positioning:

Price Leader: Lowest price in market
  → High volume, low margin

Market Rate: Aligned with competitors
  → Balanced approach

Premium: Above market rate
  → Quality/brand differentiation

Questions to Answer:
- What are competitors charging?
- What's our value proposition?
- What will customers pay?
- How price-sensitive is the category?
```

### Step 3: Margin Requirement

```
Target Margin by Scenario:

Minimum Viable: Cover costs + small profit
Standard: Sustainable business margin
Target: Optimal profitability
Premium: Maximum extraction

Factor in:
- Volume expectations
- Marketing costs
- Growth investment
- Seasonal variations
```

### Step 4: Price Setting

```
Pricing Methods:

Cost-Plus: Cost + Target Margin
Value-Based: What customer will pay
Competitive: Match/beat competitors
Dynamic: Adjust based on demand

Final Price Considerations:
- Psychological pricing ($19.99 vs $20)
- Bundle opportunities
- Promotional calendar
- MAP requirements
```

---

## Promotional Pricing

### Discount Types

| Type | Use Case | Typical Range |
|------|----------|---------------|
| Percentage Off | General sales | 10-30% |
| Dollar Off | High-value items | $5-$50 |
| BOGO | Volume clearance | 50% effective |
| Bundle | Increase AOV | 10-20% savings |
| Free Shipping | Threshold push | Variable |
| Loyalty | Retention | 5-15% |

### Discount Strategy by Business

**BOO:**
- Seasonal sales (20-30%)
- New customer welcome (15%)
- Free shipping threshold
- Newsletter exclusive (10%)

**Teelixir:**
- Limited discounting (brand protection)
- Bundle savings (10-15%)
- Subscription discount (15%)
- Wholesale tiered pricing

**Elevate:**
- Volume discounts
- Early payment discount (2%)
- Exclusive launch pricing
- Quarterly rebates

**RHF:**
- Subscription box discount
- Weekly specials
- Local pickup discount
- Bulk produce savings

### Sale Calendar

| Month | Event | Typical Discount |
|-------|-------|------------------|
| Jan | New Year Sale | 20-30% |
| Feb | Valentine's | 15% |
| Mar | Autumn Clean | 20% |
| Apr | Easter | 15-20% |
| May | Mother's Day | 10-15% |
| Jun | EOFY Sale | 25-40% |
| Jul | Winter Wellness | 15-20% |
| Aug | Spring Prep | 15% |
| Sep | Father's Day | 10-15% |
| Oct | Pre-Holiday | 15% |
| Nov | Black Friday | 25-40% |
| Dec | Holiday | 20-30% |

---

## Price Optimization Process

### 1. Data Collection

```
Required Data:
- Current prices
- Historical prices
- Cost data
- Sales volumes
- Competitor prices
- Conversion rates
- Margin by SKU
```

### 2. Analysis

```
Identify:
- Low margin products (below minimum)
- High margin opportunities
- Price-sensitive categories
- Competitor gaps
- Seasonal patterns
```

### 3. Recommendations

```
Price Increase Candidates:
- Unique products (low competition)
- High-demand items
- Cost increases not passed on
- Strong brand products

Price Decrease Candidates:
- Slow movers
- High competition items
- Volume opportunity
- Clearance needs
```

### 4. Implementation

```
Price Change Process:
1. Document rationale
2. Calculate impact
3. Update across channels
4. Monitor performance
5. Adjust if needed
```

---

## Margin Alert Thresholds

### BOO

```
Critical (Immediate Review):
- Any SKU below 20% margin
- Category average below 30%

Warning (Weekly Review):
- SKU below 30% margin
- Category below target by >5%

Watch (Monthly Review):
- SKU below target margin
- Competitor price significantly lower
```

### Teelixir

```
Critical: Below 40% retail margin
Warning: Below 50% retail margin
Watch: Below 55% retail margin
```

### Elevate

```
Critical: Below 10% margin
Warning: Below 15% margin
Watch: Below 20% margin
```

### RHF

```
Critical: Negative margin (cost > price)
Warning: Below 15% margin
Watch: Below 25% margin
```

---

## Reporting Requirements

### Daily Monitoring

- Price error alerts
- Out-of-stock impact
- Competitor major changes
- Promotion performance

### Weekly Reports

```
Weekly Pricing Report:
- Margin by category
- Price changes made
- Low margin alerts
- Competitor movement
- Promotion performance
```

### Monthly Analysis

```
Monthly Deep Dive:
- Full margin analysis
- Price elasticity review
- Competitor positioning
- Opportunity identification
- Strategy adjustments
```

---

## Database Schema

### Pricing Tables

```sql
-- Price history tracking
CREATE TABLE product_prices (
  id SERIAL PRIMARY KEY,
  business TEXT NOT NULL,
  sku TEXT NOT NULL,
  product_name TEXT,
  cost DECIMAL(10,2),
  price DECIMAL(10,2),
  compare_at_price DECIMAL(10,2),
  margin_percent DECIMAL(5,2),
  effective_date DATE,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Competitor pricing
CREATE TABLE competitor_prices (
  id SERIAL PRIMARY KEY,
  business TEXT NOT NULL,
  competitor TEXT NOT NULL,
  product_match TEXT,
  our_sku TEXT,
  competitor_price DECIMAL(10,2),
  our_price DECIMAL(10,2),
  price_difference DECIMAL(10,2),
  captured_at TIMESTAMPTZ DEFAULT NOW()
);

-- Margin alerts
CREATE TABLE margin_alerts (
  id SERIAL PRIMARY KEY,
  business TEXT NOT NULL,
  sku TEXT NOT NULL,
  alert_type TEXT,
  current_margin DECIMAL(5,2),
  threshold DECIMAL(5,2),
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
```

---

## Skill Documentation

| Document | Purpose |
|----------|---------|
| `QUICK-REFERENCE.md` | Quick formulas |
| `context/MARGIN-GUIDE.md` | Margin targets |
| `playbooks/PRICING-WORKFLOW.md` | Pricing process |
| `scripts/margin-analyzer.ts` | Margin analysis |

---

**Skill Level:** Expert (Level 3)
**Confidence:** 95%
