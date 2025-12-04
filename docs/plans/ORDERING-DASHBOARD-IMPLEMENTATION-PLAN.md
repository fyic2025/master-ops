# Teelixir Ordering Dashboard - Implementation Plan

**Date:** 2024-12-04
**Status:** Ready for Implementation
**Priority:** High
**Estimated Effort:** 2-3 days

---

## Executive Summary

Recreate the Teelixir ordering/production planning dashboard from the legacy FYIC portal. This dashboard helps Teelixir plan production by analyzing sales velocity, calculating raw material needs, and forecasting stock requirements.

---

## Original System Overview

The FYIC portal had 4 main views for Teelixir ordering:

| View | Purpose | Key Calculation |
|------|---------|-----------------|
| **Stock Analysis** | Overview of all products with sales velocity | Required Units = TotalSold - AvailableQty |
| **Stock On Hand** | Inventory valuation with revised costs | Value = QtyOnHand × RevisedCost |
| **Bill of Materials** | BOM explosion showing component usage | Component Usage = ParentSales × BOMQuantity |
| **Stock Needs** | What raw materials/packaging to order | EstimatedUsage = ((High-Avg)/2 + Avg) × days |

---

## Data Sources

### Unleashed API Endpoints

| Endpoint | Data | Usage |
|----------|------|-------|
| `/Products/Page/{n}` | All products with metadata | Product catalog |
| `/StockOnHand/Page/{n}` | Current stock levels | Available/OnHand/Allocated quantities |
| `/BillOfMaterials/Page/{n}` | Recipe/BOM data | What components make each product |
| `/Invoices/Page/{n}` | Sales invoices | Historical demand analysis |
| `/SalesOrders/Page/{n}` | Sales orders | Forecasting (uses CompletedDate) |

### Unleashed Credentials (Teelixir)

```
API Auth ID: 7fda9404-7197-477b-89b1-dadbcefae168
API Secret: a65AOqESdYl9GHyhqohaoYPGWsugYa2V1xi90zRn4pW4LzjCcgF3JUB3Z8YI4PNq5duUphxQ8zGOCwNKexDQ==
```

**Note:** Credentials should be moved to Supabase vault.

---

## Implementation Steps

### Phase 1: Database Schema (Day 1 Morning)

#### 1.1 Create Supabase Tables

```sql
-- Store product group overrides and revised costs
CREATE TABLE tlx_ordering_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code VARCHAR(255) NOT NULL UNIQUE,
  product_guid VARCHAR(255),
  revised_cost DECIMAL(10,2),
  product_group_override VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cache for Unleashed data (refreshed on demand)
CREATE TABLE tlx_ordering_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key VARCHAR(100) NOT NULL UNIQUE,
  data JSONB NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour'
);

-- Index for fast lookups
CREATE INDEX idx_tlx_ordering_products_code ON tlx_ordering_products(product_code);
CREATE INDEX idx_tlx_ordering_cache_key ON tlx_ordering_cache(cache_key);
CREATE INDEX idx_tlx_ordering_cache_expires ON tlx_ordering_cache(expires_at);

-- RLS policies
ALTER TABLE tlx_ordering_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE tlx_ordering_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON tlx_ordering_products
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON tlx_ordering_cache
  FOR ALL USING (true) WITH CHECK (true);
```

**Migration file:** `infra/supabase/migrations/20251205_tlx_ordering_dashboard.sql`

---

### Phase 2: API Routes (Day 1 Afternoon)

#### 2.1 Create API Route Structure

```
dashboard/src/app/api/ordering/
├── sync/route.ts           # Refresh data from Unleashed
├── stock-analysis/route.ts # Stock analysis endpoint
├── stock-on-hand/route.ts  # Stock on hand with valuations
├── bom/route.ts            # Bill of materials analysis
├── stock-needs/route.ts    # Raw materials ordering needs
└── update-product/route.ts # Update revised cost/product group
```

#### 2.2 Unleashed Data Sync (`/api/ordering/sync`)

