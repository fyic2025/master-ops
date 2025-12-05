# Master-Ops AI Assistant Configuration

This document defines mandatory behaviors for AI assistants working on the master-ops codebase.

---

## MANDATORY: Skill Check Before Every Task

**Before commencing ANY task, you MUST:**

1. **Review the task requirements** - Understand what is being asked
2. **Check applicable skills** - Scan the skills list below and identify ALL skills that could help
3. **Activate relevant skills** - Use the Skill tool to load each applicable skill before starting work
4. **Follow skill methodologies** - Execute tasks according to the skill's documented procedures

### How to Check Skills

Ask yourself for EVERY task:
- Does this involve a specific platform? → Check platform skills (bigcommerce, shopify, woocommerce)
- Does this involve email? → Check email skills (campaign-manager, template-designer, copywriter, preview-tester, klaviyo)
- Does this involve data/database? → Check supabase-expert
- Does this involve analytics? → Check ga4-analyst, gsc-expert, marketing-analytics-reporter
- Does this involve content? → Check copywriter, description-generator, seo-content-writer skills
- Does this involve automation? → Check n8n-workflow-manager, dashboard-automation
- Does this involve customers? → Check segmentation-engine, churn-predictor skills
- Does this involve web scraping/leads? → Check apify-expert

### Skill Activation Command

To activate a skill, use:
```
/skill skill-name
```

Example: Before writing email copy, activate:
```
/skill email-copywriter
/skill brand-asset-manager
```

---

## Complete Skills Registry (38 Skills)

### E-Commerce Platforms
| Skill | Use When |
|-------|----------|
| `bigcommerce-expert` | Any BOO store operations, products, orders, inventory |
| `shopify-expert` | Any Teelixir or Elevate operations, products, orders, metafields |
| `woocommerce-expert` | Any Red Hill Fresh operations, products, orders, WordPress |

### Email Marketing
| Skill | Use When |
|-------|----------|
| `email-campaign-manager` | Creating, sending, or managing email campaigns (Smartlead, Klaviyo, Gmail) |
| `email-template-designer` | Creating or editing HTML email templates |
| `email-copywriter` | Writing email subject lines, body copy, CTAs |
| `email-preview-tester` | Testing email rendering across clients |
| `klaviyo-expert` | Klaviyo flows, segments, campaigns, A/B tests |

### Analytics & SEO
| Skill | Use When |
|-------|----------|
| `google-ads-manager` | Google Ads campaigns, bidding, search terms, ROAS |
| `ga4-analyst` | Website traffic, conversions, user behavior, attribution |
| `gsc-expert` | Search performance, indexing, rankings, crawl issues |
| `seo-performance-monitor` | Core Web Vitals, technical SEO, ranking tracking |
| `marketing-analytics-reporter` | Cross-channel performance reports |

### Content Creation
| Skill | Use When |
|-------|----------|
| `brand-asset-manager` | Brand colors, fonts, logos, voice guidelines (ALWAYS check first for content tasks) |
| `marketing-copywriter` | Headlines, subject lines, CTAs, ad copy |
| `product-description-generator` | Product descriptions, SEO copy |
| `ad-copy-generator` | Google Ads, Meta Ads, display ad copy |
| `seo-content-writer` | Blog posts, landing pages, category descriptions |

### Social Media
| Skill | Use When |
|-------|----------|
| `social-creative-generator` | Instagram, Facebook, TikTok content creation |
| `social-post-creator` | Social captions, hashtags, scheduling |

### Customer Intelligence
| Skill | Use When |
|-------|----------|
| `customer-segmentation-engine` | RFM analysis, customer segments, Klaviyo sync |
| `customer-churn-predictor` | At-risk customers, retention campaigns |
| `competitor-monitor` | Competitive analysis, pricing intelligence |

### Conversion & Optimization
| Skill | Use When |
|-------|----------|
| `conversion-optimizer` | A/B testing, statistical analysis, CRO |
| `landing-page-builder` | Campaign landing pages, lead gen pages |
| `pricing-optimizer` | Margin analysis, competitive pricing, price changes |
| `website-speed-optimizer` | Page speed, Core Web Vitals, Lighthouse audits |

### Inventory & Fulfillment
| Skill | Use When |
|-------|----------|
| `stock-alert-predictor` | Stock monitoring, supplier alerts, stockout prevention |
| `supplier-performance-scorecard` | Supplier reliability, sync quality |
| `shipping-optimizer` | Shipping rates, carrier selection, zones |

### Infrastructure
| Skill | Use When |
|-------|----------|
| `supabase-expert` | Database queries, migrations, RLS, performance |
| `n8n-workflow-manager` | Automation workflows, n8n troubleshooting |
| `apify-expert` | Web scraping, Google Maps leads, business data extraction |
| `webhook-event-router` | Webhook handling, event routing, replays |
| `integration-tester` | API testing, connection validation |
| `dashboard-automation` | Dashboard metrics, alerts, reports |

