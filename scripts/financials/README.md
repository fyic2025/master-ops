# Financial Consolidation Scripts

Scripts for setting up and running the consolidated financial reporting system for Teelixir and Elevate Wholesale.

## 📚 Documentation

**Detailed Specifications:**
- [PHASE-4-DETAILED-SPEC.md](../../docs/PHASE-4-DETAILED-SPEC.md) - Complete implementation specification
- [CONSOLIDATION-ALGORITHM.md](../../docs/CONSOLIDATION-ALGORITHM.md) - Consolidation algorithm with examples
- [XERO-APPROVAL-GATES.md](../../docs/XERO-APPROVAL-GATES.md) - Approval process for Xero operations
- [TESTING-PLAN.md](../../docs/TESTING-PLAN.md) - Testing strategy
- [SPECIFICATIONS-INDEX.md](../../docs/SPECIFICATIONS-INDEX.md) - Master index

## Prerequisites

### 1. Xero OAuth Apps

Create OAuth apps in Xero for both organizations:

1. Go to https://developer.xero.com/
2. Create a new app for each organization:
   - **Teelixir App**
     - Client ID: `D4D023D4A6F34120866AA7FEC96E8250`
     - Client Secret: *Copy the actual secret (NOT the creation timestamp)*
   - **Elevate Wholesale App**
     - Client ID: `1E2EE797CCFC4CEC8F8E0CCD75940869`
     - Client Secret: *Copy the actual secret (NOT the creation timestamp)*

3. Configure OAuth redirect URI for both apps:
   ```
   http://localhost:3000/callback
   ```

4. Required scopes:
   - `offline_access`
   - `accounting.transactions.read`
   - `accounting.journals.read`
   - `accounting.reports.read`
   - `accounting.contacts.read`
   - `accounting.settings.read`

### 2. Environment Variables

Create a `.env` file in the project root with:

```bash
# Teelixir Xero App
XERO_TEELIXIR_CLIENT_ID=D4D023D4A6F34120866AA7FEC96E8250
XERO_TEELIXIR_CLIENT_SECRET=your-actual-client-secret-here

# Elevate Wholesale Xero App
XERO_ELEVATE_CLIENT_ID=1E2EE797CCFC4CEC8F8E0CCD75940869
XERO_ELEVATE_CLIENT_SECRET=your-actual-client-secret-here

# Supabase
SUPABASE_URL=See MASTER-CREDENTIALS-COMPLETE.env
SUPABASE_SERVICE_ROLE_KEY=See MASTER-CREDENTIALS-COMPLETE.env
```

### 3. Deploy Database Schema

Deploy the schema to Supabase before running any scripts:

```bash
npx tsx scripts/financials/deploy-schema.ts
```

Or manually run `infra/supabase/schema-financials.sql` in Supabase SQL Editor.

## 🚀 Quick Start

### Complete First-Time Setup

```bash
# 1. Authenticate with Xero (both organizations)
npx tsx scripts/financials/setup-xero-auth-direct.ts

# 2. Analyze chart of accounts
npx tsx scripts/financials/analyze-chart-of-accounts.ts

# 3. Review and approve account mappings (interactive)
npx tsx scripts/financials/suggest-mappings.ts

# 4. Detect intercompany transactions for a period
npx tsx scripts/financials/detect-intercompany.ts --period 2024-11

# 5. Sync and consolidate
npx tsx scripts/financials/sync-xero-to-supabase.ts --period 2024-11
```

## 📖 Script Reference

### 1. setup-xero-auth-direct.ts

**Purpose:** Authenticate with both Xero organizations and store credentials.

**Usage:**
```bash
npx tsx scripts/financials/setup-xero-auth-direct.ts
```

**What it does:**
- Starts a local callback server on port 3000
- Opens your browser to authenticate with Xero
- Exchanges authorization codes for access tokens
- Stores credentials in `.xero-credentials.json`

**Important:** You'll need to authenticate twice (once for each organization).

---

### 2. analyze-chart-of-accounts.ts

**Purpose:** Pull and analyze the chart of accounts from both organizations.

**Usage:**
```bash
npx tsx scripts/financials/analyze-chart-of-accounts.ts
```

**What it does:**
- Fetches all accounts from both Xero organizations
- Compares account structures
- Generates initial mapping suggestions
- Saves analysis to `account-analysis.json`

**Output File:** `account-analysis.json`

---

