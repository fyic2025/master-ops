# Operational Playbooks - n8n Workflow Manager

> Step-by-step procedures for common n8n operations.

---

## Prerequisites

All playbooks require:

```bash
# Load credentials from vault
node creds.js load global

# Or set manually
export N8N_BASE_URL=https://automation.growthcohq.com
export N8N_API_KEY=<your-api-key>
```

---

## 1. DAILY HEALTH CHECK

### Purpose
Verify all critical workflows are running and healthy.

### Procedure

```bash
# Step 1: Check n8n connectivity
curl -s "${N8N_BASE_URL}/healthz"
# Expected: {"status":"ok"}

# Step 2: List active workflows
curl -s "${N8N_BASE_URL}/api/v1/workflows?active=true" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" | jq '.data | length'
# Expected: 150+ active workflows

# Step 3: Check for recent failures
curl -s "${N8N_BASE_URL}/api/v1/executions?status=error&limit=20" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" | \
  jq '.data[] | {id, workflowId, startedAt}'

# Step 4: Check critical workflows executed today
CRITICAL_WORKFLOWS=(
  "boo-bc-product-sync"
  "tlx-unleashed-orders"
  "tlx-smartlead-hubspot"
  "sys-health-check"
)

for workflow in "${CRITICAL_WORKFLOWS[@]}"; do
  echo "Checking: $workflow"
  curl -s "${N8N_BASE_URL}/api/v1/workflows" \
    -H "X-N8N-API-KEY: ${N8N_API_KEY}" | \
    jq --arg name "$workflow" '.data[] | select(.name | contains($name)) | {name, active, updatedAt}'
done
```

### Success Criteria
- [ ] n8n responds to health check
- [ ] 150+ workflows active
- [ ] <5 failed executions in last 24h
- [ ] All critical workflows ran successfully

---

## 2. WORKFLOW DEPLOYMENT

### Purpose
Deploy a new workflow or update an existing one.

### Procedure

```bash
# Step 1: Validate workflow JSON
WORKFLOW_FILE="infra/n8n-workflows/templates/my-workflow.json"
cat "$WORKFLOW_FILE" | jq '.' > /dev/null
# Must not error

# Step 2: Check for required credentials
cat "$WORKFLOW_FILE" | jq '.nodes[].credentials // empty'
# Note which credentials are needed

# Step 3: Import workflow (creates new)
curl -X POST "${N8N_BASE_URL}/api/v1/workflows" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
  -H "Content-Type: application/json" \
  -d @"$WORKFLOW_FILE" | jq '{id, name, active}'

# Step 4: Verify credentials in n8n UI
echo "Visit: ${N8N_BASE_URL}/workflow/<workflow-id>"
echo "Check all nodes have credentials assigned"

# Step 5: Test workflow manually
WORKFLOW_ID="<new-workflow-id>"
curl -X POST "${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}/execute" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" | jq '.'

# Step 6: Check execution result
curl -s "${N8N_BASE_URL}/api/v1/executions?workflowId=${WORKFLOW_ID}&limit=1" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" | jq '.data[0].status'
# Expected: "success"

# Step 7: Activate workflow
curl -X POST "${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}/activate" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" | jq '{id, active}'
```

### Rollback Procedure

```bash
# Deactivate failed workflow
curl -X POST "${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}/deactivate" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}"

# Delete if test deployment
curl -X DELETE "${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}"
```

---

## 3. CREDENTIAL ROTATION

### Purpose
Update API credentials across all affected workflows.

### Procedure

```bash
# Step 1: Identify credential type to rotate
CRED_TYPE="shopifyApi"  # or: bigcommerceApi, hubspotApi, etc.

# Step 2: List all credentials of this type
curl -s "${N8N_BASE_URL}/api/v1/credentials" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" | \
  jq --arg type "$CRED_TYPE" '.data[] | select(.type == $type) | {id, name}'

# Step 3: Find workflows using this credential
CRED_ID="<credential-id>"
curl -s "${N8N_BASE_URL}/api/v1/workflows" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" | \
  jq --arg cred "$CRED_ID" '.data[] | select(.nodes[].credentials // {} | to_entries[] | .value.id == $cred) | .name'

# Step 4: Deactivate affected workflows
# (Do this in n8n UI to prevent partial updates)
echo "Deactivate workflows manually in n8n UI before proceeding"

# Step 5: Update credential in n8n UI
echo "Visit: ${N8N_BASE_URL}/credentials"
echo "Find credential: $CRED_ID"
echo "Update with new API key/secret"

# Step 6: Test one workflow
curl -X POST "${N8N_BASE_URL}/api/v1/workflows/<test-workflow-id>/execute" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}"

# Step 7: Reactivate workflows
# (Reactivate in n8n UI after successful test)
```

