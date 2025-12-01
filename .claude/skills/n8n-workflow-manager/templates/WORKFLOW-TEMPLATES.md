# Workflow Templates - n8n Workflow Manager

> Reference guide for n8n workflow templates in the repository.

---

## Template Location

All workflow templates are stored in:
```
infra/n8n-workflows/templates/
```

---

## Available Templates

### Core Business Templates

| Template | File | Purpose |
|----------|------|---------|
| Business Sync | `business-sync-workflow.json` | Generic sync template for any business |
| Checkout Error Email | `checkout-error-email-sender.json` | Email alerts on checkout errors |
| Ambassador Handler | `ambassador-application-handler.json` | Brand ambassador form processing |

### Integration Templates

| Template | File | Purpose |
|----------|------|---------|
| Shopify Order Sync | `shopify-order-sync.json` | Sync Shopify orders to Supabase |
| Shopify Customer Sync | `shopify-customer-sync.json` | Sync Shopify customers to Supabase |
| Unleashed Order Sync | `unleashed-order-sync.json` | Sync Unleashed orders to Supabase |
| Unleashed Customer Sync | `unleashed-customer-sync.json` | Sync Unleashed customers to Supabase |
| Smartlead-HubSpot Sync | `smartlead-hubspot-sync.json` | Sync Smartlead to HubSpot |

### Infrastructure Templates

| Template | File | Purpose |
|----------|------|---------|
| Health Check | `health-check-workflow.json` | System health monitoring |
| Error Monitoring | `error-monitoring-workflow.json` | Real-time error alerts |
| Daily Summary | `daily-summary-workflow.json` | Daily operations report |

---

## Template Structure

All templates follow this structure:

```json
{
  "name": "Template Name",
  "nodes": [
    {
      "name": "Node Name",
      "type": "n8n-nodes-base.triggerType",
      "typeVersion": 1,
      "position": [x, y],
      "parameters": { },
      "credentials": { }
    }
  ],
  "connections": {
    "Node Name": {
      "main": [[{ "node": "Next Node", "type": "main", "index": 0 }]]
    }
  },
  "settings": {
    "executionOrder": "v1",
    "saveDataErrorExecution": "all",
    "saveDataSuccessExecution": "all"
  }
}
```

---

## Template: Shopify Order Sync

### Overview
Syncs Shopify orders to Supabase on a schedule.

### Nodes
1. **Schedule Trigger** - Cron every 15 minutes
2. **Get Orders** - HTTP Request to Shopify Orders API
3. **Loop Over Orders** - SplitInBatches for rate limiting
4. **Transform** - Code node for data mapping
5. **Upsert** - Supabase upsert with conflict handling
6. **Log Result** - Write to integration_logs

### Required Credentials
- Shopify API (Access Token)
- Supabase (URL + Service Role Key)

### Variables to Configure
```javascript
// In Code node
const BUSINESS_ID = 'teelixir' // or: boo, elevate, rhf
const TABLE_NAME = 'tlx_shopify_orders'
const SHOPIFY_STORE = 'your-store.myshopify.com'
```

### Rate Limiting
```javascript
// Add 500ms delay between orders
await new Promise(r => setTimeout(r, 500))
```

---

## Template: Unleashed Order Sync

### Overview
Syncs Unleashed sales orders using HMAC authentication.

### HMAC Authentication Code
```javascript
// CRITICAL: Proper HMAC signature generation
const crypto = require('crypto')

function generateUnleashedAuth(apiId, apiKey, queryString = '') {
  // Query string must be decoded before signing
  const decodedQuery = decodeURIComponent(queryString)

  const signature = crypto
    .createHmac('sha256', apiKey)
    .update(decodedQuery)
    .digest('base64')

  return {
    'api-auth-id': apiId,
    'api-auth-signature': signature,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
}

// Usage
const query = 'startDate=2024-01-01&pageSize=200'
const headers = generateUnleashedAuth(
  $credentials.apiId,
  $credentials.apiKey,
  query
)
```

### Common Issues
- Query string encoding (use decoded string for signature)
- Parameter order (must match URL order)
- Whitespace in API key (trim before use)

---

## Template: Health Check

### Overview
Monitors all integrations and alerts on failures.

### Nodes
1. **Schedule Trigger** - Every 5 minutes
2. **Parallel Checks** - Multiple HTTP Request nodes
3. **Merge Results** - Combine all check results
4. **Evaluate Health** - Code node to assess
5. **Alert if Unhealthy** - Slack/Email notification

