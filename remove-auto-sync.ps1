# Remove Auto-Sync on Logoff
# Run this script if you want to disable automatic sync

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Remove Auto-Sync on Logoff" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ This script must be run as Administrator" -ForegroundColor Red
    Write-Host ""
    Write-Host "Right-click PowerShell and select 'Run as Administrator', then run this script again." -ForegroundColor Yellow
    Write-Host ""
    pause
    exit 1
}

$taskName = "MasterOps-AutoSync-Logoff"

# Check if task exists
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if (-not $existingTask) {
    Write-Host "⚠️  Task '$taskName' not found. Nothing to remove." -ForegroundColor Yellow
    Write-Host ""
    pause
    exit 0
}

Write-Host "Found scheduled task: $taskName" -ForegroundColor Gray
Write-Host ""

$confirm = Read-Host "Are you sure you want to remove auto-sync on logoff? (Y/N)"

if ($confirm -ne 'Y' -and $confirm -ne 'y') {
    Write-Host "Cancelled." -ForegroundColor Yellow
    pause
    exit 0
}

try {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host ""
    Write-Host "✅ Successfully removed auto-sync task!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Auto-sync on logoff is now disabled." -ForegroundColor Gray
    Write-Host "You'll need to manually commit and push changes from now on." -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Error removing task: $_" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "Press any key to exit..." -ForegroundColor Gray
pause
