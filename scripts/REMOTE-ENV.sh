#!/bin/bash
# =============================================================================
# Remote Environment Setup
# =============================================================================
# Source this file at the start of each remote session:
#   source scripts/REMOTE-ENV.sh
#
# This sets up the environment variables needed for remote-ops.sh
# =============================================================================

# Supabase Configuration
export SUPABASE_URL="https://usibnysqelovfuctmkqw.supabase.co"
export SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s"
export SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1NjY5MzcsImV4cCI6MjA2NDE0MjkzN30.lLVjbCWLpyX9VmEyXt9q-yrc4Q7KqfvH5fAEqH2Bfhc"

# Project paths
export MASTER_OPS_ROOT="${MASTER_OPS_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

# Aliases for convenience
alias ops="./scripts/remote-ops.sh"
alias jobs-status="./scripts/remote-ops.sh jobs-status"
alias jobs-unhealthy="./scripts/remote-ops.sh jobs-unhealthy"

# Confirmation
echo "✓ Remote environment loaded"
echo "  SUPABASE_URL: $SUPABASE_URL"
echo "  Service key: ...${SUPABASE_SERVICE_KEY: -10}"
echo ""
echo "Quick commands:"
echo "  ops jobs-status      - Job health summary"
echo "  ops vault-list       - List credentials"
echo "  ops tlx-config       - Teelixir automation config"
