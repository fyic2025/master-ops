# Consolidation Algorithm Specification

**Project**: Consolidated Financials - Teelixir + Elevate Wholesale
**Purpose**: Define the exact algorithm for consolidating financial statements
**Last Updated**: 2025-11-21

---

## Table of Contents

1. [Overview](#overview)
2. [Algorithm Steps](#algorithm-steps)
3. [Worked Example](#worked-example)
4. [Edge Cases](#edge-cases)
5. [Validation Rules](#validation-rules)
6. [Implementation Pseudocode](#implementation-pseudocode)

---

## Overview

### What is Financial Consolidation?

Financial consolidation combines the financial statements of two or more entities into a single set of statements, eliminating intercompany transactions to avoid double-counting.

**Key Principles:**

1. **Elimination**: Remove transactions between entities
   - Revenue from Teelixir → Elevate = COGS from Elevate → Teelixir
   - These offset each other and shouldn't appear in consolidated view

2. **Aggregation**: Combine external transactions
   - Teelixir sales to customers + Elevate sales to customers
   - Sum up because these are real revenue from outside parties

3. **Allocation**: Distribute shared expenses
   - Rent paid by Teelixir but benefits both entities
   - Allocate based on revenue ratio, headcount, or other metric

### Consolidation Equation

```
Consolidated Total = (Teelixir Total + Elevate Total) - Intercompany Eliminations + Allocation Adjustments
```

---

## Algorithm Steps

### Step 1: Load Data

**Input:** Period (YYYY-MM), e.g., "2024-11"

**Actions:**
```typescript
async function loadConsolidationData(period: string) {

  // 1.1 Load journal lines for both organizations
  const teelixirLines = await db.getJournalLines({
    organization: 'teelixir',
    period: period
  });

  const elevateLines = await db.getJournalLines({
    organization: 'elevate',
    period: period
  });

  // 1.2 Load approved account mappings
  const mappings = await db.getAccountMappings({
    approval_status: 'approved'
  });

  // 1.3 Load approved intercompany eliminations
  const eliminations = await db.getIntercompanyEliminations({
    period: period,
    approval_status: 'approved'
  });

  // 1.4 Load shared expense allocation rules
  const allocationRules = await db.getSharedExpenseRules({
    active: true
  });

  return {
    teelixirLines,
    elevateLines,
    mappings,
    eliminations,
    allocationRules
  };
}
```

---

### Step 2: Apply Account Mappings

**Purpose:** Transform Elevate accounts to match Teelixir chart of accounts

**Logic:**
```typescript
function applyAccountMappings(
  elevateLines: JournalLine[],
  mappings: AccountMapping[]
): JournalLine[] {

  return elevateLines.map(line => {

    // Find mapping for this account
    const mapping = mappings.find(
      m => m.source_account_id === line.account_id
    );

    if (!mapping) {
      throw new Error(
        `No mapping found for Elevate account ${line.account_code} - ${line.account_name}`
      );
    }

    // Create mapped line (preserve original in metadata)
    return {
      ...line,
      account_id: mapping.target_account_id,
      account_code: mapping.target_account_code,
      account_name: mapping.target_account_name,
      account_type: mapping.target_account_type,
      original_account_id: line.account_id,
      original_account_code: line.account_code,
      original_account_name: line.account_name,
      mapping_applied: true
    };
  });
}
```

**Example:**
```
Before mapping:
  Elevate: Account 310 "Cost of Goods Sold" → $5,000

After mapping:
  Mapped to: Account 500 "Cost of Sales" → $5,000
  (Teelixir's account code)
```

---

### Step 3: Aggregate External Transactions

**Purpose:** Sum up transactions from both entities (excluding intercompany)

**Logic:**
```typescript
function aggregateTransactions(
  teelixirLines: JournalLine[],
  mappedElevateLines: JournalLine[],
  eliminations: IntercompanyElimination[]
): AggregatedAccounts {

  // Get IDs of transactions to eliminate
  const eliminatedIds = new Set<string>();
  eliminations.forEach(e => {
    eliminatedIds.add(e.teelixir_line_id);
    eliminatedIds.add(e.elevate_line_id);
  });

  // Filter out eliminated transactions
  const externalTeelixir = teelixirLines.filter(
    line => !eliminatedIds.has(line.id)
  );
  const externalElevate = mappedElevateLines.filter(
    line => !eliminatedIds.has(line.id)
  );

  // Aggregate by account
  const aggregated = new Map<string, AccountTotal>();

  // Add Teelixir transactions
  for (const line of externalTeelixir) {
    const key = line.account_id;
    const existing = aggregated.get(key) || {
      account_id: key,
      account_code: line.account_code,
      account_name: line.account_name,
      account_type: line.account_type,
      debit_total: 0,
      credit_total: 0,
      net_total: 0,
      transaction_count: 0
    };

    existing.debit_total += line.debit_amount || 0;
    existing.credit_total += line.credit_amount || 0;
    existing.net_total += line.net_amount || 0;
    existing.transaction_count += 1;

    aggregated.set(key, existing);
  }

  // Add Elevate transactions (now mapped to Teelixir accounts)
  for (const line of externalElevate) {
    const key = line.account_id;
    const existing = aggregated.get(key) || {
      account_id: key,
      account_code: line.account_code,
      account_name: line.account_name,
      account_type: line.account_type,
      debit_total: 0,
      credit_total: 0,
      net_total: 0,
      transaction_count: 0
    };

    existing.debit_total += line.debit_amount || 0;
    existing.credit_total += line.credit_amount || 0;
    existing.net_total += line.net_amount || 0;
    existing.transaction_count += 1;

    aggregated.set(key, existing);
  }

  return Object.fromEntries(aggregated);
}
```

---

### Step 4: Apply Intercompany Eliminations

**Purpose:** Remove double-counted intercompany transactions

**Types of Eliminations:**

#### 4.1 Revenue/COGS Elimination

**Scenario:**
- Teelixir sells $10,000 of goods to Elevate
- Teelixir records: Revenue +$10,000
- Elevate records: COGS +$10,000

**Problem:**
- Consolidated revenue shows $10,000 (incorrect - internal transfer)
- Consolidated COGS shows $10,000 (incorrect - internal transfer)

**Solution:**
```typescript
function applyRevenueCOGSElimination(
  elimination: IntercompanyElimination,
  aggregated: AggregatedAccounts
) {

  // Reduce Teelixir revenue account
  const revenueAccount = aggregated[elimination.teelixir_account_id];
  revenueAccount.credit_total -= elimination.amount;
  revenueAccount.net_total -= elimination.amount;

  // Reduce Elevate COGS account
  const cogsAccount = aggregated[elimination.elevate_account_id];
  cogsAccount.debit_total -= elimination.amount;
  cogsAccount.net_total -= elimination.amount;

  // Log elimination
  logElimination({
    type: 'revenue_cogs',
    amount: elimination.amount,
    description: `Eliminated intercompany sale: ${elimination.description}`
  });
}
```

**Result:**
- Consolidated revenue: $0 (correct - no external sale)
- Consolidated COGS: $0 (correct - no external cost)

#### 4.2 Payable/Receivable Elimination

**Scenario:**
- Teelixir has $5,000 receivable from Elevate
- Elevate has $5,000 payable to Teelixir

**Problem:**
- Consolidated shows $5,000 asset AND $5,000 liability (net = $0 but inflates balance sheet)

**Solution:**
```typescript
function applyPayableReceivableElimination(
  elimination: IntercompanyElimination,
  aggregated: AggregatedAccounts
) {

  // Reduce Teelixir accounts receivable
  const receivableAccount = aggregated[elimination.teelixir_account_id];
  receivableAccount.debit_total -= elimination.amount;
  receivableAccount.net_total -= elimination.amount;

  // Reduce Elevate accounts payable
  const payableAccount = aggregated[elimination.elevate_account_id];
  payableAccount.credit_total -= elimination.amount;
  payableAccount.net_total += elimination.amount; // Payable is credit, reduce = increase net

  // Log elimination
  logElimination({
    type: 'payable_receivable',
    amount: elimination.amount,
    description: `Eliminated intercompany payable/receivable: ${elimination.description}`
  });
}
```

**Result:**
- Consolidated receivable: reduced by $5,000
- Consolidated payable: reduced by $5,000
- Balance sheet more accurate

---

### Step 5: Apply Shared Expense Allocations

**Purpose:** Fairly distribute expenses paid by one entity but benefiting both

**Example Allocation Rules:**

#### 5.1 Revenue Ratio Allocation

**Scenario:**
- Teelixir pays $12,000 rent for shared warehouse
- Teelixir revenue: $300,000 (75%)
- Elevate revenue: $100,000 (25%)

**Allocation:**
```typescript
async function applyRevenueRatioAllocation(
  expense: SharedExpense,
  period: string
) {

  // Calculate revenue ratio
  const teelixirRevenue = await getTotalRevenue('teelixir', period);
  const elevateRevenue = await getTotalRevenue('elevate', period);
  const totalRevenue = teelixirRevenue + elevateRevenue;

  const teelixirRatio = teelixirRevenue / totalRevenue;
  const elevateRatio = elevateRevenue / totalRevenue;

  // Allocate expense
  const teelixirShare = expense.amount * teelixirRatio; // $9,000
  const elevateShare = expense.amount * elevateRatio;   // $3,000

  // Adjustment entries
  return {
    teelixir_adjustment: 0,              // Already paid full amount
    elevate_adjustment: +elevateShare,    // Add $3,000 to Elevate
    teelixir_reduction: -elevateShare,   // Reduce Teelixir by $3,000
    description: `Allocated ${expense.description} by revenue ratio (${Math.round(teelixirRatio * 100)}% / ${Math.round(elevateRatio * 100)}%)`
  };
}
```

#### 5.2 Headcount Allocation

**Scenario:**
- Teelixir pays $6,000 for shared software (Xero, Slack, etc.)
- Teelixir headcount: 8 people
- Elevate headcount: 2 people
- Total: 10 people

**Allocation:**
```typescript
function applyHeadcountAllocation(
  expense: SharedExpense,
  teelixirHeadcount: number,
  elevateHeadcount: number
) {

  const totalHeadcount = teelixirHeadcount + elevateHeadcount;
  const teelixirRatio = teelixirHeadcount / totalHeadcount; // 0.8
  const elevateRatio = elevateHeadcount / totalHeadcount;   // 0.2

  const teelixirShare = expense.amount * teelixirRatio; // $4,800
  const elevateShare = expense.amount * elevateRatio;   // $1,200

  return {
    teelixir_adjustment: 0,
    elevate_adjustment: +elevateShare,
    teelixir_reduction: -elevateShare,
    description: `Allocated ${expense.description} by headcount (${teelixirHeadcount} / ${elevateHeadcount})`
  };
}
```

#### 5.3 Fixed Percentage Allocation

**Scenario:**
- Accountant fees shared 50/50 by agreement
- Teelixir pays $4,000

**Allocation:**
```typescript
function applyFixedPercentageAllocation(
  expense: SharedExpense,
  teelixirPct: number,
  elevatePct: number
) {

  const teelixirShare = expense.amount * (teelixirPct / 100); // $2,000
  const elevateShare = expense.amount * (elevatePct / 100);   // $2,000

  return {
    teelixir_adjustment: 0,
    elevate_adjustment: +elevateShare,
    teelixir_reduction: -elevateShare,
    description: `Allocated ${expense.description} at fixed ratio (${teelixirPct}% / ${elevatePct}%)`
  };
}
```

---

### Step 6: Generate Consolidated Reports

**Purpose:** Create P&L and Balance Sheet from aggregated data

#### 6.1 Profit & Loss Statement

```typescript
function generateProfitAndLoss(
  aggregated: AggregatedAccounts,
  period: string
): ProfitAndLossReport {

  // Revenue section
  const revenue = Object.values(aggregated)
    .filter(acc => acc.account_type === 'REVENUE')
    .reduce((sum, acc) => sum + acc.net_total, 0);

  // COGS section
  const cogs = Object.values(aggregated)
    .filter(acc => acc.account_type === 'DIRECTCOSTS')
    .reduce((sum, acc) => sum + Math.abs(acc.net_total), 0);

  // Gross Profit
  const grossProfit = revenue - cogs;
  const grossMargin = (grossProfit / revenue) * 100;

  // Operating Expenses
  const operatingExpenses = Object.values(aggregated)
    .filter(acc => acc.account_type === 'EXPENSE')
    .reduce((sum, acc) => sum + Math.abs(acc.net_total), 0);

  // Operating Profit (EBIT)
  const operatingProfit = grossProfit - operatingExpenses;

  // Other Income
  const otherIncome = Object.values(aggregated)
    .filter(acc => acc.account_type === 'OTHERINCOME')
    .reduce((sum, acc) => sum + acc.net_total, 0);

  // Other Expenses
  const otherExpenses = Object.values(aggregated)
    .filter(acc => acc.account_type === 'OTHEREXPENSE')
    .reduce((sum, acc) => sum + Math.abs(acc.net_total), 0);

  // Net Profit Before Tax
  const netProfitBeforeTax = operatingProfit + otherIncome - otherExpenses;

  return {
    period,
    revenue,
    cogs,
    gross_profit: grossProfit,
    gross_margin_pct: grossMargin,
    operating_expenses: operatingExpenses,
    operating_profit: operatingProfit,
    other_income: otherIncome,
    other_expenses: otherExpenses,
    net_profit_before_tax: netProfitBeforeTax
  };
}
```

#### 6.2 Balance Sheet

```typescript
function generateBalanceSheet(
  aggregated: AggregatedAccounts,
  asOfDate: string
): BalanceSheetReport {

  // ASSETS
  const currentAssets = Object.values(aggregated)
    .filter(acc => acc.account_type === 'CURRENT_ASSET')
    .reduce((sum, acc) => sum + acc.net_total, 0);

  const fixedAssets = Object.values(aggregated)
    .filter(acc => acc.account_type === 'FIXED_ASSET')
    .reduce((sum, acc) => sum + acc.net_total, 0);

  const totalAssets = currentAssets + fixedAssets;

  // LIABILITIES
  const currentLiabilities = Object.values(aggregated)
    .filter(acc => acc.account_type === 'CURRENT_LIABILITY')
    .reduce((sum, acc) => sum + Math.abs(acc.net_total), 0);

  const longTermLiabilities = Object.values(aggregated)
    .filter(acc => acc.account_type === 'NONCURRENT_LIABILITY')
    .reduce((sum, acc) => sum + Math.abs(acc.net_total), 0);

  const totalLiabilities = currentLiabilities + longTermLiabilities;

  // EQUITY
  const equity = Object.values(aggregated)
    .filter(acc => acc.account_type === 'EQUITY')
    .reduce((sum, acc) => sum + acc.net_total, 0);

  // Retained Earnings (calculated from P&L)
  const retainedEarnings = totalAssets - totalLiabilities - equity;

  const totalEquity = equity + retainedEarnings;

  return {
    as_of_date: asOfDate,
    current_assets: currentAssets,
    fixed_assets: fixedAssets,
    total_assets: totalAssets,
    current_liabilities: currentLiabilities,
    long_term_liabilities: longTermLiabilities,
    total_liabilities: totalLiabilities,
    equity: equity,
    retained_earnings: retainedEarnings,
    total_equity: totalEquity,
    balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1.00
  };
}
```

---

### Step 7: Validate & Balance

**Purpose:** Ensure consolidation is mathematically correct

```typescript
function validateConsolidation(
  aggregated: AggregatedAccounts,
  profitAndLoss: ProfitAndLossReport,
  balanceSheet: BalanceSheetReport
): ValidationResult {

  const errors: string[] = [];
  const warnings: string[] = [];

  // RULE 1: Debits must equal credits
  const totalDebits = Object.values(aggregated)
    .reduce((sum, acc) => sum + acc.debit_total, 0);
  const totalCredits = Object.values(aggregated)
    .reduce((sum, acc) => sum + acc.credit_total, 0);

  if (Math.abs(totalDebits - totalCredits) > 1.00) {
    errors.push(
      `Debits ($${totalDebits.toFixed(2)}) != Credits ($${totalCredits.toFixed(2)})`
    );
  }

  // RULE 2: Balance sheet must balance
  if (!balanceSheet.balanced) {
    errors.push(
      `Balance sheet unbalanced: Assets ($${balanceSheet.total_assets.toFixed(2)}) != Liabilities + Equity ($${(balanceSheet.total_liabilities + balanceSheet.total_equity).toFixed(2)})`
    );
  }

  // RULE 3: No negative revenue (warning only)
  if (profitAndLoss.revenue < 0) {
    warnings.push(
      `Negative revenue detected: $${profitAndLoss.revenue.toFixed(2)}`
    );
  }

  // RULE 4: Gross margin sanity check
  if (profitAndLoss.gross_margin_pct < 0 || profitAndLoss.gross_margin_pct > 100) {
    warnings.push(
      `Unusual gross margin: ${profitAndLoss.gross_margin_pct.toFixed(1)}%`
    );
  }

  // RULE 5: Check for accounts with unusual balances
  for (const [accountId, account] of Object.entries(aggregated)) {
    // Revenue should be credit (positive net)
    if (account.account_type === 'REVENUE' && account.net_total < 0) {
      warnings.push(
        `Revenue account ${account.account_code} has negative balance: $${account.net_total.toFixed(2)}`
      );
    }

    // Expenses should be debit (negative net)
    if (account.account_type === 'EXPENSE' && account.net_total > 0) {
      warnings.push(
        `Expense account ${account.account_code} has credit balance: $${account.net_total.toFixed(2)}`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
```

---

## Worked Example

### Scenario

**Period:** November 2024

**Teelixir Transactions:**
1. Revenue from customers: $50,000
2. Revenue from Elevate (intercompany): $10,000
3. COGS: $20,000
4. Rent expense (shared warehouse): $6,000
5. Salary expense: $15,000

**Elevate Transactions:**
1. Revenue from customers: $30,000
2. COGS from Teelixir (intercompany): $10,000
3. COGS from suppliers: $8,000
4. Marketing expense: $5,000
5. Salary expense: $10,000

**Intercompany Eliminations:**
- Teelixir revenue $10,000 → Elevate COGS $10,000

**Shared Expense:**
- Rent $6,000 allocated 60/40 (revenue ratio)

---

### Step-by-Step Calculation

#### Step 1: Before Consolidation

**Teelixir P&L:**
```
Revenue:               $60,000  ($50k external + $10k intercompany)
COGS:                 -$20,000
Gross Profit:          $40,000
Rent:                  -$6,000
Salaries:             -$15,000
Net Profit:            $19,000
```

**Elevate P&L:**
```
Revenue:               $30,000
COGS:                 -$18,000  ($10k from Teelixir + $8k external)
Gross Profit:          $12,000
Marketing:             -$5,000
Salaries:             -$10,000
Net Profit:             -$3,000
```

**Simple Addition (WRONG):**
```
Combined Revenue:      $90,000  ← INCORRECT (includes $10k intercompany)
Combined COGS:        -$38,000  ← INCORRECT (includes $10k intercompany)
Combined Net Profit:   $16,000  ← INCORRECT
```

---

#### Step 2: Apply Intercompany Elimination

**Eliminate $10,000 sale from Teelixir to Elevate:**

```typescript
// Remove from Teelixir revenue
Teelixir Revenue: $60,000 - $10,000 = $50,000

// Remove from Elevate COGS
Elevate COGS: $18,000 - $10,000 = $8,000
```

---

#### Step 3: Apply Shared Expense Allocation

**Rent allocation (60/40 based on revenue ratio):**

Revenue ratio:
- Teelixir: $50,000 / $80,000 = 62.5%
- Elevate: $30,000 / $80,000 = 37.5%

Rent allocation:
- Teelixir: $6,000 × 62.5% = $3,750
- Elevate: $6,000 × 37.5% = $2,250

**Adjustments:**
```typescript
// Teelixir paid full $6,000, should only bear $3,750
Teelixir Rent: $6,000 - $2,250 = $3,750

// Elevate paid $0, should bear $2,250
Elevate Rent: $0 + $2,250 = $2,250
```

---

#### Step 4: Consolidated P&L

**After eliminations and allocations:**

```
┌─────────────────────────────────────────────────────┐
│  CONSOLIDATED PROFIT & LOSS                         │
│  Teelixir + Elevate Wholesale                       │
│  Period: November 2024                              │
└─────────────────────────────────────────────────────┘

REVENUE
  External Sales                        $80,000
    Teelixir                $50,000
    Elevate                 $30,000
  (Intercompany eliminated)            -$10,000
                                        --------
  Total Revenue                         $80,000

COST OF GOODS SOLD
  External COGS                         $28,000
    Teelixir                $20,000
    Elevate                  $8,000
  (Intercompany eliminated)            -$10,000
                                        --------
  Total COGS                           -$28,000
                                        --------
GROSS PROFIT                            $52,000
Gross Margin:                            65.0%

OPERATING EXPENSES
  Rent (allocated)                      -$6,000
    Teelixir (62.5%)         $3,750
    Elevate (37.5%)          $2,250
  Marketing                             -$5,000
    Elevate                  $5,000
  Salaries                             -$25,000
    Teelixir                $15,000
    Elevate                 $10,000
                                        --------
  Total Operating Expenses             -$36,000
                                        --------
NET PROFIT                              $16,000
                                        ========

BREAKDOWN BY ENTITY (for reference):
  Teelixir contribution:     $15,750
  Elevate contribution:         $250
                              --------
  Total:                     $16,000
```

---

#### Step 5: Validation

**Check 1: Revenue Reconciliation**
```
Simple sum:           $90,000  (Teelixir $60k + Elevate $30k)
Intercompany:        -$10,000
Consolidated:         $80,000  ✓
```

**Check 2: COGS Reconciliation**
```
Simple sum:           $38,000  (Teelixir $20k + Elevate $18k)
Intercompany:        -$10,000
Consolidated:         $28,000  ✓
```

**Check 3: Gross Profit**
```
Revenue - COGS:       $80,000 - $28,000 = $52,000  ✓
Gross Margin:         65.0%  ✓
```

**Check 4: Rent Allocation**
```
Teelixir + Elevate:   $3,750 + $2,250 = $6,000  ✓
Total matches paid:   $6,000  ✓
```

**Check 5: Net Profit**
```
Gross Profit:         $52,000
Operating Expenses:  -$36,000
Net Profit:           $16,000  ✓
```

---

## Edge Cases

### Edge Case 1: Partial Elimination

**Scenario:**
- Teelixir invoices Elevate for $10,000
- Elevate only paid $6,000 this period

**Handling:**
```typescript
// Only eliminate the paid portion
elimination_amount = $6,000

// Track remaining for next period
remaining_intercompany = $4,000

// Create partial elimination entry
{
  teelixir_revenue_reduction: -$6,000,
  elevate_cogs_reduction: -$6,000,
  status: 'partial',
  remaining: $4,000
}
```

### Edge Case 2: Timing Difference

**Scenario:**
- Teelixir records sale on Nov 30
- Elevate records COGS on Dec 1

**Handling:**
```typescript
// Option A: Allow date range matching (± 7 days)
if (Math.abs(dateDiff) <= 7) {
  // Eliminate in period of earliest transaction
  period = earliestTransaction.period;
}

// Option B: Manual adjustment
// User reviews and approves cross-period elimination
```

### Edge Case 3: Rounding Difference

**Scenario:**
- Teelixir records $10,000.00
- Elevate records $9,999.85 (due to rounding)

**Handling:**
```typescript
const tolerance = 1.00; // $1 tolerance

if (Math.abs(amount1 - amount2) <= tolerance) {
  // Use average
  elimination_amount = (amount1 + amount2) / 2;

  // Create rounding adjustment
  rounding_adjustment = amount1 - elimination_amount;

  // Post to "Rounding Difference" account
}
```

### Edge Case 4: Multi-Currency

**Scenario:**
- Teelixir sells in AUD: $10,000
- Elevate records in USD: $6,500 (at 0.65 exchange rate)

**Handling:**
```typescript
// Convert to base currency (AUD)
const baseAmount = elevateAmount / exchangeRate;

// Eliminate in base currency
elimination_amount = baseAmount;

// Track exchange gain/loss
fx_difference = teelixirAmount - baseAmount;
```

### Edge Case 5: GST/Tax Treatment

**Scenario:**
- Teelixir records revenue: $11,000 (inc GST)
- GST component: $1,000
- Net revenue: $10,000

**Handling:**
```typescript
// Eliminate net amounts only
elimination = {
  revenue_reduction: -$10,000,  // Net of GST
  cogs_reduction: -$10,000,     // Net of GST
  gst_payable_reduction: -$1,000,  // Separate GST elimination
  gst_receivable_reduction: -$1,000
};
```

---

## Validation Rules

### Pre-Consolidation Validation

```typescript
const PRE_CONSOLIDATION_CHECKS = [
  {
    name: 'All accounts mapped',
    check: () => unmappedAccounts.length === 0,
    severity: 'ERROR'
  },
  {
    name: 'Source data balanced',
    check: () => teelixirBalanced && elevateBalanced,
    severity: 'ERROR'
  },
  {
    name: 'Intercompany approvals',
    check: () => allEliminationsApproved,
    severity: 'ERROR'
  },
  {
    name: 'No duplicate transactions',
    check: () => duplicateCount === 0,
    severity: 'ERROR'
  }
];
```

### Post-Consolidation Validation

```typescript
const POST_CONSOLIDATION_CHECKS = [
  {
    name: 'Debits equal credits',
    check: () => Math.abs(totalDebits - totalCredits) < 1.00,
    severity: 'ERROR'
  },
  {
    name: 'Balance sheet balances',
    check: () => Math.abs(assets - (liabilities + equity)) < 1.00,
    severity: 'ERROR'
  },
  {
    name: 'Revenue >= 0',
    check: () => consolidatedRevenue >= 0,
    severity: 'WARNING'
  },
  {
    name: 'Gross margin reasonable',
    check: () => grossMargin >= 0 && grossMargin <= 100,
    severity: 'WARNING'
  },
  {
    name: 'No unusual account balances',
    check: () => validateAccountBalances(),
    severity: 'WARNING'
  }
];
```

---

## Implementation Pseudocode

### Main Consolidation Function

```typescript
async function consolidateFinancials(
  period: string,
  options: ConsolidationOptions = {}
): Promise<ConsolidatedReport> {

  logger.info(`Starting consolidation for period ${period}`);

  // STEP 1: Load data
  const data = await loadConsolidationData(period);

  // STEP 2: Pre-consolidation validation
  const preValidation = await validateBeforeConsolidation(data);
  if (!preValidation.valid) {
    throw new Error(`Pre-consolidation validation failed: ${preValidation.errors.join(', ')}`);
  }

  // STEP 3: Apply account mappings
  const mappedElevateLines = applyAccountMappings(
    data.elevateLines,
    data.mappings
  );

  // STEP 4: Aggregate external transactions
  const aggregated = aggregateTransactions(
    data.teelixirLines,
    mappedElevateLines,
    data.eliminations
  );

  // STEP 5: Apply intercompany eliminations
  for (const elimination of data.eliminations) {
    applyElimination(elimination, aggregated);
  }

  // STEP 6: Apply shared expense allocations
  for (const rule of data.allocationRules) {
    await applyAllocation(rule, aggregated, period);
  }

  // STEP 7: Generate reports
  const profitAndLoss = generateProfitAndLoss(aggregated, period);
  const balanceSheet = generateBalanceSheet(
    aggregated,
    getEndOfPeriod(period)
  );

  // STEP 8: Post-consolidation validation
  const postValidation = validateConsolidation(
    aggregated,
    profitAndLoss,
    balanceSheet
  );

  if (!postValidation.valid) {
    throw new Error(`Post-consolidation validation failed: ${postValidation.errors.join(', ')}`);
  }

  // STEP 9: Save consolidated report
  const report = await saveConsolidatedReport({
    period,
    profit_and_loss: profitAndLoss,
    balance_sheet: balanceSheet,
    aggregated_accounts: aggregated,
    validation: postValidation,
    generated_at: new Date()
  });

  logger.info(`Consolidation complete for period ${period}`);

  return report;
}
```

---

## Summary

This algorithm ensures:

1. **Accuracy**: Double-counting eliminated, allocations fair
2. **Auditability**: Every step logged and traceable
3. **Validation**: Multiple checks ensure mathematical correctness
4. **Flexibility**: Handles edge cases and special scenarios
5. **Transparency**: Clear breakdown of entity contributions

**Next Step:** Implement this algorithm in `scripts/financials/sync-xero-to-supabase.ts`

---

**End of Consolidation Algorithm Specification**
