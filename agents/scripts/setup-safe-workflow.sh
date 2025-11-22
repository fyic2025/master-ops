#!/bin/bash
#
# Safe Workflow Setup Script
# Creates git backup and development environment
#

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   Safe Optimization Workflow Setup                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

# Step 1: Authenticate with Shopify
echo -e "${BLUE}Step 1: Shopify Authentication${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"

shopify auth status 2>/dev/null || {
    echo -e "${YELLOW}⚠ Not authenticated. Logging in...${NC}"
    shopify auth login
}

echo -e "${GREEN}✓${NC} Authenticated with Shopify\n"

# Step 2: Download live theme
echo -e "${BLUE}Step 2: Download Live Theme (Backup)${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"

cd /root/master-ops/teelixir

echo "Downloading current live theme from teelixir-au.myshopify.com..."
shopify theme pull --store=teelixir-au.myshopify.com

echo -e "${GREEN}✓${NC} Live theme downloaded\n"

# Step 3: Initialize Git
echo -e "${BLUE}Step 3: Initialize Version Control${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"

if [ ! -d ".git" ]; then
    git init
    echo -e "${GREEN}✓${NC} Git repository initialized"
else
    echo -e "${YELLOW}⚠${NC} Git already initialized"
fi

# Create .gitignore
cat > .gitignore <<EOF
# Shopify
config/settings_data.json
.shopify

# Node
node_modules/
npm-debug.log*
package-lock.json

# Logs
logs/
*.log

# OS
.DS_Store
Thumbs.db
*.swp

# IDE
.vscode/
.idea/
*.sublime-*

# Environment
.env
.env.local

# Build
dist/
build/
EOF

echo -e "${GREEN}✓${NC} .gitignore created\n"

# Step 4: Initial commit (BACKUP)
echo -e "${BLUE}Step 4: Create Safety Backup Commit${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"

git add .
git commit -m "Initial commit - Live theme backup before optimization

Baseline Lighthouse Scores (from audit):
- Desktop Performance: 70/100
- Mobile Performance: 32/100
- Accessibility: 89/100
- Best Practices: 56/100
- SEO: 86/100

Critical Issues:
- Mobile LCP: 9.99s - 13.75s (target: <2.5s)
- Mobile TTI: 30.6s - 33s (target: <3.5s)
- Best Practices consistently low (56-57)

This is the safe fallback point.
DO NOT MODIFY - This is production baseline." || echo "Already committed"

# Create baseline tag
git tag -a v1.0-baseline -m "Production baseline - Safe rollback point" 2>/dev/null || {
    echo -e "${YELLOW}⚠${NC} Tag already exists"
}

echo -e "${GREEN}✓${NC} Safety backup created with tag: v1.0-baseline\n"

# Step 5: Create development branch
echo -e "${BLUE}Step 5: Create Development Branch${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"

git checkout -b optimize/phase1-images 2>/dev/null || {
    echo -e "${YELLOW}⚠${NC} Branch already exists, switching to it"
    git checkout optimize/phase1-images
}

echo -e "${GREEN}✓${NC} Development branch created: optimize/phase1-images\n"

# Summary
echo -e "\n╔══════════════════════════════════════════════════════════════╗"
echo -e "║   ${GREEN}Setup Complete!${NC}                                          ║"
echo "╚══════════════════════════════════════════════════════════════╝\n"

echo "Your theme is now safely backed up in git!"
echo ""
echo "📌 Current Status:"
echo "   ✅ Live theme downloaded"
echo "   ✅ Git repository initialized"
echo "   ✅ Safety backup created (v1.0-baseline)"
echo "   ✅ Development branch ready (optimize/phase1-images)"
echo ""
echo "🎯 Next Steps:"
echo ""
echo "1. Create development theme in Shopify:"
echo "   ${BLUE}shopify theme push --unpublished --store=teelixir-au.myshopify.com${NC}"
echo ""
echo "2. Get preview URL:"
echo "   ${BLUE}shopify theme share${NC}"
echo ""
echo "3. Start making optimizations (images first - lowest risk!)"
echo ""
echo "4. Test in dev theme before deploying to live"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚨 ROLLBACK PLAN (if anything goes wrong):"
echo ""
echo "   ${RED}git checkout v1.0-baseline${NC}"
echo "   ${RED}shopify theme push --store=teelixir-au.myshopify.com${NC}"
echo ""
echo "   This instantly restores your exact backup!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📖 Full workflow guide: /root/master-ops/agents/docs/SAFE-OPTIMIZATION-WORKFLOW.md"
echo ""
