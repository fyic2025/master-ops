# Claude Code Guidelines for Master-Ops

This document defines how Claude Code (and Claude Desktop) should work within the master-ops repository to maintain consistency, organization, and best practices across all operations.

---

## Role & Responsibilities

**Claude Code is the primary coding and automation assistant for this repository.**

Core responsibilities:
- Maintain folder structure and documentation
- Build and debug automations across all businesses
- Create reusable code and workflows
- Document decisions and conventions
- Ensure consistency across business operations
- Implement AI-managed task tracking and recovery

---

## Repository Organization Principles

### Business Folders

The four top-level business folders should be treated as **separate but related** entities:
- **[teelixir/](../../teelixir/)**
- **[elevate-wholesale/](../../elevate-wholesale/)**
- **[buy-organics-online/](../../buy-organics-online/)**
- **[red-hill-fresh/](../../red-hill-fresh/)**

**Guidelines**:
- Each business folder contains business-specific code, configs, and automation logic
- Keep business logic isolated to prevent cross-contamination
- When functionality is needed by multiple businesses, extract it to `shared/` instead of duplicating
- Use environment variables for business-specific configuration (domains, API keys, etc.)
- Document business-specific automations within each business folder

### Shared Resources (`shared/`)

The `shared/` folder enables code reuse across all businesses:

- **`shared/libs/`** - Shared libraries and utility functions
  - Database clients (Supabase, etc.)
  - API wrappers (Smartlead, HubSpot, etc.)
  - Common utilities (date formatting, validation, etc.)
  - Business-agnostic helper functions

- **`shared/prompts/`** - AI prompts and templates
  - LLM prompts for automation tasks
  - Email templates (when generic)
  - Code generation templates
  - Supervisor analysis prompts

- **`shared/specs/`** - Specifications and documentation
  - This file (claude-guidelines.md)
  - API specifications
  - Data schemas
  - Cross-business conventions

**Guidelines**:
- Default to creating reusable, generic code
- Extract common patterns from business-specific code
- Document any shared utilities
- Version shared libraries appropriately

### Infrastructure (`infra/`)

The `infra/` folder is the **central hub** for shared infrastructure, workflows, and configurations.

#### `infra/n8n-workflows/`
- Store n8n workflow JSON exports
- Name workflows descriptively: `workflow-name-v1.json`
- Include a README documenting each workflow's purpose
- Keep workflows generic and parameterized where possible

#### `infra/supabase/`
- **`schema-tasks.sql`** - Canonical AI task tracking schema
  - `tasks` table: AI-managed task execution and recovery
  - `task_logs` table: Audit trail for all task actions
  - This is the **source of truth** for task tracking
- Database migrations (numbered: `001_initial_schema.sql`, `002_add_indexes.sql`, etc.)
- Edge functions (if used)
- Row-level security (RLS) policies
- Database seeds/fixtures

#### `infra/config/`
- Tool and service documentation
- Environment variable templates
- MCP server configurations
- Integration guides
- Any infrastructure-related specs

**Guidelines**:
- All infrastructure changes should be version controlled here
- Document breaking changes
- Keep configurations environment-agnostic (use placeholders)
- Never commit actual credentials

---

## Workflow for Building & Debugging Automations

When asked to build or debug automations, follow this workflow:

### 1. **Determine Scope**
- Is this business-specific or cross-business?
- Does similar functionality already exist in `shared/` or `infra/`?
- What external services are involved?

### 2. **Choose Location**
- **Business-specific**: Create/update files under the relevant business folder
  - Example: `teelixir/automations/order-sync.js`
- **Cross-business**: Create/update files under `infra/` or `shared/`
  - Example: `shared/libs/supabase-client.js`
  - Example: `infra/n8n-workflows/supervisor-workflow.json`

### 3. **Keep It Generic & Reusable**
- Write modular, well-documented code
- Use configuration over hard-coding
- Parameterize business-specific values
- Think "will another business need this?"

### 4. **Document Decisions**
- For new patterns or conventions, create a short markdown file:
  - `infra/config/[topic].md` - Infrastructure-related decisions
  - `shared/specs/[topic].md` - Cross-cutting specifications
