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
  Database
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
  status: 'pending' | 'in_progress' | 'completed' | 'blocked'
  priority: 1 | 2 | 3 | 4
  instructions?: string
  needsResearch?: boolean
  source?: string
  business?: string
  category?: string
  fromDb?: boolean
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
      status: 'pending',
      priority: 1,
      source: 'infra/supabase/schema-tasks.sql',
      instructions: `## What this does
Creates database tables (tasks, task_logs) to store tasks persistently.

## Steps for Claude Code
1. Read the schema: infra/supabase/schema-tasks.sql
2. Deploy using: node infra/supabase/deploy-sql-direct.js
3. Verify tables exist in Supabase dashboard
4. Test by inserting a sample task via SQL

## Why it matters
Without this, all tasks are hardcoded in the UI. Once deployed, tasks can be created/edited from the dashboard.`
    },
    {
      id: 'dash-2',
      title: 'Build task management API',
      description: 'Create REST API endpoints for CRUD operations on tasks.',
      status: 'pending',
      priority: 2,
      instructions: `## What this does
Adds API routes to create, read, update, and delete tasks.

## Steps for Claude Code
1. Create dashboard/src/app/api/tasks/route.ts (GET list, POST create)
2. Create dashboard/src/app/api/tasks/[id]/route.ts (PATCH update, DELETE)
3. Use existing Supabase client from lib/supabase.ts
4. Test each endpoint with curl or browser

## Endpoints
- GET /api/tasks - List all tasks (with filters)
- POST /api/tasks - Create new task
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
  const config = {
    pending: 'bg-gray-500/20 text-gray-400',
    in_progress: 'bg-blue-500/20 text-blue-400',
    completed: 'bg-green-500/20 text-green-400',
    blocked: 'bg-red-500/20 text-red-400',
  }
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded ${config[status]}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

function TaskCard({ task }: { task: Task }) {
  const [showDetails, setShowDetails] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiedResearch, setCopiedResearch] = useState(false)

  const copyToClipboard = () => {
    const text = task.instructions || task.description || task.title
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copyResearchPrompt = () => {
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
    navigator.clipboard.writeText(text)
    setCopiedResearch(true)
    setTimeout(() => setCopiedResearch(false), 2000)
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
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
            className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded flex items-center gap-1 transition-colors"
          >
            {copied ? (
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

      {showDetails && task.instructions && (
        <div className="border-t border-gray-700 bg-gray-900/50 p-3">
          <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
            {task.instructions}
          </pre>
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
  tasks
}: {
  businessKey: string
  businessName: string
  categoryKey: string
  category: { name: string }
  tasks: Task[]
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
          {displayTasks.map(task => <TaskCard key={task.id} task={task} />)}
        </div>
      )}
    </div>
  )
}

function BusinessSection({
  businessKey,
  business,
  dbTasks
}: {
  businessKey: string
  business: typeof TASK_FRAMEWORK.teelixir
  dbTasks?: Record<string, Task[]>
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
          status: 'pending',
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

  const handleCopyOnly = () => {
    const taskData = `## New Task to Add

**Business:** ${business}
**Category:** ${category}
**Title:** ${title}
**Description:** ${description}
**Priority:** P${priority}

## Instructions for Claude Code
Add this task to the dashboard.`

    navigator.clipboard.writeText(taskData)
    alert('Task copied to clipboard!')
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

  const pendingCount = allTasks.filter(t => t.status === 'pending').length
  const inProgressCount = allTasks.filter(t => t.status === 'in_progress').length
  const blockedCount = allTasks.filter(t => t.status === 'blocked').length
  const completedCount = allTasks.filter(t => t.status === 'completed').length
  const dbTaskCount = filteredDbTasks.length

  const handleTaskAdded = useCallback(() => {
    refetch()
  }, [refetch])

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <ClipboardList className="w-8 h-8" />
            Task Framework
          </h1>
          <p className="text-gray-400 mt-1">
            Cross-business task management and priorities
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
            title="Refresh tasks"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
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
          {' '}Run the SQL schema in Supabase to enable task storage.
        </div>
      )}

      <div className="grid grid-cols-6 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Total</p>
          <p className="text-2xl font-bold text-white">{allTasks.length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Pending</p>
          <p className="text-2xl font-bold text-gray-400">{pendingCount}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">In Progress</p>
          <p className="text-2xl font-bold text-blue-400">{inProgressCount}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Blocked</p>
          <p className="text-2xl font-bold text-red-400">{blockedCount}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Completed</p>
          <p className="text-2xl font-bold text-green-400">{completedCount}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm flex items-center gap-1">
            <Database className="w-3 h-3" /> Saved
          </p>
          <p className="text-2xl font-bold text-purple-400">{dbTaskCount}</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <h3 className="text-blue-400 font-medium mb-2">How to use</h3>
        <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
          <li><strong>Add Task</strong> - saves task to database for Peter and Claude Code to see</li>
          <li><strong>Copy for Claude</strong> - copies task instructions to paste into Claude Code</li>
          <li><strong>Research this</strong> - for unclear tasks, copies a research prompt</li>
          <li><strong>View details</strong> - shows step-by-step instructions</li>
        </ol>
      </div>

      {/* Needs Triage Section - tasks with "unsure" category */}
      {filteredDbTasks.filter(t => t.category === 'unsure').length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <h3 className="text-yellow-400 font-medium mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Needs Triage ({filteredDbTasks.filter(t => t.category === 'unsure').length})
          </h3>
          <p className="text-sm text-gray-400 mb-3">
            These tasks need to be assigned to a category by Claude Code
          </p>
          <div className="space-y-2">
            {filteredDbTasks.filter(t => t.category === 'unsure').map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {Object.entries(filteredFramework).map(([key, business]) => (
          <BusinessSection
            key={key}
            businessKey={key}
            business={business as any}
            dbTasks={allTasksGrouped}
          />
        ))}
      </div>

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
