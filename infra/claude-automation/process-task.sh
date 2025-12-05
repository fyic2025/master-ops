#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# CLAUDE TASK PROCESSOR - INTELLIGENT MODEL SELECTION
# Fetches task, analyzes complexity, selects appropriate model,
# executes with fallback logic, updates result
# ═══════════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="/var/www/master-ops"
LOG_DIR="/var/log/claude-tasks"
CONFIG_FILE="$SCRIPT_DIR/model-config.json"

# ═══════════════════════════════════════════════════════════════════════════
# MODEL DEFINITIONS
# ═══════════════════════════════════════════════════════════════════════════

declare -A MODEL_NAMES
MODEL_NAMES["haiku"]="claude-3-5-haiku-20241022"
MODEL_NAMES["sonnet"]="claude-sonnet-4-20250514"
MODEL_NAMES["opus"]="claude-opus-4-20250514"

declare -A MODEL_COSTS_INPUT  # per 1M tokens
MODEL_COSTS_INPUT["haiku"]=0.80
MODEL_COSTS_INPUT["sonnet"]=3.00
MODEL_COSTS_INPUT["opus"]=15.00

declare -A MODEL_COSTS_OUTPUT  # per 1M tokens
MODEL_COSTS_OUTPUT["haiku"]=4.00
MODEL_COSTS_OUTPUT["sonnet"]=15.00
MODEL_COSTS_OUTPUT["opus"]=75.00

# Escalation path (no 2-tier jumps)
declare -A ESCALATION_PATH
ESCALATION_PATH["haiku"]="sonnet"
ESCALATION_PATH["sonnet"]="opus"
ESCALATION_PATH["opus"]="needs_manual"

TIMEOUT_SECONDS=300

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
    echo "Usage: $0 <task_id> [--dry-run] [--model <haiku|sonnet|opus>]"
    echo ""
    echo "Arguments:"
    echo "  task_id        ID of the task to process (integer or UUID)"
    echo "  --dry-run      Output prompt without executing"
    echo "  --model <m>    Force specific model (skip complexity detection)"
    echo ""
    echo "Environment:"
    echo "  DEBUG=1        Enable debug logging"
    exit 1
fi

TASK_ID="$1"
DRY_RUN=0
FORCE_MODEL=""
LOG_FILE="$LOG_DIR/task-$TASK_ID.log"

shift
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=1
            shift
            ;;
        --model)
            FORCE_MODEL="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

# Validate ID format (UUID or integer)
if ! echo "$TASK_ID" | grep -qE '^([0-9]+|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$'; then
    error_exit "Invalid task_id format. Expected integer or UUID."
fi

log_info "═══════════════════════════════════════════════════════════════"
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
    allowed_tools: task.allowed_tools || ['Bash','Read','Write','Edit','Glob','Grep'],
    model_attempts: task.model_attempts || []
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
EXISTING_ATTEMPTS=$(echo "$TASK_DATA" | jq -c '.model_attempts')

log_info "Task: $TASK_TITLE (Business: $TASK_BUSINESS, Priority: $TASK_PRIORITY)"

# ═══════════════════════════════════════════════════════════════════════════
# ANALYZE TASK COMPLEXITY
# ═══════════════════════════════════════════════════════════════════════════

analyze_complexity() {
    local text="$1"
    local text_lower=$(echo "$text" | tr '[:upper:]' '[:lower:]')
    local text_length=${#text}

    # Check for high complexity keywords first
    local high_keywords=("architect" "design system" "complex" "analyze" "optimize" "migrate" "rewrite" "overhaul" "security audit" "performance" "multi-file" "database schema")
    for keyword in "${high_keywords[@]}"; do
        if [[ "$text_lower" == *"$keyword"* ]]; then
            echo "high"
            return
        fi
    done

    # Check for medium complexity keywords
    local medium_keywords=("fix" "refactor" "implement" "build" "integrate" "modify" "debug" "add feature" "update logic" "handle error" "parse" "validate" "connect")
    for keyword in "${medium_keywords[@]}"; do
        if [[ "$text_lower" == *"$keyword"* ]]; then
            echo "medium"
            return
        fi
    done

    # Check for low complexity keywords
    local low_keywords=("create file" "update" "simple" "list" "check" "rename" "move" "copy" "delete" "add comment" "format" "lint" "run test" "echo" "log")
    for keyword in "${low_keywords[@]}"; do
        if [[ "$text_lower" == *"$keyword"* ]]; then
            echo "low"
            return
        fi
    done

    # Fall back to instruction length
    if [ "$text_length" -lt 200 ]; then
        echo "low"
    elif [ "$text_length" -lt 500 ]; then
        echo "medium"
    else
        echo "high"
    fi
}

# Determine starting model based on complexity
COMBINED_TEXT="$TASK_TITLE $TASK_DESC $TASK_INSTRUCTIONS"
COMPLEXITY=$(analyze_complexity "$COMBINED_TEXT")

if [ -n "$FORCE_MODEL" ]; then
    CURRENT_MODEL="$FORCE_MODEL"
    log_info "Forced model: $CURRENT_MODEL"
else
    case $COMPLEXITY in
        low)
            CURRENT_MODEL="haiku"
            ;;
        medium)
            CURRENT_MODEL="sonnet"
            ;;
        high)
            CURRENT_MODEL="sonnet"  # Start with Sonnet, not Opus (leave Opus for escalation)
            ;;
        *)
            CURRENT_MODEL="sonnet"
            ;;
    esac
    log_info "Detected complexity: $COMPLEXITY -> Starting model: $CURRENT_MODEL"
