# Apify + n8n Integration Playbook

## Overview

This playbook documents how to properly integrate Apify with n8n workflows, replacing hardcoded tokens with secure credential references.

---

## Step 1: Create n8n Apify Credential

### Manual UI Setup (One-Time)

1. Go to: https://automation.growthcohq.com
2. Navigate to: **Settings** (gear icon) → **Credentials**
3. Click: **Add Credential**
4. Search for: `HTTP Header Auth`
5. Configure:
   - **Name**: `Apify API Token`
   - **Header Name**: `Authorization`
   - **Header Value**: `Bearer <YOUR_APIFY_TOKEN>` (get from creds.js)
6. Click: **Save**

### Verify Credential

After saving, the credential should appear in the credentials list as "Apify API Token".

---

## Step 2: Update Existing Workflows

### Current Hardcoded Pattern (Bad)

```json
{
  "name": "Get Apify Results",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "https://api.apify.com/v2/...",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Authorization",
          "value": "Bearer <YOUR_APIFY_TOKEN>"
        }
      ]
    }
  }
}
```

### Correct Credential Pattern (Good)

```json
{
  "name": "Get Apify Results",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "https://api.apify.com/v2/...",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpHeaderAuth"
  },
  "credentials": {
    "httpHeaderAuth": {
      "id": "[AUTO_GENERATED_ID]",
      "name": "Apify API Token"
    }
  }
}
```

---

## Step 3: Workflow Update Procedure

### For Each Apify Workflow:

1. **Open workflow in n8n UI**
2. **Find HTTP Request nodes** that call `api.apify.com`
3. **For each node:**
   - Open node settings
   - Under "Authentication", select: `Generic Credential Type`
   - Under "Generic Auth Type", select: `HTTP Header Auth`
   - Under "Credential", select: `Apify API Token`
   - Remove any manually set Authorization headers
4. **Save workflow**
5. **Test with manual execution**

---

## Workflows to Update

| Workflow ID | Name | Status | Priority |
|-------------|------|--------|----------|
| `8Sq4dp3eD0KfR9TS` | Geelong Fitness Test | ACTIVE | HIGH |
| `06NyzDPQnyLqdr9a` | ARCHIVED - Fitness Scraper | inactive | LOW |
| `0RkDLqxj49oLl8AL` | IMPORT Sept 23 Apify Data | inactive | LOW |
| `4EG3NJdcgwyhq4Q8` | QLD Fitness Scraper | inactive | MEDIUM |
| `4V4h35eHtNGLr0QC` | Generate Leads with Google Maps | inactive | MEDIUM |
| `AlbJx7n12wg0Bf2m` | Australia-Wide Fitness DEBUG | inactive | LOW |
| `CdE3wIj8rfax3qXY` | Fitness Scraper FIXED | inactive | MEDIUM |

---

## Standard Workflow Pattern

### Google Maps Lead Scrape Workflow

```
1. Trigger
   └─ Cron (daily at 6am) OR Manual

2. Run Actor
   └─ HTTP Request → POST api.apify.com/v2/acts/compass~crawler-google-places/runs
   └─ Auth: Apify API Token (credential)
   └─ Body: { searchStringsArray, maxCrawledPlacesPerSearch, etc. }

3. Wait for Completion
   └─ Wait node: 60 seconds
   └─ Loop until run.status === 'SUCCEEDED'

4. Get Results
   └─ HTTP Request → GET api.apify.com/v2/datasets/{datasetId}/items
   └─ Auth: Apify API Token (credential)

5. Transform Data
   └─ Code node: Map Apify fields to our schema

6. Store in Supabase
   └─ Supabase node: Insert into wholesale_lead_queue

7. (Optional) Send Report
   └─ Gmail node: Summary to team
```

---

## Credential Rotation

### Monthly Rotation Procedure

1. Generate new token in Apify console
2. Store in vault: `node creds.js store global apify_token "NEW_TOKEN" "Apify API token"`
3. Update n8n credential in UI
4. Test one workflow manually
5. Document rotation date

### Token Location
- **Vault**: `global/apify_token`
- **n8n**: Credentials → "Apify API Token"

---

## Troubleshooting

### "401 Unauthorized"
- Token is invalid or expired
- Check: Apify Console → Account → Integrations
- Verify token in n8n credential matches vault

### "Credential not found"
- Credential was deleted or renamed
- Recreate using Step 1

### "Rate limit exceeded"
- Too many concurrent requests
- Add wait nodes between API calls
- Check Apify usage limits

---

## Best Practices

1. **Never hardcode tokens** in workflow JSON
2. **Use credential references** for all API calls
3. **Add error handling** for failed runs
4. **Log to Supabase** for monitoring
5. **Set timeouts** on HTTP request nodes (60s+)

---

## Related Documentation

- [SKILL.md](../SKILL.md) - Main skill documentation
- [QUICK-REFERENCE.md](../QUICK-REFERENCE.md) - Quick commands
- [apify-client.ts](../scripts/apify-client.ts) - TypeScript client

---

**Last Updated:** 2025-12-03
