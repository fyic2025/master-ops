# MCP Servers Setup for Claude Desktop

This guide explains how to configure Model Context Protocol (MCP) servers for Claude Desktop to enable powerful integrations with the master-ops infrastructure.

---

## What are MCP Servers?

**Model Context Protocol (MCP)** is a standard that allows Claude to connect to external tools and services. MCP servers extend Claude's capabilities by providing:

- Direct access to databases (Supabase)
- Workflow automation (n8n)
- Version control (GitHub)
- CRM integration (HubSpot)
- Email outreach (Smartlead)
- Web scraping (Apify)
- And more...

---

## Configuration Location

**Windows**: `C:\Users\[YOUR_USERNAME]\AppData\Roaming\Claude\claude_desktop_config.json`

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Linux**: `~/.config/Claude/claude_desktop_config.json`

---

## Setup Instructions

### 1. Copy the Template

1. Copy [claude-desktop-config.example.json](claude-desktop-config.example.json) to your Claude Desktop config location
2. Rename it to `claude_desktop_config.json`
3. Replace all placeholder values with your actual credentials

### 2. Obtain API Keys

#### Supabase Access Token
1. Go to https://supabase.com/dashboard/account/tokens
2. Generate a new access token
3. Copy to `SUPABASE_ACCESS_TOKEN`

#### n8n API Key
1. In your n8n instance, go to Settings → API
2. Create a new API key
3. Copy the key to `N8N_API_KEY`
4. Set `N8N_API_URL` to your n8n instance URL

#### GitHub Personal Access Token
1. Go to https://github.com/settings/tokens
2. Generate new token (classic)
3. Scopes needed: `repo`, `read:org`, `read:user`
4. Copy to `GITHUB_PERSONAL_ACCESS_TOKEN`

#### Smartlead API Key
1. Log into Smartlead
2. Go to Settings → API
3. Copy your API key
4. Replace `YOUR_SMARTLEAD_API_KEY_HERE` in the URL

#### HubSpot Access Token
1. Go to HubSpot → Settings → Integrations → Private Apps
2. Create a new private app or use existing
3. Copy the access token to `HUBSPOT_ACCESS_TOKEN`

#### Brave Search API Key
1. Go to https://brave.com/search/api/
2. Sign up for API access
3. Copy your API key to `BRAVE_API_KEY`

#### Apify Token
1. Go to https://console.apify.com/account/integrations
2. Copy your API token to `APIFY_TOKEN`

### 3. Restart Claude Desktop

After updating the config file, restart Claude Desktop for changes to take effect.

---

## MCP Servers Overview

### Core Servers for Master-Ops

#### 🗄️ Supabase
- **Purpose**: Database operations, task tracking, memory storage
- **Use Cases**:
  - Query and update AI-managed tasks
  - Store task logs and execution history
  - Manage business data across all 4 businesses
  - Real-time data subscriptions

#### 🔄 n8n Builder
- **Purpose**: Workflow automation and orchestration
- **Use Cases**:
  - Build workflows directly from Claude
  - Trigger automated processes
  - Create supervisor workflows for task monitoring
  - Schedule recurring tasks

#### 📧 Smartlead
- **Purpose**: Email outreach and campaign management
- **Use Cases**:
  - Create and manage email campaigns
  - Track lead engagement
  - Automate follow-ups
  - Per-business campaign management

#### 🐙 GitHub
- **Purpose**: Version control and code management
- **Use Cases**:
  - Create and manage repositories
  - Handle pull requests and issues
  - Review code changes
  - Automate git operations

#### 👥 HubSpot
- **Purpose**: CRM and customer management
- **Use Cases**:
  - Manage contacts and deals
  - Create and update tickets
  - Track customer interactions
  - Business-specific CRM operations

### Utility Servers

#### 🧠 Memory
- **Purpose**: Persistent memory across conversations
- **Use Cases**:
  - Remember project context
  - Store preferences and patterns
  - Maintain conversation continuity

#### 🔍 Brave Search
- **Purpose**: Web search capabilities
- **Use Cases**:
  - Research competitors
  - Find documentation
  - Verify information
  - Market research

