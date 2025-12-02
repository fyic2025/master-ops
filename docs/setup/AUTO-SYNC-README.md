# Auto-Sync on Logoff Setup Guide

Automatically save and push all your changes to GitHub when you log off Windows.

## 🎯 What This Does

When you log off from Windows (at work or home), this system will:
1. ✅ Check for any changes in `master-ops/`
2. ✅ Stage all changes (`git add -A`)
3. ✅ Commit with automatic timestamp message
4. ✅ Push to GitHub
5. ✅ Log the sync activity

**Result**: You never have to remember to push your changes. They're automatically synced!

---

## 🚀 Quick Setup (One-Time)

### Step 1: Open PowerShell as Administrator

1. Press `Win + X`
2. Click "Windows PowerShell (Admin)" or "Terminal (Admin)"

### Step 2: Run Setup Script

```powershell
cd c:\Users\jayso\master-ops
.\setup-auto-sync.ps1
```

### Step 3: Done!

That's it. The auto-sync is now active.

---

## 📋 Files Created

| File | Purpose |
|------|---------|
| `auto-sync-logoff.ps1` | Main script that does the sync |
| `setup-auto-sync.ps1` | One-time setup (creates scheduled task) |
| `remove-auto-sync.ps1` | Removes auto-sync if needed |
| `logs/auto-sync.log` | Sync activity log |

---

## 🧪 Testing

1. **Make a test change:**
   ```bash
   cd c:\Users\jayso\master-ops
   echo "Test auto-sync" > test-autosync.txt
   ```

2. **Log off Windows**
   - Press `Ctrl + Alt + Delete` → Sign out
   - Or press `Win + L` then sign out

3. **Log back in**

4. **Check GitHub:**
   - Go to https://github.com/fyic2025/master-ops
   - You should see a commit like "Auto-sync on logoff - [YOUR-PC]"

5. **Check the log:**
   ```powershell
   cat c:\Users\jayso\master-ops\logs\auto-sync.log
   ```

---

## 🔧 How It Works

### Scheduled Task
A Windows Scheduled Task runs `auto-sync-logoff.ps1` when you log off.

**Task Name:** `MasterOps-AutoSync-Logoff`

**View the task:**
```powershell
Get-ScheduledTask -TaskName "MasterOps-AutoSync-Logoff"
```

**View task history:**
1. Open Task Scheduler (`taskschd.msc`)
2. Find "MasterOps-AutoSync-Logoff"
3. Click "History" tab

### Commit Messages

Auto-commits look like this:
```
Auto-sync on logoff - DESKTOP-ABC123

Changes saved automatically on 2025-11-22 17:30:00
User: jayso
Machine: DESKTOP-ABC123

🔄 Auto-synced via logoff script
```

---

## 📊 Viewing Sync Logs

**View latest log:**
```powershell
Get-Content c:\Users\jayso\master-ops\logs\auto-sync.log -Tail 50
```

**View in real-time:**
```powershell
Get-Content c:\Users\jayso\master-ops\logs\auto-sync.log -Wait
```

**Clear old logs:**
```powershell
Remove-Item c:\Users\jayso\master-ops\logs\auto-sync.log
```

---

## ⚙️ Configuration

### Change Log Location

Edit `auto-sync-logoff.ps1` line 4:
```powershell
[string]$LogFile = "c:\Users\jayso\master-ops\logs\auto-sync.log"
```

### Change Commit Message Format

Edit `auto-sync-logoff.ps1` starting at line 38:
```powershell
$commitMessage = @"
Your custom commit message here
"@
```

### Disable Auto-Sync Temporarily

**Option 1: Disable the task**
```powershell
Disable-ScheduledTask -TaskName "MasterOps-AutoSync-Logoff"
```

**Option 2: Remove completely**
```powershell
.\remove-auto-sync.ps1
```

**Re-enable:**
```powershell
Enable-ScheduledTask -TaskName "MasterOps-AutoSync-Logoff"
```

---

## 🏠 Setting Up on Home PC

1. **Clone the repo** (if not done yet):
   ```bash
   git clone git@github.com:fyic2025/master-ops.git
   cd master-ops
   ```

2. **Run setup** (as Administrator):
   ```powershell
   .\setup-auto-sync.ps1
   ```

3. **Done!** Home PC will now auto-sync on logoff too.

