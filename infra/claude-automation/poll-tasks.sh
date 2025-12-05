#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# CLAUDE TASK POLLER
# Fetches pending auto tasks and processes them with intelligent model selection
# Runs via cron every 5 minutes
# ═══════════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="/var/www/master-ops"
LOG_DIR="/var/log/claude-tasks"
LOCK_FILE="/tmp/claude-task-poller.lock"
MAX_TASKS_PER_RUN=3

mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/poller-$(date +%Y-%m-%d).log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Prevent concurrent runs
if [ -f "$LOCK_FILE" ]; then
    PID=$(cat "$LOCK_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        log "Another instance is running (PID $PID). Exiting."
        exit 0
    fi
    log "Stale lock file found. Removing."
    rm -f "$LOCK_FILE"
fi

echo $$ > "$LOCK_FILE"
trap "rm -f $LOCK_FILE" EXIT

log "═══════════════════════════════════════════════════════════════"
log "Task poller started"

# Get Supabase credentials
SUPABASE_URL="https://qcvfxxsnqvdfmpbcgdni.supabase.co"
SUPABASE_KEY=$(cd "$REPO_ROOT" && node creds.js get global master_supabase_service_role_key 2>/dev/null) || true

if [ -z "$SUPABASE_KEY" ]; then
    log "ERROR: Could not retrieve Supabase service role key"
    exit 1
fi

# Fetch pending auto tasks
log "Fetching pending auto tasks..."

TASKS_RESPONSE=$(curl -s -X GET \
    "${SUPABASE_URL}/rest/v1/tasks?execution_type=eq.auto&status=eq.pending&order=priority.asc,created_at.asc&limit=${MAX_TASKS_PER_RUN}" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: application/json")

# Check for errors
if echo "$TASKS_RESPONSE" | grep -q '"error"'; then
    log "ERROR: Supabase query failed: $TASKS_RESPONSE"
    exit 1
fi

# Parse task IDs
TASK_IDS=$(echo "$TASKS_RESPONSE" | jq -r '.[].id' 2>/dev/null)

if [ -z "$TASK_IDS" ]; then
    log "No pending auto tasks found."
    log "═══════════════════════════════════════════════════════════════"
    exit 0
fi

TASK_COUNT=$(echo "$TASK_IDS" | wc -l)
log "Found $TASK_COUNT pending auto task(s)"

# Process each task
PROCESSED=0
SUCCEEDED=0
FAILED=0

for TASK_ID in $TASK_IDS; do
    log "─────────────────────────────────────────────────────────────"
    log "Processing task #$TASK_ID..."

    # Run the task processor
    if "$SCRIPT_DIR/process-task.sh" "$TASK_ID" >> "$LOG_FILE" 2>&1; then
        log "Task #$TASK_ID completed successfully"
        ((SUCCEEDED++))
    else
        log "Task #$TASK_ID failed or needs manual"
        ((FAILED++))
    fi

    ((PROCESSED++))

    # Small delay between tasks
    sleep 2
done

log "─────────────────────────────────────────────────────────────"
log "Poller complete: $PROCESSED processed, $SUCCEEDED succeeded, $FAILED failed"
log "═══════════════════════════════════════════════════════════════"

exit 0