### Important Notes
- Always update vault credentials first: `node creds.js store <project> <name> <new-value>`
- Test with one workflow before reactivating all
- Monitor for 1 hour after rotation

---

## 4. INCIDENT RESPONSE

### Purpose
Respond to workflow failures or system issues.

### Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| P1 | Revenue-affecting (orders, payments) | Immediate |
| P2 | Customer-facing (emails, sync) | 2 hours |
| P3 | Internal operations | Next business day |
| P4 | Monitoring/reporting | Weekly |

### P1 Incident Procedure

```bash
# Step 1: Assess scope
curl -s "${N8N_BASE_URL}/api/v1/executions?status=error&limit=50" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" | \
  jq '.data | group_by(.workflowId) | map({workflowId: .[0].workflowId, count: length})'

# Step 2: Check n8n health
curl -s "${N8N_BASE_URL}/healthz"
# If not OK, check n8n container/server

# Step 3: Identify failing node
EXEC_ID="<latest-failed-execution>"
curl -s "${N8N_BASE_URL}/api/v1/executions/${EXEC_ID}" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" | \
  jq '.data.resultData.error, .data.resultData.lastNodeExecuted'

# Step 4: Check external service
# Based on failing node, test:
# - API endpoint reachable?
# - Credentials valid?
# - Rate limits exceeded?

# Step 5: Temporary mitigation
# Option A: Retry execution
curl -X POST "${N8N_BASE_URL}/api/v1/executions/${EXEC_ID}/retry" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}"

# Option B: Deactivate until fixed
curl -X POST "${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}/deactivate" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}"

# Step 6: Fix root cause (varies by issue)
# Step 7: Verify fix with manual execution
# Step 8: Reactivate and monitor
```

---

## 5. WORKFLOW BACKUP & RESTORE

### Purpose
Export workflows for backup or migration.

### Backup Procedure

```bash
# Create backup directory
BACKUP_DIR="backups/n8n/$(date +%Y-%m-%d)"
mkdir -p "$BACKUP_DIR"

# Export all workflows
curl -s "${N8N_BASE_URL}/api/v1/workflows" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" | \
  jq '.data' > "$BACKUP_DIR/all-workflows.json"

# Export individual workflows
for id in $(cat "$BACKUP_DIR/all-workflows.json" | jq -r '.[].id'); do
  curl -s "${N8N_BASE_URL}/api/v1/workflows/${id}" \
    -H "X-N8N-API-KEY: ${N8N_API_KEY}" > "$BACKUP_DIR/workflow-${id}.json"
  echo "Backed up: $id"
done

# Count backups
ls -la "$BACKUP_DIR" | wc -l
```

### Restore Procedure

```bash
# Restore single workflow
WORKFLOW_FILE="backups/n8n/2025-01-01/workflow-abc123.json"

# Remove runtime fields before import
cat "$WORKFLOW_FILE" | jq 'del(.id, .createdAt, .updatedAt, .versionId)' | \
curl -X POST "${N8N_BASE_URL}/api/v1/workflows" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
  -H "Content-Type: application/json" \
  -d @-
```

---

## 6. PERFORMANCE OPTIMIZATION

### Purpose
Optimize slow or failing workflows.

### Identify Slow Workflows

```bash
# Get executions with duration
curl -s "${N8N_BASE_URL}/api/v1/executions?limit=100" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" | \
  jq '.data[] | {
    workflowId,
    duration: ((.stoppedAt | fromdateiso8601) - (.startedAt | fromdateiso8601))
  }' | jq -s 'group_by(.workflowId) | map({
    workflowId: .[0].workflowId,
    avgDuration: (map(.duration) | add / length)
  }) | sort_by(-.avgDuration) | .[0:10]'
```

### Optimization Checklist

1. **Reduce API calls**
   - Batch operations where possible
   - Use pagination efficiently
   - Cache responses in Supabase

2. **Add delays for rate limits**
   ```javascript
   // Add Wait node between API calls
   await new Promise(resolve => setTimeout(resolve, 200))
   ```

3. **Use SplitInBatches node**
   - Process large datasets in chunks
   - Prevents memory issues
   - Allows progress tracking

