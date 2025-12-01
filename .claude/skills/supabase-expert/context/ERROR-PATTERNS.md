# Error Pattern Database - Supabase Expert

> Comprehensive catalog of error patterns, detection methods, and automated responses.

---

## Error Classification System

### Severity Levels
| Level | Code | Response | Auto-Heal |
|-------|------|----------|-----------|
| 🔴 CRITICAL | P1 | Immediate | No - requires human |
| 🟠 HIGH | P2 | < 1 hour | Partial |
| 🟡 MEDIUM | P3 | < 4 hours | Yes |
| 🟢 LOW | P4 | < 24 hours | Yes |

### Error Categories
| Category | Prefix | Examples |
|----------|--------|----------|
| Authentication | AUTH_ | Token expired, invalid credentials |
| Rate Limiting | RATE_ | 429 errors, quota exceeded |
| Data Quality | DATA_ | Missing fields, duplicates |
| Connection | CONN_ | Timeouts, DNS failures |
| Schema | SCHEMA_ | Missing tables, constraint violations |
| Business Logic | BIZ_ | Invalid state, workflow errors |

---

## 1. AUTHENTICATION ERRORS

### AUTH_001: Token Expired
```
Pattern: "401 Unauthorized" OR "invalid_grant" OR "token expired"
Sources: HubSpot, Google, Shopify, Klaviyo
Frequency: Monthly (OAuth tokens)
```

**Detection Query:**
```sql
SELECT source, COUNT(*) as occurrences, MAX(created_at) as last_seen
FROM integration_logs
WHERE status = 'error'
  AND (error_message ILIKE '%401%'
       OR error_message ILIKE '%unauthorized%'
       OR error_message ILIKE '%invalid_grant%')
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY source
ORDER BY occurrences DESC;
```

**Root Causes:**
1. OAuth refresh token expired (Google: 6 months inactive)
2. Access token revoked by user
3. API credentials rotated
4. App permissions changed

**Auto-Response:**
```javascript
if (error.message.includes('invalid_grant')) {
  await alertSlack('GMAIL_REAUTH_REQUIRED', {
    business: businessId,
    lastSuccess: lastSuccessfulAuth,
    action: 'Manual re-authentication needed'
  });
  await disableAutomation(businessId, 'winback');
}
```

---

### AUTH_002: HMAC Signature Failure
```
Pattern: "Invalid signature" OR "HMAC verification failed"
Sources: Unleashed
Frequency: Rare (code changes)
```

**Detection Query:**
```sql
SELECT details_json->>'endpoint' as endpoint,
       COUNT(*) as failures,
       MAX(created_at) as last_failure
FROM integration_logs
WHERE source = 'unleashed'
  AND status = 'error'
  AND error_message ILIKE '%signature%'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY endpoint;
```

**Root Causes:**
1. Query string not URL-decoded before signing
2. Parameters not sorted alphabetically
3. API key has trailing whitespace
4. Clock skew (rare)

**Auto-Response:**
```javascript
// Cannot auto-heal - requires code fix
await alertSlack('UNLEASHED_HMAC_FAILURE', {
  endpoint: failedEndpoint,
  suggestion: 'Check query string encoding and parameter order'
});
```

---

### AUTH_003: API Key Invalid
```
Pattern: "403 Forbidden" OR "Invalid API key" OR "Access denied"
Sources: All external APIs
Frequency: Rare (credential rotation)
```

**Detection Query:**
```sql
SELECT source,
       details_json->>'service' as service,
       COUNT(*) as failures
FROM integration_logs
WHERE status = 'error'
  AND (error_message ILIKE '%403%'
       OR error_message ILIKE '%invalid api key%'
       OR error_message ILIKE '%access denied%')
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY source, details_json->>'service'
HAVING COUNT(*) >= 3;
```

**Auto-Response:**
```javascript
// Check if credential exists in vault
const cred = await getVaultCredential(service, 'api_key');
if (!cred) {
  await alertSlack('MISSING_CREDENTIAL', { service });
} else {
  await alertSlack('CREDENTIAL_INVALID', {
    service,
    lastRotated: cred.updated_at
  });
}
```

