# Phase 4 Detailed Specification: Account Mapping & Intercompany Detection

**Project**: Consolidated Financials - Teelixir + Elevate Wholesale
**Phase**: 4 of 7
**Status**: Specification
**Last Updated**: 2025-11-21

---

## Overview

Phase 4 implements the critical mapping and detection logic that enables accurate consolidation:

1. **Account Mapping**: Map Elevate Wholesale accounts → Teelixir accounts
2. **Intercompany Detection**: Identify transactions between the two entities
3. **Data Validation**: Ensure mappings and detections are accurate

**Success Criteria:**
- ✅ All accounts mapped with confidence scores
- ✅ High-confidence mappings (>90%) approved automatically
- ✅ Medium/low-confidence mappings reviewed manually
- ✅ Intercompany transactions detected with >95% accuracy
- ✅ All detections validated before automation

---

## Part 1: Account Mapping Workflow

### 1.1 Command: `suggest-mappings.ts`

**Purpose**: Interactive CLI to review and approve AI-suggested account mappings

**Usage:**
```bash
npx tsx scripts/financials/suggest-mappings.ts [options]

Options:
  --auto-approve-threshold <number>  Auto-approve confidence >= threshold (default: 95)
  --show-all                         Show all mappings including approved
  --export <file>                    Export mappings to JSON file
  --import <file>                    Import pre-approved mappings
  --review-only                      Show suggestions without saving
```

**Workflow:**

```
┌─────────────────────────────────────────────┐
│  1. Load account analysis from COA analyzer │
│     (account-analysis.json)                 │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  2. Load existing mappings from Supabase    │
│     (account_mappings table)                │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  3. For each Elevate account:               │
│     - Check if already mapped               │
│     - If not, show AI suggestion            │
│     - Display confidence score              │
│     - Show account details (code, name)     │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  4. User Decision:                          │
│     [A] Approve  [R] Reject  [M] Manual     │
│     [S] Skip     [Q] Quit                   │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  5. Save approved mappings to Supabase      │
│     - Insert into account_mappings          │
│     - Set approval_status = 'approved'      │
│     - Set approved_by = user email          │
│     - Set approved_at = timestamp           │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  6. Generate summary report:                │
│     - Total accounts mapped                 │
│     - Auto-approved count                   │
│     - Manually reviewed count               │
│     - Rejected count                        │
│     - Unmapped count                        │
└─────────────────────────────────────────────┘
```

### 1.2 Mapping Algorithm

**Input:** Accounts from both organizations (from `analyze-chart-of-accounts.ts`)

**Output:** Suggested mappings with confidence scores

**Algorithm:**