```typescript
// Fetch and cache all required data from Unleashed
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === 'true';

  // Check cache freshness (1 hour default)
  const cacheValid = await checkCacheValid();
  if (cacheValid && !force) {
    return NextResponse.json({ status: 'cached', message: 'Data is fresh' });
  }

  // Fetch from Unleashed API
  const [products, stock, bom, invoices, salesOrders] = await Promise.all([
    fetchUnleashedProducts(),
    fetchUnleashedStockOnHand(),
    fetchUnleashedBillOfMaterials(),
    fetchUnleashedInvoices(),
    fetchUnleashedSalesOrders(),
  ]);

  // Store in Supabase cache
  await upsertCache('products', products);
  await upsertCache('stock', stock);
  await upsertCache('bom', bom);
  await upsertCache('invoices', invoices);
  await upsertCache('salesOrders', salesOrders);

  return NextResponse.json({
    status: 'synced',
    counts: {
      products: products.length,
      stock: stock.length,
      bom: bom.length,
      invoices: invoices.length,
      salesOrders: salesOrders.length,
    }
  });
}
```

#### 2.3 Stock Analysis (`/api/ordering/stock-analysis`)

**Algorithm from FYIC portal:**

```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') || moment().subtract(30, 'day').format('YYYY-MM-DD');
  const to = searchParams.get('to') || moment().format('YYYY-MM-DD');
  const productGroup = searchParams.get('product_group');

  // Load cached data
  const products = await getCache('products');
  const stock = await getCache('stock');
  const invoices = await getCache('invoices');
  const overrides = await getProductOverrides();

  // Filter invoices by date range
  const days = moment(to).diff(moment(from), 'day');
  const filteredInvoices = invoices.filter(inv => {
    const invDate = parseUnleashedDate(inv.InvoiceDate);
    return moment(invDate).isBetween(from, to, 'day', '[]');
  });

  // Calculate metrics per product
  const data = products.map(product => {
    const productStock = stock.find(s => s.ProductGuid === product.Guid);
    const override = overrides[product.ProductCode];

    // Sum invoice quantities for this product
    const totalSold = filteredInvoices.reduce((sum, inv) => {
      const lines = inv.InvoiceLines.filter(l => l.Product.Guid === product.Guid);
      return sum + lines.reduce((s, l) => s + (l.InvoiceQuantity || 0), 0);
    }, 0);

    const availableQty = productStock?.AvailableQty || 0;
    const requiredUnits = Math.max(0, totalSold - availableQty);
    const nextDays = totalSold > 0 ? Math.floor(days * (availableQty / totalSold)) : 999;

    return {
      ProductCode: product.ProductCode,
      ProductDescription: product.ProductDescription,
      ProductGroup: override?.product_group_override || product.ProductGroup?.GroupName,
      QtyOnHand: productStock?.QtyOnHand || 0,
      AllocatedQty: productStock?.AllocatedQty || 0,
      AvailableQty: availableQty,
      OnPurchase: productStock?.OnPurchase || 0,
      TotalSold: totalSold,
      RequiredUnits: requiredUnits,
      NextDays: nextDays,
      UnitOfMeasure: product.UnitOfMeasure?.Name || '',
    };
  });

  // Filter by product group if specified
  return NextResponse.json({ data: filterByProductGroup(data, productGroup), days });
}
```

#### 2.4 Bill of Materials Analysis (`/api/ordering/bom`)

**Key algorithm - BOM explosion with time slots:**

```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const futureFrom = searchParams.get('future_from');
  const futureTo = searchParams.get('future_to');

  const days = moment(to).diff(moment(from), 'day');
  const futureDays = moment(futureTo).diff(moment(futureFrom), 'day');
  const slots = Math.round(days / 30); // 30-day periods

  // Generate slot dates for trend analysis
  const slotDates = Array.from({ length: slots }, (_, i) => ({
    from: moment(from).add(i * 30, 'day').format('YYYY-MM-DD'),
    to: moment(from).add((i + 1) * 30, 'day').format('YYYY-MM-DD'),
  }));

  // For each slot, calculate sales
  const slotData = await Promise.all(
    slotDates.map(slot => calculateBOMAnalysis(slot.from, slot.to))
  );

  // Merge with trend analysis
  const data = baseData.map(item => {
    const slotsSaleUnit = slotData.map(slot => {
      const match = slot.find(s =>
        s.BillNumber === item.BillNumber && s.ProductCode === item.ProductCode
      );
      return match?.TotalInvoiceQuantity || 0;
    });

    const lowMonthlySales = Math.min(...slotsSaleUnit);
    const avgMonthlySales = Math.round(slotsSaleUnit.reduce((a, b) => a + b, 0) / slots);
    const highMonthlySales = Math.max(...slotsSaleUnit);

    return {
      ...item,
      slotsSaleUnit,
      futureDays,
      LowMonthlySales: lowMonthlySales,
      AverageMonthlySales: avgMonthlySales,
      HighMonthlySales: highMonthlySales,
    };
  });

  return NextResponse.json({ data, slotDates, slots, days });
}
```

