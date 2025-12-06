# Consolidated Financials Testing Plan

**Project**: Teelixir + Elevate Wholesale Consolidated Financials
**Purpose**: Define comprehensive testing strategy for all components
**Last Updated**: 2025-11-21

---

## Table of Contents

1. [Testing Overview](#testing-overview)
2. [Unit Tests](#unit-tests)
3. [Integration Tests](#integration-tests)
4. [End-to-End Tests](#end-to-end-tests)
5. [User Acceptance Tests](#user-acceptance-tests)
6. [Performance Tests](#performance-tests)
7. [Security Tests](#security-tests)
8. [Test Data](#test-data)
9. [Success Criteria](#success-criteria)

---

## Testing Overview

### Testing Pyramid

```
                    ▲
                   ╱ ╲
                  ╱ E2E╲           10 tests (full workflow)
                 ╱───────╲
                ╱         ╲
               ╱Integration╲       30 tests (API + DB)
              ╱─────────────╲
             ╱               ╲
            ╱   Unit Tests    ╲    100+ tests (logic)
           ╱___________________╲
```

### Testing Phases

| Phase | Focus | When | Who |
|-------|-------|------|-----|
| **Unit** | Individual functions | During development | Developer |
| **Integration** | API + DB interactions | After module complete | Developer |
| **E2E** | Full workflow | Before user testing | Developer |
| **UAT** | Business accuracy | Before production | jayson@teelixir.com |
| **Performance** | Speed & scale | Before automation | Developer |
| **Security** | Access & vulnerabilities | Before production | Developer |

---

## Unit Tests

### Purpose

Test individual functions in isolation to ensure correct logic.

### Test Framework

```bash
# Using Jest for TypeScript
npm install --save-dev jest @types/jest ts-jest
```

### Test Location

```
test/
├── unit/
│   ├── account-mapping.test.ts
│   ├── intercompany-detection.test.ts
│   ├── consolidation-algorithm.test.ts
│   ├── validation.test.ts
│   └── allocation.test.ts
```

---

### Test Suite 1: Account Mapping Logic

**File:** `test/unit/account-mapping.test.ts`

```typescript
import { suggestMappings, calculateStringSimilarity } from '@/scripts/financials/suggest-mappings';

describe('Account Mapping', () => {

  describe('calculateStringSimilarity', () => {

    test('identical strings should return 1.0', () => {
      const result = calculateStringSimilarity('Sales', 'Sales');
      expect(result).toBe(1.0);
    });

    test('completely different strings should return 0.0', () => {
      const result = calculateStringSimilarity('Revenue', 'Expenses');
      expect(result).toBeLessThan(0.3);
    });

    test('similar strings should return high similarity', () => {
      const result = calculateStringSimilarity(
        'Advertising & Marketing',
        'Advertising and Marketing'
      );
      expect(result).toBeGreaterThan(0.8);
    });

    test('should be case insensitive', () => {
      const result = calculateStringSimilarity('SALES', 'sales');
      expect(result).toBe(1.0);
    });
  });

  describe('suggestMappings', () => {

    const teelixirAccounts = [
      { id: 't1', code: '200', name: 'Sales', type: 'REVENUE' },
      { id: 't2', code: '500', name: 'Cost of Sales', type: 'DIRECTCOSTS' },
      { id: 't3', code: '450', name: 'Advertising and Marketing', type: 'EXPENSE' }
    ];

    const elevateAccounts = [
      { id: 'e1', code: '200', name: 'Revenue', type: 'REVENUE' },
      { id: 'e2', code: '310', name: 'Cost of Goods Sold', type: 'DIRECTCOSTS' },
      { id: 'e3', code: '515', name: 'Advertising & Marketing', type: 'EXPENSE' }
    ];

    test('exact code match should have 98% confidence', () => {
      const mappings = suggestMappings(elevateAccounts, teelixirAccounts);
      const mapping = mappings.find(m => m.elevate_account_id === 'e1');

      expect(mapping.teelixir_account_id).toBe('t1');
      expect(mapping.confidence_score).toBe(98);
      expect(mapping.mapping_strategy).toBe('exact_code_match');
    });

    test('similar name match should have 70-85% confidence', () => {
      const mappings = suggestMappings(elevateAccounts, teelixirAccounts);
      const mapping = mappings.find(m => m.elevate_account_id === 'e3');

      expect(mapping.teelixir_account_id).toBe('t3');
      expect(mapping.confidence_score).toBeGreaterThanOrEqual(70);
      expect(mapping.confidence_score).toBeLessThanOrEqual(85);
      expect(mapping.mapping_strategy).toBe('similar_name_match');
    });

    test('no match should return 0% confidence with null target', () => {
      const unmatchedAccount = [
        { id: 'e4', code: '999', name: 'Unique Account', type: 'EXPENSE' }
      ];
      const mappings = suggestMappings(unmatchedAccount, teelixirAccounts);

      expect(mappings[0].teelixir_account_id).toBeNull();
      expect(mappings[0].confidence_score).toBe(0);
      expect(mappings[0].mapping_strategy).toBe('no_match');
    });
  });
});
```

**Expected Results:**
- All tests pass
- Coverage: >90%

---

### Test Suite 2: Intercompany Detection Logic

**File:** `test/unit/intercompany-detection.test.ts`

```typescript
import { calculateMatchConfidence, detectRevenueCogsPairs } from '@/scripts/financials/detect-intercompany';

describe('Intercompany Detection', () => {

  describe('calculateMatchConfidence', () => {

    test('exact amount and date should score 70+', () => {
      const txn1 = {
        net_amount: 10000,
        date: new Date('2024-11-15'),
        description: 'Sale to Elevate',
        account_type: 'REVENUE'
      };
      const txn2 = {
        net_amount: 10000,
        date: new Date('2024-11-15'),
        description: 'Purchase from Teelixir',
        account_type: 'DIRECTCOSTS'
      };

      const confidence = calculateMatchConfidence(txn1, txn2);
      expect(confidence).toBeGreaterThanOrEqual(70);
    });

    test('different amounts should score low', () => {
      const txn1 = {
        net_amount: 10000,
        date: new Date('2024-11-15'),
        description: 'Sale',
        account_type: 'REVENUE'
      };
      const txn2 = {
        net_amount: 5000,
        date: new Date('2024-11-15'),
        description: 'Purchase',
        account_type: 'DIRECTCOSTS'
      };

      const confidence = calculateMatchConfidence(txn1, txn2);
      expect(confidence).toBeLessThan(50);
    });

    test('amount within 2% tolerance should score high', () => {
      const txn1 = {
        net_amount: 10000,
        date: new Date('2024-11-15'),
        description: 'Sale',
        account_type: 'REVENUE'
      };
      const txn2 = {
        net_amount: 10100, // 1% difference
        date: new Date('2024-11-15'),
        description: 'Purchase',
        account_type: 'DIRECTCOSTS'
      };

      const confidence = calculateMatchConfidence(txn1, txn2);
      expect(confidence).toBeGreaterThanOrEqual(60);
    });

    test('dates >14 days apart should score low', () => {
      const txn1 = {
        net_amount: 10000,
        date: new Date('2024-11-01'),
        description: 'Sale',
        account_type: 'REVENUE'
      };
      const txn2 = {
        net_amount: 10000,
        date: new Date('2024-11-20'), // 19 days apart
        description: 'Purchase',
        account_type: 'DIRECTCOSTS'
      };

      const confidence = calculateMatchConfidence(txn1, txn2);
      expect(confidence).toBeLessThan(70);
    });

    test('entity names in description should boost score', () => {
      const txn1 = {
        net_amount: 10000,
        date: new Date('2024-11-15'),
        description: 'Sale to Elevate Wholesale',
        account_type: 'REVENUE'
      };
      const txn2 = {
        net_amount: 10000,
        date: new Date('2024-11-15'),
        description: 'Purchase from Teelixir',
        account_type: 'DIRECTCOSTS'
      };

      const confidence = calculateMatchConfidence(txn1, txn2);
      expect(confidence).toBeGreaterThanOrEqual(80);
    });
  });

  describe('detectRevenueCogsPairs', () => {

    test('should detect matching revenue/cogs pair', async () => {
      const teelixirTxns = [
        {
          id: 't1',
          account_type: 'REVENUE',
          net_amount: 12450,
          date: new Date('2024-11-15'),
          description: 'Wholesale - Elevate'
        }
      ];
      const elevateTxns = [
        {
          id: 'e1',
          account_type: 'DIRECTCOSTS',
          net_amount: 12450,
          date: new Date('2024-11-16'),
          description: 'Purchase from Teelixir'
        }
      ];

      const matches = await detectRevenueCogsPairs(teelixirTxns, elevateTxns);

      expect(matches.length).toBe(1);
      expect(matches[0].teelixir_transaction_id).toBe('t1');
      expect(matches[0].elevate_transaction_id).toBe('e1');
      expect(matches[0].match_type).toBe('revenue_cogs');
      expect(matches[0].confidence_score).toBeGreaterThanOrEqual(80);
    });

    test('should not match if confidence < threshold', async () => {
      const teelixirTxns = [
        {
          id: 't1',
          account_type: 'REVENUE',
          net_amount: 10000,
          date: new Date('2024-11-01'),
          description: 'Sale'
        }
      ];
      const elevateTxns = [
        {
          id: 'e1',
          account_type: 'DIRECTCOSTS',
          net_amount: 5000, // Different amount
          date: new Date('2024-11-20'), // Different date
          description: 'Purchase'
        }
      ];

      const matches = await detectRevenueCogsPairs(teelixirTxns, elevateTxns);

      expect(matches.length).toBe(0);
    });
  });
});
```

**Expected Results:**
- All tests pass
- Coverage: >85%

---

### Test Suite 3: Consolidation Algorithm

**File:** `test/unit/consolidation-algorithm.test.ts`

```typescript
import {
  applyAccountMappings,
  aggregateTransactions,
  applyRevenueCOGSElimination,
  generateProfitAndLoss
} from '@/scripts/financials/consolidation';

describe('Consolidation Algorithm', () => {

  describe('applyAccountMappings', () => {

    test('should map Elevate accounts to Teelixir accounts', () => {
      const elevateLines = [
        {
          account_id: 'e-310',
          account_code: '310',
          account_name: 'COGS',
          net_amount: 5000
        }
      ];
      const mappings = [
        {
          source_account_id: 'e-310',
          target_account_id: 't-500',
          target_account_code: '500',
          target_account_name: 'Cost of Sales'
        }
      ];

      const mapped = applyAccountMappings(elevateLines, mappings);

      expect(mapped[0].account_id).toBe('t-500');
      expect(mapped[0].account_code).toBe('500');
      expect(mapped[0].account_name).toBe('Cost of Sales');
      expect(mapped[0].original_account_id).toBe('e-310');
      expect(mapped[0].mapping_applied).toBe(true);
    });

    test('should throw error if account not mapped', () => {
      const elevateLines = [
        { account_id: 'e-999', account_code: '999', net_amount: 1000 }
      ];
      const mappings = [];

      expect(() => {
        applyAccountMappings(elevateLines, mappings);
      }).toThrow('No mapping found');
    });
  });

  describe('aggregateTransactions', () => {

    test('should sum transactions by account', () => {
      const teelixirLines = [
        { account_id: 't-200', account_type: 'REVENUE', net_amount: 10000 },
        { account_id: 't-200', account_type: 'REVENUE', net_amount: 5000 }
      ];
      const elevateLines = [
        { account_id: 't-200', account_type: 'REVENUE', net_amount: 3000 }
      ];
      const eliminations = [];

      const aggregated = aggregateTransactions(
        teelixirLines,
        elevateLines,
        eliminations
      );

      expect(aggregated['t-200'].net_total).toBe(18000);
      expect(aggregated['t-200'].transaction_count).toBe(3);
    });

    test('should exclude eliminated transactions', () => {
      const teelixirLines = [
        { id: 't1', account_id: 't-200', net_amount: 10000 }
      ];
      const elevateLines = [
        { id: 'e1', account_id: 't-500', net_amount: 10000 }
      ];
      const eliminations = [
        { teelixir_line_id: 't1', elevate_line_id: 'e1' }
      ];

      const aggregated = aggregateTransactions(
        teelixirLines,
        elevateLines,
        eliminations
      );

      expect(aggregated['t-200']).toBeUndefined();
      expect(aggregated['t-500']).toBeUndefined();
    });
  });

  describe('applyRevenueCOGSElimination', () => {

    test('should reduce revenue and COGS by elimination amount', () => {
      const aggregated = {
        't-200': { account_type: 'REVENUE', net_total: 20000 },
        't-500': { account_type: 'DIRECTCOSTS', net_total: -15000 }
      };
      const elimination = {
        teelixir_account_id: 't-200',
        elevate_account_id: 't-500',
        amount: 10000
      };

      applyRevenueCOGSElimination(elimination, aggregated);

      expect(aggregated['t-200'].net_total).toBe(10000);
      expect(aggregated['t-500'].net_total).toBe(-5000);
    });
  });

  describe('generateProfitAndLoss', () => {

    test('should calculate gross profit correctly', () => {
      const aggregated = {
        't-200': { account_type: 'REVENUE', net_total: 80000 },
        't-500': { account_type: 'DIRECTCOSTS', net_total: -28000 }
      };

      const pl = generateProfitAndLoss(aggregated, '2024-11');

      expect(pl.revenue).toBe(80000);
      expect(pl.cogs).toBe(28000);
      expect(pl.gross_profit).toBe(52000);
      expect(pl.gross_margin_pct).toBeCloseTo(65.0, 1);
    });

    test('should calculate net profit correctly', () => {
      const aggregated = {
        't-200': { account_type: 'REVENUE', net_total: 80000 },
        't-500': { account_type: 'DIRECTCOSTS', net_total: -28000 },
        't-600': { account_type: 'EXPENSE', net_total: -36000 }
      };

      const pl = generateProfitAndLoss(aggregated, '2024-11');

      expect(pl.gross_profit).toBe(52000);
      expect(pl.operating_expenses).toBe(36000);
      expect(pl.net_profit_before_tax).toBe(16000);
    });
  });
});
```

**Expected Results:**
- All tests pass
- Coverage: >90%

---

## Integration Tests

### Purpose

Test interactions between components, APIs, and database.

### Test Location

```
test/
├── integration/
│   ├── xero-api.test.ts
│   ├── supabase-sync.test.ts
│   ├── mapping-workflow.test.ts
│   └── consolidation-workflow.test.ts
```

---

### Test Suite 4: Xero API Integration

**File:** `test/integration/xero-api.test.ts`

```typescript
import { XeroClient } from '@/shared/libs/integrations/xero/client';

describe('Xero API Integration', () => {

  let xeroClient: XeroClient;

  beforeAll(async () => {
    // Use test credentials
    xeroClient = new XeroClient({
      clientId: process.env.XERO_TEST_CLIENT_ID,
      clientSecret: process.env.XERO_TEST_CLIENT_SECRET,
      organizationId: process.env.XERO_TEST_ORG_ID
    });
    await xeroClient.authenticate();
  });

  test('should fetch chart of accounts', async () => {
    const accounts = await xeroClient.getAccounts();

    expect(accounts).toBeInstanceOf(Array);
    expect(accounts.length).toBeGreaterThan(0);
    expect(accounts[0]).toHaveProperty('code');
    expect(accounts[0]).toHaveProperty('name');
    expect(accounts[0]).toHaveProperty('type');
  });

  test('should fetch journal lines for period', async () => {
    const journals = await xeroClient.getJournalLines({
      from: '2024-11-01',
      to: '2024-11-30'
    });

    expect(journals).toBeInstanceOf(Array);
    if (journals.length > 0) {
      expect(journals[0]).toHaveProperty('date');
      expect(journals[0]).toHaveProperty('net_amount');
      expect(journals[0]).toHaveProperty('account_code');
    }
  });

  test('should handle rate limiting gracefully', async () => {
    // Make 65 requests quickly to trigger rate limit
    const promises = [];
    for (let i = 0; i < 65; i++) {
      promises.push(xeroClient.getOrganization());
    }

    await expect(Promise.all(promises)).resolves.not.toThrow();
  });

  test('should refresh expired tokens automatically', async () => {
    // Mock expired token
    xeroClient.setToken({
      access_token: 'expired',
      expires_at: Date.now() - 1000
    });

    // Should auto-refresh and not throw
    const accounts = await xeroClient.getAccounts();
    expect(accounts).toBeInstanceOf(Array);
  });
});
```

**Expected Results:**
- All tests pass
- No API errors
- Rate limiting works

---

### Test Suite 5: Supabase Sync

**File:** `test/integration/supabase-sync.test.ts`

```typescript
import { SupabaseClient } from '@supabase/supabase-js';
import { syncJournalLinesToSupabase } from '@/scripts/financials/sync-xero-to-supabase';

describe('Supabase Sync Integration', () => {

  let supabase: SupabaseClient;

  beforeAll(() => {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  });

  afterEach(async () => {
    // Clean up test data
    await supabase.from('journal_lines').delete().eq('sync_id', 'test-sync');
  });

  test('should sync journal lines to Supabase', async () => {
    const testLines = [
      {
        organization_id: 'test-org',
        journal_id: 'j1',
        date: '2024-11-15',
        account_code: '200',
        net_amount: 10000,
        sync_id: 'test-sync'
      }
    ];

    await syncJournalLinesToSupabase(testLines);

    const { data, error } = await supabase
      .from('journal_lines')
      .select('*')
      .eq('sync_id', 'test-sync');

    expect(error).toBeNull();
    expect(data.length).toBe(1);
    expect(data[0].account_code).toBe('200');
    expect(data[0].net_amount).toBe(10000);
  });

  test('should not create duplicate journal lines', async () => {
    const testLine = {
      organization_id: 'test-org',
      journal_id: 'j1',
      line_number: 1,
      date: '2024-11-15',
      account_code: '200',
      net_amount: 10000,
      sync_id: 'test-sync'
    };

    // Sync twice
    await syncJournalLinesToSupabase([testLine]);
    await syncJournalLinesToSupabase([testLine]);

    const { data } = await supabase
      .from('journal_lines')
      .select('*')
      .eq('sync_id', 'test-sync');

    expect(data.length).toBe(1); // Should not duplicate
  });

  test('should save account mappings', async () => {
    const mapping = {
      source_org_id: 'elevate',
      target_org_id: 'teelixir',
      source_account_id: 'e-310',
      target_account_id: 't-500',
      confidence_score: 98,
      approval_status: 'approved'
    };

    const { error } = await supabase
      .from('account_mappings')
      .insert(mapping);

    expect(error).toBeNull();
  });
});
```

**Expected Results:**
- All tests pass
- No duplicate data
- Constraints enforced

---

## End-to-End Tests

### Purpose

Test complete workflows from start to finish.

### Test Location

```
test/
├── e2e/
│   ├── full-consolidation.test.ts
│   ├── monthly-sync-workflow.test.ts
│   └── dashboard-export.test.ts
```

---

### Test Suite 6: Full Consolidation Workflow

**File:** `test/e2e/full-consolidation.test.ts`

```typescript
describe('Full Consolidation Workflow (E2E)', () => {

  test('complete consolidation from Xero to report', async () => {

    // STEP 1: Fetch data from Xero
    const teelixirData = await xeroClient.getJournalLines({
      organizationId: 'teelixir',
      period: '2024-11'
    });
    const elevateData = await xeroClient.getJournalLines({
      organizationId: 'elevate',
      period: '2024-11'
    });

    expect(teelixirData.length).toBeGreaterThan(0);
    expect(elevateData.length).toBeGreaterThan(0);

    // STEP 2: Apply account mappings
    const mappings = await loadAccountMappings();
    const mappedElevateData = applyAccountMappings(elevateData, mappings);

    expect(mappedElevateData[0].mapping_applied).toBe(true);

    // STEP 3: Detect intercompany transactions
    const intercompanyMatches = await detectIntercompanyTransactions(
      teelixirData,
      mappedElevateData
    );

    expect(intercompanyMatches.length).toBeGreaterThan(0);

    // STEP 4: Aggregate and consolidate
    const aggregated = aggregateTransactions(
      teelixirData,
      mappedElevateData,
      intercompanyMatches
    );

    // STEP 5: Generate reports
    const profitAndLoss = generateProfitAndLoss(aggregated, '2024-11');
    const balanceSheet = generateBalanceSheet(aggregated, '2024-11-30');

    expect(profitAndLoss.revenue).toBeGreaterThan(0);
    expect(balanceSheet.total_assets).toBeGreaterThan(0);
    expect(balanceSheet.balanced).toBe(true);

    // STEP 6: Validate consolidation
    const validation = validateConsolidation(
      aggregated,
      profitAndLoss,
      balanceSheet
    );

    expect(validation.valid).toBe(true);
    expect(validation.errors.length).toBe(0);

    // STEP 7: Save to Supabase
    const reportId = await saveConsolidatedReport({
      period: '2024-11',
      profit_and_loss: profitAndLoss,
      balance_sheet: balanceSheet
    });

    expect(reportId).toBeDefined();
  });
});
```

**Expected Results:**
- Workflow completes end-to-end
- No errors thrown
- Reports generated successfully
- Data saved to Supabase

---

## User Acceptance Tests

### Purpose

Validate that the system meets business requirements and produces accurate financial reports.

### Test Participants

- jayson@teelixir.com (Primary)
- peter@teelixir.com (Secondary)
- Accountant (if applicable)

---

### UAT Suite: Financial Accuracy

#### UAT-1: Consolidated Revenue Accuracy

**Objective:** Verify consolidated revenue matches expected calculation

**Test Data:** November 2024

**Steps:**
1. Export Teelixir P&L from Xero for Nov 2024
2. Export Elevate P&L from Xero for Nov 2024
3. Run consolidation script
4. Compare consolidated revenue

**Expected Result:**
```
Teelixir Revenue:     $60,000
Elevate Revenue:      $30,000
Simple Total:         $90,000
Intercompany Sale:   -$10,000
Consolidated Revenue: $80,000 ✓
```

**Acceptance Criteria:**
- [ ] Consolidated revenue matches manual calculation
- [ ] Intercompany transactions identified correctly
- [ ] Variance < 0.1% or $100 (whichever is greater)

**Actual Result:** `__________`

**Status:** ☐ PASS ☐ FAIL

**Notes:** `_________________________________`

---

#### UAT-2: Gross Profit Margin

**Objective:** Verify gross profit calculation and margin

**Test Data:** November 2024

**Steps:**
1. Review consolidated P&L
2. Calculate gross profit: Revenue - COGS
3. Calculate margin: (Gross Profit / Revenue) × 100

**Expected Result:**
```
Revenue:      $80,000
COGS:         $28,000
Gross Profit: $52,000
Gross Margin: 65.0%
```

**Acceptance Criteria:**
- [ ] Gross profit calculation correct
- [ ] Gross margin percentage reasonable (40-70% for product business)
- [ ] Matches or close to historical margins

**Actual Result:** `__________`

**Status:** ☐ PASS ☐ FAIL

---

#### UAT-3: Intercompany Elimination Accuracy

**Objective:** Verify that all intercompany transactions are eliminated

**Test Data:** Sample intercompany sale ($12,450)

**Steps:**
1. Identify a known intercompany transaction
2. Verify it appears in both organizations
3. Confirm it's detected by the algorithm
4. Verify it's eliminated from consolidated report

**Expected Result:**
```
Teelixir: Revenue +$12,450 (to Elevate)
Elevate:  COGS +$12,450 (from Teelixir)
Detection: Confidence 93%
Elimination: -$12,450 from both
Net Effect: $0 in consolidated
```

**Acceptance Criteria:**
- [ ] Transaction detected automatically
- [ ] Confidence score >80%
- [ ] Full amount eliminated (not partial)
- [ ] No trace in consolidated P&L

**Actual Result:** `__________`

**Status:** ☐ PASS ☐ FAIL

---

#### UAT-4: Balance Sheet Balancing

**Objective:** Verify balance sheet equation holds

**Test Data:** November 2024 (end of period)

**Steps:**
1. Review consolidated balance sheet
2. Verify: Assets = Liabilities + Equity

**Expected Result:**
```
Total Assets:              $450,000
Total Liabilities:         $180,000
Total Equity:              $270,000
Liabilities + Equity:      $450,000 ✓
Balanced: YES
```

**Acceptance Criteria:**
- [ ] Assets = Liabilities + Equity (exact)
- [ ] No rounding errors > $1
- [ ] All accounts categorized correctly

**Actual Result:** `__________`

**Status:** ☐ PASS ☐ FAIL

---

#### UAT-5: Shared Expense Allocation

**Objective:** Verify shared expenses allocated correctly

**Test Data:** Rent ($6,000 paid by Teelixir)

**Steps:**
1. Identify shared expenses
2. Review allocation method (revenue ratio, headcount, etc.)
3. Verify allocation percentages
4. Confirm amounts match

**Expected Result:**
```
Rent Paid by Teelixir: $6,000
Allocation Method: Revenue Ratio (62.5% / 37.5%)
Teelixir Share: $3,750
Elevate Share: $2,250
Total: $6,000 ✓
```

**Acceptance Criteria:**
- [ ] Allocation method appropriate
- [ ] Percentages calculated correctly
- [ ] Total matches amount paid
- [ ] Both entities show their share

**Actual Result:** `__________`

**Status:** ☐ PASS ☐ FAIL

---

#### UAT-6: Dashboard Usability

**Objective:** Verify dashboard is user-friendly and displays correct data

**Test Data:** Access dashboard at financials.growthhq.com

**Steps:**
1. Log in with Google account
2. Navigate to consolidated P&L
3. Review data presentation
4. Export report to Excel
5. Check drill-down functionality

**Expected Result:**
- Dashboard loads < 3 seconds
- Data matches consolidation report
- Export works correctly
- Charts/graphs accurate
- Can drill down to transaction details

**Acceptance Criteria:**
- [ ] Dashboard intuitive to use
- [ ] Data presentation clear
- [ ] Export includes all necessary data
- [ ] Performance acceptable
- [ ] Mobile-friendly (optional)

**Actual Result:** `__________`

**Status:** ☐ PASS ☐ FAIL

---

## Performance Tests

### Purpose

Ensure system performs well under load and with large datasets.

### Test Scenarios

#### Performance Test 1: Large Dataset Sync

**Scenario:** Sync 12 months of historical data

**Test Data:**
- Teelixir: ~15,000 journal lines
- Elevate: ~10,000 journal lines
- Total: ~25,000 lines

**Metrics:**
- Sync duration: Should complete < 5 minutes
- Memory usage: Should not exceed 1GB
- API calls: Should respect rate limits (60/min)

**Expected Result:**
```
Data Fetched: 25,000 lines
Duration: 3 minutes 45 seconds
Memory: 580 MB
API Calls: 247 (avg 1.1/second)
Status: PASS ✓
```

---

#### Performance Test 2: Consolidation Speed

**Scenario:** Generate consolidated report from 1 month of data

**Test Data:**
- 2,000+ transactions
- 100+ accounts
- 15+ intercompany eliminations

**Metrics:**
- Processing time: < 30 seconds
- Report generation: < 10 seconds
- Total: < 1 minute

**Expected Result:**
```
Load Data: 5 seconds
Apply Mappings: 8 seconds
Detect Intercompany: 12 seconds
Generate Reports: 6 seconds
Total: 31 seconds
Status: PASS ✓
```

---

## Security Tests

### Purpose

Ensure no security vulnerabilities or unauthorized access.

### Test Scenarios

#### Security Test 1: Authentication

**Test:** Attempt to access dashboard without login

**Expected:** Redirect to Google OAuth login

**Status:** ☐ PASS ☐ FAIL

---

#### Security Test 2: Authorization

**Test:** Attempt to access with non-approved email

**Expected:** Access denied message

**Status:** ☐ PASS ☐ FAIL

---

#### Security Test 3: Data Exposure

**Test:** Check for sensitive data in API responses

**Expected:** No credentials, tokens, or PII exposed

**Status:** ☐ PASS ☐ FAIL

---

#### Security Test 4: SQL Injection

**Test:** Attempt SQL injection in dashboard filters

**Expected:** Input sanitized, no SQL execution

**Status:** ☐ PASS ☐ FAIL

---

## Test Data

### Sample Test Dataset

Create test data for repeatable testing:

**File:** `test/fixtures/sample-data.json`

```json
{
  "teelixir_accounts": [
    { "code": "200", "name": "Sales", "type": "REVENUE" },
    { "code": "500", "name": "Cost of Sales", "type": "DIRECTCOSTS" },
    { "code": "600", "name": "Rent", "type": "EXPENSE" }
  ],
  "elevate_accounts": [
    { "code": "310", "name": "Revenue", "type": "REVENUE" },
    { "code": "400", "name": "COGS", "type": "DIRECTCOSTS" }
  ],
  "teelixir_transactions": [
    {
      "date": "2024-11-15",
      "account": "200",
      "amount": 10000,
      "description": "Sale to Elevate"
    },
    {
      "date": "2024-11-20",
      "account": "600",
      "amount": -6000,
      "description": "Rent - Shared warehouse"
    }
  ],
  "elevate_transactions": [
    {
      "date": "2024-11-16",
      "account": "400",
      "amount": -10000,
      "description": "Purchase from Teelixir"
    }
  ]
}
```

---

## Success Criteria

### Overall Testing Success

- [ ] **Unit Tests**: >90% coverage, all pass
- [ ] **Integration Tests**: All API/DB interactions work
- [ ] **E2E Tests**: Full workflow completes successfully
- [ ] **UAT Tests**: All 6 UAT tests pass
- [ ] **Performance Tests**: Meet speed/memory targets
- [ ] **Security Tests**: No vulnerabilities found

### Financial Accuracy

- [ ] Consolidated revenue within 0.1% of manual calculation
- [ ] Gross profit margin reasonable (40-70%)
- [ ] All intercompany transactions detected and eliminated
- [ ] Balance sheet balances exactly
- [ ] Shared expenses allocated correctly

### User Acceptance

- [ ] jayson@teelixir.com approves accuracy
- [ ] Dashboard usable and intuitive
- [ ] Reports suitable for board presentation
- [ ] Export functionality works as needed

---

## Test Execution Schedule

| Phase | Duration | When |
|-------|----------|------|
| Unit Tests | 2 days | During Phase 4-5 development |
| Integration Tests | 1 day | After each phase complete |
| E2E Tests | 1 day | Before Phase 6 (dashboard) |
| UAT | 2 days | After Phase 6 complete |
| Performance Tests | 1 day | Before Phase 7 (automation) |
| Security Tests | 1 day | Before production deployment |

**Total Testing Time:** ~8 days (included in 6-8 week estimate)

---

**End of Testing Plan**
