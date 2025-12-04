# Accounting Dashboard Automation Plan

**Created**: 2025-12-04
**Status**: Planning
**Target Businesses**: Buy Organics Online (BOO), Red Hill Fresh (RHF)
**Proof of Concept**: Start with BOO, then RHF

---

## Executive Summary

This plan outlines the implementation of an **Accounting** tab on the master dashboard (ops.growthcohq.com) to automate bookkeeping processes across all 4 businesses. The goal is to:

1. Create a centralized accounting view in the dashboard
2. Automate transaction categorization and reconciliation
3. Leverage ATO rulings for tax compliance
4. Generate BAS-ready reports
5. Integrate with accounting software (Xero/MYOB)

**Success Criteria**: One business (BOO or RHF) fully automated within the proof of concept phase.

---

## Current State Assessment

### What We Have

| Asset | Location | Status |
|-------|----------|--------|
| **Dashboard** | ops.growthcohq.com | Running on DO App Platform |
| **Finance Tab** | `/home/finance` | Teelixir + Elevate P&L only |
| **ATO Rulings Schema** | teelixir-leads Supabase | Schema ready, sync script ready |
| **BOO Orders** | `bc_orders` table | Syncing from BigCommerce |
| **RHF Orders** | `wc_orders`, `wc_order_line_items` | Syncing from WooCommerce |
| **Xero Integration** | Teelixir + Elevate only | Full schema + scripts ready |

### What We Need

| Need | Priority | Notes |
|------|----------|-------|
| Accounting tab in dashboard | HIGH | New section for all businesses |
| BOO accounting software connection | HIGH | Likely Xero or MYOB - TBD |
| RHF accounting software connection | MEDIUM | Likely Xero or MYOB - TBD |
| Transaction categorization engine | HIGH | Map orders to chart of accounts |
| Bank feed reconciliation | MEDIUM | Match bank transactions to orders |
| GST calculation & reporting | HIGH | BAS preparation |
| ATO rulings integration | LOW | Tax compliance reference |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ACCOUNTING DASHBOARD                              │
│                     (ops.growthcohq.com/accounting)                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Overview   │  │ Transactions │  │     BAS      │  │  ATO Rules   │ │
│  │  (Dashboard) │  │   & Recon    │  │   Reports    │  │  Reference   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                            DATA LAYER                                    │
├───────────────────┬───────────────────┬─────────────────────────────────┤
│                   │                   │                                  │
│  E-COMMERCE       │  ACCOUNTING       │  TAX COMPLIANCE                  │
│  ────────────     │  ──────────       │  ──────────────                  │
│  • bc_orders      │  • Xero/MYOB API  │  • ato_rulings                  │
│  • wc_orders      │  • Bank feeds     │  • ato_ruling_topics            │
│  • Payment data   │  • Chart of accts │  • GST calculations             │
│                   │                   │                                  │
└───────────────────┴───────────────────┴─────────────────────────────────┘
```

---

## Accounting Tab Structure

The new Accounting section will be accessible from the **Home** business (global view) with sub-tabs:

### Tab 1: Overview Dashboard
- Revenue summary by business (daily/weekly/monthly)
- Outstanding invoices count and value
- Bank account balances (if connected)
- GST liability estimate (running total)
- Upcoming BAS lodgement deadlines

### Tab 2: Transactions
- All e-commerce transactions (orders, refunds)
- Bank feed transactions (if connected)
- Categorization status (auto/manual/pending)
- Reconciliation status
- Filters by business, date range, status

### Tab 3: BAS Preparation
- GST collected (from sales)
- GST credits (from expenses)
- Net GST position
- PAYG withholding summary
- PAYG instalment calculation
- Export to accounting software

### Tab 4: ATO Rules Reference
- Searchable ATO rulings database
- Rulings marked as relevant to our businesses
- Quick reference for common scenarios
- Links to full ATO source documents

### Tab 5: Reports
- Profit & Loss by business
- Balance Sheet snapshots
- Cash flow statements
- Bank reconciliation reports
- GST audit trail

---

## Phase 1: Foundation (Day 1)

### 1.1 Discovery Tasks

**ACTION REQUIRED**: Before implementing, we need to confirm:

```
□ What accounting software does BOO use?
   - Options: Xero, MYOB, QuickBooks, Manual spreadsheets
   - If Xero: We can reuse existing Xero integration code
   - If MYOB: Need to build new connector

