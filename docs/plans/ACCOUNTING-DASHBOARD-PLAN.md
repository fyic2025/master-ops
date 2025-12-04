# Bookkeeping Automation Plan

**Created**: 2025-12-04
**Updated**: 2025-12-04
**Status**: Ready to Implement
**Target Businesses**: All 4 (BOO, RHF, Teelixir, Elevate)
**Proof of Concept**: Start with BOO, then RHF

---

## Executive Summary

This plan outlines **full bookkeeping automation** to replace manual staff tasks across all 4 businesses. This is NOT just a dashboard - it's an **activity-based automation system** that handles:

1. **Bank Reconciliation** - Auto-match bank transactions to invoices/orders
2. **Accounts Receivable (AR)** - Automated debt collection and payment follow-up
3. **Accounts Payable (AP)** - Receive invoices, create Xero transactions, attach documents
4. **Document Management** - Attach invoices/receipts to Xero transactions automatically
5. **BAS Preparation** - Automated GST calculations and reporting

**Goal**: Strip staff costs by automating day-to-day bookkeeping activities.

**Success Criteria**: BOO bookkeeping fully automated with minimal human intervention.

**KEY ADVANTAGE**: All 4 businesses use Xero, and we have a complete Xero integration ready!

---

## Current State Assessment

### What We Have (READY TO USE)

| Asset | Location | Status |
|-------|----------|--------|
| **Dashboard** | ops.growthcohq.com | Running on DO App Platform |
| **Finance Tab** | `/home/finance` | Teelixir + Elevate P&L only |
| **Xero Client** | `shared/libs/integrations/xero/client.ts` | **COMPLETE** - Multi-tenant OAuth, rate limiting, all endpoints |
| **Xero Schema** | `infra/supabase/schema-financials.sql` | **COMPLETE** - Accounts, journals, mappings, reports |
| **ATO Rulings Schema** | teelixir-leads Supabase | Schema ready, sync script ready |
| **BOO Orders** | `bc_orders` table | Syncing from BigCommerce |
| **RHF Orders** | `wc_orders`, `wc_order_line_items` | Syncing from WooCommerce |

### What We Need to Add

| Need | Priority | Notes |
|------|----------|-------|
| BOO Xero tenant credentials | HIGH | Get OAuth tokens for BOO's Xero org |
| RHF Xero tenant credentials | HIGH | Get OAuth tokens for RHF's Xero org |
| Add BOO/RHF to `xero_organizations` table | HIGH | Extend existing schema |
| Accounting tab in dashboard | HIGH | New section for all businesses |
| Transaction categorization engine | MEDIUM | Map orders to chart of accounts |
| GST calculation & reporting | MEDIUM | BAS preparation |
| ATO rulings integration | LOW | Tax compliance reference |

---

## Architecture Overview

