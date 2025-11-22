# n8n Automated Workflow Specification

**Project**: Consolidated Financials - Teelixir + Elevate Wholesale
**Purpose**: Define the automated monthly consolidation workflow
**Last Updated**: 2025-11-21

---

## Table of Contents

1. [Workflow Overview](#workflow-overview)
2. [Workflow Diagram](#workflow-diagram)
3. [Node Specifications](#node-specifications)
4. [Error Handling](#error-handling)
5. [Monitoring & Alerts](#monitoring--alerts)
6. [Manual Triggers](#manual-triggers)
7. [Testing Strategy](#testing-strategy)

---

## Workflow Overview

### Purpose

Automatically sync financial data from Xero, apply consolidation logic, and generate consolidated reports on a monthly schedule.

### Schedule

**Trigger:** 7th of each month at 9:00 AM AEST (UTC+10/11)

**Why the 7th?**
- Allows time for month-end close in Xero (typically done by 5th)
- Business days ensure support available if issues
- Early enough to provide timely financial reports

### Workflow Name

`xero-monthly-consolidation`

### High-Level Steps

```
1. Schedule Trigger (Cron)
   ↓
2. Validate Prerequisites
   ↓
3. Fetch Teelixir Data from Xero
   ↓
4. Fetch Elevate Data from Xero
   ↓
5. Data Validation
   ↓
6. Apply Account Mappings
   ↓
7. Detect Intercompany Transactions
   ↓
8. Generate Consolidated Reports
   ↓
9. Reconciliation Checks
   ↓
10. Save to Supabase
   ↓
11. Send Success Notifications
   ↓
12. Update Dashboard
```

---

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────┐
│  NODE 1: Schedule Trigger                               │
│  Cron: 0 9 7 * *  (9 AM on 7th of month)               │
│  Timezone: Australia/Sydney                             │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│  NODE 2: Set Variables                                  │
│  - period = previous month (YYYY-MM)                    │
│  - sync_id = UUID                                       │
│  - start_time = now()                                   │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│  NODE 3: Check Prerequisites                            │
│  - Verify Xero credentials valid                        │
│  - Check Supabase connection                            │
│  - Verify account mappings exist                        │
│  - Check no sync already running                        │
└──────────────────┬──────────────────────────────────────┘
                   ↓
                [PASS] ─────────────┐         [FAIL]
                   ↓                 ↓            ↓
┌───────────────────────┐   ┌──────────────────────┐
│  NODE 4a: Fetch       │   │  ERROR HANDLER:      │
│  Teelixir Data        │   │  Alert & Abort       │
│  - Journals           │   └──────────────────────┘
│  - Accounts           │
│  - Rate limit: 50/min │
└──────────┬────────────┘
           ↓
┌───────────────────────┐
│  NODE 4b: Fetch       │
│  Elevate Data         │
│  - Journals           │
│  - Accounts           │
└──────────┬────────────┘
           ↓
┌─────────────────────────────────────────────────────────┐
│  NODE 5: Data Validation                                │
│  - Verify record counts reasonable                      │
│  - Check debits = credits per org                       │
│  - Validate no missing dates                            │
│  - Ensure all accounts exist                            │
└──────────────────┬──────────────────────────────────────┘
                   ↓
                [PASS] ─────────────┐         [FAIL]
                   ↓                 ↓            ↓
┌───────────────────────┐   ┌──────────────────────┐
│  NODE 6: Apply        │   │  ERROR: Send Alert   │
│  Account Mappings     │   │  & Require Manual    │
│  - Load from Supabase │   │  Review              │
│  - Transform Elevate  │   └──────────────────────┘
└──────────┬────────────┘
           ↓
┌─────────────────────────────────────────────────────────┐
│  NODE 7: Detect Intercompany                            │
│  - Run detection algorithm                              │
│  - Calculate confidence scores                          │
│  - Filter by threshold (80%+)                           │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│  NODE 8: Apply Allocations                              │
│  - Load allocation rules from Supabase                  │
│  - Calculate revenue ratios                             │
│  - Allocate shared expenses                             │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│  NODE 9: Generate Reports                               │
│  - Profit & Loss                                        │
│  - Balance Sheet                                        │
│  - Calculate variances vs prior month                   │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│  NODE 10: Reconciliation Checks                         │
│  - Verify debits = credits                              │
│  - Check balance sheet balances                         │
│  - Validate revenue/COGS reasonable                     │
│  - Compare to prior periods (±20% threshold)            │
└──────────────────┬──────────────────────────────────────┘
                   ↓
                [PASS] ─────────────┐         [FAIL]
                   ↓                 ↓            ↓
┌───────────────────────┐   ┌──────────────────────┐
│  NODE 11: Save to     │   │  ERROR: Flag for     │
│  Supabase             │   │  Manual Review       │
│  - Journal lines      │   │  (save but mark      │
│  - Consolidated report│   │   as "needs review") │
│  - Sync history       │   └──────────────────────┘
└──────────┬────────────┘
           ↓
┌─────────────────────────────────────────────────────────┐
│  NODE 12: Send Notifications                            │
│  - Email: jayson@teelixir.com, peter@teelixir.com      │
│  - Subject: "Consolidated Financials - [Period] Ready" │
│  - Include: Summary, link to dashboard                  │
│  - Attach: PDF export (optional)                        │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│  NODE 13: Log Execution                                 │
│  - Record duration                                      │
│  - Save metrics to Supabase                             │
│  - Update last_sync timestamp                           │
└─────────────────────────────────────────────────────────┘
```

---

## Node Specifications

### Node 1: Schedule Trigger

**Node Type:** Cron

**Configuration:**
```json
{
  "mode": "custom",
  "cronExpression": "0 9 7 * *",
  "triggerAtSecond": 0
}
```

**Timezone:** `Australia/Sydney` (AEST/AEDT)

**Output:**
```json
{
  "trigger_time": "2024-12-07T09:00:00+11:00",
  "workflow_id": "xero-monthly-consolidation"
}
```

---

### Node 2: Set Variables

**Node Type:** Function

**Code:**
```javascript
const now = new Date();
const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
const period = lastMonth.toISOString().slice(0, 7); // "YYYY-MM"

const { v4: uuidv4 } = require('uuid');
const syncId = uuidv4();

return {
  period: period,
  sync_id: syncId,
  start_time: now.toISOString(),
  from_date: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1).toISOString().slice(0, 10),
  to_date: new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0).toISOString().slice(0, 10)
};
```

**Output:**
```json
{
  "period": "2024-11",
  "sync_id": "abc-123-def-456",
  "start_time": "2024-12-07T09:00:15+11:00",
  "from_date": "2024-11-01",
  "to_date": "2024-11-30"
}
```

---

### Node 3: Check Prerequisites

**Node Type:** HTTP Request (to custom API endpoint)

**Endpoint:** `POST https://api.growthhq.com/financials/check-prerequisites`

**Request Body:**
```json
{
  "period": "{{ $node['Set Variables'].json.period }}",
  "sync_id": "{{ $node['Set Variables'].json.sync_id }}"
}
```

**Checks Performed:**
1. Xero credentials valid (not expired)
2. Supabase connection working
3. Account mappings exist and approved
4. No other sync running for same period

**Success Response:**
```json
{
  "status": "ok",
  "checks_passed": [
    "xero_credentials_valid",
    "supabase_connected",
    "account_mappings_exist",
    "no_sync_in_progress"
  ],
  "mappings_count": 87,
  "last_sync": "2024-11-07T09:15:23+11:00"
}
```

**Error Response:**
```json
{
  "status": "error",
  "error": "Xero credentials expired",
  "checks_passed": ["supabase_connected"],
  "checks_failed": ["xero_credentials_valid"],
  "action_required": "Re-authenticate with Xero"
}
```

**Error Handling:** If status !== "ok", route to Error Handler node

---

### Node 4a: Fetch Teelixir Data

**Node Type:** HTTP Request (to Xero Connector API)

**Endpoint:** `POST https://api.growthhq.com/financials/fetch-xero-data`

**Request Body:**
```json
{
  "organization": "teelixir",
  "organization_id": "{{ $env.XERO_TEELIXIR_ORG_ID }}",
  "from_date": "{{ $node['Set Variables'].json.from_date }}",
  "to_date": "{{ $node['Set Variables'].json.to_date }}",
  "entities": ["journals", "accounts"],
  "sync_id": "{{ $node['Set Variables'].json.sync_id }}"
}
```

**Rate Limiting:**
- Max 50 requests/minute
- Automatic retry with exponential backoff
- Batch journal lines (100 per request)

**Success Response:**
```json
{
  "status": "success",
  "organization": "teelixir",
  "period": "2024-11",
  "accounts_fetched": 87,
  "journal_lines_fetched": 1247,
  "debit_total": 156789.50,
  "credit_total": 156789.50,
  "balanced": true,
  "api_calls_made": 15,
  "duration_seconds": 28
}
```

**Retry Logic:**
- Max retries: 3
- Initial delay: 10 seconds
- Backoff multiplier: 2x
- Errors to retry: Rate limit, timeout, 5xx

---

### Node 4b: Fetch Elevate Data

**Node Type:** HTTP Request (same as Node 4a)

**Request Body:**
```json
{
  "organization": "elevate",
  "organization_id": "{{ $env.XERO_ELEVATE_ORG_ID }}",
  "from_date": "{{ $node['Set Variables'].json.from_date }}",
  "to_date": "{{ $node['Set Variables'].json.to_date }}",
  "entities": ["journals", "accounts"],
  "sync_id": "{{ $node['Set Variables'].json.sync_id }}"
}
```

---

### Node 5: Data Validation

**Node Type:** Function

**Code:**
```javascript
const teelixirData = $node['Fetch Teelixir Data'].json;
const elevateData = $node['Fetch Elevate Data'].json;

const errors = [];
const warnings = [];

// CHECK 1: Data fetched
if (teelixirData.journal_lines_fetched === 0) {
  errors.push('No Teelixir journal lines fetched');
}
if (elevateData.journal_lines_fetched === 0) {
  errors.push('No Elevate journal lines fetched');
}

// CHECK 2: Data balanced
if (!teelixirData.balanced) {
  errors.push('Teelixir data not balanced (debits != credits)');
}
if (!elevateData.balanced) {
  errors.push('Elevate data not balanced (debits != credits)');
}

// CHECK 3: Reasonable transaction count
const totalLines = teelixirData.journal_lines_fetched + elevateData.journal_lines_fetched;
if (totalLines < 100) {
  warnings.push(`Low transaction count: ${totalLines}`);
}
if (totalLines > 10000) {
  warnings.push(`High transaction count: ${totalLines}`);
}

// CHECK 4: Compare to prior month (if exists)
// Load prior month data from Supabase and compare ±30%

return {
  status: errors.length === 0 ? 'pass' : 'fail',
  errors: errors,
  warnings: warnings,
  total_lines: totalLines,
  validation_time: new Date().toISOString()
};
```

**Output (Success):**
```json
{
  "status": "pass",
  "errors": [],
  "warnings": ["High transaction count: 2081"],
  "total_lines": 2081
}
```

**Output (Failure):**
```json
{
  "status": "fail",
  "errors": ["Teelixir data not balanced"],
  "warnings": []
}
```

**Routing:** If status === "fail", route to Error Handler

---

### Node 6: Apply Account Mappings

**Node Type:** HTTP Request

**Endpoint:** `POST https://api.growthhq.com/financials/apply-mappings`

**Request Body:**
```json
{
  "sync_id": "{{ $node['Set Variables'].json.sync_id }}",
  "period": "{{ $node['Set Variables'].json.period }}"
}
```

**Process:**
1. Load approved mappings from Supabase
2. Transform Elevate account codes to Teelixir codes
3. Preserve original account info in metadata

**Response:**
```json
{
  "status": "success",
  "mappings_applied": 87,
  "unmapped_accounts": 0,
  "lines_transformed": 834
}
```

---

### Node 7: Detect Intercompany

**Node Type:** HTTP Request

**Endpoint:** `POST https://api.growthhq.com/financials/detect-intercompany`

**Request Body:**
```json
{
  "sync_id": "{{ $node['Set Variables'].json.sync_id }}",
  "period": "{{ $node['Set Variables'].json.period }}",
  "confidence_threshold": 80
}
```

**Response:**
```json
{
  "status": "success",
  "matches_found": 12,
  "average_confidence": 91.2,
  "total_elimination_amount": 87650.00,
  "breakdown": {
    "revenue_cogs": 10,
    "payable_receivable": 2,
    "other": 0
  }
}
```

---

### Node 8: Apply Allocations

**Node Type:** HTTP Request

**Endpoint:** `POST https://api.growthhq.com/financials/apply-allocations`

**Request Body:**
```json
{
  "sync_id": "{{ $node['Set Variables'].json.sync_id }}",
  "period": "{{ $node['Set Variables'].json.period }}"
}
```

**Process:**
1. Load active allocation rules from Supabase
2. Calculate revenue ratios for period
3. Apply allocations to shared expenses

**Response:**
```json
{
  "status": "success",
  "allocations_applied": 5,
  "total_allocated": 18400.00,
  "breakdown": [
    {
      "expense": "Rent",
      "amount": 6000,
      "teelixir_share": 3750,
      "elevate_share": 2250,
      "method": "revenue_ratio"
    }
  ]
}
```

---

### Node 9: Generate Reports

**Node Type:** HTTP Request

**Endpoint:** `POST https://api.growthhq.com/financials/generate-reports`

**Request Body:**
```json
{
  "sync_id": "{{ $node['Set Variables'].json.sync_id }}",
  "period": "{{ $node['Set Variables'].json.period }}",
  "reports": ["profit_and_loss", "balance_sheet"]
}
```

**Response:**
```json
{
  "status": "success",
  "reports_generated": 2,
  "profit_and_loss": {
    "revenue": 82345,
    "cogs": 31567,
    "gross_profit": 50778,
    "gross_margin_pct": 61.6,
    "operating_expenses": 38912,
    "net_profit": 11866
  },
  "balance_sheet": {
    "total_assets": 456789,
    "total_liabilities": 187654,
    "total_equity": 269135,
    "balanced": true
  }
}
```

---

### Node 10: Reconciliation Checks

**Node Type:** Function

**Code:**
```javascript
const reports = $node['Generate Reports'].json;

const errors = [];
const warnings = [];

// CHECK 1: Balance sheet balances
const bsBalanced = Math.abs(
  reports.balance_sheet.total_assets -
  (reports.balance_sheet.total_liabilities + reports.balance_sheet.total_equity)
) < 1.00;

if (!bsBalanced) {
  errors.push('Balance sheet does not balance');
}

// CHECK 2: Revenue > 0
if (reports.profit_and_loss.revenue <= 0) {
  errors.push('Revenue is zero or negative');
}

// CHECK 3: Gross margin reasonable (40-80%)
const gm = reports.profit_and_loss.gross_margin_pct;
if (gm < 40 || gm > 80) {
  warnings.push(`Unusual gross margin: ${gm}%`);
}

// CHECK 4: Compare to prior month
// Load prior month P&L and check variance ±20%

return {
  status: errors.length === 0 ? 'pass' : 'fail',
  errors: errors,
  warnings: warnings,
  reconciliation_time: new Date().toISOString()
};
```

**Routing:** If status === "fail", route to "Flag for Review" node

---

### Node 11: Save to Supabase

**Node Type:** HTTP Request (Supabase)

**Endpoint:** `POST {{ $env.SUPABASE_URL }}/rest/v1/consolidated_reports`

**Headers:**
```
apikey: {{ $env.SUPABASE_SERVICE_ROLE_KEY }}
Authorization: Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}
Content-Type: application/json
```

**Request Body:**
```json
{
  "period": "{{ $node['Set Variables'].json.period }}",
  "sync_id": "{{ $node['Set Variables'].json.sync_id }}",
  "profit_and_loss": "{{ $node['Generate Reports'].json.profit_and_loss }}",
  "balance_sheet": "{{ $node['Generate Reports'].json.balance_sheet }}",
  "status": "completed",
  "generated_at": "{{ $node['Generate Reports'].json.generated_at }}"
}
```

---

### Node 12: Send Notifications

**Node Type:** Email (SMTP or SendGrid)

**To:** jayson@teelixir.com, peter@teelixir.com

**Subject:** `Consolidated Financials - {{ $node['Set Variables'].json.period }} Ready`

**Body (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    .summary { background: #f5f5f5; padding: 20px; margin: 20px 0; }
    .metric { font-size: 24px; font-weight: bold; color: #2c5282; }
    .label { font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <h1>Consolidated Financial Report Ready</h1>
  <p>The consolidated financial report for <strong>{{ $node['Set Variables'].json.period }}</strong> has been generated successfully.</p>

  <div class="summary">
    <h2>Executive Summary</h2>
    <div>
      <div class="label">Revenue</div>
      <div class="metric">${{ $node['Generate Reports'].json.profit_and_loss.revenue.toLocaleString() }}</div>
    </div>
    <div>
      <div class="label">Gross Profit</div>
      <div class="metric">${{ $node['Generate Reports'].json.profit_and_loss.gross_profit.toLocaleString() }}</div>
      <div class="label">Margin: {{ $node['Generate Reports'].json.profit_and_loss.gross_margin_pct }}%</div>
    </div>
    <div>
      <div class="label">Net Profit</div>
      <div class="metric">${{ $node['Generate Reports'].json.profit_and_loss.net_profit.toLocaleString() }}</div>
    </div>
  </div>

  <h3>Key Metrics</h3>
  <ul>
    <li>Intercompany Eliminations: ${{ $node['Detect Intercompany'].json.total_elimination_amount.toLocaleString() }}</li>
    <li>Shared Expense Allocations: ${{ $node['Apply Allocations'].json.total_allocated.toLocaleString() }}</li>
    <li>Total Transactions: {{ $node['Data Validation'].json.total_lines }}</li>
  </ul>

  <p><a href="https://financials.growthhq.com/reports/{{ $node['Set Variables'].json.period }}" style="background: #2c5282; color: white; padding: 10px 20px; text-decoration: none; display: inline-block; margin: 20px 0;">View Full Report</a></p>

  <hr>
  <p style="font-size: 12px; color: #999;">
    Generated: {{ $node['Set Variables'].json.start_time }}<br>
    Sync ID: {{ $node['Set Variables'].json.sync_id }}<br>
    This is an automated message from the Consolidated Financials system.
  </p>
</body>
</html>
```

---

### Node 13: Log Execution

**Node Type:** HTTP Request (Supabase)

**Endpoint:** `POST {{ $env.SUPABASE_URL }}/rest/v1/sync_history`

**Request Body:**
```json
{
  "sync_id": "{{ $node['Set Variables'].json.sync_id }}",
  "period": "{{ $node['Set Variables'].json.period }}",
  "status": "success",
  "started_at": "{{ $node['Set Variables'].json.start_time }}",
  "completed_at": "{{ new Date().toISOString() }}",
  "duration_seconds": "{{ calculateDuration() }}",
  "metrics": {
    "teelixir_lines": "{{ $node['Fetch Teelixir Data'].json.journal_lines_fetched }}",
    "elevate_lines": "{{ $node['Fetch Elevate Data'].json.journal_lines_fetched }}",
    "intercompany_matches": "{{ $node['Detect Intercompany'].json.matches_found }}",
    "allocations_applied": "{{ $node['Apply Allocations'].json.allocations_applied }}"
  }
}
```

---

## Error Handling

### Global Error Catcher

**Node Type:** Error Trigger

**Triggers On:** Any node error

**Actions:**
1. Capture error details
2. Log to Supabase (sync_history with status='failed')
3. Send alert email
4. Create incident in monitoring system (optional)

**Alert Email:**

**To:** jayson@teelixir.com, peter@teelixir.com

**Subject:** `[ERROR] Consolidated Financials Sync Failed - {{ $node['Set Variables'].json.period }}`

**Body:**
```
Workflow: xero-monthly-consolidation
Period: {{ $node['Set Variables'].json.period }}
Sync ID: {{ $node['Set Variables'].json.sync_id }}

Failed At: {{ $error.node.name }}
Error: {{ $error.message }}

Timestamp: {{ new Date().toISOString() }}

Details:
{{ JSON.stringify($error, null, 2) }}

Action Required:
1. Review error details above
2. Check workflow execution: https://n8n.growthhq.com/executions/{{ $execution.id }}
3. Manually trigger sync if needed: https://financials.growthhq.com/admin/manual-sync
4. Contact support if issue persists

---
This is an automated alert from the Consolidated Financials system.
```

### Retry Strategy

**Retryable Errors:**
- Network timeouts
- Rate limit exceeded
- 5xx server errors
- Temporary Xero API issues

**Retry Configuration:**
```json
{
  "maxTries": 3,
  "waitBetweenTries": 60000,
  "retryOnFail": true
}
```

**Non-Retryable Errors:**
- Authentication failures (require manual re-auth)
- Data validation errors (require manual review)
- Missing account mappings (require manual mapping)

---

## Monitoring & Alerts

### Success Metrics to Track

1. **Execution Duration**
   - Target: < 5 minutes
   - Alert if: > 10 minutes

2. **Data Volume**
   - Typical: 1,500-2,500 journal lines/month
   - Alert if: < 500 or > 5,000

3. **Intercompany Detections**
   - Typical: 10-20 matches/month
   - Alert if: 0 or > 50

4. **API Call Count**
   - Typical: 20-40 calls/execution
   - Alert if: > 100 (approaching limits)

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Execution Duration | > 7 min | > 10 min |
| Data Validation Errors | 1-3 | > 3 |
| Reconciliation Warnings | 1-2 | > 2 |
| Failed Executions | 1/month | 2/month |

### Monitoring Dashboard

**Platform:** Grafana or n8n built-in monitoring

**Key Panels:**
- Execution success rate (30-day rolling)
- Average execution duration
- Data volume trends
- Error frequency by type
- API call usage

---

## Manual Triggers

### Trigger 1: On-Demand Sync

**Use Case:** Need to run consolidation for current month before scheduled time

**Trigger Type:** Webhook

**Endpoint:** `POST https://n8n.growthhq.com/webhook/financials-sync-manual`

**Request Body:**
```json
{
  "period": "2024-12",
  "triggered_by": "jayson@teelixir.com",
  "reason": "Board meeting prep"
}
```

**Security:** API key required

---

### Trigger 2: Re-run Failed Sync

**Use Case:** Fix data issue and re-run failed sync

**Trigger Type:** Webhook

**Endpoint:** `POST https://n8n.growthhq.com/webhook/financials-sync-retry`

**Request Body:**
```json
{
  "sync_id": "abc-123-def-456",
  "retry_from_node": "Detect Intercompany"
}
```

---

### Trigger 3: Test Mode

**Use Case:** Test workflow with sample data (no email, no save)

**Trigger Type:** Webhook

**Endpoint:** `POST https://n8n.growthhq.com/webhook/financials-sync-test`

**Request Body:**
```json
{
  "period": "2024-11",
  "dry_run": true
}
```

**Behavior:**
- Runs full workflow
- Skips email notification
- Doesn't save to production tables
- Returns detailed execution log

---

## Testing Strategy

### Phase 1: Unit Testing (Each Node)

Test each node individually with mock data:

```bash
# Test Schedule Trigger
curl -X POST http://localhost:5678/webhook-test/schedule-trigger

# Test Prerequisites Check
curl -X POST http://localhost:5678/webhook-test/check-prerequisites \
  -d '{"period": "2024-11"}'

# Test Fetch Teelixir Data
curl -X POST http://localhost:5678/webhook-test/fetch-teelixir \
  -d '{"period": "2024-11", "sync_id": "test-123"}'
```

**Success Criteria:**
- [ ] Each node returns expected output format
- [ ] Error handling triggers correctly
- [ ] Retry logic works as expected

---

### Phase 2: Integration Testing

Test workflow end-to-end with test environment:

**Setup:**
1. Use test Xero organizations
2. Use test Supabase database
3. Mock email sending

**Test Scenarios:**

1. **Happy Path:** Everything succeeds
   - Expected: Workflow completes, reports generated, email sent

2. **Xero API Timeout:** Simulate timeout
   - Expected: Retry 3 times, then fail with alert

3. **Data Validation Failure:** Bad data
   - Expected: Stop at validation node, send alert

4. **Missing Mappings:** Unmapped account
   - Expected: Error at mapping node, require manual intervention

**Success Criteria:**
- [ ] All scenarios handled correctly
- [ ] Error messages clear and actionable
- [ ] No data corruption

---

### Phase 3: Production Testing

Test with real data in production:

**Pre-Production:**
1. Deploy workflow to n8n
2. Disable schedule trigger (manual only)
3. Run with prior month data (already validated)
4. Compare output to manual consolidation

**Go-Live:**
1. Enable schedule trigger
2. Monitor first automated execution closely
3. Verify output manually
4. Confirm stakeholders received email

**Success Criteria:**
- [ ] First automated run successful
- [ ] Reports match manual calculation
- [ ] No errors or alerts
- [ ] Stakeholders satisfied with output

---

## Workflow JSON Export

**File:** `infra/n8n-workflows/xero-monthly-consolidation.json`

**Import Instructions:**

1. Go to n8n dashboard
2. Click "Import from File"
3. Select `xero-monthly-consolidation.json`
4. Configure credentials:
   - Xero OAuth
   - Supabase API key
   - SMTP/SendGrid
5. Test with manual trigger
6. Enable schedule

---

## Deployment Checklist

Before enabling automated workflow:

- [ ] All nodes tested individually
- [ ] Integration tests passed
- [ ] Error handling verified
- [ ] Retry logic confirmed working
- [ ] Email notifications tested
- [ ] Supabase permissions correct
- [ ] Xero credentials valid (>30 days remaining)
- [ ] Schedule trigger configured correctly
- [ ] Monitoring dashboard set up
- [ ] Alert thresholds configured
- [ ] Manual trigger tested
- [ ] Documentation reviewed by stakeholders
- [ ] **User approval obtained** (Approval Gate 3)

---

## Maintenance & Updates

### Monthly Review

After each automated run:

1. Review execution logs
2. Check for warnings
3. Verify report accuracy
4. Update thresholds if needed

### Quarterly Review

Every 3 months:

1. Review all error incidents
2. Optimize slow nodes
3. Update documentation
4. Refresh test scenarios

### Annual Review

Once per year:

1. Review workflow architecture
2. Update dependencies
3. Audit security settings
4. Performance optimization

---

**End of n8n Workflow Specification**