---

## 2. RATE LIMITING ERRORS

### RATE_001: API Quota Exceeded
```
Pattern: "429 Too Many Requests" OR "rate limit" OR "quota exceeded"
Sources: BigCommerce, HubSpot, Shopify, Klaviyo, Google
Frequency: Common during bulk operations
```

**Detection Query:**
```sql
SELECT source,
       DATE_TRUNC('minute', created_at) as minute,
       COUNT(*) as requests,
       COUNT(*) FILTER (WHERE status = 'error' AND error_message ILIKE '%429%') as rate_limited
FROM integration_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY source, minute
HAVING COUNT(*) FILTER (WHERE error_message ILIKE '%429%') > 0
ORDER BY minute DESC;
```

**Rate Limits Reference:**
| Service | Limit | Window | Safe Rate |
|---------|-------|--------|-----------|
| BigCommerce | 150 req | 30 sec | 4 req/sec |
| HubSpot | 100 req | 10 sec | 5 req/sec |
| Shopify | 2 req | 1 sec | 1 req/sec |
| Klaviyo | 75 req | 1 sec | 50 req/sec |
| Google Ads | 15000 req | day | 10 req/sec |

**Auto-Response:**
```javascript
// Exponential backoff with jitter
async function handleRateLimit(retryAfter, attempt = 1) {
  const baseDelay = retryAfter * 1000 || 5000;
  const jitter = Math.random() * 1000;
  const delay = Math.min(baseDelay * Math.pow(2, attempt) + jitter, 60000);

  await sleep(delay);

  // Log the backoff
  await supabase.from('integration_logs').insert({
    source: 'rate_limiter',
    action: 'backoff',
    status: 'info',
    details_json: { delay, attempt }
  });
}
```

---

### RATE_002: Concurrent Request Limit
```
Pattern: "Too many concurrent requests" OR "connection pool exhausted"
Sources: Supabase, PostgreSQL
Frequency: During parallel operations
```

**Detection Query:**
```sql
SELECT COUNT(*) as active_connections,
       MAX(state) as connection_states
FROM pg_stat_activity
WHERE datname = current_database()
  AND state != 'idle';
```

**Auto-Response:**
```javascript
// Queue excess requests
const connectionQueue = new PQueue({ concurrency: 5 });

async function dbOperation(query) {
  return connectionQueue.add(async () => {
    const client = await pool.connect();
    try {
      return await client.query(query);
    } finally {
      client.release();
    }
  });
}
```

---

## 3. DATA QUALITY ERRORS

### DATA_001: Duplicate Key Violation
```
Pattern: "duplicate key value violates unique constraint"
Sources: All sync operations
Frequency: Common during retries
```

**Detection Query:**
```sql
SELECT
  REGEXP_MATCHES(error_message, 'constraint "([^"]+)"', 'g') as constraint_name,
  COUNT(*) as occurrences,
  details_json->>'table' as table_name
FROM integration_logs
WHERE status = 'error'
  AND error_message ILIKE '%duplicate key%'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY constraint_name, table_name
ORDER BY occurrences DESC;
```

**Auto-Response:**
```javascript
// Convert INSERT to UPSERT
async function upsertRecord(table, record, conflictColumn) {
  const { data, error } = await supabase
    .from(table)
    .upsert(record, {
      onConflict: conflictColumn,
      ignoreDuplicates: false
    });

  if (error) throw error;
  return data;
}
```

---

### DATA_002: Missing Required Fields
```
Pattern: "null value in column" OR "violates not-null constraint"
Sources: Sync operations
Frequency: When source data incomplete
```

**Detection Query:**
```sql
SELECT
  details_json->>'table' as table_name,
  REGEXP_MATCHES(error_message, 'column "([^"]+)"', 'g') as column_name,
  COUNT(*) as occurrences
FROM integration_logs
WHERE status = 'error'
  AND error_message ILIKE '%not-null%'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY table_name, column_name;
```

