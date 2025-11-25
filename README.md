# Master Operations - Business OS

> **Central command for running multiple businesses using AI-augmented systems and strategic frameworks**

## Quick Links

- [Documentation Index](docs/INDEX.md) - Start here for all documentation
- [Quick Start](docs/getting-started/QUICK-START.md) - Setup guide
- [Architecture](docs/getting-started/ARCHITECTURE.md) - System design
- [Credentials Setup](docs/getting-started/CREDENTIALS-SETUP-GUIDE.md) - Configure credentials
- [Productivity System](productivity-system/README.md) - ACRA-aligned execution engine

---

## Philosophy

This Business OS is built on **ACRA frameworks** (Attract, Convert, Retain, Ascend):
- Brutal prioritization over busy work
- Pattern detection over blind execution
- Strategic alignment over tactical wins
- Autonomous operations over manual processes

**Primary Development Assistant**: [Claude Code](https://claude.ai/claude-code) - Used for automation, file management, and development tasks.

---

## Repository Structure

```
master-ops/
├── buy-organics-online/     # Buy Organics Online (BigCommerce)
├── elevate-wholesale/       # Elevate Wholesale (Shopify)
├── teelixir/               # Teelixir (BigCommerce)
├── red-hill-fresh/         # Red Hill Fresh (WordPress)
├── shared/                 # Shared libraries and utilities
│   └── libs/              # Service connectors (HubSpot, BigCommerce, etc.)
├── scripts/               # Organized scripts by category
│   ├── checks/           # Validation and health checks
│   ├── tests/            # Service connection tests
│   ├── analysis/         # Diagnostics and exploration
│   ├── data/             # Export, import, sync scripts
│   ├── setup/            # Configuration scripts
│   ├── fixes/            # One-off fix scripts
│   └── workflows/        # n8n workflow management
├── infra/                 # Infrastructure configuration
│   ├── n8n-workflows/    # Workflow templates
│   ├── supabase/         # Database schemas
│   └── config/           # Service configs
├── docs/                  # Documentation (see INDEX.md)
├── data/                  # Working data files (gitignored)
├── agents/                # AI optimization agents
├── tools/                 # CLI tools and utilities
└── .claude/               # Claude AI skills
```

### Business Projects

| Project | Platform | Status |
|---------|----------|--------|
| [buy-organics-online/](buy-organics-online/) | BigCommerce | Active |
| [elevate-wholesale/](elevate-wholesale/) | Shopify | Active |
| [teelixir/](teelixir/) | BigCommerce | Configured |
| [red-hill-fresh/](red-hill-fresh/) | WordPress | Configured |

---

## Technologies & Services

| Service | Purpose |
|---------|---------|
| **Supabase** | PostgreSQL database, auth, storage |
| **n8n** | Workflow automation platform |
| **BigCommerce** | E-commerce (BOO, Teelixir) |
| **Shopify** | E-commerce (Elevate) |
| **HubSpot** | CRM and contact management |
| **SmartLead** | Email outreach campaigns |
| **Xero** | Accounting integration |
| **Unleashed** | Inventory management |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Git configured
- Access to service credentials

### Quick Setup

1. **Clone repository**
   ```bash
   git clone git@github.com:fyic2025/master-ops.git
   cd master-ops
   ```

2. **Setup credentials**
   ```bash
   cp .env.template MASTER-CREDENTIALS-COMPLETE.env
   # Fill in your credentials
   ```

3. **Load credentials**
   ```bash
   # Bash/WSL
   export $(grep -v '^#' MASTER-CREDENTIALS-COMPLETE.env | xargs)

   # PowerShell
   . .\load-credentials.ps1
   ```

4. **Verify setup**
   ```bash
   npx tsx scripts/checks/verify-credentials.ts
   ```

See [docs/getting-started/QUICK-START.md](docs/getting-started/QUICK-START.md) for detailed instructions.

---

## Documentation

All documentation is organized in the [docs/](docs/) folder:

- **[docs/INDEX.md](docs/INDEX.md)** - Documentation navigation
- **[docs/getting-started/](docs/getting-started/)** - Setup and architecture
- **[docs/integrations/](docs/integrations/)** - Service integration guides
- **[docs/features/](docs/features/)** - Campaign and feature docs
- **[docs/operations/](docs/operations/)** - Deployment and operations

---

## Scripts

Scripts are organized in [scripts/](scripts/):

```bash
# Verify credentials
npx tsx scripts/checks/verify-credentials.ts

# Test a service
npx tsx scripts/tests/test-hubspot.ts

# Run integration tests
npx tsx scripts/integration/run-integration-tests.ts
```

See [scripts/README.md](scripts/README.md) for full documentation.

---

## Security

- Never commit credentials or `.env` files
- Store credentials in `MASTER-CREDENTIALS-COMPLETE.env` (gitignored)
- Use environment variables for all scripts
- See [docs/getting-started/CREDENTIALS-SETUP-GUIDE.md](docs/getting-started/CREDENTIALS-SETUP-GUIDE.md)

---

## Operating Principles

1. **Strategic Alignment First** - Every action must connect to ACRA framework
2. **Pattern Detection Over Execution** - Know when you're off-track early
3. **Autonomous Operations** - Build systems that run without you
4. **Brutal Honesty** - Low scores reveal truth, truth enables fixes
5. **Ship Over Perfect** - Done and shipped beats perfect and delayed

---

**Last Updated**: 2025-11-25
