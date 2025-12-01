# Decision Trees - Supabase Expert

> Step-by-step troubleshooting guides for common scenarios.

---

## 1. SYNC FAILURE DIAGNOSIS

```
START: Sync operation failed
│
├─▶ Check integration_logs for error
│   │
│   ├─▶ Error: "401 Unauthorized"
│   │   │
│   │   ├─▶ Which service?
│   │   │   ├─▶ Unleashed → Check HMAC signature (see Historical Issues)
│   │   │   ├─▶ Shopify → Verify access token not revoked
│   │   │   ├─▶ BigCommerce → Check API credentials scope
│   │   │   ├─▶ HubSpot → Verify token refresh
│   │   │   └─▶ Google → OAuth refresh token expired → Re-authenticate
│   │   │
│   │   └─▶ ACTION: node creds.js get [project] [credential]
│   │              Verify credential exists and is valid
│   │
│   ├─▶ Error: "429 Too Many Requests"
│   │   │
│   │   ├─▶ Which service?
│   │   │   ├─▶ BigCommerce → Max 150 req/30s → Add 200ms delays
│   │   │   ├─▶ HubSpot → Max 100 req/10s → Add 200ms delays
│   │   │   ├─▶ Shopify → Max 2 req/s → Add 500ms delays
│   │   │   └─▶ Klaviyo → Max 75 req/s → Add 50ms delays
│   │   │
│   │   └─▶ ACTION: Add rate limiting to sync script
│   │
│   ├─▶ Error: "Connection refused" / "ECONNREFUSED"
│   │   │
│   │   ├─▶ Is service online?
│   │   │   ├─▶ Check status page (status.supabase.com, etc.)
│   │   │   ├─▶ Retry in 5 minutes
│   │   │   └─▶ If persists → Escalate
│   │   │
│   │   └─▶ ACTION: Wait and retry with exponential backoff
│   │
│   ├─▶ Error: "duplicate key"
│   │   │
│   │   ├─▶ Is it a retry?
│   │   │   ├─▶ YES → Record already exists, safe to ignore
│   │   │   └─▶ NO → Check for race condition
│   │   │       ├─▶ Multiple syncs running? → Add locking
│   │   │       └─▶ Source has duplicates? → Dedupe before insert
│   │   │
│   │   └─▶ ACTION: Use UPSERT (ON CONFLICT DO UPDATE)
│   │
│   └─▶ Error: "relation does not exist"
│       │
│       └─▶ Table not deployed
│           ├─▶ Check schema file exists
│           ├─▶ Run migration in Supabase SQL Editor
│           └─▶ Verify with: SELECT * FROM pg_tables WHERE tablename = 'xxx'
│
└─▶ No error in logs
    │
    ├─▶ Check if sync ran at all
    │   ├─▶ integration_logs empty for timeframe → Cron not running
    │   └─▶ integration_logs shows success → Check data quality
    │
    └─▶ ACTION: Check n8n workflow executions or cron schedule
```

---

## 2. DATA QUALITY ISSUES

```
START: Data looks wrong or missing
│
├─▶ What type of issue?
│   │
│   ├─▶ Missing records
│   │   │
│   │   ├─▶ Check source system count vs Supabase count
│   │   │   ├─▶ Source has more → Sync incomplete
│   │   │   │   ├─▶ Check pagination (all pages fetched?)
│   │   │   │   ├─▶ Check filters (are we filtering too much?)
│   │   │   │   └─▶ Check sync logs for errors mid-batch
│   │   │   │
│   │   │   └─▶ Counts match → Data was filtered correctly
│   │   │
│   │   └─▶ ACTION: Review sync script filters and pagination
│   │
│   ├─▶ Stale data
│   │   │
│   │   ├─▶ Check last_synced_at on records
│   │   │   ├─▶ Old timestamps → Sync not running
│   │   │   │   ├─▶ Check n8n workflow active?
│   │   │   │   ├─▶ Check cron schedule
│   │   │   │   └─▶ Check for blocking errors
│   │   │   │
│   │   │   └─▶ Recent timestamps → Source data is stale
│   │   │
│   │   └─▶ ACTION: Check workflow execution history
│   │
│   ├─▶ Duplicate records
│   │   │
│   │   ├─▶ Check unique constraints
│   │   │   ├─▶ No constraint → Add UNIQUE constraint
│   │   │   └─▶ Has constraint → Check for key variations
│   │   │       ├─▶ Case sensitivity? → Normalize keys
│   │   │       ├─▶ Whitespace? → TRIM values
│   │   │       └─▶ Different IDs same entity? → Implement dedup logic
│   │   │
│   │   └─▶ ACTION: Add deduplication to sync or unique constraint
│   │
│   └─▶ Wrong values
│       │
│       ├─▶ Check field mapping
│       │   ├─▶ Source field → Target field correct?
│       │   ├─▶ Data types match?
│       │   └─▶ Transformations correct?
│       │
│       └─▶ ACTION: Review sync script field mappings
```