**Auto-Response:**
```javascript
// Apply defaults for known fields
const FIELD_DEFAULTS = {
  'created_at': () => new Date().toISOString(),
  'updated_at': () => new Date().toISOString(),
  'is_active': true,
  'status': 'pending',
  'quantity': 0
};

function applyDefaults(record, schema) {
  for (const [field, defaultValue] of Object.entries(FIELD_DEFAULTS)) {
    if (schema.includes(field) && record[field] === undefined) {
      record[field] = typeof defaultValue === 'function'
        ? defaultValue()
        : defaultValue;
    }
  }
  return record;
}
```

---

### DATA_003: Foreign Key Violation
```
Pattern: "violates foreign key constraint"
Sources: Relational inserts
Frequency: When parent record missing
```

**Detection Query:**
```sql
SELECT
  details_json->>'table' as table_name,
  REGEXP_MATCHES(error_message, 'constraint "([^"]+)"', 'g') as fk_constraint,
  COUNT(*) as occurrences
FROM integration_logs
WHERE status = 'error'
  AND error_message ILIKE '%foreign key%'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY table_name, fk_constraint;
```

**Auto-Response:**
```javascript
// Check and create parent if sync order wrong
async function ensureParentExists(parentTable, parentId, createFn) {
  const { data } = await supabase
    .from(parentTable)
    .select('id')
    .eq('id', parentId)
    .single();

  if (!data) {
    // Fetch from source and create
    const parent = await createFn(parentId);
    await supabase.from(parentTable).insert(parent);
  }
}
```

---

### DATA_004: Stale Data Detection
```
Pattern: last_synced_at > expected_frequency
Sources: All sync tables
Frequency: When syncs fail silently
```

**Detection Query:**
```sql
WITH sync_expectations AS (
  SELECT 'supplier_products' as table_name, INTERVAL '4 hours' as max_staleness
  UNION SELECT 'tlx_distributors', INTERVAL '24 hours'
  UNION SELECT 'bc_products', INTERVAL '24 hours'
  UNION SELECT 'prospecting_queue', INTERVAL '24 hours'
)
SELECT
  t.table_name,
  MAX(last_synced_at) as last_sync,
  NOW() - MAX(last_synced_at) as actual_staleness,
  e.max_staleness as expected_max,
  CASE WHEN NOW() - MAX(last_synced_at) > e.max_staleness
       THEN 'STALE' ELSE 'OK' END as status
FROM information_schema.tables t
JOIN sync_expectations e ON t.table_name = e.table_name
LEFT JOIN LATERAL (
  SELECT MAX(last_synced_at) as last_synced_at
  FROM t.table_name
) ls ON true
GROUP BY t.table_name, e.max_staleness;
```

**Auto-Response:**
```javascript
// Trigger manual sync for stale tables
async function handleStaleData(table, staleness) {
  await alertSlack('STALE_DATA_DETECTED', {
    table,
    staleness: staleness.toISOString(),
    action: 'Triggering manual sync'
  });

  // Trigger appropriate sync
  const syncMap = {
    'supplier_products': 'sync-supplier-stock',
    'tlx_distributors': 'sync-unleashed-distributors',
    'bc_products': 'sync-bigcommerce-products'
  };

  if (syncMap[table]) {
    await triggerN8nWorkflow(syncMap[table]);
  }
}
```

---

## 4. CONNECTION ERRORS

### CONN_001: DNS Resolution Failure
```
Pattern: "EAI_AGAIN" OR "getaddrinfo" OR "DNS lookup failed"
Sources: All external connections
Frequency: Rare (infrastructure issues)
```

**Detection Query:**
```sql
SELECT source,
       COUNT(*) as failures,
       MIN(created_at) as first_failure,
       MAX(created_at) as last_failure
FROM integration_logs
WHERE status = 'error'
  AND (error_message ILIKE '%EAI_AGAIN%'
       OR error_message ILIKE '%getaddrinfo%'
       OR error_message ILIKE '%DNS%')
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY source;
```

