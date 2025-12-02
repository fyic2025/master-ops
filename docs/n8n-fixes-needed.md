# n8n Workflows - Fixes Needed (Manual/UI)

**Date**: 2025-12-02
**Status**: Disabled until credentials can be fixed in n8n UI

## Workflows Disabled (Need UI Fix)

### 1. 3. Sync Orders to Unleashed
- **ID**: `lj35rsDvrz5LK9Ox`
- **Issue**: Google Sheets OAuth expired
- **Credentials needed**:
  - `googleSheetsOAuth2Api` - FYIC Google Sheets (3 nodes)
  - `openAiApi` - OpenAi account (1 node)
- **Fix**: Re-authenticate Google Sheets OAuth in n8n UI

### 2. Infrastructure - Daily Operations Summary (9AM AEST)
- **ID**: `y3N1o5QIe7uoVpuW`
- **Issue**: Credential validation failure
- **Fix**: Check and update credentials in n8n UI

### 3. Unleashed → HubSpot Order Sync (Deals)
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

### 3. Supabase to HubSpot - Lead Metrics Push
- **ID**: `34mwUAzIzd0vWcK6`
- **Fix**: Added inline HubSpot Bearer token from vault
- **Status**: Active

## How to Fix in n8n UI

1. Login to https://automation.growthcohq.com
2. For each disabled workflow:
   - Open the workflow
   - Click on nodes with credential errors (shown with warning icon)
   - Update/re-authenticate the credential
   - Save and activate the workflow
3. Test each workflow manually before leaving active
