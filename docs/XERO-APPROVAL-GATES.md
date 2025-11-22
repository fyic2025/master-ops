# Xero Integration Approval Gates

**Project**: Consolidated Financials - Teelixir + Elevate Wholesale
**Purpose**: Define approval checkpoints for all Xero-related operations
**Last Updated**: 2025-11-21

---

## Overview

This document defines **4 approval gates** required before executing operations that interact with Xero or use Xero data. Each gate includes:

- **Description**: What requires approval
- **Risk Level**: LOW, MEDIUM, or HIGH
- **Approval Checklist**: Items to review before approval
- **Sample Data**: Examples to review
- **Rollback Procedure**: How to undo if needed

**Approval Required From:** jayson@teelixir.com or peter@teelixir.com

---

## Approval Gate 1: Data Reading from Xero

### Description

Scripts that **read data** from Xero APIs for both organizations (Teelixir and Elevate Wholesale).

**Operations:**
- Fetching chart of accounts
- Reading journal lines (transactions)
- Pulling invoices
- Reading reports (Trial Balance, P&L, Balance Sheet)

**Scripts Affected:**
- `scripts/financials/analyze-chart-of-accounts.ts`
- `scripts/financials/sync-xero-to-supabase.ts`
- Any data pipeline scripts

### Risk Level: **LOW**

**Why:** Read-only operations do not modify Xero data. The only risks are:
- API rate limits (60 requests/minute)
- Exposing sensitive financial data
- Potential cost if API calls are metered (currently free for Xero)

---

### Approval Checklist

Before approving data reading operations:

- [ ] **Verify Xero Credentials**
  - OAuth tokens are stored securely in `.xero-credentials.json`
  - File is added to `.gitignore` (not committed to Git)
  - Tokens have appropriate scopes (read-only where possible)

- [ ] **Confirm Organizations**
  - Teelixir organization ID: `________________`
  - Elevate Wholesale organization ID: `________________`
  - Both organizations connected to the OAuth app

- [ ] **Review Data Scope**
  - Date range for historical sync: From `________` to `________`
  - Entities to fetch: ☐ Accounts ☐ Journals ☐ Invoices ☐ Reports
  - Estimated API calls: `______` (should be < 1000/day)

- [ ] **Understand Data Storage**
  - Data will be stored in: Supabase (qcvfxxsnqvdfmpbcgdni)
  - Tables: `accounts`, `journal_lines`, `sync_history`
  - Data retention: Indefinite (until manually deleted)

- [ ] **Review Sample Output**
  - See "Sample Data" section below
  - Confirm data accuracy matches Xero

---

### Sample Data to Review

**Example: Chart of Accounts**

```json
{
  "organization": "Teelixir",
  "accounts": [
    {
      "code": "200",
      "name": "Sales",
      "type": "REVENUE",
      "tax_type": "OUTPUT2",
      "enable_payments": false,
      "status": "ACTIVE"
    },
    {
      "code": "310",
      "name": "Cost of Sales",
      "type": "DIRECTCOSTS",
      "tax_type": "INPUT2",
      "status": "ACTIVE"
    }
    // ... more accounts
  ],
  "total_accounts": 87
}
```

**Example: Journal Lines (November 2024)**

```json
{
  "organization": "Elevate Wholesale",
  "period": "2024-11",
  "journal_lines": [
    {
      "date": "2024-11-15",
      "description": "Wholesale order #1234 - Teelixir",
      "account_code": "310",
      "account_name": "Cost of Goods Sold",
      "net_amount": -12450.00,
      "gross_amount": -13695.00,
      "tax_amount": -1245.00,
      "line_type": "ACCREC"
    }
    // ... more transactions
  ],
  "total_lines": 234,
  "debit_total": 67890.50,
  "credit_total": 67890.50,
  "balanced": true
}
```

**Review Questions:**
1. Do the account codes look correct?
2. Are the amounts reasonable for this period?
3. Is the data balanced (debits = credits)?
4. Any sensitive/confidential transactions to exclude?

---

### Approval Process

**Step 1:** Run analysis script in **dry-run mode**
```bash
npx tsx scripts/financials/analyze-chart-of-accounts.ts --dry-run
```

**Step 2:** Review output file
```bash
cat account-analysis.json
```