### Bookkeeping Automation Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     BOOKKEEPING AUTOMATION SYSTEM                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐          │
│  │ ACCOUNTS PAYABLE│    │ BANK RECON      │    │ ACCOUNTS RECEIV │          │
│  │ (Bills/Expenses)│    │ (Matching)      │    │ (Debt Collection)│          │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘          │
│           │                      │                      │                    │
│           ▼                      ▼                      ▼                    │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐          │
│  │ 1. Receive email│    │ 1. Fetch bank   │    │ 1. Identify     │          │
│  │ 2. Extract data │    │    transactions │    │    overdue      │          │
│  │ 3. Create bill  │    │ 2. Match to     │    │ 2. Send reminders│         │
│  │ 4. Attach PDF   │    │    invoices     │    │ 3. Escalate if  │          │
│  │ 5. Submit Xero  │    │ 3. Auto-reconcile│   │    unpaid       │          │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘          │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                         DATA SOURCES                                         │
├────────────────────┬────────────────────┬───────────────────────────────────┤
│                    │                    │                                    │
│  INCOMING INVOICES │  BANK FEEDS        │  SALES DATA                       │
│  ──────────────────│  ─────────────     │  ──────────                       │
│  • Email inbox     │  • Xero bank feeds │  • bc_orders (BOO)                │
│  • Supplier portal │  • Bank statements │  • wc_orders (RHF)                │
│  • Manual upload   │                    │  • Shopify orders (Teelixir)      │
│                    │                    │                                    │
└────────────────────┴────────────────────┴───────────────────────────────────┘
```

### Dashboard Structure (ops.growthcohq.com/home/accounting)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ACCOUNTING DASHBOARD                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Tab 1: WORK QUEUE         Tab 2: BANK RECON       Tab 3: AR (Debtors)      │
│  ┌─────────────────┐       ┌─────────────────┐     ┌─────────────────┐      │
│  │ Unprocessed     │       │ Unmatched txns  │     │ Overdue invoices│      │
│  │ invoices: 12    │       │ to reconcile: 8 │     │ to follow up: 5 │      │
│  │ [Process Next]  │       │ [Match Now]     │     │ [Send Reminders]│      │
│  └─────────────────┘       └─────────────────┘     └─────────────────┘      │
│                                                                              │
│  Tab 4: AP (Bills)         Tab 5: BAS PREP         Tab 6: ATO RULES         │
│  ┌─────────────────┐       ┌─────────────────┐     ┌─────────────────┐      │
│  │ Bills due this  │       │ GST collected   │     │ Relevant rulings│      │
│  │ week: $12,500   │       │ GST credits     │     │ for compliance  │      │
│  │ [Review Bills]  │       │ Net GST position│     │ [Search Rules]  │      │
│  └─────────────────┘       └─────────────────┘     └─────────────────┘      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Automation Modules

### Module 1: Accounts Payable (AP) - Invoice Processing

**Goal**: Receive supplier invoices via email, extract data, create bills in Xero with attachments.

**Workflow**:
```
Email received → Parse PDF → Extract invoice data → Match supplier → Create Xero bill → Attach PDF
```

**Components**:
1. **Email Monitor** (n8n workflow)
   - Watch dedicated email inbox (e.g., invoices@buyorganicsonline.com.au)
   - Trigger on new email with PDF attachment
   - Forward to processing queue

2. **Invoice Parser** (AI-powered)
   - Extract: Supplier name, ABN, invoice number, date, due date, line items, GST, total
   - Use Claude API or document OCR
   - Store extracted data in Supabase `pending_invoices` table

3. **Supplier Matcher**
   - Match extracted supplier to Xero contacts
   - Create new contact if not found
   - Flag for review if uncertain match

4. **Xero Bill Creator**
   - Create bill in Xero via API (`xeroClient.invoices.create()`)
   - Attach original PDF
   - Auto-categorize based on supplier or keywords

5. **Dashboard Queue**
   - Show pending invoices requiring approval
   - One-click approve or edit
   - Bulk processing option

**Xero API Methods**:
```typescript
// Create a bill (accounts payable)
await xeroClient.invoices.create({
  Type: 'ACCPAY',
  Contact: { ContactID: supplierId },
  Date: invoiceDate,
  DueDate: dueDate,
  LineItems: extractedLineItems,
  Status: 'DRAFT' // or 'SUBMITTED' for auto-approve
})

// Attach PDF to invoice
await xeroClient.attachments.upload(invoiceId, pdfBuffer, 'invoice.pdf')
```

---

### Module 2: Bank Reconciliation

**Goal**: Auto-match bank transactions to invoices and orders.

**Workflow**:
```
Fetch bank feed → Match to invoices/orders → Auto-reconcile matches → Flag unmatched for review
```

**Components**:
1. **Bank Feed Sync** (n8n daily job)
   - Fetch bank transactions from Xero bank feed
   - Store in Supabase `bank_transactions` table
   - Track reconciliation status

2. **Matching Engine**
   - Match by: Amount, date, reference number, contact name
   - Scoring system: Exact match (100%), partial match (50-99%)
   - Confidence threshold for auto-reconcile (e.g., 95%)

3. **Auto-Reconciliation**
   - High-confidence matches reconciled automatically
   - Create reconciliation record in Xero

4. **Manual Review Queue**
   - Dashboard shows unmatched transactions
   - Suggest possible matches
   - One-click reconcile or split

**Xero API Methods**:
```typescript
// Get bank transactions
const transactions = await xeroClient.bankTransactions.list({
  where: 'Status=="AUTHORISED"',
  order: 'Date DESC'
})

// Reconcile a bank transaction to an invoice
// This is done via Xero's bank statement lines API
```

---

### Module 3: Accounts Receivable (AR) - Debt Collection

**Goal**: Automated follow-up on overdue invoices to collect money owed.

**Workflow**:
```
Identify overdue → Send reminder email → Wait → Escalate → Flag for human intervention
```

**Components**:
1. **Overdue Scanner** (n8n daily job)
   - Query Xero for overdue invoices
   - Calculate days overdue
   - Segment by age (7 days, 14 days, 30 days, 60+ days)

2. **Reminder Templates**
   - Friendly reminder (7 days overdue)
   - Firm reminder (14 days overdue)
   - Final notice (30 days overdue)
   - Escalation notice (60+ days)

3. **Email Automation** (Klaviyo or direct SMTP)
   - Send templated emails with invoice details
   - Include payment link
   - Track opens and clicks

4. **Escalation Workflow**
   - 60+ days: Flag for phone call
   - 90+ days: Consider debt collection or write-off
   - Dashboard shows escalation queue

5. **Payment Recording**
   - When payment received, mark invoice paid in Xero
   - Record payment method and date

**Xero API Methods**:
```typescript
// Get overdue invoices
const overdue = await xeroClient.invoices.list({
  where: 'Status=="AUTHORISED" AND DueDate<DateTime(2024,12,01)'
})

