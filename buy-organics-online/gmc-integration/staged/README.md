# Google Merchant Center Integration - STAGED

> **Status:** Staged and ready for deployment
> **Created:** 2025-11-26

## Overview

This integration pulls all product data and issues from Google Merchant Center, cross-references with BigCommerce products, and stores snapshots in Supabase for tracking and analysis.

## Files in This Directory

| File | Purpose |
|------|---------|
| `01-schema.sql` | Supabase tables, views, and functions |
| `02-gmc-client.js` | Google Merchant Center API client |
| `03-snapshot.js` | Main snapshot script |
| `04-n8n-workflow.json` | n8n workflow for Friday scheduling |
| `05-priority-queries.sql` | Queries for issue prioritization |

## Deployment Steps

### Step 1: Create Supabase Schema

Run `01-schema.sql` in Supabase SQL Editor:

1. Go to https://supabase.com/dashboard/project/usibnysqelovfuctmkqw
2. Navigate to SQL Editor
3. Paste contents of `01-schema.sql`
4. Click "Run"

### Step 2: Deploy Scripts

Copy scripts to the live directory:

```bash
# From staged directory
cp 02-gmc-client.js ../
cp 03-snapshot.js ../
```

### Step 3: Test Snapshot Manually

```bash
cd /home/user/master-ops/buy-organics-online/gmc-integration
node 03-snapshot.js
```

### Step 4: Set Up n8n Workflow

1. Go to your n8n instance
2. Import `04-n8n-workflow.json`
3. Update the webhook URLs if you want notifications
4. Activate the workflow

## Schedule

- **Frequency:** Weekly on Fridays
- **Time:** 6:00 AM AEST
- **Method:** n8n scheduled trigger

## Credentials Used

| Credential | Source |
|------------|--------|
| `boo/google_merchant_id` | Vault |
| `global/google_ads_client_id` | Vault |
| `global/google_ads_client_secret` | Vault |
| `boo/google_ads_refresh_token` | Vault |

## Data Captured

### Per Snapshot
- Total products count
- Approved/Disapproved/Pending counts
- Total issues (errors + warnings)
- BigCommerce cross-reference stats

### Per Product
- GMC product ID and offer ID (SKU)
- Title, link, price, availability
- Status (approved/disapproved/pending)
- Destination statuses
- Matched BigCommerce product ID

### Per Issue
- Issue code and type
- Severity level
- Affected attribute
- Description and documentation URL
- Servability impact

## Key Views

| View | Purpose |
|------|---------|
| `gmc_current_snapshot` | Latest completed snapshot |
| `gmc_current_products` | All products from latest snapshot |
| `gmc_disapproved_products` | Priority fixes - losing sales |
| `gmc_issue_summary` | Issues ranked by affected products |
| `gmc_progress` | Week-over-week comparison |
| `gmc_weekly_trend` | Last 8 weeks trend |
| `gmc_missing_products` | In BC but not in GMC |

## Priority Workflow

1. **Priority 1:** Fix disapproved products (losing sales)
2. **Priority 2:** Fix most common issues (biggest impact)
3. **Priority 3:** Add missing products to GMC
4. **Priority 4:** Resolve warnings on approved products

## Monitoring Progress

Run the comparison query weekly:
```sql
SELECT * FROM gmc_progress;
```

Target metrics:
- Approval rate > 95%
- Disapproved count → 0
- Missing from GMC → 0
