#!/bin/bash

# VS Code Server Setup Script for DigitalOcean Droplet
# Domain: dev.growthcohq.com

set -e

echo "================================================"
echo "VS Code Server Setup for dev.growthcohq.com"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="dev.growthcohq.com"
EMAIL="admin@growthcohq.com"  # Change this to your email
CODE_SERVER_VERSION="4.96.2"

echo -e "${GREEN}Step 1: Updating system packages...${NC}"
apt update && apt upgrade -y

echo -e "${GREEN}Step 2: Installing required packages...${NC}"
apt install -y curl wget nginx certbot python3-certbot-nginx ufw

echo -e "${GREEN}Step 3: Configuring firewall...${NC}"
ufw --force enable
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw status

echo -e "${GREEN}Step 4: Installing code-server...${NC}"
curl -fsSL https://code-server.dev/install.sh | sh

echo -e "${GREEN}Step 5: Configuring code-server...${NC}"
mkdir -p ~/.config/code-server

# Prompt for code-server password
echo -e "${YELLOW}Enter a password for code-server access:${NC}"
read -s CODE_PASSWORD
echo

cat > ~/.config/code-server/config.yaml <<EOF
bind-addr: 127.0.0.1:8080
auth: password
password: ${CODE_PASSWORD}
cert: false
EOF

echo -e "${GREEN}Step 6: Creating systemd service for code-server...${NC}"
systemctl enable --now code-server@root
systemctl status code-server@root --no-pager

echo -e "${GREEN}Step 7: Configuring nginx reverse proxy...${NC}"
cat > /etc/nginx/sites-available/code-server <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host \$host;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection upgrade;
        proxy_set_header Accept-Encoding gzip;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/code-server /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
nginx -t

# Reload nginx
systemctl reload nginx

echo -e "${GREEN}Step 8: Setting up SSL with Let's Encrypt...${NC}"
certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email ${EMAIL} --redirect

echo -e "${GREEN}Step 9: Setting up auto-renewal for SSL certificate...${NC}"
systemctl enable certbot.timer
systemctl start certbot.timer

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "VS Code is now accessible at: ${YELLOW}https://${DOMAIN}${NC}"
echo -e "Your code-server password is what you entered during setup"
echo ""
echo -e "Useful commands:"
echo -e "  - Restart code-server: ${YELLOW}systemctl restart code-server@root${NC}"
echo -e "  - Check code-server logs: ${YELLOW}journalctl -u code-server@root -f${NC}"
echo -e "  - Check nginx logs: ${YELLOW}tail -f /var/log/nginx/error.log${NC}"
echo ""
