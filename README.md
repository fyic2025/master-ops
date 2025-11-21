# Master Operations - Business OS

> **Central command for running multiple businesses using AI-augmented systems and strategic frameworks**

## Quick Links

- 🚀 [Daily Sync Automation](README_DAILY_SYNC.md) - Auto-commit and push at 7 PM daily
- 📊 [Productivity System](productivity-system/README.md) - ACRA-aligned execution engine
- 🏗️ [Infrastructure Setup](#technologies--services) - Supabase, n8n, Smartlead
- 📚 [Business Folders](#business-folders) - Teelixir, Elevate Wholesale, Buy Organics Online, Red Hill Fresh

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

### Business Folders

- **[teelixir/](teelixir/)** - Teelixir business operations
- **[elevate-wholesale/](elevate-wholesale/)** - Elevate Wholesale operations
- **[buy-organics-online/](buy-organics-online/)** - Buy Organics Online operations
- **[red-hill-fresh/](red-hill-fresh/)** - Red Hill Fresh (delivery ops Thu-Fri)

### Department Structure

#### 📊 Productivity System ✅ Active
**Purpose**: Strategic execution engine ensuring daily work drives ACRA growth

**Key Features**:
- Daily planning with brutal prioritization
- End-of-day productivity assessment
- Pattern detection and strategic drift prevention
- Automated git sync at 7 PM ([Setup Guide](README_DAILY_SYNC.md))

[View Documentation](productivity-system/README.md)

### Infrastructure

**[infra/](infra/)** - Shared infrastructure, workflows, and service configurations

- **[n8n-workflows/](infra/n8n-workflows/)** - Automated workflows
- **[supabase/](infra/supabase/)** - Database schemas, migrations
- **[config/](infra/config/)** - Service configurations

### Shared Resources

**[shared/](shared/)** - Reusable components across all businesses

- **[libs/](shared/libs/)** - Shared libraries
- **[prompts/](shared/prompts/)** - AI prompts and templates
- **[specs/](shared/specs/)** - Specifications and documentation

---

## Technologies & Services

- **Supabase** - PostgreSQL database, auth, storage
- **n8n** - Workflow automation platform
- **Smartlead** - Email outreach
- **Claude Code** - AI development assistant
- **Claude Desktop (MCP)** - Extended integrations

See [infra/config/tools-config.md](infra/config/tools-config.md) for detailed configuration.

---

## Getting Started

### Prerequisites

- Python 3.7+ (for daily sync automation)
- Node.js 18+ (for development)
- Git with SSH configured
- VS Code with Claude Code extension

### Quick Setup

1. **Clone and setup**
   ```bash
   git clone git@github.com:fyic2025/master-ops.git
   cd master-ops
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Setup Daily Auto-Sync** (runs at 7 PM)
   ```bash
   setup_daily_sync.bat
   ```
   Then follow [SETUP_TASK_SCHEDULER.md](SETUP_TASK_SCHEDULER.md)

4. **Configure environment variables**
   - Copy `.env.example` to `.env`
   - Add Supabase, n8n credentials
   - Never commit `.env`

---

## Daily Workflow

### Morning (5min)
1. Run `plan-day` from Productivity System
2. Focus on Top 3 ACRA-aligned tasks

### Evening (Automatic at 7 PM)
1. Daily sync script commits and pushes changes
2. Generates intelligent commit messages from work logs
3. Sends Windows notification with results

[Full Daily Sync Documentation](README_DAILY_SYNC.md)

---

## Operating Principles

1. **Strategic Alignment First** - Every action must connect to ACRA framework
2. **Pattern Detection Over Execution** - Know when you're off-track early
3. **Autonomous Operations** - Build systems that run without you
4. **Brutal Honesty** - Low scores reveal truth, truth enables fixes
5. **Ship Over Perfect** - Done and shipped beats perfect and delayed

---

## Success Metrics

### System Health
- [ ] Daily logging consistency >90%
- [ ] ACRA alignment score average >7/10
- [ ] Strategic work time >50%
- [ ] Automated daily git sync working

### Business Health (ACRA)
- [ ] Customer acquisition growing (Attract)
- [ ] Conversion rate improving (Convert)
- [ ] Churn rate decreasing (Retain)
- [ ] Customer value increasing (Ascend)

---

## Automation Features

### ✅ Daily Git Sync (NEW)
- Automatic commits at 7 PM
- Intelligent commit messages from work logs
- Windows notifications
- Error handling and logging

[Setup Guide](README_DAILY_SYNC.md) | [Task Scheduler Setup](SETUP_TASK_SCHEDULER.md)

---

## Support & Documentation

- **Productivity System**: [productivity-system/README.md](productivity-system/README.md)
- **Daily Sync**: [README_DAILY_SYNC.md](README_DAILY_SYNC.md)
- **Infrastructure**: [infra/config/](infra/config/)
- **Skills**: Located in each department's `skills/` folder

---

## Security

- Never commit credentials or `.env` files
- Use SSH keys for GitHub (configured ✅)
- API keys stored in environment variables
- Service role keys server-side only

---

**Remember**: This Business OS exists to keep you aligned with growth, not busy with systems. If the system itself becomes the work, you've drifted.

**Last Updated**: 2025-11-21