□ What accounting software does RHF use?
   - Same options as above

□ Does BOO have a dedicated bookkeeper?
   - If yes: What's their workflow?
   - If no: Full automation is higher priority

□ Current BAS lodgement process?
   - Who prepares it?
   - What data sources are used?
   - What manual steps exist?
```

### 1.2 Add Accounting Navigation

**File**: `dashboard/src/lib/business-config.ts`

Add to `home` navigation:
```typescript
{ name: 'Accounting', href: '/accounting', icon: Calculator }
```

### 1.3 Create Accounting Page Structure

**Files to create**:
```
dashboard/src/app/(dashboard)/home/accounting/
├── page.tsx                    # Main accounting page with tabs
├── overview/
│   └── page.tsx                # Overview dashboard
├── transactions/
│   └── page.tsx                # Transaction list and reconciliation
├── bas/
│   └── page.tsx                # BAS preparation
├── rules/
│   └── page.tsx                # ATO rulings reference
└── reports/
    └── page.tsx                # Financial reports
```

### 1.4 Create Accounting Components

**Files to create**:
```
dashboard/src/components/accounting/
├── AccountingTabs.tsx          # Tab navigation
├── TransactionList.tsx         # Transaction table with filters
├── ReconciliationCard.tsx      # Single transaction reconciliation
├── GSTSummary.tsx              # GST collected/paid summary
├── BASPreview.tsx              # BAS form preview
├── ATORulingCard.tsx           # Single ruling display
├── ATORulingsSearch.tsx        # Rulings search interface
└── BusinessAccountingCard.tsx  # Per-business summary card
```

---

## Phase 2: Data Integration (Day 1-2)

### 2.1 Create Accounting API Routes

**Files to create**:
```
dashboard/src/app/api/accounting/
├── overview/route.ts           # Dashboard summary data
├── transactions/route.ts       # Transaction list + filters
├── transactions/[id]/route.ts  # Single transaction details
├── reconcile/route.ts          # Mark transaction reconciled
├── gst/route.ts                # GST calculations
├── bas/route.ts                # BAS report data
├── ato-rulings/route.ts        # ATO rulings search
└── reports/route.ts            # Financial report generation
```

### 2.2 Create Accounting Database Schema

**File**: `infra/supabase/migrations/20251204_accounting_schema.sql`

```sql
-- Accounting transactions unified view
CREATE TABLE IF NOT EXISTS accounting_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_key TEXT NOT NULL CHECK (business_key IN ('boo', 'rhf', 'teelixir', 'elevate')),

    -- Source reference
    source_type TEXT NOT NULL CHECK (source_type IN (
        'order',           -- E-commerce order
        'refund',          -- E-commerce refund
        'bank_feed',       -- Bank transaction
        'manual',          -- Manual entry
        'expense'          -- Expense/bill
    )),
    source_id TEXT,                          -- External ID (order_id, bank_txn_id)
    source_table TEXT,                       -- Source table name

    -- Transaction details
    transaction_date DATE NOT NULL,
    description TEXT,

    -- Amounts (all in AUD)
    gross_amount DECIMAL(10,2) NOT NULL,     -- Total including GST
    net_amount DECIMAL(10,2) NOT NULL,       -- Amount excluding GST
    gst_amount DECIMAL(10,2) NOT NULL,       -- GST component

    -- Categorization
    category_code TEXT,                      -- Chart of accounts code
    category_name TEXT,                      -- Human-readable category
    gst_type TEXT CHECK (gst_type IN (
        'GST',             -- Standard GST (10%)
        'GST_FREE',        -- GST-free supplies
        'INPUT_TAXED',     -- Input taxed (no GST credits)
        'EXPORT',          -- GST-free export
        'CAP',             -- Capital purchase
        'N/A'              -- Not applicable
    )),

    -- Reconciliation
    reconciliation_status TEXT DEFAULT 'pending' CHECK (reconciliation_status IN (
        'pending',         -- Not yet reconciled
        'auto_matched',    -- Automatically matched
        'manually_matched',-- User confirmed match
        'unmatched',       -- No match found
        'excluded'         -- Excluded from reconciliation
    )),
    reconciled_at TIMESTAMPTZ,
    reconciled_by TEXT,
    matched_transaction_id UUID,             -- Link to matched bank/order

    -- Accounting software sync
    accounting_software TEXT,                -- 'xero', 'myob', null
    external_id TEXT,                        -- ID in accounting software
    synced_at TIMESTAMPTZ,
    sync_error TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Category mapping rules
