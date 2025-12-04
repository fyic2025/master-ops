'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import {
  ClipboardList,
  ChevronDown,
  ChevronRight,
  Copy,
  CheckCircle,
  Circle,
  Clock,
  AlertCircle,
  Plus,
  Search,
  X,
  Lightbulb,
  RefreshCw,
  Database,
  MessageSquare,
  Send,
  Archive,
  User
} from 'lucide-react'
import { getAllowedBusinesses, isAdmin } from '@/lib/user-permissions'

// Task Framework Structure
const TASK_FRAMEWORK = {
  overall: {
    name: 'Overall Priorities',
    icon: '🎯',
    categories: {
      dashboard: { name: 'Dashboard' },
      migration: { name: 'Migration' },
      systemChecks: { name: 'System Checks' },
      shipping: { name: 'Shipping' },
      analytics: { name: 'Analytics' },
    }
  },
  teelixir: {
    name: 'Teelixir',
    platform: 'Shopify',
    icon: '🍄',
    color: 'bg-purple-500',
    categories: {
      automations: { name: 'Automations' },
      seo: { name: 'SEO' },
      inventory: { name: 'Inventory Management' },
      email: { name: 'Email Marketing' },
      googleAds: { name: 'Google Ads' },
      analytics: { name: 'Analytics' },
      customers: { name: 'Customer Segments' },
      content: { name: 'Content' },
      deployment: { name: 'Deployment' },
    }
  },
  boo: {
    name: 'Buy Organics Online',
    platform: 'BigCommerce',
    icon: '🛒',
    color: 'bg-green-500',
    categories: {
      automations: { name: 'Automations' },
      seo: { name: 'SEO' },
      inventory: { name: 'Inventory Management' },
      email: { name: 'Email Marketing' },
      googleAds: { name: 'Google Ads' },
      analytics: { name: 'Analytics' },
      customers: { name: 'Customer Segments' },
      pricing: { name: 'Pricing & Margins' },
      content: { name: 'Content' },
      operations: { name: 'Operations' },
      migration: { name: 'Migration' },
    }
  },
  elevate: {
    name: 'Elevate Wholesale',
    platform: 'Shopify B2B',
    icon: '📦',
    color: 'bg-blue-500',
    categories: {
      automations: { name: 'Automations' },
      prospecting: { name: 'Prospecting/Outreach' },
      trials: { name: 'Trial Processing' },
      hubspot: { name: 'HubSpot Sync' },
      inventory: { name: 'Inventory' },
      analytics: { name: 'Analytics' },
    }
  },
  rhf: {
    name: 'Red Hill Fresh',
    platform: 'WooCommerce',
    icon: '🥬',
    color: 'bg-emerald-500',
    categories: {
      automations: { name: 'Automations' },
      seo: { name: 'SEO' },
      inventory: { name: 'Inventory' },
      delivery: { name: 'Local Delivery' },
      analytics: { name: 'Analytics' },
    }
  },
  brandco: {
    name: 'Brand Connections',
    platform: 'Next.js',
    icon: '🤝',
    color: 'bg-amber-500',
    categories: {
      automations: { name: 'Automations' },
      outreach: { name: 'Outreach & Sales' },
      crm: { name: 'CRM & Contacts' },
      content: { name: 'Content' },
      analytics: { name: 'Analytics' },
    }
  },
}

interface Task {
  id: string
  title: string
  description?: string
  status: 'pending_input' | 'scheduled' | 'in_progress' | 'completed' | 'blocked' | 'pending' | 'awaiting_clarification' | 'pending_completion'
  priority: 1 | 2 | 3 | 4
  instructions?: string
  plan?: string // Claude's detailed implementation plan
  needsResearch?: boolean
  source?: string
  business?: string
  category?: string
  fromDb?: boolean
  created_at?: string
  created_by?: string // Who created the task (username or email prefix)
  clarification_request?: string // Question from Claude needing answer
  clarification_response?: string // Response from task creator
  task_type?: 'one_off' | 'recurring' | 'ongoing' | null // Task type for filtering
  // Task assignment and feedback fields
  assigned_to?: string // Email of assigned contractor
  time_on_task_mins?: number // Time spent in minutes
  completion_notes?: string // Feedback notes from assignee
  completion_screenshot_url?: string // Screenshot proof URL
  assigned_at?: string // When task was assigned
  completed_at?: string // When task was completed
}

// Skills mapping for each category
const CATEGORY_SKILLS: Record<string, { skills: string[], focus: string }> = {
  automations: { skills: ['n8n-workflow-manager', 'webhook-event-router'], focus: 'workflows, triggers, scheduled jobs' },
  seo: { skills: ['gsc-expert', 'seo-content-writer', 'seo-performance-monitor'], focus: 'rankings, technical SEO, content optimization' },
  inventory: { skills: ['stock-alert-predictor', 'supplier-performance-scorecard'], focus: 'stock levels, supplier sync, alerts' },
  email: { skills: ['klaviyo-expert', 'email-copywriter', 'email-template-designer'], focus: 'flows, campaigns, templates, segmentation' },
  googleAds: { skills: ['google-ads-manager', 'ad-copy-generator'], focus: 'campaigns, ROAS, bidding, search terms' },
  analytics: { skills: ['ga4-analyst', 'marketing-analytics-reporter'], focus: 'tracking, conversions, dashboards, reports' },
  customers: { skills: ['customer-segmentation-engine', 'customer-churn-predictor'], focus: 'RFM analysis, churn prediction, retention' },
  content: { skills: ['product-description-generator', 'seo-content-writer', 'brand-asset-manager'], focus: 'product copy, blog, landing pages' },
  pricing: { skills: ['pricing-optimizer', 'competitor-monitor'], focus: 'margin analysis, competitive pricing' },
  prospecting: { skills: ['email-campaign-manager'], focus: 'outreach, lead gen, Smartlead campaigns' },
  trials: { skills: ['shopify-expert'], focus: 'trial processing, sample requests' },
  hubspot: { skills: ['integration-tester'], focus: 'CRM sync, deal tracking, contacts' },
  delivery: { skills: ['shipping-optimizer'], focus: 'zones, routes, scheduling' },
  operations: { skills: ['dashboard-automation', 'n8n-workflow-manager'], focus: 'ops hub, process automation' },
  migration: { skills: ['supabase-expert'], focus: 'platform migrations, data moves' },
  systemChecks: { skills: ['integration-tester', 'dashboard-automation'], focus: 'health monitoring, alerts' },
  shipping: { skills: ['shipping-optimizer'], focus: 'carriers, labels, rates' },
  dashboard: { skills: ['supabase-expert', 'dashboard-automation'], focus: 'UI, API, database' },
  deployment: { skills: ['shopify-expert'], focus: 'theme deployment, validation' },
}

// Email addresses for task requesters (for notifications)
const REQUESTER_EMAILS: Record<string, string> = {
  peter: 'peter@teelixir.com',
  maria: 'admin@teelixir.com',
  rajani: 'rajani@teelixir.com',
  jayson: 'jayson@fyic.com.au',
}

