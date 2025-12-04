# Master-Ops Multi-Device Access Guide

Quick reference for accessing the system from any device.

## Quick Links

| Resource | URL |
|----------|-----|
| Dashboard | https://ops.growthcohq.com |
| n8n Automation | https://automation.growthcohq.com |
| Supabase (Master) | https://supabase.com/dashboard/project/qcvfxxsnqvdfmpbcgdni |
| Supabase (BOO/Vault) | https://supabase.com/dashboard/project/usibnysqelovfuctmkqw |
| GitHub Repo | https://github.com/jayson-fyic/master-ops |

---

## 1. Phone Access (Claude App/Web)

### Option A: Claude Web/App + Dashboard
1. Open Claude at https://claude.ai or the Claude app
2. Access dashboard at https://ops.growthcohq.com
3. Login with Google (jayson@fyic.com.au)
4. View metrics, run health checks, monitor jobs

### Option B: Direct Database Access
For quick queries, use the Supabase dashboard:
1. Go to https://supabase.com/dashboard
2. Login with your Supabase account
3. Select project (qcvfxxsnqvdfmpbcgdni for Master Hub)
4. Use SQL Editor for direct queries

### Option C: Credential Lookup (Read-Only)
```bash
# From any device with Node.js, run:
curl -s https://raw.githubusercontent.com/jayson-fyic/master-ops/main/creds.js > creds.js
node creds.js list
```

---

## 2. New PC Setup (Claude Code)

### One-Command Setup
```bash
curl -sSL https://raw.githubusercontent.com/jayson-fyic/master-ops/main/infra/scripts/setup-new-machine.sh | bash
```

### Manual Setup
```bash
# 1. Install Claude Code
npm install -g @anthropic-ai/claude-code

# 2. Clone repo
git clone https://github.com/jayson-fyic/master-ops.git
cd master-ops

# 3. Install dependencies
npm install

# 4. Copy environment file
cp .env.example .env
# Edit .env with your credentials

# 5. Verify setup
node creds.js verify

# 6. Start Claude Code
claude
```

---

## 3. SSH to Server (Headless Claude Code)

### Server Details
| Property | Value |
|----------|-------|
| Host | 134.199.175.243 |
| User | root |
| Location | Sydney, Australia |
| Provider | DigitalOcean |

### Connect
```bash
ssh root@134.199.175.243
```

### Run Commands Remotely
```bash
# Check PM2 services
ssh root@134.199.175.243 "pm2 list"

# View logs
ssh root@134.199.175.243 "pm2 logs gsc-issues-sync --lines 50"

# Run credential lookup
ssh root@134.199.175.243 "cd /var/www/master-ops && node creds.js list"

# Pull latest code
ssh root@134.199.175.243 "cd /var/www/master-ops && git pull"
```

### Install Claude Code on Server (Optional)
```bash
ssh root@134.199.175.243 "npm install -g @anthropic-ai/claude-code"
```

Then run headless:
```bash
ssh -t root@134.199.175.243 "cd /var/www/master-ops && claude"
```

---

## 4. Credentials Access

### From Any Device with Node.js
```bash
# List all credentials
node creds.js list

# Get specific credential
node creds.js get boo bc_access_token

# Export as .env format
node creds.js export boo > .env.boo
```

### Remote Credential Lookup via SSH
```bash
ssh root@134.199.175.243 "cd /var/www/master-ops && node creds.js get global n8n_api_key"
```

### Vault Location
Credentials are stored in Supabase (BOO project):
- URL: `https://usibnysqelovfuctmkqw.supabase.co`
- Table: `secure_credentials`
- Encryption: AES-256-CBC client-side

---

## 5. Emergency Access

### If Dashboard is Down
1. Check DigitalOcean App Platform: https://cloud.digitalocean.com/apps
2. App ID: `1a0eed70-aef6-415e-953f-d2b7f0c7c832`
3. Force redeploy: `doctl apps create-deployment 1a0eed70-aef6-415e-953f-d2b7f0c7c832 --force-rebuild`

### If Server is Down
1. Check DigitalOcean droplet: https://cloud.digitalocean.com/droplets
2. Restart from console if needed
3. SSH may still work even if services are down

### If Supabase is Down
1. Check status: https://status.supabase.com
2. Credentials vault (BOO) and Master Hub are separate - one can fail independently
3. Most scripts have fallback error handling

---

## 6. Key Files Reference

| File | Purpose |
|------|---------|
| `creds.js` | Unified credential loader |
| `.env` | Local environment variables |
| `dashboard/.env.local` | Dashboard-specific env vars |
| `infra/scripts/` | Automation and setup scripts |
| `.claude/TASKS.md` | Current task list |
| `CLAUDE.md` | AI assistant instructions |

---

## 7. Common Commands

```bash
# Health check
node shared/libs/integrations/health/sync-health-checks.js

# CI/CD scan
npx tsx scripts/cicd-health-check.ts

# Deploy dashboard
doctl apps create-deployment 1a0eed70-aef6-415e-953f-d2b7f0c7c832 --force-rebuild

# View n8n workflows
curl -H "Authorization: Bearer $(node creds.js get global n8n_api_key)" https://automation.growthcohq.com/api/v1/workflows

# Test Supabase connection
npx tsx scripts/tests/test-supabase.ts
```

---

*Last updated: 2025-12-05*