CREATE TABLE IF NOT EXISTS accounting_category_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_key TEXT NOT NULL,

    -- Matching criteria
    source_type TEXT,                        -- Match on source type
    description_pattern TEXT,                -- Regex pattern for description
    amount_min DECIMAL(10,2),
    amount_max DECIMAL(10,2),

    -- Target categorization
    category_code TEXT NOT NULL,
    category_name TEXT NOT NULL,
    gst_type TEXT NOT NULL,

    -- Rule metadata
    priority INTEGER DEFAULT 0,              -- Higher = checked first
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BAS tracking
CREATE TABLE IF NOT EXISTS bas_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_key TEXT NOT NULL,

    -- Period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_type TEXT CHECK (period_type IN ('monthly', 'quarterly')),

    -- GST amounts
    gst_collected DECIMAL(10,2) DEFAULT 0,   -- 1A: GST on sales
    gst_credits DECIMAL(10,2) DEFAULT 0,     -- 1B: GST on purchases
    net_gst DECIMAL(10,2) DEFAULT 0,         -- 1A - 1B

    -- PAYG
    payg_withheld DECIMAL(10,2) DEFAULT 0,   -- 4: PAYG withheld from wages
    payg_instalment DECIMAL(10,2) DEFAULT 0, -- 5: PAYG instalment

    -- Status
    status TEXT DEFAULT 'draft' CHECK (status IN (
        'draft',           -- Still calculating
        'ready',           -- Ready for review
        'submitted',       -- Lodged with ATO
        'paid'             -- Payment made
    )),

    -- Dates
    due_date DATE,
    lodged_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(business_key, period_start, period_end)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_acct_txns_business ON accounting_transactions(business_key);
