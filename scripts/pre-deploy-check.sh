#!/bin/bash
# Pre-Deployment Check for Smartlead Integration
# Quick validation before deploying to n8n

echo "🔍 Smartlead Integration Pre-Deployment Check"
echo "============================================================"
echo ""

ERRORS=0
WARNINGS=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check environment variables
check_env() {
    local var_name=$1
    if [ -z "${!var_name}" ]; then
        echo -e "${RED}❌${NC} $var_name: Missing"
        ((ERRORS++))
    else
        echo -e "${GREEN}✅${NC} $var_name: Present"
    fi
}

# Function to check file exists
check_file() {
    local file_path=$1
    local file_desc=$2
    if [ -f "$file_path" ]; then
        echo -e "${GREEN}✅${NC} $file_desc: Found"
    else
        echo -e "${RED}❌${NC} $file_desc: Not found"
        ((ERRORS++))
    fi
}

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
    echo -e "${GREEN}✅${NC} .env file loaded"
else
    echo -e "${RED}❌${NC} .env file not found"
    ((ERRORS++))
fi

echo ""
echo "📋 Environment Variables"
echo "────────────────────────────────────────────────────────────"
check_env "SMARTLEAD_API_KEY"
check_env "HUBSPOT_ACCESS_TOKEN"
check_env "SUPABASE_URL"
check_env "SUPABASE_SERVICE_ROLE_KEY"

echo ""
echo "📁 Workflow Files"
echo "────────────────────────────────────────────────────────────"
check_file "infra/n8n-workflows/templates/smartlead-hubspot-sync-FIXED.json" "Fixed Workflow"
check_file "infra/n8n-workflows/templates/smartlead-hubspot-sync.json" "Original Workflow (backup)"

echo ""
echo "📚 Documentation Files"
echo "────────────────────────────────────────────────────────────"
check_file "DEPLOY-FIXED-WORKFLOW.md" "Deployment Guide"
check_file "COUNTER-FIX-SUMMARY.md" "Fix Summary"
check_file "SMARTLEAD-METRICS-ANALYSIS.md" "Metrics Analysis"
check_file "SMARTLEAD-VALIDATION-REPORT.md" "Validation Report"

echo ""
echo "🔧 Supporting Files"
echo "────────────────────────────────────────────────────────────"
check_file "scripts/setup-smartlead-properties.ts" "HubSpot Properties Script"
check_file "infra/supabase/schema-smartlead-tracking.sql" "Supabase Schema"
check_file "shared/libs/integrations/smartlead/client.ts" "Smartlead Client"
check_file "shared/libs/integrations/smartlead/types.ts" "Smartlead Types"

echo ""
echo "🧪 Test API Connection"
echo "────────────────────────────────────────────────────────────"

# Test Smartlead API
if [ ! -z "$SMARTLEAD_API_KEY" ]; then
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
        "https://server.smartlead.ai/api/v1/campaigns?api_key=$SMARTLEAD_API_KEY")

    if [ "$RESPONSE" = "200" ]; then
        # Get campaign count
        CAMPAIGN_COUNT=$(curl -s "https://server.smartlead.ai/api/v1/campaigns?api_key=$SMARTLEAD_API_KEY" | jq '. | length')
        echo -e "${GREEN}✅${NC} Smartlead API: Connected ($CAMPAIGN_COUNT campaigns)"
    else
        echo -e "${RED}❌${NC} Smartlead API: Failed (HTTP $RESPONSE)"
        ((ERRORS++))
    fi
else
    echo -e "${YELLOW}⚠️${NC}  Smartlead API: Skipped (no API key)"
    ((WARNINGS++))
fi

echo ""
echo "📊 Workflow Validation"
echo "────────────────────────────────────────────────────────────"

# Validate workflow JSON
if [ -f "infra/n8n-workflows/templates/smartlead-hubspot-sync-FIXED.json" ]; then
    NODE_COUNT=$(cat infra/n8n-workflows/templates/smartlead-hubspot-sync-FIXED.json | jq '.nodes | length')
    CONN_COUNT=$(cat infra/n8n-workflows/templates/smartlead-hubspot-sync-FIXED.json | jq '.connections | length')

    if [ "$NODE_COUNT" -ge 17 ] && [ "$CONN_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✅${NC} Workflow: Valid ($NODE_COUNT nodes, $CONN_COUNT connections)"
    else
        echo -e "${YELLOW}⚠️${NC}  Workflow: May be incomplete ($NODE_COUNT nodes)"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}❌${NC} Workflow: File not found"
    ((ERRORS++))
fi

echo ""
echo "============================================================"
echo "📋 SUMMARY"
echo "============================================================"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED${NC}"
    echo ""
    echo "🚀 Ready to deploy!"
    echo ""
    echo "Next Steps:"
    echo "  1. Read: DEPLOY-FIXED-WORKFLOW.md"
    echo "  2. Import workflow to n8n"
    echo "  3. Configure credentials"
    echo "  4. Test with sample webhook"
    echo "  5. Activate workflow"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  PASSED WITH $WARNINGS WARNING(S)${NC}"
    echo ""
    echo "✅ Safe to proceed, but review warnings above."
    exit 0
else
    echo -e "${RED}❌ FAILED: $ERRORS ERROR(S), $WARNINGS WARNING(S)${NC}"
    echo ""
    echo "🔧 Fix the errors above before deploying."
    exit 1
fi
