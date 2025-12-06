# Infrastructure Improvement Roadmap

*Created: 2025-12-05 | Status: Active*

This document tracks the 5 priority improvements identified for the master-ops infrastructure.

---

## Current Maturity Score: 63%

| Component | Score | Notes |
|-----------|-------|-------|
| Dashboard UI | 95% | Excellent - fully operational |
| Agent Definitions | 95% | 13 agents fully defined |
| Task Schema | 95% | Production-ready in Supabase |
| Knowledge Base | 85% | Principles + pipelines documented |
| Shared Libraries | 85% | Supabase, n8n, HubSpot clients |
| Skills (Docs) | 75% | 54 skills documented |
| Skills (Scripts) | 40% | 60% have 0-2 scripts |
| Task Automation | 35% | Designed but not deployed |
| Agent Orchestration | 20% | Untested in practice |
| Testing | 5% | No test suite |

**Target: 85%** after completing this roadmap.

---

## Priority 1: Deploy Task Automation

**Status:** Ready to Deploy
**Impact:** Critical - enables autonomous task processing
**Effort:** 30 minutes

### Files Ready
- `infra/claude-automation/n8n-task-processor.json` - n8n workflow
- `infra/claude-automation/process-task.sh` - execution script (597 lines)
- `infra/claude-automation/task-processor-config.json` - safety config
- `infra/claude-automation/n8n-import-instructions.md` - step-by-step guide

### Deployment Steps

1. **Open n8n**: https://automation.growthcohq.com

2. **Create Supabase Credential**
   - Settings > Credentials > Add Credential
   - Type: Header Auth
   - Name: `Supabase Service Key`
   - Header Name: `Authorization`
   - Header Value: `Bearer <SERVICE_ROLE_KEY>`
   - Get key: `node creds.js get global master_supabase_service_role_key`

3. **Create SSH Credential**
   - Settings > Credentials > Add Credential
   - Type: SSH Password
   - Name: `n8n-primary SSH`
   - Host: `134.199.175.243`
   - Username: `root`

4. **Import Workflow**
   - Workflows > Add Workflow > ... > Import from File
   - Select: `infra/claude-automation/n8n-task-processor.json`

5. **Link Credentials**
   - Open workflow
   - Click each HTTP/SSH node
   - Select appropriate credential

6. **Test**
   ```bash
   curl -X POST https://automation.growthcohq.com/webhook/claude-task-trigger
   ```

7. **Activate**
   - Toggle Active switch ON

### How It Works
```
Every 5 min → Fetch pending task → Analyze complexity → Select model
                                                            ↓
                                                  Haiku (simple tasks)
                                                  Sonnet (medium tasks)
                                                  Opus (complex/escalated)
                                                            ↓
                                            Execute → Log result → Loop (up to 5 tasks)
```

---

## Priority 2: Add Scripts to Top 5 Skills

**Status:** Pending
**Impact:** High - makes skills operational
**Effort:** 2-3 hours per skill

### Target Skills

| Skill | Priority | Scripts Needed |
|-------|----------|----------------|
| `klaviyo-expert` | Revenue | segment-sync.ts, flow-trigger.ts, list-manager.ts |
| `google-ads-manager` | Ad spend | bid-adjuster.ts, search-term-miner.ts, performance-report.ts |
| `customer-segmentation-engine` | Targeting | rfm-calculator.ts, segment-builder.ts |
| `seo-content-writer` | Organic | content-generator.ts, keyword-optimizer.ts |
| `stock-alert-predictor` | Operations | low-stock-scanner.ts, reorder-calculator.ts |

### Script Template
```typescript
#!/usr/bin/env npx tsx
/**
 * Skill: [skill-name]
 * Script: [script-name].ts
 * Purpose: [what it does]
 *
 * Usage: npx tsx .claude/skills/[skill]/scripts/[script].ts [args]
 */

import { createClient } from '../../../shared/libs/supabase/client';

async function main() {
  // Implementation
}

main().catch(console.error);
```

---

## Priority 3: Test Agent Delegation

**Status:** Pending
**Impact:** Medium-High - validates agent architecture
**Effort:** 2-4 hours

### Test Scenario
Give Co-Founder a multi-domain task that requires delegation:

> "Plan a product launch for Teelixir's new Lion's Mane Coffee.
> Include market research, pricing strategy, email campaign,
> and inventory planning."

### Expected Delegation
- **Product Launch Team** → Market research, competitive analysis
- **Growth Director** → Email campaign, launch promotion
- **Operations Director** → Inventory, supplier coordination
- **Pricing Optimizer** → Margin analysis, competitive positioning

### Success Criteria
1. Co-Founder correctly identifies sub-tasks
2. Each director receives appropriate scope
3. Results consolidate back to single response
4. No context lost in handoffs

---

## Priority 4: Add Testing Infrastructure

**Status:** Pending
**Impact:** Medium - enables safe deployments
**Effort:** 8-10 hours

### Recommended Stack
- **Framework:** Vitest (fast, Vite-compatible)
- **Coverage:** V8 (built into Vitest)
- **Mocking:** Vitest built-in

### Critical Tests Needed

```
dashboard/
├── __tests__/
│   ├── api/
│   │   ├── tasks.test.ts        # Task CRUD operations
│   │   ├── business-config.test.ts
│   │   └── auth.test.ts
│   └── components/
│       └── TaskForm.test.tsx

shared/libs/
├── supabase/__tests__/
│   └── client.test.ts
└── n8n/__tests__/
    └── client.test.ts
```

### Setup Steps
1. `npm install -D vitest @testing-library/react`
2. Add `vitest.config.ts`
3. Update `package.json` scripts
4. Write initial tests
5. Add to CI/CD

---

## Priority 5: Version Control n8n Workflows

**Status:** Pending
**Impact:** Low-Medium - disaster recovery
**Effort:** 3 hours

### Implementation

1. Create backup script:
```bash
#!/bin/bash
# infra/n8n/backup-workflows.sh
N8N_API_KEY=$(node creds.js get global n8n_api_key)
curl -s "https://automation.growthcohq.com/api/v1/workflows" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  | jq '.' > infra/n8n/workflows-backup.json
```

2. Add to cron (daily):
```bash
0 2 * * * /var/www/master-ops/infra/n8n/backup-workflows.sh
```

3. Commit backup to git on change

---

## Progress Tracking

### Completed
- [x] Infrastructure audit
- [x] Improvement roadmap created
- [x] Task automation files verified ready

### In Progress
- [ ] Task processor deployment (waiting for manual n8n import)

### Pending
- [ ] Skill scripts (Priority 2)
- [ ] Agent delegation test (Priority 3)
- [ ] Testing infrastructure (Priority 4)
- [ ] n8n version control (Priority 5)

---

## Next Session Checklist

When resuming work:

1. **First** - Deploy task processor (Priority 1)
   - Follow steps in section above
   - Verify with test task

2. **Then** - Pick next priority based on time available
   - 30 min: n8n backup script
   - 2 hrs: One skill's scripts
   - 4 hrs: Agent delegation test

---

*Ask Co-Founder: "Continue with the improvement roadmap" to resume*
