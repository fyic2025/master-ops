# n8n Workflow Manager Skill

> Comprehensive management, monitoring, and troubleshooting of n8n automation workflows across all 4 businesses.

---

## Skill Identity

**Name:** n8n-workflow-manager
**Version:** 1.0.0
**Status:** Active
**Last Updated:** 2025-12-01

---

## Capabilities

### Core Functions

1. **Workflow Lifecycle Management**
   - Create, import, export workflows
   - Activate/deactivate workflows
   - Clone and version workflows
   - Deploy workflows across environments

2. **Execution Monitoring**
   - Real-time execution tracking
   - Success/error rate analysis
   - Performance metrics collection
   - Historical execution analysis

3. **Troubleshooting**
   - Error diagnosis and root cause analysis
   - Credential validation
   - Connection testing
   - Node-level debugging

4. **Maintenance**
   - Workflow health checks
   - Credential rotation management
   - Execution log cleanup
   - Performance optimization

5. **Cross-Business Orchestration**
   - BOO: Checkout errors, supplier syncs
   - Teelixir: Smartlead-HubSpot, Unleashed syncs
   - Elevate: Prospecting automation
   - RHF: WooCommerce syncs (future)

---

## When to Use This Skill

### Activate For:
- "Workflow is not triggering"
- "n8n execution failed"
- "How do I create a new workflow?"
- "Check workflow health"
- "Credential issues in n8n"
- "Sync workflow isn't running"
- "Monitor workflow executions"
- "Deploy workflow to production"

### Defer To:
- **supabase-expert**: Database issues, data quality
- **integration-tester**: API connectivity tests
- **google-ads-manager**: Ads-specific workflows

---

## n8n Infrastructure

### Instance Details
```
Base URL:     https://n8n.growthcohq.com (or configured URL)
API Version:  v1
Auth:         X-N8N-API-KEY header
Timezone:     Australia/Melbourne
```

### Core Library
```
shared/libs/n8n/
├── client.ts      # Full API client
├── workflows.ts   # Workflow utilities
├── utils.ts       # Helper functions
├── validator.ts   # Validation logic
└── index.ts       # Exports
```

### Workflow Templates Location
```
infra/n8n-workflows/templates/
├── health-check-workflow.json
├── error-monitoring-workflow.json
├── daily-summary-workflow.json
├── shopify-order-sync.json
├── shopify-customer-sync.json
├── unleashed-order-sync.json
├── unleashed-customer-sync.json
├── smartlead-hubspot-sync.json
├── ambassador-application-handler.json
├── checkout-error-email-sender.json
└── business-sync-workflow.json
```

---

## Workflow Inventory

### BOO - Buy Organics Online
| Workflow | Trigger | Purpose |
|----------|---------|---------|
| BC Product Sync | Cron (daily) | Sync BigCommerce products |
| Checkout Error Email | Webhook | Alert on checkout failures |
| Supplier Stock Sync | Cron (2h) | Update supplier inventory |

### Teelixir
| Workflow | Trigger | Purpose |
|----------|---------|---------|
| Smartlead-HubSpot Sync | Cron | Sync leads to CRM |
| Unleashed Order Sync | Cron (15min) | Sync orders to inventory |
| Unleashed Customer Sync | Cron (daily) | Sync distributors |
| Winback Automation | Cron (hourly) | Trigger winback emails |

### Elevate Wholesale
| Workflow | Trigger | Purpose |
|----------|---------|---------|
| Prospecting Processor | Cron (6am) | Process prospect queue |
| Trial Expiration | Cron (2am) | Expire old trials |
| Login Detector | Cron (7am) | Check customer logins |

### Shared Infrastructure
| Workflow | Trigger | Purpose |
|----------|---------|---------|
| Health Check | Cron (5min) | Monitor integrations |
| Error Monitoring | Continuous | Track all errors |
| Daily Summary | Cron (8am) | Daily ops report |

---

## API Quick Reference

```typescript
import { N8nClient } from 'shared/libs/n8n'

const client = new N8nClient({
  baseUrl: process.env.N8N_BASE_URL,
  apiKey: process.env.N8N_API_KEY
})

// List workflows
const workflows = await client.listWorkflows()

// Get workflow
const workflow = await client.getWorkflow(id)

// Activate/deactivate
await client.activateWorkflow(id)
await client.deactivateWorkflow(id)

// Execute manually
const execution = await client.executeWorkflow(id)

// Get executions
const executions = await client.listExecutions({
  workflowId: id,
  status: 'error',
  limit: 10
})

// Get stats
const stats = await client.getWorkflowStats(id)
```

---

## Key Scripts

| Script | Purpose |
|--------|---------|
| `list-n8n-workflows.ts` | List all workflows |
| `check-n8n-workflow.ts` | Check workflow status |
| `activate-n8n-workflow.ts` | Activate a workflow |
| `analyze-workflow.ts` | Deep workflow analysis |
| `diagnose-workflow-errors.ts` | Error diagnosis |
| `execute-and-monitor.ts` | Execute with monitoring |
| `setup-n8n-credentials.ts` | Setup credentials |
| `test-n8n-connection.ts` | Test connectivity |

---

## Skill Documentation

| Document | Purpose |
|----------|---------|
| `context/WORKFLOW-INVENTORY.md` | All workflows by business |
| `context/ARCHITECTURE.md` | n8n architecture deep dive |
| `context/ERROR-PATTERNS.md` | Common errors and fixes |
| `playbooks/OPERATIONS.md` | Daily/weekly procedures |
| `playbooks/TROUBLESHOOTING.md` | Decision trees |
| `procedures/SELF-HEALING.md` | Automated recovery |
| `templates/WORKFLOW-TEMPLATES.md` | Reusable patterns |
| `CHEAT-SHEET.md` | Quick reference |

---

## Integration Points

### Supabase Tables Used
- `workflow_execution_logs` - Execution tracking
- `integration_logs` - Cross-system logging
- `dashboard_job_status` - Job monitoring

### Credential Storage
- n8n internal credential store
- Supabase vault (`secure_credentials`)

### Monitoring
- n8n execution history
- Supabase logging
- Slack alerts

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Workflow success rate | > 95% |
| Average execution time | < 30s (simple), < 5min (complex) |
| Credential validity | 100% |
| Stale workflow detection | < 24h |

---

**Skill Level:** Expert (Level 3)
**Confidence:** 95%
