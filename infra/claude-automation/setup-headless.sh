#!/bin/bash
# ============================================================================
# Claude Code Headless Setup Script
# ============================================================================
# Run this script ONCE from your local machine to:
# 1. Authenticate Claude Code on the server
# 2. Test headless mode
# 3. Deploy the process-task.sh script
# ============================================================================

set -e

# Configuration
SERVER="root@134.199.175.243"
CLAUDE_PATH="/opt/node22/bin/claude"
REPO_PATH="/home/user/master-ops"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "============================================"
echo "Claude Code Headless Setup"
echo "============================================"
echo ""

# Step 1: Check SSH connectivity
echo -e "${YELLOW}[1/5] Testing SSH connection...${NC}"
if ssh -o ConnectTimeout=10 "$SERVER" "echo 'SSH OK'" 2>/dev/null; then
    echo -e "${GREEN}SSH connection successful${NC}"
else
    echo -e "${RED}ERROR: Cannot connect to $SERVER${NC}"
    echo "Please ensure:"
    echo "  - You have SSH key configured"
    echo "  - The server is running"
    echo "  - Firewall allows SSH"
    exit 1
fi

# Step 2: Check Claude Code installation
echo ""
echo -e "${YELLOW}[2/5] Checking Claude Code installation...${NC}"
CLAUDE_VERSION=$(ssh "$SERVER" "$CLAUDE_PATH --version" 2>/dev/null || echo "NOT_FOUND")
if [[ "$CLAUDE_VERSION" == "NOT_FOUND" ]]; then
    echo -e "${RED}ERROR: Claude Code not found at $CLAUDE_PATH${NC}"
    exit 1
fi
echo -e "${GREEN}Found: $CLAUDE_VERSION${NC}"

# Step 3: Test headless mode (may fail if not authenticated)
echo ""
echo -e "${YELLOW}[3/5] Testing headless mode...${NC}"
HEADLESS_TEST=$(ssh "$SERVER" "$CLAUDE_PATH -p 'respond with OK' --output-format json" 2>&1 || echo "AUTH_REQUIRED")

if echo "$HEADLESS_TEST" | grep -q '"result"'; then
    echo -e "${GREEN}Headless mode working!${NC}"
    echo "$HEADLESS_TEST" | head -1
else
    echo -e "${YELLOW}Headless mode requires authentication${NC}"
    echo ""
    echo "============================================"
    echo "AUTHENTICATION REQUIRED"
    echo "============================================"
    echo ""
    echo "Claude Code needs to be authenticated on the server."
    echo "This will open an interactive session."
    echo ""
    echo "Instructions:"
    echo "  1. A browser URL will appear - open it to authenticate"
    echo "  2. After login, type /exit to close the session"
    echo ""
    read -p "Press ENTER to start authentication..."

    # Run interactive Claude for authentication
    ssh -t "$SERVER" "$CLAUDE_PATH"

    echo ""
    echo -e "${YELLOW}Re-testing headless mode...${NC}"
    HEADLESS_TEST=$(ssh "$SERVER" "$CLAUDE_PATH -p 'respond with OK' --output-format json" 2>&1 || echo "FAILED")

    if echo "$HEADLESS_TEST" | grep -q '"result"'; then
        echo -e "${GREEN}Authentication successful!${NC}"
    else
        echo -e "${RED}ERROR: Headless mode still not working${NC}"
        echo "Response: $HEADLESS_TEST"
        exit 1
    fi
fi

# Step 4: Deploy process-task.sh to server
echo ""
echo -e "${YELLOW}[4/5] Deploying process-task.sh to server...${NC}"
PROCESS_SCRIPT="$SCRIPT_DIR/process-task.sh"
if [[ -f "$PROCESS_SCRIPT" ]]; then
    scp "$PROCESS_SCRIPT" "$SERVER:$REPO_PATH/infra/claude-automation/"
    ssh "$SERVER" "chmod +x $REPO_PATH/infra/claude-automation/process-task.sh"
    echo -e "${GREEN}Script deployed${NC}"
else
    echo -e "${YELLOW}process-task.sh not found locally, will use git pull on server${NC}"
    ssh "$SERVER" "cd $REPO_PATH && git pull origin main"
    ssh "$SERVER" "chmod +x $REPO_PATH/infra/claude-automation/process-task.sh 2>/dev/null || true"
fi

# Step 5: Verify full setup
echo ""
echo -e "${YELLOW}[5/5] Verifying full setup...${NC}"

# Check Supabase credentials
SUPABASE_CHECK=$(ssh "$SERVER" "cd $REPO_PATH && node -e \"
const creds = require('./creds.js');
creds.get('global', 'supabase_url').then(url => {
  if (url) console.log('SUPABASE_OK');
  else console.log('SUPABASE_MISSING');
}).catch(() => console.log('SUPABASE_ERROR'));
\"" 2>/dev/null || echo "CREDS_ERROR")

if [[ "$SUPABASE_CHECK" == *"SUPABASE_OK"* ]]; then
    echo -e "${GREEN}Supabase credentials configured${NC}"
else
    echo -e "${YELLOW}WARNING: Supabase credentials may need configuration${NC}"
    echo "Run: node creds.js set global supabase_url <url>"
    echo "Run: node creds.js set global supabase_service_key <key>"
fi

# Final summary
echo ""
echo "============================================"
echo -e "${GREEN}SETUP COMPLETE${NC}"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Import n8n-workflow.json into n8n"
echo "  2. Configure Supabase credentials in n8n"
echo "  3. Run test-task.sql in Supabase"
echo "  4. Activate the n8n workflow"
echo ""
echo "Manual test command:"
echo "  ssh $SERVER \"cd $REPO_PATH && ./infra/claude-automation/process-task.sh <task-id>\""
echo ""
