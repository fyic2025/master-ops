# Cross-Skill Integration - Supabase Expert

> How supabase-expert interacts with other skills and when to hand off.

---

## Skill Ecosystem Overview

```
                    ┌─────────────────────┐
                    │   supabase-expert   │
                    │   (Data Layer)      │
                    └──────────┬──────────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
           ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ integration-    │ │ google-ads-     │ │ n8n-workflow-   │
│ tester          │ │ manager         │ │ manager (future)│
└─────────────────┘ └─────────────────┘ └─────────────────┘
           │                   │                   │
           ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ shopify-manager │ │ bigcommerce-    │ │ hubspot-crm-    │
│ (future)        │ │ manager (future)│ │ manager (future)│
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## 1. SUPABASE ↔ INTEGRATION-TESTER

### When supabase-expert needs integration-tester
| Scenario | Hand Off | Data Exchange |
|----------|----------|---------------|
| Verify API credentials work | "Test [service] connectivity" | Vault credentials |
| Validate new integration | "Run integration test for [service]" | Endpoint + credentials |
| Debug auth failures | "Check authentication for [service]" | Error logs |

### When integration-tester needs supabase-expert
| Scenario | Hand Off | Data Exchange |
|----------|----------|---------------|
| Store test results | Write to integration_logs | Test outcomes |
| Get credentials | Read from secure_credentials | Encrypted creds |
| Check previous test results | Query integration_logs | Historical data |

### Integration Points
```javascript
// integration-tester writes results to Supabase
await supabase.from('integration_logs').insert({
  source: 'integration-tester',
  action: 'api_test',
  status: 'success',
  details_json: { service: 'hubspot', latency_ms: 234 }
});

// supabase-expert reads test patterns
const recentTests = await supabase
  .from('integration_logs')
  .select('*')
  .eq('source', 'integration-tester')
  .order('created_at', { ascending: false })
  .limit(100);
```

---

## 2. SUPABASE ↔ GOOGLE-ADS-MANAGER

### When supabase-expert needs google-ads-manager
| Scenario | Hand Off | Data Exchange |
|----------|----------|---------------|
| Understanding ads data structure | "Explain google_ads_* tables" | Schema knowledge |
| Performance anomalies | "Check ads performance for [business]" | Alert context |
| Campaign optimization | "Review opportunities" | Data from opportunities table |

### When google-ads-manager needs supabase-expert
| Scenario | Hand Off | Data Exchange |
|----------|----------|---------------|
| Store campaign metrics | Write to google_ads_campaign_metrics | Daily metrics |
| Store opportunities | Write to google_ads_opportunities | AI discoveries |
| Query historical data | Read from google_ads_* tables | Trend analysis |
| Store alerts | Write to google_ads_alerts | Anomaly detection |

### Tables Owned by google-ads-manager
```sql
-- google-ads-manager writes to these tables
google_ads_accounts          -- Account configuration
google_ads_campaign_metrics  -- Daily performance
google_ads_keyword_metrics   -- Keyword data
google_ads_search_terms      -- Search query data
google_ads_opportunities     -- AI recommendations
google_ads_alerts            -- Anomaly alerts
google_ads_agent_tasks       -- Spawned tasks

-- supabase-expert monitors health of these tables
-- supabase-expert provides performance optimization
-- supabase-expert handles data cleanup/archival
```

### Cross-Skill Query Example
```sql
-- supabase-expert health check for google-ads-manager
SELECT
  account_id,
  COUNT(*) as total_records,
  MAX(last_synced_at) as last_sync,
  NOW() - MAX(last_synced_at) as staleness
FROM google_ads_campaign_metrics
GROUP BY account_id
HAVING NOW() - MAX(last_synced_at) > INTERVAL '48 hours';
-- Returns accounts that need google-ads-manager attention
```

---

## 3. SUPABASE ↔ N8N-WORKFLOW-MANAGER (Future)

### When supabase-expert needs n8n-workflow-manager
| Scenario | Hand Off | Data Exchange |
|----------|----------|---------------|
| Workflow failures affecting data | "Check workflow [name] status" | Error details |
| Schedule sync not running | "Is [workflow] active?" | Workflow state |
| Credential issues in n8n | "Update n8n credential for [service]" | New credential |

### When n8n-workflow-manager needs supabase-expert
| Scenario | Hand Off | Data Exchange |
|----------|----------|---------------|
| Log workflow execution | Write to workflow_execution_logs | Execution data |
| Get workflow configs | Read from n8n metadata | Configuration |
| Query execution history | Read workflow_execution_logs | Historical runs |

### Tables Shared
```sql
-- n8n writes execution logs
workflow_execution_logs (
  id, workflow_id, workflow_name, business_id,
  status, started_at, finished_at, error_message,
  execution_data, node_execution_data
)

-- supabase-expert monitors workflow health
SELECT
  workflow_name,
  COUNT(*) FILTER (WHERE status = 'success') as successes,
  COUNT(*) FILTER (WHERE status = 'error') as failures,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'success') / COUNT(*), 2) as success_rate
