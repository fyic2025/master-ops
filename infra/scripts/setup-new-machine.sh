#!/bin/bash
# Master-Ops New Machine Setup Script
# Run: curl -sSL https://raw.githubusercontent.com/jayson-fyic/master-ops/main/infra/scripts/setup-new-machine.sh | bash

set -e

echo "=========================================="
echo "  Master-Ops New Machine Setup"
echo "=========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check OS
OS="unknown"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="mac"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    OS="windows"
fi
echo -e "${GREEN}Detected OS: $OS${NC}"

# Step 1: Check Node.js
echo ""
echo "Step 1: Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}Node.js installed: $NODE_VERSION${NC}"
else
    echo -e "${YELLOW}Node.js not found. Installing...${NC}"
    if [[ "$OS" == "mac" ]]; then
        brew install node
    elif [[ "$OS" == "linux" ]]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    else
        echo -e "${RED}Please install Node.js manually from https://nodejs.org${NC}"
        exit 1
    fi
fi

# Step 2: Install Claude Code
echo ""
echo "Step 2: Installing Claude Code..."
if command -v claude &> /dev/null; then
    echo -e "${GREEN}Claude Code already installed${NC}"
else
    npm install -g @anthropic-ai/claude-code
    echo -e "${GREEN}Claude Code installed${NC}"
fi

# Step 3: Clone repository
echo ""
echo "Step 3: Cloning master-ops repository..."
REPO_DIR="$HOME/master-ops"
if [ -d "$REPO_DIR" ]; then
    echo -e "${YELLOW}Repository already exists at $REPO_DIR${NC}"
    cd "$REPO_DIR"
    git pull origin main
else
    git clone https://github.com/jayson-fyic/master-ops.git "$REPO_DIR"
    cd "$REPO_DIR"
fi
echo -e "${GREEN}Repository ready at $REPO_DIR${NC}"

# Step 4: Install dependencies
echo ""
echo "Step 4: Installing npm dependencies..."
npm install
echo -e "${GREEN}Dependencies installed${NC}"

# Step 5: Setup environment file
echo ""
echo "Step 5: Setting up environment..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${YELLOW}Created .env from .env.example - please update with your credentials${NC}"
    fi
fi

# Step 6: Setup SSH keys for server access
echo ""
echo "Step 6: Checking SSH access to server..."
SSH_KEY="$HOME/.ssh/id_rsa"
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${YELLOW}No SSH key found. Generating...${NC}"
    ssh-keygen -t rsa -b 4096 -f "$SSH_KEY" -N ""
    echo -e "${GREEN}SSH key generated at $SSH_KEY${NC}"
    echo ""
    echo "To enable server access, add this public key to the server:"
    echo "---"
    cat "$SSH_KEY.pub"
    echo "---"
    echo ""
    echo "Run: ssh-copy-id root@134.199.175.243"
else
    echo -e "${GREEN}SSH key exists${NC}"
fi

# Step 7: Test server connectivity
echo ""
echo "Step 7: Testing server connectivity..."
if ssh -o ConnectTimeout=5 -o BatchMode=yes root@134.199.175.243 "echo 'Connected'" 2>/dev/null; then
    echo -e "${GREEN}Server connection successful${NC}"
else
    echo -e "${YELLOW}Cannot connect to server (may need SSH key setup)${NC}"
    echo "Server: root@134.199.175.243"
fi

# Step 8: Verify credentials access
echo ""
echo "Step 8: Testing credential vault access..."
cd "$REPO_DIR"
if node creds.js verify 2>/dev/null; then
    echo -e "${GREEN}Credential vault accessible${NC}"
else
    echo -e "${YELLOW}Credential vault test failed - may need network access${NC}"
fi

# Summary
echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "Quick Start:"
echo "  cd $REPO_DIR"
echo "  claude"
echo ""
echo "Useful Commands:"
echo "  node creds.js list          # List all credentials"
echo "  npm run dev                 # Start dashboard locally"
echo "  ssh root@134.199.175.243    # Connect to server"
echo ""
echo "Documentation:"
echo "  cat infra/ACCESS-GUIDE.md"
echo ""
echo -e "${GREEN}Ready to go!${NC}"
