#!/bin/bash
#
# Deploy Database Schema to Supabase
# Executes SQL schema via Supabase SQL API
#

set -e

# Load environment variables
cd "$(dirname "$0")/.."
if [ -f ".env" ]; then
    source .env
fi

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   Database Schema Deployment                                ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

# Read the schema file
SCHEMA=$(cat database-schema.sql)

# Function to deploy schema
deploy_schema() {
    local PROJECT_NAME=$1
    local SUPABASE_URL=$2
    local SERVICE_KEY=$3

    echo -e "${BLUE}Deploying to ${PROJECT_NAME}...${NC}"

    # Extract project reference from URL
    PROJECT_REF=$(echo $SUPABASE_URL | sed 's/https:\/\/\([^.]*\).*/\1/')

    # Use Supabase Management API to execute SQL
    # Note: This requires using the SQL Editor endpoint

    echo -e "${YELLOW}⚠ Supabase requires manual SQL execution via dashboard${NC}"
    echo "Project: ${PROJECT_NAME}"
    echo "URL: https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new"
    echo ""

    return 1
}

# Deploy to Teelixir
if [ -n "$TEELIXIR_SUPABASE_URL" ] && [ -n "$TEELIXIR_SUPABASE_SERVICE_ROLE_KEY" ]; then
    deploy_schema "Teelixir" "$TEELIXIR_SUPABASE_URL" "$TEELIXIR_SUPABASE_SERVICE_ROLE_KEY"
    TEELIXIR_STATUS=$?
fi

echo ""

# Deploy to Elevate
if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    deploy_schema "Elevate" "$SUPABASE_URL" "$SUPABASE_SERVICE_ROLE_KEY"
    ELEVATE_STATUS=$?
fi

echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}MANUAL DEPLOYMENT REQUIRED${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo "Supabase does not allow programmatic SQL execution."
echo "Please execute the schema manually:"
echo ""
echo "1. Open: https://supabase.com/dashboard"
echo "2. Select each project (Teelixir & Elevate)"
echo "3. Go to: SQL Editor"
echo "4. Copy contents of: database-schema.sql"
echo "5. Paste and click 'Run'"
echo ""
