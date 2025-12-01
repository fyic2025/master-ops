# Troubleshooting Decision Trees - n8n Workflow Manager

> Step-by-step diagnosis for common n8n workflow issues.

---

## 1. WORKFLOW NOT TRIGGERING

```
START: Workflow not executing as expected
│
├─▶ Is workflow active?
│   │
│   ├─▶ NO → Activate workflow
│   │   │
│   │   ├─▶ Activation fails?
│   │   │   ├─▶ Check for credential issues
│   │   │   ├─▶ Check for syntax errors in nodes
│   │   │   └─▶ Check n8n logs for errors
│   │   │
│   │   └─▶ Activation succeeds → Monitor for next trigger
│   │
│   └─▶ YES → Check trigger type
│       │
│       ├─▶ CRON trigger
│       │   ├─▶ Is cron expression valid?
│       │   ├─▶ Is timezone correct? (Australia/Melbourne)
│       │   ├─▶ Is execution queue backed up?
│       │   └─▶ Check n8n server time
│       │
│       ├─▶ WEBHOOK trigger
│       │   ├─▶ Is webhook URL correct?
│       │   ├─▶ Is webhook registered? (check n8n UI)
│       │   ├─▶ Is caller sending correct method (POST/GET)?
│       │   └─▶ Check firewall/network access
│       │
│       └─▶ MANUAL trigger
│           └─▶ Must be executed manually via UI or API
│
└─▶ Check execution history
    │
    ├─▶ Executions exist but failing → See "EXECUTION FAILURES"
    ├─▶ No executions at all → Trigger not firing
    └─▶ Executions succeeding → Workflow is working
```

**Quick Checks:**
```bash
# Check if workflow is active
curl -s "https://automation.growthcohq.com/api/v1/workflows/{id}" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" | jq '.active'

# Check recent executions
curl -s "https://automation.growthcohq.com/api/v1/executions?workflowId={id}&limit=5" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" | jq '.data[] | {id, status, startedAt}'
```

---

## 2. EXECUTION FAILURES

```
START: Workflow execution failed
│
├─▶ Check execution details
│   │
│   ├─▶ Which node failed?
│   │   │
│   │   ├─▶ HTTP Request node
│   │   │   ├─▶ "401 Unauthorized" → Credentials expired
│   │   │   ├─▶ "403 Forbidden" → Permission/scope issue
│   │   │   ├─▶ "429 Too Many Requests" → Rate limited
│   │   │   ├─▶ "500 Server Error" → External API down
│   │   │   ├─▶ "ECONNREFUSED" → Service unreachable
│   │   │   └─▶ "ETIMEDOUT" → Network/timeout issue
│   │   │
│   │   ├─▶ Code node
│   │   │   ├─▶ "ReferenceError" → Variable not defined
│   │   │   ├─▶ "TypeError" → Wrong data type
│   │   │   ├─▶ "SyntaxError" → JavaScript syntax error
│   │   │   └─▶ Check input data format
│   │   │
│   │   ├─▶ Supabase node
│   │   │   ├─▶ "duplicate key" → Record exists
│   │   │   ├─▶ "not-null constraint" → Missing field
│   │   │   ├─▶ "foreign key violation" → Parent missing
│   │   │   └─▶ Check RLS policies
│   │   │
│   │   └─▶ Credential node (any)
│   │       ├─▶ "Credential not found" → ID mismatch
│   │       ├─▶ "Invalid credentials" → Expired/revoked
│   │       └─▶ Verify in n8n credential settings
│   │
│   └─▶ Error in first node?
│       └─▶ Likely trigger or initial data issue
│
└─▶ Is it recurring?
    │
    ├─▶ Same error every time → Systematic issue
    │   └─▶ Fix root cause
    │
    └─▶ Intermittent → Rate limits or external API issues
        └─▶ Add retry logic / delays
```

**Get Error Details:**
```bash
# Get specific execution with error
curl -s "https://automation.growthcohq.com/api/v1/executions/{execId}" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" | \
  jq '.data.resultData.error, .data.resultData.lastNodeExecuted'
```

---

## 3. CREDENTIAL ISSUES

```
START: Credential-related errors
│
├─▶ "Credential not found"
│   │
│   ├─▶ Credential ID in workflow doesn't match n8n
│   │   ├─▶ Imported from different n8n instance?
│   │   ├─▶ Credential was deleted?
│   │   └─▶ ACTION: Re-link credential in workflow
│   │
│   └─▶ Check credential exists in n8n settings
│
├─▶ "Invalid credentials" / "401 Unauthorized"
│   │
│   ├─▶ OAuth token expired
│   │   ├─▶ Google: 6 months inactive
│   │   ├─▶ HubSpot: May need refresh
│   │   └─▶ ACTION: Re-authenticate OAuth flow
│   │
│   ├─▶ API key revoked/rotated
│   │   └─▶ ACTION: Update credential in n8n
│   │
│   └─▶ Wrong credential type
│       └─▶ Verify node expects this credential type
│
├─▶ "HMAC signature invalid" (Unleashed)
│   │
│   ├─▶ Query string encoding issue
│   ├─▶ Parameters not sorted
│   ├─▶ API key whitespace
│   └─▶ See HISTORICAL-ISSUES for fix
│
└─▶ "invalid_grant" (Google)
    │
    └─▶ Refresh token expired
        ├─▶ Need full re-authentication
        └─▶ ACTION: Run OAuth flow again
```

