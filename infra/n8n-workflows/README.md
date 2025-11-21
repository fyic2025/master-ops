# n8n Workflows

This directory contains exported n8n workflow definitions for the master-ops automation infrastructure.

---

## Overview

n8n workflows automate cross-business processes, task supervision, and recovery. All workflows are version-controlled here as JSON files for:

- **Version control** - Track changes to automation logic
- **Backup** - Restore workflows if lost
- **Deployment** - Push workflows to n8n instances programmatically
- **Documentation** - Understand automation architecture

---

## Directory Structure

```
infra/n8n-workflows/
├── README.md                          (this file)
├── workflow-template.json             (example workflow structure)
├── importWorkflow.ts                  (script to import workflows)
├── supervisor-analyze-tasks.json      (AI supervisor workflow)
├── task-retry-scheduler.json          (automatic retry workflow)
└── [other-workflow-name].json         (additional workflows)
```

---

## Workflow Naming Convention

Use descriptive, kebab-case names:

- ✅ `supervisor-analyze-tasks.json`
- ✅ `teelixir-order-sync.json`
- ✅ `daily-health-check.json`
- ❌ `workflow1.json`
- ❌ `myWorkflow.json`

---

## Exporting Workflows from n8n

### Method 1: Via n8n UI (Recommended)

1. Open workflow in n8n editor
2. Click **workflow settings** (⚙️ icon in top right)
3. Select **Download**
4. Choose **JSON** format
5. Save to this directory with descriptive name

### Method 2: Via n8n API

```bash
# Get workflow by ID
curl -X GET \
  "${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
  > workflow-name.json
```

### Method 3: Bulk Export All Workflows

```bash
# List all workflows
curl -X GET \
  "${N8N_BASE_URL}/api/v1/workflows" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}"

# Export each workflow by ID
```

---

## Importing Workflows to n8n

### Method 1: Via n8n UI

1. Go to n8n workflows page
2. Click **Import from File** button
3. Select JSON file from this directory
4. Review and activate workflow

### Method 2: Via Import Script (Recommended for Automation)

Use the included TypeScript script:

```bash
# Install dependencies (if not done)
npm install

# Import a workflow
npx tsx infra/n8n-workflows/importWorkflow.ts supervisor-analyze-tasks.json

# The script will:
# 1. Read the workflow JSON file
# 2. POST it to your n8n instance via API
# 3. Print the new workflow ID
```

**Environment variables required**:
- `N8N_BASE_URL` - Your n8n instance URL
- `N8N_API_KEY` - Your n8n API key

See [env-template.md](../config/env-template.md) for setup.

### Method 3: Direct API Call

```bash
# Import workflow via API
curl -X POST \
  "${N8N_BASE_URL}/api/v1/workflows" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
  -H "Content-Type: application/json" \
  -d @supervisor-analyze-tasks.json
```

---

## Workflow Template

See [workflow-template.json](workflow-template.json) for the basic structure of an n8n workflow.

Key fields:
- `name` - Workflow name (displayed in n8n)
- `nodes` - Array of workflow nodes (triggers, actions, logic)
- `connections` - How nodes connect to each other
- `active` - Whether workflow runs automatically
- `settings` - Execution settings, timezone, error handling

---

## Common Workflows

### 1. Supervisor Analyze Tasks

**File**: `supervisor-analyze-tasks.json`

**Purpose**: Monitors failed tasks and generates AI-powered repair instructions

**Trigger**: Cron (every 5 minutes)

**Steps**:
1. Query Supabase for tasks with status `failed` or `needs_fix`
2. For each task, fetch logs using supervisor module
3. Send to AI (GPT-4/Claude) with repair-generator prompt
4. Parse AI response
5. Update task with repair instructions
6. Notify if escalation needed

### 2. Task Retry Scheduler

**File**: `task-retry-scheduler.json`

**Purpose**: Automatically retries failed tasks based on schedule

**Trigger**: Cron (every 1 minute)

