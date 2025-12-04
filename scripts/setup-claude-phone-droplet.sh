#!/bin/bash
# =============================================================================
# Claude Code Phone Access - Droplet Setup Script
# =============================================================================
# Run this from your LOCAL machine (not the sandbox)
#
# Prerequisites:
#   - doctl installed and authenticated
#   - Your Anthropic API key ready
#
# Usage:
#   chmod +x scripts/setup-claude-phone-droplet.sh
#   ./scripts/setup-claude-phone-droplet.sh
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║     Claude Code Phone Access - Droplet Setup                      ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Configuration
DROPLET_NAME="claude-code"
REGION="syd1"  # Sydney - closest to you
SIZE="s-1vcpu-2gb"  # $12/month
IMAGE="ubuntu-24-04-x64"

# Check doctl is installed
if ! command -v doctl &> /dev/null; then
    echo -e "${RED}Error: doctl not installed. Install it first:${NC}"
    echo "  brew install doctl"
    echo "  doctl auth init"
    exit 1
fi

# Check authentication
echo -e "${YELLOW}Checking DigitalOcean authentication...${NC}"
if ! doctl account get &> /dev/null; then
    echo -e "${RED}Error: doctl not authenticated. Run: doctl auth init${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Authenticated${NC}"

# Get Anthropic API key
echo ""
echo -e "${YELLOW}Enter your Anthropic API key (starts with sk-ant-):${NC}"
read -s ANTHROPIC_API_KEY
if [[ ! "$ANTHROPIC_API_KEY" =~ ^sk-ant- ]]; then
    echo -e "${RED}Error: Invalid API key format${NC}"
    exit 1
fi
echo -e "${GREEN}✓ API key received${NC}"

# Get SSH key
echo ""
echo -e "${YELLOW}Available SSH keys:${NC}"
doctl compute ssh-key list --format ID,Name,FingerPrint
echo ""
echo -e "${YELLOW}Enter the SSH key ID to use (or press Enter to use first one):${NC}"
read SSH_KEY_ID
if [ -z "$SSH_KEY_ID" ]; then
    SSH_KEY_ID=$(doctl compute ssh-key list --format ID --no-header | head -1)
fi
echo -e "${GREEN}✓ Using SSH key ID: $SSH_KEY_ID${NC}"

# Create droplet
echo ""
echo -e "${CYAN}Creating droplet '$DROPLET_NAME' in $REGION...${NC}"
echo "  Size: $SIZE ($12/month)"
echo "  Image: $IMAGE"
echo ""

DROPLET_ID=$(doctl compute droplet create "$DROPLET_NAME" \
    --region "$REGION" \
    --size "$SIZE" \
    --image "$IMAGE" \
    --ssh-keys "$SSH_KEY_ID" \
    --tag-names "claude-code,phone-access" \
    --wait \
    --format ID \
    --no-header)

echo -e "${GREEN}✓ Droplet created: ID $DROPLET_ID${NC}"

# Get IP address
DROPLET_IP=$(doctl compute droplet get "$DROPLET_ID" --format PublicIPv4 --no-header)
echo -e "${GREEN}✓ IP Address: $DROPLET_IP${NC}"

# Wait for SSH to be ready
echo ""
echo -e "${YELLOW}Waiting for SSH to be ready...${NC}"
sleep 10
for i in {1..30}; do
    if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no root@$DROPLET_IP "echo 'SSH ready'" &> /dev/null; then
        break
    fi
    echo "  Attempt $i/30..."
    sleep 5
done
echo -e "${GREEN}✓ SSH ready${NC}"

# Setup script to run on droplet
echo ""
echo -e "${CYAN}Installing Claude Code on droplet...${NC}"

ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << 'REMOTE_SCRIPT'
set -e

# Update system
apt-get update -qq
apt-get upgrade -y -qq

# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# Install mosh for stable phone connections
apt-get install -y mosh

# Install Claude Code CLI
npm install -g @anthropic-ai/claude-code

# Install useful tools
apt-get install -y git jq

# Create workspace directory
mkdir -p /root/workspace

echo "✓ Base installation complete"
REMOTE_SCRIPT

# Set up Anthropic API key
echo -e "${YELLOW}Setting up Anthropic API key...${NC}"
ssh root@$DROPLET_IP "echo 'export ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY' >> /root/.bashrc"
ssh root@$DROPLET_IP "echo 'export ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY' >> /root/.profile"

# Clone master-ops repo
echo -e "${YELLOW}Cloning master-ops repository...${NC}"
ssh root@$DROPLET_IP << 'REMOTE_SCRIPT'
cd /root/workspace
git clone https://github.com/flyingwebie/master-ops.git || echo "Repo may already exist"
cd master-ops
npm install --production 2>/dev/null || true
echo "✓ Repository ready"
REMOTE_SCRIPT

# Create convenience script
ssh root@$DROPLET_IP << 'REMOTE_SCRIPT'
cat > /usr/local/bin/cc << 'EOF'
#!/bin/bash
cd /root/workspace/master-ops
claude "$@"
EOF
chmod +x /usr/local/bin/cc
REMOTE_SCRIPT

# Allow mosh through firewall
ssh root@$DROPLET_IP "ufw allow 60000:61000/udp 2>/dev/null || true"

# Print summary
echo ""
echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                    SETUP COMPLETE!                                ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "${CYAN}Droplet Details:${NC}"
echo "  Name: $DROPLET_NAME"
echo "  IP:   $DROPLET_IP"
echo "  Cost: \$12/month"
echo ""
echo -e "${CYAN}From your Mac (terminal):${NC}"
echo "  ssh root@$DROPLET_IP"
echo "  mosh root@$DROPLET_IP  # More stable"
echo ""
echo -e "${CYAN}From Blink Shell (iPhone):${NC}"
echo "  1. Open Blink Shell"
echo "  2. Type: mosh root@$DROPLET_IP"
echo "  3. Once connected, type: cc"
echo ""
echo -e "${CYAN}Quick commands on droplet:${NC}"
echo "  cc          # Start Claude Code in master-ops"
echo "  claude      # Start Claude Code anywhere"
echo ""
echo -e "${YELLOW}Save this IP address: $DROPLET_IP${NC}"
echo ""

# Save connection info locally
echo "$DROPLET_IP" > ~/.claude-phone-droplet-ip
echo -e "${GREEN}✓ IP saved to ~/.claude-phone-droplet-ip${NC}"