fi

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
    echo "Complexity: $COMPLEXITY"
    echo "Starting Model: $CURRENT_MODEL (${MODEL_NAMES[$CURRENT_MODEL]})"
    echo "Allowed Tools: $ALLOWED_TOOLS"
    echo ""
    echo "--- PROMPT ---"
    echo "$PROMPT"
    echo "--- END PROMPT ---"
    log_info "=== End Preview ==="
    exit 0
fi

# ═══════════════════════════════════════════════════════════════════════════
# UPDATE STATUS TO IN_PROGRESS
# ═══════════════════════════════════════════════════════════════════════════

log_info "Setting task status to in_progress..."

curl -s -X PATCH "${SUPABASE_URL}/rest/v1/tasks?id=eq.${TASK_ID}" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d "{\"status\": \"in_progress\", \"assigned_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"

# ═══════════════════════════════════════════════════════════════════════════
# EXECUTION FUNCTION WITH FALLBACK
# ═══════════════════════════════════════════════════════════════════════════

check_failure() {
    local result="$1"
    local is_error="$2"

    # Check explicit error flag
    if [ "$is_error" = "true" ]; then
        return 0  # true = failure
    fi

    # Check for failure keywords
    local result_lower=$(echo "$result" | tr '[:upper:]' '[:lower:]')
    local failure_keywords=("i cannot" "i'm unable" "error:" "failed to" "exception" "permission denied" "not found" "timeout")
    for keyword in "${failure_keywords[@]}"; do
        if [[ "$result_lower" == *"$keyword"* ]]; then
            return 0  # true = failure
        fi
    done

    # Check for empty response
    if [ -z "$result" ] || [ "$result" = "null" ]; then
        return 0  # true = failure
    fi

    return 1  # false = success
}

execute_with_model() {
    local model_tier="$1"
    local model_name="${MODEL_NAMES[$model_tier]}"

    log_info "Attempting execution with model: $model_tier ($model_name)"

    cd "$REPO_ROOT"

    local start_time=$(date +%s%3N)

    # Execute with timeout
    local result
    result=$(timeout ${TIMEOUT_SECONDS}s claude -p "$PROMPT" \
        --output-format json \
        --model "$model_name" \
        --allowedTools "$ALLOWED_TOOLS" \
        2>&1) || true

    local end_time=$(date +%s%3N)
    local duration_ms=$((end_time - start_time))

    # Save raw result to log
    echo "=== Model: $model_tier ===" >> "$LOG_FILE"
    echo "$result" >> "$LOG_FILE"

    # Parse result
    local is_error=$(echo "$result" | jq -r 'if .is_error == null then "true" else (.is_error | tostring) end' 2>/dev/null || echo "true")
    local result_text=$(echo "$result" | jq -r '.result // "No result returned"' 2>/dev/null || echo "$result")
    local cost_usd=$(echo "$result" | jq -r '.total_cost_usd // 0' 2>/dev/null || echo "0")
    local session_id=$(echo "$result" | jq -r '.session_id // ""' 2>/dev/null || echo "")

    # Check if task failed
    if check_failure "$result_text" "$is_error"; then
        log_info "Model $model_tier FAILED (duration: ${duration_ms}ms, cost: \$${cost_usd})"
        echo "failure|$duration_ms|$cost_usd|$session_id|$result_text"
        return 1
    else
        log_info "Model $model_tier SUCCEEDED (duration: ${duration_ms}ms, cost: \$${cost_usd})"
        echo "success|$duration_ms|$cost_usd|$session_id|$result_text"
        return 0
    fi
}

# ═══════════════════════════════════════════════════════════════════════════
# MAIN EXECUTION LOOP WITH ESCALATION
# ═══════════════════════════════════════════════════════════════════════════

FINAL_STATUS="failed"
FINAL_RESULT=""
FINAL_MODEL=""
ESCALATED=false
MODEL_ATTEMPTS_JSON="$EXISTING_ATTEMPTS"

