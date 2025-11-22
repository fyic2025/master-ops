# Installation Guide - AI Agent Team

**Time required:** 15-20 minutes
**Difficulty:** Beginner

## Prerequisites

Before installing, ensure you have:

- [ ] **Node.js 18+** installed
- [ ] **npm 9+** installed
- [ ] **Supabase account** with project created
- [ ] **Shopify store admin access** (Teelixir/Elevate)
- [ ] **Git** installed and configured

## Installation Steps

### 1. Install Global Dependencies

```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Install Shopify CLI
npm install -g @shopify/cli @shopify/theme

# Verify installations
lighthouse --version
shopify version
```

### 2. Install Agent Dependencies

```bash
# Navigate to agents directory
cd /root/master-ops/agents

# Install Node.js dependencies
npm install

# This installs:
# - @supabase/supabase-js (database client)
# - commander (CLI framework)
# - TypeScript and tooling
```

### 3. Setup Supabase Database

```bash
# Step 1: Open Supabase dashboard
# Navigate to: https://supabase.com/dashboard

# Step 2: Select your project

# Step 3: Go to SQL Editor

# Step 4: Create a new query

# Step 5: Copy and paste the entire contents of:
# /root/master-ops/agents/database-schema.sql

# Step 6: Click "Run" to execute

# Step 7: Verify tables created
# Check "Table Editor" in sidebar - you should see 9 new tables
```

### 4. Configure Environment Variables

#### Option A: Export in Terminal (Temporary)

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

#### Option B: Add to ~/.bashrc or ~/.zshrc (Permanent)

```bash
# Open your shell config file
nano ~/.bashrc  # or ~/.zshrc if using zsh

# Add these lines at the end:
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Save and reload
source ~/.bashrc  # or source ~/.zshrc
```

#### Option C: Create .env file (Recommended for development)

```bash
# Create .env file in agents directory
cat > /root/master-ops/agents/.env << EOF
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
EOF

# Load environment variables before running commands
# Add this to your scripts: source .env
```

**Finding Your Supabase Credentials:**

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "Settings" (gear icon) in sidebar
4. Go to "API" section
5. Copy:
   - **Project URL** → Use as `SUPABASE_URL`
   - **service_role key** → Use as `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **Security Note:** Never commit `.env` files to Git. The `.gitignore` should exclude them.

### 5. Authenticate with Shopify

```bash
# Authenticate with Shopify CLI
shopify auth login

# Follow the browser prompts to log in

# Verify access to stores
shopify theme list --store=teelixir-au
shopify theme list --store=elevate-wholesale

# You should see a list of themes for each store
```

### 6. Run Setup Verification

```bash
# Run the setup check
npm run setup

# Expected output:
# ✅ Supabase URL
# ✅ Supabase Service Role Key
# ✅ Shopify CLI
# ✅ All setup complete!
```

If any checks fail, review the steps above and ensure all prerequisites are met.

### 7. Test First Audit

```bash
# Run your first Lighthouse audit
npm run lighthouse:audit -- \
  --url=https://teelixir-au.myshopify.com/ \
  --brand=teelixir \
  --env=production

# This will:
# 1. Run Lighthouse audit
# 2. Log results to Supabase
# 3. Display scores and Core Web Vitals
# 4. Show if deployment thresholds are met
```

Expected output:
```
🔍 Running Lighthouse audit...
   URL: https://teelixir-au.myshopify.com/
   Brand: teelixir
   Environment: production
   Device: desktop

📊 Lighthouse Audit Results:

   Scores:
   Performance:     87/100 ⚠️
   Accessibility:   96/100 ✅
   Best Practices:  92/100 ⚠️
   SEO:             100/100 ✅

   Core Web Vitals:
   LCP: 3.20s ❌ (target: ≤2.5s)
   FID: 95ms ✅ (target: ≤100ms)
   CLS: 0.15 ❌ (target: ≤0.1)
   TTI: 3.20s ✅ (target: ≤3.5s)
   TBT: 180ms ✅ (target: ≤200ms)

   ⛔ DEPLOYMENT BLOCKED - Thresholds not met:
      • Performance: 87/100 (min: 95)
      • LCP: 3.2s (max: 2.5s)
      • CLS: 0.15 (max: 0.1)