### Other
| Skill | Use When |
|-------|----------|
| `review-reputation-manager` | Google reviews, product reviews, reputation |
| `product-image-enhancer` | Image optimization, Cloudinary, alt-text |

---

## Task Type → Required Skills Matrix

### Email Tasks
```
Creating email campaign → email-campaign-manager + brand-asset-manager + email-copywriter
Designing email template → email-template-designer + brand-asset-manager
Testing email rendering → email-preview-tester
Setting up Klaviyo flow → klaviyo-expert + email-copywriter
```

### Product Tasks
```
Updating BOO products → bigcommerce-expert + supabase-expert
Updating Teelixir products → shopify-expert + supabase-expert
Writing product descriptions → product-description-generator + brand-asset-manager
Optimizing product images → product-image-enhancer
```

### Analytics Tasks
```
Analyzing traffic → ga4-analyst
Checking search rankings → gsc-expert + seo-performance-monitor
Creating performance report → marketing-analytics-reporter + ga4-analyst + gsc-expert
Google Ads optimization → google-ads-manager
```

### Content Tasks
```
Writing blog post → seo-content-writer + brand-asset-manager
Creating social posts → social-post-creator + brand-asset-manager
Writing ad copy → ad-copy-generator + brand-asset-manager
Creating landing page → landing-page-builder + brand-asset-manager + marketing-copywriter
```

### Customer Tasks
```
Segmenting customers → customer-segmentation-engine + supabase-expert
Identifying at-risk customers → customer-churn-predictor + customer-segmentation-engine
Creating retention campaign → customer-churn-predictor + email-campaign-manager
```

### Technical Tasks
```
Database operations → supabase-expert
Fixing automation → n8n-workflow-manager + webhook-event-router
Testing integrations → integration-tester
Checking stock levels → stock-alert-predictor + supplier-performance-scorecard
```

### Lead Generation Tasks
```
Scraping Google Maps leads → apify-expert + supabase-expert
Checking Apify usage → apify-expert
Running lead scrapes → apify-expert + n8n-workflow-manager
Processing scraped data → apify-expert + supabase-expert
```

---

## Business Context

This codebase manages 4 e-commerce businesses:

| Business | Platform | Slug | Primary Use |
|----------|----------|------|-------------|
| **Teelixir** | Shopify | `teelixir` | Premium adaptogens & mushrooms |
| **Buy Organics Online (BOO)** | BigCommerce | `boo` | 11K+ organic products marketplace |
| **Elevate Wholesale** | Shopify | `elevate` | B2B wholesale platform |
| **Red Hill Fresh (RHF)** | WooCommerce | `rhf` | Local fresh produce delivery |

When working on any business-specific task, always specify the business slug.

---

## MCP Servers (VS Code Integration)

The following MCP servers are configured in VS Code for direct platform access:

### Database Access
| Server | Project | Capabilities |
|--------|---------|--------------|
| `supabase-teelixir-leads` | teelixir-leads | SQL queries, table design, migrations |
| `supabase-boo` | Buy Organics Online | SQL queries, table design, migrations |
| `supabase-elevate` | Elevate | SQL queries, table design, migrations |

### E-Commerce & Marketing
| Server | Capabilities |
|--------|--------------|
| `shopify-dev` | Shopify API docs, GraphQL schema, dev tools |
| `klaviyo-teelixir` | Teelixir email campaigns, flows, segments |
| `klaviyo-boo` | BOO email campaigns, flows, segments |
| `klaviyo-elevate` | Elevate email campaigns, flows, segments |

### Development & Research
| Server | Capabilities |
|--------|--------------|
| `github` | Repo management, PRs, issues, code search |
| `brave-search` | Web research (2K queries/month) |
| `puppeteer` | Browser automation, scraping, testing |
| `chrome-devtools` | Browser debugging, network inspection, DOM |

### MCP Config Location
```
C:\Users\jayso\AppData\Roaming\Code\User\mcp.json
```

---

## Environment & Credentials

Credentials are stored in Supabase vault. Access via:
```bash
node creds.js get <business> <key>
```

Common keys:
- `shopify_access_token` - Shopify Admin API
- `bigcommerce_access_token` - BigCommerce API
- `klaviyo_api_key` - Klaviyo public API key
- `klaviyo_private_key` - Klaviyo private API key (for MCP)
- `google_refresh_token` - Google APIs (GA4, GSC, Ads)
- `apify_token` - Apify web scraping API (global)
- `github_pat` - GitHub Personal Access Token (global)
- `brave_api_key` - Brave Search API (global)

---

## ⚠️ CRITICAL: Infrastructure & Deployment

### Dashboard (ops.growthcohq.com)

**The dashboard runs on DigitalOcean App Platform - NOT on a droplet!**

| What | Value |
|------|-------|
| Platform | DigitalOcean App Platform |
| App ID | `1a0eed70-aef6-415e-953f-d2b7f0c7c832` |
| URL | https://ops.growthcohq.com |

**To deploy dashboard changes:**
```bash
doctl apps create-deployment 1a0eed70-aef6-415e-953f-d2b7f0c7c832 --force-rebuild
```