**Steps**:
1. Query Supabase using `get_tasks_for_retry()` RPC
2. For each task ready for retry:
   - Increment retry_count
   - Mark status as `in_progress`
   - Trigger task execution
   - Log retry attempt

### 3. Daily Health Check

**File**: `daily-health-check.json`

**Purpose**: Monitor system health and alert on issues

**Trigger**: Cron (daily at 8 AM)

**Steps**:
1. Count tasks by status
2. Check for tasks stuck in `in_progress` > 24 hours
3. Verify Supabase connection
4. Send summary email/Slack message

---

## Best Practices

### Version Control

- ✅ **Commit after every workflow change**
- ✅ **Use descriptive commit messages**
- ✅ **Test workflows before committing**
- ❌ Don't commit credentials (use environment variables)

### Workflow Design

- ✅ **Use meaningful node names** (not "HTTP Request 1")
- ✅ **Add notes** to complex logic
- ✅ **Handle errors** with error branches
- ✅ **Use environment variables** for URLs/keys
- ❌ Don't hardcode sensitive data

### Testing

- ✅ **Test with sample data** before activating
- ✅ **Verify error handling** works
- ✅ **Check execution history** after deployment
- ✅ **Monitor for failed executions**

### Documentation

- ✅ **Document trigger schedule** in workflow description
- ✅ **Explain complex nodes** with notes
- ✅ **List required credentials** in description
- ✅ **Note external dependencies**

---

## Updating Existing Workflows

### Process

1. **Export current version** from n8n (backup)
2. **Make changes** in n8n editor
3. **Test thoroughly** with sample data
4. **Export updated workflow** to this directory
5. **Commit changes** to git with description
6. **Document breaking changes** in commit message

### Example Commit Message

```
Update supervisor-analyze-tasks workflow

- Added retry logic for AI API failures
- Increased timeout from 30s to 60s
- Added Slack notification on escalation
- Updated to use new repair-generator.md prompt

Breaking changes:
- Requires new env var: SLACK_WEBHOOK_URL
```

---

## Troubleshooting

### Workflow Won't Import

**Error**: "Invalid workflow JSON"

**Solutions**:
- Ensure JSON is valid (use `jq` or JSON validator)
- Check for missing required fields (`name`, `nodes`, `connections`)
- Verify node IDs are unique

### API Import Fails

**Error**: "Unauthorized"

**Solutions**:
- Check `N8N_API_KEY` is set correctly
- Verify API key has workflow creation permissions
- Ensure n8n API is enabled in settings

**Error**: "Network timeout"

**Solutions**:
- Check `N8N_BASE_URL` is correct
- Verify n8n instance is accessible
- Check firewall/network settings

### Workflow Fails After Import

**Error**: "Missing credential"

**Solutions**:
- Create required credentials in n8n
- Update credential IDs in workflow JSON
- Or configure credentials after import via UI

---

## Security Notes

- **Never commit** actual API keys or credentials in workflow JSON
- **Use n8n credentials system** for sensitive data
- **Reference credentials by name**, not by embedding values
- **Rotate API keys** if accidentally committed
- **Use environment variables** for all external service URLs

---

## Deployment Checklist

Before deploying a new workflow to production:

- [ ] Workflow tested in development n8n instance
- [ ] Error handling implemented
- [ ] Credentials configured (not hardcoded)
- [ ] Environment variables documented
- [ ] Execution frequency is appropriate
- [ ] Workflow exported and committed to git
- [ ] Changes documented in commit message
- [ ] Team notified of new automation

---

## Resources

- [n8n Documentation](https://docs.n8n.io)
- [n8n API Reference](https://docs.n8n.io/api/)
- [n8n Workflow Templates](https://n8n.io/workflows)
- [Master-Ops Supabase Schema](../supabase/schema-tasks.sql)
- [Supervisor Module](../../shared/libs/supervisor/)
- [Repair Prompt Template](../../shared/prompts/repair-generator.md)

---

**Last Updated**: 2025-11-19