4. **Parallelize independent operations**
   - Use Merge node with "Wait for All" mode
   - Process multiple items concurrently

5. **Optimize Code nodes**
   - Avoid loading full datasets into memory
   - Use streaming for large files
   - Minimize external module imports

---

## 7. DISASTER RECOVERY

### Purpose
Recover from major n8n outage or data loss.

### Pre-requisites
- Weekly automated backups in `backups/n8n/`
- Backup verification monthly
- Documented restore procedure

### Recovery Procedure

```bash
# Step 1: Assess damage
# - Is n8n server running?
# - Is database accessible?
# - Are backups available?

# Step 2: Identify latest backup
ls -la backups/n8n/ | tail -5

# Step 3: Restore n8n instance (if needed)
# Follow DigitalOcean/hosting provider docs

# Step 4: Restore workflows
BACKUP_DATE="2025-01-01"
for file in backups/n8n/${BACKUP_DATE}/workflow-*.json; do
  echo "Restoring: $file"
  cat "$file" | jq 'del(.id, .createdAt, .updatedAt, .versionId)' | \
  curl -X POST "${N8N_BASE_URL}/api/v1/workflows" \
    -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
    -H "Content-Type: application/json" \
    -d @-
done

# Step 5: Reconfigure credentials
# Credentials are NOT backed up (security)
# Must recreate from vault: node creds.js list

# Step 6: Verify workflows
curl -s "${N8N_BASE_URL}/api/v1/workflows" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" | jq '.data | length'

# Step 7: Activate critical workflows first
# sys-health-check, boo-bc-product-sync, tlx-unleashed-orders

# Step 8: Monitor for 24 hours
```

---

## 8. ADD NEW INTEGRATION

### Purpose
Set up workflows for a new API integration.

### Procedure

```bash
# Step 1: Document API requirements
cat << EOF > docs/integrations/new-api.md
# New API Integration

API Base URL: https://api.example.com
Auth Type: API Key / OAuth
Rate Limits: 100 req/min
Endpoints Used:
  - GET /products
  - POST /orders
EOF

# Step 2: Store credentials in vault
node creds.js store <project> api_key "<key>" "New API key"
node creds.js store <project> api_secret "<secret>" "New API secret"

# Step 3: Create test workflow
# Use n8n UI to create and test

# Step 4: Export workflow template
WORKFLOW_ID="<new-workflow-id>"
curl -s "${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" | \
  jq 'del(.id, .createdAt, .updatedAt, .versionId)' > \
  infra/n8n-workflows/templates/new-integration.json

# Step 5: Document in workflow inventory
# Update: .claude/skills/n8n-workflow-manager/context/WORKFLOW-INVENTORY.md

# Step 6: Add monitoring
# Create error monitoring workflow
# Add to daily health check

# Step 7: Train team
# Document in runbook
# Add to troubleshooting guide
```

---

## Quick Command Reference

```bash
# List all workflows
curl -s "${N8N_BASE_URL}/api/v1/workflows" -H "X-N8N-API-KEY: ${N8N_API_KEY}" | jq '.data | length'

# Get workflow by ID
curl -s "${N8N_BASE_URL}/api/v1/workflows/{id}" -H "X-N8N-API-KEY: ${N8N_API_KEY}"

# Activate workflow
curl -X POST "${N8N_BASE_URL}/api/v1/workflows/{id}/activate" -H "X-N8N-API-KEY: ${N8N_API_KEY}"

# Deactivate workflow
curl -X POST "${N8N_BASE_URL}/api/v1/workflows/{id}/deactivate" -H "X-N8N-API-KEY: ${N8N_API_KEY}"

# Execute workflow
curl -X POST "${N8N_BASE_URL}/api/v1/workflows/{id}/execute" -H "X-N8N-API-KEY: ${N8N_API_KEY}"

# List executions
curl -s "${N8N_BASE_URL}/api/v1/executions?limit=10" -H "X-N8N-API-KEY: ${N8N_API_KEY}"

# Get execution details
curl -s "${N8N_BASE_URL}/api/v1/executions/{id}" -H "X-N8N-API-KEY: ${N8N_API_KEY}"

# List credentials
curl -s "${N8N_BASE_URL}/api/v1/credentials" -H "X-N8N-API-KEY: ${N8N_API_KEY}"
```

---

**Document Version:** 1.0
**Last Updated:** 2025-12-01
