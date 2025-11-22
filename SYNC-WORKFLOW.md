# Work-Home Sync Workflow

Your complete setup for working seamlessly between work, home, and the remote server.

## 🎯 System Architecture

```
┌─────────────┐
│   GitHub    │ ← Central Hub (fyic2025/master-ops)
│  (Origin)   │
└──────┬──────┘
       │
   ┌───┴────┬───────────┬──────────────┐
   │        │           │              │
┌──▼───┐ ┌─▼────┐  ┌───▼────────┐ ┌──▼─────────┐
│ Work │ │ Home │  │   Remote   │ │  Laptop    │
│ PC   │ │ PC   │  │   Server   │ │            │
└──────┘ └──────┘  └────────────┘ └────────────┘
```

**All machines sync through GitHub as the single source of truth.**

---

## 📁 Repository Structure

```
master-ops/
├── elevate-wholesale/          # Shopify B2B trial automation
├── buy-organics-online/        # BigCommerce BOO project
│   └── theme/                  # BC Stencil theme (Cornerstone)
├── teelixir/                   # Teelixir project
├── red-hill-fresh/             # Red Hill Fresh project
├── shared/                     # Shared utilities
└── .env                        # Local credentials (NEVER pushed)
```

---

## 🔐 Protected Files (Never Committed)

These files are in `.gitignore` and stay local on each machine:

- `.env` - Environment variables
- `**/.stencil` - BigCommerce API tokens
- `**/secrets.stencil.json` - BC secrets
- `credentials.json` - Any credentials

**Template files ARE committed:**
- `.env.example`
- `.stencil.example`

---

## 🚀 Daily Workflow

### At Work (Windows PC - Current Location)

**Start of day:**
```bash
cd c:\Users\jayso\master-ops
git pull origin main
```

**Make changes, then:**
```bash
git add .
git commit -m "Description of changes"
git push origin main
```

### At Home

**First time setup:**
```bash
git clone git@github.com:fyic2025/master-ops.git
cd master-ops

# Copy .env template and fill in credentials
cp .env.example .env
# Edit .env with your credentials

# For BC theme
cp buy-organics-online/theme/.stencil.example buy-organics-online/theme/.stencil
# Edit .stencil with BC API token
```

**Daily sync:**
```bash
cd master-ops
git pull origin main

# ... make changes ...

git add .
git commit -m "Description"
git push origin main
```

### On Remote Server (dev.growthcohq.com)

**Pull latest changes:**
```bash
ssh root@dev.growthcohq.com
cd /root/master-ops
git pull origin main
```

---

## 🔄 Auto-Sync Script (Optional)

Create this script to auto-pull on login:

**On Windows (PowerShell profile):**
```powershell
# Add to: $PROFILE (run `notepad $PROFILE`)

function Sync-MasterOps {
    cd c:\Users\jayso\master-ops
    Write-Host "Syncing master-ops..." -ForegroundColor Cyan
    git pull origin main
}

# Auto-run on shell start
Sync-MasterOps
```

**On Remote Server (bash):**
```bash
# Add to ~/.bashrc
alias sync="cd /root/master-ops && git pull origin main"

# Auto-pull on login
cd /root/master-ops && git pull origin main --quiet
```

---

## 🛠️ Common Scenarios

### Scenario 1: Started Work at Home, Continuing at Work

**At home:**
```bash
git add .
git commit -m "WIP: Feature X"
git push origin main
```

**At work:**
```bash
git pull origin main
# Continue working...
```

### Scenario 2: Merge Conflict

If two machines edit the same file:

```bash
git pull origin main
# Conflict detected!

# Option 1: Keep your version
git checkout --ours <file>

# Option 2: Keep incoming version
git checkout --theirs <file>

# Option 3: Manually merge
# Edit the file, resolve conflicts, then:
git add <file>
git commit -m "Resolved merge conflict"
git push origin main
```

### Scenario 3: Need to Deploy BC Theme

**From any location:**
```bash
cd master-ops/buy-organics-online/theme

# Make sure you have .stencil file locally
# If not, copy from .stencil.example and add your token

# Install dependencies (if needed)
npm install

# Deploy to BigCommerce
stencil push
```

---

## 📋 Quick Reference

| Command | Purpose |
|---------|---------|
| `git status` | Check what changed |
| `git pull origin main` | Get latest from GitHub |
| `git add .` | Stage all changes |
| `git commit -m "msg"` | Commit changes |
| `git push origin main` | Push to GitHub |
| `git log --oneline -5` | See recent commits |
| `git diff` | See what changed |

---

## 🎯 Best Practices

1. **Always pull before starting work**
   ```bash
   git pull origin main
   ```

2. **Commit frequently with clear messages**
   ```bash
   git commit -m "Fix: Updated checkout form validation"
   ```

3. **Push at end of session**
   ```bash
   git push origin main
   ```

4. **Never commit credentials**
   - Check `.gitignore` includes sensitive files
   - Use `git status` before committing

5. **Use branches for major features** (optional)
   ```bash
   git checkout -b feature/new-integration
   # ... work ...
   git push origin feature/new-integration
   # Create PR on GitHub
   ```

---

## 🔧 Troubleshooting

**Problem:** "Your branch is behind 'origin/main'"
```bash
git pull origin main
```

**Problem:** "You have uncommitted changes"
```bash
# Option 1: Commit them
git add .
git commit -m "WIP"

# Option 2: Stash them
git stash
git pull origin main
git stash pop
```

**Problem:** ".stencil file missing on new machine"
```bash
cp buy-organics-online/theme/.stencil.example buy-organics-online/theme/.stencil
# Edit .stencil and add your BC API token
```

**Problem:** "Remote server out of sync"
```bash
ssh root@dev.growthcohq.com
cd /root/master-ops
git fetch origin
git reset --hard origin/main  # WARNING: Discards local changes
```

---

## 📱 Mobile/Tablet Access

Use GitHub mobile app or web interface to:
- View code
- Review changes
- Check commit history

For quick edits:
- Use github.dev (press `.` on any repo page)
- Make changes
- Commit directly to main

---

## 🎓 Next Steps

1. **Set up home machine:**
   ```bash
   git clone git@github.com:fyic2025/master-ops.git
   cp .env.example .env
   # Fill in credentials
   ```

2. **Update remote server to use GitHub:**
   ```bash
   ssh root@dev.growthcohq.com
   cd /root/master-ops
   git remote set-url origin git@github.com:fyic2025/master-ops.git
   git pull origin main
   ```

3. **Test the workflow:**
   - Make a small change at work
   - Push to GitHub
   - Pull from home
   - Verify change appears

---

## ✅ Current Status

- ✅ GitHub repository: `fyic2025/master-ops`
- ✅ Work PC: Configured and synced
- ✅ BC theme: Committed and pushed
- ✅ Credentials: Protected with .gitignore
- ⏳ Home machine: Needs setup
- ⏳ Remote server: Needs GitHub remote update

**You're ready to work from anywhere!**