// Send reminder (Xero can send emails)
await xeroClient.invoices.email(invoiceId, {
  emailAddress: contact.Email,
  subject: 'Payment Reminder',
  message: 'Your invoice is now 7 days overdue...'
})
```

---

### Module 4: Document Management

**Goal**: Attach source documents to all Xero transactions for audit trail.

**Components**:
1. **Receipt Capture**
   - Email forwarding for receipts
   - Mobile upload via dashboard
   - Supplier portal downloads

2. **Auto-Attachment**
   - Match receipt to expense transaction
   - Attach via Xero API
   - Log attachment status

3. **Audit Trail**
   - Track all attachments
   - Missing attachment alerts
   - Compliance reporting

---

## Dashboard Tab Structure

### Tab 1: Work Queue (Inbox)
- **Unprocessed Invoices**: Bills waiting to be reviewed
- **Suggested Matches**: Bank transactions with probable matches
- **Approval Queue**: Items needing human approval
- **Today's Tasks**: Priority actions

### Tab 2: Bank Reconciliation
- **Unmatched Transactions**: Bank entries without matches
- **Match Suggestions**: AI-suggested matches to review
- **Recent Reconciliations**: Audit log
- **Reconciliation Rate**: % auto-matched

### Tab 3: Accounts Receivable (Debtors)
- **Overdue by Age**: 7/14/30/60+ days buckets
- **Total Outstanding**: Sum owed to us
- **Reminder Status**: Last contact per customer
- **Escalation Queue**: Needs human follow-up

### Tab 4: Accounts Payable (Bills)
- **Bills Due This Week**: Upcoming payments
- **Bills Awaiting Approval**: Draft bills
- **Payment Schedule**: Cash flow forecast
- **Supplier Balances**: What we owe

### Tab 5: BAS Preparation
- GST collected (from sales)
- GST credits (from expenses)
- Net GST position
- PAYG withholding summary
- Export to ATO

### Tab 6: ATO Rules Reference
- Searchable ATO rulings database
- Rulings marked as relevant
- Quick compliance reference

---

## Phase 1: Foundation (Day 1)

### 1.1 Xero OAuth Setup for BOO and RHF

**CONFIRMED**: All 4 businesses use Xero. We can reuse the existing Xero integration.

**Steps to connect BOO and RHF to Xero:**

```bash
# 1. Run the OAuth setup script
npx tsx scripts/financials/setup-xero-auth-direct.ts

# 2. Visit the authorization URL printed by the script
# 3. Log in to Xero with BOO account credentials
# 4. Authorize the app
# 5. Copy the callback URL parameters
# 6. Script will save tokens to Supabase vault

# 7. Repeat for RHF
```

**After OAuth, add to `xero_organizations` table:**

```sql
INSERT INTO xero_organizations (xero_tenant_id, business_key, name, legal_name) VALUES
  ('<boo-tenant-id>', 'boo', 'Buy Organics Online', 'Buy Organics Online Pty Ltd'),
  ('<rhf-tenant-id>', 'rhf', 'Red Hill Fresh', 'Red Hill Fresh Pty Ltd')
ON CONFLICT (business_key) DO UPDATE SET
  xero_tenant_id = EXCLUDED.xero_tenant_id,
  updated_at = NOW();
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

### 2.2 Create Bookkeeping Automation Database Schema

**File**: `infra/supabase/migrations/20251204_bookkeeping_schema.sql`