**NEVER do this for the dashboard:**
- ❌ Deploy via SCP to droplet
- ❌ Use PM2 on the droplet
- ❌ Restart nginx for this app
- ❌ SSH into droplet to deploy

### Other Services on Droplet (134.199.175.243 / n8n-primary)

| Service | Port | Managed By |
|---------|------|------------|
| n8n | 5678 | Docker |
| gsc-issues-sync | - | PM2 |
| bc-product-sync | - | PM2 |
| boo-gmc-sync | - | PM2 |

For these services, SSH + PM2 restart is correct.

---

## Quality Standards

Before completing any task:

1. **Test your changes** - Run relevant test commands from the skill documentation
2. **Verify integrations** - Ensure changes work with related systems
3. **Document updates** - Update skill documentation if you discover new patterns
4. **Check brand consistency** - Content must match brand voice guidelines

---

## Task Queue Validation Rules

The Task Framework at ops.growthcohq.com manages automated and manual tasks. Follow these rules to maintain queue quality.

### Valid Task Requirements

**Every task MUST have:**
| Field | Requirement |
|-------|-------------|
| `title` | Clear, specific action (verb + noun). Max 80 chars |
| `description` | Detailed context with success criteria |
| `business` | Valid business slug: `teelixir`, `boo`, `elevate`, `rhf`, or `overall` |
| `priority` | P1 (urgent), P2 (normal), P3 (low) |
| `category` | Valid category for the business |
| `execution_type` | `manual` (default) or `auto` |

**Good task titles:**
- ✅ "Fix broken product image on Teelixir Lions Mane page"
- ✅ "Update BOO shipping rates for NSW zones"
- ✅ "Create Klaviyo flow for abandoned cart recovery"

**Bad task titles:**
- ❌ "Document findings and issues" (too vague)
- ❌ "Create optimization recommendations" (no context)
- ❌ "Check things" (meaningless)

### Execution Type Selection

| Choose `auto` when: | Choose `manual` when: |
|---------------------|----------------------|
| Task has clear API-based solution | Requires human judgment |
| Can be verified programmatically | Needs visual/UX review |
| No file system access needed | Requires local file edits |
| Database or API operations | Multi-step creative work |
| Scheduled/recurring tasks | One-time complex changes |

**Auto tasks are processed by n8n every 5 minutes** using the 3-tier model (Haiku → Sonnet → Opus).

### Avoiding Stale Tasks

**DO NOT create tasks for:**
- Session-specific debugging steps (these become stale immediately)
- "Document X" without specific deliverable
- Vague analysis tasks without clear output
- Tasks that depend on ephemeral context

**Session artifacts to avoid:**
```
❌ "Analyze current session findings"
❌ "Document investigation results"
❌ "Create report from analysis"
❌ "Review and summarize"
```

**Instead, be specific:**
```
✅ "Write GSC indexing issues report for BOO - save to /reports/gsc-issues-2024-01.md"
✅ "Create Supabase migration for new customer_segments table"
✅ "Update Klaviyo segment 'VIP Customers' with RFM score > 8"
```

### Task Lifecycle

```
pending → in_progress → completed
              ↓
          failed → (auto-retry up to 3x for auto tasks)
              ↓
          needs_manual (escalated to dashboard)
```

**Status meanings:**
| Status | Description |
|--------|-------------|
| `pending` | Waiting to be picked up |
| `in_progress` | Currently being worked on |
| `completed` | Successfully finished |
| `failed` | Execution failed (will retry if auto) |
| `needs_manual` | Requires human intervention |
| `blocked` | Waiting on external dependency |

### Task Hygiene

**Delete tasks when:**
- Created during a debugging session and no longer relevant
- Superseded by a newer, more specific task
- Business context has changed making task obsolete
- Task has been `pending` for 30+ days without action

**Archive (mark completed) when:**
- Task was manually completed outside the system
- Task is no longer needed but should be kept for records

### Priority Guidelines

| Priority | Use For | Expected Turnaround |
|----------|---------|---------------------|
| P1 | Revenue-impacting, site down, security issues | Same day |
| P2 | Normal feature work, improvements, non-urgent fixes | 1-3 days |
| P3 | Nice-to-have, low-impact optimizations | When time permits |

---

## Skill Documentation Location

All skills are in: `.claude/skills/<skill-name>/`

Each skill contains:
- `SKILL.md` - Full documentation and methodology
- `QUICK-REFERENCE.md` - Quick commands and common tasks
- `scripts/` - Executable TypeScript/JavaScript tools
- `context/` - Domain knowledge and reference data
- `playbooks/` - Step-by-step operational procedures

---

## Reporting Issues

If a skill is missing functionality or has errors:
1. Note the issue in `.claude/skills/NOTES-skill-updates.md`
2. Create a TODO item for the fix
3. Inform the user of the limitation

---

## Remember

**NEVER start a task without first checking which skills apply.**

The skills contain tested methodologies, working scripts, and domain knowledge that will help you complete tasks correctly the first time.
