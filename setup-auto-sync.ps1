# Setup Auto-Sync on Logoff
# Run this script ONCE to configure automatic sync when you log off Windows

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Auto-Sync on Logoff - Setup Script" -ForegroundColor Cyan
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

Write-Host "✅ Running with Administrator privileges" -ForegroundColor Green
Write-Host ""

# Define paths
$scriptPath = "c:\Users\jayso\master-ops\auto-sync-logoff.ps1"
$taskName = "MasterOps-AutoSync-Logoff"

# Verify script exists
if (-not (Test-Path $scriptPath)) {
    Write-Host "❌ Error: Script not found at $scriptPath" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "📁 Script location: $scriptPath" -ForegroundColor Gray
Write-Host ""

# Check if task already exists
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if ($existingTask) {
    Write-Host "⚠️  Task '$taskName' already exists" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to overwrite it? (Y/N)"

    if ($overwrite -ne 'Y' -and $overwrite -ne 'y') {
        Write-Host "Setup cancelled." -ForegroundColor Yellow
        pause
        exit 0
    }

    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "Removed existing task" -ForegroundColor Gray
}

Write-Host "Creating scheduled task..." -ForegroundColor Cyan
Write-Host ""

try {
    # Create action - run PowerShell with the sync script
    $action = New-ScheduledTaskAction -Execute "powershell.exe" `
        -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`""

    # Create trigger - run on logoff
    $trigger = New-ScheduledTaskTrigger -AtLogoff

    # Create principal - run as current user
    $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -RunLevel Highest

    # Create settings
    $settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -ExecutionTimeLimit (New-TimeSpan -Minutes 5) `
        -RestartCount 3 `
        -RestartInterval (New-TimeSpan -Minutes 1)

    # Register the task
    Register-ScheduledTask `
        -TaskName $taskName `
        -Action $action `
        -Trigger $trigger `
        -Principal $principal `
        -Settings $settings `
        -Description "Automatically syncs master-ops to GitHub when logging off" | Out-Null

    Write-Host "✅ Successfully created scheduled task!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Task Details:" -ForegroundColor Cyan
    Write-Host "  Name: $taskName" -ForegroundColor Gray
    Write-Host "  Trigger: On logoff" -ForegroundColor Gray
    Write-Host "  Action: Auto-commit and push to GitHub" -ForegroundColor Gray
    Write-Host "  User: $env:USERNAME" -ForegroundColor Gray
    Write-Host ""
    Write-Host "✅ Setup Complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 What happens now:" -ForegroundColor Cyan
    Write-Host "  1. When you log off Windows, all changes in master-ops will be automatically:" -ForegroundColor White
    Write-Host "     • Staged (git add -A)" -ForegroundColor Gray
    Write-Host "     • Committed with timestamp" -ForegroundColor Gray
    Write-Host "     • Pushed to GitHub" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. Logs will be saved to: c:\Users\jayso\master-ops\logs\auto-sync.log" -ForegroundColor White
    Write-Host ""
    Write-Host "🧪 Test it now:" -ForegroundColor Cyan
    Write-Host "  Make a small change in master-ops, then log off and log back in." -ForegroundColor White
    Write-Host "  Check GitHub to see the auto-synced commit!" -ForegroundColor White
    Write-Host ""

} catch {
    Write-Host "❌ Error creating scheduled task: $_" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    pause
    exit 1
}

Write-Host "Press any key to exit..." -ForegroundColor Gray
pause