```sql
-- =============================================================================
-- BOOKKEEPING AUTOMATION SCHEMA
-- =============================================================================

-- Pending invoices queue (AP inbox)
CREATE TABLE IF NOT EXISTS pending_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_key TEXT NOT NULL,

    -- Source
    source_type TEXT NOT NULL CHECK (source_type IN ('email', 'upload', 'api')),
    source_email TEXT,                       -- Original email address
    source_subject TEXT,                     -- Email subject
    received_at TIMESTAMPTZ DEFAULT NOW(),

    -- Extracted data (from AI/OCR)
    supplier_name TEXT,
    supplier_abn TEXT,
    invoice_number TEXT,
    invoice_date DATE,
    due_date DATE,
    subtotal DECIMAL(10,2),
    gst_amount DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    line_items JSONB DEFAULT '[]'::jsonb,

    -- Matching
    matched_contact_id TEXT,                 -- Xero contact ID
    match_confidence INTEGER,                -- 0-100%

    -- Document
    pdf_url TEXT,                            -- Stored PDF location
    pdf_filename TEXT,

    -- Processing status
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending',       -- Awaiting review
        'processing',    -- AI extraction in progress
        'ready',         -- Extracted, ready for approval
        'approved',      -- User approved
        'submitted',     -- Sent to Xero
        'failed',        -- Processing failed
        'rejected'       -- User rejected
    )),
    processing_error TEXT,

    -- Xero reference
    xero_invoice_id TEXT,                    -- After submission
    submitted_at TIMESTAMPTZ,
    submitted_by TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AR reminder tracking
CREATE TABLE IF NOT EXISTS ar_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_key TEXT NOT NULL,

    -- Invoice reference
    xero_invoice_id TEXT NOT NULL,
    xero_contact_id TEXT NOT NULL,
    invoice_number TEXT,
    invoice_amount DECIMAL(10,2),
    due_date DATE,

    -- Contact details
    contact_name TEXT,
    contact_email TEXT,

    -- Reminder tracking
    days_overdue INTEGER,
    reminder_level INTEGER DEFAULT 1,        -- 1=7day, 2=14day, 3=30day, 4=60day+
    last_reminder_sent_at TIMESTAMPTZ,
    next_reminder_due_at TIMESTAMPTZ,
    total_reminders_sent INTEGER DEFAULT 0,

    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN (
        'active',        -- Still following up
        'paid',          -- Invoice paid
        'escalated',     -- Needs human intervention
        'written_off',   -- Decided not to pursue
        'disputed'       -- Customer dispute
    )),
    escalation_reason TEXT,
    escalated_at TIMESTAMPTZ,

    -- Response tracking
    last_response_at TIMESTAMPTZ,
    last_response_type TEXT,                 -- 'email_reply', 'phone', 'payment'
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(business_key, xero_invoice_id)
);

-- Bank transaction cache (for reconciliation)
CREATE TABLE IF NOT EXISTS bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_key TEXT NOT NULL,

    -- Xero reference
    xero_transaction_id TEXT NOT NULL,
    xero_bank_account_id TEXT,
    bank_account_name TEXT,

    -- Transaction details
    transaction_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    reference TEXT,
    transaction_type TEXT,                   -- RECEIVE, SPEND

    -- Reconciliation
    is_reconciled BOOLEAN DEFAULT false,
    reconciled_to_type TEXT,                 -- 'invoice', 'bill', 'manual'
    reconciled_to_id TEXT,                   -- Xero invoice/bill ID
    reconciled_at TIMESTAMPTZ,
    reconciled_by TEXT,

    -- Matching suggestions
    suggested_match_id TEXT,
    suggested_match_type TEXT,
    match_confidence INTEGER,                -- 0-100%

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(business_key, xero_transaction_id)
);

-- Reconciliation audit log
CREATE TABLE IF NOT EXISTS reconciliation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_key TEXT NOT NULL,
    bank_transaction_id UUID REFERENCES bank_transactions(id),
    action TEXT NOT NULL,                    -- 'matched', 'unmatched', 'manual'
    matched_to_type TEXT,
    matched_to_id TEXT,
    performed_by TEXT,
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pending_invoices_business ON pending_invoices(business_key, status);
CREATE INDEX IF NOT EXISTS idx_pending_invoices_status ON pending_invoices(status);
CREATE INDEX IF NOT EXISTS idx_ar_reminders_business ON ar_reminders(business_key, status);
CREATE INDEX IF NOT EXISTS idx_ar_reminders_overdue ON ar_reminders(days_overdue, status);
CREATE INDEX IF NOT EXISTS idx_ar_reminders_next ON ar_reminders(next_reminder_due_at);
CREATE INDEX IF NOT EXISTS idx_bank_txns_business ON bank_transactions(business_key, is_reconciled);
CREATE INDEX IF NOT EXISTS idx_bank_txns_date ON bank_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_bank_txns_unreconciled ON bank_transactions(business_key) WHERE NOT is_reconciled;
```

---

### 2.3 Create Legacy Accounting Transactions Schema (Optional)

**File**: `infra/supabase/migrations/20251204_accounting_schema.sql`

```sql
-- Unified accounting transactions view (optional - for reporting)
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

## Phase 3: BOO Xero Implementation (Day 2-3)

### 3.1 Connect BOO to Xero

**BOO uses Xero** - We reuse the existing Xero client:

```typescript
import { xeroClient } from '@/shared/libs/integrations/xero'