```typescript
interface AccountMapping {
  elevate_account_id: string;      // Source account
  teelixir_account_id: string;     // Target account
  confidence_score: number;         // 0-100
  mapping_strategy: string;         // Which rule matched
  notes: string;                    // Explanation
}

function suggestMappings(
  elevateAccounts: Account[],
  teelixirAccounts: Account[]
): AccountMapping[] {

  const mappings: AccountMapping[] = [];

  for (const elevateAcc of elevateAccounts) {

    // STRATEGY 1: Exact Code Match (Confidence: 98%)
    const exactCodeMatch = teelixirAccounts.find(
      t => t.code === elevateAcc.code && t.type === elevateAcc.type
    );
    if (exactCodeMatch) {
      mappings.push({
        elevate_account_id: elevateAcc.id,
        teelixir_account_id: exactCodeMatch.id,
        confidence_score: 98,
        mapping_strategy: 'exact_code_match',
        notes: `Code ${elevateAcc.code} matches exactly`
      });
      continue;
    }

    // STRATEGY 2: Exact Name Match (Confidence: 95%)
    const exactNameMatch = teelixirAccounts.find(
      t => t.name.toLowerCase() === elevateAcc.name.toLowerCase()
        && t.type === elevateAcc.type
    );
    if (exactNameMatch) {
      mappings.push({
        elevate_account_id: elevateAcc.id,
        teelixir_account_id: exactNameMatch.id,
        confidence_score: 95,
        mapping_strategy: 'exact_name_match',
        notes: `Name "${elevateAcc.name}" matches exactly`
      });
      continue;
    }

    // STRATEGY 3: Similar Name + Same Type (Confidence: 70-85%)
    const similarNames = teelixirAccounts
      .filter(t => t.type === elevateAcc.type)
      .map(t => ({
        account: t,
        similarity: calculateStringSimilarity(elevateAcc.name, t.name)
      }))
      .filter(result => result.similarity >= 0.7)
      .sort((a, b) => b.similarity - a.similarity);

    if (similarNames.length > 0) {
      const best = similarNames[0];
      mappings.push({
        elevate_account_id: elevateAcc.id,
        teelixir_account_id: best.account.id,
        confidence_score: Math.round(best.similarity * 85),
        mapping_strategy: 'similar_name_match',
        notes: `"${elevateAcc.name}" similar to "${best.account.name}" (${Math.round(best.similarity * 100)}% match)`
      });
      continue;
    }

    // STRATEGY 4: Same Type + Class (Confidence: 50%)
    const sameTypeClass = teelixirAccounts.find(
      t => t.type === elevateAcc.type && t.class === elevateAcc.class
    );
    if (sameTypeClass) {
      mappings.push({
        elevate_account_id: elevateAcc.id,
        teelixir_account_id: sameTypeClass.id,
        confidence_score: 50,
        mapping_strategy: 'type_class_match',
        notes: `Same type (${elevateAcc.type}) and class (${elevateAcc.class})`
      });
      continue;
    }

    // STRATEGY 5: No Match Found (Confidence: 0%)
    // Create placeholder for manual mapping
    mappings.push({
      elevate_account_id: elevateAcc.id,
      teelixir_account_id: null,
      confidence_score: 0,
      mapping_strategy: 'no_match',
      notes: 'No automatic mapping found - requires manual review'
    });
  }

  return mappings;
}

// Levenshtein distance-based similarity
function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}
```

### 1.3 Interactive CLI Display

**Example Output:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  Account Mapping Review - Elevate Wholesale → Teelixir             │
│  Progress: 45/120 accounts reviewed (37%)                          │
└─────────────────────────────────────────────────────────────────────┘

╔═══════════════════════════════════════════════════════════════════╗
║  MAPPING SUGGESTION #46                                           ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  SOURCE (Elevate Wholesale):                                     ║
║  Code:  310                                                       ║
║  Name:  Sales - Wholesale                                         ║
║  Type:  REVENUE                                                   ║
║  Class: OPERATING                                                 ║
║                                                                   ║
║  ────────────────────────────────────────────────────────────    ║
║                                                                   ║
║  SUGGESTED TARGET (Teelixir):                                    ║
║  Code:  200                                                       ║
║  Name:  Sales - Wholesale                                         ║
║  Type:  REVENUE                                                   ║
║  Class: OPERATING                                                 ║
║                                                                   ║
║  ────────────────────────────────────────────────────────────    ║
║                                                                   ║
║  CONFIDENCE: ████████████████████░░ 95% (exact_name_match)       ║
║  REASON: Name "Sales - Wholesale" matches exactly                ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝

Options:
  [A] Approve this mapping
  [R] Reject and skip this account
  [M] Manual - choose different target account
  [S] Skip for now (review later)
  [Q] Quit and save progress

Your choice:
```

### 1.4 Manual Mapping Flow

If user selects [M] Manual:

```
Available Teelixir accounts (Type: REVENUE):

1. [200] Sales - Wholesale
2. [201] Sales - Retail
3. [202] Sales - Online
4. [203] Sales - Export
5. [299] Sales - Other

Enter account number (or 'c' to cancel):
```

### 1.5 Database Schema Usage

**Table: `account_mappings`**

```sql
INSERT INTO account_mappings (
  source_org_id,
  target_org_id,
  source_account_id,
  target_account_id,
  mapping_strategy,
  confidence_score,
  approval_status,
  approved_by,
  approved_at,
  notes
) VALUES (
  'elevate-org-id',
  'teelixir-org-id',
  'elevate-account-id',
  'teelixir-account-id',
  'exact_name_match',
  95,
  'approved',
  'jayson@teelixir.com',
  NOW(),
  'Name "Sales - Wholesale" matches exactly'
);
```

---

## Part 2: Intercompany Transaction Detection

### 2.1 Command: `detect-intercompany.ts`

**Purpose**: Identify transactions between Teelixir and Elevate Wholesale that need elimination

**Usage:**
```bash
npx tsx scripts/financials/detect-intercompany.ts [options]