FROM workflow_execution_logs
WHERE started_at > NOW() - INTERVAL '24 hours'
GROUP BY workflow_name
ORDER BY failures DESC;
```

---

## 4. SUPABASE ↔ HUBSPOT-CRM-MANAGER (Future)

### When supabase-expert needs hubspot-crm-manager
| Scenario | Hand Off | Data Exchange |
|----------|----------|---------------|
| Understanding CRM data model | "Explain HubSpot properties" | 44 custom properties |
| Contact sync issues | "Check HubSpot sync for [contact]" | Sync status |
| Deal pipeline issues | "Review deal [id] status" | Deal data |

### When hubspot-crm-manager needs supabase-expert
| Scenario | Hand Off | Data Exchange |
|----------|----------|---------------|
| Store sync tracking | Write to hubspot_sync_log | Sync state |
| Get contact data | Read from various tables | Contact info |
| Log engagement | Write to smartlead_engagement | Email data |

### Data Flow
```
Shopify Order → n8n workflow → hubspot_sync_log → HubSpot
                                    ↑
                          supabase-expert monitors

Smartlead Email → n8n webhook → smartlead_engagement → HubSpot
                                    ↑
                          supabase-expert monitors
```

---

## 5. SUPABASE ↔ PLATFORM MANAGERS (Future)

### shopify-manager
```sql
-- Tables that shopify-manager will use
tlx_products, tlx_distributors, tlx_distributor_orders  -- Teelixir
trial_customers, prospecting_queue                       -- Elevate

-- supabase-expert provides:
-- - Health monitoring
-- - Data quality checks
-- - Performance optimization
```

### bigcommerce-manager
```sql
-- Tables that bigcommerce-manager will use
bc_products, bc_orders, supplier_products, product_supplier_links
checkout_errors, livechat_*

-- supabase-expert provides:
-- - Supplier sync monitoring
-- - Stock level tracking
-- - Error pattern analysis
```

### woocommerce-manager
```sql
-- Tables that woocommerce-manager will use
wc_products, wc_orders, wc_customers
wc_shipping_zones, wc_coupons, rhf_sync_logs

-- supabase-expert provides:
-- - Schema deployment
-- - Sync monitoring
-- - Delivery zone analytics
```

---

## 6. HAND-OFF PROTOCOLS

### Escalation from supabase-expert

**To integration-tester:**
```markdown
HAND-OFF: Integration Test Required

Service: [service_name]
Issue: [description]
Last Working: [timestamp]
Error Pattern: [error_message]

Requested Action: Validate connectivity and authentication
Return: Test results to integration_logs
```

**To google-ads-manager:**
```markdown
HAND-OFF: Ads Data Anomaly

Business: [business_name]
Table: [google_ads_*]
Anomaly: [description]
Data Range: [start] to [end]

Requested Action: Investigate campaign performance
Return: Analysis and recommendations
```

### Escalation to supabase-expert

**From any skill:**
```markdown
HAND-OFF: Database Assistance Required

Operation: [SELECT/INSERT/UPDATE/DELETE]
Table(s): [table_names]
Issue: [description]
Urgency: [low/medium/high/critical]

Requested Action: [specific database help needed]
```

---

## 7. SHARED RESOURCES

### Vault Credentials (All Skills Use)
```javascript
// All skills access vault through same pattern
const creds = require('./creds');
await creds.load('project_name');
const value = await creds.get('project', 'credential_name');
```

### Logging (All Skills Write)
```javascript
// Standard log entry format
await supabase.from('integration_logs').insert({
  source: 'skill_name',
  business_id: 'business_slug',
  action: 'action_type',
  status: 'success|error|warning',
  details_json: { /* structured data */ },
  error_message: null // or error string
});
```

### Health Checks (supabase-expert Reads All)
```sql
-- Universal health check query
SELECT
  source as skill,
  COUNT(*) FILTER (WHERE status = 'success') as successes,
  COUNT(*) FILTER (WHERE status = 'error') as errors,
  MAX(created_at) as last_activity
FROM integration_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY source
ORDER BY errors DESC;
```

---

## 8. CONFLICT RESOLUTION

### Multiple Skills Writing Same Table
```
RULE: Each table has ONE owner skill
- google_ads_* → google-ads-manager owns writes
- tlx_* → teelixir scripts own writes
- integration_logs → Any skill can write (append-only)

RULE: supabase-expert is read-only arbiter
- Can read all tables
- Only writes to infrastructure tables
- Provides health/optimization recommendations
```

### Credential Access Conflicts
```
RULE: Vault is single source of truth
- All skills read from secure_credentials
- No hardcoded credentials in skill code
- supabase-expert monitors credential usage
```

### Data Freshness Conflicts
```
RULE: Most recent sync wins
- Check last_synced_at before overwriting
- Log sync conflicts to integration_logs
- supabase-expert arbitrates stale data disputes
```

---

## 9. SKILL ACTIVATION TRIGGERS

### When to activate supabase-expert
- Any database performance issue
- Data quality questions
- Schema/migration work
- Cross-business data analysis
- Credential vault management
- Monitoring and alerting

### When to defer to other skills
- Specific API issues → integration-tester
- Ads performance → google-ads-manager
- Workflow issues → n8n-workflow-manager
- Platform operations → platform-specific manager

---

## Quick Reference: Who Owns What

| Domain | Owner Skill | supabase-expert Role |
|--------|-------------|---------------------|
| Database health | supabase-expert | PRIMARY |
| Schema management | supabase-expert | PRIMARY |
| Vault credentials | supabase-expert | PRIMARY |
| API connectivity | integration-tester | SUPPORT |
| Google Ads data | google-ads-manager | SUPPORT |
| Workflow execution | n8n-workflow-manager | SUPPORT |
| Platform operations | platform managers | SUPPORT |

---

**Document Version:** 1.0
**Last Updated:** 2025-12-01
