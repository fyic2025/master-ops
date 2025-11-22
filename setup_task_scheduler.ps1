# Windows Task Scheduler Setup for Daily Sync
# Run this script as Administrator

Write-Host "============================================================"
Write-Host "Setting up Daily Sync Task Scheduler"
Write-Host "============================================================"
Write-Host ""

# Get Python path
$pythonPath = (Get-Command python).Path
Write-Host "Python path: $pythonPath"
Write-Host ""

# Create Task Scheduler task
$action = New-ScheduledTaskAction `
    -Execute $pythonPath `
    -Argument '"c:\Users\jayso\master-ops\daily_sync.py"' `
    -WorkingDirectory "c:\Users\jayso\master-ops"

$trigger = New-ScheduledTaskTrigger -Daily -At "7:00PM"

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable

$principal = New-ScheduledTaskPrincipal `
    -UserId "$env:USERNAME" `
    -LogonType Interactive `
    -RunLevel Highest

try {
    Register-ScheduledTask `
        -TaskName "Daily Sync - Master Ops" `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Principal $principal `
        -Description "Automatically commit and push daily work logs to GitHub" `
        -Force

    Write-Host "✅ Task created successfully!"
    Write-Host ""
    Write-Host "Task details:"
    Write-Host "- Name: Daily Sync - Master Ops"
    Write-Host "- Schedule: Every day at 7:00 PM"
    Write-Host "- Script: c:\Users\jayso\master-ops\daily_sync.py"
    Write-Host ""
    Write-Host "To test the task:"
    Write-Host "1. Open Task Scheduler (taskschd.msc)"
    Write-Host "2. Find 'Daily Sync - Master Ops' in the list"
    Write-Host "3. Right-click → Run"
    Write-Host ""
    Write-Host "To view task history:"
    Write-Host "1. Select the task in Task Scheduler"
    Write-Host "2. Click the 'History' tab at the bottom"
    Write-Host ""

} catch {
    Write-Host "❌ Error creating task: $_"
    Write-Host ""
    Write-Host "Please run this script as Administrator"
    exit 1
}

Write-Host "============================================================"
Write-Host "Setup complete!"
Write-Host "============================================================"
