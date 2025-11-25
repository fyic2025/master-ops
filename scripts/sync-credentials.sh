#!/bin/bash
# ==============================================================================
# Credential Sync Script
# ==============================================================================
# Syncs credentials from remote server to local machine
# Usage: ./scripts/sync-credentials.sh [remote-host]
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
CREDS_FILE="MASTER-CREDENTIALS-COMPLETE.env"
REMOTE_HOST="${1:-user@your-server}"
REMOTE_PATH="/home/user/master-ops"

echo "==================================="
echo "  Credential Sync Tool"
echo "==================================="
echo ""

if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo "Usage: $0 [remote-host]"
    echo ""
    echo "Examples:"
    echo "  $0 user@192.168.1.100"
    echo "  $0 user@my-server.com"
    echo ""
    echo "This will copy MASTER-CREDENTIALS-COMPLETE.env from the remote"
    echo "server to your local master-ops directory."
    exit 0
fi

if [ "$REMOTE_HOST" == "user@your-server" ]; then
    echo "Please specify the remote host:"
    echo "  $0 user@your-server-ip"
    echo ""
    echo "Or manually copy the credentials file:"
    echo "  scp user@server:$REMOTE_PATH/$CREDS_FILE $ROOT_DIR/"
    exit 1
fi

echo "Syncing credentials from: $REMOTE_HOST"
echo "Remote path: $REMOTE_PATH/$CREDS_FILE"
echo "Local path: $ROOT_DIR/$CREDS_FILE"
echo ""

# Perform the sync
scp "$REMOTE_HOST:$REMOTE_PATH/$CREDS_FILE" "$ROOT_DIR/$CREDS_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "Credentials synced successfully!"
    echo ""
    echo "To load in your shell:"
    echo "  export \$(grep -v '^#' $ROOT_DIR/$CREDS_FILE | xargs)"
else
    echo ""
    echo "Failed to sync credentials. Check your SSH connection."
    exit 1
fi