- Include:
  - What was decided
  - Why it was decided
  - How to use/implement it
  - Examples

### 5. **Test & Validate**
- Ensure code works as expected
- Check for edge cases
- Validate against schema (especially for database operations)
- Test error handling and recovery logic

### 6. **Update Documentation**
- Update relevant README files
- Add inline code comments for complex logic
- Update `tools-config.md` if new services are integrated
- Document any new environment variables in `env-template.md`

---

## AI-Managed Task Tracking

The `infra/supabase/schema-tasks.sql` file defines the canonical task tracking system.

**When working with tasks**:
- **Always** reference this schema as the source of truth
- Use the `tasks` table for tracking execution state
- Use the `task_logs` table for audit trails
- Follow the defined workflow:
  1. Task created (pending)
  2. Task executed (in_progress)
  3. Task completes or fails
  4. Supervisor analyzes failures
  5. Repair instructions written
  6. Task retried or escalated

**Task-related code should**:
- Query/update tasks via Supabase client
- Log all actions to `task_logs`
- Include proper error handling
- Support retry logic
- Provide clear repair instructions on failure

---

## Code Style & Best Practices

### General
- Write clear, self-documenting code
- Use descriptive variable and function names
- Include JSDoc comments for functions
- Handle errors gracefully
- Log important actions and state changes

### File Organization
- One primary purpose per file
- Group related functionality
- Use clear, descriptive file names
- Include README files in major directories

### Configuration
- Use environment variables for secrets and environment-specific values
- Never hard-code credentials or business-specific URLs
- Document all required environment variables
- Provide sensible defaults where appropriate

### Security
- Never commit secrets or credentials
- Use read-only tokens where possible
- Validate all external inputs
- Sanitize data before database operations
- Follow principle of least privilege

---

## How to Extend This Repo Later

This repository is designed to grow with your operations. Here are common extension patterns:

### Adding n8n Workflows

**Location**: `infra/n8n-workflows/`

**Steps**:
1. Export workflow JSON from n8n
2. Save as `infra/n8n-workflows/descriptive-name-v1.json`
3. Create or update `infra/n8n-workflows/README.md` with:
   - Workflow name and purpose
   - Trigger conditions
   - Required credentials
   - Expected inputs/outputs
   - Any business-specific notes

**Example**:
```
infra/n8n-workflows/
├── README.md
├── supervisor-analyze-failed-tasks-v1.json
├── sync-smartlead-to-supabase-v1.json
└── daily-business-health-check-v1.json
```

### Adding Supabase Client Code

**Location**: `shared/libs/`

**Steps**:
1. Create `shared/libs/supabase/` directory
2. Add client initialization: `shared/libs/supabase/client.js`
3. Add helper functions: `shared/libs/supabase/tasks.js`, etc.
4. Export via `shared/libs/supabase/index.js`
5. Document usage in `shared/libs/supabase/README.md`

**Example**:
```javascript
// shared/libs/supabase/tasks.js
export async function createTask(supabase, taskData) {
  const { data, error } = await supabase
    .from('tasks')
    .insert(taskData)
    .select()
    .single()

  if (error) throw error
  return data
}
```

### Adding API Wrappers

**Location**: `shared/libs/`

**Steps**:
1. Create wrapper module: `shared/libs/smartlead-client.js`
2. Implement API methods with error handling
3. Document usage and required environment variables
4. Add to `shared/libs/index.js` for easy importing

**Example structure**:
```
shared/libs/
├── supabase/
├── smartlead-client.js
├── hubspot-client.js
├── utils.js
└── index.js
```

### Adding Business-Specific Automations

**Location**: `[business-name]/automations/` or `[business-name]/workflows/`

**Steps**:
1. Create business folder structure:
   ```
   teelixir/
   ├── automations/
   ├── config/
   └── README.md
   ```
2. Add automation scripts
3. Document in business-specific README
4. Reference shared libraries from `shared/libs/`

**Example**:
```javascript
// teelixir/automations/sync-orders.js
import { createTask, logTaskAction } from '../../shared/libs/supabase/tasks.js'
import { getOrders } from '../../shared/libs/shopify-client.js'

export async function syncTeelixirOrders() {
  // Business-specific automation logic
}
```