#### 2.5 Stock Needs (`/api/ordering/stock-needs`)

**Key algorithm - Estimated usage calculation:**

```typescript
// EstimatedUsage = ((High - Average) / 2 + Average) × (futureDays / 30)
const estimatedUsage = ((highMonthlySales - avgMonthlySales) / 2 + avgMonthlySales) * (futureDays / 30);

// Filter to only Raw Materials, Packaging Materials, and Blends
const filteredData = data.filter(item =>
  ['Raw Materials', 'Packaging Materials', 'Blend'].includes(
    item.ProductGroup_edited || item.ProductGroup
  )
);
```

---

### Phase 3: Dashboard UI (Day 2)

#### 3.1 Add Navigation Item

**File:** `dashboard/src/lib/business-config.ts`

```typescript
// Add to teelixir navigation array:
{ name: 'Ordering', href: '/ordering', icon: ClipboardList },
```

Import required:
```typescript
import { ClipboardList } from 'lucide-react'
```

#### 3.2 Create Page Structure

```
dashboard/src/app/(dashboard)/teelixir/ordering/
├── page.tsx              # Main ordering dashboard (tabs)
├── stock-analysis/
│   └── page.tsx          # Stock analysis view
├── stock-on-hand/
│   └── page.tsx          # Stock on hand view
├── bom/
│   └── page.tsx          # Bill of materials view
└── stock-needs/
    └── page.tsx          # Stock needs view
```

#### 3.3 Main Ordering Page with Tabs

```tsx
'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StockAnalysis from './components/StockAnalysis';
import StockOnHand from './components/StockOnHand';
import BillOfMaterials from './components/BillOfMaterials';
import StockNeeds from './components/StockNeeds';

export default function OrderingDashboard() {
  const [activeTab, setActiveTab] = useState('stock-analysis');

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Ordering Dashboard</h1>
          <p className="text-gray-400 mt-1">
            Production planning and inventory forecasting
          </p>
        </div>
        <SyncButton />
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="stock-analysis">Stock Analysis</TabsTrigger>
          <TabsTrigger value="stock-on-hand">Stock On Hand</TabsTrigger>
          <TabsTrigger value="bom">Bill of Materials</TabsTrigger>
          <TabsTrigger value="stock-needs">Stock Needs</TabsTrigger>
        </TabsList>

        <TabsContent value="stock-analysis">
          <StockAnalysis />
        </TabsContent>
        <TabsContent value="stock-on-hand">
          <StockOnHand />
        </TabsContent>
        <TabsContent value="bom">
          <BillOfMaterials />
        </TabsContent>
        <TabsContent value="stock-needs">
          <StockNeeds />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

#### 3.4 Key UI Components

**Date Range Selector:**
```tsx
<div className="flex items-center gap-4">
  <Select value={days} onValueChange={setDays}>
    <SelectTrigger className="w-32">
      <SelectValue placeholder="Select days" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="30">30 days</SelectItem>
      <SelectItem value="60">60 days</SelectItem>
      <SelectItem value="90">90 days</SelectItem>
      <SelectItem value="120">120 days</SelectItem>
      <SelectItem value="180">180 days</SelectItem>
      <SelectItem value="custom">Custom</SelectItem>
    </SelectContent>
  </Select>

  {days === 'custom' && (
    <>
      <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
      <input type="date" value={to} onChange={e => setTo(e.target.value)} />
    </>
  )}
</div>
```

**Product Group Filter:**
```tsx
<Select value={productGroup} onValueChange={setProductGroup}>
  <SelectTrigger className="w-48">
    <SelectValue placeholder="All Groups" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="">All</SelectItem>
    <SelectItem value="Raw Materials">Raw Materials</SelectItem>
    <SelectItem value="Packaging Materials">Packaging Materials</SelectItem>
    <SelectItem value="Obsolete">Obsolete</SelectItem>
    <SelectItem value="Blend">Blend</SelectItem>
    <SelectItem value="evr-else">Everything Else</SelectItem>
  </SelectContent>
