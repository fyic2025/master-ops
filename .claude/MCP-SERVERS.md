# MCP Server Configuration

VS Code MCP (Model Context Protocol) servers provide direct platform access for AI assistants.

## Configuration File
```
C:\Users\jayso\AppData\Roaming\Code\User\mcp.json
```

---

## Active Servers (11 Total)

### Supabase Database Access

| Server | Project Ref | Database |
|--------|-------------|----------|
| `supabase-teelixir-leads` | `qcvfxxsnqvdfmpbcgdni` | Teelixir Leads / Shared |
| `supabase-boo` | `usibnysqelovfuctmkqw` | Buy Organics Online |
| `supabase-elevate` | `xioudaqfmkdpkgujxehv` | Elevate Wholesale |

**Capabilities:**
- Execute SQL queries directly
- Create/modify tables and schemas
- Run migrations
- Manage RLS policies
- Full read/write access

**Credentials:** Uses Supabase Personal Access Token (`sbp_...`)

---

### Klaviyo Email Marketing

| Server | Account | Business |
|--------|---------|----------|
| `klaviyo-teelixir` | Teelixir AU | Teelixir |
| `klaviyo-boo` | Buy Organics Online | BOO |
| `klaviyo-elevate` | Elevate Wholesale | Elevate |

**Capabilities:**
- Create/manage email campaigns
- Configure flows and automations
- Manage segments and lists
- Access subscriber profiles
- Pull analytics and metrics
- Create templates

**Credentials:** Uses Klaviyo Private API Keys (`pk_...`)

---

### GitHub

| Server | Type | Authentication |
|--------|------|----------------|
| `github` | HTTP | GitHub PAT |

**Capabilities:**
- Browse repositories and code
- Manage issues and PRs
- Search code across repos
- Analyze commits
- Automate workflows

**Credentials:** Uses GitHub Personal Access Token (`ghp_...`)

---

### Shopify Development

| Server | Package |
|--------|---------|
| `shopify-dev` | `@shopify/dev-mcp@latest` |

**Capabilities:**
- Search Shopify documentation
- Introspect Admin GraphQL API schema
- Get API endpoint details
- Access Storefront API docs
- POS and Functions documentation

**Credentials:** None required (documentation access only)

---

### Brave Search

| Server | Package | Limit |
|--------|---------|-------|
| `brave-search` | `@brave/brave-search-mcp-server` | 2,000 queries/month |

**Capabilities:**
- Web search with AI summaries
- Image and video search
- News search
- Rich results extraction

**Credentials:** Brave Search API Key

---

### Puppeteer (Browser Automation)

| Server | Package |
|--------|---------|
| `puppeteer` | `@modelcontextprotocol/server-puppeteer` |

**Capabilities:**
- Automate browser actions (click, type, navigate)
- Take screenshots
- Fill forms and submit
- Scrape web pages
- Test checkout flows
- Execute JavaScript in browser context

**Credentials:** None required

---

### Chrome DevTools

| Server | Package |
|--------|---------|
| `chrome-devtools` | `chrome-devtools-mcp` |

**Capabilities:**
- Inspect DOM elements
- Monitor network requests
- Access browser console
- Performance profiling
- Debug JavaScript
- Analyze page load

**Credentials:** None required

---

## Vault Credentials Reference

All MCP-related credentials stored in Supabase vault:

```bash
# Global credentials
node creds.js get global github_pat
node creds.js get global brave_api_key

# Business-specific Klaviyo private keys
node creds.js get teelixir klaviyo_private_key
node creds.js get boo klaviyo_private_key
node creds.js get elevate klaviyo_private_key
```

---

## Adding New MCP Servers

1. Edit `C:\Users\jayso\AppData\Roaming\Code\User\mcp.json`
2. Add server config under `"servers"` object
3. Store credentials in vault if needed
4. Restart VS Code

Example server config:
```json
"new-server": {
    "type": "stdio",
    "command": "npx",
    "args": ["-y", "package-name"],
    "env": {
        "API_KEY": "your-key-here"
    }
}
```

---

## Troubleshooting

### Server won't start
- Check package name exists: `npm view package-name`
- Ensure Node.js 18+ installed
- Check VS Code MCP extension logs

### Authentication errors
- Verify credentials in vault: `node creds.js get <project> <key>`
- Check token hasn't expired
- Ensure correct permissions/scopes

### Package not found
- Search npm: `npm search mcp <keyword>`
- Check official MCP registry: registry.modelcontextprotocol.io

---

*Last updated: December 2024*