**Check Credentials:**
```bash
# List all credentials
curl -s "https://automation.growthcohq.com/api/v1/credentials" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" | jq '.data[] | {id, name, type}'
```

---

## 4. RATE LIMITING

```
START: 429 errors or rate limit warnings
│
├─▶ Identify which API
│   │
│   ├─▶ BigCommerce (150/30s)
│   │   └─▶ Add 200ms delay between calls
│   │
│   ├─▶ HubSpot (100/10s)
│   │   └─▶ Add 200ms delay between calls
│   │
│   ├─▶ Shopify (2/s)
│   │   └─▶ Add 500ms delay between calls
│   │
│   ├─▶ Klaviyo (75/s)
│   │   └─▶ Add 50ms delay between calls
│   │
│   └─▶ Google APIs (varies)
│       └─▶ Check specific API quotas
│
├─▶ Is workflow doing bulk operations?
│   │
│   ├─▶ YES → Add splitInBatches node
│   │   ├─▶ Set batch size < API limit
│   │   └─▶ Add wait node between batches
│   │
│   └─▶ NO → Multiple workflows hitting same API
│       └─▶ Stagger cron schedules
│
└─▶ Implement exponential backoff
    │
    └─▶ Add Code node with retry logic
        ```javascript
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(r => setTimeout(r, delay));
        ```
```

---

## 5. DATA ISSUES

```
START: Data not syncing correctly
│
├─▶ Missing data
│   │
│   ├─▶ Check source API returning data
│   ├─▶ Check pagination (all pages fetched?)
│   ├─▶ Check filters (too restrictive?)
│   └─▶ Check date ranges
│
├─▶ Duplicate data
│   │
│   ├─▶ Workflow running multiple times?
│   ├─▶ No unique constraint on target table?
│   └─▶ ACTION: Use UPSERT instead of INSERT
│
├─▶ Wrong data format
│   │
│   ├─▶ Check Code node transformations
│   ├─▶ Check field mappings
│   └─▶ Check data types (string vs number)
│
└─▶ Stale data
    │
    ├─▶ Check last_synced_at in target table
    ├─▶ Check workflow last executed
    └─▶ Is workflow paused/inactive?
```

---

## 6. PERFORMANCE ISSUES

```
START: Workflow running slowly
│
├─▶ Check execution time
│   │
│   ├─▶ < 10s → Normal (simple workflow)
│   ├─▶ 10-60s → Acceptable (moderate)
│   ├─▶ 1-5 min → Slow (complex)
│   └─▶ > 5 min → Investigate
│
├─▶ Which node is slow?
│   │
│   ├─▶ HTTP Request
│   │   ├─▶ External API slow
│   │   ├─▶ Large response payload
│   │   └─▶ Consider caching
│   │
│   ├─▶ Code node
│   │   ├─▶ Inefficient algorithm
│   │   ├─▶ Processing too much data
│   │   └─▶ Optimize code
│   │
│   └─▶ Supabase node
│       ├─▶ Missing indexes
│       ├─▶ Large dataset
│       └─▶ Optimize query
│
└─▶ Too many items in loop?
    │
    ├─▶ Use splitInBatches
    ├─▶ Process in smaller chunks
    └─▶ Consider async processing
```

---

## 7. CONNECTION ISSUES

```
START: Cannot connect to external service
│
├─▶ "ECONNREFUSED"
│   │
│   ├─▶ Service is down
│   ├─▶ Wrong host/port
│   └─▶ Firewall blocking
│
├─▶ "ETIMEDOUT"
│   │
│   ├─▶ Network issues
│   ├─▶ Service overloaded
│   └─▶ Increase timeout setting
│
├─▶ "EAI_AGAIN" / DNS
│   │
│   ├─▶ DNS resolution failed
│   ├─▶ Retry with backoff
│   └─▶ Check network connectivity
│
└─▶ "SSL" errors
    │
    ├─▶ Certificate expired
    ├─▶ Self-signed cert
    └─▶ Check SSL configuration
```

---

## Quick Diagnosis Commands

```bash
# 1. Check workflow status
npx tsx check-n8n-workflow.ts {workflowId}

# 2. Get recent failures
curl -s "https://automation.growthcohq.com/api/v1/executions?status=error&limit=10" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" | jq '.data[] | {id, workflowId, status}'

# 3. Diagnose specific workflow
npx tsx diagnose-workflow-errors.ts {workflowId}

# 4. Test n8n connection
npx tsx test-n8n-connection.ts

# 5. List all credentials
npx tsx list-credentials.ts
```

---

## Quick Fix Matrix

| Symptom | Likely Cause | Quick Fix |
|---------|--------------|-----------|
| Not triggering | Inactive | Activate workflow |
| 401 errors | Token expired | Refresh credentials |
| 429 errors | Rate limited | Add delays |
| Duplicate data | No upsert | Use ON CONFLICT |
| Timeout | Slow API | Increase timeout |
| DNS errors | Network | Retry with backoff |
| HMAC failure | Signature bug | Check encoding |

---

**Document Version:** 1.0
**Last Updated:** 2025-12-01