// Generate comprehensive prompt for Claude Code planning
function generateClaudePrompt(task: Task): string {
  const businessName = task.business
    ? TASK_FRAMEWORK[task.business as keyof typeof TASK_FRAMEWORK]?.name || task.business
    : 'Overall'

  const categoryName = task.category && task.business
    ? (TASK_FRAMEWORK[task.business as keyof typeof TASK_FRAMEWORK] as any)?.categories?.[task.category]?.name || task.category
    : task.category || 'General'

  const skillInfo = task.category ? CATEGORY_SKILLS[task.category] : null
  const skillList = skillInfo?.skills?.map(s => `- /skill ${s}`).join('\n') || ''

  const priorityLabels: Record<number, string> = {
    1: 'CRITICAL - Urgent',
    2: 'HIGH - This week',
    3: 'MEDIUM - Soon',
    4: 'LOW - Backlog'
  }

  // Determine who created the task and how to follow up
  const createdBy = task.created_by?.toLowerCase() || 'unknown'
  const isAdminTask = createdBy === 'jayson' || createdBy === 'dashboard' || createdBy.includes('jayson')

  // Get requester email for notifications
  const requesterEmail = REQUESTER_EMAILS[createdBy] || null
  const requesterName = task.created_by || 'Unknown'

  // Generate unique reference for email tracking
  const taskRef = `TASK-${task.id?.slice(0, 8) || Date.now().toString(36).toUpperCase()}`

  let followUpInstructions = ''
  if (isAdminTask) {
    followUpInstructions = `
## Follow-up Process (Admin Task)
This task was created by Jayson (admin). If you need clarification:
- **Ask directly** in this conversation window
- No email required - discuss questions here`
  } else {
    // Unified workflow for Peter, Maria, Rajani, and other requesters
    followUpInstructions = `
## Follow-up Process
**Task requested by:** ${requesterName}${requesterEmail ? ` (${requesterEmail})` : ''}

### For Clarifications:
1. **Dashboard (Preferred):** Update task with status "awaiting_clarification":
\`\`\`
PATCH /api/tasks/${task.id || '{task_id}'}
{
  "status": "awaiting_clarification",
  "clarification_request": "Your question here"
}
\`\`\`
2. **Email:** Send to ${requesterEmail || 'requester'} with subject: [${taskRef}] - Question about: ${(task.title || 'Untitled').slice(0, 40)}...

### On Completion:
1. **Update dashboard:** PATCH /api/tasks/${task.id || '{task_id}'} with:
   - status: "completed"
   - completion_notes: "Summary of what was done"
2. **Email ${requesterEmail || 'requester'}** with:
   - Subject: [${taskRef}] Completed: ${(task.title || 'Untitled').slice(0, 40)}
   - Summary of what was accomplished
   - Any follow-up items or notes
3. **Log in task_logs** table with source: 'claude', status: 'completed'`
  }

  return `## Task Planning Request

**Task ID:** ${task.id || 'Not saved yet'}
**Reference:** ${taskRef}
**Title:** ${task.title}
**Business:** ${businessName}
**Category:** ${categoryName}
**Priority:** P${task.priority} (${priorityLabels[task.priority] || 'Unknown'})
**Status:** ${task.status}
**Created By:** ${task.created_by || 'Unknown'}

## Description
${task.description || 'No description provided.'}

## Current Instructions
${task.instructions || 'No detailed instructions yet - this task needs planning.'}

${task.source ? `## Source Reference\n${task.source}\n` : ''}
${task.needsResearch ? '## Note\nThis task is marked as needing research before implementation.\n' : ''}

${skillList ? `## Relevant Skills\nActivate these skills for context:\n${skillList}\n\nFocus areas: ${skillInfo?.focus || 'General implementation'}\n` : ''}

## What Claude Code Should Do

1. **Understand the task** - Review all details above
2. **Research if needed** - Use relevant skills to understand current state
3. **Create a detailed plan** with:
   - Step-by-step implementation approach
   - Files that need to be created or modified
   - Dependencies or blockers to address
   - Success criteria / how to verify completion
4. **If anything is unclear** - Follow the process below to get clarification
5. **Update the task** in the dashboard with your implementation plan

${followUpInstructions}

## After Planning
Once you have a clear plan:
1. Update this task's \`instructions\` field with the detailed plan
2. Change status from 'pending_input' to 'scheduled' (ready for implementation)
3. If blocked, change status to 'blocked' and note the blocker

---
Task Reference: ${taskRef}`
}

// Generate a "build plan" task for empty categories
function generatePlanTask(businessKey: string, categoryKey: string, businessName: string, categoryName: string): Task {
  const skillInfo = CATEGORY_SKILLS[categoryKey] || { skills: [], focus: 'strategy and implementation' }
  const skillList = skillInfo.skills.map(s => `- /skill ${s}`).join('\n')

  return {
    id: `plan-${businessKey}-${categoryKey}`,
    title: `Build ${categoryName.toLowerCase()} plan for ${businessName}`,
    description: `Create a comprehensive plan for ${categoryName.toLowerCase()} covering ${skillInfo.focus}.`,
    status: 'pending',
    priority: 4,
    needsResearch: true,
    instructions: `## Build a Plan: ${businessName} ${categoryName}

Use these skills to research and create a detailed plan:
${skillList || '- Review existing documentation'}

## Focus areas
${skillInfo.focus}

## What to include
1. Current state audit
2. Gap analysis
3. Priority improvements
4. Implementation steps
5. Success metrics

## Steps for Claude Code
1. Activate relevant skills above
2. Research current ${categoryName.toLowerCase()} setup for ${businessName}
3. Identify opportunities and gaps
4. Create prioritized task list
5. Add tasks to this dashboard

After research, create actionable tasks and add them to this dashboard.`
  }
}

// All tasks found in the codebase
const SAMPLE_TASKS: Record<string, Task[]> = {
  'overall.dashboard': [
    {
      id: 'dash-1',
      title: 'Enable task storage in database',
      description: 'Deploy the tasks schema to Supabase so tasks persist across sessions.',
      status: 'completed',
      priority: 1,
      source: 'infra/supabase/schema-tasks.sql',
      instructions: `## COMPLETED
Schema deployed to teelixir-leads project (qcvfxxsnqvdfmpbcgdni).
Tables created: tasks, task_logs
Dashboard API connected and functional.`
    },
    {
      id: 'dash-2',
      title: 'Build task management API',
      description: 'Create REST API endpoints for CRUD operations on tasks.',
      status: 'completed',
      priority: 2,
      instructions: `## COMPLETED
API routes implemented:
- GET /api/tasks - List all tasks with filters
- POST /api/tasks - Create new task with logging
- PATCH /api/tasks/:id - Update status/details
- DELETE /api/tasks/:id - Remove task`
    },
  ],
  'overall.shipping': [
    {
      id: 'ship-1',
      title: 'Update warehouse sender addresses',
      description: 'Replace placeholder addresses with actual warehouse locations for shipping labels.',
      status: 'pending',
      priority: 2,
      source: 'dashboard/src/lib/sender-addresses.ts',
      needsResearch: true,
      instructions: `## What this does
Updates shipping label generation with correct warehouse addresses.

## Research needed
Find the actual warehouse/office addresses for:
- BOO warehouse
- Elevate warehouse
- RHF warehouse

## Steps for Claude Code
1. Read dashboard/src/lib/sender-addresses.ts
2. Ask user for correct warehouse addresses
3. Update the placeholder values
4. Test shipping label generation`
    },
  ],
  'overall.analytics': [
    {
      id: 'ana-1',
      title: 'Set up GA4 property IDs',
      description: 'Add GA4 property IDs to vault for all 4 businesses to enable analytics sync.',
      status: 'blocked',
      priority: 2,
      needsResearch: true,
      instructions: `## What this does
Enables GA4 analytics data sync for traffic reports and conversion tracking.

## Current blocker
GA4 property IDs not stored in Supabase vault. OAuth token may lack analytics.readonly scope.

## Steps for Claude Code
1. Ask user for GA4 property IDs for each business
2. Store in Supabase vault using: node creds.js set <business> ga4_property_id <value>
3. Verify OAuth token has analytics scope
4. Test sync with: /skill ga4-analyst

## Businesses needing setup
- Teelixir
- BOO
- Elevate
- RHF`
    },
  ],
  'overall.migration': [
    {
      id: 'plan-overall-migration',
      title: 'Build migration strategy plan',
      description: 'Create a comprehensive plan for all platform migrations and infrastructure changes.',
      status: 'pending',
      priority: 3,
      needsResearch: true,
      instructions: `## Build a Plan: Migration Strategy

Use these skills to research and create a detailed plan:
- /skill supabase-expert - for database migrations
- /skill n8n-workflow-manager - for automation migrations

## What to include
1. Current infrastructure state for each business
2. Target state and benefits
3. Risk assessment and rollback plans
4. Dependencies and blockers
5. Estimated effort and timeline
6. Step-by-step migration checklist

## Businesses to consider
- BOO: AWS → Supabase migration
- Any other pending platform changes

After research, create actionable tasks and add them to this dashboard.`
    },
  ],
  'overall.systemChecks': [
    {
      id: 'plan-overall-checks',
      title: 'Build system health monitoring plan',
      description: 'Create a plan for comprehensive health checks across all integrations.',
      status: 'pending',
      priority: 3,
      needsResearch: true,
      instructions: `## Build a Plan: System Health Monitoring

Use these skills to research and create a detailed plan:
- /skill integration-tester - test all API connections
- /skill n8n-workflow-manager - check workflow health
- /skill dashboard-automation - review job monitoring

## What to include
1. All integrations that need monitoring (Shopify, BigCommerce, WooCommerce, Klaviyo, etc.)
2. Health check frequency recommendations
3. Alert thresholds and escalation paths
4. Dashboard widgets needed
5. Automated recovery procedures

## Current integrations to audit
- E-commerce platforms (4 businesses)
- Email marketing (Klaviyo)
- CRM (HubSpot)
- Inventory suppliers (Unleashed, Kadac, etc.)

After research, create actionable tasks and add them to this dashboard.`
    },
  ],
  'teelixir.seo': [
    {
      id: 'tlx-seo-1',
      title: 'Investigate low GSC data volume',
      description: 'Only 4 rows synced for Teelixir vs 59K for BOO. Find out why.',
      status: 'pending',
      priority: 3,
      source: '.claude/skills/NOTES-skill-updates.md',
      needsResearch: true,
      instructions: `## What this does
Investigates why Teelixir has minimal GSC data compared to other sites.

## Research needed
1. Check GSC property verification method (URL prefix vs domain)
2. Check data retention settings
3. Compare site age and search visibility
4. Review crawl coverage

## Steps for Claude Code
1. Activate gsc-expert skill
2. Check Teelixir GSC property settings
3. Compare with BOO configuration
4. Report findings and recommend fixes`
    },
  ],
  'teelixir.automations': [
    {
      id: 'plan-tlx-auto',
      title: 'Build Teelixir automation plan',
      description: 'Plan all n8n workflows and scheduled jobs for Teelixir.',
      status: 'pending',
      priority: 3,
      needsResearch: true,
      instructions: `## Build a Plan: Teelixir Automations

Use these skills:
- /skill n8n-workflow-manager - audit existing workflows
- /skill shopify-expert - understand store triggers
- /skill klaviyo-expert - email automation opportunities

## What to include
1. Audit existing n8n workflows for Teelixir
2. Identify gaps (order processing, inventory, marketing)
3. Email flow automations needed
4. Inventory sync requirements
5. Reporting automations

After research, create actionable tasks and add them to this dashboard.`
    },
  ],
  'teelixir.inventory': [
    {
      id: 'tlx-inv-1',
      title: 'Implement Unleashed inventory sync',
      description: 'Complete the Unleashed API integration with HMAC authentication.',
      status: 'pending',
      priority: 2,
      source: 'dashboard/src/app/api/shipping/sync/route.ts:316',
      instructions: `## What this does
Syncs inventory levels from Unleashed to Teelixir Shopify store.

## Technical requirement
Unleashed API requires HMAC signature authentication.

## Steps for Claude Code
1. Read dashboard/src/app/api/shipping/sync/route.ts
2. Find the TODO at line 316 for Unleashed sync
3. Implement HMAC signature generation
4. Test API connection with Unleashed credentials
5. Complete the sync logic`
    },
  ],
  'teelixir.email': [],
  'teelixir.googleAds': [],
  'teelixir.analytics': [],
  'teelixir.customers': [],
  'teelixir.content': [],
  'teelixir.deployment': [
    {
      id: 'tlx-dep-1',
      title: 'Add Liquid syntax validation',
      description: 'Implement automatic Liquid template validation before Shopify theme deployments.',
      status: 'pending',
      priority: 2,
      source: 'agents/tools/deployment-orchestrator.ts:201',
      instructions: `## What this does
Validates Liquid templates before deployment to catch syntax errors early.

## Steps for Claude Code
1. Read agents/tools/deployment-orchestrator.ts
2. Find TODO at line 201
3. Implement Liquid syntax checker
4. Add to pre-deployment validation gates
5. Test with sample templates`
    },
    {
      id: 'tlx-dep-2',
      title: 'Add Core Web Vitals monitoring',
      description: 'Track CWV metrics after deployment to catch performance regressions.',
      status: 'pending',
      priority: 2,
      source: 'agents/tools/deployment-orchestrator.ts:410',
      instructions: `## What this does
Monitors Core Web Vitals (LCP, FID, CLS) after theme deployments.

## Steps for Claude Code
1. Read agents/tools/deployment-orchestrator.ts
2. Find TODO at line 410
3. Implement post-deployment CWV check using PageSpeed API
4. Alert if metrics degrade significantly`
    },
  ],
  'boo.automations': [],
  'boo.seo': [],
  'boo.inventory': [
    {
      id: 'boo-inv-1',
      title: 'Create dispatch problem products table',
      description: 'Set up tracking for products with >80% slow dispatch rates.',
      status: 'pending',
      priority: 1,
      source: 'buy-organics-online/TODO-DISPATCH-ANALYSIS.md',
      instructions: `## What this does
Creates a table to track products with dispatch issues from analysis of 20,000 orders.

## Steps for Claude Code
1. Read buy-organics-online/TODO-DISPATCH-ANALYSIS.md for SQL
2. Run the SQL to create dispatch_problem_products table
3. Run import script: node buy-organics-online/import-problem-products.js
4. Verify data imported correctly

## Impact
Identifies 6 major suppliers with issues: KAD, OB, UN, GBN
Top 10 problem products have 100% slow dispatch rate`
    },
    {
      id: 'boo-inv-2',
      title: 'Get Kadac API URL',
      description: 'Replace hardcoded TODO with actual Kadac API endpoint.',
      status: 'blocked',
      priority: 3,
      source: 'buy-organics-online/sync-kadac-to-supabase.ts:15',
      needsResearch: true,
      instructions: `## What this does
Completes Kadac supplier integration for inventory sync.

## Research needed
Get the actual Kadac API endpoint URL from supplier documentation or contact.

## Steps for Claude Code
1. Ask user for Kadac API documentation
2. Update buy-organics-online/sync-kadac-to-supabase.ts line 15
3. Test API connection
4. Complete sync logic`
    },
  ],
  'boo.email': [],
  'boo.googleAds': [],
  'boo.analytics': [],
  'boo.customers': [],
  'boo.pricing': [],
  'boo.content': [],
  'boo.operations': [
    {
      id: 'boo-ops-1',
      title: 'Build Operations Hub',
      description: 'Complete ops hub with inventory, ordering, customer service, and shipping modules.',
      status: 'pending',
      priority: 3,
      source: 'buy-organics-online/BOO-OPERATIONS-HUB-PLAN.md',
      needsResearch: true,
      instructions: `## What this does
Replaces manual processes with unified operations dashboard.

## Modules planned
- Inventory management (mobile stock entry)
- Supplier ordering automation
- Customer service (LiveChat + email)
- Shipping (AusPost + Sendle)
- Payment matching (Bendigo Bank EFT)

## Steps for Claude Code
1. Read buy-organics-online/BOO-OPERATIONS-HUB-PLAN.md
2. Review existing requirements
3. Propose implementation approach
4. Start with highest-impact module`
    },
  ],
  'boo.migration': [
    {
      id: 'boo-mig-1',
      title: 'Complete AWS to Supabase migration',
      description: 'Migrate BOO from AWS (EC2/RDS) to Supabase. Est. savings: $111/month.',
      status: 'blocked',
      priority: 3,
      source: 'buy-organics-online/NEXT-STEPS-CHECKLIST.md',
      needsResearch: true,
      instructions: `## What this does
Moves BOO infrastructure to Supabase for 82% cost reduction.

## Blockers - need investigation first
1. Server access verification & process documentation
2. Environment variables extraction
3. Database source of truth determination
4. API credential testing
5. Product update mechanism investigation

## Timeline
- Quick path: 3-4 weeks
- Thorough path: 6-8 weeks

## Steps for Claude Code
1. Read buy-organics-online/NEXT-STEPS-CHECKLIST.md
2. Start with prerequisite investigation
3. Document current state
4. Create migration plan`
    },
  ],
  'elevate.automations': [],
  'elevate.prospecting': [],
  'elevate.trials': [],
  'elevate.hubspot': [],
  'elevate.inventory': [
    {
      id: 'elv-inv-1',
      title: 'Implement Unleashed sync for Elevate',
      description: 'Same as Teelixir - needs HMAC authentication for Unleashed API.',
      status: 'pending',
      priority: 2,
      source: 'dashboard/src/app/api/shipping/sync/route.ts',
      instructions: `## What this does
Syncs inventory from Unleashed to Elevate Shopify store.

## Steps
Same as Teelixir Unleashed sync - implement once, apply to both.`
    },
  ],
  'elevate.analytics': [],
  'rhf.automations': [],
  'rhf.seo': [],
  'rhf.inventory': [],
  'rhf.delivery': [],
  'rhf.analytics': [],
  'brandco.automations': [],
  'brandco.outreach': [],
  'brandco.crm': [],
  'brandco.content': [],
  'brandco.analytics': [],
}

function getStatusIcon(status: Task['status']) {
  switch (status) {
    case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />
    case 'in_progress': return <Clock className="w-4 h-4 text-blue-500" />
    case 'blocked': return <AlertCircle className="w-4 h-4 text-red-500" />
    case 'scheduled': return <Circle className="w-4 h-4 text-purple-500" />
    case 'pending_input': return <Circle className="w-4 h-4 text-yellow-500" />
    case 'awaiting_clarification': return <AlertCircle className="w-4 h-4 text-orange-500" />
    default: return <Circle className="w-4 h-4 text-gray-500" />
  }
}

function getPriorityBadge(priority: number) {
  const colors = {
    1: 'bg-red-500/20 text-red-400 border-red-500/30',
    2: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    3: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    4: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  }
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded border ${colors[priority as keyof typeof colors]}`}>
      P{priority}
    </span>
  )
}