**Step 3:** Approve or request changes
```
☐ APPROVED - Proceed with data reading
☐ CHANGES REQUIRED - Specify: _________________________
☐ DENIED - Reason: _____________________________________
```

**Approved By:** `_________________` **Date:** `_________`

---

### Rollback Procedure

If data reading needs to be stopped:

1. **Stop the script:** Press `Ctrl+C` in terminal
2. **Revoke OAuth tokens** (if needed):
   ```bash
   rm .xero-credentials.json
   ```
3. **Remove synced data** (if needed):
   ```sql
   DELETE FROM journal_lines WHERE sync_id = '<sync-id>';
   DELETE FROM sync_history WHERE id = '<sync-id>';
   ```

**Note:** Rollback only affects local Supabase data, not Xero.

---

## Approval Gate 2: Account Mappings & Consolidation Logic

### Description

Configuration that determines **how financial data is consolidated**.

**Operations:**
- Approving account mappings (Elevate accounts → Teelixir accounts)
- Setting intercompany elimination rules
- Defining shared expense allocation percentages

**Scripts Affected:**
- `scripts/financials/suggest-mappings.ts`
- `scripts/financials/detect-intercompany.ts`

### Risk Level: **MEDIUM**

**Why:** Incorrect mappings or rules will produce inaccurate consolidated reports. However:
- No data is written to Xero
- Can be corrected by updating mappings in Supabase
- Validation checks reduce errors

---

### Approval Checklist

Before approving account mappings:

- [ ] **Review High-Confidence Mappings**
  - All mappings with ≥95% confidence reviewed
  - Exact code matches verified
  - Exact name matches verified

- [ ] **Review Medium-Confidence Mappings**
  - All mappings with 70-94% confidence reviewed
  - Similar name matches make sense
  - Account types match (Revenue to Revenue, etc.)

- [ ] **Manual Mappings Completed**
  - All low-confidence (<70%) accounts manually mapped
  - Unmapped accounts identified and assigned
  - Special accounts (contra, suspense) handled correctly

- [ ] **Intercompany Rules Defined**
  - Revenue/COGS elimination logic approved
  - Payable/Receivable matching logic approved
  - Confidence threshold set: `_____`% (recommend 80%)
  - Sample detections reviewed (at least 10 pairs)

- [ ] **Allocation Rules Configured**
  - Shared expense allocation method: ☐ Revenue Ratio ☐ Headcount ☐ Fixed %
  - Allocation percentages:
    - Teelixir: `____`%
    - Elevate: `____`%
  - Expenses to allocate: ☐ Rent ☐ Software ☐ Accounting ☐ Other

---

### Sample Data to Review

**Example: Account Mapping Suggestions**

```
┌──────────────────────────────────────────────────────────┐
│  HIGH CONFIDENCE MAPPINGS (95%+)                         │
└──────────────────────────────────────────────────────────┘

1. Elevate [310] "Cost of Goods Sold" (DIRECTCOSTS)
   → Teelixir [500] "Cost of Sales" (DIRECTCOSTS)
   Strategy: exact_name_match (98%)
   ☐ Approve  ☐ Reject  ☐ Change

2. Elevate [200] "Sales - Wholesale" (REVENUE)
   → Teelixir [200] "Sales - Wholesale" (REVENUE)
   Strategy: exact_code_match (98%)
   ☐ Approve  ☐ Reject  ☐ Change

3. Elevate [450] "Bank Fees" (EXPENSE)
   → Teelixir [404] "Bank Fees" (EXPENSE)
   Strategy: exact_name_match (95%)
   ☐ Approve  ☐ Reject  ☐ Change

┌──────────────────────────────────────────────────────────┐
│  MEDIUM CONFIDENCE MAPPINGS (70-94%)                     │
└──────────────────────────────────────────────────────────┘

4. Elevate [515] "Advertising & Marketing" (EXPENSE)
   → Teelixir [450] "Advertising and Marketing" (EXPENSE)
   Strategy: similar_name_match (85%)
   Note: "&" vs "and" difference
   ☐ Approve  ☐ Reject  ☐ Change

5. Elevate [610] "IT & Software" (EXPENSE)
   → Teelixir [520] "Software Subscriptions" (EXPENSE)
   Strategy: similar_name_match (72%)
   Note: Partial name match
   ☐ Approve  ☐ Reject  ☐ Change
```

