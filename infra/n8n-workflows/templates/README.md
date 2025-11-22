# n8n Workflow Templates

Pre-built workflow templates for common automation tasks in master-ops.

## Available Templates

### 1. System Health Check

**File**: `health-check-workflow.json`

**Purpose**: Automated health monitoring for all integrations

**Schedule**: Every 5 minutes (configurable)

**Actions**:
1. Runs health check script
2. Checks exit code
3. If healthy: Logs success
4. If unhealthy: Sends Slack alert + logs error

**Setup**:
1. Import workflow to n8n
2. Configure Slack credentials
3. Configure Supabase/PostgreSQL credentials
4. Activate workflow

**Customization**:
- Change cron schedule in trigger node
- Update Slack channel in alert node
- Add email notifications
- Add webhook to external monitoring service

---

## Importing Workflows

### Via n8n UI

1. Open n8n
2. Click "Add workflow" → "Import from file"
3. Select template JSON file
4. Configure credentials
5. Activate workflow

### Via n8n CLI

```bash
n8n import:workflow --input=health-check-workflow.json
```

### Via API

```bash
curl -X POST http://your-n8n-instance/api/v1/workflows \
  -H "X-N8N-API-KEY: your-api-key" \
  -H "Content-Type: application/json" \
  -d @health-check-workflow.json
```

---

## Workflow Ideas

### Monitoring & Alerts
- ✅ System health check (implemented)
- Integration error alerts
- Performance degradation alerts
- Daily summary reports
- Weekly analytics reports

### Data Sync
- HubSpot → Supabase sync
- Unleashed → Supabase sync
- Cross-platform data consolidation
- Scheduled data backups

### Business Operations
- Order processing automation
- Inventory level monitoring
- Customer data enrichment
- Lead scoring and routing

### Maintenance
- Log cleanup automation
- Database optimization
- Stale data detection
- Credential rotation reminders

---

## Creating Custom Workflows

### Template Structure

```json
{
  "name": "Workflow Name",
  "nodes": [
    {
      "parameters": { /* node config */ },
      "name": "Node Name",
      "type": "n8n-nodes-base.nodeType",
      "typeVersion": 1,
      "position": [x, y]
    }
  ],
  "connections": {
    "Node Name": {
      "main": [[{
        "node": "Next Node",
        "type": "main",
        "index": 0
      }]]
    }
  },
  "active": false
}
```

### Best Practices

1. **Use Descriptive Names**: Name nodes clearly
2. **Error Handling**: Add error workflows for all critical nodes
3. **Logging**: Log all important operations to Supabase
4. **Credentials**: Use n8n credentials, never hardcode
5. **Testing**: Test with small datasets first
6. **Documentation**: Add notes to complex nodes

### Common Node Types

**Triggers**:
- `scheduleTrigger` - Cron-based scheduling
- `webhook` - HTTP webhook receiver
- `manualTrigger` - Manual execution

**Actions**:
- `executeCommand` - Run shell commands
- `httpRequest` - Make HTTP requests
- `postgres` - Database operations
- `set` - Set/transform data
- `if` - Conditional logic

**Integrations**:
- `slack` - Slack notifications
- `email` - Send emails
- `hubspot` - HubSpot CRM
- `supabase` - Supabase operations

---

## Workflow Deployment

### Development → Production

1. **Test Locally**:
   ```bash
   npm run dev  # Start local n8n via Docker
   ```

2. **Import and Test**:
   - Import workflow
   - Test with sample data
   - Verify error handling

3. **Export Workflow**:
   ```bash
   # Via n8n UI: Workflow → Download
   # Or via API
   ```

4. **Deploy to Production**:
   - Import to production n8n
   - Update credentials
   - Activate workflow
   - Monitor for 24 hours

### Version Control

Store workflows in git:
```bash
# Export from n8n
curl http://n8n/api/v1/workflows/ID > workflow.json

# Commit to repo
git add infra/n8n-workflows/
git commit -m "Add/update workflow"
```

---

## Monitoring Workflows

### Via ops-cli

```bash
# View workflow stats
ops workflows

# View failures
ops workflows --failures

# View logs
ops logs --source=n8n
```

### Via n8n UI

1. Open n8n
2. Go to "Executions"
3. Filter by workflow
4. View execution details

### Via Supabase

```sql
-- Workflow performance
SELECT * FROM workflow_performance_summary;

-- Recent failures
SELECT * FROM recent_workflow_failures;

-- Execution logs
SELECT * FROM workflow_execution_logs
WHERE workflow_id = 'your-workflow-id'
ORDER BY started_at DESC
LIMIT 50;
```

---

## Troubleshooting

### Workflow Not Triggering

- Check if workflow is active
- Verify cron expression
- Check execution queue
- Review n8n logs

### Execution Failures

```bash
# View error details
ops workflows --failures

# Check specific execution
ops db:query workflow_execution_logs --filter=execution_id=XXX
```

### Credential Issues

- Verify credentials in n8n settings
- Test connection manually
- Check credential permissions
- Rotate if compromised

---

## Resources

- [n8n Documentation](https://docs.n8n.io)
- [n8n Community](https://community.n8n.io)
- [Workflow Examples](https://n8n.io/workflows)
- master-ops [ARCHITECTURE.md](../../ARCHITECTURE.md)

---

**Last Updated**: 2025-11-20
