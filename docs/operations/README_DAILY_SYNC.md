# Daily Sync Automation

Automatically commits and pushes your daily work logs to GitHub at 7 PM every day.

## Quick Start

### 1. Run Setup
```bash
cd c:\Users\jayso\master-ops
setup_daily_sync.bat
```

### 2. Configure GitHub Remote
```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
```

### 3. Setup Windows Task Scheduler
Follow the instructions in [SETUP_TASK_SCHEDULER.md](SETUP_TASK_SCHEDULER.md)

## What It Does

1. **Checks Git Status**: Detects any file changes in your master-ops directory
2. **Analyzes Work Logs**: Reads today's log from `productivity-system/logs/YYYY-MM-DD.md`
3. **Generates Smart Commit Messages**: Creates descriptive messages like:
   - `Daily: Built link building outreach workflow, updated HubSpot integration`
   - `Daily: Refined AI automation scripts, deployed production updates`
4. **Commits and Pushes**: Automatically saves your work to GitHub
5. **Logs the Sync**: Records the sync timestamp in your daily log
6. **Sends Notification**: Desktop notification when complete

## Files Created

- [daily_sync.py](daily_sync.py) - Main automation script
- [requirements.txt](requirements.txt) - Python dependencies
- [SETUP_TASK_SCHEDULER.md](SETUP_TASK_SCHEDULER.md) - Detailed setup guide
- [setup_daily_sync.bat](setup_daily_sync.bat) - Quick setup script
- `.gitignore` - Auto-generated on first run

## Manual Usage

Run anytime manually:
```bash
python daily_sync.py
```

Or from any location:
```bash
python c:\Users\jayso\master-ops\daily_sync.py
```

## Features

### Intelligent Commit Messages
- Parses completed tasks from today's work log
- Summarizes top 2-3 tasks in commit title
- Includes additional tasks in commit body
- Falls back to generic message if no log exists

### Error Handling
- Initializes git repository if needed
- Sets upstream branch automatically
- Handles missing remote repository gracefully
- Provides helpful error messages

### Logging
- Adds sync timestamp to daily log
- Creates detailed console output
- Optional log file for debugging

### Notifications
- Windows 10/11 toast notifications
- Success/failure alerts
- Summary of committed work

## Customization

### Change Sync Time
Edit the Task Scheduler trigger (default: 7:00 PM daily)

### Modify Commit Message Format
Edit `generate_commit_message()` in [daily_sync.py](daily_sync.py:119-148)

### Add Multiple Daily Syncs
Create additional triggers in Task Scheduler:
- Morning: 9:00 AM
- Lunch: 12:00 PM
- Evening: 7:00 PM

### Exclude Files from Commits
Edit `.gitignore` in the master-ops directory

## Troubleshooting

### No changes to commit
- Normal if you haven't edited any files today
- Script will notify you and exit gracefully

### Git not found
Add Git to your PATH or use full path in Task Scheduler:
```
C:\Program Files\Git\bin\git.exe
```

### GitHub authentication failed
Setup SSH keys or Personal Access Token (see [SETUP_TASK_SCHEDULER.md](SETUP_TASK_SCHEDULER.md#permission-denied-when-pushing))

### Script runs but doesn't push
Check Task Scheduler history and run manually to see errors:
```bash
python daily_sync.py
```

### Notifications not working
Install the notification library:
```bash
pip install win10toast
```

## Monitoring

### Check Last Sync
View bottom of today's log:
```
c:\Users\jayso\master-ops\productivity-system\logs\2025-11-21.md
```

Should show:
```markdown
---
**Auto-sync**: 19:00 - Changes committed and pushed to GitHub
```

### View Sync History
- GitHub commits: Check your repository's commit history
- Task Scheduler: Open taskschd.msc → History tab
- Manual logs: Add `> sync.log 2>&1` to capture output

## Integration with Productivity System

Works seamlessly with your productivity system:
- Reads from `productivity-system/logs/YYYY-MM-DD.md`
- Parses the `## Completed (Actual)` section
- Extracts tasks with checkboxes: `- [✓] Task description`
- Updates the log with sync timestamp

## Example Output

```
============================================================
🔄 DAILY SYNC - Master Operations
============================================================
📅 Date: 2025-11-21
📂 Path: c:\Users\jayso\master-ops

🔍 Checking git status...
📊 Changes detected:
 M productivity-system/logs/2025-11-21.md
 M productivity-system/CLAUDE.md

📖 Analyzing today's work log...
✅ Found 5 completed tasks
   1. Built link building outreach workflow
   2. Updated HubSpot integration
   3. Refined AI automation scripts
   4. Deployed production updates
   5. Created daily sync automation

💭 Generating commit message...
📝 Message: Daily: Built link building outreach workflow, updated HubSpot integration, refined AI automation scripts

📝 Adding changes...
✅ Changes added

💾 Creating commit...
✅ Commit created

🚀 Pushing to remote...
✅ Pushed to remote

✅ Logged sync in 2025-11-21.md

============================================================
✅ Daily sync completed successfully!
============================================================
```

## Requirements

- Python 3.7+
- Git installed and in PATH
- GitHub repository (remote)
- Windows 10/11 (for Task Scheduler and notifications)

## Security Notes

- Never commit sensitive files (`.env`, credentials, etc.)
- `.gitignore` is auto-created to exclude common sensitive files
- Review git status before first automated run
- Use SSH keys or tokens for GitHub authentication

## Support

For detailed setup instructions, see [SETUP_TASK_SCHEDULER.md](SETUP_TASK_SCHEDULER.md)

For issues, check the troubleshooting section or run the script manually to see detailed error messages.

---

**Pro Tip**: Run manually a few times before setting up automation to ensure everything works correctly.