function getStatusBadge(status: Task['status']) {
  const config: Record<string, string> = {
    pending: 'bg-gray-500/20 text-gray-400',
    pending_input: 'bg-yellow-500/20 text-yellow-400',
    pending_completion: 'bg-emerald-500/20 text-emerald-400',
    scheduled: 'bg-purple-500/20 text-purple-400',
    in_progress: 'bg-blue-500/20 text-blue-400',
    completed: 'bg-green-500/20 text-green-400',
    blocked: 'bg-red-500/20 text-red-400',
    awaiting_clarification: 'bg-orange-500/20 text-orange-400',
  }
  const labels: Record<string, string> = {
    pending: 'pending',
    pending_input: 'needs planning',
    pending_completion: 'pending completion',
    scheduled: 'ready',
    in_progress: 'in progress',
    completed: 'completed',
    blocked: 'blocked',
    awaiting_clarification: 'needs your input',
  }
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded ${config[status] || config.pending}`}>
      {labels[status] || status.replace('_', ' ')}
    </span>
  )
}

// Robust clipboard copy utility
async function copyTextToClipboard(text: string): Promise<boolean> {
  // Method 1: Modern Clipboard API (works in secure contexts)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (err) {
      console.warn('Clipboard API failed, trying fallback:', err)
    }
  }

  // Method 2: execCommand fallback (deprecated but widely supported)
  try {
    const textArea = document.createElement('textarea')
    textArea.value = text
    // Prevent scrolling to bottom
    textArea.style.cssText = 'position:fixed;top:0;left:0;width:2em;height:2em;padding:0;border:none;outline:none;boxShadow:none;background:transparent;'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()

    // Try to copy
    const success = document.execCommand('copy')
    document.body.removeChild(textArea)

    if (success) return true
    console.warn('execCommand copy returned false')
  } catch (err) {
    console.warn('execCommand fallback failed:', err)
  }

  // Method 3: Selection API fallback
  try {
    const range = document.createRange()
    const tempDiv = document.createElement('div')
    tempDiv.textContent = text
    tempDiv.style.cssText = 'position:fixed;top:-9999px;left:-9999px;'
    document.body.appendChild(tempDiv)
    range.selectNodeContents(tempDiv)
    const selection = window.getSelection()
    if (selection) {
      selection.removeAllRanges()
      selection.addRange(range)
      const success = document.execCommand('copy')
      selection.removeAllRanges()
      document.body.removeChild(tempDiv)
      if (success) return true
    }
  } catch (err) {
    console.warn('Selection API fallback failed:', err)
  }

  return false
}

// Simplified task card for Rajani to update status, time, notes
function RajaniTaskCard({ task, onUpdate }: { task: Task, onUpdate: () => void }) {
  const [status, setStatus] = useState(task.status)
  const [timeSpent, setTimeSpent] = useState(task.time_on_task_mins || 0)
  const [notes, setNotes] = useState(task.completion_notes || '')
  const [screenshotUrl, setScreenshotUrl] = useState(task.completion_screenshot_url || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSaved(false)

    try {
      const updates: Record<string, any> = {
        status,
        time_on_task_mins: timeSpent,
        completion_notes: notes,
        updated_by: 'rajani'
      }

      if (screenshotUrl) {
        updates.completion_screenshot_url = screenshotUrl
      }

      if (status === 'completed' && task.status !== 'completed') {
        updates.completed_at = new Date().toISOString()
      }

      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update task')
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      onUpdate()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const priorityColors: Record<number, string> = {
    1: 'bg-red-500/20 text-red-400 border-red-500/30',
    2: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    3: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    4: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  }

  const statusIcons: Record<string, JSX.Element> = {
    pending: <Circle className="w-4 h-4 text-gray-400" />,
    in_progress: <Clock className="w-4 h-4 text-blue-400" />,
    completed: <CheckCircle className="w-4 h-4 text-green-400" />,
    blocked: <AlertCircle className="w-4 h-4 text-red-400" />,
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      {/* Task header */}
      <div className="flex items-start gap-3 mb-4">
        {statusIcons[status] || <Circle className="w-4 h-4 text-gray-400" />}
        <div className="flex-1">
          <h3 className="text-white font-medium">{task.title}</h3>
          {task.description && (
            <p className="text-gray-400 text-sm mt-1">{task.description}</p>
          )}
          <div className="flex gap-2 mt-2">
            <span className={`text-xs px-2 py-0.5 rounded border ${priorityColors[task.priority]}`}>
              P{task.priority}
            </span>
            <span className="text-xs text-gray-500">
              {task.business}
            </span>
          </div>
        </div>
      </div>

      {/* Instructions section */}
      {task.instructions && (
        <div className="bg-gray-900 rounded p-3 mb-4">
          <p className="text-xs text-gray-500 mb-1">Instructions</p>
          <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans">
            {task.instructions}
          </pre>
        </div>
      )}

      {/* Status and feedback inputs */}
      <div className="space-y-3">
        <div>
          <label className="text-sm text-gray-400 block mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Task['status'])}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          >
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>

        <div>
          <label className="text-sm text-gray-400 block mb-1">
            Time Spent (minutes)
          </label>
          <input
            type="number"
            value={timeSpent}
            onChange={(e) => setTimeSpent(parseInt(e.target.value) || 0)}
            min={0}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          />
        </div>

        <div>
          <label className="text-sm text-gray-400 block mb-1">
            Notes / Feedback
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="What was done? Any issues encountered?"
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          />
        </div>

        <div>
          <label className="text-sm text-gray-400 block mb-1">
            Screenshot URL (optional)
          </label>
          <input
            type="url"
            value={screenshotUrl}
            onChange={(e) => setScreenshotUrl(e.target.value)}
            placeholder="https://..."
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          />
        </div>

        {error && (
          <div className="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded">
            {error}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full py-2 rounded font-medium transition-colors ${
            saved
              ? 'bg-green-600 text-white'
              : 'bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50'
          }`}
        >
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