---

## 3. PERFORMANCE ISSUES

```
START: Database is slow
│
├─▶ What's slow?
│   │
│   ├─▶ Specific query
│   │   │
│   │   ├─▶ Run EXPLAIN ANALYZE on query
│   │   │   ├─▶ Seq Scan on large table → Add index
│   │   │   ├─▶ Nested Loop with high rows → Rewrite query
│   │   │   ├─▶ Sort taking long → Add index on sort column
│   │   │   └─▶ Hash/Merge Join slow → Check join columns indexed
│   │   │
│   │   └─▶ ACTION: CREATE INDEX CONCURRENTLY idx_xxx ON table(column)
│   │
│   ├─▶ All queries slow
│   │   │
│   │   ├─▶ Check connection count
│   │   │   ├─▶ Near limit → Connection exhaustion
│   │   │   │   ├─▶ Use connection pooler (port 6543)
│   │   │   │   └─▶ Reduce pool size per client
│   │   │   │
│   │   │   └─▶ Connections normal → Check table bloat
│   │   │       ├─▶ High dead tuples → Run VACUUM ANALYZE
│   │   │       └─▶ Table very large → Consider partitioning
│   │   │
│   │   └─▶ ACTION: VACUUM ANALYZE tablename;
│   │
│   ├─▶ Inserts slow
│   │   │
│   │   ├─▶ Check indexes on table
│   │   │   ├─▶ Many indexes → Each insert updates all indexes
│   │   │   │   └─▶ Consider dropping unused indexes
│   │   │   │
│   │   │   └─▶ Few indexes → Check triggers
│   │   │       └─▶ Triggers doing heavy work? → Optimize or async
│   │   │
│   │   └─▶ ACTION: Use COPY for bulk inserts, batch commits
│   │
│   └─▶ Dashboard/API slow
│       │
│       ├─▶ Check if using views
│       │   ├─▶ Complex view → Consider materialized view
│       │   └─▶ Direct table → Check query patterns
│       │
│       └─▶ ACTION: Add appropriate indexes or materialize views
```

---

## 4. SECURITY DIAGNOSIS

```
START: Security concern or unauthorized access
│
├─▶ What type?
│   │
│   ├─▶ Credential exposed
│   │   │
│   │   ├─▶ Where exposed?
│   │   │   ├─▶ In code (hardcoded) → Remove immediately
│   │   │   │   ├─▶ Rotate credential in source system
│   │   │   │   ├─▶ Update vault with new value
│   │   │   │   └─▶ Scrub git history if committed
│   │   │   │
│   │   │   ├─▶ In logs → Sanitize logging
│   │   │   │   └─▶ Redact sensitive values in log output
│   │   │   │
│   │   │   └─▶ In error messages → Catch and sanitize
│   │   │
│   │   └─▶ ACTION: Rotate credential, update vault, audit access
│   │
│   ├─▶ Unauthorized data access
│   │   │
│   │   ├─▶ Is RLS enabled?
│   │   │   ├─▶ NO → Data visible to all roles
│   │   │   │   └─▶ Enable RLS and add policies
│   │   │   │
│   │   │   └─▶ YES → Check policies
│   │   │       ├─▶ Policy too permissive? → Tighten USING clause
│   │   │       └─▶ Service role used incorrectly? → Use anon key
│   │   │
│   │   └─▶ ACTION: Review and tighten RLS policies
│   │
│   └─▶ API key compromise suspected
│       │
│       ├─▶ Which key?
│       │   ├─▶ Supabase service key → Regenerate in dashboard
│       │   ├─▶ Supabase anon key → Check RLS is protecting data
│       │   └─▶ External API key → Rotate in source system
│       │
│       └─▶ ACTION: Rotate key, update vault, audit for misuse
```

---

