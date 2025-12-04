#!/bin/bash
# ============================================================================
# Claude Code Task Processor
# ============================================================================
# Processes a single task from Supabase using Claude Code headless mode.
#
# Usage: ./process-task.sh <task-uuid>
#
# This script:
# 1. Fetches task details from Supabase
# 2. Updates status to 'in_progress'
# 3. Runs Claude Code headless with the task instructions
# 4. Updates Supabase with results
# 5. Logs all actions to task_logs
# ============================================================================

set -e

# Configuration
CLAUDE_PATH="/opt/node22/bin/claude"
REPO_PATH="/home/user/master-ops"
SUPABASE_INSTANCE="qcvfxxsnqvdfmpbcgdni"
CLAUDE_TIMEOUT=300  # 5 minutes

# Change to repo directory
cd "$REPO_PATH"

# Validate input
TASK_ID="$1"
if [[ -z "$TASK_ID" ]]; then
    echo "ERROR: Task ID required"
    echo "Usage: $0 <task-uuid>"
    exit 1
fi

# Validate UUID format
if ! [[ "$TASK_ID" =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; then
    echo "ERROR: Invalid UUID format: $TASK_ID"
    exit 1
fi

echo "Processing task: $TASK_ID"
echo "Timestamp: $(date -Iseconds)"

# Get Supabase credentials
SUPABASE_URL=$(node -e "require('./creds.js').get('global', 'supabase_url').then(v => console.log(v))")
SUPABASE_KEY=$(node -e "require('./creds.js').get('global', 'supabase_service_key').then(v => console.log(v))")

if [[ -z "$SUPABASE_URL" ]] || [[ -z "$SUPABASE_KEY" ]]; then
    echo "ERROR: Supabase credentials not configured"
    echo "Run: node creds.js set global supabase_url <url>"
    echo "Run: node creds.js set global supabase_service_key <key>"
    exit 1
fi

# Function to call Supabase REST API
supabase_request() {
    local method="$1"
    local endpoint="$2"
    local data="$3"

    curl -s -X "$method" \
        "${SUPABASE_URL}/rest/v1/${endpoint}" \
        -H "apikey: ${SUPABASE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_KEY}" \
        -H "Content-Type: application/json" \
        -H "Prefer: return=representation" \
        ${data:+-d "$data"}
}

# Function to log to task_logs
log_task() {
    local status="$1"
    local message="$2"
    local details="$3"

    local log_data=$(cat <<EOF
{
    "task_id": "$TASK_ID",
    "source": "claude_code",
    "status": "$status",
    "message": "$message"
    ${details:+,"details_json": $details}
}
EOF
)
    supabase_request "POST" "task_logs" "$log_data" > /dev/null
}

# Fetch task details
echo "Fetching task..."
TASK_JSON=$(supabase_request "GET" "tasks?id=eq.${TASK_ID}&select=*")

# Validate task exists
if [[ "$TASK_JSON" == "[]" ]]; then
    echo "ERROR: Task not found: $TASK_ID"
    exit 1
fi

# Parse task fields
TASK_TITLE=$(echo "$TASK_JSON" | node -e "const t=JSON.parse(require('fs').readFileSync(0,'utf8'))[0]; console.log(t.title||'')")
TASK_DESC=$(echo "$TASK_JSON" | node -e "const t=JSON.parse(require('fs').readFileSync(0,'utf8'))[0]; console.log(t.description||'')")
TASK_INSTRUCTIONS=$(echo "$TASK_JSON" | node -e "const t=JSON.parse(require('fs').readFileSync(0,'utf8'))[0]; console.log(t.instructions||'')")
TASK_BUSINESS=$(echo "$TASK_JSON" | node -e "const t=JSON.parse(require('fs').readFileSync(0,'utf8'))[0]; console.log(t.business||'')")
TASK_CATEGORY=$(echo "$TASK_JSON" | node -e "const t=JSON.parse(require('fs').readFileSync(0,'utf8'))[0]; console.log(t.category||'')")
TASK_REPAIR=$(echo "$TASK_JSON" | node -e "const t=JSON.parse(require('fs').readFileSync(0,'utf8'))[0]; console.log(t.repair_instruction||'')")
TASK_STATUS=$(echo "$TASK_JSON" | node -e "const t=JSON.parse(require('fs').readFileSync(0,'utf8'))[0]; console.log(t.status||'')")
RETRY_COUNT=$(echo "$TASK_JSON" | node -e "const t=JSON.parse(require('fs').readFileSync(0,'utf8'))[0]; console.log(t.retry_count||0)")

echo "Task: $TASK_TITLE"
echo "Status: $TASK_STATUS"
echo "Business: $TASK_BUSINESS"
echo "Category: $TASK_CATEGORY"

# Skip if not actionable
if [[ "$TASK_STATUS" != "pending" ]] && [[ "$TASK_STATUS" != "needs_fix" ]]; then
    echo "Skipping: Task status is '$TASK_STATUS', not actionable"
    exit 0
fi

# Update status to in_progress
echo "Updating status to in_progress..."
supabase_request "PATCH" "tasks?id=eq.${TASK_ID}" '{"status": "in_progress"}' > /dev/null
log_task "info" "Task processing started by Claude Code"

# Build the prompt for Claude
PROMPT="You are processing a task from the task management system.

TASK ID: $TASK_ID
TITLE: $TASK_TITLE
BUSINESS: ${TASK_BUSINESS:-overall}
CATEGORY: ${TASK_CATEGORY:-general}

DESCRIPTION:
${TASK_DESC:-No description provided}

INSTRUCTIONS:
${TASK_INSTRUCTIONS:-Complete the task as described}

${TASK_REPAIR:+REPAIR INSTRUCTIONS (from previous failure):
$TASK_REPAIR}

IMPORTANT:
- Work in the /home/user/master-ops repository
- Make changes, commit with descriptive messages
- Do NOT push to remote unless explicitly asked
- If you need clarification, respond with NEEDS_CLARIFICATION: <your question>
- If task cannot be completed, respond with BLOCKED: <reason>
- When done, respond with COMPLETED: <summary of what was done>

Begin processing this task now."

# Run Claude Code headless
echo "Running Claude Code headless..."
echo "Timeout: ${CLAUDE_TIMEOUT}s"

TEMP_OUTPUT=$(mktemp)
TEMP_ERROR=$(mktemp)

START_TIME=$(date +%s)

# Run Claude with timeout
set +e
timeout "$CLAUDE_TIMEOUT" "$CLAUDE_PATH" \
    -p "$PROMPT" \
    --output-format json \
    --max-turns 50 \
    > "$TEMP_OUTPUT" 2> "$TEMP_ERROR"
CLAUDE_EXIT_CODE=$?
set -e

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "Claude exited with code: $CLAUDE_EXIT_CODE"
echo "Duration: ${DURATION}s"

# Read output
CLAUDE_OUTPUT=$(cat "$TEMP_OUTPUT")
CLAUDE_ERROR=$(cat "$TEMP_ERROR")

# Clean up temp files
rm -f "$TEMP_OUTPUT" "$TEMP_ERROR"

# Parse Claude response
if [[ $CLAUDE_EXIT_CODE -eq 124 ]]; then
    # Timeout
    echo "ERROR: Claude timed out after ${CLAUDE_TIMEOUT}s"
    NEW_STATUS="failed"
    RESULT_MESSAGE="Task timed out after ${DURATION}s"
    log_task "error" "$RESULT_MESSAGE" '{"timeout": true, "duration_seconds": '"$DURATION"'}'

elif [[ $CLAUDE_EXIT_CODE -ne 0 ]]; then
    # Error
    echo "ERROR: Claude failed with exit code $CLAUDE_EXIT_CODE"
    NEW_STATUS="failed"
    RESULT_MESSAGE="Claude exited with code $CLAUDE_EXIT_CODE"
    log_task "error" "$RESULT_MESSAGE" "{\"exit_code\": $CLAUDE_EXIT_CODE, \"stderr\": $(echo "$CLAUDE_ERROR" | head -c 1000 | node -e "console.log(JSON.stringify(require('fs').readFileSync(0,'utf8')))")}"

else
    # Success - parse JSON output
    IS_ERROR=$(echo "$CLAUDE_OUTPUT" | node -e "try { const j=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(j.is_error || false) } catch(e) { console.log('parse_error') }")
    RESULT_TEXT=$(echo "$CLAUDE_OUTPUT" | node -e "try { const j=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(j.result || '') } catch(e) { console.log('') }")
    COST_USD=$(echo "$CLAUDE_OUTPUT" | node -e "try { const j=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(j.cost_usd || 0) } catch(e) { console.log(0) }")
    NUM_TURNS=$(echo "$CLAUDE_OUTPUT" | node -e "try { const j=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(j.num_turns || 0) } catch(e) { console.log(0) }")

    if [[ "$IS_ERROR" == "true" ]]; then
        echo "Claude reported error"
        NEW_STATUS="failed"
        RESULT_MESSAGE="Claude reported an error: ${RESULT_TEXT:0:500}"
        log_task "error" "$RESULT_MESSAGE" "{\"cost_usd\": $COST_USD, \"num_turns\": $NUM_TURNS}"

    elif echo "$RESULT_TEXT" | grep -qi "NEEDS_CLARIFICATION"; then
        echo "Task needs clarification"
        NEW_STATUS="awaiting_clarification"
        CLARIFICATION=$(echo "$RESULT_TEXT" | grep -oP "NEEDS_CLARIFICATION:\s*\K.*" || echo "$RESULT_TEXT")
        RESULT_MESSAGE="Clarification needed: ${CLARIFICATION:0:500}"
        log_task "warning" "$RESULT_MESSAGE" "{\"cost_usd\": $COST_USD, \"num_turns\": $NUM_TURNS}"

        # Update clarification_request field
        CLARIFICATION_JSON=$(echo "$CLARIFICATION" | node -e "console.log(JSON.stringify(require('fs').readFileSync(0,'utf8').trim()))")
        supabase_request "PATCH" "tasks?id=eq.${TASK_ID}" "{\"clarification_request\": $CLARIFICATION_JSON}" > /dev/null

    elif echo "$RESULT_TEXT" | grep -qi "BLOCKED"; then
        echo "Task is blocked"
        NEW_STATUS="blocked"
        BLOCKED_REASON=$(echo "$RESULT_TEXT" | grep -oP "BLOCKED:\s*\K.*" || echo "$RESULT_TEXT")
        RESULT_MESSAGE="Task blocked: ${BLOCKED_REASON:0:500}"
        log_task "warning" "$RESULT_MESSAGE" "{\"cost_usd\": $COST_USD, \"num_turns\": $NUM_TURNS}"

    elif echo "$RESULT_TEXT" | grep -qi "COMPLETED"; then
        echo "Task completed successfully"
        NEW_STATUS="completed"
        COMPLETION_SUMMARY=$(echo "$RESULT_TEXT" | grep -oP "COMPLETED:\s*\K.*" || echo "$RESULT_TEXT")
        RESULT_MESSAGE="Task completed: ${COMPLETION_SUMMARY:0:500}"
        log_task "success" "$RESULT_MESSAGE" "{\"cost_usd\": $COST_USD, \"num_turns\": $NUM_TURNS, \"duration_seconds\": $DURATION}"

    else
        # No clear status marker - assume completed
        echo "Task finished (no status marker)"
        NEW_STATUS="completed"
        RESULT_MESSAGE="Task finished: ${RESULT_TEXT:0:500}"
        log_task "success" "$RESULT_MESSAGE" "{\"cost_usd\": $COST_USD, \"num_turns\": $NUM_TURNS, \"duration_seconds\": $DURATION}"
    fi
fi

# Update task status
echo "Updating task status to: $NEW_STATUS"

# Increment retry count if failed
if [[ "$NEW_STATUS" == "failed" ]]; then
    NEW_RETRY_COUNT=$((RETRY_COUNT + 1))
    supabase_request "PATCH" "tasks?id=eq.${TASK_ID}" "{\"status\": \"$NEW_STATUS\", \"retry_count\": $NEW_RETRY_COUNT}" > /dev/null
else
    supabase_request "PATCH" "tasks?id=eq.${TASK_ID}" "{\"status\": \"$NEW_STATUS\"}" > /dev/null
fi

echo ""
echo "============================================"
echo "Task processing complete"
echo "============================================"
echo "Task ID: $TASK_ID"
echo "Final Status: $NEW_STATUS"
echo "Duration: ${DURATION}s"
echo "Result: $RESULT_MESSAGE"
echo ""

# Exit with appropriate code
if [[ "$NEW_STATUS" == "completed" ]]; then
    exit 0
elif [[ "$NEW_STATUS" == "awaiting_clarification" ]]; then
    exit 0  # Not an error, just needs input
else
    exit 1
fi
