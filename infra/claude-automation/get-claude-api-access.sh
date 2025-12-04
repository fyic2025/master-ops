#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# GET CLAUDE API ACCESS
# Outputs Supabase credentials for Claude voice/web task creation
# ═══════════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Master Supabase project (qcvfxxsnqvdfmpbcgdni)
SUPABASE_URL="https://qcvfxxsnqvdfmpbcgdni.supabase.co"

# Get service role key from vault
SUPABASE_KEY=$(cd "$REPO_ROOT" && node creds.js get global master_supabase_service_role_key 2>/dev/null)

if [ -z "$SUPABASE_KEY" ]; then
    echo "ERROR: Could not retrieve Supabase service role key" >&2
    exit 1
fi

# Output format
echo "# Claude Voice/Web API Access"
echo "# Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""
echo "SUPABASE_URL=$SUPABASE_URL"
echo "SUPABASE_KEY=$SUPABASE_KEY"
echo ""
echo "# Test connection:"
echo "# curl -s \"\${SUPABASE_URL}/rest/v1/tasks?select=count\" -H \"apikey: \${SUPABASE_KEY}\" -H \"Authorization: Bearer \${SUPABASE_KEY}\""
