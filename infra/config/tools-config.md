# Tools & Services Configuration

This document provides an overview of the tools and services integrated into the master-ops infrastructure.

---

## Supabase (Database & Backend)

**Purpose**: PostgreSQL database, authentication, storage, and real-time subscriptions

- **Project URL**: `https://[your-project-id].supabase.co`
- **API URL**: `https://[your-project-id].supabase.co/rest/v1`
- **Auth**: API keys (anon, service_role)
- **Features**:
  - PostgreSQL database
  - Row-level security (RLS)
  - Authentication & user management
  - File storage
  - Real-time subscriptions
  - Edge functions

**Integration Points**:
- Direct API calls from business apps
- n8n workflows for automation
- Shared libraries in `/shared/libs`

---

## n8n (Workflow Automation)

**Purpose**: Visual workflow automation platform

- **Instance URL**: `https://[your-n8n-instance].com` or `http://localhost:5678`
- **Auth**: API key or username/password
- **Features**:
  - Visual workflow builder
  - 300+ integrations
  - Scheduled tasks
  - Webhooks
  - Custom nodes

**Integration Points**:
- Workflows stored in `/infra/n8n-workflows/`
- Connects to Supabase, Smartlead, and business APIs
- Automated data syncing between systems

---

## Smartlead (Email Outreach)

**Purpose**: Cold email and lead generation platform

- **API URL**: `https://api.smartlead.ai`
- **Auth**: API key
- **Features**:
  - Email campaign management
  - Lead tracking
  - Email warmup
  - Analytics & reporting
  - Multi-inbox rotation

**Integration Points**:
- n8n workflows for campaign automation
- Supabase for lead data storage
- Per-business campaign configurations

---

## Additional Services (Placeholder)

### OpenAI / Anthropic
- **Purpose**: AI/LLM integration for automation
- **API URL**: `https://api.openai.com/v1` or `https://api.anthropic.com/v1`
- **Use Cases**: Content generation, data processing, analysis

### Stripe (Payment Processing)
- **Purpose**: Payment and subscription management
- **API URL**: `https://api.stripe.com`
- **Use Cases**: E-commerce transactions, subscription billing

### SendGrid / Postmark (Transactional Email)
- **Purpose**: Transactional email delivery
- **Use Cases**: Order confirmations, receipts, notifications

---

## Claude Desktop (MCP Servers)

**Purpose**: Extend Claude's capabilities through Model Context Protocol (MCP) integrations

- **Config Location**: `%AppData%\Claude\claude_desktop_config.json` (Windows)
- **Template**: See [claude-desktop-config.example.json](claude-desktop-config.example.json)
- **Full Setup Guide**: See [mcp-servers-setup.md](mcp-servers-setup.md)

### Configured MCP Servers

#### Core Integrations
- **Supabase MCP**: Direct database operations, task tracking, memory storage
- **n8n MCP**: Build workflows, trigger automations, manage supervisor tasks
- **GitHub MCP**: Repository management, PR/issue handling, git operations
- **Smartlead MCP**: Email campaign creation and management
- **HubSpot MCP**: CRM operations, contact/deal management

#### Utility Servers
- **Memory MCP**: Persistent memory across Claude conversations
- **Brave Search MCP**: Web search capabilities for research
- **Apify MCP**: Web scraping and data extraction actors
- **Filesystem MCP**: Local file access and management
- **Everything MCP**: Fast file search (Windows only)

### Integration Benefits

**Direct Database Access**: Query and update Supabase tables without API calls
**Workflow Automation**: Create n8n workflows conversationally
**Code Management**: Manage git repos, PRs, and issues from Claude
**Multi-Service Orchestration**: Combine multiple services in single conversation

### Security Notes

- MCP config file contains sensitive API keys - never commit to git
- Use read-only tokens where possible
- Rotate credentials regularly
- See [mcp-servers-setup.md](mcp-servers-setup.md) for security best practices

---

## Configuration Management

- All API keys and secrets stored in `.env` files (never committed)
- Use `/infra/config/env-template.md` as reference
- Environment-specific configs per business as needed
- Shared configs in this directory

---

## Notes

- Update this document as new tools are added
- Document breaking changes and migrations
- Keep placeholder values generic (never commit real credentials)
