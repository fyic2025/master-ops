# Claude Code Headless Automation

Automated task processing system that uses Claude Code in headless mode to execute tasks from the Supabase `tasks` table.

## Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐
│   Supabase  │────▶│    n8n      │────▶│  134.199.175.243    │
│   (tasks)   │◀────│  (trigger)  │◀────│  (Claude Code)      │
└─────────────┘     └─────────────┘     └─────────────────────┘
```

1. **n8n** polls Supabase every 5 minutes for pending tasks
2. **n8n** SSHs to the droplet and runs `process-task.sh`
3. **process-task.sh** calls Claude Code headless with task instructions
4. Results are written back to Supabase (status, logs)

## Prerequisites

- SSH access to 134.199.175.243 (n8n-primary)
- Claude Code installed at `/opt/node22/bin/claude`
- Supabase credentials configured
- n8n running on the droplet

## Setup Instructions

### Step 1: Authenticate Claude Code on Server

Claude Code requires one-time authentication. Run this from your **local machine**:

```bash
# SSH to the server with TTY for interactive login
ssh -t root@134.199.175.243 "/opt/node22/bin/claude"
```

This will:
1. Open an interactive Claude session
2. Prompt you to authenticate via browser
3. Store credentials on the server

After login, type `/exit` to close the session.

### Step 2: Test Headless Mode

Verify headless mode works:

```bash
ssh root@134.199.175.243 '/opt/node22/bin/claude -p "respond with OK" --output-format json'
```

Expected output:
```json
{"type":"result","subtype":"success","cost_usd":0.001,"is_error":false,"duration_ms":1234,"duration_api_ms":1000,"num_turns":1,"result":"OK","session_id":"..."}
```

### Step 3: Run Setup Script

From your local machine:

```bash
./infra/claude-automation/setup-headless.sh
```

This script will:
1. SSH to the server
2. Check Claude Code installation
3. Run authentication if needed
4. Test headless mode
5. Copy scripts to the server

### Step 4: Import n8n Workflow

1. Open n8n at http://134.199.175.243:5678
2. Go to Workflows > Import
3. Paste contents of `n8n-workflow.json`
4. Configure Supabase credentials node
5. Activate the workflow

### Step 5: Create Test Task

Run the SQL in `test-task.sql` in Supabase to create a test task, then wait for the n8n workflow to pick it up.

## File Reference

| File | Purpose |
|------|---------|
| `README.md` | This documentation |
| `setup-headless.sh` | One-time setup script (run locally) |
| `process-task.sh` | Task processor (runs on server) |
| `n8n-workflow.json` | n8n workflow to import |
| `test-task.sql` | Test task for verification |

## Environment Details

| Component | Value |
|-----------|-------|
| Server | 134.199.175.243 (n8n-primary) |
| Claude Path | `/opt/node22/bin/claude` |
| Repo Path | `/home/user/master-ops` |
| Supabase Instance | qcvfxxsnqvdfmpbcgdni |
| n8n Port | 5678 |

## Task Processing Flow

### Task Selection

Tasks are selected in this priority order:
1. `status = 'pending'` AND `triage_status = 'triaged'`
2. `priority` (1=Urgent first)
3. `created_at` (oldest first)

### Status Updates

| Status | When |
|--------|------|
| `in_progress` | Task picked up by Claude |
| `completed` | Task finished successfully |
| `failed` | Claude returned error |
| `needs_fix` | Requires human intervention |

### Logs

All actions are logged to `task_logs` table:
- `source = 'claude_code'` for Claude actions
- `source = 'n8n'` for workflow actions
- `status` = 'info', 'success', 'warning', 'error'

## Troubleshooting

### Claude Not Authenticated

```bash
# Re-run interactive auth
ssh -t root@134.199.175.243 "/opt/node22/bin/claude"
# Login via browser, then /exit
```

### Headless Mode Timeout

Increase timeout in process-task.sh (default 5 minutes):
```bash
CLAUDE_TIMEOUT=600  # 10 minutes
```

### n8n Not Triggering

Check workflow is active:
```bash
ssh root@134.199.175.243 "docker logs n8n --tail 100"
```

### Supabase Connection Failed

Verify credentials:
```bash
cd /home/user/master-ops
node creds.js get global supabase_url
node creds.js get global supabase_service_key
```

## Security Notes

- Claude Code credentials are stored on the server
- Supabase uses service role key (full access)
- SSH key auth required for n8n to server
- No secrets stored in this repo

## Manual Task Processing

To manually process a specific task:

```bash
ssh root@134.199.175.243 "cd /home/user/master-ops && ./infra/claude-automation/process-task.sh <task-uuid>"
```

## Monitoring

Check recent task activity:

```sql
SELECT
  t.title,
  t.status,
  l.message,
  l.created_at
FROM tasks t
LEFT JOIN task_logs l ON l.task_id = t.id
WHERE l.source = 'claude_code'
ORDER BY l.created_at DESC
LIMIT 20;
```