</Select>
```

**Data Table with Sorting:**
```tsx
<DataTable
  columns={[
    { accessorKey: 'ProductCode', header: 'Product Code' },
    { accessorKey: 'ProductDescription', header: 'Product Name' },
    { accessorKey: 'QtyOnHand', header: 'Stock On Hand' },
    { accessorKey: 'AllocatedQty', header: 'Allocated' },
    { accessorKey: 'AvailableQty', header: 'Available' },
    { accessorKey: 'OnPurchase', header: 'On Purchase' },
    { accessorKey: 'TotalSold', header: 'Total Sold' },
    {
      accessorKey: 'RequiredUnits',
      header: 'Required',
      cell: ({ row }) => {
        const val = row.getValue('RequiredUnits');
        return <span className={val > 0 ? 'text-red-400' : ''}>{val}</span>;
      }
    },
    { accessorKey: 'NextDays', header: 'Days Left' },
  ]}
  data={data}
/>
```

---

### Phase 4: Unleashed Integration Service (Day 2)

#### 4.1 Create Unleashed Service

**File:** `dashboard/src/lib/unleashed/client.ts`

```typescript
import crypto from 'crypto';

const UNLEASHED_API_URL = 'https://api.unleashedsoftware.com';

export class UnleashedOrderingClient {
  private apiId: string;
  private apiKey: string;

  constructor() {
    this.apiId = process.env.UNLEASHED_TEELIXIR_API_ID!;
    this.apiKey = process.env.UNLEASHED_TEELIXIR_API_KEY!;
  }

  private generateSignature(queryString: string = ''): string {
    const hmac = crypto.createHmac('sha256', this.apiKey);
    hmac.update(queryString);
    return hmac.digest('base64');
  }