// Set BOO tenant
xeroClient.setTenant(BOO_XERO_TENANT_ID)

// Sync chart of accounts
const accounts = await xeroClient.accounts.list()

// Get P&L report
const pnl = await xeroClient.reports.getProfitAndLoss({
  fromDate: '2024-01-01',
  toDate: '2024-12-31'
})

// Get bank transactions for reconciliation
const bankTxns = await xeroClient.bankTransactions.list()
```

**Steps:**
1. Complete OAuth for BOO (see Phase 1.1)
2. Run account sync: `npx tsx scripts/financials/sync-xero-to-supabase.ts --business=boo`
3. Verify accounts in `accounts` table

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

### Phase 1: Foundation (Day 1)
- [ ] **Run Xero OAuth for BOO** - `npx tsx scripts/financials/setup-xero-auth-direct.ts`
- [ ] **Get BOO Xero tenant ID** - From OAuth callback
- [ ] **Add BOO to xero_organizations table** - SQL insert
- [ ] **Create bookkeeping database schema** - Tables for pending_invoices, ar_reminders, etc.
- [ ] **Add Accounting to navigation** - Edit `business-config.ts`
- [ ] **Create basic page structure** - Work Queue, Bank Recon, AR, AP tabs
- [ ] **Deploy dashboard** - Initial deployment

### Phase 2: Bank Reconciliation (Day 2-3)
- [ ] **Create bank_transactions table** - Store Xero bank feed data
- [ ] **Build n8n workflow: Sync bank feed** - Daily pull from Xero
- [ ] **Build matching engine** - Amount, date, reference matching
- [ ] **Create API: Get unmatched transactions** - `/api/accounting/unmatched`
- [ ] **Create API: Reconcile transaction** - `/api/accounting/reconcile`
- [ ] **Build Bank Recon UI** - Match suggestions, one-click reconcile
- [ ] **Test with BOO bank data** - Verify matching accuracy

### Phase 3: Accounts Receivable - Debt Collection (Day 3-4)
- [ ] **Create ar_tracking table** - Track reminder status per invoice
- [ ] **Build n8n workflow: Overdue scanner** - Daily query for overdue invoices
- [ ] **Create email templates** - 7/14/30/60 day reminders
- [ ] **Build n8n workflow: Send reminders** - Automated email dispatch
- [ ] **Create API: Get overdue invoices** - `/api/accounting/ar/overdue`
- [ ] **Create API: Send reminder** - `/api/accounting/ar/remind`
- [ ] **Build AR Dashboard UI** - Aging buckets, escalation queue
- [ ] **Test reminder flow** - Verify emails send correctly

### Phase 4: Accounts Payable - Invoice Processing (Day 4-5)
- [ ] **Create pending_invoices table** - Queue for processing
- [ ] **Set up invoice email inbox** - invoices@buyorganicsonline.com.au
- [ ] **Build n8n workflow: Email monitor** - Watch inbox for PDFs
- [ ] **Build invoice parser** - Claude API or OCR for data extraction
- [ ] **Create API: Process invoice** - Extract data, match supplier
- [ ] **Create API: Create Xero bill** - Submit to Xero with attachment
- [ ] **Build AP Queue UI** - Review, approve, bulk process
- [ ] **Test invoice flow** - Forward test invoice, verify Xero entry

### Phase 5: RHF + Polish (Day 5-6)
- [ ] **Run Xero OAuth for RHF** - Same process as BOO
- [ ] **Add RHF to xero_organizations** - SQL insert
- [ ] **Verify all flows work for RHF** - Bank recon, AR, AP
- [ ] **Build BAS Preparation UI** - GST summary from Xero
- [ ] **Add ATO Rulings search** - Query ato_rulings table
- [ ] **Create monitoring/alerts** - Failed jobs, stuck items

### Phase 6: Automation & Scaling (Ongoing)
- [ ] **n8n workflow: Daily bank sync** - All 4 businesses
- [ ] **n8n workflow: AR reminder automation** - Send reminders automatically
- [ ] **n8n workflow: Invoice email monitor** - Process incoming invoices
- [ ] **n8n workflow: BAS reminder** - 7 days before due date
- [ ] **Add Teelixir and Elevate** - Extend to all businesses
- [ ] **Performance optimization** - Caching, batch processing
- [ ] **Staff training documentation** - How to use the system

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

## Automation Realism Assessment

### Expected Automation Levels by Task

| Task | Automation % | Human Still Needed For |
|------|-------------|------------------------|
| **Bank Reconciliation** | 90-95% | Unusual/split transactions, new suppliers |
| **AR - Debt Collection** | 95%+ | Phone calls, disputes, legal escalation |
| **AP - Invoice Processing** | 60-80% | Complex invoices, new suppliers, exceptions |
| **Document Attachment** | 80-90% | Manual receipts, missing documents |

### Why BOO is a Good Candidate

1. **Limited suppliers** - ~4 main suppliers (Oborne, UHP, Kadac, Unleashed) with consistent invoice formats
2. **Predictable bank transactions** - PayPal, Stripe, credit card batches follow patterns
3. **Structured e-commerce data** - BigCommerce orders already in `bc_orders` table
4. **High volume, low complexity** - Many similar transactions

### Realistic Target

```
BEFORE: Bookkeeper works 15-20 hours/week on data entry
AFTER:  Bookkeeper reviews exceptions 2-3 hours/week
        = 85% time reduction
