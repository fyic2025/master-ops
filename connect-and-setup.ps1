# PowerShell Script to Connect and Setup VS Code Server
# Run this in PowerShell

$dropletIP = "170.64.223.141"
$username = "root"
$domain = "dev.growthcohq.com"

Write-Host "================================================" -ForegroundColor Green
Write-Host "VS Code Server Setup for $domain" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

# Create the setup script content
$setupScript = @'
#!/bin/bash
set -e

DOMAIN="dev.growthcohq.com"
EMAIL="admin@growthcohq.com"

echo "Updating system..."
apt update && apt upgrade -y

echo "Installing packages..."
apt install -y curl wget nginx certbot python3-certbot-nginx ufw

echo "Configuring firewall..."
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

echo "Installing code-server..."
curl -fsSL https://code-server.dev/install.sh | sh

echo "Configuring code-server..."
mkdir -p ~/.config/code-server

echo "Enter password for code-server:"
read -s CODE_PASSWORD
echo

cat > ~/.config/code-server/config.yaml <<EOF
bind-addr: 127.0.0.1:8080
auth: password
password: ${CODE_PASSWORD}
cert: false
EOF

systemctl enable --now code-server@root

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

ln -sf /etc/nginx/sites-available/code-server /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email ${EMAIL} --redirect

echo ""
echo "Setup Complete! Visit https://${DOMAIN}"
'@

# Save script to temp file
$scriptPath = "$env:TEMP\setup-vscode.sh"
$setupScript | Out-File -FilePath $scriptPath -Encoding ASCII

Write-Host "Setup script created at: $scriptPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run the following command to connect:" -ForegroundColor White
Write-Host "   ssh $username@$dropletIP" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Once connected, run:" -ForegroundColor White
Write-Host "   bash <(cat)" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Then paste the setup script content and press Ctrl+D" -ForegroundColor White
Write-Host ""
Write-Host "OR simply run these commands manually on the droplet" -ForegroundColor Yellow
Write-Host ""

# Attempt to connect (will prompt for password)
Write-Host "Attempting to connect to droplet..." -ForegroundColor Green
Write-Host "Password: jI&pyGe29W7^kENu" -ForegroundColor Yellow
Write-Host ""

ssh $username@$dropletIP
