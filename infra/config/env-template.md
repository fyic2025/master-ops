# Environment Variables Template

This template shows all environment variables needed across the master-ops infrastructure. Copy this to create environment-specific `.env` files.

**⚠️ IMPORTANT**: Never commit actual `.env` files with real credentials to version control.

---

## Supabase Configuration

```bash
# Supabase Project
SUPABASE_URL=https://[your-project-id].supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... # Public anon key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... # Server-side only

# Database Direct Connection (optional)
DATABASE_URL=postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres
```

---

## n8n Configuration

```bash
# n8n Instance
N8N_URL=https://[your-n8n-instance].com
N8N_API_KEY=n8n_api_xxxxxxxxxxxxxxxxxxxxxxxx

# n8n Webhook Base URL (for receiving webhooks)
N8N_WEBHOOK_URL=https://[your-n8n-instance].com/webhook
```

---

## Smartlead Configuration

```bash
# Smartlead API
SMARTLEAD_API_KEY=sl_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SMARTLEAD_API_URL=https://api.smartlead.ai

# Per-Business Campaign IDs (examples)
SMARTLEAD_CAMPAIGN_TEELIXIR=camp_xxxxx
SMARTLEAD_CAMPAIGN_ELEVATE=camp_xxxxx
SMARTLEAD_CAMPAIGN_BOO=camp_xxxxx
SMARTLEAD_CAMPAIGN_RHF=camp_xxxxx
```

---

## AI / LLM Services

```bash
# OpenAI
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_ORG_ID=org-xxxxxxxxxxxxxxxx

# Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Payment Processing

```bash
# Stripe
STRIPE_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Email Services

```bash
# SendGrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Postmark (alternative)
POSTMARK_SERVER_TOKEN=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
POSTMARK_FROM_EMAIL=noreply@yourdomain.com
```

---

## Claude Desktop MCP Servers

**Note**: These are configured in `claude_desktop_config.json`, not in `.env` files.
See [mcp-servers-setup.md](mcp-servers-setup.md) for full setup instructions.

```bash
# Supabase MCP
SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# n8n MCP
N8N_API_URL=https://your-n8n-instance.com
N8N_API_KEY=your_n8n_api_key_here

# GitHub MCP
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Smartlead MCP (embedded in URL)
# https://mcp.smartlead.ai/sse?user_api_key=YOUR_API_KEY_HERE

# HubSpot MCP
HUBSPOT_ACCESS_TOKEN=pat-ap1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Brave Search MCP
BRAVE_API_KEY=BSAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Apify MCP
APIFY_TOKEN=apify_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Business-Specific Variables

### Teelixir
```bash
TEELIXIR_DOMAIN=https://teelixir.com
TEELIXIR_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Elevate Wholesale
```bash
ELEVATE_DOMAIN=https://elevate-wholesale.com
ELEVATE_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Buy Organics Online
```bash
BOO_DOMAIN=https://buy-organics-online.com
BOO_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Red Hill Fresh
```bash
RHF_DOMAIN=https://red-hill-fresh.com
RHF_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## General Configuration

```bash
# Environment
NODE_ENV=development # development | staging | production
LOG_LEVEL=info # debug | info | warn | error

# Application
APP_URL=http://localhost:3000
PORT=3000
```

---

## Usage Instructions

1. Copy this template to `.env` in the relevant project directory
2. Replace all placeholder values with actual credentials
3. Ensure `.env` is in `.gitignore`
4. Use environment-specific files: `.env.development`, `.env.staging`, `.env.production`
5. Never share or commit real API keys

---

## Security Notes

- Rotate API keys regularly
- Use read-only keys where possible
- Implement key rotation policies
- Monitor API usage for anomalies
- Use different keys for development/staging/production