### Adding Database Migrations

**Location**: `infra/supabase/migrations/`

**Steps**:
1. Create numbered migration file: `003_add_campaign_tracking.sql`
2. Write migration SQL with:
   - Clear comments
   - Idempotent operations (`CREATE TABLE IF NOT EXISTS`, etc.)
   - Rollback instructions (in comments)
3. Test migration on development database
4. Document in `infra/supabase/README.md`

**Example**:
```sql
-- Migration: 003_add_campaign_tracking.sql
-- Description: Add campaign tracking table for Smartlead integration
-- Date: 2025-11-19

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  smartlead_campaign_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rollback: DROP TABLE IF EXISTS campaigns;
```

### Adding Shared Prompts

**Location**: `shared/prompts/`

**Steps**:
1. Create prompt file: `shared/prompts/supervisor-analysis.md`
2. Include prompt template with placeholders
3. Document expected inputs and outputs
4. Add usage examples

**Example**:
```markdown
# Supervisor Analysis Prompt

## Purpose
Analyze failed task logs and provide repair recommendations.

## Template
\`\`\`
You are an AI supervisor analyzing a failed automation task.

Task Details:
- Title: {{task_title}}
- Current Step: {{current_step}}
- Retry Count: {{retry_count}}

Error Logs:
{{error_logs}}

Provide:
1. Summary of what went wrong
2. Recommended action (retry/adjust/escalate)
3. Specific repair instruction for Claude Code
\`\`\`

## Usage
Replace {{placeholders}} with actual values from task record.
```

### Adding Configuration Docs

**Location**: `infra/config/`

**Steps**:
1. Create focused documentation: `infra/config/email-routing-strategy.md`
2. Explain the decision/pattern/configuration
3. Provide examples
4. Link from relevant README files

---

## Decision-Making Framework

When faced with architectural or organizational decisions:

### Ask These Questions:
1. **Is this business-specific or generic?**
   - Specific → Business folder
   - Generic → `shared/` or `infra/`

2. **Will this be reused?**
   - Yes → Extract to `shared/libs/`
   - No → Keep in business folder

3. **Is this infrastructure or application code?**
   - Infrastructure → `infra/`
   - Application → Business folder or `shared/`

4. **Does this need documentation?**
   - Always document new patterns
   - Update existing docs when changing behavior

5. **Does this involve credentials?**
   - Never commit
   - Add to `env-template.md`
   - Reference in setup docs

### Default to:
- ✅ Generic, reusable code
- ✅ Clear documentation
- ✅ Modular, small files
- ✅ Descriptive names
- ✅ Security-first approach

### Avoid:
- ❌ Duplication across businesses
- ❌ Hard-coded credentials or URLs
- ❌ Undocumented magic numbers or complex logic
- ❌ Mixing business logic with infrastructure
- ❌ Breaking changes without documentation

---

## Quick Reference

### Common Tasks

**Create new automation**:
1. Determine scope (business vs shared)
2. Choose location
3. Implement with error handling
4. Add to task tracking (if applicable)
5. Document

**Add new service integration**:
1. Create client in `shared/libs/[service]-client.js`
2. Document in `infra/config/tools-config.md`
3. Add env vars to `env-template.md`
4. Create usage examples

**Update documentation**:
1. Find relevant doc file
2. Make changes
3. Update "Last Updated" date
4. Commit with clear message

**Debug failed task**:
1. Check `task_logs` table
2. Analyze error details
3. Determine root cause
4. Provide repair instruction
5. Update task record

---

## Summary

As Claude Code working in this repository:

1. **Organize deliberately** - Put code where it belongs
2. **Think reusability** - Extract common patterns
3. **Document decisions** - Future you will thank you
4. **Secure by default** - Never commit secrets
5. **Test thoroughly** - Especially error paths
6. **Maintain consistency** - Follow established patterns

This repository is designed to scale across multiple businesses and many automations. Following these guidelines ensures it remains maintainable, secure, and efficient.

---

**Last Updated**: 2025-11-19