## 5. BUSINESS-SPECIFIC DIAGNOSIS

### BOO Checkout Issues
```
START: Customer reports checkout problem
│
├─▶ Error message?
│   │
│   ├─▶ "Shopping cart has been updated"
│   │   │
│   │   └─▶ Product became unavailable
│   │       ├─▶ Check bc_products.stock_level for item
│   │       ├─▶ If 0 but is_visible=true → Zero-stock bug
│   │       └─▶ ACTION: Update sync to hide zero-stock
│   │
│   ├─▶ "Shipping not available"
│   │   │
│   │   └─▶ ShipperHQ zone issue
│   │       ├─▶ Check customer address format
│   │       └─▶ Check shipping_zones config
│   │
│   └─▶ Payment declined
│       │
│       └─▶ Not a Supabase issue → Check payment gateway
```

### Teelixir Winback Issues
```
START: Winback emails not sending
│
├─▶ Check tlx_automation_config
│   │
│   ├─▶ enabled = false → Enable automation
│   │
│   └─▶ enabled = true
│       │
│       ├─▶ Check send window (9am-7pm Melbourne)
│       │   ├─▶ Outside window → Wait for window
│       │   └─▶ Inside window → Check Gmail auth
│       │
│       ├─▶ Check daily_limit vs sent_today
│       │   ├─▶ Limit reached → Wait for tomorrow
│       │   └─▶ Under limit → Check Gmail credentials
│       │
│       └─▶ Check Gmail OAuth
│           ├─▶ invalid_grant → Re-authenticate
│           └─▶ Other error → Check logs
```

### Elevate Trial Issues
```
START: Trial customer not created
│
├─▶ Check trial_customers table
│   │
│   ├─▶ Record exists → Check status
│   │   ├─▶ status = 'pending' → Workflow not triggered
│   │   ├─▶ status = 'active' → Already processed
│   │   └─▶ status = 'failed' → Check error in logs
│   │
│   └─▶ No record
│       │
│       ├─▶ Check form submission → Google Form working?
│       ├─▶ Check form-intake function → Supabase Edge Function
│       └─▶ Check integration_sync_log for errors
```

---

## 6. GENERAL TROUBLESHOOTING FLOW

```
START: Something is wrong
│
├─▶ 1. IDENTIFY the scope
│   │
│   ├─▶ One business affected → Business-specific issue
│   ├─▶ All businesses affected → Infrastructure issue
│   └─▶ One integration affected → Integration-specific issue
│
├─▶ 2. CHECK the logs
│   │
│   ├─▶ integration_logs → External API calls
│   ├─▶ workflow_execution_logs → n8n workflows
│   ├─▶ task_logs → Automation tasks
│   └─▶ Supabase Dashboard → Database logs
│
├─▶ 3. IDENTIFY the error
│   │
│   ├─▶ Auth error (401/403) → Credentials
│   ├─▶ Rate limit (429) → Add delays
│   ├─▶ Not found (404) → Check endpoint/resource
│   ├─▶ Server error (500) → External service issue
│   └─▶ Timeout → Network/performance issue
│
├─▶ 4. CHECK Historical Issues
│   │
│   └─▶ Search HISTORICAL-ISSUES.md for similar problem
│
├─▶ 5. APPLY fix
│   │
│   ├─▶ Known issue → Apply documented solution
│   └─▶ New issue → Debug, fix, document
│
└─▶ 6. VERIFY and PREVENT
    │
    ├─▶ Test fix in isolation
    ├─▶ Deploy fix
    ├─▶ Monitor for recurrence
    └─▶ Document in HISTORICAL-ISSUES.md if new
```

---

## Quick Decision Matrix

| Symptom | First Check | Likely Cause | Quick Action |
|---------|-------------|--------------|--------------|
| 401 errors | Vault credentials | Expired/revoked token | Refresh credential |
| 429 errors | Request rate | Rate limiting | Add delays |
| Empty results | Sync logs | Pagination/filters | Check sync script |
| Stale data | last_synced_at | Cron not running | Check workflow |
| Duplicates | Unique constraints | No dedup logic | Add UPSERT |
| Slow queries | EXPLAIN ANALYZE | Missing index | Add index |
| Connection errors | Service status | External outage | Wait/retry |
| Missing table | pg_tables | Migration not run | Run SQL |

---

**Document Version:** 1.0
**Last Updated:** 2025-12-01
