# n8n Task Processor - Import Instructions

Guide for importing and configuring the Claude Task Processor workflow in n8n.

## Prerequisites

Before importing, ensure you have:
1. n8n instance running (https://automation.growthcohq.com)
2. SSH access to the server (134.199.175.243)
3. Supabase service role key (teelixir-leads project)

---

## Step 1: Create Required Credentials

### 1.1 Supabase HTTP Header Auth

1. Go to **Settings > Credentials** in n8n
2. Click **Add Credential**
3. Search for **Header Auth**
4. Configure:
   - **Name**: `Supabase Service Key`
   - **Header Name**: `Authorization`
   - **Header Value**: `Bearer <SERVICE_ROLE_KEY>`

Get the service role key:
```bash
node creds.js get global master_supabase_service_role_key
```

### 1.2 SSH Credentials

1. Go to **Settings > Credentials** in n8n
2. Click **Add Credential**
3. Search for **SSH Password** or **SSH Private Key**
4. Configure:
   - **Name**: `n8n-primary SSH`
   - **Host**: `134.199.175.243`
   - **Port**: `22`
   - **Username**: `root`
   - **Authentication**: Password or Private Key (depending on your setup)

---

## Step 2: Import the Workflow

### Method A: Via n8n UI

1. Go to **Workflows** in n8n
2. Click **Add Workflow** (top right)
3. Click the **...** menu > **Import from File**
4. Select `infra/claude-automation/n8n-task-processor.json`
5. Click **Import**

### Method B: Via n8n API

```bash
# Get n8n API key
N8N_API_KEY=$(node creds.js get global n8n_api_key)

# Import workflow
curl -X POST "https://automation.growthcohq.com/api/v1/workflows" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d @infra/claude-automation/n8n-task-processor.json
```

---

## Step 3: Update Credential References

After importing, you need to link credentials to nodes:

1. Open the imported workflow
2. Click on **Fetch Pending Task** node
   - Click **Credential to connect with**
   - Select `Supabase Service Key`
3. Click on **Execute Task via SSH** node
   - Click **Credential to connect with**
   - Select `n8n-primary SSH`
4. Click on **Log Success** node
   - Click **Credential to connect with**
   - Select `Supabase Service Key`
5. Click on **Log Error** node
   - Click **Credential to connect with**
   - Select `Supabase Service Key`

---

## Step 4: Test the Workflow

### Manual Test

1. Create a test task in Supabase:
```sql
INSERT INTO tasks (title, description, business, priority, status)
VALUES (
  'Test Task',
  'This is a test task for n8n workflow',
  'general',
  'normal',
  'pending'
);
```

2. In n8n, click **Test Workflow**
3. Verify the task is processed

### Webhook Test

```bash
curl -X POST https://automation.growthcohq.com/webhook/claude-task-trigger \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## Step 5: Activate the Workflow

1. In the workflow editor, toggle the **Active** switch (top right)
2. Confirm activation

The workflow will now:
- Run every 5 minutes automatically
- Process pending tasks from Supabase
- Log results to integration_logs table

---

## Workflow Structure

| Node | Type | Purpose |
|------|------|---------|
| Every 5 Minutes | Schedule Trigger | Main trigger - runs every 5 min |
| Manual Webhook | Webhook | Backup trigger for manual runs |
| Merge Triggers | Merge | Combines both trigger paths |
| Fetch Pending Task | HTTP Request | Query Supabase for pending tasks |
| Task Exists? | IF | Check if task was found |
| Extract Task | Code | Parse task from array response |
| Execute Task via SSH | SSH | Run process-task.sh on server |
| Parse Result | Code | Parse JSON output from script |
| Task Succeeded? | IF | Check execution result |
| Log Success | HTTP Request | Log success to integration_logs |
| Log Error | HTTP Request | Log failure to integration_logs |
| Process More Tasks | Loop | Process up to 5 tasks per run |
| No Pending Tasks | Set | Handle empty queue |
| Webhook Response | Respond | Reply to webhook triggers |

---

## Deactivation

To temporarily disable:
1. Open the workflow
2. Toggle the **Active** switch OFF

To completely remove:
1. Go to **Workflows**
2. Find "Claude Task Processor"
3. Click **...** > **Delete**

---

## Troubleshooting

### Tasks Not Processing

1. Check workflow is Active
2. Verify Supabase credentials are correct
3. Check task status is 'pending' (not 'in_progress' or 'completed')
4. Check n8n execution logs

### SSH Connection Fails

1. Verify SSH credentials in n8n
2. Test SSH manually: `ssh root@134.199.175.243`
3. Ensure process-task.sh exists and is executable

### Supabase Errors

1. Verify service role key is correct
2. Check tasks table exists
3. Verify RLS policies allow service role access

---

## Monitoring

### Check Recent Executions

- n8n UI: **Executions** tab
- Supabase: Query `integration_logs` table

```sql
SELECT * FROM integration_logs
WHERE source = 'claude-task-processor'
ORDER BY created_at DESC
LIMIT 20;
```

### Check Task Status

```sql
SELECT id, title, status, started_at, completed_at
FROM tasks
WHERE status IN ('pending', 'in_progress')
ORDER BY created_at DESC;
```

---

## Configuration Reference

| Setting | Value | Location |
|---------|-------|----------|
| Schedule Interval | 5 minutes | Every 5 Minutes node |
| Max Tasks Per Run | 5 | Process More Tasks node (loopCount + 1) |
| Supabase URL | qcvfxxsnqvdfmpbcgdni.supabase.co | Fetch Pending Task node |
| SSH Host | 134.199.175.243 | Execute Task via SSH node |
| Script Path | /var/www/master-ops/infra/claude-automation/process-task.sh | Execute Task via SSH node |

---

*Last updated: 2025-12-05*