---

## 🔒 Security Notes

### What Gets Committed?

**Everything except protected files in `.gitignore`:**
- ✅ Code changes
- ✅ Documentation
- ✅ Config files
- ❌ `.env` (protected)
- ❌ `.stencil` (protected)
- ❌ `node_modules/` (ignored)

### SSH Keys

Make sure your SSH key is set up for password-less push:
```bash
ssh -T git@github.com
# Should say: "Hi fyic2025! You've successfully authenticated"
```

If it asks for a password, set up SSH key:
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
# Add the key to GitHub: Settings → SSH and GPG keys
```

---

## 🛠️ Troubleshooting

### Problem: Task didn't run on logoff

**Check task exists:**
```powershell
Get-ScheduledTask -TaskName "MasterOps-AutoSync-Logoff"
```

**Check task history:**
- Open Task Scheduler (`taskschd.msc`)
- Find the task → History tab

**Re-run setup:**
```powershell
.\setup-auto-sync.ps1
```

### Problem: Push failed (Authentication)

**Test SSH connection:**
```bash
ssh -T git@github.com
```

**If it fails, add your SSH key to ssh-agent:**
```bash
# Start ssh-agent
Get-Service ssh-agent | Set-Service -StartupType Automatic
Start-Service ssh-agent

# Add your key
ssh-add ~/.ssh/id_ed25519
```

### Problem: Changes not detected

**Check git status manually:**
```bash
cd c:\Users\jayso\master-ops
git status
```

**Check if files are in .gitignore:**
```bash
git check-ignore -v <filename>
```

### Problem: Script errors

**Check the log:**
```powershell
cat c:\Users\jayso\master-ops\logs\auto-sync.log
```

**Run script manually to see errors:**
```powershell
cd c:\Users\jayso\master-ops
.\auto-sync-logoff.ps1
```

---

## 📱 Alternative: Manual Sync Command

If you want to sync manually sometimes:

**Create quick sync script** (`sync-now.ps1`):
```powershell
cd c:\Users\jayso\master-ops
git add -A
git commit -m "Manual sync - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
git push origin main
Write-Host "✅ Synced to GitHub!" -ForegroundColor Green
```

**Run it:**
```powershell
.\sync-now.ps1
```

---

## 🎯 Best Practices

1. **Check logs periodically** to ensure syncs are working
   ```powershell
   cat logs\auto-sync.log
   ```

2. **Don't disable Windows from interrupting shutdown** - The script needs time to complete

3. **If working on sensitive changes**, disable auto-sync temporarily:
   ```powershell
   Disable-ScheduledTask -TaskName "MasterOps-AutoSync-Logoff"
   ```

4. **Test after Windows updates** - Occasionally verify the task still works after major updates

---

## ✅ What You Get

### Before Auto-Sync
```
[Make changes at work]
[Forget to commit]
[Go home]
[Changes not available at home]
😫
```

### After Auto-Sync
```
[Make changes at work]
[Log off]
✅ Auto-committed and pushed
[At home]
git pull
✅ All changes available!
😊
```

---

## 🔄 Complete Workflow Example

### Monday Morning (Work)
```bash
cd c:\Users\jayso\master-ops
git pull origin main  # Get weekend changes if any
# ... work all day ...
# [Log off at 5pm] → Auto-syncs ✅
```

### Monday Evening (Home)
```bash
cd master-ops
git pull origin main  # Gets work changes ✅
# ... work on project ...
# [Log off] → Auto-syncs ✅
```

### Tuesday Morning (Work)
```bash
cd c:\Users\jayso\master-ops
git pull origin main  # Gets home changes ✅
# ... continue working ...
```

**Everything stays in sync automatically!** 🎉

---

## 📞 Support

If you have issues:

1. Check the log: `logs\auto-sync.log`
2. Run setup again: `.\setup-auto-sync.ps1`
3. Test manually: `.\auto-sync-logoff.ps1`
4. Check Task Scheduler for errors

---

## 🗑️ Uninstalling

To completely remove auto-sync:

```powershell
# Run as Administrator
.\remove-auto-sync.ps1

# Optionally delete the scripts
Remove-Item auto-sync-logoff.ps1, setup-auto-sync.ps1, remove-auto-sync.ps1
```

---

**🎉 Enjoy never losing work again!**