**Example: Intercompany Detection**

```
┌──────────────────────────────────────────────────────────┐
│  DETECTED INTERCOMPANY TRANSACTION #1                    │
└──────────────────────────────────────────────────────────┘

TEELIXIR (Revenue):
  Date:    2024-11-15
  Amount:  $12,450.00
  Account: 200 - Sales - Wholesale
  Desc:    Wholesale order #1234 - Elevate Wholesale

ELEVATE (COGS):
  Date:    2024-11-16
  Amount:  $12,450.00
  Account: 310 - Cost of Goods Sold
  Desc:    Purchase from Teelixir - PO #5678

CONFIDENCE: 93%
  ✓ Exact amount match       +40
  ✓ Date within 1 day        +25
  ✓ Entities in description  +18
  ✓ Valid account pair       +10

ELIMINATION: $12,450.00

☐ Approve elimination
☐ Reject - not intercompany
☐ Modify elimination amount
```

**Review Questions:**
1. Do the mappings make accounting sense?
2. Are all material accounts mapped correctly?
3. Do the intercompany detections look accurate?
4. Any false positives in the detections?

---

### Approval Process

**Step 1:** Run mapping suggestions
```bash
npx tsx scripts/financials/suggest-mappings.ts --review-only
```

**Step 2:** Review and approve interactively
```bash
npx tsx scripts/financials/suggest-mappings.ts
# Press [A] to approve or [R] to reject each mapping
```

**Step 3:** Run intercompany detection
```bash
npx tsx scripts/financials/detect-intercompany.ts --period 2024-11 --dry-run
```

**Step 4:** Review detection results
```bash
# Review on-screen output or exported file
cat intercompany-detections-2024-11.json
```

**Step 5:** Sign off
```
☐ APPROVED - Proceed with these mappings and rules
☐ CHANGES REQUIRED - Specify: _________________________
☐ DENIED - Reason: _____________________________________
```

**Approved By:** `_________________` **Date:** `_________`

---

### Rollback Procedure

If mappings or rules need to be corrected:

1. **Update mappings in Supabase:**
   ```sql
   -- Reset specific mapping
   UPDATE account_mappings
   SET target_account_id = '<new-target-id>',
       approval_status = 'pending'
   WHERE source_account_id = '<elevate-account-id>';
   ```

2. **Delete incorrect eliminations:**
   ```sql
   DELETE FROM intercompany_eliminations
   WHERE period = '2024-11'
     AND approval_status = 'pending';
   ```

3. **Re-run detection:**
   ```bash
   npx tsx scripts/financials/detect-intercompany.ts --period 2024-11
   ```

4. **Regenerate consolidated report:**
   ```bash
   npx tsx scripts/financials/sync-xero-to-supabase.ts --period 2024-11 --regenerate
   ```

---

## Approval Gate 3: Automated Data Sync Schedule

### Description

n8n workflow that **automatically runs** on a schedule to sync Xero data and generate consolidated reports.

**Operations:**
- Scheduled data pull from Xero (monthly)
- Automatic application of approved mappings
- Automatic generation of consolidated reports
- Email notifications

**Components:**
- n8n workflow: `xero-monthly-sync`
- Schedule: 7th of each month at 9:00 AM AEST

### Risk Level: **MEDIUM**

**Why:** Automated operations reduce manual oversight. Risks:
- Incorrect data if source changes (new accounts, etc.)
- API failures could go unnoticed
- Email spam if errors occur
However:
- Read-only operations (no Xero writes)
- Manual review before finalizing reports
- Comprehensive error alerting

---

### Approval Checklist

Before enabling automated workflow:

- [ ] **Workflow Tested Manually**
  - Dry-run completed successfully
  - All nodes execute without errors
  - Output data validated
  - Error handling tested (API down, rate limits, etc.)

- [ ] **Schedule Confirmed**
  - Trigger date: 7th of each month
  - Trigger time: 9:00 AM AEST (UTC+10/11)
  - Timezone handling correct
  - No conflicts with Xero month-end close

- [ ] **Notification Recipients**
  - Success notifications: `_________________________`
  - Error notifications: `_________________________`
  - Critical failures: `_________________________`
  - Email addresses verified

