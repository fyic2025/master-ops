# n8n Workflows - Fixes Needed (Manual/UI)

**Date**: 2025-12-02
**Last Audit**: 2025-12-02 12:30 AEST
**Status**: Disabled until credentials can be fixed in n8n UI

## Summary

| Category | Count |
|----------|-------|
| Total Active Workflows | 17 |
| Disabled (Need UI Fix) | 6 |
| Working (No Errors) | 14 |
| Fixed via API | 3 |

## Workflows Disabled (Need UI Fix)

### 1. Supabase to HubSpot - Lead Metrics Push
- **ID**: `34mwUAzIzd0vWcK6`
- **Issue**: supabaseApi credential invalid
- **Credentials needed**:
  - `supabaseApi` - Supabase API key
- **Fix**: Re-configure Supabase API credential in n8n UI
- **Note**: HubSpot auth was fixed via API with inline Bearer token

### 2. BOO Checkout Error Email Sender
- **ID**: `4cGCmsd0h8r6giD8`
- **Issue**: Gmail OAuth expired
- **Credentials needed**:
  - `gmailOAuth2` - Gmail OAuth
- **Fix**: Re-authenticate Gmail OAuth in n8n UI

### 3. FIXED: Smartlead → Individual Profiles → Businesses Sync
- **ID**: `C1ZEjrnPZMzazFRW`
- **Issue**: Postgres password authentication failed
- **Credentials needed**:
  - `postgres` - Supabase/Postgres connection
  - `httpBasicAuth` - Smartlead API
  - `httpQueryAuth` - API query auth
- **Fix**: Update Postgres credential with correct password in n8n UI
- **Note**: Disabled 2025-12-02

### 4. 3. Sync Orders to Unleashed
- **ID**: `lj35rsDvrz5LK9Ox`
- **Issue**: Google Sheets OAuth expired
- **Credentials needed**:
  - `googleSheetsOAuth2Api` - FYIC Google Sheets (3 nodes)
  - `openAiApi` - OpenAi account (1 node)
- **Fix**: Re-authenticate Google Sheets OAuth in n8n UI

### 5. Infrastructure - Daily Operations Summary (9AM AEST)
- **ID**: `y3N1o5QIe7uoVpuW`
- **Issue**: Credential validation failure
- **Fix**: Check and update credentials in n8n UI

### 6. Unleashed → HubSpot Order Sync (Deals)
- **ID**: `cD0rlCpqUfggEKYI`
- **Issue**: Postgres (Supabase) credential may be invalid
- **Credentials needed**:
  - `postgres` - Supabase (4 nodes: Lookup, Log Sync, Log Integration, Log Skip)
- **Fix**: Update Postgres/Supabase credential in n8n UI
- **Note**: HubSpot auth was fixed via API with inline Bearer token

## Workflows Fixed (Working)

### 1. System Health Check
- **ID**: `QrVthn0iaHLOXpYW`
- **Fix**: Replaced Slack + local script with HTTP ping to Supabase
- **Status**: Active, running every 5 min

### 2. Teelixir Winback - Hourly Queue Processor
- **ID**: `jTl7OVli2gTLGSqH`
- **Fix**: Changed IF node from `$json.sent` to `Number($json.sent)`
- **Status**: Active

### 3. n8n Daily Backup to Supabase
- **ID**: `CdENdCkCmSQpnbDG`
- **Status**: Active, runs daily at 6AM
- **Note**: Backs up all workflows and executions to Supabase

## Active Workflows (No Issues)

| ID | Name | Credentials |
|----|------|-------------|
| `8Sq4dp3eD0KfR9TS` | Geelong Fitness Test - WORKING | gmailOAuth2, supabaseApi |
| `BZU7YiMydr0YNSCP` | UNIFIED - System Monitor & Protection Hub | gmailOAuth2, httpHeaderAuth, supabaseApi |
| `DuobiL8hagCTbBPo` | Teelixir Partner Application - Production v3 | gmailOAuth2 |
| `FuFWG6epdvYYSiBZ` | Teelixir Partner Form - WORKING VERSION | httpHeaderAuth, gmailOAuth2 |
| `Gqq9VlcTkhkyxQwp` | Teelixir Partner Application Handler | gmailOAuth2 |
| `Pc0HJwrXy0BR6Bub` | ACTIVE - Master Backup System V4 | gmailOAuth2, httpHeaderAuth, supabaseApi |
| `QeEwVaRDrlSsPY2V` | AWS Complete Infrastructure Assessment | aws |
| `R6GpYlXEWtoL0lyy` | MCP Integration Test - Working Solution | gmailOAuth2, supabaseApi |
| `SbNJBlAwVp2LuMcN` | Geelong Fitness Test - FIXED | gmailOAuth2, supabaseApi |
| `Tz2Ik0Ak9I0lTzpH` | AWS RDS & Database Analysis | aws |
| `UaDjUqMSnbDg6Q6t` | BOO - BigCommerce Product Sync (Daily 3AM) | - |
| `UoZVbtuOAP9Hp9nK` | EXECUTE: AusPost Historical Population | gmailOAuth2 |
| `as5zMDvtgFJoZPty` | AWS EC2 Resource Analysis | aws |
| `dEB3P366LI5fip4G` | Beauty Segment to List Automation | - |
| `i0biUmFZljDQBKaq` | PROD - Cellcast SMS Logger | supabaseApi |

## Credential Types Requiring UI Fix

| Credential Type | Description | Fix Method |
|-----------------|-------------|------------|
| `gmailOAuth2` | Gmail OAuth2 | Re-authenticate via Google OAuth flow |
| `supabaseApi` | Supabase API Key | Update API key in n8n credentials |
| `postgres` | Postgres/Supabase DB | Update connection string and password |
| `googleSheetsOAuth2Api` | Google Sheets OAuth | Re-authenticate via Google OAuth flow |

## How to Fix in n8n UI

1. Login to https://automation.growthcohq.com
2. For each disabled workflow:
   - Open the workflow
   - Click on nodes with credential errors (shown with warning icon)
   - Update/re-authenticate the credential
   - Save and activate the workflow
3. Test each workflow manually before leaving active

## Scripts for Auditing

```bash
# Audit all workflows
node scripts/audit-n8n-workflows.js 1
node scripts/audit-n8n-workflows.js 2
node scripts/audit-n8n-workflows.js 3
node scripts/audit-n8n-workflows.js 4

# Get error details for specific workflows
node scripts/get-workflow-errors.js

# Show workflow structure
node scripts/fix-n8n-workflows.js show <workflow_id>

# Disable a workflow
node scripts/fix-n8n-workflows.js disable <workflow_id>
```