### Health Check Endpoints
```javascript
const endpoints = [
  { name: 'BigCommerce BOO', url: 'https://api.bigcommerce.com/stores/{hash}/v3/catalog/summary' },
  { name: 'Shopify Elevate', url: 'https://elevate.myshopify.com/admin/api/2024-01/shop.json' },
  { name: 'Supabase', url: 'https://usibnysqelovfuctmkqw.supabase.co/rest/v1/' },
  { name: 'HubSpot', url: 'https://api.hubapi.com/crm/v3/objects/contacts?limit=1' }
]
```

---

## Template: Error Monitoring

### Overview
Listens for new errors and sends immediate alerts.

### Trigger Options
1. **Webhook** - Supabase realtime webhook on new error
2. **Schedule** - Poll every minute for new errors
3. **n8n Execute Workflow** - Called from other workflows on error

### Alert Thresholds
```javascript
const SEVERITY = {
  critical: ['401', '403', 'ECONNREFUSED', 'down'],
  warning: ['429', '500', 'timeout'],
  info: ['validation', 'duplicate']
}

function getSeverity(error) {
  const msg = error.toLowerCase()
  if (SEVERITY.critical.some(p => msg.includes(p))) return 'critical'
  if (SEVERITY.warning.some(p => msg.includes(p))) return 'warning'
  return 'info'
}
```

---

## Template: Daily Summary

### Overview
Generates and sends daily operations summary.

### Metrics Collected
- Workflow execution counts (success/error)
- Integration sync status per business
- Error distribution by source
- Stale workflow alerts

### Summary Format
```markdown
# Daily Operations Summary - {{ $today.format('YYYY-MM-DD') }}

## Execution Stats
- Total: {{ stats.total }}
- Success: {{ stats.success }} ({{ stats.successRate }}%)
- Failed: {{ stats.failed }}

## By Business
| Business | Syncs | Errors |
|----------|-------|--------|
| BOO | {{ boo.syncs }} | {{ boo.errors }} |
| Teelixir | {{ tlx.syncs }} | {{ tlx.errors }} |
| Elevate | {{ elv.syncs }} | {{ elv.errors }} |

## Alerts
{{ alerts.join('\n') }}
```

---

## Importing Templates

### Via API

```bash
# Import workflow from template
TEMPLATE="infra/n8n-workflows/templates/health-check-workflow.json"

# Remove runtime fields
cat "$TEMPLATE" | jq 'del(.id, .createdAt, .updatedAt, .versionId)' | \
curl -X POST "https://automation.growthcohq.com/api/v1/workflows" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
  -H "Content-Type: application/json" \
  -d @-
```

### Via TypeScript

```typescript
import { N8nClient } from './shared/libs/n8n/client'

const client = new N8nClient()

// Import from file
const workflow = await client.importWorkflowFromFile(
  'infra/n8n-workflows/templates/health-check-workflow.json'
)

console.log(`Imported: ${workflow.id} - ${workflow.name}`)
```

### Via n8n UI

1. Open n8n: https://automation.growthcohq.com
2. Click "New workflow" → "Import from file"
3. Select template JSON file
4. Configure credentials for each node
5. Activate workflow

---

## Template Customization

### Required Changes Before Deploy

1. **Credentials** - Assign from n8n credential store
2. **Table Names** - Match Supabase schema
3. **Business ID** - Set correct business identifier
4. **Webhook URLs** - Update if using webhooks
5. **Cron Schedule** - Adjust timing if needed

### Naming Convention

```
{business}-{source}-{action}

Examples:
- boo-bc-product-sync
- tlx-unleashed-orders
- elv-shopify-customers
- sys-health-check
```

---

## Creating New Templates

### Best Practices

1. **Use Variables** - Environment-based configuration
2. **Add Error Handling** - Try/catch in Code nodes
3. **Include Logging** - Write to integration_logs
4. **Rate Limit** - Add delays for API calls
5. **Idempotent** - Support re-runs without duplicates

### Template Checklist

- [ ] Remove hardcoded credentials
- [ ] Remove workflow ID and timestamps
- [ ] Document required credentials
- [ ] Add error handling nodes
- [ ] Include logging node
- [ ] Test in isolated environment
- [ ] Export clean JSON

---

**Document Version:** 1.0
**Last Updated:** 2025-12-01