CREATE INDEX IF NOT EXISTS idx_acct_txns_date ON accounting_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_acct_txns_status ON accounting_transactions(reconciliation_status);
CREATE INDEX IF NOT EXISTS idx_acct_txns_source ON accounting_transactions(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_acct_rules_business ON accounting_category_rules(business_key, is_active);
CREATE INDEX IF NOT EXISTS idx_bas_business_period ON bas_periods(business_key, period_start);
```

### 2.3 Create Transaction Sync Script

**File**: `scripts/accounting/sync-orders-to-accounting.ts`

This script will:
1. Read orders from `bc_orders` (BOO) or `wc_orders` (RHF)
2. Transform to `accounting_transactions` format
3. Auto-categorize using `accounting_category_rules`
4. Calculate GST amounts
5. Insert/update in unified accounting table

---

## Phase 3: BOO Implementation (Day 2-3)

### 3.1 Connect BOO Accounting Software

**If BOO uses Xero**:
- Reuse existing Xero client from `shared/libs/integrations/xero/`
- Get BOO's Xero tenant ID and OAuth credentials
- Add to `xero_organizations` table
- Sync chart of accounts to `accounts` table

**If BOO uses MYOB**:
- Create new MYOB integration in `shared/libs/integrations/myob/`
- MYOB uses OAuth 2.0 similar to Xero
- Create equivalent schema for MYOB data

### 3.2 Map BOO Transaction Categories

Create default category mappings for BOO:

| Description Pattern | Category Code | Category Name | GST Type |
|---------------------|---------------|---------------|----------|
| `Order #*` | 200 | Sales Revenue | GST |
| `Refund #*` | 200 | Sales Revenue | GST |
| `Shipping*` | 210 | Shipping Revenue | GST |
| `PayPal*` | 460 | Payment Processing Fees | GST |
| `Stripe*` | 460 | Payment Processing Fees | GST |

### 3.3 GST Calculation Logic

BOO-specific GST handling:
```typescript
function calculateGST(order: BCOrder): GSTCalculation {
  // Most BOO products are GST-free (organic food)
  // Some products may be GST-applicable (non-food items)

  const gstFreeCategories = [
    'Food', 'Beverages', 'Organic', 'Health Foods'
  ];

  const gstApplicableCategories = [
    'Beauty', 'Supplements', 'Vitamins'
  ];

  // Calculate GST per line item based on category
  // Return breakdown for BAS reporting
}
```

### 3.4 Bank Feed Integration (Optional)

If BOO connects bank feeds:
1. Use Xero/MYOB bank feed feature
2. Pull transactions via API
3. Auto-match to orders by amount + date
4. Show unmatched for manual reconciliation

---

## Phase 4: ATO Rulings Integration (Day 3)

### 4.1 Seed ATO Rulings Data

Run the existing sync script:
```bash
npx tsx infra/scripts/sync-ato-rulings.ts --verbose
```

### 4.2 Mark Relevant Rulings

Create script to flag rulings relevant to our businesses:
- GST on food products (BOO)
- GST on supplements (Teelixir)
- Small business CGT concessions
- Home office deductions (if applicable)
- Trading stock valuation

### 4.3 Build Rulings Search UI

Dashboard component that:
- Searches rulings by keyword
- Filters by topic (gst, deductions, etc.)
- Shows relevance status
- Links to full ATO source

---

## Phase 5: Dashboard UI Implementation (Day 3-4)

### 5.1 Overview Dashboard

Components:
```typescript
// Revenue cards for each business
<BusinessAccountingCard business="boo" />
<BusinessAccountingCard business="rhf" />
<BusinessAccountingCard business="teelixir" />
<BusinessAccountingCard business="elevate" />

// GST summary
<GSTSummary period="current-quarter" />

// Upcoming deadlines
<BASDeadlines />

// Recent transactions needing attention
<TransactionAlerts />
```

### 5.2 Transactions Page

Features:
- Table with all transactions
- Filters: business, date range, status, category
- Quick categorization buttons
- Bulk reconciliation
- Export to CSV/Excel

### 5.3 BAS Preparation Page

Features:
- Select period (month/quarter)
- Auto-calculate GST from transactions
- Show calculation breakdown
- Generate BAS preview
- Export for lodgement

---

## Phase 6: Automation & Scheduling (Day 4-5)

### 6.1 Create n8n Workflows

**Workflow 1: Daily Transaction Sync**
- Trigger: Daily at 6 AM AEST
- Actions:
  1. Sync BOO orders from last 7 days
  2. Sync RHF orders from last 7 days
  3. Transform to accounting transactions
  4. Auto-categorize using rules
  5. Log sync results

**Workflow 2: Bank Reconciliation Alert**
- Trigger: Daily at 9 AM AEST
- Actions:
  1. Check for unmatched transactions > 3 days old
  2. Send summary email if any found

**Workflow 3: BAS Reminder**
- Trigger: 7 days before BAS due date
- Actions:
  1. Calculate current GST position
  2. Send reminder with summary

### 6.2 Create Cron Job Scripts

**File**: `scripts/accounting/daily-sync.ts`
```bash
# Run daily at 6 AM AEST
0 6 * * * npx tsx /path/to/scripts/accounting/daily-sync.ts
```

---

## Implementation Checklist

### Day 1: Foundation
- [ ] Confirm BOO accounting software (Xero/MYOB/other)
- [ ] Confirm RHF accounting software
- [ ] Add Accounting to navigation in `business-config.ts`
- [ ] Create accounting page structure
- [ ] Create accounting database schema
- [ ] Run schema migration

### Day 2: Data Layer
- [ ] Create API routes for accounting
- [ ] Create transaction sync script for BOO
- [ ] Test transaction sync with sample data
- [ ] Create category mapping rules for BOO
- [ ] Verify GST calculations

### Day 3: UI Implementation
- [ ] Build AccountingTabs component
- [ ] Build Overview dashboard
- [ ] Build Transactions page
- [ ] Build ATO Rulings search
- [ ] Test on staging

### Day 4: BAS & Reports
- [ ] Build BAS Preparation page
- [ ] Create GST calculation logic
- [ ] Build report generation
- [ ] Test BAS calculations with real data

### Day 5: Automation
- [ ] Create n8n workflow for daily sync
- [ ] Create reminder workflows
- [ ] Test full flow end-to-end
- [ ] Deploy to production
- [ ] Document for ongoing use

---

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Wrong GST classification | HIGH | Manual review of category rules, audit trail |
| Missing transactions | MEDIUM | Daily sync with 7-day lookback, alerts for gaps |
| Accounting software not connected | MEDIUM | Manual CSV export as fallback |
| ATO rulings outdated | LOW | Weekly RSS sync, manual review flag |

---

## Dependencies

1. **Accounting Software Access**
   - BOO: Xero/MYOB API credentials
   - RHF: Xero/MYOB API credentials (if different)

2. **Database Access**
   - Supabase teelixir-leads (for ATO rulings)
   - Supabase BOO (for order data)
   - New accounting schema deployment

3. **Dashboard Deployment**
   - DigitalOcean App Platform access
   - Environment variables for new API connections

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Transaction sync rate | >99% | Daily sync log success rate |
| Auto-categorization rate | >80% | % transactions auto-categorized |
| Reconciliation time | <5 mins/day | Time spent on manual matching |
| BAS preparation time | <30 mins | From start to ready-to-lodge |
| GST accuracy | 100% | Audit comparison with manual calc |

---

## Future Enhancements (After POC)

1. **Expand to All Businesses**
   - Add Teelixir (already has Xero)
   - Add Elevate (already has Xero)
   - Unified multi-entity view

2. **Advanced Features**
   - Predictive cash flow
   - Expense approval workflow
   - Invoice generation
   - Payroll integration

3. **AI Assistance**
   - Smart categorization using ML
   - Anomaly detection
   - ATO ruling recommendations based on transaction patterns

---

## Quick Start Guide (Tomorrow)

### Step 1: Confirm Accounting Software
Ask: "What accounting software does BOO use? Xero, MYOB, or something else?"

### Step 2: Run These Commands
```bash
# 1. Create the database schema
cd /home/user/master-ops
npx tsx infra/scripts/run-migration.ts infra/supabase/migrations/20251204_accounting_schema.sql

# 2. Sync ATO rulings
npx tsx infra/scripts/sync-ato-rulings.ts --verbose

# 3. Add navigation (edit business-config.ts)
# Add: { name: 'Accounting', href: '/accounting', icon: Calculator }

# 4. Create the page structure
mkdir -p dashboard/src/app/\(dashboard\)/home/accounting

# 5. Deploy dashboard
doctl apps create-deployment 1a0eed70-aef6-415e-953f-d2b7f0c7c832 --force-rebuild
```

### Step 3: Build First Page
Create `dashboard/src/app/(dashboard)/home/accounting/page.tsx` with overview dashboard.

### Step 4: Connect Data
Create API route to fetch from `bc_orders` and display in dashboard.

---

**Last Updated**: 2025-12-04
**Author**: Claude Code
**Next Review**: After POC completion
