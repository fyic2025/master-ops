#!/bin/bash
#
# Complete Setup Script
# Automated installation and configuration of AI Agent Team
#

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   AI Agent Team - Complete Setup                            ║"
echo "║   Automated Installation & Configuration                    ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

# Change to agents directory
cd "$(dirname "$0")/.."

# Step 1: Check Node.js
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Step 1: Checking Prerequisites${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓${NC} Node.js installed: $NODE_VERSION"
else
    echo -e "${RED}✗${NC} Node.js not found"
    echo "Please install Node.js 18+ from: https://nodejs.org/"
    exit 1
fi

# Step 2: Install global tools
echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Step 2: Installing Global Tools${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"

if ! command -v lighthouse &> /dev/null; then
    echo "Installing Lighthouse CLI..."
    npm install -g lighthouse
    echo -e "${GREEN}✓${NC} Lighthouse CLI installed"
else
    echo -e "${GREEN}✓${NC} Lighthouse CLI already installed"
fi

if ! command -v shopify &> /dev/null; then
    echo "Installing Shopify CLI..."
    npm install -g @shopify/cli @shopify/theme
    echo -e "${GREEN}✓${NC} Shopify CLI installed"
else
    echo -e "${GREEN}✓${NC} Shopify CLI already installed"
fi

# Step 3: Install dependencies
echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Step 3: Installing Agent Dependencies${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"

npm install
echo -e "${GREEN}✓${NC} Dependencies installed\n"

# Step 4: Setup environment
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Step 4: Environment Configuration${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"

if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo -e "${YELLOW}⚠${NC}  Please edit .env file with your Supabase credentials"
    echo ""
    echo "Required values:"
    echo "  - SUPABASE_URL"
    echo "  - SUPABASE_SERVICE_ROLE_KEY"
    echo ""
    echo "Get these from: https://supabase.com/dashboard"
    echo ""
    read -p "Press Enter after you've updated .env file..."
else
    echo -e "${GREEN}✓${NC} .env file already exists"
fi

# Step 5: Create directories
echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Step 5: Creating Directories${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"

mkdir -p reports
mkdir -p logs
mkdir -p tmp

echo -e "${GREEN}✓${NC} Directories created\n"

# Step 6: Verify setup
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Step 6: Verifying Setup${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"

# Source .env if it exists
if [ -f ".env" ]; then
    source .env
fi

# Check environment variables
SETUP_OK=true

if [ -z "$SUPABASE_URL" ]; then
    echo -e "${RED}✗${NC} SUPABASE_URL not set"
    SETUP_OK=false
else
    echo -e "${GREEN}✓${NC} SUPABASE_URL configured"
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}✗${NC} SUPABASE_SERVICE_ROLE_KEY not set"
    SETUP_OK=false
else
    echo -e "${GREEN}✓${NC} SUPABASE_SERVICE_ROLE_KEY configured"
fi

echo ""

if [ "$SETUP_OK" = false ]; then
    echo -e "${YELLOW}⚠${NC}  Setup incomplete. Please configure .env file."
    exit 1
fi

# Step 7: Database check
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Step 7: Database Setup${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"

echo "Database schema location: database-schema.sql"
echo ""
echo "To setup your database:"
echo "  1. Open https://supabase.com/dashboard"
echo "  2. Select your project"
echo "  3. Go to SQL Editor"
echo "  4. Copy contents of database-schema.sql"
echo "  5. Paste and execute"
echo ""
read -p "Have you run the database schema? (y/n): " DB_SETUP

if [ "$DB_SETUP" != "y" ]; then
    echo -e "${YELLOW}⚠${NC}  Please setup database before continuing"
    echo "Run: cat database-schema.sql"
    exit 1
fi

echo -e "${GREEN}✓${NC} Database setup confirmed\n"

# Step 8: Shopify authentication
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Step 8: Shopify Authentication${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"

read -p "Authenticate with Shopify now? (y/n): " SHOPIFY_AUTH

if [ "$SHOPIFY_AUTH" = "y" ]; then
    shopify auth login
    echo -e "${GREEN}✓${NC} Shopify authenticated"
else
    echo -e "${YELLOW}⚠${NC}  Remember to run: shopify auth login"
fi

# Final summary
echo -e "\n╔══════════════════════════════════════════════════════════════╗"
echo -e "║   ${GREEN}Setup Complete!${NC}                                          ║"
echo "╚══════════════════════════════════════════════════════════════╝\n"

echo "Your AI Agent Team is ready to use!"
echo ""
echo "Quick commands:"
echo "  npm run agent:status          # Check agent status"
echo "  npm run lighthouse:audit      # Run single audit"
echo "  npm run lighthouse:multi      # Run multi-page audit"
echo "  npm run monitor:scores        # View latest scores"
echo ""
echo "Next steps:"
echo "  1. Run baseline audit: npm run baseline -- teelixir"
echo "  2. Review documentation: cat README.md"
echo "  3. Start optimizations: cat IMPLEMENTATION_GUIDE.md"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