Options:
  --period <YYYY-MM>       Analyze specific month (default: last month)
  --from <YYYY-MM-DD>      Start date
  --to <YYYY-MM-DD>        End date
  --threshold <number>     Match confidence threshold (default: 80)
  --export <file>          Export detections to JSON
  --dry-run                Show detections without saving
```

**Workflow:**

```
┌─────────────────────────────────────────────┐
│  1. Load journal lines from both orgs       │
│     - Teelixir sales to "Elevate"          │
│     - Elevate purchases from "Teelixir"    │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  2. Identify potential matches:             │
│     - Amount matching (± tolerance)         │
│     - Date proximity (± 7 days)             │
│     - Account type correlation              │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  3. Calculate confidence score:             │
│     - Exact amount: +40 points              │
│     - Same date: +30 points                 │
│     - Description match: +20 points         │
│     - Expected account: +10 points          │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  4. Display matches for review:             │
│     - Show paired transactions              │
│     - Highlight discrepancies               │
│     - Suggest elimination entries           │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  5. Save to intercompany_eliminations:      │
│     - Transaction pair IDs                  │
│     - Elimination amount                    │
│     - Confidence score                      │
│     - Approval status                       │
└─────────────────────────────────────────────┘
```

### 2.2 Intercompany Detection Algorithm

**Types of Intercompany Transactions:**

1. **Sales & COGS Elimination**
   - Teelixir sells to Elevate → Revenue (Teelixir) + COGS (Elevate)
   - Eliminate both to avoid double-counting

2. **Payables & Receivables Elimination**
   - Teelixir invoices Elevate → Accounts Receivable (Teelixir)
   - Elevate owes Teelixir → Accounts Payable (Elevate)
   - Net to zero in consolidated view

3. **Shared Expenses**
   - Expenses paid by one entity but benefit both
   - Allocate based on rules (revenue ratio, headcount, etc.)

**Detection Algorithm:**

```typescript
interface IntercompanyMatch {
  teelixir_transaction_id: string;
  elevate_transaction_id: string;
  match_type: 'revenue_cogs' | 'payable_receivable' | 'expense_allocation';
  confidence_score: number;
  amount_teelixir: number;
  amount_elevate: number;
  date_teelixir: Date;
  date_elevate: Date;
  elimination_amount: number;
  notes: string;
}

async function detectIntercompanyTransactions(
  period: { from: Date; to: Date }
): Promise<IntercompanyMatch[]> {

  const matches: IntercompanyMatch[] = [];

  // STEP 1: Load transactions from both orgs
  const teelixirTxns = await loadJournalLines('teelixir', period);
  const elevateTxns = await loadJournalLines('elevate', period);

  // STEP 2: Identify revenue/COGS pairs
  const revenueCogsPairs = await detectRevenueCogsPairs(
    teelixirTxns,
    elevateTxns
  );
  matches.push(...revenueCogsPairs);

  // STEP 3: Identify payable/receivable pairs
  const payableReceivablePairs = await detectPayableReceivablePairs(
    teelixirTxns,
    elevateTxns
  );
  matches.push(...payableReceivablePairs);

  // STEP 4: Identify shared expenses
  const sharedExpenses = await detectSharedExpenses(
    teelixirTxns,
    elevateTxns
  );
  matches.push(...sharedExpenses);

  return matches;
}

