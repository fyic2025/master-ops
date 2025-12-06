#!/bin/bash
# Simple sync script - Run this at start and end of work

echo "🔄 Syncing with GitHub..."

# Pull latest changes
echo "📥 Getting latest from GitHub..."
git pull --rebase

# Show status
echo "📊 Current status:"
git status

echo ""
echo "✅ Sync complete!"
echo ""
echo "When done working, run: ./commit-and-push.sh"
