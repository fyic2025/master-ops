#!/bin/bash
# Setup Auto-Sync on Remote Server
# Run this ONCE on the remote server to enable auto-sync on SSH logout

echo "========================================="
echo "Auto-Sync on SSH Logout - Remote Setup"
echo "========================================="
echo ""

SCRIPT_PATH="/root/master-ops/remote-auto-sync.sh"
LOGOUT_FILE="/root/.bash_logout"

# Check if script exists
if [ ! -f "$SCRIPT_PATH" ]; then
    echo "❌ Error: Script not found at $SCRIPT_PATH"
    echo "Make sure you've pulled the latest from GitHub first:"
    echo "  cd /root/master-ops && git pull origin main"
    exit 1
fi

# Make script executable
chmod +x "$SCRIPT_PATH"
echo "✅ Made script executable"

# Check if already configured in .bash_logout
if grep -q "remote-auto-sync.sh" "$LOGOUT_FILE" 2>/dev/null; then
    echo "⚠️  Auto-sync already configured in $LOGOUT_FILE"
    read -p "Do you want to reconfigure? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
    # Remove old entry
    sed -i '/remote-auto-sync.sh/d' "$LOGOUT_FILE"
fi

# Add to .bash_logout
echo "" >> "$LOGOUT_FILE"
echo "# Auto-sync to GitHub on logout" >> "$LOGOUT_FILE"
echo "$SCRIPT_PATH 2>/dev/null" >> "$LOGOUT_FILE"

echo ""
echo "✅ Setup Complete!"
echo ""
echo "Configuration:"
echo "  Script: $SCRIPT_PATH"
echo "  Trigger: $LOGOUT_FILE"
echo "  Logs: /root/master-ops/logs/auto-sync-remote.log"
echo ""
echo "📝 What happens now:"
echo "  1. When you disconnect from SSH or VS Code Remote, all changes will:"
echo "     • Be staged (git add -A)"
echo "     • Be committed with timestamp"
echo "     • Be pushed to GitHub"
echo ""
echo "  2. Logs saved to: /root/master-ops/logs/auto-sync-remote.log"
echo ""
echo "🧪 Test it now:"
echo "  Make a small change, then type 'exit' or disconnect VS Code Remote"
echo "  Log back in and check: cat /root/master-ops/logs/auto-sync-remote.log"
echo ""
echo "✅ Remote auto-sync is now active!"