- [ ] **Data Validation Thresholds**
  - Revenue variance threshold: ±`____`% (recommend 20%)
  - Transaction count variance: ±`____`% (recommend 30%)
  - Balance check: Debits = Credits (exact)
  - Automation stops if validation fails: ☐ Yes ☐ No

- [ ] **Manual Review Process**
  - Reports flagged for review if unusual
  - Approval required before sharing with stakeholders
  - Process for investigating discrepancies documented

- [ ] **Rollback Plan**
  - Can disable workflow immediately
  - Can re-run for specific period
  - Can regenerate reports with corrected data

---

### Sample Data to Review

**Example: n8n Workflow Execution Log**

```
┌──────────────────────────────────────────────────────────┐
│  WORKFLOW EXECUTION: xero-monthly-sync                   │
│  Period: 2024-11 (November)                              │
│  Started: 2024-12-07 09:00:15 AEST                      │
└──────────────────────────────────────────────────────────┘

[09:00:15] ✓ Schedule trigger activated
[09:00:16] ✓ Xero credentials validated
[09:00:17] ✓ Fetching Teelixir data...
[09:01:23] ✓ Fetched 1,247 journal lines (Teelixir)
[09:01:24] ✓ Fetching Elevate data...
[09:02:18] ✓ Fetched 834 journal lines (Elevate)
[09:02:19] ✓ Data validation: Debits = Credits ✓
[09:02:20] ✓ Applying 87 approved mappings...
[09:02:22] ✓ Detecting intercompany transactions...
[09:02:25] ✓ Found 12 intercompany pairs (avg confidence: 91%)
[09:02:26] ✓ Applying eliminations...
[09:02:28] ✓ Allocating shared expenses (revenue ratio)...
[09:02:30] ✓ Generating P&L report...
[09:02:32] ✓ Generating Balance Sheet...
[09:02:34] ✓ Post-consolidation validation passed
[09:02:35] ✓ Saving to Supabase (sync_id: abc123)...
[09:02:37] ✓ Sending notification emails...
[09:02:39] ✓ WORKFLOW COMPLETED SUCCESSFULLY

Results:
  Revenue:           $82,345
  COGS:             -$31,567
  Gross Profit:      $50,778
  Operating Exp:    -$38,912
  Net Profit:        $11,866

  Eliminated:        $12,450 (intercompany)
  Allocated:          $3,200 (shared expenses)

  Dashboard: https://financials.growthhq.com/reports/2024-11
```

**Example: Error Notification**

```
Subject: [ERROR] Xero Monthly Sync Failed - 2024-12

Workflow: xero-monthly-sync
Period: 2024-12
Failed At: Node 3 (Fetch Teelixir Data)
Time: 2024-12-07 09:01:45 AEST

Error: XeroAPIError: Rate limit exceeded (60 requests/minute)

Retry Attempt: 1 of 3
Next Retry: 2024-12-07 09:02:45 AEST

Actions:
- Workflow will automatically retry
- If all retries fail, manual intervention required
- View logs: https://n8n.growthhq.com/executions/xyz789
```

**Review Questions:**
1. Is the schedule appropriate (7th of month)?
2. Are notification recipients correct?
3. Is error handling sufficient?
4. Any validation thresholds to adjust?

---

### Approval Process

**Step 1:** Test workflow manually
```bash
# Trigger n8n workflow manually for test period
curl -X POST https://n8n.growthhq.com/webhook/xero-sync-test \
  -H "Content-Type: application/json" \
  -d '{"period": "2024-11", "dry_run": true}'
```

**Step 2:** Review test execution
- Check n8n execution log
- Verify all nodes completed
- Review generated reports
- Confirm emails sent correctly

**Step 3:** Enable schedule
```
☐ APPROVED - Enable automated schedule
   Schedule: 7th of each month at 9:00 AM AEST
   Notifications: jayson@teelixir.com, peter@teelixir.com

☐ CHANGES REQUIRED - Specify: _________________________

☐ DENIED - Reason: _____________________________________
```

**Approved By:** `_________________` **Date:** `_________`

---

### Rollback Procedure

If automated workflow needs to be stopped:

1. **Disable workflow in n8n:**
   - Go to n8n dashboard
   - Find "xero-monthly-sync" workflow
   - Toggle to "Inactive"

