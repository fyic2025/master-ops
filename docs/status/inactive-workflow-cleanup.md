# Inactive Workflow Cleanup Guide

**Date**: 2025-12-02
**Last Updated**: 2025-12-02 14:00 UTC
**Total Inactive**: 346 workflows

## ✅ FIXED VIA API (2025-12-02)

**83 HTTP nodes across 32 workflows were automatically fixed:**
- Changed `authentication: 'genericCredentialType'` to `authentication: 'none'`
- All nodes now use inline headers instead of n8n credential references
- Verified working: System Monitor workflow (BZU7YiMydr0YNSCP) executed successfully

**Script used**: `node scripts/batch-fix-http-auth.js`

## Summary

| Category | Count | Action |
|----------|-------|--------|
| Clean (no creds) | 159 | Ready to activate if needed |
| Clean (working creds) | 58+32 | Ready to activate if needed |
| Needs Fix | ~73 | Fix credentials in n8n UI |
| Verify | ~24 | Check after fixing main creds |

## Credentials to Fix in n8n UI

**Fix these 4 credentials to unlock 105+ workflows:**

### 1. supabaseApi (66 workflows)
- **Issue**: API key invalid or expired
- **Fix**: Go to n8n → Credentials → find "Supabase" → Update API key
- **Get key from**: Supabase dashboard → Project Settings → API → anon/service key

### 2. gmailOAuth2 (42 workflows)
- **Issue**: Google OAuth token expired
- **Fix**: Go to n8n → Credentials → find "Gmail OAuth2" → Click "Reconnect"
- **Note**: Will open Google login flow

### 3. postgres (16 workflows)
- **Issue**: Password authentication failed
- **Fix**: Go to n8n → Credentials → find "Postgres" → Update password
- **Get password from**: Supabase dashboard → Project Settings → Database → Connection string

### 4. googleSheetsOAuth2Api (7 workflows)
- **Issue**: Google OAuth token expired
- **Fix**: Go to n8n → Credentials → find "Google Sheets OAuth2" → Click "Reconnect"

### 5. googleDriveOAuth2Api (2 workflows)
- **Issue**: Google OAuth token expired
- **Fix**: Same as Gmail - reconnect Google OAuth

### 6. googleApi (1 workflow)
- **Issue**: Google OAuth token expired
- **Fix**: Same as Gmail - reconnect Google OAuth

## Credential Status Reference

| Credential Type | Status | Reason |
|-----------------|--------|--------|
| `gmailOAuth2` | ❌ BROKEN | OAuth expired |
| `googleSheetsOAuth2Api` | ❌ BROKEN | OAuth expired |
| `googleDriveOAuth2Api` | ❌ BROKEN | OAuth expired |
| `googleApi` | ❌ BROKEN | OAuth expired |
| `supabaseApi` | ❌ BROKEN | API key invalid |
| `postgres` | ❌ BROKEN | Connection/password |
| `httpHeaderAuth` | ✅ WORKING | Bearer token |
| `httpQueryAuth` | ✅ WORKING | Query param auth |
| `httpBasicAuth` | ✅ WORKING | Basic auth |
| `aws` | ✅ WORKING | IAM credentials |
| `unleashedSoftwareApi` | ✅ WORKING | HMAC auth |
| `openAiApi` | 🟡 LIKELY OK | API key |
| `shopifyAccessTokenApi` | 🟡 LIKELY OK | Access token |
| `hubspotAppToken` | 🟡 LIKELY OK | App token |
| `anthropicApi` | 🟡 LIKELY OK | API key |

## Clean Workflows (217 total)

### No Credentials Needed (159)
These workflows can be activated anytime without credential concerns:
- Export/utility workflows
- API endpoint workflows
- Data transformation workflows
- Test/demo workflows

### Only Working Credentials (58)
These use only working credential types (httpHeaderAuth, aws, etc.):
- Smartlead sync workflows
- HubSpot sync workflows (using httpHeaderAuth)
- AWS analysis workflows

## Workflow Cleanup Scripts

```bash
# Analyze inactive workflows
node scripts/analyze-inactive-patterns.js

# Check specific workflow
node scripts/fix-n8n-workflows.js show <workflow_id>

# Disable a workflow (if needed)
node scripts/fix-n8n-workflows.js disable <workflow_id>
```

## Recommended Cleanup Order

1. **Fix Google OAuth first** - One re-auth fixes Gmail, Sheets, Drive
2. **Fix supabaseApi** - Biggest impact (66 workflows)
3. **Fix postgres** - Often same as Supabase connection
4. **Verify "unknown" credentials** - Test one workflow of each type

## After Fixing

Once credentials are fixed:
1. Run `node scripts/analyze-inactive-patterns.js` again
2. Should see "Needs Fix" drop to near zero
3. All 346 inactive workflows should be "clean"
