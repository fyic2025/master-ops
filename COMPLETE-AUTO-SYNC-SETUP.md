# Complete Auto-Sync System - Log On & Log Off

**Never manually sync again!** This system keeps all your work locations in perfect sync automatically.

## 🎯 The Complete System

```
┌─────────────────────────────────────────────┐
│         When You Work Anywhere:             │
│                                             │
│  Log ON  → Auto-PULL (get latest) ✅       │
│            Work all day...                  │
│  Log OFF → Auto-PUSH (save changes) ✅     │
└─────────────────────────────────────────────┘
                      ↓
            Everything stays in sync!
```

---

## 🚀 Complete One-Time Setup

### For Local PC (Work & Home)

**Run as Administrator:**

```powershell
cd c:\Users\jayso\master-ops

# Enable auto-pull on login
.\setup-auto-pull-login.ps1

# Enable auto-push on logoff
.\setup-auto-sync-logoff.ps1
```

### For Remote Server (dev.growthcohq.com)

**Run via SSH:**

```bash
ssh root@dev.growthcohq.com
cd /root/master-ops
git pull origin main

# Enable auto-sync on disconnect
chmod +x setup-remote-auto-sync.sh
./setup-remote-auto-sync.sh
```

---

## ✅ What You Get

### Work PC (Local)
- **Log IN** → Pulls latest from GitHub ✅
- Work all day...
- **Log OFF** → Pushes changes to GitHub ✅

### Home PC (Local)
- **Log IN** → Pulls work changes ✅
- Work in evening...
- **Log OFF** → Pushes changes to GitHub ✅

### Remote Server (VS Code SSH)
- **Connect** → Manual pull (or auto with bash_profile)
- Work on server...
- **Disconnect** → Pushes changes to GitHub ✅

---

## 📋 The Complete Workflow

### Monday Morning at Work

```
1. Turn on PC
2. Log in to Windows
   → ✅ Auto-pulls latest changes

3. Open VS Code → c:\Users\jayso\master-ops
4. Work all day
5. Log off at 5pm
   → ✅ Auto-commits and pushes to GitHub
```

### Monday Evening at Home

```
1. Turn on home PC
2. Log in to Windows
   → ✅ Auto-pulls work changes

3. Open VS Code → ~/master-ops
4. Continue working
5. Log off
   → ✅ Auto-pushes to GitHub
```

### Tuesday at Work (VS Code Remote)

```
1. Open VS Code
2. Connect to Remote SSH (dev.growthcohq.com)
3. Work on /root/master-ops
4. Disconnect VS Code
   → ✅ Auto-pushes to GitHub
```

**All locations stay perfectly in sync!** 🎉

---

## 🔍 Verify It's Working

### Check Auto-Pull Log
```powershell
cat c:\Users\jayso\master-ops\logs\auto-pull.log
```

### Check Auto-Push Log
```powershell
cat c:\Users\jayso\master-ops\logs\auto-sync.log
```

### Check Remote Log
```bash
ssh root@dev.growthcohq.com "cat /root/master-ops/logs/auto-sync-remote.log"
```

### Check GitHub Commits
```
https://github.com/fyic2025/master-ops/commits/main
```

You should see commits like:
- "Auto-sync on logoff - DESKTOP-ABC123"
- "Auto-sync on SSH logout - dev.growthcohq.com"

---

## 📊 System Architecture

```
┌──────────────┐
│    GitHub    │ ← Central Sync Hub
└──────┬───────┘
       │
   ┌───┴───────────┬─────────────┐
   │               │             │
┌──▼────────┐  ┌──▼──────┐  ┌──▼─────────┐
│  Work PC  │  │ Home PC │  │   Server   │
│  (Local)  │  │ (Local) │  │  (Remote)  │
│           │  │         │  │            │
│ Login:    │  │ Login:  │  │ Connect:   │
│  ↓ Pull   │  │  ↓ Pull │  │  (manual)  │
│           │  │         │  │            │
│ Logoff:   │  │ Logoff: │  │ Disconnect:│
│  ↑ Push   │  │  ↑ Push │  │  ↑ Push    │
└───────────┘  └─────────┘  └────────────┘
```

---

## 🛠️ Scheduled Tasks Created

### On Windows (Work/Home PC)

| Task Name | Trigger | Action |
|-----------|---------|--------|
| `MasterOps-AutoPull-Login` | On login | `git pull origin main` |
| `MasterOps-AutoSync-Logoff` | On logoff | `git add -A && git commit && git push` |

**View tasks:**
```powershell
Get-ScheduledTask | Where-Object {$_.TaskName -like "*MasterOps*"}
```

### On Linux Server

**Hook:** `/root/.bash_logout`

**Action:** Runs `/root/master-ops/remote-auto-sync.sh`

**View:**
```bash
cat /root/.bash_logout
```

---

## 🧪 Test the Complete System

### Test 1: Work PC Login/Logoff

```powershell
# Make a change at home first
ssh root@dev.growthcohq.com
cd /root/master-ops
echo "Test from server" > test.txt
git add . && git commit -m "Test" && git push

# Then on work PC
# 1. Log off and log back in
# 2. Check if test.txt appeared:
cat c:\Users\jayso\master-ops\test.txt
# Should show "Test from server" ✅
```

### Test 2: Complete Round Trip

```powershell
# At work:
echo "From work" > work-test.txt
# Log off

# At home (next login):
cat work-test.txt  # Should exist ✅

echo "From home" > home-test.txt
# Log off

# At work (next login):
cat home-test.txt  # Should exist ✅
```