**Auto-Response:**
```javascript
// Retry with exponential backoff
async function retryWithBackoff(fn, maxRetries = 4) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.code === 'EAI_AGAIN' && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s, 8s
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
}
```

---

### CONN_002: Connection Timeout
```
Pattern: "ETIMEDOUT" OR "timeout" OR "connection timed out"
Sources: FTP (Oborne), slow APIs
Frequency: Occasional
```

**Detection Query:**
```sql
SELECT source,
       details_json->>'host' as host,
       COUNT(*) as timeouts,
       AVG((details_json->>'duration_ms')::int) as avg_duration
FROM integration_logs
WHERE status = 'error'
  AND error_message ILIKE '%timeout%'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY source, host
ORDER BY timeouts DESC;
```

**Auto-Response:**
```javascript
// Increase timeout and retry
const TIMEOUT_CONFIG = {
  ftp: { initial: 30000, max: 120000 },
  http: { initial: 10000, max: 60000 }
};

async function withAdaptiveTimeout(operation, type = 'http') {
  const config = TIMEOUT_CONFIG[type];
  let timeout = config.initial;

  while (timeout <= config.max) {
    try {
      return await Promise.race([
        operation(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), timeout)
        )
      ]);
    } catch (e) {
      if (e.message === 'timeout' && timeout < config.max) {
        timeout *= 2;
        continue;
      }
      throw e;
    }
  }
}
```

---

### CONN_003: Connection Refused
```
Pattern: "ECONNREFUSED" OR "connection refused"
Sources: Services that are down
Frequency: During outages
```

**Detection Query:**
```sql
SELECT source,
       details_json->>'endpoint' as endpoint,
       COUNT(*) as refusals,
       MIN(created_at) as outage_start
FROM integration_logs
WHERE status = 'error'
  AND error_message ILIKE '%ECONNREFUSED%'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY source, endpoint;
```

**Auto-Response:**
```javascript
// Check status page and retry later
const STATUS_PAGES = {
  supabase: 'https://status.supabase.com',
  shopify: 'https://status.shopify.com',
  hubspot: 'https://status.hubspot.com'
};

async function handleConnectionRefused(service) {
  await alertSlack('SERVICE_DOWN', {
    service,
    statusPage: STATUS_PAGES[service],
    action: 'Will retry in 5 minutes'
  });

  // Schedule retry
  await scheduleRetry(service, 5 * 60 * 1000);
}
```

---

## 5. SCHEMA ERRORS

### SCHEMA_001: Missing Table
```
Pattern: "relation does not exist"
Sources: New deployments, migrations
Frequency: Rare (deployment issues)
```

**Detection Query:**
```sql
SELECT
  REGEXP_MATCHES(error_message, 'relation "([^"]+)"', 'g') as missing_table,
  source,
  COUNT(*) as occurrences
FROM integration_logs
WHERE status = 'error'
  AND error_message ILIKE '%relation%does not exist%'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY missing_table, source;
```

**Auto-Response:**
```javascript
// Cannot auto-create tables - alert for migration
await alertSlack('MISSING_TABLE', {
  table: missingTable,
  source: errorSource,
  action: 'Run pending migrations',
  migrationPath: `migrations/${missingTable}.sql`
});
```

---

### SCHEMA_002: Column Type Mismatch
```
Pattern: "invalid input syntax for type"
Sources: Data type changes in source
Frequency: Rare
```

**Detection Query:**
```sql
SELECT
  REGEXP_MATCHES(error_message, 'type "?([^"]+)"?', 'g') as expected_type,
  details_json->>'column' as column,
  details_json->>'value' as problematic_value
FROM integration_logs
WHERE status = 'error'
  AND error_message ILIKE '%invalid input syntax%'
  AND created_at > NOW() - INTERVAL '24 hours';
```