```

---

## BOO Implementation Guide (Tomorrow Morning)

### Prerequisites Checklist
- [ ] BOO Xero login credentials (email + password)
- [ ] Access to teelixir-leads Supabase project
- [ ] Master-ops repo pulled and up to date
- [ ] Node.js 18+ installed

---

### HOUR 1: Xero Connection (30-45 mins)

#### Step 1.1: Run Xero OAuth Setup
```bash
cd /home/user/master-ops
npx tsx scripts/financials/setup-xero-auth-direct.ts
```

The script will print an authorization URL. Open it in your browser.

#### Step 1.2: Authorize BOO Xero Account
1. Log in with BOO Xero credentials
2. Select the BOO organization if prompted
3. Click "Allow access"
4. You'll be redirected to a callback URL
5. Copy the FULL callback URL (including the `?code=...` part)

#### Step 1.3: Complete OAuth Flow
Paste the callback URL when the script prompts. It will:
- Exchange the code for access + refresh tokens
- Display the BOO Xero tenant ID
- Save tokens to Supabase vault

**SAVE THIS**: Note down the `tenant_id` displayed.

#### Step 1.4: Add BOO to xero_organizations Table
Open Supabase SQL Editor (teelixir-leads project) and run:
```sql
INSERT INTO xero_organizations (
  xero_tenant_id,
  business_key,
  name,
  legal_name,
  base_currency,
  country_code
) VALUES (
  '<paste-boo-tenant-id-here>',
  'boo',
  'Buy Organics Online',
  'Buy Organics Online Pty Ltd',
  'AUD',
  'AU'
);
```

#### Step 1.5: Test Connection
```bash
# Verify we can fetch BOO data from Xero
npx tsx scripts/financials/test-xero-connection.ts --business=boo
```

Expected output: BOO organization name, chart of accounts count.

---

### HOUR 2: Database Schema (15-20 mins)

#### Step 2.1: Create Bookkeeping Tables
Run the migration in Supabase SQL Editor:
```sql
-- Pending invoices queue (AP inbox)
CREATE TABLE IF NOT EXISTS pending_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_key TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('email', 'upload', 'api')),
    source_email TEXT,
    source_subject TEXT,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    supplier_name TEXT,
    supplier_abn TEXT,
    invoice_number TEXT,
    invoice_date DATE,
    due_date DATE,
    subtotal DECIMAL(10,2),
    gst_amount DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    line_items JSONB DEFAULT '[]'::jsonb,
    matched_contact_id TEXT,
    match_confidence INTEGER,
    pdf_url TEXT,
    pdf_filename TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'ready', 'approved', 'submitted', 'failed', 'rejected'
    )),
    processing_error TEXT,
    xero_invoice_id TEXT,
    submitted_at TIMESTAMPTZ,
    submitted_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AR reminder tracking
CREATE TABLE IF NOT EXISTS ar_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_key TEXT NOT NULL,
    xero_invoice_id TEXT NOT NULL,
    xero_contact_id TEXT NOT NULL,
    invoice_number TEXT,
    invoice_amount DECIMAL(10,2),
    due_date DATE,
    contact_name TEXT,
    contact_email TEXT,
    days_overdue INTEGER,
    reminder_level INTEGER DEFAULT 1,
    last_reminder_sent_at TIMESTAMPTZ,
    next_reminder_due_at TIMESTAMPTZ,
    total_reminders_sent INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN (
        'active', 'paid', 'escalated', 'written_off', 'disputed'
    )),
    escalation_reason TEXT,
    escalated_at TIMESTAMPTZ,
    last_response_at TIMESTAMPTZ,
    last_response_type TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_key, xero_invoice_id)
);