// Detect revenue (Teelixir) matched with COGS (Elevate)
async function detectRevenueCogsPairs(
  teelixirTxns: JournalLine[],
  elevateTxns: JournalLine[]
): Promise<IntercompanyMatch[]> {

  const matches: IntercompanyMatch[] = [];

  // Filter for Teelixir sales to Elevate
  const teelixirSales = teelixirTxns.filter(txn =>
    txn.account_type === 'REVENUE' &&
    (txn.description?.toLowerCase().includes('elevate') ||
     txn.contact_name?.toLowerCase().includes('elevate'))
  );

  // Filter for Elevate COGS from Teelixir
  const elevateCOGS = elevateTxns.filter(txn =>
    txn.account_type === 'DIRECTCOSTS' &&
    (txn.description?.toLowerCase().includes('teelixir') ||
     txn.contact_name?.toLowerCase().includes('teelixir'))
  );

  // Match transactions
  for (const sale of teelixirSales) {
    for (const cogs of elevateCOGS) {

      const confidence = calculateMatchConfidence(sale, cogs);

      if (confidence >= 80) {
        matches.push({
          teelixir_transaction_id: sale.id,
          elevate_transaction_id: cogs.id,
          match_type: 'revenue_cogs',
          confidence_score: confidence,
          amount_teelixir: Math.abs(sale.net_amount),
          amount_elevate: Math.abs(cogs.net_amount),
          date_teelixir: sale.date,
          date_elevate: cogs.date,
          elimination_amount: Math.min(
            Math.abs(sale.net_amount),
            Math.abs(cogs.net_amount)
          ),
          notes: `Revenue/COGS elimination: ${sale.description}`
        });
      }
    }
  }

  return matches;
}