### 3. suggest-mappings.ts ✨ NEW

**Purpose:** Interactive tool to review and approve AI-suggested account mappings.

**Usage:**
```bash
# Interactive approval session
npx tsx scripts/financials/suggest-mappings.ts

# Review only (no saving)
npx tsx scripts/financials/suggest-mappings.ts --review-only

# Auto-approve high-confidence mappings
npx tsx scripts/financials/suggest-mappings.ts --auto-approve-threshold 95

# Export mappings to JSON
npx tsx scripts/financials/suggest-mappings.ts --export mappings.json

# Show all mappings including approved
npx tsx scripts/financials/suggest-mappings.ts --show-all
```

**Features:**
- **4 Confidence Strategies:**
  - Exact code match (98%)
  - Exact name match (95%)
  - Similar name match (70-85%)
  - Type/class match (50%)
- **Interactive CLI:** Review each mapping with context
- **Manual Override:** Choose different target for low-confidence mappings
- **Auto-Approval:** Automatically approve mappings above threshold
- **Supabase Integration:** Saves approved mappings to database

**Specification:** See [PHASE-4-DETAILED-SPEC.md Part 1](../../docs/PHASE-4-DETAILED-SPEC.md)

---

### 4. detect-intercompany.ts ✨ NEW

**Purpose:** Identify intercompany transactions between Teelixir and Elevate Wholesale.

**Usage:**
```bash
# Detect for specific period
npx tsx scripts/financials/detect-intercompany.ts --period 2024-11

# Custom date range
npx tsx scripts/financials/detect-intercompany.ts --from 2024-11-01 --to 2024-11-30

# Dry-run (no save)
npx tsx scripts/financials/detect-intercompany.ts --period 2024-11 --dry-run

# Custom confidence threshold
npx tsx scripts/financials/detect-intercompany.ts --period 2024-11 --threshold 85

# Export detections to JSON
npx tsx scripts/financials/detect-intercompany.ts --period 2024-11 --export detections.json
```

**Detection Types:**
- **Revenue/COGS Pairs:** Teelixir sales → Elevate purchases
- **Payable/Receivable Pairs:** Intercompany debt

**Confidence Scoring (0-100%):**
- Amount matching: 40 points
- Date proximity: 30 points
- Description/contact matching: 20 points
- Valid account type pair: 10 points

**Specification:** See [PHASE-4-DETAILED-SPEC.md Part 2](../../docs/PHASE-4-DETAILED-SPEC.md)

---

### 5. sync-xero-to-supabase.ts ✨ NEW

**Purpose:** Complete data pipeline - fetch, map, eliminate, consolidate, and report.

**Usage:**
```bash
# Sync specific month
npx tsx scripts/financials/sync-xero-to-supabase.ts --period 2024-11

# Sync custom date range
npx tsx scripts/financials/sync-xero-to-supabase.ts --from 2024-11-01 --to 2024-11-30

# Sync 12+ months historical data
npx tsx scripts/financials/sync-xero-to-supabase.ts --historical

# Regenerate reports from existing data
npx tsx scripts/financials/sync-xero-to-supabase.ts --period 2024-11 --regenerate

# Dry-run (test without saving)
npx tsx scripts/financials/sync-xero-to-supabase.ts --period 2024-11 --dry-run
```

**Complete Pipeline:**
1. ✅ Validates prerequisites (credentials, mappings, connection)
2. ✅ Fetches journal lines from both Xero organizations
3. ✅ Applies approved account mappings to Elevate data
4. ✅ Loads approved intercompany eliminations
5. ✅ Aggregates transactions (excluding eliminated)
6. ✅ Generates Profit & Loss statement
7. ✅ Generates Balance Sheet
8. ✅ Validates consolidation (debits=credits, balancing)
9. ✅ Saves journal lines, reports, and sync history to Supabase

**Output:**
- Journal lines saved to `journal_lines` table
- Consolidated reports saved to `consolidated_reports` table
- Sync history saved to `sync_history` table

**Specification:** See [CONSOLIDATION-ALGORITHM.md](../../docs/CONSOLIDATION-ALGORITHM.md)

---

### 6. deploy-schema.ts

**Purpose:** Deploy database schema to Supabase.

**Usage:**
```bash
npx tsx scripts/financials/deploy-schema.ts
```

**Alternative:** Manually run `infra/supabase/schema-financials.sql` in Supabase SQL Editor.

---

## 📋 Complete Workflow

