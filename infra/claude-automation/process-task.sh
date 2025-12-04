#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# CLAUDE TASK PROCESSOR
# Fetches task from Supabase, executes with Claude Code headless, updates result
# ═══════════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="/var/www/master-ops"
LOG_DIR="/var/log/claude-tasks"

# ═══════════════════════════════════════════════════════════════════════════
# ERROR HANDLING & LOGGING
# ═══════════════════════════════════════════════════════════════════════════

mkdir -p "$LOG_DIR"

error_exit() {
    echo "[ERROR] $1" >&2
    exit 1
}

log_info() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $1" | tee -a "$LOG_FILE"
}

log_debug() {
    if [ "$DEBUG" = "1" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] [DEBUG] $1" | tee -a "$LOG_FILE"
    fi
}

# ═══════════════════════════════════════════════════════════════════════════
# ARGUMENT VALIDATION
# ═══════════════════════════════════════════════════════════════════════════

if [ -z "$1" ]; then
    echo "Usage: $0 <task_id> [--dry-run]"
    echo ""
    echo "Arguments:"
    echo "  task_id     UUID of the task to process"
    echo "  --dry-run   Output prompt without executing"
    echo ""
    echo "Environment:"
    echo "  DEBUG=1     Enable debug logging"
    exit 1
fi

TASK_ID="$1"
DRY_RUN=0
LOG_FILE="$LOG_DIR/task-$TASK_ID.log"

if [ "$2" = "--dry-run" ]; then
    DRY_RUN=1
fi

# Validate UUID format
if ! echo "$TASK_ID" | grep -qE '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'; then
    error_exit "Invalid task_id format. Expected UUID."
fi

log_info "Starting task processing: $TASK_ID"

# ═══════════════════════════════════════════════════════════════════════════
# FETCH SUPABASE CREDENTIALS
# ═══════════════════════════════════════════════════════════════════════════

SUPABASE_URL="https://qcvfxxsnqvdfmpbcgdni.supabase.co"
SUPABASE_KEY=$(cd "$REPO_ROOT" && node creds.js get global master_supabase_service_role_key 2>/dev/null) || true

if [ -z "$SUPABASE_KEY" ]; then
    error_exit "Could not retrieve Supabase service role key"
fi

log_debug "Supabase credentials loaded"

# ═══════════════════════════════════════════════════════════════════════════
# FETCH TASK FROM SUPABASE
# ═══════════════════════════════════════════════════════════════════════════

log_info "Fetching task from Supabase..."