2. **Cancel in-progress execution:**
   ```bash
   # Stop current execution
   curl -X DELETE https://n8n.growthhq.com/executions/<execution-id>
   ```

3. **Run manual sync instead:**
   ```bash
   npx tsx scripts/financials/sync-xero-to-supabase.ts --period 2024-12
   ```

4. **Investigate and fix issue**
5. **Re-enable workflow** after confirming fix

---

## Approval Gate 4: Production Dashboard Deployment

### Description

Deploy the consolidated financials **dashboard application** to production.

**Operations:**
- Deploy Next.js app to Digital Ocean
- Configure domain (financials.growthhq.com)
- Set up user authentication (Google OAuth)
- Grant access to approved users
- Enable data export capabilities

**Infrastructure:**
- Platform: Digital Ocean App Platform
- Domain: financials.growthhq.com
- SSL: Let's Encrypt (automatic)
- Authentication: Google OAuth
- Database: Supabase (read-only access)

### Risk Level: **HIGH**

**Why:** Production deployment exposes financial data via web interface. Risks:
- Unauthorized access if auth misconfigured
- Data exposure if HTTPS not enforced
- Data leakage via exports
However:
- Read-only access to Supabase
- No ability to modify Xero data
- Comprehensive access controls

---

### Approval Checklist

Before deploying to production:

- [ ] **Security Review**
  - HTTPS enforced (no HTTP access)
  - Google OAuth configured correctly
  - Allowed email domains: `@teelixir.com`, `@growthhq.com`
  - Session expiry: `____` minutes (recommend 60)
  - No hardcoded credentials in code
  - Environment variables secure

- [ ] **Access Control**
  - Approved users (email addresses):
    1. `_______________________`
    2. `_______________________`
    3. `_______________________`
  - User roles defined: ☐ Admin ☐ Viewer
  - Audit log enabled for access
  - Failed login attempts logged

- [ ] **Data Exposure Review**
  - Dashboard shows: ☐ P&L ☐ Balance Sheet ☐ Transactions
  - Export formats: ☐ PDF ☐ Excel ☐ CSV
  - Transaction details visible: ☐ Yes ☐ No
  - Customer/supplier names visible: ☐ Yes ☐ No
  - Sensitive accounts excluded: _____________________

- [ ] **Performance & Reliability**
  - Load testing completed (100+ concurrent users)
  - Response time < 3 seconds
  - Uptime monitoring configured
  - Backup strategy defined
  - Disaster recovery plan documented

- [ ] **Data Privacy & Compliance**
  - Data residency: Australia (Supabase Sydney region)
  - GDPR considerations (if applicable): N/A
  - Data retention policy: `____` months
  - Right to delete data process: ______________

- [ ] **Deployment Process**
  - Staging environment tested
  - Blue-green deployment strategy
  - Rollback procedure tested
  - Health check endpoint working
  - Monitoring/alerting configured

---

### Sample Data to Review

**Example: Dashboard Preview**

```
┌──────────────────────────────────────────────────────────┐
│  CONSOLIDATED FINANCIALS DASHBOARD                       │
│  Teelixir + Elevate Wholesale                            │
│  https://financials.growthhq.com                         │
└──────────────────────────────────────────────────────────┘

[Header]
  Logo: Teelixir + Elevate
  User: jayson@teelixir.com
  Period Selector: [ November 2024 ▼ ]

[Executive Summary]
  Revenue:           $82,345  (+12% MoM)
  Gross Profit:      $50,778  (61.6% margin)
  Operating Profit:  $11,866  (14.4% margin)
  Net Profit:        $11,866

[Quick Links]
  • View Profit & Loss →
  • View Balance Sheet →
  • Transaction Details →
  • Export to Excel ↓

[Recent Activity]
  • 2024-11-15: Intercompany sale eliminated ($12,450)
  • 2024-11-10: Shared expense allocated (Rent, $3,200)
  • 2024-11-05: Monthly sync completed (1,247 transactions)

[Navigation]
  Dashboard | Reports | Transactions | Settings | Logout
```

**Example: Export File (Excel)**

