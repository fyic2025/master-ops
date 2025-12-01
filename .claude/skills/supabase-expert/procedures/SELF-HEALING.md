# Self-Healing Procedures - Supabase Expert

> Automated recovery procedures that can run without human intervention.

---

## Self-Healing Philosophy

**Core Principles:**
1. **Detect Early** - Monitor continuously, catch issues before impact
2. **Respond Automatically** - Known issues should have known fixes
3. **Escalate Wisely** - Only alert humans for novel or critical issues
4. **Learn Always** - Log everything for pattern recognition

**Automation Levels:**
| Level | Description | Human Involvement |
|-------|-------------|-------------------|
| L0 | Full auto-heal | None |
| L1 | Auto-heal with notification | Informed |
| L2 | Propose fix, await approval | Approves |
| L3 | Manual intervention required | Executes |

---

## 1. SYNC RECOVERY PROCEDURES

### HEAL_SYNC_001: Stale Sync Recovery
**Trigger:** Sync staleness exceeds threshold
**Level:** L0 (Full auto-heal)

```javascript
// Automated stale sync recovery
async function healStaleSyncs() {
  const staleThresholds = {
    'supplier_products': 4 * 60 * 60 * 1000,  // 4 hours
    'tlx_distributors': 24 * 60 * 60 * 1000,  // 24 hours
    'bc_products': 24 * 60 * 60 * 1000,       // 24 hours
    'prospecting_queue': 24 * 60 * 60 * 1000  // 24 hours
  };

  for (const [table, threshold] of Object.entries(staleThresholds)) {
    const { data } = await supabase
      .from(table)
      .select('last_synced_at')
      .order('last_synced_at', { ascending: false })
      .limit(1);

    if (data?.[0]) {
      const staleness = Date.now() - new Date(data[0].last_synced_at).getTime();

      if (staleness > threshold) {
        await triggerSync(table);
        await logHealing('HEAL_SYNC_001', table, {
          staleness: staleness / 1000,
          threshold: threshold / 1000,
          action: 'triggered_sync'
        });
      }
    }
  }
}

async function triggerSync(table) {
  const syncWorkflows = {
    'supplier_products': 'sync-supplier-stock',
    'tlx_distributors': 'sync-unleashed-distributors',
    'bc_products': 'sync-bigcommerce-products',
    'prospecting_queue': 'process-prospecting-daily'
  };

  const workflowId = syncWorkflows[table];
  if (workflowId) {
    await fetch(`${N8N_URL}/webhook/${workflowId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${N8N_API_KEY}` }
    });
  }
}
```

**Schedule:** Every 15 minutes
**Logging:** `integration_logs` with source='self_healer'

---

### HEAL_SYNC_002: Failed Sync Retry
**Trigger:** Sync failure detected in logs
**Level:** L0 (Full auto-heal)

```javascript
// Retry failed syncs with exponential backoff
async function healFailedSyncs() {
  const { data: failures } = await supabase
    .from('integration_logs')
    .select('*')
    .eq('status', 'error')
    .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });

  // Group by source and deduplicate
  const failedSources = [...new Set(failures?.map(f => f.source) || [])];

  for (const source of failedSources) {
    const retryCount = await getRetryCount(source);

    if (retryCount < 3) {
      const delay = Math.pow(2, retryCount) * 60 * 1000; // 1, 2, 4 minutes

      await scheduleRetry(source, delay);
      await incrementRetryCount(source);

      await logHealing('HEAL_SYNC_002', source, {
        retryCount: retryCount + 1,
        delayMs: delay,
        action: 'scheduled_retry'
      });
    } else {
      // Max retries - escalate
      await escalateToHuman('SYNC_FAILURE', source, {
        retries: retryCount,
        lastError: failures.find(f => f.source === source)?.error_message
      });
    }
  }
}

async function scheduleRetry(source, delayMs) {
  // Use Supabase Edge Function scheduled invocation or n8n
  await supabase.from('scheduled_tasks').insert({
    task_type: 'sync_retry',
    source: source,
    execute_at: new Date(Date.now() + delayMs).toISOString(),
    status: 'pending'
  });
}
```

---

### HEAL_SYNC_003: Duplicate Prevention
**Trigger:** Duplicate key errors detected
**Level:** L0 (Full auto-heal)

```javascript
// Convert failing inserts to upserts
async function healDuplicates(table, records, conflictColumn) {
  const results = [];

  for (const record of records) {
    try {
      // Try insert first
      const { data, error } = await supabase
        .from(table)
        .insert(record);

      if (error?.code === '23505') { // Duplicate key
        // Auto-convert to upsert
        const { data: upserted } = await supabase
          .from(table)
          .upsert(record, { onConflict: conflictColumn });

        results.push({ action: 'upserted', record: upserted });

        await logHealing('HEAL_SYNC_003', table, {
          conflictColumn,
          action: 'converted_to_upsert'
        });
      } else if (error) {
        throw error;
      } else {
        results.push({ action: 'inserted', record: data });
      }
    } catch (e) {
      results.push({ action: 'failed', error: e.message });
    }
  }

  return results;
}
```

---

## 2. CONNECTION RECOVERY PROCEDURES

### HEAL_CONN_001: DNS Resolution Recovery
**Trigger:** EAI_AGAIN or DNS errors
**Level:** L0 (Full auto-heal)

```javascript
// DNS resolution with fallback
async function healDNSFailure(hostname, operation) {
  const maxRetries = 4;
  const delays = [2000, 4000, 8000, 16000]; // Exponential backoff

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (error.code === 'EAI_AGAIN' && i < maxRetries - 1) {
        await logHealing('HEAL_CONN_001', hostname, {
          attempt: i + 1,
          delay: delays[i],
          action: 'retrying'
        });

        await sleep(delays[i]);
        continue;
      }
      throw error;
    }
  }
}

// Wrapper for DNS-sensitive operations
async function withDNSRecovery(hostname, operation) {
  return healDNSFailure(hostname, operation);
}
```

---

### HEAL_CONN_002: Connection Pool Recovery
**Trigger:** Pool exhaustion detected
**Level:** L1 (Auto-heal with notification)

```javascript
// Connection pool health check and recovery
async function healConnectionPool() {
  // Check current connections
  const { data: stats } = await supabase.rpc('get_connection_stats');

  const activeConnections = stats?.active || 0;
  const maxConnections = stats?.max || 100;
  const utilization = activeConnections / maxConnections;

  if (utilization > 0.8) {
    // High utilization - take action
    await logHealing('HEAL_CONN_002', 'connection_pool', {
      active: activeConnections,
      max: maxConnections,
      utilization: utilization,
      action: 'releasing_idle'
    });

    // Force release idle connections
    await supabase.rpc('release_idle_connections');

    // Notify if still high
    if (utilization > 0.9) {
      await notifySlack('CONNECTION_POOL_HIGH', {
        utilization: Math.round(utilization * 100) + '%',
        suggestion: 'Consider reducing concurrent operations'
      });
    }
  }
}

// Supabase function to get connection stats
/*
CREATE OR REPLACE FUNCTION get_connection_stats()
RETURNS json AS $$
  SELECT json_build_object(
    'active', (SELECT count(*) FROM pg_stat_activity WHERE state = 'active'),
    'idle', (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle'),
    'max', current_setting('max_connections')::int
  );
$$ LANGUAGE sql;
*/
```

---

### HEAL_CONN_003: Service Outage Handling
**Trigger:** Connection refused / service down
**Level:** L1 (Auto-heal with notification)

```javascript
// Service health check and recovery
async function healServiceOutage(service) {
  const serviceConfig = {
    supabase: {
      healthCheck: 'https://usibnysqelovfuctmkqw.supabase.co/rest/v1/',
      statusPage: 'https://status.supabase.com',
      retryInterval: 60000
    },
    shopify: {
      healthCheck: 'https://teelixir-au.myshopify.com/admin/api/2023-10/shop.json',
      statusPage: 'https://status.shopify.com',
      retryInterval: 120000
    },
    hubspot: {
      healthCheck: 'https://api.hubapi.com/crm/v3/objects/contacts?limit=1',
      statusPage: 'https://status.hubspot.com',
      retryInterval: 120000
    }
  };

  const config = serviceConfig[service];
  if (!config) return;

  // Check if service is back
  try {
    await fetch(config.healthCheck, { timeout: 10000 });

    // Service recovered!
    await logHealing('HEAL_CONN_003', service, {
      action: 'service_recovered',
      downtime: await calculateDowntime(service)
    });

    // Resume queued operations
    await resumeQueuedOperations(service);

    return true;
  } catch (e) {
    // Still down - notify and schedule next check
    await notifySlack('SERVICE_STILL_DOWN', {
      service,
      statusPage: config.statusPage,
      nextCheck: new Date(Date.now() + config.retryInterval).toISOString()
    });

    // Schedule next health check
    await scheduleHealthCheck(service, config.retryInterval);

    return false;
  }
}

async function resumeQueuedOperations(service) {
  const { data: queued } = await supabase
    .from('operation_queue')
    .select('*')
    .eq('service', service)
    .eq('status', 'waiting_for_service')
    .order('created_at');

  for (const op of queued || []) {
    await executeQueuedOperation(op);
  }
}
```

---

## 3. DATA RECOVERY PROCEDURES

### HEAL_DATA_001: Missing Required Fields
**Trigger:** NOT NULL constraint violations
**Level:** L0 (Full auto-heal)

```javascript
// Auto-fill missing required fields
async function healMissingFields(table, record, error) {
  const fieldDefaults = {
    // Universal defaults
    created_at: () => new Date().toISOString(),
    updated_at: () => new Date().toISOString(),
    is_active: true,
    is_visible: true,
    status: 'active',

    // Business-specific defaults
    stock_level: 0,
    quantity: 0,
    price: 0,
    discount_percent: 0,
    sort_order: 999,

    // Sync metadata
    last_synced_at: () => new Date().toISOString(),
    sync_status: 'pending',
    sync_source: 'auto_heal'
  };

  // Extract missing field from error
  const match = error.message.match(/column "(\w+)"/);
  const missingField = match?.[1];

  if (missingField && fieldDefaults[missingField] !== undefined) {
    const defaultValue = typeof fieldDefaults[missingField] === 'function'
      ? fieldDefaults[missingField]()
      : fieldDefaults[missingField];

    record[missingField] = defaultValue;

    await logHealing('HEAL_DATA_001', table, {
      field: missingField,
      defaultValue,
      action: 'applied_default'
    });

    // Retry insert
    return await supabase.from(table).insert(record);
  }

  // Can't auto-heal - escalate
  throw error;
}
```

---

### HEAL_DATA_002: Zero-Stock Visibility Fix
**Trigger:** Zero-stock products visible (BOO specific)
**Level:** L0 (Full auto-heal)

```javascript
// Auto-hide zero stock products
async function healZeroStockVisibility() {
  const { data: affected, error } = await supabase
    .from('bc_products')
    .select('id, name, stock_level')
    .eq('stock_level', 0)
    .eq('is_visible', true);

  if (affected?.length > 0) {
    // Update in batches of 100
    for (let i = 0; i < affected.length; i += 100) {
      const batch = affected.slice(i, i + 100);
      const ids = batch.map(p => p.id);

      await supabase
        .from('bc_products')
        .update({ is_visible: false, updated_at: new Date().toISOString() })
        .in('id', ids);
    }

    await logHealing('HEAL_DATA_002', 'bc_products', {
      productsHidden: affected.length,
      action: 'hide_zero_stock'
    });

    // Also update BigCommerce if configured
    if (BC_AUTO_SYNC_ENABLED) {
      await syncVisibilityToBigCommerce(affected.map(p => p.id));
    }
  }

  return affected?.length || 0;
}

// Schedule: Every 30 minutes
```

---

### HEAL_DATA_003: Orphan Record Cleanup
**Trigger:** Foreign key violations or orphaned records
**Level:** L1 (Auto-heal with notification)

```javascript
// Clean up orphaned records
async function healOrphanRecords() {
  const orphanChecks = [
    {
      child: 'tlx_order_line_items',
      parent: 'tlx_distributor_orders',
      fk: 'order_id'
    },
    {
      child: 'product_supplier_links',
      parent: 'bc_products',
      fk: 'bc_product_id'
    },
    {
      child: 'livechat_messages',
      parent: 'livechat_conversations',
      fk: 'conversation_id'
    }
  ];

  const results = [];

  for (const check of orphanChecks) {
    // Find orphans
    const { data: orphans } = await supabase.rpc('find_orphan_records', {
      child_table: check.child,
      parent_table: check.parent,
      fk_column: check.fk
    });

    if (orphans?.length > 0) {
      // Archive before delete
      await archiveRecords(check.child, orphans);

      // Delete orphans
      await supabase
        .from(check.child)
        .delete()
        .in('id', orphans.map(o => o.id));

      results.push({
        table: check.child,
        orphansRemoved: orphans.length
      });

      await logHealing('HEAL_DATA_003', check.child, {
        orphansRemoved: orphans.length,
        parentTable: check.parent,
        action: 'archived_and_deleted'
      });
    }
  }

  if (results.length > 0) {
    await notifySlack('ORPHAN_CLEANUP_COMPLETE', { results });
  }

  return results;
}

// Supabase function for finding orphans
/*
CREATE OR REPLACE FUNCTION find_orphan_records(
  child_table text,
  parent_table text,
  fk_column text
) RETURNS SETOF json AS $$
BEGIN
  RETURN QUERY EXECUTE format(
    'SELECT row_to_json(c.*) FROM %I c
     LEFT JOIN %I p ON c.%I = p.id
     WHERE p.id IS NULL',
    child_table, parent_table, fk_column
  );
END;
$$ LANGUAGE plpgsql;
*/
```

---

## 4. RATE LIMIT RECOVERY

### HEAL_RATE_001: Adaptive Rate Limiting
**Trigger:** 429 errors detected
**Level:** L0 (Full auto-heal)

```javascript
// Adaptive rate limiter that learns from 429s
class AdaptiveRateLimiter {
  constructor(service, initialRate) {
    this.service = service;
    this.rate = initialRate;
    this.minRate = initialRate / 10;
    this.maxRate = initialRate * 2;
    this.window = [];
    this.windowSize = 100;
  }

  async throttle() {
    // Calculate current rate based on success/failure
    const successRate = this.calculateSuccessRate();

    if (successRate < 0.95) {
      // Too many errors - slow down
      this.rate = Math.max(this.rate * 0.8, this.minRate);

      await logHealing('HEAL_RATE_001', this.service, {
        newRate: this.rate,
        successRate,
        action: 'reduced_rate'
      });
    } else if (successRate > 0.99 && this.rate < this.maxRate) {
      // High success - cautiously speed up
      this.rate = Math.min(this.rate * 1.1, this.maxRate);
    }

    // Apply delay
    const delay = 1000 / this.rate;
    await sleep(delay);
  }

  recordResult(success) {
    this.window.push(success);
    if (this.window.length > this.windowSize) {
      this.window.shift();
    }
  }

  calculateSuccessRate() {
    if (this.window.length === 0) return 1;
    return this.window.filter(s => s).length / this.window.length;
  }
}

// Usage
const hubspotLimiter = new AdaptiveRateLimiter('hubspot', 5); // 5 req/sec initial

async function callHubspotAPI(endpoint, data) {
  await hubspotLimiter.throttle();

  try {
    const result = await hubspotClient.post(endpoint, data);
    hubspotLimiter.recordResult(true);
    return result;
  } catch (e) {
    hubspotLimiter.recordResult(false);
    throw e;
  }
}
```

---

## 5. AUTHENTICATION RECOVERY

### HEAL_AUTH_001: Token Refresh
**Trigger:** 401 errors with refreshable tokens
**Level:** L0 (Full auto-heal)

```javascript
// Automatic OAuth token refresh
async function healExpiredToken(service) {
  const tokenConfig = {
    google: {
      refreshUrl: 'https://oauth2.googleapis.com/token',
      credentialPath: 'google_refresh_token'
    },
    hubspot: {
      refreshUrl: 'https://api.hubapi.com/oauth/v1/token',
      credentialPath: 'hubspot_refresh_token'
    },
    xero: {
      refreshUrl: 'https://identity.xero.com/connect/token',
      credentialPath: 'xero_refresh_token'
    }
  };

  const config = tokenConfig[service];
  if (!config) return null;

  // Get current refresh token from vault
  const refreshToken = await getVaultCredential(service, config.credentialPath);
  const clientId = await getVaultCredential(service, 'client_id');
  const clientSecret = await getVaultCredential(service, 'client_secret');

  try {
    const response = await fetch(config.refreshUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret
      })
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const tokens = await response.json();

    // Store new access token
    await updateVaultCredential(service, 'access_token', tokens.access_token);

    // Update refresh token if provided
    if (tokens.refresh_token) {
      await updateVaultCredential(service, 'refresh_token', tokens.refresh_token);
    }

    await logHealing('HEAL_AUTH_001', service, {
      action: 'token_refreshed',
      expiresIn: tokens.expires_in
    });

    return tokens.access_token;
  } catch (e) {
    // Refresh failed - needs manual re-auth
    await escalateToHuman('TOKEN_REFRESH_FAILED', service, {
      error: e.message,
      action: 'Manual OAuth re-authentication required'
    });
    return null;
  }
}
```

---

## 6. MASTER HEALING ORCHESTRATOR

```javascript
// Central healing coordinator
class SelfHealingOrchestrator {
  constructor() {
    this.healers = new Map();
    this.activeHealing = new Set();
  }

  register(name, healer, schedule) {
    this.healers.set(name, { healer, schedule, lastRun: null });
  }

  async runAll() {
    const now = Date.now();

    for (const [name, config] of this.healers) {
      if (this.shouldRun(name, config, now)) {
        await this.runHealer(name, config);
      }
    }
  }

  shouldRun(name, config, now) {
    if (this.activeHealing.has(name)) return false;
    if (!config.lastRun) return true;
    return now - config.lastRun >= config.schedule;
  }

  async runHealer(name, config) {
    this.activeHealing.add(name);

    try {
      const startTime = Date.now();
      const result = await config.healer();
      const duration = Date.now() - startTime;

      await supabase.from('integration_logs').insert({
        source: 'self_healer',
        action: name,
        status: 'success',
        details_json: { result, duration_ms: duration }
      });

      config.lastRun = Date.now();
    } catch (e) {
      await supabase.from('integration_logs').insert({
        source: 'self_healer',
        action: name,
        status: 'error',
        error_message: e.message
      });
    } finally {
      this.activeHealing.delete(name);
    }
  }
}

// Initialize orchestrator
const orchestrator = new SelfHealingOrchestrator();

// Register all healers
orchestrator.register('stale_syncs', healStaleSyncs, 15 * 60 * 1000);       // 15 min
orchestrator.register('failed_syncs', healFailedSyncs, 5 * 60 * 1000);       // 5 min
orchestrator.register('zero_stock', healZeroStockVisibility, 30 * 60 * 1000); // 30 min
orchestrator.register('connection_pool', healConnectionPool, 5 * 60 * 1000);  // 5 min
orchestrator.register('orphan_records', healOrphanRecords, 6 * 60 * 60 * 1000); // 6 hours

// Run orchestrator (called by cron or edge function)
export async function handleSelfHealing() {
  await orchestrator.runAll();
}
```

---

## Logging Helper

```javascript
async function logHealing(procedureId, target, details) {
  await supabase.from('integration_logs').insert({
    source: 'self_healer',
    action: procedureId,
    status: 'healed',
    details_json: {
      target,
      ...details,
      timestamp: new Date().toISOString()
    }
  });
}

async function escalateToHuman(issueType, target, context) {
  // Log escalation
  await supabase.from('integration_logs').insert({
    source: 'self_healer',
    action: 'ESCALATION',
    status: 'warning',
    details_json: { issueType, target, context }
  });

  // Notify via Slack/email
  await notifySlack(issueType, { target, ...context });
}
```

---

**Document Version:** 1.0
**Last Updated:** 2025-12-01
**Total Procedures:** 12