  private async request<T>(endpoint: string, queryString: string = ''): Promise<T> {
    const url = queryString
      ? `${UNLEASHED_API_URL}${endpoint}?${queryString}`
      : `${UNLEASHED_API_URL}${endpoint}`;

    const response = await fetch(url, {
      headers: {
        'api-auth-id': this.apiId,
        'api-auth-signature': this.generateSignature(queryString),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Unleashed API error: ${response.status}`);
    }

    return response.json();
  }

  async fetchAllProducts(): Promise<any[]> {
    return this.fetchAllPages('/Products/Page');
  }

  async fetchAllStockOnHand(): Promise<any[]> {
    return this.fetchAllPages('/StockOnHand/Page');
  }

  async fetchAllBillOfMaterials(): Promise<any[]> {
    return this.fetchAllPages('/BillOfMaterials/Page');
  }

  async fetchAllInvoices(): Promise<any[]> {
    return this.fetchAllPages('/Invoices/Page');
  }

  async fetchAllSalesOrders(): Promise<any[]> {
    return this.fetchAllPages('/SalesOrders/Page');
  }

  private async fetchAllPages(endpoint: string): Promise<any[]> {
    const allItems: any[] = [];
    let page = 1;

    while (true) {
      const response = await this.request<{
        Items: any[];
        Pagination: { NumberOfPages: number };
      }>(`${endpoint}/${page}`);

      allItems.push(...response.Items);

      if (page >= response.Pagination.NumberOfPages) break;
      page++;

      // Rate limiting - 200ms between requests
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return allItems;
  }
}
```

#### 4.2 Date Parsing Helper

```typescript
// Unleashed uses /Date(timestamp)/ format
export function parseUnleashedDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const match = dateStr.match(/\/Date\((\d+)\)\//);
  if (match) {
    return new Date(parseInt(match[1]));
  }
  return new Date(dateStr);
}
```

---

### Phase 5: Testing & Validation (Day 3)

#### 5.1 Test Checklist

- [ ] Unleashed API connection works
- [ ] Data sync populates cache correctly
- [ ] Stock Analysis calculations match original
- [ ] BOM explosion handles multi-level correctly
- [ ] Stock Needs estimated usage calculation correct
- [ ] Date range filtering works
- [ ] Product group filtering works
- [ ] Product group override saves correctly
- [ ] Revised cost editing works
- [ ] UI responsive and loads quickly

#### 5.2 Validation Queries

```sql
-- Verify cache data
SELECT cache_key, jsonb_array_length(data) as count, fetched_at
FROM tlx_ordering_cache;

-- Verify product overrides
SELECT * FROM tlx_ordering_products LIMIT 10;
```

---

## File Summary

| File | Purpose |
|------|---------|
| `infra/supabase/migrations/20251205_tlx_ordering_dashboard.sql` | Database schema |
| `dashboard/src/lib/unleashed/client.ts` | Unleashed API client |
| `dashboard/src/app/api/ordering/sync/route.ts` | Data sync endpoint |
| `dashboard/src/app/api/ordering/stock-analysis/route.ts` | Stock analysis API |
| `dashboard/src/app/api/ordering/stock-on-hand/route.ts` | Stock on hand API |
| `dashboard/src/app/api/ordering/bom/route.ts` | Bill of materials API |
| `dashboard/src/app/api/ordering/stock-needs/route.ts` | Stock needs API |
| `dashboard/src/app/api/ordering/update-product/route.ts` | Update product API |
| `dashboard/src/app/(dashboard)/teelixir/ordering/page.tsx` | Main UI page |
| `dashboard/src/app/(dashboard)/teelixir/ordering/components/*.tsx` | UI components |
| `dashboard/src/lib/business-config.ts` | Add nav item |

---

## Environment Variables Required

```env
UNLEASHED_TEELIXIR_API_ID=7fda9404-7197-477b-89b1-dadbcefae168
UNLEASHED_TEELIXIR_API_KEY=a65AOqESdYl9GHyhqohaoYPGWsugYa2V1xi90zRn4pW4LzjCcgF3JUB3Z8YI4PNq5duUphxQ8zGOCwNKexDQ==
```

---

## Key Algorithms Reference

### 1. Required Units
```
RequiredUnits = max(0, TotalSold - AvailableQty)
```

### 2. Days Until Stockout
```
NextDays = floor(AnalysisDays × (AvailableQty / TotalSold))
```

### 3. Estimated Usage (Stock Needs)
```
EstimatedUsage = ((HighMonthlySales - AvgMonthlySales) / 2 + AvgMonthlySales) × (FutureDays / 30)
```

### 4. BOM Component Usage
```
ComponentUsage = ParentProductSales × BOMQuantity
```

### 5. Monthly Sales Analysis (30-day slots)
```
slots = round(TotalDays / 30)
LowMonthlySales = min(slot1Sales, slot2Sales, ...)
AvgMonthlySales = sum(allSlotSales) / numberOfSlots
HighMonthlySales = max(slot1Sales, slot2Sales, ...)
```

---

## Product Groups

| Group | Description |
|-------|-------------|
| Raw Materials | Ingredients used in production |
| Packaging Materials | Bottles, labels, boxes, etc. |
| Blend | Intermediate blended products |
| Obsolete | Discontinued items |
| Everything Else | Finished goods for sale |

---

## Next Steps After Implementation

1. **Automated Sync** - Add n8n workflow to refresh Unleashed data daily
2. **Alerts** - Notify when stock falls below reorder point
3. **Export** - Add CSV export for ordering lists
4. **Purchase Orders** - Integration to create POs in Unleashed

---

---

## Phase 2: Unleashed Replacement (Future)

After the ordering dashboard is operational, expand to full inventory management:

### Supplier Management
- Supplier profiles with MOQs, lead times, order frequency
- Contact details, payment terms
- Performance tracking

### Predictive Ordering
- Auto-calculate reorder points based on sales velocity + lead time
- Safety stock calculations
- Seasonal demand adjustments

### Purchase Orders
- Generate POs grouped by supplier to meet minimums
- Track PO status: Draft → Sent → Acknowledged → Shipped → Received
- Supplier reference numbers

### Receiving Workflow
- Mark items received against POs
- Partial receiving support
- Discrepancy handling

### Full Inventory (Unleashed Replacement)
- Stock levels by location
- Stock adjustments
- Stock transfers
- Full audit trail

### Proposed Navigation Structure

```
Ordering (Left Nav)
├── Dashboard           ← Overview/summary
├── Stock Analysis      ← What's selling, what's low
├── Stock Needs         ← What to order (raw materials/packaging)
├── Bill of Materials   ← Recipe/production planning
├── ─────────────────
├── Suppliers           ← Supplier profiles, MOQs, lead times
├── Purchase Orders     ← Create/track POs
├── Receiving           ← Mark stock received
└── Inventory           ← Full stock management (replaces Unleashed)
```

### Reference: BOO Operations Hub Plan
See `buy-organics-online/BOO-OPERATIONS-HUB-PLAN.md` for the broader vision including:
- Customer service module
- Shipping module
- LiveChat integration

---

**Document Created:** 2024-12-04
**Based On:** FYIC Portal extraction from `C:\Users\jayso\fyic-portal`
