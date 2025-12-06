#!/bin/bash
# Auto-Sync on SSH Logout - Remote Server
# This script runs when you disconnect from SSH/VS Code Remote

LOG_FILE="/root/master-ops/logs/auto-sync-remote.log"
REPO_DIR="/root/master-ops"

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log "========================================="
log "Auto-sync initiated on SSH logout"

cd "$REPO_DIR" || {
    log "❌ Error: Cannot change to $REPO_DIR"
    exit 1
}

# Check if there are any changes
if [[ -z $(git status --porcelain) ]]; then
    log "No changes to commit. Skipping sync."
    exit 0
fi

log "Changes detected. Starting auto-sync..."

# Add all changes
git add -A
log "Staged all changes"

# Get hostname and username
HOSTNAME=$(hostname)
USERNAME=$(whoami)
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Create commit message
COMMIT_MSG="Auto-sync on SSH logout - $HOSTNAME

Changes saved automatically on $TIMESTAMP
User: $USERNAME
Machine: $HOSTNAME

🔄 Auto-synced via SSH logout script"

# Commit changes
git commit -m "$COMMIT_MSG" >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
    log "Committed changes"
else
    log "⚠️ Warning: Commit may have failed"
fi

# Push to GitHub
git push origin main >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
    log "✅ Successfully pushed to GitHub"
else
    log "⚠️ Warning: Push may have failed"
fi

log "Auto-sync completed"
log "========================================="
