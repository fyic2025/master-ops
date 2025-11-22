#!/bin/bash
#
# Quick Start Workflow - First Time Setup and Audit
# This script guides you through your first agent team experience
#

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   AI Agent Team - Quick Start Workflow                      ║"
echo "║   Teelixir & Elevate Shopify Optimization                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check prerequisites
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Checking Prerequisites"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓${NC} Node.js installed: $NODE_VERSION"
else
    echo -e "${RED}✗${NC} Node.js not found. Please install Node.js 18+"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓${NC} npm installed: $NPM_VERSION"
else
    echo -e "${RED}✗${NC} npm not found"
    exit 1
fi

# Check Lighthouse CLI
if command -v lighthouse &> /dev/null; then
    echo -e "${GREEN}✓${NC} Lighthouse CLI installed"
else
    echo -e "${YELLOW}⚠${NC} Lighthouse CLI not found. Installing..."
    npm install -g lighthouse
fi

# Check Shopify CLI
if command -v shopify &> /dev/null; then
    echo -e "${GREEN}✓${NC} Shopify CLI installed"
else
    echo -e "${YELLOW}⚠${NC} Shopify CLI not found. Installing..."
    npm install -g @shopify/cli @shopify/theme
fi

echo ""

# Step 2: Install dependencies
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Installing Agent Dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$(dirname "$0")/.."
npm install

echo -e "${GREEN}✓${NC} Dependencies installed"
echo ""

# Step 3: Check environment variables
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Environment Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -z "$SUPABASE_URL" ]; then
    echo -e "${YELLOW}⚠${NC} SUPABASE_URL not set"
    read -p "Enter your Supabase URL: " SUPABASE_URL
    export SUPABASE_URL
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${YELLOW}⚠${NC} SUPABASE_SERVICE_ROLE_KEY not set"
    read -p "Enter your Supabase Service Role Key: " SUPABASE_SERVICE_ROLE_KEY
    export SUPABASE_SERVICE_ROLE_KEY
fi

echo -e "${GREEN}✓${NC} Environment configured"
echo ""

# Step 4: Run setup check
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4: Setup Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

npm run setup

echo ""

# Step 5: Select brand
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 5: Select Brand for Initial Audit"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Which brand would you like to audit?"
echo "  1) Teelixir"
echo "  2) Elevate"
echo ""
read -p "Enter choice (1 or 2): " BRAND_CHOICE

if [ "$BRAND_CHOICE" == "1" ]; then
    BRAND="teelixir"
    STORE_URL="https://teelixir-au.myshopify.com"
else
    BRAND="elevate"
    STORE_URL="https://elevate-wholesale.myshopify.com"
fi

echo ""
echo "Selected: $BRAND"
echo "Store URL: $STORE_URL"
echo ""

# Step 6: Run first Lighthouse audit
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 6: Running First Lighthouse Audit"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "This will take about 30-60 seconds..."
echo ""

npm run lighthouse:audit -- \
  --url="$STORE_URL/" \
  --brand="$BRAND" \
  --env=production \
  --device=desktop \
  --type=homepage

AUDIT_EXIT_CODE=$?

echo ""

# Step 7: Show next steps
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 7: Next Steps"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $AUDIT_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Congratulations! Your site scored 95+ across all categories."
    echo ""
    echo "Your site is already performing well! Recommended actions:"
    echo "  • Monitor daily to prevent regressions"
    echo "  • Run: npm run monitor:scores -- --brand=$BRAND"
    echo "  • Fine-tune to achieve perfect 100/100 scores"
    echo ""
else
    echo -e "${YELLOW}⚠${NC} Your site has optimization opportunities."
    echo ""
    echo "Review the audit results above and identify priorities."
    echo ""
    echo "Common first steps:"
    echo "  1. Image optimization - Convert to WebP, add lazy loading"
    echo "  2. Critical CSS - Inline above-fold styles"
    echo "  3. JavaScript optimization - Defer non-critical scripts"
    echo "  4. Font optimization - Add font-display: swap"
    echo ""
    echo "Run multi-page audit to see full picture:"
    echo "  npm run lighthouse:multi -- --brand=$BRAND"
    echo ""
fi

echo "Agent Team Commands:"
echo "  npm run lighthouse:audit     # Run single page audit"
echo "  npm run lighthouse:multi     # Run multi-page audit"
echo "  npm run lighthouse:trends    # View performance trends"
echo "  npm run monitor:scores       # View latest scores"
echo "  npm run monitor:alerts       # Check for alerts"
echo "  npm run deploy:list          # View deployment history"
echo "  npm run agent:status         # Check agent status"
echo ""
echo "Documentation:"
echo "  • Main README: ../README.md"
echo "  • Implementation Guide: ../IMPLEMENTATION_GUIDE.md"
echo "  • Quick Start: ../QUICK_START.md"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Quick start complete! Your agent team is ready."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