# Start with determined model
while true; do
    log_info "─────────────────────────────────────────────────────────────"

    EXEC_OUTPUT=$(execute_with_model "$CURRENT_MODEL") || true

    # Handle empty output (command failed completely)
    if [ -z "$EXEC_OUTPUT" ]; then
        EXEC_OUTPUT="failure|0|0||Command execution failed"
    fi

    # Parse output
    IFS='|' read -r STATUS DURATION COST SESSION RESULT_TEXT <<< "$EXEC_OUTPUT"

    # Ensure numeric values have defaults
    DURATION=${DURATION:-0}
    COST=${COST:-0}

    # Validate DURATION is numeric
    if ! [[ "$DURATION" =~ ^[0-9]+$ ]]; then
        DURATION=0
    fi

    # Build attempt record
    ATTEMPT_RECORD=$(jq -n \
        --arg model "$CURRENT_MODEL" \
        --arg model_full "${MODEL_NAMES[$CURRENT_MODEL]}" \
        --argjson duration "$DURATION" \
        --arg cost "$COST" \
        --arg session "$SESSION" \
        --arg status "$STATUS" \
        --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        '{model: $model, model_full: $model_full, duration_ms: $duration, cost_usd: ($cost | tonumber), session_id: $session, status: $status, timestamp: $timestamp}')

    # Append to attempts array
    MODEL_ATTEMPTS_JSON=$(echo "$MODEL_ATTEMPTS_JSON" | jq --argjson attempt "$ATTEMPT_RECORD" '. + [$attempt]')

    if [ "$STATUS" = "success" ]; then
        FINAL_STATUS="completed"
        FINAL_RESULT="$RESULT_TEXT"
        FINAL_MODEL="$CURRENT_MODEL"
        break
    fi

    # Get next model in escalation path
    NEXT_MODEL="${ESCALATION_PATH[$CURRENT_MODEL]}"

    if [ "$NEXT_MODEL" = "needs_manual" ]; then
        log_info "All models exhausted. Task needs manual handling."
        FINAL_STATUS="needs_manual"
        FINAL_RESULT="Escalated through all models (haiku->sonnet->opus). Requires manual handling. Last error: $RESULT_TEXT"
        FINAL_MODEL="$CURRENT_MODEL"
        break
    fi

    log_info "Escalating from $CURRENT_MODEL to $NEXT_MODEL..."
    CURRENT_MODEL="$NEXT_MODEL"
    ESCALATED=true
done

# ═══════════════════════════════════════════════════════════════════════════
# UPDATE TASK WITH RESULT
# ═══════════════════════════════════════════════════════════════════════════

log_info "Updating task with result..."

# Escape result for JSON payload
ESCAPED_RESULT=$(echo "$FINAL_RESULT" | jq -Rs '.')

# Calculate total cost from all attempts
TOTAL_COST=$(echo "$MODEL_ATTEMPTS_JSON" | jq '[.[].cost_usd] | add // 0')
TOTAL_DURATION=$(echo "$MODEL_ATTEMPTS_JSON" | jq '[.[].duration_ms] | add // 0')
ATTEMPT_COUNT=$(echo "$MODEL_ATTEMPTS_JSON" | jq 'length')

curl -s -X PATCH "${SUPABASE_URL}/rest/v1/tasks?id=eq.${TASK_ID}" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d "{
        \"status\": \"$FINAL_STATUS\",
        \"completion_notes\": $ESCAPED_RESULT,
        \"completed_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
        \"model_used\": \"$FINAL_MODEL\",
        \"model_attempts\": $MODEL_ATTEMPTS_JSON,
        \"escalated\": $ESCALATED,
        \"automation_notes\": \"total_attempts: $ATTEMPT_COUNT, total_duration_ms: $TOTAL_DURATION, total_cost_usd: $TOTAL_COST, final_model: $FINAL_MODEL, escalated: $ESCALATED\"
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
        \"task_id\": $TASK_ID,
        \"source\": \"claude_automation\",
        \"status\": \"$FINAL_STATUS\",
        \"message\": \"Task $TASK_ID execution complete with model: $FINAL_MODEL\",
        \"details_json\": {
            \"model_used\": \"$FINAL_MODEL\",
            \"escalated\": $ESCALATED,
            \"attempt_count\": $ATTEMPT_COUNT,
            \"total_duration_ms\": $TOTAL_DURATION,
            \"total_cost_usd\": $TOTAL_COST,
            \"attempts\": $MODEL_ATTEMPTS_JSON,
            \"result_preview\": $(echo "$FINAL_RESULT" | head -c 500 | jq -Rs '.')
        }
    }" 2>/dev/null || log_debug "task_logs insert failed"

# ═══════════════════════════════════════════════════════════════════════════
# FINAL OUTPUT
# ═══════════════════════════════════════════════════════════════════════════

log_info "═══════════════════════════════════════════════════════════════"
log_info "Task $TASK_ID finished: $FINAL_STATUS"
log_info "  Model: $FINAL_MODEL (${MODEL_NAMES[$FINAL_MODEL]})"
log_info "  Escalated: $ESCALATED"
log_info "  Attempts: $ATTEMPT_COUNT"
log_info "  Duration: ${TOTAL_DURATION}ms"
log_info "  Cost: \$${TOTAL_COST}"
log_info "═══════════════════════════════════════════════════════════════"

# Output JSON summary
echo "{\"task_id\":\"$TASK_ID\",\"status\":\"$FINAL_STATUS\",\"model\":\"$FINAL_MODEL\",\"escalated\":$ESCALATED,\"attempts\":$ATTEMPT_COUNT,\"duration_ms\":$TOTAL_DURATION,\"cost_usd\":$TOTAL_COST}"

if [ "$FINAL_STATUS" = "completed" ]; then
    exit 0
else
    exit 1
fi