✅ Logged Lighthouse audit: uuid-abc-123
```

### 8. Verify Database Logging

```bash
# Open Supabase dashboard
# Go to "Table Editor"
# Open "lighthouse_audits" table
# You should see your audit result!
```

## Installation Complete! 🎉

You've successfully installed the AI Agent Team. Your agents are now operational!

## Next Steps

### Quick Start (30 minutes)

Run the quick start workflow to test everything:

```bash
cd /root/master-ops/agents/examples
./quick-start-workflow.sh
```

This interactive script will:
1. ✅ Verify installation
2. ✅ Run baseline audit
3. ✅ Guide you through first optimization
4. ✅ Show you all available commands

### Read Documentation

- **[QUICK_START.md](QUICK_START.md)** - 30-minute introduction
- **[README.md](README.md)** - Complete agent documentation
- **[IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)** - 6-week roadmap

### Essential Commands

```bash
# Agent status
npm run agent:status

# Run audit
npm run lighthouse:audit -- --url=<URL> --brand=<BRAND>

# Multi-page audit
npm run lighthouse:multi -- --brand=teelixir

# View latest scores
npm run monitor:scores -- --brand=teelixir

# View alerts
npm run monitor:alerts

# View deployments
npm run deploy:list
```

## Troubleshooting

### Issue: "Command not found: lighthouse"

**Solution:**
```bash
npm install -g lighthouse
```

### Issue: "Cannot find module '@supabase/supabase-js'"

**Solution:**
```bash
cd /root/master-ops/agents
npm install
```

### Issue: "SUPABASE_URL is not defined"

**Solution:**
```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### Issue: "Shopify authentication required"

**Solution:**
```bash
shopify auth login
# Follow browser prompts
```

### Issue: "Permission denied" when running scripts

**Solution:**
```bash
chmod +x /root/master-ops/agents/examples/*.sh
```

### Issue: Database tables not created

**Solution:**
1. Open Supabase SQL Editor
2. Re-run `database-schema.sql`
3. Check for error messages
4. Verify you're using the correct project

### Issue: Lighthouse audit fails with "Navigation timeout"

**Solution:**
- Check URL is accessible
- Ensure store is not password-protected
- Try with `--device=desktop` flag
- Increase timeout if needed

## Uninstalling

If you need to remove the agent team:

```bash
# Remove global tools
npm uninstall -g lighthouse @shopify/cli @shopify/theme

# Remove agent dependencies
cd /root/master-ops/agents
rm -rf node_modules
rm package-lock.json

# Remove database tables (in Supabase SQL Editor)
DROP TABLE IF EXISTS lighthouse_audits CASCADE;
DROP TABLE IF EXISTS performance_trends CASCADE;
DROP TABLE IF EXISTS performance_alerts CASCADE;
DROP TABLE IF EXISTS theme_changes CASCADE;
DROP TABLE IF EXISTS accessibility_audits CASCADE;
DROP TABLE IF EXISTS seo_implementation_tasks CASCADE;
DROP TABLE IF EXISTS deployment_history CASCADE;
DROP TABLE IF EXISTS agent_activity_log CASCADE;
DROP TABLE IF EXISTS performance_budgets CASCADE;
```

## Getting Help

### Documentation
- Main README: `../README.md`
- Implementation Guide: `../IMPLEMENTATION_GUIDE.md`
- Quick Start: `../QUICK_START.md`
- Individual Agent READMEs: In each agent directory

### Check Logs
- **Supabase:** Dashboard → Logs
- **Agent Activity:** `agent_activity_log` table
- **Audit History:** `lighthouse_audits` table

### Common Commands
```bash
# Verify setup
npm run setup

# Check agent status
npm run agent:status

# View recent activity
# (Check Supabase dashboard → agent_activity_log table)
```

## System Requirements

### Minimum
- Node.js 18.0.0+
- npm 9.0.0+
- 2GB RAM
- Internet connection

### Recommended
- Node.js 20.0.0+
- npm 10.0.0+
- 4GB+ RAM
- Fast internet connection

### Operating Systems
- ✅ Linux (Ubuntu 20.04+, Debian 10+)
- ✅ macOS (11.0+)
- ✅ Windows (via WSL2)

## Security Notes

### Environment Variables
- **Never commit** `.env` files to Git
- **Use service_role key** only on server-side
- **Rotate keys** periodically
- **Restrict Supabase** to specific IPs if possible

### Shopify Access
- Use **staff account** with appropriate permissions
- Enable **2FA** on Shopify account
- Review **API access logs** regularly

### Database
- **Row Level Security** enabled by default
- **Backups** configured automatically by Supabase
- **Audit logs** maintained in tables

---

**Installation Complete!** Your AI Agent Team is ready to achieve 100/100 Lighthouse scores! 🚀

Next: Run `./examples/quick-start-workflow.sh` to get started.