#### 🕷️ Apify
- **Purpose**: Web scraping and automation
- **Use Cases**:
  - Extract product data
  - Monitor competitor pricing
  - Collect market data
  - Automate data gathering

#### 📁 Filesystem
- **Purpose**: Local file access
- **Use Cases**:
  - Read and write local files
  - Process documents
  - Manage project files

#### ⚡ Everything (Windows Only)
- **Purpose**: Fast file search
- **Use Cases**:
  - Quickly find files across system
  - Locate project resources
  - Search by filename or path

---

## Security Best Practices

### ✅ Do's

- Store actual config in Claude Desktop's config directory only
- Use environment-specific tokens (dev vs production)
- Rotate API keys regularly
- Use read-only tokens where possible
- Keep the example config (with placeholders) in version control

### ❌ Don'ts

- **NEVER** commit actual `claude_desktop_config.json` to git
- **NEVER** share your config file with actual tokens
- **NEVER** use production tokens in development
- **NEVER** grant more permissions than needed

---

## Troubleshooting

### MCP Server Not Loading

1. Check Claude Desktop logs:
   - Windows: `%AppData%\Claude\logs`
   - macOS: `~/Library/Logs/Claude`
   - Linux: `~/.config/Claude/logs`

2. Verify config file syntax (must be valid JSON)
3. Ensure all required environment variables are set
4. Restart Claude Desktop

### Permission Errors

- Check that API tokens have required scopes
- Verify tokens haven't expired
- Ensure service APIs are accessible from your network

### Command Not Found (npx)

- Install Node.js 18+ from https://nodejs.org
- Verify `npx` is in your PATH
- Restart terminal/Claude Desktop

---

## Master-Ops Integration Workflow

Here's how MCP servers integrate with our master-ops infrastructure:

```
┌─────────────────┐
│  Claude Desktop │
│   (with MCP)    │
└────────┬────────┘
         │
         ├──── Supabase MCP ────► Read/Write Tasks & Logs
         │
         ├──── n8n MCP ─────────► Trigger Workflows & Supervisor
         │
         ├──── GitHub MCP ──────► Manage Code & Repos
         │
         ├──── Smartlead MCP ───► Create Email Campaigns
         │
         └──── HubSpot MCP ─────► Manage CRM Data
                  │
                  ▼
         ┌────────────────┐
         │  Master-Ops    │
         │  Infrastructure│
         └────────────────┘
```

### Example Use Case: Automated Task Execution

1. **Human** creates task in Supabase via Claude Desktop (Supabase MCP)
2. **n8n workflow** picks up task and triggers execution (n8n MCP)
3. **Claude Code** executes task, logs progress (Supabase MCP)
4. If **task fails**, supervisor workflow analyzes and provides fix
5. **Claude Desktop** reads repair instruction and adjusts (Supabase MCP)
6. **GitHub** commit created when task completes (GitHub MCP)

---

## Advanced Configuration

### Custom MCP Servers

You can add custom MCP servers by following this pattern:

```json
{
  "mcpServers": {
    "your-custom-server": {
      "command": "npx",
      "args": ["-y", "@your-org/mcp-server"],
      "env": {
        "API_KEY": "your_api_key",
        "OTHER_CONFIG": "value"
      }
    }
  }
}
```

### Environment-Specific Configs

For different environments (dev/staging/production):

1. Create separate config files: `claude_desktop_config.dev.json`, `claude_desktop_config.prod.json`
2. Manually swap them based on your current work context
3. Or use a script to switch configs automatically

---

## Resources

- [MCP Protocol Documentation](https://modelcontextprotocol.io)
- [Claude Desktop MCP Guide](https://docs.anthropic.com/claude/docs/mcp)
- [Master-Ops Tools Config](tools-config.md)
- [Environment Variables Template](env-template.md)

---

## Support

For issues or questions:
1. Check Claude Desktop logs
2. Review this documentation
3. Consult individual service documentation
4. Check GitHub issues for known problems

---

**Last Updated**: 2025-11-19
