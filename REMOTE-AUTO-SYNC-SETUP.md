# Remote Server Auto-Sync Setup

Enable automatic sync to GitHub when you disconnect from VS Code Remote SSH or logout from the server.

## 🎯 What This Does

When you disconnect from VS Code Remote SSH or exit SSH session:
1. ✅ Checks for changes in `/root/master-ops`
2. ✅ Stages all changes (`git add -A`)
3. ✅ Commits with automatic timestamp
4. ✅ Pushes to GitHub
5. ✅ Logs the activity

---

## 🚀 Quick Setup (One-Time on Server)

### Step 1: Connect to Server

```bash
ssh root@dev.growthcohq.com
```

### Step 2: Pull Latest Code

```bash
cd /root/master-ops
git pull origin main
```

### Step 3: Run Setup

```bash
chmod +x setup-remote-auto-sync.sh
./setup-remote-auto-sync.sh
```

### Step 4: Done!

Auto-sync is now active on the remote server.

---

## 🧪 Test It

### In VS Code Remote SSH:

1. **Open Remote SSH:**
   - Press `Ctrl+Shift+P`
   - Type "Remote-SSH: Connect to Host"
   - Select `dev.growthcohq.com`

2. **Make a test change:**
   ```bash
   echo "Test remote auto-sync" > /root/master-ops/test-remote.txt
   ```

3. **Disconnect VS Code Remote:**
   - Click the green "SSH: dev.growthcohq.com" button in bottom-left
   - Select "Close Remote Connection"

4. **Reconnect and check:**
   ```bash
   ssh root@dev.growthcohq.com
   cat /root/master-ops/logs/auto-sync-remote.log
   ```

### Or Test via SSH Terminal:

1. **SSH to server:**
   ```bash
   ssh root@dev.growthcohq.com
   ```

2. **Make a change:**
   ```bash
   cd /root/master-ops
   echo "Test" > test.txt
   ```

3. **Exit SSH:**
   ```bash
   exit
   ```

4. **Check GitHub:**
   - Go to https://github.com/fyic2025/master-ops/commits/main
   - Should see: "Auto-sync on SSH logout - dev.growthcohq.com"

---

## 🔄 Complete Multi-Location Workflow

Now you have auto-sync on ALL locations:

### Scenario 1: Work on Local PC

```bash
# Open VS Code locally on c:\Users\jayso\master-ops
# Work all day
# Log off Windows → Auto-syncs to GitHub ✅
```

### Scenario 2: Work on Remote Server

```bash
# Open VS Code Remote SSH to dev.growthcohq.com
# Open /root/master-ops
# Work on files
# Disconnect VS Code → Auto-syncs to GitHub ✅
```

### Scenario 3: Work at Home

```bash
# Open VS Code locally on ~/master-ops
# Work in evening
# Log off → Auto-syncs to GitHub ✅
```

### All Stay in Sync!

```
Work PC (local)  ──┐
                   ├──→ GitHub (central) ──→ Always in sync!
Remote Server    ──┤
                   │
Home PC (local)  ──┘
```

---

## 📊 How It Works

### .bash_logout Hook

The setup adds this to `/root/.bash_logout`:

```bash
# Auto-sync to GitHub on logout
/root/master-ops/remote-auto-sync.sh 2>/dev/null
```

**When it triggers:**
- When you type `exit` in SSH
- When you disconnect VS Code Remote SSH
- When SSH connection drops
- When you log out of the server

---

## 📝 View Sync Logs

**Check recent syncs:**
```bash
ssh root@dev.growthcohq.com "tail -50 /root/master-ops/logs/auto-sync-remote.log"
```

**Or when connected:**
```bash
cat /root/master-ops/logs/auto-sync-remote.log
```

**Watch in real-time:**
```bash
tail -f /root/master-ops/logs/auto-sync-remote.log
```

---

## 🎯 VS Code Remote SSH Quick Reference

### Connect to Remote

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type: `Remote-SSH: Connect to Host`
3. Select: `dev.growthcohq.com` (or add if not there)
4. Open folder: `/root/master-ops`

### Disconnect (Triggers Auto-Sync)

**Option 1:** Click green button (bottom-left) → "Close Remote Connection"

**Option 2:** Press `Ctrl+Shift+P` → "Remote-SSH: Close Remote Connection"

**Option 3:** Just close VS Code

All methods trigger the auto-sync! ✅

---

## ⚙️ Configuration

### Change Log Location

Edit `/root/master-ops/remote-auto-sync.sh` line 5:
```bash
LOG_FILE="/root/master-ops/logs/auto-sync-remote.log"
```

### Disable Temporarily

**Remove from .bash_logout:**
```bash
ssh root@dev.growthcohq.com
sed -i '/remote-auto-sync.sh/d' /root/.bash_logout
```

**Re-enable:**
```bash
./setup-remote-auto-sync.sh
```

---

## 🛠️ Troubleshooting

### Problem: Auto-sync not triggering

**Check if configured:**
```bash
ssh root@dev.growthcohq.com
cat /root/.bash_logout | grep auto-sync
```

**Re-run setup:**
```bash
cd /root/master-ops
./setup-remote-auto-sync.sh
```

### Problem: Push failed

**Check SSH key:**
```bash
ssh root@dev.growthcohq.com
ssh -T git@github.com
```

Should say: "Hi fyic2025! You've successfully authenticated"

**If not, add SSH key to GitHub:**
```bash
# Generate key on server (if needed)
ssh-keygen -t ed25519 -C "server@dev.growthcohq.com"

# Display public key
cat ~/.ssh/id_ed25519.pub

# Add to GitHub: Settings → SSH and GPG keys
```

### Problem: Changes not detected

**Test manually:**
```bash
ssh root@dev.growthcohq.com
cd /root/master-ops
git status
```

**Run sync script manually:**
```bash
/root/master-ops/remote-auto-sync.sh
```

---

## 🎯 The Complete Picture

### Before Setup

```
Work PC → manual commit → manual push → GitHub
                                          ↓
Remote Server → manual commit → manual push
                                          ↓
Home PC → manual commit → manual push
```

### After Setup

```
Work PC → log off → ✅ auto-sync → GitHub
                                     ↓
Remote Server → disconnect → ✅ auto-sync
                                     ↓
Home PC → log off → ✅ auto-sync
```

**Never manually commit/push again!** 🎉

---

## 📋 Setup Checklist

- [ ] Pull latest code on server: `git pull origin main`
- [ ] Make setup script executable: `chmod +x setup-remote-auto-sync.sh`
- [ ] Run setup: `./setup-remote-auto-sync.sh`
- [ ] Test by making change and disconnecting
- [ ] Check log: `cat /root/master-ops/logs/auto-sync-remote.log`
- [ ] Verify commit on GitHub

---

## ✅ What You Get

Work anywhere, anytime, and everything stays in sync automatically:

- 💻 **Work PC (local)** → Auto-sync on Windows logoff
- 🌐 **Remote Server (SSH)** → Auto-sync on SSH disconnect
- 🏠 **Home PC (local)** → Auto-sync on Windows logoff

All syncing through GitHub as the central hub! 🚀

---

**Ready to set it up? SSH to the server and run the setup command above!**
