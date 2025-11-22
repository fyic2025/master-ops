# Setup Auto-Pull on Login
# Run this script ONCE to configure automatic pull when you log in to Windows

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Auto-Pull on Login - Setup Script" -ForegroundColor Cyan
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
$scriptPath = "c:\Users\jayso\master-ops\auto-pull-login.ps1"
$taskName = "MasterOps-AutoPull-Login"

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
    # Create action - run PowerShell with the pull script
    $action = New-ScheduledTaskAction -Execute "powershell.exe" `
        -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`""

    # Create trigger - run on login
    $trigger = New-ScheduledTaskTrigger -AtLogOn

    # Create principal - run as current user
    $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -RunLevel Highest

    # Create settings
    $settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -ExecutionTimeLimit (New-TimeSpan -Minutes 2) `
        -RestartCount 2 `
        -RestartInterval (New-TimeSpan -Minutes 1)

    # Register the task
    Register-ScheduledTask `
        -TaskName $taskName `
        -Action $action `
        -Trigger $trigger `
        -Principal $principal `
        -Settings $settings `
        -Description "Automatically pulls latest changes from GitHub when logging in" | Out-Null

    Write-Host "✅ Successfully created scheduled task!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Task Details:" -ForegroundColor Cyan
    Write-Host "  Name: $taskName" -ForegroundColor Gray
    Write-Host "  Trigger: On login" -ForegroundColor Gray
    Write-Host "  Action: Auto-pull from GitHub" -ForegroundColor Gray
    Write-Host "  User: $env:USERNAME" -ForegroundColor Gray
    Write-Host ""
    Write-Host "✅ Setup Complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Complete Auto-Sync System:" -ForegroundColor Cyan
    Write-Host "  • Log IN  → Auto-pull (get latest changes)" -ForegroundColor Green
    Write-Host "  • Log OFF → Auto-push (save your changes)" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Logs: c:\Users\jayso\master-ops\logs\auto-pull.log" -ForegroundColor White
    Write-Host ""

} catch {
    Write-Host "❌ Error creating scheduled task: $_" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    pause
    exit 1
}

Write-Host "Press any key to exit..." -ForegroundColor Gray
pause