TASK_RESPONSE=$(curl -s -X GET \
    "${SUPABASE_URL}/rest/v1/tasks?id=eq.${TASK_ID}&select=*" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: application/json")

if [ "$TASK_RESPONSE" = "[]" ]; then
    error_exit "Task not found: $TASK_ID"
fi

if echo "$TASK_RESPONSE" | grep -q '"error"'; then
    error_exit "Supabase error: $TASK_RESPONSE"
fi

log_debug "Raw response: $TASK_RESPONSE"

# ═══════════════════════════════════════════════════════════════════════════
# PARSE TASK FIELDS
# ═══════════════════════════════════════════════════════════════════════════

TASK_DATA=$(node -e "
const task = JSON.parse(process.argv[1])[0];
if (!task) process.exit(1);
console.log(JSON.stringify({
    title: task.title || 'Untitled',
    description: task.description || '',
    instructions: task.instructions || '',
    business: task.business || 'general',
    priority: task.priority || 'normal',
    context: task.context || '',
    skills: task.skills || [],
    allowed_tools: task.allowed_tools || ['Bash','Read','Write','Edit','Glob','Grep']
}));
" "$TASK_RESPONSE" 2>/dev/null)

if [ -z "$TASK_DATA" ]; then
    error_exit "Failed to parse task data"
fi

TASK_TITLE=$(echo "$TASK_DATA" | jq -r '.title')
TASK_DESC=$(echo "$TASK_DATA" | jq -r '.description')
TASK_INSTRUCTIONS=$(echo "$TASK_DATA" | jq -r '.instructions')
TASK_BUSINESS=$(echo "$TASK_DATA" | jq -r '.business')
TASK_PRIORITY=$(echo "$TASK_DATA" | jq -r '.priority')
TASK_CONTEXT=$(echo "$TASK_DATA" | jq -r '.context')
ALLOWED_TOOLS=$(echo "$TASK_DATA" | jq -r '.allowed_tools | join(",")')

log_info "Task: $TASK_TITLE (Business: $TASK_BUSINESS, Priority: $TASK_PRIORITY)"

# ═══════════════════════════════════════════════════════════════════════════
# UPDATE STATUS TO IN_PROGRESS
# ═══════════════════════════════════════════════════════════════════════════

log_info "Setting task status to in_progress..."

curl -s -X PATCH "${SUPABASE_URL}/rest/v1/tasks?id=eq.${TASK_ID}" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d "{\"status\": \"in_progress\", \"started_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"

# ═══════════════════════════════════════════════════════════════════════════
# CONSTRUCT PROMPT
# ═══════════════════════════════════════════════════════════════════════════

PROMPT="You are working on the master-ops codebase at $REPO_ROOT.

# Task: ${TASK_TITLE}

## Task ID
${TASK_ID}

## Business Context
${TASK_BUSINESS}

## Priority
${TASK_PRIORITY}

## Description
${TASK_DESC}

## Instructions
${TASK_INSTRUCTIONS}

## Additional Context
${TASK_CONTEXT}

---

**REQUIREMENTS**:
1. Complete this task according to the instructions above
2. Check CLAUDE.md for applicable skills and use them if relevant
3. Report exactly what actions you took
4. Note any issues or blockers encountered
5. Provide a clear summary of the outcome

Execute this task now."

# ═══════════════════════════════════════════════════════════════════════════
# DRY RUN CHECK
# ═══════════════════════════════════════════════════════════════════════════

if [ "$DRY_RUN" = "1" ]; then
    log_info "=== DRY RUN - Prompt Preview ==="
    echo ""
    echo "$PROMPT"
    echo ""
    echo "Allowed Tools: $ALLOWED_TOOLS"
    log_info "=== End Preview ==="
    exit 0
fi

# ═══════════════════════════════════════════════════════════════════════════
# EXECUTE WITH CLAUDE CODE HEADLESS
# ═══════════════════════════════════════════════════════════════════════════

log_info "Executing with Claude Code headless..."

cd "$REPO_ROOT"

RESULT=$(claude -p "$PROMPT" \
    --output-format json \
    --allowedTools "$ALLOWED_TOOLS" \
    2>&1) || true

# Save raw result to log
echo "$RESULT" >> "$LOG_FILE"

# ═══════════════════════════════════════════════════════════════════════════
# PARSE RESULT
# ═══════════════════════════════════════════════════════════════════════════

IS_ERROR=$(echo "$RESULT" | jq -r '.is_error // true')
RESULT_TEXT=$(echo "$RESULT" | jq -r '.result // "No result returned"')
DURATION_MS=$(echo "$RESULT" | jq -r '.duration_ms // 0')
COST_USD=$(echo "$RESULT" | jq -r '.total_cost_usd // 0')
SESSION_ID=$(echo "$RESULT" | jq -r '.session_id // ""')

if [ "$IS_ERROR" = "false" ]; then
    STATUS="completed"
    log_info "Task completed successfully"
else
    STATUS="failed"
    log_info "Task failed"
fi

# Escape result for JSON payload
ESCAPED_RESULT=$(echo "$RESULT_TEXT" | jq -Rs '.')

# ═══════════════════════════════════════════════════════════════════════════
# UPDATE TASK WITH RESULT
# ═══════════════════════════════════════════════════════════════════════════

log_info "Updating task with result..."

curl -s -X PATCH "${SUPABASE_URL}/rest/v1/tasks?id=eq.${TASK_ID}" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d "{
        \"status\": \"$STATUS\",
        \"supervisor_summary\": $ESCAPED_RESULT,
        \"completed_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
        \"execution_time_ms\": $DURATION_MS,
        \"cost_usd\": $COST_USD,
        \"session_id\": \"$SESSION_ID\"
    }"

# ═══════════════════════════════════════════════════════════════════════════
# LOG EXECUTION TO TASK_LOGS
# ═══════════════════════════════════════════════════════════════════════════

log_info "Logging execution..."

curl -s -X POST "${SUPABASE_URL}/rest/v1/task_logs" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d "{
        \"task_id\": \"$TASK_ID\",
        \"event\": \"execution_complete\",
        \"status\": \"$STATUS\",
        \"session_id\": \"$SESSION_ID\",
        \"duration_ms\": $DURATION_MS,
        \"cost_usd\": $COST_USD,
        \"output\": $ESCAPED_RESULT,
        \"created_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
    }" 2>/dev/null || log_debug "task_logs table may not exist yet"

# ═══════════════════════════════════════════════════════════════════════════
# FINAL OUTPUT
# ═══════════════════════════════════════════════════════════════════════════

log_info "Task $TASK_ID finished: $STATUS (${DURATION_MS}ms, \$${COST_USD})"

# Output JSON summary
echo "{\"task_id\":\"$TASK_ID\",\"status\":\"$STATUS\",\"duration_ms\":$DURATION_MS,\"cost_usd\":$COST_USD}"

if [ "$STATUS" = "completed" ]; then
    exit 0
else
    exit 1
fi
