# Windows Task Scheduler Setup for Daily Sync

This guide walks you through setting up the daily sync script to run automatically at 7 PM every day.

## Prerequisites

1. **Install Python dependencies**:
   ```bash
   cd c:\Users\jayso\master-ops
   pip install -r requirements.txt
   ```

2. **Setup GitHub remote** (if not already done):
   ```bash
   cd c:\Users\jayso\master-ops
   git init
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   ```

## Task Scheduler Setup Steps

### Method 1: Using Task Scheduler GUI

1. **Open Task Scheduler**:
   - Press `Win + R`
   - Type `taskschd.msc` and press Enter

2. **Create New Task**:
   - Click `Create Task...` in the right panel (NOT "Create Basic Task")
   - Name: `Daily Sync - Master Ops`
   - Description: `Automatically commit and push daily work logs`
   - Check: `Run whether user is logged on or not`
   - Check: `Run with highest privileges`

3. **Triggers Tab**:
   - Click `New...`
   - Begin the task: `On a schedule`
   - Settings: `Daily`
   - Start: Select today's date
   - Start time: `7:00:00 PM`
   - Check: `Enabled`
   - Click `OK`

4. **Actions Tab**:
   - Click `New...`
   - Action: `Start a program`
   - Program/script: `python.exe` (or full path: `C:\Python311\python.exe`)
   - Add arguments: `"c:\Users\jayso\master-ops\daily_sync.py"`
   - Start in: `c:\Users\jayso\master-ops`
   - Click `OK`

5. **Conditions Tab**:
   - Uncheck: `Start the task only if the computer is on AC power`
   - Check: `Wake the computer to run this task` (optional)

6. **Settings Tab**:
   - Check: `Allow task to be run on demand`
   - Check: `Run task as soon as possible after a scheduled start is missed`
   - If the task fails, restart every: `5 minutes`
   - Attempt to restart up to: `3 times`
   - Click `OK`

7. **Enter your password** when prompted

### Method 2: Using PowerShell (Quick Setup)

Run this PowerShell script as Administrator:

```powershell
# Create Task Scheduler task
$action = New-ScheduledTaskAction -Execute "python.exe" -Argument '"c:\Users\jayso\master-ops\daily_sync.py"' -WorkingDirectory "c:\Users\jayso\master-ops"

$trigger = New-ScheduledTaskTrigger -Daily -At "7:00PM"

$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable

$principal = New-ScheduledTaskPrincipal -UserId "$env:USERNAME" -LogonType Interactive -RunLevel Highest

Register-ScheduledTask -TaskName "Daily Sync - Master Ops" -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description "Automatically commit and push daily work logs"

Write-Host "✅ Task created successfully!"
```

## Testing the Setup

### Test the script manually first:
```bash
cd c:\Users\jayso\master-ops
python daily_sync.py
```

### Test the scheduled task:
1. Open Task Scheduler
2. Find `Daily Sync - Master Ops` in the task list
3. Right-click → `Run`
4. Check the `Last Run Result` column (should show `0x0` for success)

### View task history:
1. Select your task in Task Scheduler
2. Click the `History` tab at the bottom
3. Look for any errors or completion events

## Troubleshooting

### Python not found
**Error**: `The system cannot find the file specified`

**Solution**: Use full path to Python:
1. Find Python path: `where python` in cmd
2. Use that path in the Action (e.g., `C:\Users\jayso\AppData\Local\Programs\Python\Python311\python.exe`)

### Git not found
**Error**: `git is not recognized as an internal or external command`

**Solution**: Add Git to PATH or use full path:
```
C:\Program Files\Git\bin\git.exe
```

### No remote repository
**Error**: `No remote repository configured`

**Solution**: Add GitHub remote:
```bash
cd c:\Users\jayso\master-ops
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
```

### Permission denied when pushing
**Error**: `Permission denied (publickey)` or authentication errors

**Solution**: Setup GitHub credentials:

**Option A - SSH** (Recommended):
1. Generate SSH key: `ssh-keygen -t ed25519 -C "your_email@example.com"`
2. Add to GitHub: Settings → SSH and GPG keys → New SSH key
3. Update remote: `git remote set-url origin git@github.com:USERNAME/REPO.git`

**Option B - Personal Access Token**:
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with `repo` scope
3. Use token as password when prompted, or setup credential manager:
   ```bash
   git config --global credential.helper wincred
   ```

### Task runs but nothing happens
**Check**:
1. View task history in Task Scheduler
2. Check if there are actually changes to commit
3. Verify the script runs manually: `python daily_sync.py`
4. Check Windows Event Viewer: `eventvwr.msc` → Windows Logs → Application

### Notifications not working
**Solution**: Install notification library:
```bash
pip install win10toast
```

## Monitoring

### Create a log file for debugging
Modify the task's Action arguments to:
```
"c:\Users\jayso\master-ops\daily_sync.py" > "c:\Users\jayso\master-ops\sync.log" 2>&1
```

This will save all output to `sync.log` for troubleshooting.

### Check last sync time
Look at the bottom of today's log file:
```
c:\Users\jayso\master-ops\productivity-system\logs\YYYY-MM-DD.md
```

Should show:
```
---
**Auto-sync**: HH:MM - Changes committed and pushed to GitHub
```

## Customization

### Change the time
Edit the trigger in Task Scheduler or modify the PowerShell script's `-At` parameter.

### Run multiple times per day
Add additional triggers:
- Morning sync: 9:00 AM
- Lunch sync: 12:00 PM
- Evening sync: 7:00 PM

### Exclude certain files
Edit `.gitignore` in the master-ops directory.

### Customize commit message format
Edit the `generate_commit_message()` function in [daily_sync.py](daily_sync.py).

## Maintenance

### Disable temporarily
Right-click task → `Disable`

### View all scheduled syncs
Open Task Scheduler and check the task's triggers and history.

### Remove the task
```powershell
Unregister-ScheduledTask -TaskName "Daily Sync - Master Ops" -Confirm:$false
```

## Success Indicators

When working correctly, you should see:
- ✅ Windows notification at 7 PM: "Daily Sync Complete"
- ✅ New commit in GitHub repository
- ✅ Sync timestamp at bottom of daily log
- ✅ Task history shows success (0x0)

---

**Need Help?** Check the troubleshooting section or run the script manually to see detailed error messages.
