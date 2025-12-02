# Buy Organics Online - Dispatch Analysis TODO

**Generated:** 2025-11-25
**Status:** REQUIRES ACTION AFTER GIT PULL

---

## IMMEDIATE ACTION REQUIRED

After pulling from git, the following tasks need to be completed to fully implement the dispatch analysis findings:

### 1. Create Supabase Table for Problem Products

Run this SQL in Supabase SQL Editor:
https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/sql/new

```sql
CREATE TABLE IF NOT EXISTS dispatch_problem_products (
  id SERIAL PRIMARY KEY,
  analysis_date DATE NOT NULL,
  product_id INTEGER,
  product_name TEXT NOT NULL,
  sku VARCHAR(50),
  slow_order_count INTEGER NOT NULL,
  fast_order_count INTEGER DEFAULT 0,
  slow_rate_percent NUMERIC(5,2) NOT NULL,
  avg_dispatch_days NUMERIC(5,2) NOT NULL,
  impact_score NUMERIC(10,2),
  sample_order_ids JSONB,
  needs_review BOOLEAN DEFAULT TRUE,
  supplier_name VARCHAR(100),
  review_status VARCHAR(50) DEFAULT 'pending',
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_problem_products_date ON dispatch_problem_products(analysis_date);
CREATE INDEX IF NOT EXISTS idx_problem_products_sku ON dispatch_problem_products(sku);
CREATE INDEX IF NOT EXISTS idx_problem_products_slow_rate ON dispatch_problem_products(slow_rate_percent DESC);
CREATE INDEX IF NOT EXISTS idx_problem_products_needs_review ON dispatch_problem_products(needs_review);
```

### 2. Import Problem Products Data

Run this command to import the problem products:

```bash
cd /home/user/master-ops/buy-organics-online
node import-problem-products.js
```

### 3. Review Key Findings

The analysis identified these **SUPPLIER PATTERNS** causing slow dispatch:

| Supplier Code | Products Affected | Avg Slow Rate | Action Required |
|--------------|------------------|---------------|-----------------|
| **KAD** (Kadac) | Salt, Bicarb, Lotus products | 85-100% | Check supplier lead times |
| **OB** (Oborne) | Salt of Earth, Nature's Shield, Dr Bronner | 90-95% | Stock level review |
| **UN** (Unknown/Direct) | Dr Organic, Bragg, Various | 75-100% | Identify actual supplier |
| **GBN** (Green Beauty Network) | Kin Kin Naturals | 92-100% | Order frequency review |

### 4. TOP 10 PRODUCTS TO INVESTIGATE IMMEDIATELY

These products have 100% slow dispatch rate with significant volume:

1. **Bragg Apple Cider Vinegar 946ml** (SKU: UN - BR05) - 29 orders, 5.6 days avg
2. **Sea Salt Celtic Coarse Dry (Grinder) 80g** (SKU: KAD - 491363) - 25 orders, 7.0 days avg
3. **Kin Kin Naturals Lime Dishwash Liquid 1050ml** (SKU: GBN - KIKI100) - 21 orders, 6.3 days avg
4. **Salt of the Earth Celtic Sea Salt Fine 250g** (SKU: OB - SESSFS) - 19 orders, 8.1 days avg
5. **Dr Organic Hemp Oil Skin Lotion 200ml** (SKU: UN - DC184) - 18 orders, 5.1 days avg
6. **Kin Kin Naturals Bulk Laundry Lavender 20L** (SKU: GBN - KIKI116) - 15 orders, 5.3 days avg
7. **Every Bit Organic Raw Avocado Oil 250ml** (SKU: UN - EV20) - 14 orders, 5.6 days avg
8. **Coconut Oil Raw Cold Pressed Organic 920g** (SKU: KAD - 462158) - 13 orders, **13.9 days avg** (CRITICAL)
9. **The Whole Foodies Kelp Noodles 340g** (SKU: UN - TWF01) - 13 orders, 4.2 days avg
10. **Organic Times Full Cream Milk Powder 300g** (SKU: UN - OG51) - 13 orders, 9.0 days avg

### 5. HIGH IMPACT PRODUCTS (Volume + Slow Rate)

These products have high order volume AND high slow dispatch rates:

| Product | SKU | Slow Orders | Fast Orders | Slow % | Avg Days |
|---------|-----|-------------|-------------|--------|----------|
| Salt of the Earth Celtic Sea Salt Coarse 650g | OB - SESSC | 58 | 4 | 93.5% | 7.6 |
| Hiltona Prunes Organic 250g | KAD - 81054 | 48 | 5 | 90.6% | 6.1 |
| Nature's Shield Organic Castor Oil 500ml | OB - NSXCASO | 48 | 9 | 84.2% | 6.8 |
| Dr Organic Pomegranate Roll On Deodorant 50ml | UN - DC40 | 52 | 15 | 77.6% | 7.2 |
| Salt of the Earth Celtic Sea Salt Fine 650g | OB - SESSF | 44 | 3 | 93.6% | 6.0 |
| Dishwasher Powder 2.5kg By Kin Kin Naturals | GBN - KIKI10 | 42 | 2 | 95.5% | 7.6 |

---

## RECOMMENDATIONS

### Short Term (This Week)
1. Review stock levels for all products with 100% slow dispatch rate
2. Contact suppliers KAD and OB to discuss lead time improvements
3. Consider increasing safety stock for high-volume slow products

### Medium Term (This Month)
1. Set up automated alerts when orders contain products with >80% slow rate
2. Create a "stock watch" list for problem products
3. Evaluate alternative suppliers for consistently slow products

### Long Term
1. Integrate this analysis into the n8n workflow for automated reporting
2. Set up monthly dispatch performance dashboards
3. Create supplier performance scorecards

---

## FILES CREATED

| File | Description |
|------|-------------|
| `dispatch-deep-analysis.json` | Full analysis results (20,000 orders) |
| `problem-products-for-supabase.json` | Top 30 problem products ready for Supabase import |
| `dispatch-analysis-results.json` | Initial 10,000 order analysis |
| `deep-dispatch-analysis.js` | Analysis script (can be rerun monthly) |
| `import-problem-products.js` | Script to import data to Supabase |

---

## RE-RUNNING THE ANALYSIS

To re-run this analysis in the future:

```bash
cd /home/user/master-ops/buy-organics-online
node deep-dispatch-analysis.js
```

This will:
- Fetch the latest 20,000 orders
- Analyze all slow orders
- Update the JSON files
- Store results in Supabase

---

**Analysis completed by Claude on 2025-11-25**
