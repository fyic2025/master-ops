#!/bin/bash
# =============================================================================
# Remote Operations Helper
# =============================================================================
# Curl-based operations for remote Claude sessions where Node.js DNS is blocked
#
# Usage:
#   ./scripts/remote-ops.sh <command> [args]
#
# Commands:
#   vault-get <business> <key>      - Get credential from vault
#   vault-list [business]           - List credentials
#   jobs-status                     - Get job health summary
#   jobs-unhealthy                  - List unhealthy jobs
#   jobs-update <job> <biz> <ok>    - Update job status
#   tlx-winback-stats               - Get winback campaign stats
#   tlx-unengaged-count             - Count unengaged profiles
#   query <table> [select] [filter] - Generic table query
#   insert <table> <json>           - Insert row
#   upsert <table> <json>           - Upsert row
# =============================================================================

SUPABASE_URL="https://usibnysqelovfuctmkqw.supabase.co"

# Load service key from environment or vault
get_service_key() {
  if [ -n "$SUPABASE_SERVICE_KEY" ]; then
    echo "$SUPABASE_SERVICE_KEY"
  else
    # Fallback: try to get from vault via curl
    local result=$(curl -s "${SUPABASE_URL}/rest/v1/secure_credentials?name=eq.supabase_service_role_key&select=encrypted_value" \
      -H "apikey: ${SUPABASE_ANON_KEY:-}" \
      -H "Authorization: Bearer ${SUPABASE_ANON_KEY:-}")
    echo "$result" | grep -o '"encrypted_value":"[^"]*"' | cut -d'"' -f4
  fi
}

# Generic Supabase REST call
supabase_call() {
  local method="$1"
  local endpoint="$2"
  local data="$3"
  local key="${SUPABASE_SERVICE_KEY:-$SUPABASE_ANON_KEY}"

  if [ -z "$key" ]; then
    echo "Error: Set SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY" >&2
    exit 1
  fi

  local curl_args=(
    -s
    -X "$method"
    "${SUPABASE_URL}/rest/v1/${endpoint}"
    -H "apikey: $key"
    -H "Authorization: Bearer $key"
    -H "Content-Type: application/json"
    -H "Prefer: return=representation"
  )

  if [ -n "$data" ]; then
    curl_args+=(-d "$data")
  fi

  curl "${curl_args[@]}"
}

# =============================================================================
# VAULT OPERATIONS
# =============================================================================

vault_get() {
  local business="$1"
  local key="$2"
  local name="${business}/${key}"

  supabase_call GET "secure_credentials?name=eq.${name}&select=name,encrypted_value"
}

vault_list() {
  local business="$1"
  if [ -n "$business" ]; then
    supabase_call GET "secure_credentials?project=eq.${business}&select=project,name&order=name"
  else
    supabase_call GET "secure_credentials?select=project,name&order=project,name"
  fi
}

# =============================================================================
# JOB MONITORING
# =============================================================================

jobs_status() {
  supabase_call GET "v_job_health_summary?select=*"
}

jobs_unhealthy() {
  supabase_call GET "v_unhealthy_jobs?select=job_name,business,status,last_success_ago,error_message&limit=20"
}

jobs_update() {
  local job_name="$1"
  local business="$2"
  local success="$3"
  local now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  local data="{\"last_run_at\":\"$now\""
  if [ "$success" = "true" ] || [ "$success" = "1" ]; then
    data+=",\"last_success_at\":\"$now\",\"status\":\"healthy\",\"error_message\":null"
  else
    data+=",\"status\":\"failed\""
  fi
  data+="}"

  local filter="job_name=eq.${job_name}"
  if [ "$business" != "null" ] && [ -n "$business" ]; then
    filter+="&business=eq.${business}"
  else
    filter+="&business=is.null"
  fi

  supabase_call PATCH "dashboard_job_status?${filter}" "$data"
}

jobs_list() {
  supabase_call GET "dashboard_job_status?select=job_name,business,status,schedule,last_run_at&order=job_name"
}

# =============================================================================
# TEELIXIR OPERATIONS
# =============================================================================

tlx_winback_stats() {
  supabase_call GET "tlx_winback_stats?select=*"
}

tlx_unengaged_count() {
  supabase_call GET "tlx_klaviyo_unengaged?select=count" | grep -o '"count":[0-9]*' | cut -d: -f2
}

tlx_automation_config() {
  supabase_call GET "tlx_automation_config?select=automation_type,enabled,last_run_at"
}

# =============================================================================
# GENERIC OPERATIONS
# =============================================================================

query_table() {
  local table="$1"
  local select="${2:-*}"
  local filter="$3"

  local endpoint="${table}?select=${select}"
  if [ -n "$filter" ]; then
    endpoint+="&${filter}"
  fi
  endpoint+="&limit=100"

  supabase_call GET "$endpoint"
}

insert_row() {
  local table="$1"
  local json="$2"
  supabase_call POST "$table" "$json"
}

upsert_row() {
  local table="$1"
  local json="$2"
  curl -s -X POST "${SUPABASE_URL}/rest/v1/${table}" \
    -H "apikey: ${SUPABASE_SERVICE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: resolution=merge-duplicates,return=representation" \
    -d "$json"
}

# =============================================================================
# MAIN
# =============================================================================

case "$1" in
  vault-get)
    vault_get "$2" "$3"
    ;;
  vault-list)
    vault_list "$2"
    ;;
  jobs-status)
    jobs_status
    ;;
  jobs-unhealthy)
    jobs_unhealthy
    ;;
  jobs-update)
    jobs_update "$2" "$3" "$4"
    ;;
  jobs-list)
    jobs_list
    ;;
  tlx-winback-stats)
    tlx_winback_stats
    ;;
  tlx-unengaged-count)
    tlx_unengaged_count
    ;;
  tlx-config)
    tlx_automation_config
    ;;
  query)
    query_table "$2" "$3" "$4"
    ;;
  insert)
    insert_row "$2" "$3"
    ;;
  upsert)
    upsert_row "$2" "$3"
    ;;
  *)
    echo "Remote Operations Helper"
    echo ""
    echo "Usage: $0 <command> [args]"
    echo ""
    echo "Vault:"
    echo "  vault-get <business> <key>  - Get credential"
    echo "  vault-list [business]       - List credentials"
    echo ""
    echo "Jobs:"
    echo "  jobs-status                 - Health summary"
    echo "  jobs-unhealthy              - List problems"
    echo "  jobs-update <job> <biz> <1|0> - Update status"
    echo "  jobs-list                   - List all jobs"
    echo ""
    echo "Teelixir:"
    echo "  tlx-winback-stats           - Campaign stats"
    echo "  tlx-unengaged-count         - Pool count"
    echo "  tlx-config                  - Automation config"
    echo ""
    echo "Generic:"
    echo "  query <table> [select] [filter]"
    echo "  insert <table> <json>"
    echo "  upsert <table> <json>"
    ;;
esac