// Calculate match confidence score (0-100)
function calculateMatchConfidence(
  txn1: JournalLine,
  txn2: JournalLine
): number {

  let score = 0;

  // Amount matching (40 points)
  const amountDiff = Math.abs(
    Math.abs(txn1.net_amount) - Math.abs(txn2.net_amount)
  );
  const amountTolerance = Math.abs(txn1.net_amount) * 0.02; // 2% tolerance

  if (amountDiff === 0) {
    score += 40;
  } else if (amountDiff <= amountTolerance) {
    score += 30;
  } else if (amountDiff <= amountTolerance * 2) {
    score += 20;
  }

  // Date proximity (30 points)
  const daysDiff = Math.abs(
    (txn1.date.getTime() - txn2.date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysDiff === 0) {
    score += 30;
  } else if (daysDiff <= 3) {
    score += 25;
  } else if (daysDiff <= 7) {
    score += 20;
  } else if (daysDiff <= 14) {
    score += 10;
  }

  // Description similarity (20 points)
  const desc1 = (txn1.description || '').toLowerCase();
  const desc2 = (txn2.description || '').toLowerCase();
  const descSimilarity = calculateStringSimilarity(desc1, desc2);

  score += Math.round(descSimilarity * 20);

  // Expected account types (10 points)
  const validPairs = [
    ['REVENUE', 'DIRECTCOSTS'],
    ['CURRENT_ASSET', 'CURRENT_LIABILITY'],
    ['EXPENSE', 'EXPENSE']
  ];

  const isValidPair = validPairs.some(([type1, type2]) =>
    (txn1.account_type === type1 && txn2.account_type === type2) ||
    (txn1.account_type === type2 && txn2.account_type === type1)
  );

  if (isValidPair) {
    score += 10;
  }

  return score;
}
```

### 2.3 Interactive Review Display

**Example Output:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  Intercompany Detection Results - November 2024                    │
│  Found: 23 potential matches (18 high confidence, 5 medium)        │
└─────────────────────────────────────────────────────────────────────┘

╔═══════════════════════════════════════════════════════════════════╗
║  MATCH #1 - REVENUE/COGS ELIMINATION                              ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  TEELIXIR (Revenue):                                             ║
║  Date:    2024-11-15                                             ║
║  Amount:  $12,450.00                                             ║
║  Account: 200 - Sales - Wholesale                                ║
║  Desc:    Wholesale order #1234 - Elevate Wholesale             ║
║                                                                   ║
║  ────────────────────────────────────────────────────────────    ║
║                                                                   ║
║  ELEVATE (COGS):                                                 ║
║  Date:    2024-11-16                                             ║
║  Amount:  $12,450.00                                             ║
║  Account: 310 - Cost of Goods Sold                               ║
║  Desc:    Purchase from Teelixir - PO #5678                     ║
║                                                                   ║
║  ────────────────────────────────────────────────────────────    ║
║                                                                   ║
║  ANALYSIS:                                                        ║
║  ✓ Exact amount match                         +40 points         ║
║  ✓ Date within 1 day                           +25 points         ║
║  ✓ Description mentions entities               +18 points         ║
║  ✓ Valid account type pair (REV/COGS)          +10 points         ║
║                                                                   ║
║  CONFIDENCE: ███████████████████░ 93%                            ║
║  ELIMINATION: $12,450.00                                         ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝

Options:
  [A] Approve elimination
  [R] Reject - not intercompany
  [M] Modify elimination amount
  [N] Next match
  [Q] Quit and save progress

Your choice:
```

### 2.4 Edge Cases & Special Handling

**Case 1: Timing Differences**
- Sale recorded in Month A, COGS in Month B
- Solution: Allow date range matching (± 14 days)
- Flag for manual review if >7 days apart

**Case 2: Partial Payments**
- Invoice $10k, but only $5k paid this period
- Solution: Create partial elimination entries
- Track remaining balance for next period

**Case 3: Rounding Differences**
- Amounts differ by cents due to rounding
- Solution: 2% tolerance threshold
- Auto-adjust to exact match if <$1 difference

**Case 4: GST/Tax Handling**
- Some transactions include tax, others don't
- Solution: Compare net amounts (ex-tax)
- Store tax separately for reporting

**Case 5: Multi-Currency**
- Future consideration if entities trade in different currencies
- Solution: Convert to base currency (AUD) at transaction date rate
- Store original currency and exchange rate

---

## Part 3: Data Validation & Quality Checks

### 3.1 Pre-Sync Validation

**Before running sync-xero-to-supabase.ts:**

```typescript
async function validateBeforeSync(): Promise<ValidationResult> {

  const issues: ValidationIssue[] = [];

  // CHECK 1: All active accounts mapped
  const unmappedAccounts = await checkUnmappedAccounts();
  if (unmappedAccounts.length > 0) {
    issues.push({
      severity: 'ERROR',
      category: 'mappings',
      message: `${unmappedAccounts.length} active accounts not mapped`,
      details: unmappedAccounts
    });
  }

  // CHECK 2: Mapping consistency
  const duplicateMappings = await checkDuplicateMappings();
  if (duplicateMappings.length > 0) {
    issues.push({
      severity: 'ERROR',
      category: 'mappings',
      message: 'Multiple Elevate accounts mapped to same Teelixir account',
      details: duplicateMappings
    });
  }

  // CHECK 3: Account types match
  const typeMismatches = await checkAccountTypeMismatches();
  if (typeMismatches.length > 0) {
    issues.push({
      severity: 'WARNING',
      category: 'mappings',
      message: 'Some mappings have different account types',
      details: typeMismatches
    });
  }

  // CHECK 4: Xero credentials valid
  const credentialsValid = await checkXeroCredentials();
  if (!credentialsValid) {
    issues.push({
      severity: 'ERROR',
      category: 'authentication',
      message: 'Xero credentials expired or invalid',
      details: null
    });
  }

  // CHECK 5: Supabase connection
  const supabaseConnected = await checkSupabaseConnection();
  if (!supabaseConnected) {
    issues.push({
      severity: 'ERROR',
      category: 'database',
      message: 'Cannot connect to Supabase',
      details: null
    });
  }

  return {
    valid: issues.filter(i => i.severity === 'ERROR').length === 0,
    issues
  };
}
```

### 3.2 Post-Sync Validation

**After syncing data:**

```typescript
async function validateAfterSync(syncId: string): Promise<ValidationResult> {

  const issues: ValidationIssue[] = [];

  // CHECK 1: Record counts match
  const recordCounts = await compareRecordCounts(syncId);
  if (!recordCounts.match) {
    issues.push({
      severity: 'WARNING',
      category: 'data_integrity',
      message: 'Transaction count mismatch',
      details: recordCounts
    });
  }

  // CHECK 2: Debits = Credits for each org
  const balanceCheck = await checkDebitCreditBalance(syncId);
  if (!balanceCheck.balanced) {
    issues.push({
      severity: 'ERROR',
      category: 'accounting',
      message: 'Debits do not equal credits',
      details: balanceCheck
    });
  }

  // CHECK 3: No duplicate journal lines
  const duplicates = await checkDuplicateJournalLines(syncId);
  if (duplicates.length > 0) {
    issues.push({
      severity: 'ERROR',
      category: 'data_integrity',
      message: 'Duplicate journal lines detected',
      details: duplicates
    });
  }

  // CHECK 4: All accounts exist
  const missingAccounts = await checkMissingAccounts(syncId);
  if (missingAccounts.length > 0) {
    issues.push({
      severity: 'ERROR',
      category: 'data_integrity',
      message: 'Journal lines reference non-existent accounts',
      details: missingAccounts
    });
  }

  return {
    valid: issues.filter(i => i.severity === 'ERROR').length === 0,
    issues
  };
}
```

---

## Part 4: Sample Test Cases

### Test Case 1: Exact Code Match

**Input:**
```
Elevate: { code: "200", name: "Sales", type: "REVENUE" }
Teelixir: { code: "200", name: "Revenue - Sales", type: "REVENUE" }
```

**Expected:**
```
Mapping: Elevate[200] → Teelixir[200]
Confidence: 98%
Strategy: exact_code_match
```

### Test Case 2: Similar Name Match

**Input:**
```
Elevate: { code: "310", name: "Advertising & Marketing", type: "EXPENSE" }
Teelixir: { code: "450", name: "Advertising and Marketing", type: "EXPENSE" }
```

**Expected:**
```
Mapping: Elevate[310] → Teelixir[450]
Confidence: 80-85%
Strategy: similar_name_match
Note: "&" vs "and" difference
```

### Test Case 3: Intercompany Sale

**Input:**
```
Teelixir: {
  date: "2024-11-15",
  amount: 12450.00,
  account: "200 - Sales",
  description: "Wholesale - Elevate Wholesale"
}

Elevate: {
  date: "2024-11-16",
  amount: 12450.00,
  account: "310 - COGS",
  description: "Purchase from Teelixir"
}
```

**Expected:**
```
Match Type: revenue_cogs
Confidence: 93%
Elimination Amount: $12,450.00
Breakdown:
  - Exact amount: +40
  - Date 1 day apart: +25
  - Description match: +18
  - Valid pair: +10
```

### Test Case 4: Partial Payment

**Input:**
```
Teelixir Invoice: $10,000 (Nov 15)
Elevate Payment: $6,000 (Nov 20)
```

**Expected:**
```
Match Type: payable_receivable
Confidence: 75%
Elimination Amount: $6,000
Remaining: $4,000 (track for next period)
```

---

## Part 5: Error Scenarios & Handling

### Scenario 1: API Rate Limit Hit

**Error:**
```
XeroAPIError: Rate limit exceeded (60 requests/minute)
```

**Handling:**
```typescript
try {
  await xeroClient.getJournalLines(params);
} catch (error) {
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    logger.warn('Rate limit hit, waiting 60 seconds...');
    await sleep(60000);
    return retry(getJournalLines, params);
  }
  throw error;
}
```

### Scenario 2: No Mapping Found

**Error:**
```
Account "515 - Software Subscriptions" (Elevate) has no mapping
```

**Handling:**
```
1. Pause sync
2. Display unmapped account details
3. Prompt for manual mapping
4. Save mapping to database
5. Resume sync
```

### Scenario 3: Duplicate Elimination

**Error:**
```
Transaction pair already has elimination entry
```

**Handling:**
```typescript
const existingElimination = await checkExistingElimination(
  teelixirTxnId,
  elevateTxnId
);

if (existingElimination) {
  logger.info('Elimination already exists, skipping');
  return; // Idempotent operation
}
```

### Scenario 4: Unbalanced Eliminations

**Error:**
```
Elimination entries do not balance:
  Debit: $12,450
  Credit: $12,400
  Difference: $50
```

**Handling:**
```
1. Flag for manual review
2. Don't save elimination
3. Log discrepancy details
4. Notify user via email
5. Provide drill-down link
```

---

## Part 6: Approval Checklist

Before proceeding to Phase 5, ensure:

- [ ] Account mappings reviewed and approved
  - [ ] All high-confidence (≥95%) mappings verified
  - [ ] All medium-confidence (70-94%) mappings manually reviewed
  - [ ] All low-confidence (<70%) mappings manually mapped
  - [ ] Unmapped accounts identified and resolved

- [ ] Intercompany detection validated
  - [ ] Sample transactions reviewed (minimum 10 pairs)
  - [ ] Detection confidence threshold agreed (recommend 80%)
  - [ ] Edge cases discussed (timing, rounding, partial)
  - [ ] Tax treatment confirmed

- [ ] Data validation passing
  - [ ] Pre-sync validation checks pass
  - [ ] Test sync with 1 month of data successful
  - [ ] Debits = Credits verification confirmed
  - [ ] No duplicate transactions

- [ ] Error handling tested
  - [ ] Rate limit scenario tested
  - [ ] Missing mapping scenario tested
  - [ ] API failure scenario tested
  - [ ] Recovery procedures documented

---

## Part 7: Next Steps

Once Phase 4 is approved:

1. **Build `suggest-mappings.ts`** based on this spec
2. **Run mapping approval session** with jayson@teelixir.com
3. **Build `detect-intercompany.ts`** based on this spec
4. **Review sample detections** with jayson@teelixir.com
5. **Proceed to Phase 5** (Data Pipeline & Consolidation)

---

## Appendix A: CLI Command Reference

```bash
# Generate mapping suggestions
npx tsx scripts/financials/suggest-mappings.ts

# Auto-approve high-confidence mappings
npx tsx scripts/financials/suggest-mappings.ts --auto-approve-threshold 95

# Review specific confidence range
npx tsx scripts/financials/suggest-mappings.ts --min-confidence 70 --max-confidence 94

# Export mappings for review
npx tsx scripts/financials/suggest-mappings.ts --export mappings-review.json

# Import pre-approved mappings
npx tsx scripts/financials/suggest-mappings.ts --import approved-mappings.json

# Detect intercompany for specific month
npx tsx scripts/financials/detect-intercompany.ts --period 2024-11

# Detect with custom date range
npx tsx scripts/financials/detect-intercompany.ts --from 2024-11-01 --to 2024-11-30

# Dry run (no save)
npx tsx scripts/financials/detect-intercompany.ts --dry-run

# Export detections
npx tsx scripts/financials/detect-intercompany.ts --export intercompany-nov-2024.json
```

---

## Appendix B: Database Queries

**Get unmapped accounts:**
```sql
SELECT a.*
FROM accounts a
WHERE a.organization_id = 'elevate-org-id'
  AND a.status = 'ACTIVE'
  AND NOT EXISTS (
    SELECT 1 FROM account_mappings m
    WHERE m.source_account_id = a.account_id
      AND m.approval_status = 'approved'
  );
```

**Get high-confidence mappings needing review:**
```sql
SELECT
  m.*,
  sa.code as source_code,
  sa.name as source_name,
  ta.code as target_code,
  ta.name as target_name
FROM account_mappings m
JOIN accounts sa ON m.source_account_id = sa.account_id
JOIN accounts ta ON m.target_account_id = ta.account_id
WHERE m.confidence_score >= 95
  AND m.approval_status = 'pending';
```

**Get intercompany matches for period:**
```sql
SELECT
  ie.*,
  t.date as teelixir_date,
  t.net_amount as teelixir_amount,
  e.date as elevate_date,
  e.net_amount as elevate_amount
FROM intercompany_eliminations ie
JOIN journal_lines t ON ie.teelixir_line_id = t.id
JOIN journal_lines e ON ie.elevate_line_id = e.id
WHERE ie.period = '2024-11'
  AND ie.approval_status = 'pending'
ORDER BY ie.confidence_score DESC;
```

---

**End of Phase 4 Detailed Specification**
