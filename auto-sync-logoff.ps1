# Auto-Sync on Logoff - Master Ops
# This script automatically commits and pushes changes to GitHub when you log off

param(
    [string]$LogFile = "c:\Users\jayso\master-ops\logs\auto-sync.log"
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
    Write-Host $Message
}

Write-Log "========================================="
Write-Log "Auto-sync initiated on logoff"

try {
    # Change to master-ops directory
    Set-Location "c:\Users\jayso\master-ops"
    Write-Log "Changed to master-ops directory"

    # Check if there are any changes
    $status = git status --porcelain

    if ([string]::IsNullOrWhiteSpace($status)) {
        Write-Log "No changes to commit. Skipping sync."
        exit 0
    }

    Write-Log "Changes detected. Starting auto-sync..."

    # Add all changes
    git add -A
    Write-Log "Staged all changes"

    # Get hostname and username for commit message
    $hostname = $env:COMPUTERNAME
    $username = $env:USERNAME
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

    # Create commit message
    $commitMessage = @"
Auto-sync on logoff - $hostname

Changes saved automatically on $timestamp
User: $username
Machine: $hostname

🔄 Auto-synced via logoff script
"@

    # Commit changes
    git commit -m $commitMessage
    Write-Log "Committed changes"

    # Push to GitHub
    git push origin main 2>&1 | Out-File -FilePath $LogFile -Append

    if ($LASTEXITCODE -eq 0) {
        Write-Log "✅ Successfully pushed to GitHub"
    } else {
        Write-Log "⚠️ Warning: Push may have failed. Exit code: $LASTEXITCODE"
    }

} catch {
    Write-Log "❌ Error during auto-sync: $_"
    Write-Log $_.Exception.Message
    exit 1
}

Write-Log "Auto-sync completed"
Write-Log "========================================="