-- Bank transaction cache
CREATE TABLE IF NOT EXISTS bank_transactions_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_key TEXT NOT NULL,
    xero_transaction_id TEXT NOT NULL,
    xero_bank_account_id TEXT,
    bank_account_name TEXT,
    transaction_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    reference TEXT,
    transaction_type TEXT,
    is_reconciled BOOLEAN DEFAULT false,
    reconciled_to_type TEXT,
    reconciled_to_id TEXT,
    reconciled_at TIMESTAMPTZ,
    reconciled_by TEXT,
    suggested_match_id TEXT,
    suggested_match_type TEXT,
    match_confidence INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_key, xero_transaction_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pending_invoices_business ON pending_invoices(business_key, status);
CREATE INDEX IF NOT EXISTS idx_ar_reminders_business ON ar_reminders(business_key, status);
CREATE INDEX IF NOT EXISTS idx_ar_reminders_overdue ON ar_reminders(days_overdue) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_bank_txns_unreconciled ON bank_transactions_cache(business_key) WHERE NOT is_reconciled;
```

---

### HOUR 3: Sync BOO Data (20-30 mins)

#### Step 3.1: Sync Chart of Accounts
```bash
npx tsx scripts/financials/sync-xero-to-supabase.ts --business=boo --accounts
```

#### Step 3.2: Sync Recent Invoices (AR)
```bash
npx tsx scripts/financials/sync-xero-to-supabase.ts --business=boo --invoices --days=90
```

#### Step 3.3: Sync Recent Bills (AP)
```bash
npx tsx scripts/financials/sync-xero-to-supabase.ts --business=boo --bills --days=90
```

#### Step 3.4: Sync Bank Transactions
```bash
npx tsx scripts/financials/sync-xero-to-supabase.ts --business=boo --bank --days=30
```

#### Step 3.5: Verify Data in Supabase
Check these tables have BOO data:
- `accounts` - Chart of accounts
- `bank_transactions_cache` - Recent bank transactions
- Xero invoices should be queryable via API

---

### HOUR 4: Dashboard UI (45-60 mins)

#### Step 4.1: Add Accounting Navigation
Edit `dashboard/src/lib/business-config.ts`:

```typescript
// Add Calculator to imports at top
import { Calculator } from 'lucide-react'

// Add to 'home' navigation array (around line 54-66)
{ name: 'Accounting', href: '/accounting', icon: Calculator },
```

#### Step 4.2: Create Accounting Page Structure
```bash
mkdir -p dashboard/src/app/\(dashboard\)/home/accounting
```

#### Step 4.3: Create Main Accounting Page
Create `dashboard/src/app/(dashboard)/home/accounting/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Building2, AlertCircle, CheckCircle, Clock, DollarSign } from 'lucide-react'

interface BusinessSummary {
  business: string
  overdueInvoices: number
  overdueAmount: number
  unreconciledTransactions: number
  pendingBills: number
}

export default function AccountingDashboard() {
  const [loading, setLoading] = useState(true)
  const [summaries, setSummaries] = useState<BusinessSummary[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/accounting/summary')
      const data = await res.json()
      setSummaries(data.businesses || [])
    } catch (err) {
      console.error('Failed to load accounting data:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Accounting</h1>
          <p className="text-gray-400 mt-1">Bookkeeping automation across all businesses</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Overdue Invoices"
          value="$12,450"
          subtitle="5 invoices"
          icon={<AlertCircle className="w-5 h-5 text-red-400" />}
          color="red"
        />
        <SummaryCard
          title="To Reconcile"
          value="23"
          subtitle="Bank transactions"
          icon={<Clock className="w-5 h-5 text-yellow-400" />}
          color="yellow"
        />
        <SummaryCard
          title="Pending Bills"
          value="8"
          subtitle="Awaiting approval"
          icon={<DollarSign className="w-5 h-5 text-blue-400" />}
          color="blue"
        />
        <SummaryCard
          title="Reconciled Today"
          value="45"
          subtitle="98% auto-matched"
          icon={<CheckCircle className="w-5 h-5 text-green-400" />}
          color="green"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickActionCard
          title="Bank Reconciliation"
          description="23 unmatched transactions"
          href="/home/accounting/reconciliation"
          actionLabel="Start Matching"
        />
        <QuickActionCard
          title="AR - Debtors"
          description="5 overdue invoices"
          href="/home/accounting/ar"
          actionLabel="Send Reminders"
        />
        <QuickActionCard
          title="AP - Bills Queue"
          description="8 invoices to process"
          href="/home/accounting/ap"
          actionLabel="Process Bills"
        />
      </div>

      {/* Business Breakdown */}
      <section className="bg-gray-900 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">By Business</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {['boo', 'rhf', 'teelixir', 'elevate'].map((biz) => (
            <BusinessCard key={biz} businessKey={biz} />
          ))}
        </div>
      </section>
    </div>
  )
}

function SummaryCard({ title, value, subtitle, icon, color }: any) {
  const colorClasses = {
    red: 'border-red-500/50 bg-red-900/20',
    yellow: 'border-yellow-500/50 bg-yellow-900/20',
    blue: 'border-blue-500/50 bg-blue-900/20',
    green: 'border-green-500/50 bg-green-900/20',
  }
  return (
    <div className={`border rounded-lg p-4 ${colorClasses[color as keyof typeof colorClasses]}`}>
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-sm">{title}</span>
        {icon}
      </div>
      <p className="text-2xl font-bold text-white mt-2">{value}</p>
      <p className="text-gray-500 text-sm">{subtitle}</p>
    </div>
  )
}

function QuickActionCard({ title, description, href, actionLabel }: any) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 flex flex-col justify-between">
      <div>
        <h3 className="text-lg font-medium text-white">{title}</h3>
        <p className="text-gray-400 text-sm mt-1">{description}</p>
      </div>
      <a
        href={href}
        className="mt-4 inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
      >
        {actionLabel}
      </a>
    </div>
  )
}