function TaskCard({ task, onClarificationSubmit }: { task: Task, onClarificationSubmit?: () => void }) {
  const [showDetails, setShowDetails] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiedResearch, setCopiedResearch] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const [clarificationResponse, setClarificationResponse] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [copyModalText, setCopyModalText] = useState('')

  const copyToClipboard = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Always generate text and show modal first
    const text = generateClaudePrompt(task)
    setCopyModalText(text)
    setShowCopyModal(true)

    // Try to copy to clipboard in background
    try {
      const success = await copyTextToClipboard(text)
      if (success) {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      // Ignore clipboard errors - modal is already showing
    }
  }

  const copyResearchPrompt = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const text = `## Research Task: ${task.title}

${task.description}

## What I need you to do
1. Investigate this task and understand what's needed
2. Find any missing information or blockers
3. Update the task with clear next steps
4. If ready to implement, provide detailed instructions

## Current information
${task.instructions || 'No detailed instructions yet.'}

## Source file
${task.source || 'Not specified'}

After research, update this task in the dashboard with your findings.`

    const success = await copyTextToClipboard(text)

    if (success) {
      setCopiedResearch(true)
      setTimeout(() => setCopiedResearch(false), 2000)
    } else {
      alert('Failed to copy to clipboard. Please try again.')
    }
  }

  const handleSubmitClarification = async () => {
    if (!clarificationResponse.trim() || !task.id) return

    setSubmitting(true)
    setSubmitError('')

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clarification_response: clarificationResponse,
          status: 'pending_input', // Move back to pending for Claude to review
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit response')
      }

      setClarificationResponse('')
      onClarificationSubmit?.()
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  const hasClarificationRequest = task.status === 'awaiting_clarification' && task.clarification_request

  return (
    <div className={`bg-gray-800/50 border rounded-lg overflow-hidden ${
      hasClarificationRequest ? 'border-orange-500/50' : 'border-gray-700'
    }`}>
      <div className="p-3">
        <div className="flex items-start gap-3">
          {getStatusIcon(task.status)}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-white text-sm font-medium">{task.title}</span>
              {getPriorityBadge(task.priority)}
              {getStatusBadge(task.status)}
              {task.needsResearch && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 flex items-center gap-1">
                  <Lightbulb className="w-3 h-3" />
                  needs research
                </span>
              )}
            </div>
            {task.description && (
              <p className="text-gray-400 text-sm">{task.description}</p>
            )}
            {task.source && (
              <p className="text-gray-500 text-xs mt-1">Source: {task.source}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 ml-7 flex-wrap">
          {task.instructions && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
            >
              {showDetails ? 'Hide details' : 'View details'}
            </button>
          )}
          <button
            onClick={copyToClipboard}
            className={`text-xs px-2 py-1 text-white rounded flex items-center gap-1 transition-colors ${
              copyError
                ? 'bg-red-600 hover:bg-red-500'
                : copied
                ? 'bg-green-600 hover:bg-green-500'
                : 'bg-blue-600 hover:bg-blue-500'
            }`}
          >
            {copyError ? (
              <>
                <AlertCircle className="w-3 h-3" />
                Failed
              </>
            ) : copied ? (
              <>
                <CheckCircle className="w-3 h-3" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy for Claude
              </>
            )}
          </button>
          {task.needsResearch && (
            <button
              onClick={copyResearchPrompt}
              className="text-xs px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded flex items-center gap-1 transition-colors"
            >
              {copiedResearch ? (
                <>
                  <CheckCircle className="w-3 h-3" />
                  Copied!
                </>
              ) : (
                <>
                  <Lightbulb className="w-3 h-3" />
                  Research this
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Clarification Request Panel */}
      {hasClarificationRequest && (
        <div className="border-t border-orange-500/30 bg-orange-500/5 p-3">
          <div className="flex items-start gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-orange-400 text-sm font-medium mb-1">Clarification Needed</p>
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{task.clarification_request}</p>
            </div>
          </div>

          {submitError && (
            <div className="mb-2 text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">
              {submitError}
            </div>
          )}

          <div className="flex gap-2">
            <textarea
              value={clarificationResponse}
              onChange={(e) => setClarificationResponse(e.target.value)}
              placeholder="Type your response here..."
              rows={2}
              className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
            />
            <button
              onClick={handleSubmitClarification}
              disabled={!clarificationResponse.trim() || submitting}
              className="px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded flex items-center gap-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <span className="animate-spin">...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Previous clarification response (if any) */}
      {task.clarification_response && !hasClarificationRequest && (
        <div className="border-t border-gray-700 bg-gray-900/30 p-3">
          <p className="text-xs text-gray-500 mb-1">Previous response:</p>
          <p className="text-gray-400 text-sm">{task.clarification_response}</p>
        </div>
      )}

      {showDetails && task.instructions && (
        <div className="border-t border-gray-700 bg-gray-900/50 p-3">
          <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
            {task.instructions}
          </pre>
        </div>
      )}

      {/* Copy Modal for manual copying when clipboard fails */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowCopyModal(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-white font-medium">Copy for Claude - {task.title}</h3>
              <button onClick={() => setShowCopyModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-hidden">
              <p className="text-sm text-gray-400 mb-2">Select all (Ctrl+A) and copy (Ctrl+C):</p>
              <textarea
                readOnly
                value={copyModalText}
                className="w-full h-[60vh] bg-gray-800 text-gray-200 text-sm font-mono p-3 rounded border border-gray-600 resize-none focus:outline-none focus:border-blue-500"
                onFocus={(e) => e.target.select()}
              />
            </div>
            <div className="p-4 border-t border-gray-700 flex justify-end gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(copyModalText).then(() => {
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                    setShowCopyModal(false)
                  }).catch(() => {
                    alert('Please manually select and copy the text')
                  })
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm"
              >
                Try Copy Again
              </button>
              <button onClick={() => setShowCopyModal(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CategorySection({
  businessKey,
  businessName,
  categoryKey,
  category,
  tasks,
  onRefetch
}: {
  businessKey: string
  businessName: string
  categoryKey: string
  category: { name: string }
  tasks: Task[]
  onRefetch?: () => void
}) {
  const [expanded, setExpanded] = useState(tasks.length > 0)

  // Generate a plan task for empty categories
  const displayTasks = tasks.length > 0
    ? tasks
    : [generatePlanTask(businessKey, categoryKey, businessName, category.name)]

  return (
    <div className="border-l-2 border-gray-700 pl-4 ml-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm text-gray-300 hover:text-white py-1 w-full text-left"
      >
        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        {category.name}
        {tasks.length > 0 ? (
          <span className="text-xs bg-gray-700 px-1.5 py-0.5 rounded ml-auto">{tasks.length}</span>
        ) : (
          <span className="text-xs bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded ml-auto">plan</span>
        )}
      </button>

      {expanded && (
        <div className="space-y-3 mt-2 ml-6">
          {displayTasks.map(task => <TaskCard key={task.id} task={task} onClarificationSubmit={onRefetch} />)}
        </div>
      )}
    </div>
  )
}

function BusinessSection({
  businessKey,
  business,
  dbTasks,
  onRefetch
}: {
  businessKey: string
  business: typeof TASK_FRAMEWORK.teelixir
  dbTasks?: Record<string, Task[]>
  onRefetch?: () => void
}) {
  const [expanded, setExpanded] = useState(true)

  // Use merged tasks if provided, otherwise fall back to SAMPLE_TASKS
  const tasksSource = dbTasks || SAMPLE_TASKS

  const totalTasks = Object.entries(business.categories).reduce((sum, [catKey]) => {
    const key = `${businessKey}.${catKey}`
    return sum + (tasksSource[key]?.length || 0)
  }, 0)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 hover:bg-gray-800/50 transition-colors"
      >
        <span className="text-2xl">{business.icon}</span>
        <div className="flex-1 text-left">
          <h3 className="text-white font-medium">{business.name}</h3>
          {'platform' in business && (
            <p className="text-gray-500 text-xs">{business.platform}</p>
          )}
        </div>
        {totalTasks > 0 && (
          <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded">
            {totalTasks} tasks
          </span>
        )}
        {expanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
      </button>

      {expanded && (
        <div className="p-4 pt-0 space-y-2">
          {Object.entries(business.categories).map(([catKey, category]) => (
            <CategorySection
              key={catKey}
              businessKey={businessKey}
              businessName={business.name}
              categoryKey={catKey}
              category={category}
              tasks={tasksSource[`${businessKey}.${catKey}`] || []}
              onRefetch={onRefetch}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Add Task Modal
function AddTaskModal({
  isOpen,
  onClose,
  onSuccess,
  allowedBusinesses,
  userEmail
}: {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  allowedBusinesses: string[]
  userEmail?: string | null
}) {
  const [business, setBusiness] = useState('')
  const [category, setCategory] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<1 | 2 | 3 | 4>(2)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Filter TASK_FRAMEWORK by allowed businesses
  const availableBusinesses = Object.entries(TASK_FRAMEWORK).filter(([key]) =>
    allowedBusinesses.includes(key)
  )

  const categories = business ? Object.entries(TASK_FRAMEWORK[business as keyof typeof TASK_FRAMEWORK]?.categories || {}) : []

  const resetForm = () => {
    setBusiness('')
    setCategory('')
    setTitle('')
    setDescription('')
    setPriority(2)
    setError('')
  }

  const handleSubmit = async () => {
    setSaving(true)
    setError('')

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || null,
          business,
          category,
          priority,
          status: 'pending_input', // New tasks await Claude planning
          created_by: userEmail?.split('@')[0] || 'dashboard'
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create task')
      }

      // Success - reset form and close
      resetForm()
      onSuccess?.()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save task')
    } finally {
      setSaving(false)
    }
  }

  const handleCopyOnly = async () => {
    const taskData = `## New Task to Add

**Business:** ${business}
**Category:** ${category}
**Title:** ${title}
**Description:** ${description}
**Priority:** P${priority}

## Instructions for Claude Code
Add this task to the dashboard.`

    const success = await copyTextToClipboard(taskData)
    if (success) {
      alert('Task copied to clipboard!')
    } else {
      alert('Failed to copy to clipboard. Please try again.')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Add New Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Business</label>
            <select
              value={business}
              onChange={(e) => { setBusiness(e.target.value); setCategory('') }}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
            >
              <option value="">Select business...</option>
              {availableBusinesses.map(([key, biz]) => (
                <option key={key} value={key}>{biz.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={!business}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white disabled:opacity-50"
            >
              <option value="">Select category...</option>
              <option value="unsure">Not sure / Other</option>
              {categories.map(([key, cat]) => (
                <option key={key} value={key}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details..."
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Priority</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p as 1 | 2 | 3 | 4)}
                  className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                    priority === p
                      ? p === 1 ? 'bg-red-500 text-white' :
                        p === 2 ? 'bg-orange-500 text-white' :
                        p === 3 ? 'bg-yellow-500 text-black' :
                        'bg-gray-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  P{p}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-between gap-3 p-4 border-t border-gray-700">
          <button
            onClick={handleCopyOnly}
            disabled={!business || !category || !title}
            className="px-4 py-2 text-gray-400 hover:text-white border border-gray-600 rounded disabled:opacity-50"
          >
            Copy Only
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!business || !category || !title || saving}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Saving...
                </>
              ) : (
                'Save Task'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Fetch tasks from database
async function fetchDbTasks(): Promise<Task[]> {
  try {
    const response = await fetch('/api/tasks')
    if (!response.ok) return []
    const data = await response.json()
    return (data.tasks || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority || 2,
      instructions: t.instructions,
      source: t.source_file,
      needsResearch: t.needs_research,
      business: t.business,
      category: t.category,
      fromDb: true, // Mark as from database
      created_at: t.created_at,
      created_by: t.created_by,
      clarification_request: t.clarification_request,
      clarification_response: t.clarification_response,
      task_type: t.task_type,
    }))
  } catch {
    return []
  }
}

// Merge hardcoded and database tasks
function mergeTasksWithDb(dbTasks: Task[]): Record<string, Task[]> {
  const merged = { ...SAMPLE_TASKS }

  // Add database tasks to their appropriate categories
  for (const task of dbTasks) {
    const key = `${task.business || 'overall'}.${task.category || 'dashboard'}`
    if (!merged[key]) {
      merged[key] = []
    }
    // Don't add duplicates (check by title)
    if (!merged[key].some(t => t.title === task.title)) {
      merged[key].push(task)
    }
  }

  return merged
}

export default function TasksPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [priorityFilter, setPriorityFilter] = useState<number | null>(null)
  const [showAllBusiness, setShowAllBusiness] = useState(false)
  const [showArchive, setShowArchive] = useState(false)
  const [peterFilter, setPeterFilter] = useState(false)
  const [rajaniFilter, setRajaniFilter] = useState(false)
  const [mariaFilter, setMariaFilter] = useState(false)
  const { data: session } = useSession()

  // DEV: Allow ?viewAs=peter@teelixir.com to test other user views
  const [viewAsEmail, setViewAsEmail] = useState<string | null>(null)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const viewAs = params.get('viewAs')
    if (viewAs) setViewAsEmail(viewAs)
  }, [])

  const userEmail = viewAsEmail || session?.user?.email

  // Get allowed businesses for current user
  const allowedBusinesses = useMemo(() => {
    const businesses = getAllowedBusinesses(userEmail)
    // Map 'home' to 'overall' for task framework
    return businesses.map(b => b === 'home' ? 'overall' : b)
  }, [userEmail])

  const userIsAdmin = isAdmin(userEmail)

  // Fetch tasks from database
  const { data: dbTasks = [], refetch, isLoading, error } = useQuery({
    queryKey: ['tasks'],
    queryFn: fetchDbTasks,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  // Filter db tasks by user's allowed businesses
  const filteredDbTasks = useMemo(() => {
    if (userIsAdmin) return dbTasks
    return dbTasks.filter(t => {
      const taskBusiness = t.business || 'overall'
      return allowedBusinesses.includes(taskBusiness as any)
    })
  }, [dbTasks, allowedBusinesses, userIsAdmin])

  // Merge hardcoded tasks with database tasks, then filter by allowed businesses
  const allTasksGrouped = useMemo(() => {
    const merged = mergeTasksWithDb(filteredDbTasks)
    if (userIsAdmin) return merged

    // Filter out tasks from businesses user can't access
    const filtered: Record<string, Task[]> = {}
    for (const [key, tasks] of Object.entries(merged)) {
      const [business] = key.split('.')
      if (allowedBusinesses.includes(business as any)) {
        filtered[key] = tasks
      }
    }
    return filtered
  }, [filteredDbTasks, allowedBusinesses, userIsAdmin])

  const allTasks = Object.values(allTasksGrouped).flat()

  // Separate archived tasks (completed one-off tasks)
  const archivedTasks = useMemo(() => {
    return allTasks.filter(t => t.status === 'completed' && t.task_type === 'one_off')
  }, [allTasks])

  // Active tasks (excludes completed one-off tasks)
  const activeTasks = useMemo(() => {
    return allTasks.filter(t => !(t.status === 'completed' && t.task_type === 'one_off'))
  }, [allTasks])

  // Filter TASK_FRAMEWORK by allowed businesses
  const filteredFramework = useMemo(() => {
    if (userIsAdmin) return TASK_FRAMEWORK
    const filtered: Record<string, any> = {}
    for (const [key, value] of Object.entries(TASK_FRAMEWORK)) {
      if (allowedBusinesses.includes(key as any)) {
        filtered[key] = value
      }
    }
    return filtered as typeof TASK_FRAMEWORK
  }, [allowedBusinesses, userIsAdmin])

  // Priority counts (excludes archived one-off tasks)
  const p1Count = activeTasks.filter(t => t.priority === 1 && t.status !== 'completed').length
  const p2Count = activeTasks.filter(t => t.priority === 2 && t.status !== 'completed').length
  const p3Count = activeTasks.filter(t => t.priority === 3 && t.status !== 'completed').length
  const p4Count = activeTasks.filter(t => t.priority === 4 && t.status !== 'completed').length

  // Peter's tasks count and filter
  const peterTasks = useMemo(() => {
    return filteredDbTasks.filter(t => {
      const createdBy = t.created_by?.toLowerCase() || ''
      return createdBy === 'peter' || createdBy.includes('peter')
    })
  }, [filteredDbTasks])

  const peterTasksCount = peterTasks.filter(t => t.status !== 'completed').length

  // Rajani's assigned tasks
  const rajaniTasks = useMemo(() => {
    return filteredDbTasks.filter(t =>
      t.assigned_to?.toLowerCase() === 'rajani@teelixir.com'
    )
  }, [filteredDbTasks])

  const rajaniTasksCount = rajaniTasks.filter(t => t.status !== 'completed').length

  // Check if current user is Rajani for simplified view
  const isRajaniView = userEmail?.toLowerCase() === 'rajani@teelixir.com'

  // Maria's assigned tasks
  const mariaTasks = useMemo(() => {
    return filteredDbTasks.filter(t =>
      t.assigned_to?.toLowerCase() === 'admin@teelixir.com'
    )
  }, [filteredDbTasks])

  const mariaTasksCount = mariaTasks.filter(t => t.status !== 'completed').length

  // Check if current user is Maria for simplified view
  const isMariaView = userEmail?.toLowerCase() === 'admin@teelixir.com'

  // Tasks needing planning (pending_input status or new db tasks without a plan)
  // Also includes pending_completion for Peter to review and close
  const pendingInputTasks = useMemo(() => {
    return filteredDbTasks.filter(t =>
      t.status === 'pending_input' ||
      t.status === 'pending_completion' ||
      (t.status === 'pending' && !t.instructions && t.fromDb)
    ).sort((a, b) => a.priority - b.priority)
  }, [filteredDbTasks])

  // Ready to action tasks (scheduled or pending with instructions, sorted by priority)
  const readyToActionTasks = useMemo(() => {
    return activeTasks
      .filter(t =>
        t.status !== 'completed' &&
        t.status !== 'pending_input' &&
        t.status !== 'blocked' &&
        (t.instructions || t.status === 'scheduled')
      )
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 5)
  }, [activeTasks])

  // Filter tasks by priority when clicked (excludes archived)
  const displayedTasks = useMemo(() => {
    if (!priorityFilter) return null
    return activeTasks
      .filter(t => t.priority === priorityFilter && t.status !== 'completed')
      .sort((a, b) => {
        // Sort by status: in_progress first, then scheduled, then pending
        const statusOrder = { in_progress: 0, scheduled: 1, pending: 2, pending_input: 3, blocked: 4 }
        return (statusOrder[a.status as keyof typeof statusOrder] || 3) - (statusOrder[b.status as keyof typeof statusOrder] || 3)
      })
  }, [activeTasks, priorityFilter])

  const handleTaskAdded = useCallback(() => {
    refetch()
  }, [refetch])

  // Check if viewing as Peter for custom header
  const isPeterView = userEmail?.toLowerCase().includes('peter')

  // Rajani's simplified view - show only her assigned tasks
  if (isRajaniView) {
    const activeRajaniTasks = rajaniTasks.filter(t => t.status !== 'completed')
    const completedRajaniTasks = rajaniTasks.filter(t => t.status === 'completed')

    return (
      <div className="space-y-6">
        <header className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <ClipboardList className="w-8 h-8 text-teal-400" />
              My Tasks
            </h1>
            <p className="text-gray-400 mt-1">
              {activeRajaniTasks.length} active task{activeRajaniTasks.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </header>

        {/* Active Tasks */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-white">Active Tasks</h2>
          {activeRajaniTasks.length > 0 ? (
            activeRajaniTasks
              .sort((a, b) => a.priority - b.priority)
              .map(task => (
                <RajaniTaskCard key={task.id} task={task} onUpdate={refetch} />
              ))
          ) : (
            <div className="text-center py-8 text-gray-500 bg-gray-800/50 rounded-lg">
              No active tasks assigned. Check back later!
            </div>
          )}
        </div>

        {/* Completed Tasks */}
        {completedRajaniTasks.length > 0 && (
          <div className="border-t border-gray-700 pt-6">
            <h2 className="text-lg font-medium text-gray-300 mb-4">
              Completed Tasks ({completedRajaniTasks.length})
            </h2>
            <div className="space-y-2">
              {completedRajaniTasks.slice(0, 5).map(task => (
                <div key={task.id} className="bg-gray-800/50 rounded p-3 text-sm text-gray-400">
                  <span className="text-green-400 mr-2">✓</span>
                  {task.title}
                  {task.time_on_task_mins && task.time_on_task_mins > 0 && (
                    <span className="ml-2 text-gray-500">({task.time_on_task_mins} mins)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggest Task Button - will be implemented with suggestions API */}
        <div className="border-t border-gray-700 pt-6">
          <button
            onClick={() => alert('Suggestion feature coming soon! For now, contact Jayson directly with your automation ideas.')}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500"
          >
            <Lightbulb className="w-4 h-4" />
            Suggest Task for Automation
          </button>
        </div>
      </div>
    )
  }

  // Maria's simplified view - show only her assigned tasks
  if (isMariaView) {
    const activeMariaTasks = mariaTasks.filter(t => t.status !== 'completed')
    const completedMariaTasks = mariaTasks.filter(t => t.status === 'completed')

    return (
      <div className="space-y-6">
        <header className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <ClipboardList className="w-8 h-8 text-pink-400" />
              My Tasks
            </h1>
            <p className="text-gray-400 mt-1">
              {activeMariaTasks.length} active task{activeMariaTasks.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </header>

        {/* Active Tasks */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-white">Active Tasks</h2>
          {activeMariaTasks.length > 0 ? (
            activeMariaTasks
              .sort((a, b) => a.priority - b.priority)
              .map(task => (
                <RajaniTaskCard key={task.id} task={task} onUpdate={refetch} />
              ))
          ) : (
            <div className="text-center py-8 text-gray-500 bg-gray-800/50 rounded-lg">
              No active tasks assigned. Check back later!
            </div>
          )}
        </div>

        {/* Completed Tasks */}
        {completedMariaTasks.length > 0 && (
          <div className="border-t border-gray-700 pt-6">
            <h2 className="text-lg font-medium text-gray-300 mb-4">
              Completed Tasks ({completedMariaTasks.length})
            </h2>
            <div className="space-y-2">
              {completedMariaTasks.slice(0, 5).map(task => (
                <div key={task.id} className="bg-gray-800/50 rounded p-3 text-sm text-gray-400">
                  <span className="text-green-400 mr-2">✓</span>
                  {task.title}
                  {task.time_on_task_mins && task.time_on_task_mins > 0 && (
                    <span className="ml-2 text-gray-500">({task.time_on_task_mins} mins)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggest Task Button */}
        <div className="border-t border-gray-700 pt-6">
          <button
            onClick={() => alert('Suggestion feature coming soon! For now, contact Jayson directly with your automation ideas.')}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500"
          >
            <Lightbulb className="w-4 h-4" />
            Suggest Task for Automation
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-start">
        <div>
          {isPeterView ? (
            <>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <span className="text-3xl">💡</span>
                Growth Hacking HQ
              </h1>
              <p className="text-gray-400 mt-1 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-full text-xs text-purple-300">
                  Authorised Business Strategist Access Only
                </span>
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <ClipboardList className="w-8 h-8" />
                Task Framework
              </h1>
              <p className="text-gray-400 mt-1">
                Priority-driven task management
              </p>
            </>
          )}
        </div>
        <div className="flex gap-2">
          {/* Peter Filter Button */}
          {peterTasksCount > 0 && (
            <button
              onClick={() => {
                setPeterFilter(!peterFilter)
                if (!peterFilter) setPriorityFilter(null) // Clear priority filter when enabling Peter filter
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                peterFilter
                  ? 'bg-amber-600 text-white hover:bg-amber-500'
                  : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30'
              }`}
              title="Show tasks created by Peter"
            >
              <User className="w-4 h-4" />
              Peter&apos;s Tasks
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                peterFilter ? 'bg-amber-700' : 'bg-amber-500/30'
              }`}>
                {peterTasksCount}
              </span>
            </button>
          )}
          {/* Rajani Filter Button - visible to admins */}
          {userIsAdmin && rajaniTasksCount > 0 && (
            <button
              onClick={() => {
                setRajaniFilter(!rajaniFilter)
                if (!rajaniFilter) {
                  setPriorityFilter(null)
                  setPeterFilter(false)
                }
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                rajaniFilter
                  ? 'bg-teal-600 text-white hover:bg-teal-500'
                  : 'bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 border border-teal-500/30'
              }`}
              title="Show tasks assigned to Rajani"
            >
              <User className="w-4 h-4" />
              Rajani&apos;s Tasks
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                rajaniFilter ? 'bg-teal-700' : 'bg-teal-500/30'
              }`}>
                {rajaniTasksCount}
              </span>
            </button>
          )}
          {/* Maria Filter Button - visible to admins */}
          {userIsAdmin && mariaTasksCount > 0 && (
            <button
              onClick={() => {
                setMariaFilter(!mariaFilter)
                if (!mariaFilter) {
                  setPriorityFilter(null)
                  setPeterFilter(false)
                  setRajaniFilter(false)
                }
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                mariaFilter
                  ? 'bg-pink-600 text-white hover:bg-pink-500'
                  : 'bg-pink-500/20 text-pink-400 hover:bg-pink-500/30 border border-pink-500/30'
              }`}
              title="Show tasks assigned to Maria"
            >
              <User className="w-4 h-4" />
              Maria&apos;s Tasks
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                mariaFilter ? 'bg-pink-700' : 'bg-pink-500/30'
              }`}>
                {mariaTasksCount}
              </span>
            </button>
          )}
          <button
            onClick={() => {
              console.log('Refresh clicked, refetching...')
              refetch()
            }}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
            title="Refresh tasks"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading && <span className="text-xs">Loading...</span>}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-yellow-400 text-sm">
          <strong>Note:</strong> Could not load tasks from database. Showing hardcoded tasks only.
        </div>
      )}

      {/* Priority Stats - Clickable to filter */}
      <div className="grid grid-cols-4 gap-4">
        <button
          onClick={() => {
            setPriorityFilter(priorityFilter === 1 ? null : 1)
            setPeterFilter(false)
            setRajaniFilter(false)
            setMariaFilter(false)
          }}
          className={`bg-gray-900 border rounded-lg p-4 text-left transition-all hover:border-red-500/50 ${
            priorityFilter === 1 ? 'border-red-500 ring-2 ring-red-500/20' : 'border-gray-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-red-400 text-sm font-medium">P1 Critical</p>
            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">urgent</span>
          </div>
          <p className="text-3xl font-bold text-red-400 mt-1">{p1Count}</p>
          <p className="text-xs text-gray-500 mt-1">Click to view</p>
        </button>
        <button
          onClick={() => {
            setPriorityFilter(priorityFilter === 2 ? null : 2)
            setPeterFilter(false)
            setRajaniFilter(false)
            setMariaFilter(false)
          }}
          className={`bg-gray-900 border rounded-lg p-4 text-left transition-all hover:border-orange-500/50 ${
            priorityFilter === 2 ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-gray-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-orange-400 text-sm font-medium">P2 High</p>
            <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded">this week</span>
          </div>
          <p className="text-3xl font-bold text-orange-400 mt-1">{p2Count}</p>
          <p className="text-xs text-gray-500 mt-1">Click to view</p>
        </button>
        <button
          onClick={() => {
            setPriorityFilter(priorityFilter === 3 ? null : 3)
            setPeterFilter(false)
            setRajaniFilter(false)
            setMariaFilter(false)
          }}
          className={`bg-gray-900 border rounded-lg p-4 text-left transition-all hover:border-yellow-500/50 ${
            priorityFilter === 3 ? 'border-yellow-500 ring-2 ring-yellow-500/20' : 'border-gray-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-yellow-400 text-sm font-medium">P3 Medium</p>
            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">soon</span>
          </div>
          <p className="text-3xl font-bold text-yellow-400 mt-1">{p3Count}</p>
          <p className="text-xs text-gray-500 mt-1">Click to view</p>
        </button>
        <button
          onClick={() => {
            setPriorityFilter(priorityFilter === 4 ? null : 4)
            setPeterFilter(false)
            setRajaniFilter(false)
            setMariaFilter(false)
          }}
          className={`bg-gray-900 border rounded-lg p-4 text-left transition-all hover:border-gray-500/50 ${
            priorityFilter === 4 ? 'border-gray-500 ring-2 ring-gray-500/20' : 'border-gray-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm font-medium">P4 Low</p>
            <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded">backlog</span>
          </div>
          <p className="text-3xl font-bold text-gray-400 mt-1">{p4Count}</p>
          <p className="text-xs text-gray-500 mt-1">Click to view</p>
        </button>
      </div>

      {/* Peter Filter Results */}
      {peterFilter && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-amber-400 font-medium flex items-center gap-2">
              <User className="w-5 h-5" />
              Peter&apos;s Tasks ({peterTasks.filter(t => t.status !== 'completed').length} active)
            </h3>
            <button
              onClick={() => setPeterFilter(false)}
              className="text-gray-400 hover:text-white text-sm flex items-center gap-1"
            >
              <X className="w-4 h-4" /> Close
            </button>
          </div>
          <div className="space-y-2">
            {peterTasks
              .sort((a, b) => {
                // Sort by status first (non-completed first), then by priority
                if (a.status === 'completed' && b.status !== 'completed') return 1
                if (a.status !== 'completed' && b.status === 'completed') return -1
                return a.priority - b.priority
              })
              .map(task => (
                <TaskCard key={task.id} task={task} onClarificationSubmit={refetch} />
              ))}
            {peterTasks.length === 0 && (
              <p className="text-gray-500 text-sm">No tasks from Peter found</p>
            )}
          </div>
        </div>
      )}

      {/* Rajani Filter Results */}
      {rajaniFilter && (
        <div className="bg-teal-500/10 border border-teal-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-teal-400 font-medium flex items-center gap-2">
              <User className="w-5 h-5" />
              Rajani&apos;s Tasks ({rajaniTasks.filter(t => t.status !== 'completed').length} active)
            </h3>
            <button
              onClick={() => setRajaniFilter(false)}
              className="text-gray-400 hover:text-white text-sm flex items-center gap-1"
            >
              <X className="w-4 h-4" /> Close
            </button>
          </div>
          <div className="space-y-3">
            {rajaniTasks
              .sort((a, b) => {
                if (a.status === 'completed' && b.status !== 'completed') return 1
                if (a.status !== 'completed' && b.status === 'completed') return -1
                return a.priority - b.priority
              })
              .map(task => (
                <div key={task.id} className="bg-gray-800/50 rounded-lg p-3">
                  <TaskCard task={task} onClarificationSubmit={refetch} />
                  {/* Show completion feedback for admins */}
                  {task.status === 'completed' && (task.completion_notes || task.time_on_task_mins) && (
                    <div className="mt-2 pt-2 border-t border-gray-700 text-sm space-y-1">
                      {task.time_on_task_mins && task.time_on_task_mins > 0 && (
                        <p className="text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Time: {task.time_on_task_mins} mins
                        </p>
                      )}
                      {task.completion_notes && (
                        <p className="text-gray-400">
                          <span className="text-gray-500">Notes:</span> {task.completion_notes}
                        </p>
                      )}
                      {task.completion_screenshot_url && (
                        <a
                          href={task.completion_screenshot_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-teal-400 hover:underline text-xs inline-block"
                        >
                          View Screenshot
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            {rajaniTasks.length === 0 && (
              <p className="text-gray-500 text-sm">No tasks assigned to Rajani</p>
            )}
          </div>
        </div>
      )}

      {/* Maria Filter Results */}
      {mariaFilter && (
        <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-pink-400 font-medium flex items-center gap-2">
              <User className="w-5 h-5" />
              Maria&apos;s Tasks ({mariaTasks.filter(t => t.status !== 'completed').length} active)
            </h3>
            <button
              onClick={() => setMariaFilter(false)}
              className="text-gray-400 hover:text-white text-sm flex items-center gap-1"
            >
              <X className="w-4 h-4" /> Close
            </button>
          </div>
          <div className="space-y-3">
            {mariaTasks
              .sort((a, b) => {
                if (a.status === 'completed' && b.status !== 'completed') return 1
                if (a.status !== 'completed' && b.status === 'completed') return -1
                return a.priority - b.priority
              })
              .map(task => (
                <div key={task.id} className="bg-gray-800/50 rounded-lg p-3">
                  <TaskCard task={task} onClarificationSubmit={refetch} />
                  {/* Show completion feedback for admins */}
                  {task.status === 'completed' && (task.completion_notes || task.time_on_task_mins) && (
                    <div className="mt-2 pt-2 border-t border-gray-700 text-sm space-y-1">
                      {task.time_on_task_mins && task.time_on_task_mins > 0 && (
                        <p className="text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Time: {task.time_on_task_mins} mins
                        </p>
                      )}
                      {task.completion_notes && (
                        <p className="text-gray-400">
                          <span className="text-gray-500">Notes:</span> {task.completion_notes}
                        </p>
                      )}
                      {task.completion_screenshot_url && (
                        <a
                          href={task.completion_screenshot_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-pink-400 hover:underline text-xs inline-block"
                        >
                          View Screenshot
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            {mariaTasks.length === 0 && (
              <p className="text-gray-500 text-sm">No tasks assigned to Maria</p>
            )}
          </div>
        </div>
      )}

      {/* Priority Filter Results */}
      {priorityFilter && displayedTasks && !peterFilter && !rajaniFilter && !mariaFilter && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium">
              P{priorityFilter} Tasks ({displayedTasks.length})
            </h3>
            <button
              onClick={() => setPriorityFilter(null)}
              className="text-gray-400 hover:text-white text-sm flex items-center gap-1"
            >
              <X className="w-4 h-4" /> Close
            </button>
          </div>
          <div className="space-y-2">
            {displayedTasks.map(task => (
              <TaskCard key={task.id} task={task} onClarificationSubmit={refetch} />
            ))}
            {displayedTasks.length === 0 && (
              <p className="text-gray-500 text-sm">No P{priorityFilter} tasks</p>
            )}
          </div>
        </div>
      )}

      {/* Awaiting Clarification Section - Tasks needing user input */}
      {!peterFilter && filteredDbTasks.filter(t => t.status === 'awaiting_clarification').length > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
          <h3 className="text-orange-400 font-medium mb-2 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Awaiting Your Response ({filteredDbTasks.filter(t => t.status === 'awaiting_clarification').length})
          </h3>
          <p className="text-sm text-gray-400 mb-3">
            Claude needs more information to proceed with these tasks
          </p>
          <div className="space-y-2">
            {filteredDbTasks.filter(t => t.status === 'awaiting_clarification').map(task => (
              <TaskCard key={task.id} task={task} onClarificationSubmit={refetch} />
            ))}
          </div>
        </div>
      )}

      {/* Pending Input Section - New tasks awaiting planning */}
      {!peterFilter && pendingInputTasks.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <h3 className="text-yellow-400 font-medium mb-2 flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            Awaiting Planning ({pendingInputTasks.length})
          </h3>
          <p className="text-sm text-gray-400 mb-3">
            Copy to Claude Code to create a detailed implementation plan, then update the task
          </p>
          <div className="space-y-2">
            {pendingInputTasks.slice(0, 5).map(task => (
              <TaskCard key={task.id} task={task} onClarificationSubmit={refetch} />
            ))}
            {pendingInputTasks.length > 5 && (
              <p className="text-gray-500 text-sm text-center pt-2">
                +{pendingInputTasks.length - 5} more tasks need planning
              </p>
            )}
          </div>
        </div>
      )}

      {/* Ready to Action Section - Top 5 highest priority tasks */}
      {!peterFilter && readyToActionTasks.length > 0 && !priorityFilter && (
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
          <h3 className="text-purple-400 font-medium mb-2 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Ready to Action (Top 5)
          </h3>
          <p className="text-sm text-gray-400 mb-3">
            Highest priority tasks with plans ready to execute
          </p>
          <div className="space-y-2">
            {readyToActionTasks.map(task => (
              <TaskCard key={task.id} task={task} onClarificationSubmit={refetch} />
            ))}
          </div>
        </div>
      )}

      {/* Needs Triage Section - tasks with "unsure" category */}
      {!peterFilter && filteredDbTasks.filter(t => t.category === 'unsure').length > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
          <h3 className="text-orange-400 font-medium mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Needs Triage ({filteredDbTasks.filter(t => t.category === 'unsure').length})
          </h3>
          <p className="text-sm text-gray-400 mb-3">
            These tasks need to be assigned to a business/category
          </p>
          <div className="space-y-2">
            {filteredDbTasks.filter(t => t.category === 'unsure').map(task => (
              <TaskCard key={task.id} task={task} onClarificationSubmit={refetch} />
            ))}
          </div>
        </div>
      )}

      {/* Archive Section - Completed one-off tasks */}
      {!peterFilter && archivedTasks.length > 0 && (
        <div className="bg-gray-800/30 border border-gray-700 rounded-lg">
          <button
            onClick={() => setShowArchive(!showArchive)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-gray-400" />
              <span className="text-gray-300 font-medium">Archive</span>
              <span className="text-xs bg-gray-600 text-gray-300 px-2 py-0.5 rounded">
                {archivedTasks.length} completed
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span>One-off tasks</span>
              {showArchive ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </div>
          </button>

          {showArchive && (
            <div className="p-4 pt-0 space-y-2 border-t border-gray-700">
              <p className="text-xs text-gray-500 mb-3">
                Completed setup tasks preserved for reference. These don&apos;t appear in active task counts.
              </p>
              {archivedTasks.map(task => (
                <TaskCard key={task.id} task={task} onClarificationSubmit={refetch} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Show All Business Tasks Toggle */}
      {!peterFilter && (
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">All Tasks by Business</h2>
          <button
            onClick={() => setShowAllBusiness(!showAllBusiness)}
            className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
          >
            {showAllBusiness ? (
              <>
                <ChevronDown className="w-4 h-4" /> Hide business breakdown
              </>
            ) : (
              <>
                <ChevronRight className="w-4 h-4" /> Show business breakdown
              </>
            )}
          </button>
        </div>
      )}

      {!peterFilter && showAllBusiness && (
        <div className="space-y-4">
          {Object.entries(filteredFramework).map(([key, business]) => (
            <BusinessSection
              key={key}
              businessKey={key}
              business={business as any}
              dbTasks={allTasksGrouped}
              onRefetch={refetch}
            />
          ))}
        </div>
      )}

      <AddTaskModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleTaskAdded}
        allowedBusinesses={allowedBusinesses}
        userEmail={userEmail}
      />
    </div>
  )
}
