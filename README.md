# Master-Ops

Central operations repository for managing multiple businesses and shared infrastructure.

---

## Overview

This repository serves as the unified operations hub for managing four businesses alongside shared infrastructure, automation workflows, and reusable components. The master-ops approach enables:

- **Centralized Infrastructure**: Shared services (Supabase, n8n, Smartlead) configured once
- **Cross-Business Automation**: Workflows and tools that span multiple businesses
- **Reusable Components**: Libraries, prompts, and specifications shared across projects
- **Unified Development**: Single repository for coordinated multi-business operations

**Primary Development Assistant**: [Claude Code](https://claude.ai/claude-code) - Used for automation, file management, and development tasks.

---

## Repository Structure

### Business Folders

Each business has its own dedicated folder for business-specific code, configurations, and assets:

- **[teelixir/](teelixir/)** - Teelixir business operations and configurations
- **[elevate-wholesale/](elevate-wholesale/)** - Elevate Wholesale business operations and configurations
- **[buy-organics-online/](buy-organics-online/)** - Buy Organics Online business operations and configurations
- **[red-hill-fresh/](red-hill-fresh/)** - Red Hill Fresh business operations and configurations

### Infrastructure

**[infra/](infra/)** - Shared infrastructure, workflows, and service configurations

- **[n8n-workflows/](infra/n8n-workflows/)** - Automated workflows for cross-business processes
- **[supabase/](infra/supabase/)** - Database schemas, migrations, and functions
- **[config/](infra/config/)** - Service configurations and environment templates
  - [tools-config.md](infra/config/tools-config.md) - Overview of integrated tools and services
  - [env-template.md](infra/config/env-template.md) - Environment variable template
  - [claude-desktop-config.example.json](infra/config/claude-desktop-config.example.json) - MCP servers template
  - [mcp-servers-setup.md](infra/config/mcp-servers-setup.md) - Claude Desktop MCP setup guide

### Shared Resources

**[shared/](shared/)** - Reusable components across all businesses

- **[libs/](shared/libs/)** - Shared libraries and utility functions
- **[prompts/](shared/prompts/)** - AI prompts and templates for Claude Code and other LLMs
- **[specs/](shared/specs/)** - Specifications, schemas, and documentation

---

## Technologies & Services

This repository integrates with:

- **Supabase** - PostgreSQL database, authentication, storage, real-time features
- **n8n** - Workflow automation and integration platform
- **Smartlead** - Email outreach and lead generation
- **Claude Code** - AI-powered development assistant for automation and coding
- **Claude Desktop (MCP)** - Extended integrations via Model Context Protocol servers
  - Direct Supabase database operations
  - n8n workflow creation and management
  - GitHub repository management
  - HubSpot CRM integration
  - Web search and scraping capabilities

See [infra/config/tools-config.md](infra/config/tools-config.md) for detailed configuration information.

---

## Getting Started

### Prerequisites

- Node.js 18+ (for local development)
- Git
- VS Code with Claude Code extension
- Access to Supabase, n8n, and other configured services

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   cd master-ops
   ```

2. **Set up environment variables**
   - Copy [infra/config/env-template.md](infra/config/env-template.md)
   - Create `.env` files in relevant directories
   - Fill in actual API keys and credentials
   - Ensure `.env` is in `.gitignore`

3. **Install dependencies** (when applicable)
   ```bash
   npm install
   ```

4. **Configure services**
   - Follow setup instructions in [infra/config/tools-config.md](infra/config/tools-config.md)
   - Set up Supabase project and database
   - Configure n8n workflows
   - Connect Smartlead campaigns

5. **Set up Claude Desktop MCP Servers** (Optional but Recommended)
   - Copy [infra/config/claude-desktop-config.example.json](infra/config/claude-desktop-config.example.json)
   - Rename to `claude_desktop_config.json` in Claude Desktop's config directory
   - Replace placeholder values with actual API keys
   - Follow detailed setup in [infra/config/mcp-servers-setup.md](infra/config/mcp-servers-setup.md)
   - Restart Claude Desktop

### Working with Claude Code

This repository is designed to work seamlessly with Claude Code:

- Use natural language to request file changes, organization, or automation
- Claude Code maintains the folder structure and documentation
- Leverage Claude for creating workflows, scripts, and configurations

**Example commands**:
- "Create a new n8n workflow for syncing Teelixir orders to Supabase"
- "Update the shared library with a new utility function"
- "Generate a prompt template for customer support emails"

---

## Development Workflow

### Multi-Business Operations

When working across businesses:

1. Keep business-specific code in respective business folders
2. Extract shared logic to `/shared/libs`
3. Document cross-business processes in `/infra`
4. Use environment variables for business-specific configurations

### Infrastructure Changes

1. Database changes go in `/infra/supabase/migrations`
2. Workflow updates in `/infra/n8n-workflows`
3. Update `/infra/config/tools-config.md` when adding new services
4. Document breaking changes in relevant README files

### Version Control

- Commit business-specific changes to business folders
- Coordinate infrastructure changes across all businesses
- Never commit `.env` files or credentials
- Use descriptive commit messages referencing affected businesses

---

## Deployment

*(To be documented as deployment processes are established)*

Deployment will be configured for:
- Multiple servers (if needed)
- Environment-specific configurations (dev, staging, production)
- Automated deployment via n8n or CI/CD pipelines

---

## Security

- **Never commit credentials** - Use environment variables
- **API keys** - Stored in `.env` files (gitignored)
- **Access control** - Configured per service in Supabase, n8n, etc.
- **Secrets management** - Consider using a secrets manager for production

See [infra/config/env-template.md](infra/config/env-template.md) for environment variable setup.

---

## Maintenance

This repository is actively maintained with Claude Code as the primary development assistant. Folder structure, configurations, and documentation are continuously updated to reflect current operations.

### Key Responsibilities

- **Folder Organization** - Claude Code maintains clean structure
- **Documentation** - Keep READMEs and config files up to date
- **Automation** - Build and maintain n8n workflows
- **Code Quality** - Ensure shared libraries are well-tested and documented

---

## Support & Questions

For questions about this repository structure or setup:

1. Consult the documentation in `/infra/config/`
2. Review business-specific README files (when created)
3. Use Claude Code for assistance with file organization and automation

---

## License

*(Add your license information here)*

---

**Last Updated**: 2025-11-19