---

## 📝 Commit Message Formats

### Auto-Pull on Login
```
Log entry only (no commit created)
```

### Auto-Push on Logoff (Local PC)
```
Auto-sync on logoff - DESKTOP-XYZ

Changes saved automatically on 2025-11-22 17:30:00
User: jayso
Machine: DESKTOP-XYZ

🔄 Auto-synced via logoff script
```

### Auto-Push on SSH Disconnect (Server)
```
Auto-sync on SSH logout - dev.growthcohq.com

Changes saved automatically on 2025-11-22 17:30:00
User: root
Machine: dev.growthcohq.com

🔄 Auto-synced via SSH logout script
```

---

## ⚙️ Advanced Configuration

### Add Visual Notification on Pull

Edit `auto-pull-login.ps1`, uncomment these lines:
```powershell
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.MessageBox]::Show("Master-ops synced!", "Auto-Pull", 0)
```

### Change Pull/Push Timing

**Auto-pull delay** (wait 10 seconds after login):
```powershell
# Add to auto-pull-login.ps1 at top
Start-Sleep -Seconds 10
```

### Disable Temporarily

**Disable auto-pull:**
```powershell
Disable-ScheduledTask -TaskName "MasterOps-AutoPull-Login"
```

**Disable auto-push:**
```powershell
Disable-ScheduledTask -TaskName "MasterOps-AutoSync-Logoff"
```

**Re-enable:**
```powershell
Enable-ScheduledTask -TaskName "MasterOps-AutoPull-Login"
Enable-ScheduledTask -TaskName "MasterOps-AutoSync-Logoff"
```

---

## 🔒 Security & Best Practices

### What Gets Synced?

✅ **Synced:**
- All code changes
- Documentation updates
- Configuration files (except .env)
- Project files

❌ **Protected (never synced):**
- `.env` files
- `.stencil` files
- `node_modules/`
- Credentials
- Logs (unless you want them)

### SSH Key Setup

Make sure password-less push works:

```bash
# Test GitHub SSH
ssh -T git@github.com

# Should say: "Hi fyic2025! You've successfully authenticated"
```

If it asks for password, set up SSH key:
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
# Add to GitHub: Settings → SSH and GPG keys
```

---

## 🛠️ Troubleshooting

### Problem: Auto-pull not working on login

**Check task exists:**
```powershell
Get-ScheduledTask -TaskName "MasterOps-AutoPull-Login"
```

**Check log:**
```powershell
cat c:\Users\jayso\master-ops\logs\auto-pull.log
```

**Re-run setup:**
```powershell
.\setup-auto-pull-login.ps1
```

### Problem: Auto-push not working on logoff

**Check task:**
```powershell
Get-ScheduledTask -TaskName "MasterOps-AutoSync-Logoff"
```

**Test manually:**
```powershell
.\auto-sync-logoff.ps1
```

### Problem: Remote server not syncing

**Check .bash_logout:**
```bash
ssh root@dev.growthcohq.com
cat /root/.bash_logout | grep auto-sync
```

**Re-run setup:**
```bash
./setup-remote-auto-sync.sh
```

---

## 📱 Quick Commands

### Check All Logs
```powershell
# Local pull log
cat logs\auto-pull.log

# Local push log
cat logs\auto-sync.log

# Remote push log
ssh root@dev.growthcohq.com "cat /root/master-ops/logs/auto-sync-remote.log"
```

### Manual Sync
```powershell
# Pull manually
git pull origin main

# Push manually
git add -A && git commit -m "Manual sync" && git push
```

### View All Tasks
```powershell
Get-ScheduledTask | Where-Object {$_.TaskName -like "*MasterOps*"} | Format-Table -AutoSize
```

---

## ✅ Setup Checklist

### Work PC
- [ ] Run `setup-auto-pull-login.ps1` as Admin
- [ ] Run `setup-auto-sync-logoff.ps1` as Admin
- [ ] Test: Log off and log back in
- [ ] Verify: Check logs for success

### Home PC
- [ ] Clone repo: `git clone git@github.com:fyic2025/master-ops.git`
- [ ] Run `setup-auto-pull-login.ps1` as Admin
- [ ] Run `setup-auto-sync-logoff.ps1` as Admin
- [ ] Test: Make change, log off, check GitHub

### Remote Server
- [ ] SSH to server
- [ ] Pull latest: `git pull origin main`
- [ ] Run `./setup-remote-auto-sync.sh`
- [ ] Test: Make change, disconnect, check GitHub

---

## 🎉 Success Criteria

You'll know it's working when:

1. ✅ You log in → Changes from other locations appear automatically
2. ✅ You log off → Your changes appear on GitHub
3. ✅ You never run `git pull` or `git push` manually again
4. ✅ All locations stay in perfect sync

---

## 🎯 The Bottom Line

### Before This System
```
Work PC → Edit file
Work PC → Remember to commit
Work PC → Remember to push
Home PC → Remember to pull
Home PC → Edit file
Home PC → Remember to commit
Home PC → Remember to push
```
**Result:** Forgot to push, can't access changes 😫

### After This System
```
Any Location → Edit files
              → Log off
              → ✅ Auto-synced

Next Location → Log in
              → ✅ Auto-synced
              → All changes available!
```
**Result:** Always in sync! 🎉

---

**🚀 You're ready! Set it up and never think about syncing again.**