```
Consolidated_P&L_2024-11.xlsx

Sheet 1: Profit & Loss
┌────────────────────┬────────────┬─────────────┬──────────────┐
│ Account            │ Teelixir   │ Elevate     │ Consolidated │
├────────────────────┼────────────┼─────────────┼──────────────┤
│ Revenue            │  $60,000   │  $30,000    │   $80,000    │
│ (Intercompany)     │ -$10,000   │      $0     │  -$10,000    │
│ COGS               │ -$20,000   │ -$18,000    │  -$28,000    │
│ (Intercompany)     │      $0    │ +$10,000    │  +$10,000    │
│ Gross Profit       │  $30,000   │  $22,000    │   $52,000    │
│ ...                │            │             │              │
└────────────────────┴────────────┴─────────────┴──────────────┘

Sheet 2: Transaction Details
(Intercompany transactions, allocations, etc.)

Sheet 3: Audit Trail
(Mappings applied, eliminations, validation checks)
```

**Review Questions:**
1. Is the user authentication secure?
2. Are the right people granted access?
3. Is sensitive data appropriately protected?
4. Are exports controlled (no unauthorized sharing)?

---

### Approval Process

**Step 1:** Deploy to staging
```bash
# Deploy to staging environment
cd agents/financials-dashboard
npm run deploy:staging
```

**Step 2:** Review staging deployment
- URL: https://financials-staging.growthhq.com
- Test authentication
- Review all pages
- Test exports
- Check performance

**Step 3:** Security audit
- [ ] SSL certificate valid
- [ ] Auth redirects working
- [ ] Unauthorized access blocked
- [ ] Audit logs capturing events

**Step 4:** Approve production deployment
```
☐ APPROVED - Deploy to production
   Domain: financials.growthhq.com
   Users: jayson@teelixir.com, peter@teelixir.com
   Go-live date: _____________

☐ CHANGES REQUIRED - Specify: _________________________

☐ DENIED - Reason: _____________________________________
```

**Approved By:** `_________________` **Date:** `_________`

---

### Rollback Procedure

If production deployment has issues:

1. **Immediate rollback (< 5 minutes):**
   ```bash
   # Revert to previous deployment
   cd agents/financials-dashboard
   npm run rollback
   ```

2. **Disable application:**
   - Update DNS to point to maintenance page
   - OR disable app in Digital Ocean console

3. **Revoke user access:**
   ```bash
   # Disable OAuth app temporarily
   # Update Google OAuth console
   ```

4. **Investigate issue**
   - Review error logs
   - Check monitoring dashboards
   - Identify root cause

5. **Fix and redeploy**
   - Apply fix in staging
   - Retest thoroughly
   - Redeploy to production

---

## Summary: Approval Gate Overview

| Gate | Operation | Risk | Approval Required |
|------|-----------|------|-------------------|
| 1 | Data Reading from Xero | LOW | Sample data review |
| 2 | Account Mappings & Rules | MEDIUM | All mappings reviewed |
| 3 | Automated Sync Schedule | MEDIUM | Workflow tested, schedule confirmed |
| 4 | Production Deployment | HIGH | Security audit, access list approved |

---

## Approval Sign-Off Template

```
CONSOLIDATED FINANCIALS - APPROVAL SUMMARY

Project: Teelixir + Elevate Wholesale Consolidated Reporting
Date: _________________

APPROVALS:

☐ Gate 1: Data Reading from Xero
  Approved by: _________________ Date: _________
  Scope: Historical data from _______ to _______

☐ Gate 2: Account Mappings & Consolidation Logic
  Approved by: _________________ Date: _________
  Mappings: _____ approved, _____ rejected, _____ manual

☐ Gate 3: Automated Data Sync Schedule
  Approved by: _________________ Date: _________
  Schedule: 7th of each month at 9:00 AM AEST

☐ Gate 4: Production Dashboard Deployment
  Approved by: _________________ Date: _________
  Domain: financials.growthhq.com
  Users: ________________________________________

FINAL SIGN-OFF:

I approve the consolidated financials system to proceed
to production with the above configurations.

Name: _______________________
Signature: __________________
Date: _______________________
```

---

## Next Steps

After all 4 approval gates are cleared:

1. ✅ Enable automated monthly sync
2. ✅ Monitor first automated execution
3. ✅ Grant user access to dashboard
4. ✅ Provide user training/walkthrough
5. ✅ Schedule monthly review meetings
6. ✅ Document any issues/improvements

---

**End of Xero Integration Approval Gates**