function BusinessCard({ businessKey }: { businessKey: string }) {
  const names: Record<string, string> = {
    boo: 'Buy Organics Online',
    rhf: 'Red Hill Fresh',
    teelixir: 'Teelixir',
    elevate: 'Elevate Wholesale',
  }
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-white font-medium">{names[businessKey]}</h3>
      <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
        <div>
          <p className="text-gray-500">Overdue AR</p>
          <p className="text-white">$0</p>
        </div>
        <div>
          <p className="text-gray-500">Unreconciled</p>
          <p className="text-white">0</p>
        </div>
        <div>
          <p className="text-gray-500">Pending AP</p>
          <p className="text-white">0</p>
        </div>
      </div>
    </div>
  )
}
```

#### Step 4.4: Create API Route for Summary
Create `dashboard/src/app/api/accounting/summary/route.ts`:

```typescript
import { NextResponse } from 'next/server'

export async function GET() {
  // TODO: Fetch real data from Supabase/Xero
  return NextResponse.json({
    businesses: [
      {
        business: 'boo',
        overdueInvoices: 5,
        overdueAmount: 12450,
        unreconciledTransactions: 23,
        pendingBills: 8,
      },
      {
        business: 'rhf',
        overdueInvoices: 0,
        overdueAmount: 0,
        unreconciledTransactions: 0,
        pendingBills: 0,
      },
    ],
  })
}
```

---

### HOUR 5: Deploy & Test (15-20 mins)

#### Step 5.1: Commit Changes
```bash
git add -A
git commit -m "Add Accounting tab with BOO Xero integration"
```

#### Step 5.2: Push to Branch
```bash
git push origin claude/accounting-dashboard-plan-019xgcmvRa54e7L74wzAcMYj
```

#### Step 5.3: Deploy Dashboard
```bash
doctl apps create-deployment 1a0eed70-aef6-415e-953f-d2b7f0c7c832 --force-rebuild
```

#### Step 5.4: Verify Deployment
Wait 3-5 minutes for deployment, then:
1. Visit https://ops.growthcohq.com/home/accounting
2. Confirm page loads with summary cards
3. Check BOO data displays correctly

---

### POST-IMPLEMENTATION: Next Steps

After the initial setup is complete, these are the next priorities:

#### Day 2: Bank Reconciliation
- Build matching engine for BOO bank transactions
- Create reconciliation UI with one-click matching
- Test with live BOO data

#### Day 3: AR Automation
- Set up overdue invoice scanner
- Create email templates for reminders
- Build n8n workflow for automated reminders

#### Day 4: AP Invoice Processing
- Set up invoice email inbox
- Build AI invoice parser
- Create approval queue UI

---

## Troubleshooting

### OAuth Fails
- Ensure Xero app has correct redirect URI configured
- Check client ID/secret in environment variables
- Verify Xero app is connected to correct organization

### No Data in Dashboard
- Confirm xero_organizations table has BOO entry
- Run sync scripts manually to verify data flow
- Check Supabase RLS policies allow read access

### Dashboard Won't Deploy
- Check build logs: `doctl apps logs 1a0eed70-aef6-415e-953f-d2b7f0c7c832 --type=build`
- Verify no TypeScript errors: `cd dashboard && npm run build`

---

**Last Updated**: 2025-12-04
**Author**: Claude Code
**Next Review**: After BOO POC completion