**Auto-Response:**
```javascript
// Type coercion with validation
function coerceType(value, targetType) {
  const coercers = {
    'integer': v => parseInt(v, 10) || 0,
    'numeric': v => parseFloat(v) || 0,
    'boolean': v => v === 'true' || v === '1' || v === true,
    'timestamp': v => new Date(v).toISOString(),
    'uuid': v => isValidUUID(v) ? v : null
  };

  return coercers[targetType]?.(value) ?? value;
}
```

---

## 6. BUSINESS LOGIC ERRORS

### BIZ_001: Invalid State Transition
```
Pattern: Custom business rule violations
Sources: Workflow operations
Frequency: User/system errors
```

**Detection Query:**
```sql
SELECT
  details_json->>'entity_type' as entity,
  details_json->>'from_state' as from_state,
  details_json->>'to_state' as to_state,
  COUNT(*) as attempts
FROM integration_logs
WHERE source = 'state_machine'
  AND status = 'error'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY entity, from_state, to_state;
```

**Valid Transitions:**
```javascript
const STATE_MACHINES = {
  trial_customer: {
    pending: ['active', 'cancelled'],
    active: ['expired', 'converted', 'cancelled'],
    expired: ['reactivated'],
    converted: [], // terminal
    cancelled: ['reactivated']
  },
  winback_email: {
    pending: ['sent', 'failed'],
    sent: ['opened', 'converted', 'bounced'],
    failed: ['pending'], // retry
    opened: ['converted'],
    converted: [] // terminal
  }
};
```

---

### BIZ_002: Winback Window Violation
```
Pattern: Email send attempted outside business hours
Sources: Teelixir winback automation
Frequency: Configuration errors
```

**Detection Query:**
```sql
SELECT
  EXTRACT(HOUR FROM created_at AT TIME ZONE 'Australia/Melbourne') as hour,
  COUNT(*) as attempts
FROM tlx_winback_emails
WHERE status = 'blocked'
  AND details_json->>'reason' = 'outside_window'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY hour
ORDER BY hour;
```

**Auto-Response:**
```javascript
// Queue for next window
function scheduleForNextWindow(email) {
  const melbourne = 'Australia/Melbourne';
  const now = DateTime.now().setZone(melbourne);

  let sendAt;
  if (now.hour >= 19) {
    // After 7pm - schedule for 9am tomorrow
    sendAt = now.plus({ days: 1 }).set({ hour: 9, minute: 0 });
  } else if (now.hour < 9) {
    // Before 9am - schedule for 9am today
    sendAt = now.set({ hour: 9, minute: 0 });
  } else {
    // In window - send now
    sendAt = now;
  }

  return scheduleEmail(email, sendAt);
}
```

---

## Error Aggregation Dashboard Query

```sql
-- Master error summary for last 24 hours
WITH error_summary AS (
  SELECT
    source,
    CASE
      WHEN error_message ILIKE '%401%' OR error_message ILIKE '%unauthorized%' THEN 'AUTH'
      WHEN error_message ILIKE '%429%' OR error_message ILIKE '%rate limit%' THEN 'RATE'
      WHEN error_message ILIKE '%duplicate%' OR error_message ILIKE '%not-null%' THEN 'DATA'
      WHEN error_message ILIKE '%timeout%' OR error_message ILIKE '%refused%' THEN 'CONN'
      WHEN error_message ILIKE '%relation%' OR error_message ILIKE '%syntax%' THEN 'SCHEMA'
      ELSE 'OTHER'
    END as error_category,
    COUNT(*) as count,
    MAX(created_at) as last_seen
  FROM integration_logs
  WHERE status = 'error'
    AND created_at > NOW() - INTERVAL '24 hours'
  GROUP BY source, error_category
)
SELECT
  source,
  error_category,
  count,
  last_seen,
  CASE
    WHEN count > 100 THEN '🔴 CRITICAL'
    WHEN count > 20 THEN '🟠 HIGH'
    WHEN count > 5 THEN '🟡 MEDIUM'
    ELSE '🟢 LOW'
  END as severity
FROM error_summary
ORDER BY count DESC;
```

---

**Document Version:** 1.0
**Last Updated:** 2025-12-01
**Total Patterns Documented:** 15

