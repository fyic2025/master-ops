# Auto-Pull on Login - Master Ops
# This script automatically pulls latest changes from GitHub when you log in

param(
    [string]$LogFile = "c:\Users\jayso\master-ops\logs\auto-pull.log"
)

# Create logs directory if it doesn't exist
$LogDir = Split-Path -Path $LogFile -Parent
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $Message" | Out-File -FilePath $LogFile -Append
}

Write-Log "========================================="
Write-Log "Auto-pull initiated on login"

try {
    # Change to master-ops directory
    Set-Location "c:\Users\jayso\master-ops"
    Write-Log "Changed to master-ops directory"

    # Fetch latest from GitHub
    git fetch origin main 2>&1 | Out-File -FilePath $LogFile -Append

    # Check if we're behind
    $local = git rev-parse main
    $remote = git rev-parse origin/main

    if ($local -eq $remote) {
        Write-Log "Already up to date. No changes to pull."
        exit 0
    }

    Write-Log "Updates available. Pulling from GitHub..."

    # Pull latest changes
    git pull origin main 2>&1 | Out-File -FilePath $LogFile -Append

    if ($LASTEXITCODE -eq 0) {
        Write-Log "✅ Successfully pulled latest changes from GitHub"

        # Show a notification (optional)
        # Add-Type -AssemblyName System.Windows.Forms
        # [System.Windows.Forms.MessageBox]::Show("Master-ops synced with latest changes!", "Auto-Pull", 0, [System.Windows.Forms.MessageBoxIcon]::Information)
    } else {
        Write-Log "⚠️ Warning: Pull may have failed. Exit code: $LASTEXITCODE"
    }

} catch {
    Write-Log "❌ Error during auto-pull: $_"
    Write-Log $_.Exception.Message
    exit 1
}

Write-Log "Auto-pull completed"
Write-Log "========================================="