### First-Time Setup (One-Time)

```bash
# 1. Deploy database schema
npx tsx scripts/financials/deploy-schema.ts

# 2. Authenticate with Xero
npx tsx scripts/financials/setup-xero-auth-direct.ts

# 3. Analyze chart of accounts
npx tsx scripts/financials/analyze-chart-of-accounts.ts

# 4. Approve account mappings (interactive)
npx tsx scripts/financials/suggest-mappings.ts

# 5. Review mapping results
npx tsx scripts/financials/suggest-mappings.ts --show-all
```

### Monthly Consolidation (Recurring)

```bash
# 1. Detect intercompany transactions
npx tsx scripts/financials/detect-intercompany.ts --period 2024-11

# 2. Review and approve detections (in Supabase or future UI)

# 3. Run sync and consolidation
npx tsx scripts/financials/sync-xero-to-supabase.ts --period 2024-11

# 4. Review consolidated reports in dashboard
```

### Historical Data Load (One-Time)

```bash
# Load 12+ months of data
npx tsx scripts/financials/sync-xero-to-supabase.ts --historical
```

---

## 📁 Files Generated

| File | Description | Commit to Git? |
|------|-------------|----------------|
| `.xero-credentials.json` | OAuth tokens | ❌ NO (add to .gitignore) |
| `account-analysis.json` | COA analysis | ❌ NO (contains account details) |
| `mappings.json` | Exported mappings | ✅ Optional (review data) |
| `detections.json` | Exported detections | ❌ NO (contains transaction details) |

**Add to .gitignore:**
```
.xero-credentials.json
account-analysis.json
account-mappings.json
detections.json
*.local.json
```

---

## 🔒 Security & Approval Gates

**Approval Required Before:**
- [ ] **Gate 1:** Reading data from Xero (review sample data)
- [ ] **Gate 2:** Account mappings (approve all mappings)
- [ ] **Gate 3:** Automated workflows (approve schedule)
- [ ] **Gate 4:** Production deployment (approve access list)

See [XERO-APPROVAL-GATES.md](../../docs/XERO-APPROVAL-GATES.md) for detailed checklists.

---

## 🐛 Troubleshooting

### "No tokens found for tenant"
Run `setup-xero-auth-direct.ts` again to re-authenticate.

### "Token expired"
Tokens are automatically refreshed. If issues persist, re-authenticate.

### "Port 3000 already in use"
Stop any process using port 3000 or update `XERO_REDIRECT_URI` to use a different port.

### "No approved account mappings found"
Run `suggest-mappings.ts` and approve at least the high-confidence mappings.

### "No mapping found for Elevate account X"
One or more Elevate accounts are unmapped. Run `suggest-mappings.ts` to complete all mappings.

### "Validation failed: Debits != Credits"
Check data quality in Xero. Ensure all journals are balanced before syncing.

### "Balance sheet unbalanced"
Review consolidation logic. Check for missing account types or incorrect mappings.

---

## 🎯 Success Criteria

- [ ] Both Xero accounts can be authenticated
- [ ] Chart of accounts fetched successfully
- [ ] All active accounts mapped (100%)
- [ ] High-confidence mappings (≥95%) approved
- [ ] Intercompany transactions detected (sample reviewed)
- [ ] Historical data synced (12+ months)
- [ ] Consolidated P&L accurate (within 0.1%)
- [ ] Balance sheet balanced (Assets = Liabilities + Equity)
- [ ] Reports ready for review

---

## 📞 Support

- **Xero API Docs:** https://developer.xero.com/documentation/api/accounting/overview
- **Supabase Docs:** https://supabase.com/docs
- **OAuth 2.0 Guide:** https://developer.xero.com/documentation/guides/oauth2/overview
- **Detailed Specifications:** See [docs/SPECIFICATIONS-INDEX.md](../../docs/SPECIFICATIONS-INDEX.md)

---

## 🚀 Next Steps

After completing the scripts above:

1. **Build Dashboard** (Phase 6)
   - Next.js app with Supabase
   - P&L and Balance Sheet views
   - Transaction drill-down
   - Export functionality

2. **Deploy Automation** (Phase 7)
   - n8n workflow for monthly sync
   - Email notifications
   - Monitoring and alerting

3. **Production Deployment**
   - Deploy to Digital Ocean
   - Set up financials.growthhq.com
   - Configure user access
   - Enable automated monthly runs
