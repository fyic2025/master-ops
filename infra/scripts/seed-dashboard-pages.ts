/**
 * Seed Dashboard Pages
 * Populates the dashboard_pages table with all 42 pages discovered in the dashboard app
 *
 * Run: npx tsx infra/scripts/seed-dashboard-pages.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') })

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  console.error('Set in .env file or run: node creds.js export global')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface PageDefinition {
  route: string
  file_path: string
  page_name: string
  description: string
  category: string
  business_scope: string[]
  implementation_status: 'implemented' | 'coming_soon' | 'placeholder' | 'deprecated'
  features: Record<string, boolean>
  dependencies: string[]
  skills_required: string[]
}

const DASHBOARD_PAGES: PageDefinition[] = [
  // ============================================================================
  // AUTHENTICATION
  // ============================================================================
  {
    route: '/login',
    file_path: 'dashboard/src/app/login/page.tsx',
    page_name: 'Login',
    description: 'Google OAuth login page with Guns N\' Roses themed UI',
    category: 'authentication',
    business_scope: ['all'],
    implementation_status: 'implemented',
    features: { hasAuth: true, hasTheming: true },
    dependencies: ['google-oauth', 'supabase-auth'],
    skills_required: ['frontend-design']
  },

  // ============================================================================
  // TASK MANAGEMENT
  // ============================================================================
  {
    route: '/add-task',
    file_path: 'dashboard/src/app/add-task/page.tsx',
    page_name: 'Quick Task Submission',
    description: 'Quick task submission form with business/priority selection and auto-execute toggle',
    category: 'task-management',
    business_scope: ['all'],
    implementation_status: 'implemented',
    features: { hasForm: true, hasAutoExecute: true },
    dependencies: ['/api/tasks'],
    skills_required: ['frontend-design', 'supabase-expert']
  },

  // ============================================================================
  // HOME & MONITORING
  // ============================================================================
  {
    route: '/:business',
    file_path: 'dashboard/src/app/(dashboard)/[business]/page.tsx',
    page_name: 'Business Dashboard',
    description: 'Business-specific dashboard overview with cards, job monitoring, integration health, and alerts',
    category: 'home',
    business_scope: ['all'],
    implementation_status: 'implemented',
    features: { hasDataFetching: true, hasWidgets: true, hasAlerts: true },
    dependencies: ['/api/jobs', '/api/integrations', '/api/alerts'],
    skills_required: ['frontend-design', 'supabase-expert']
  },
  {
    route: '/home/finance',
    file_path: 'dashboard/src/app/(dashboard)/home/finance/page.tsx',
    page_name: 'Consolidated Finance Hub',
    description: 'Cross-business P&L and Cash Flow views with Phase 1-3 implementation',
    category: 'finance',
    business_scope: ['all'],
    implementation_status: 'implemented',
    features: { hasCharts: true, hasTabs: true, hasDataFetching: true },
    dependencies: ['/api/finance', 'xero'],
    skills_required: ['frontend-design', 'supabase-expert']
  },
  {
    route: '/monitoring/errors',
    file_path: 'dashboard/src/app/(dashboard)/monitoring/errors/page.tsx',
    page_name: 'Error Monitoring',
    description: 'Dashboard error log monitoring - tracks errors, warnings, and sources',
    category: 'monitoring',
    business_scope: ['all'],
    implementation_status: 'implemented',
    features: { hasDataFetching: true, hasFiltering: true, hasPagination: true },
    dependencies: ['/api/monitoring/errors'],
    skills_required: ['frontend-design', 'supabase-expert']
  },
  {
    route: '/overall/n8n',
    file_path: 'dashboard/src/app/(dashboard)/overall/n8n/page.tsx',
    page_name: 'n8n Automation Health',
    description: 'Automation health check - resolver runs, active issues, workflow monitoring',
    category: 'monitoring',
    business_scope: ['all'],
    implementation_status: 'implemented',
    features: { hasDataFetching: true, hasCharts: true },
    dependencies: ['/api/n8n', 'n8n-api'],
    skills_required: ['frontend-design', 'n8n-workflow-manager']
  },

  // ============================================================================
  // OPERATIONS & INVENTORY
  // ============================================================================
  {
    route: '/:business/stock',
    file_path: 'dashboard/src/app/(dashboard)/[business]/stock/page.tsx',
    page_name: 'Stock Management',
    description: 'Dispatch issues, recommended stock levels, supplier analysis',
    category: 'operations',
    business_scope: ['boo', 'teelixir', 'elevate'],
    implementation_status: 'implemented',
    features: { hasDataFetching: true, hasCharts: true, hasAlerts: true },
    dependencies: ['/api/dispatch-issues', '/api/stock'],
    skills_required: ['frontend-design', 'supabase-expert', 'stock-alert-predictor']
  },
  {
    route: '/:business/inventory',
    file_path: 'dashboard/src/app/(dashboard)/[business]/inventory/page.tsx',
    page_name: 'Inventory Management',
    description: 'Shopify inventory sync, low stock alerts, purchase orders, bundles',
    category: 'operations',
    business_scope: ['teelixir', 'elevate'],
    implementation_status: 'implemented',
    features: { hasDataFetching: true, hasTabs: true, hasSync: true },
    dependencies: ['/api/inventory', 'shopify'],
    skills_required: ['frontend-design', 'shopify-expert', 'supabase-expert']
  },
  {
    route: '/:business/orders',
    file_path: 'dashboard/src/app/(dashboard)/[business]/orders/page.tsx',
    page_name: 'Orders',
    description: 'Order fulfillment tracking and management',
    category: 'operations',
    business_scope: ['all'],
    implementation_status: 'coming_soon',
    features: {},
    dependencies: [],
    skills_required: ['frontend-design', 'bigcommerce-expert', 'shopify-expert']
  },
  {
    route: '/:business/products',
    file_path: 'dashboard/src/app/(dashboard)/[business]/products/page.tsx',
    page_name: 'Products',
    description: 'Product health metrics and management',
    category: 'operations',
    business_scope: ['all'],
    implementation_status: 'coming_soon',
    features: {},
    dependencies: [],
    skills_required: ['frontend-design', 'bigcommerce-expert', 'shopify-expert']
  },
  {
    route: '/:business/shipping',
    file_path: 'dashboard/src/app/(dashboard)/[business]/shipping/page.tsx',
    page_name: 'Shipping',
    description: 'Shipping configuration and rate management',
    category: 'operations',
    business_scope: ['all'],
    implementation_status: 'placeholder',
    features: {},
    dependencies: [],
    skills_required: ['frontend-design', 'shipping-optimizer']
  },

  // ============================================================================
  // CUSTOMER MANAGEMENT
  // ============================================================================
  {
    route: '/:business/customers',
    file_path: 'dashboard/src/app/(dashboard)/[business]/customers/page.tsx',
    page_name: 'Customers',
    description: 'Wholesale customer analytics, bulk uploads, activation tracking (Elevate-specific)',
    category: 'customers',
    business_scope: ['elevate'],
    implementation_status: 'implemented',
    features: { hasDataFetching: true, hasBulkUpload: true, hasAnalytics: true },
    dependencies: ['/api/customers', 'shopify'],
    skills_required: ['frontend-design', 'shopify-expert', 'customer-segmentation-engine']
  },

  // ============================================================================
  // FINANCE & ACCOUNTING
  // ============================================================================
  {
    route: '/:business/finance',
    file_path: 'dashboard/src/app/(dashboard)/[business]/finance/page.tsx',
    page_name: 'Finance Dashboard',
    description: 'P&L summary, Cash Flow, budgets, scenarios (Teelixir + Elevate)',
    category: 'finance',
    business_scope: ['teelixir', 'elevate'],
    implementation_status: 'implemented',
    features: { hasCharts: true, hasTabs: true, hasDataFetching: true },
    dependencies: ['/api/finance', 'xero'],
    skills_required: ['frontend-design', 'supabase-expert']
  },
  {
    route: '/:business/accounting/bank-recon',
    file_path: 'dashboard/src/app/(dashboard)/[business]/accounting/bank-recon/page.tsx',
    page_name: 'Bank Reconciliation',
    description: 'Bank statement reconciliation interface',
    category: 'finance',
    business_scope: ['teelixir', 'elevate', 'boo'],
    implementation_status: 'placeholder',
    features: {},
    dependencies: ['xero'],
    skills_required: ['frontend-design', 'supabase-expert']
  },

  // ============================================================================
  // MARKETING & CAMPAIGNS
  // ============================================================================
  {
    route: '/:business/ads',
    file_path: 'dashboard/src/app/(dashboard)/[business]/ads/page.tsx',
    page_name: 'Ads Performance',
    description: 'Google Ads ROAS tracking and campaign management',
    category: 'marketing',
    business_scope: ['boo', 'teelixir'],
    implementation_status: 'coming_soon',
    features: {},
    dependencies: ['google-ads'],
    skills_required: ['frontend-design', 'google-ads-manager']
  },
  {
    route: '/:business/ppc',
    file_path: 'dashboard/src/app/(dashboard)/[business]/ppc/page.tsx',
    page_name: 'PPC Campaigns',
    description: 'Pay-per-click campaign management',
    category: 'marketing',
    business_scope: ['boo', 'teelixir'],
    implementation_status: 'placeholder',
    features: {},
    dependencies: ['google-ads'],
    skills_required: ['frontend-design', 'google-ads-manager']
  },
  {
    route: '/:business/seo',
    file_path: 'dashboard/src/app/(dashboard)/[business]/seo/page.tsx',
    page_name: 'SEO Performance',
    description: 'GSC performance, indexed pages, page type analysis (BOO focus)',
    category: 'marketing',
    business_scope: ['boo', 'teelixir', 'rhf'],
    implementation_status: 'implemented',
    features: { hasCharts: true, hasDataFetching: true, hasFiltering: true },
    dependencies: ['/api/gsc', 'google-search-console'],
    skills_required: ['frontend-design', 'gsc-expert', 'seo-performance-monitor']
  },
  {
    route: '/:business/outreach',
    file_path: 'dashboard/src/app/(dashboard)/[business]/outreach/page.tsx',
    page_name: 'Outreach Campaigns',
    description: 'Cold outreach and email campaign management',
    category: 'marketing',
    business_scope: ['elevate'],
    implementation_status: 'placeholder',
    features: {},
    dependencies: ['smartlead'],
    skills_required: ['frontend-design', 'email-campaign-manager']
  },
  {
    route: '/:business/reengagement',
    file_path: 'dashboard/src/app/(dashboard)/[business]/reengagement/page.tsx',
    page_name: 'Reengagement',
    description: 'Customer reengagement flow management',
    category: 'marketing',
    business_scope: ['all'],
    implementation_status: 'placeholder',
    features: {},
    dependencies: ['klaviyo'],
    skills_required: ['frontend-design', 'klaviyo-expert', 'customer-churn-predictor']
  },

  // ============================================================================
  // AUTOMATION
  // ============================================================================
  {
    route: '/:business/automations',
    file_path: 'dashboard/src/app/(dashboard)/[business]/automations/page.tsx',
    page_name: 'Automations Hub',
    description: 'Registry-based automation cards, stats, enablement tracking',
    category: 'automation',
    business_scope: ['all'],
    implementation_status: 'implemented',
    features: { hasCards: true, hasStats: true, hasToggle: true },
    dependencies: ['/api/automations'],
    skills_required: ['frontend-design', 'n8n-workflow-manager']
  },
  {
    route: '/:business/automations/anniversary',
    file_path: 'dashboard/src/app/(dashboard)/[business]/automations/anniversary/page.tsx',
    page_name: 'Anniversary Campaigns',
    description: 'Customer anniversary email automation',
    category: 'automation',
    business_scope: ['teelixir', 'boo'],
    implementation_status: 'implemented',
    features: { hasDataFetching: true, hasPreview: true },
    dependencies: ['/api/automations/anniversary', 'klaviyo'],
    skills_required: ['frontend-design', 'klaviyo-expert', 'email-campaign-manager']
  },
  {
    route: '/:business/automations/winback',
    file_path: 'dashboard/src/app/(dashboard)/[business]/automations/winback/page.tsx',
    page_name: 'Winback Campaigns',
    description: 'Lapsed customer winback automation',
    category: 'automation',
    business_scope: ['teelixir', 'boo'],
    implementation_status: 'implemented',
    features: { hasDataFetching: true, hasPreview: true },
    dependencies: ['/api/automations/winback', 'klaviyo'],
    skills_required: ['frontend-design', 'klaviyo-expert', 'email-campaign-manager']
  },

  // ============================================================================
  // SALES & DISTRIBUTION
  // ============================================================================
  {
    route: '/:business/distributors',
    file_path: 'dashboard/src/app/(dashboard)/[business]/distributors/page.tsx',
    page_name: 'Distributors',
    description: 'Distributor management and performance tracking',
    category: 'sales',
    business_scope: ['teelixir', 'elevate'],
    implementation_status: 'placeholder',
    features: {},
    dependencies: [],
    skills_required: ['frontend-design', 'supabase-expert']
  },
  {
    route: '/:business/distributors/admin',
    file_path: 'dashboard/src/app/(dashboard)/[business]/distributors/admin/page.tsx',
    page_name: 'Distributors Admin',
    description: 'Distributor administration panel',
    category: 'sales',
    business_scope: ['teelixir', 'elevate'],
    implementation_status: 'placeholder',
    features: {},
    dependencies: [],
    skills_required: ['frontend-design', 'supabase-expert']
  },
  {
    route: '/:business/distributors/trends',
    file_path: 'dashboard/src/app/(dashboard)/[business]/distributors/trends/page.tsx',
    page_name: 'Distributor Trends',
    description: 'Distributor sales trends and analytics',
    category: 'sales',
    business_scope: ['teelixir', 'elevate'],
    implementation_status: 'placeholder',
    features: {},
    dependencies: [],
    skills_required: ['frontend-design', 'supabase-expert', 'marketing-analytics-reporter']
  },
  {
    route: '/:business/retailers',
    file_path: 'dashboard/src/app/(dashboard)/[business]/retailers/page.tsx',
    page_name: 'Retailers',
    description: 'Retail partner management',
    category: 'sales',
    business_scope: ['teelixir', 'elevate'],
    implementation_status: 'placeholder',
    features: {},
    dependencies: [],
    skills_required: ['frontend-design', 'supabase-expert']
  },
  {
    route: '/:business/brands',
    file_path: 'dashboard/src/app/(dashboard)/[business]/brands/page.tsx',
    page_name: 'Brand Management',
    description: 'Brand portfolio and management',
    category: 'sales',
    business_scope: ['boo', 'elevate'],
    implementation_status: 'placeholder',
    features: {},
    dependencies: [],
    skills_required: ['frontend-design', 'brand-asset-manager']
  },

  // ============================================================================
  // OPERATIONS & SYSTEM
  // ============================================================================
  {
    route: '/:business/issues',
    file_path: 'dashboard/src/app/(dashboard)/[business]/issues/page.tsx',
    page_name: 'Issues Tracker',
    description: 'Unified issue tracker for tasks, CI/CD, and health checks',
    category: 'system',
    business_scope: ['all'],
    implementation_status: 'implemented',
    features: { hasDataFetching: true, hasFiltering: true },
    dependencies: ['/api/issues'],
    skills_required: ['frontend-design', 'supabase-expert']
  },
  {
    route: '/:business/tasks',
    file_path: 'dashboard/src/app/(dashboard)/[business]/tasks/page.tsx',
    page_name: 'Task Framework',
    description: 'Task framework dashboard with attachment support',
    category: 'system',
    business_scope: ['all'],
    implementation_status: 'implemented',
    features: { hasDataFetching: true, hasFiltering: true, hasAttachments: true },
    dependencies: ['/api/tasks'],
    skills_required: ['frontend-design', 'supabase-expert']
  },
  {
    route: '/:business/sync',
    file_path: 'dashboard/src/app/(dashboard)/[business]/sync/page.tsx',
    page_name: 'Sync Status',
    description: 'Data synchronization status across integrations',
    category: 'system',
    business_scope: ['all'],
    implementation_status: 'placeholder',
    features: {},
    dependencies: [],
    skills_required: ['frontend-design', 'supabase-expert']
  },
  {
    route: '/:business/health',
    file_path: 'dashboard/src/app/(dashboard)/[business]/health/page.tsx',
    page_name: 'Health Checks',
    description: 'System health monitoring',
    category: 'system',
    business_scope: ['all'],
    implementation_status: 'placeholder',
    features: {},
    dependencies: ['/api/health'],
    skills_required: ['frontend-design', 'supabase-expert']
  },
  {
    route: '/:business/settings',
    file_path: 'dashboard/src/app/(dashboard)/[business]/settings/page.tsx',
    page_name: 'Settings',
    description: 'Integration health checks, notifications, team access management',
    category: 'system',
    business_scope: ['all'],
    implementation_status: 'implemented',
    features: { hasForm: true, hasIntegrations: true },
    dependencies: ['/api/settings'],
    skills_required: ['frontend-design', 'supabase-expert']
  },

  // ============================================================================
  // INTEGRATIONS & TOOLS
  // ============================================================================
  {
    route: '/:business/merchant',
    file_path: 'dashboard/src/app/(dashboard)/[business]/merchant/page.tsx',
    page_name: 'Google Merchant Center',
    description: 'GMC product feed and performance tracking',
    category: 'integrations',
    business_scope: ['boo', 'teelixir'],
    implementation_status: 'placeholder',
    features: {},
    dependencies: ['google-merchant-center'],
    skills_required: ['frontend-design', 'supabase-expert']
  },
  {
    route: '/:business/hubspot',
    file_path: 'dashboard/src/app/(dashboard)/[business]/hubspot/page.tsx',
    page_name: 'HubSpot CRM',
    description: 'HubSpot CRM integration and lead management',
    category: 'integrations',
    business_scope: ['elevate'],
    implementation_status: 'placeholder',
    features: {},
    dependencies: ['hubspot'],
    skills_required: ['frontend-design', 'supabase-expert']
  },
  {
    route: '/:business/livechat',
    file_path: 'dashboard/src/app/(dashboard)/[business]/livechat/page.tsx',
    page_name: 'LiveChat',
    description: 'LiveChat integration and conversation metrics',
    category: 'integrations',
    business_scope: ['boo'],
    implementation_status: 'placeholder',
    features: {},
    dependencies: ['livechat'],
    skills_required: ['frontend-design', 'supabase-expert']
  },
  {
    route: '/:business/trials',
    file_path: 'dashboard/src/app/(dashboard)/[business]/trials/page.tsx',
    page_name: 'Trials Management',
    description: 'Product trial tracking and conversion',
    category: 'integrations',
    business_scope: ['teelixir'],
    implementation_status: 'placeholder',
    features: {},
    dependencies: [],
    skills_required: ['frontend-design', 'supabase-expert']
  },
  {
    route: '/:business/prospecting',
    file_path: 'dashboard/src/app/(dashboard)/[business]/prospecting/page.tsx',
    page_name: 'Lead Prospecting',
    description: 'B2B lead prospecting and Apify integration',
    category: 'integrations',
    business_scope: ['elevate'],
    implementation_status: 'placeholder',
    features: {},
    dependencies: ['apify'],
    skills_required: ['frontend-design', 'apify-expert', 'supabase-expert']
  },

  // ============================================================================
  // INFRASTRUCTURE & DEPLOYMENT
  // ============================================================================
  {
    route: '/:business/cicd',
    file_path: 'dashboard/src/app/(dashboard)/[business]/cicd/page.tsx',
    page_name: 'CI/CD Status',
    description: 'Continuous integration and deployment status',
    category: 'infrastructure',
    business_scope: ['all'],
    implementation_status: 'placeholder',
    features: {},
    dependencies: ['github'],
    skills_required: ['frontend-design']
  },
  {
    route: '/:business/cron',
    file_path: 'dashboard/src/app/(dashboard)/[business]/cron/page.tsx',
    page_name: 'Cron Jobs',
    description: 'Scheduled job management and monitoring',
    category: 'infrastructure',
    business_scope: ['all'],
    implementation_status: 'placeholder',
    features: {},
    dependencies: [],
    skills_required: ['frontend-design', 'n8n-workflow-manager']
  },
  {
    route: '/:business/aws-migration',
    file_path: 'dashboard/src/app/(dashboard)/[business]/aws-migration/page.tsx',
    page_name: 'AWS Migration',
    description: 'AWS migration tracking and status',
    category: 'infrastructure',
    business_scope: ['all'],
    implementation_status: 'placeholder',
    features: {},
    dependencies: [],
    skills_required: ['frontend-design']
  },
  {
    route: '/:business/delivery',
    file_path: 'dashboard/src/app/(dashboard)/[business]/delivery/page.tsx',
    page_name: 'Delivery Management',
    description: 'Delivery scheduling and tracking (RHF focus)',
    category: 'infrastructure',
    business_scope: ['rhf'],
    implementation_status: 'placeholder',
    features: {},
    dependencies: [],
    skills_required: ['frontend-design', 'woocommerce-expert']
  }
]

async function seedPages() {
  console.log('Seeding dashboard pages...')
  console.log(`Total pages to seed: ${DASHBOARD_PAGES.length}`)

  let created = 0
  let updated = 0
  let errors = 0

  for (const page of DASHBOARD_PAGES) {
    try {
      const { data, error } = await supabase
        .from('dashboard_pages')
        .upsert(
          {
            route: page.route,
            file_path: page.file_path,
            page_name: page.page_name,
            description: page.description,
            category: page.category,
            business_scope: page.business_scope,
            implementation_status: page.implementation_status,
            features: page.features,
            dependencies: page.dependencies,
            skills_required: page.skills_required,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'route' }
        )
        .select('id')

      if (error) {
        console.error(`Error seeding ${page.route}:`, error.message)
        errors++
      } else {
        console.log(`✓ ${page.page_name} (${page.route})`)
        if (data && data.length > 0) {
          created++
        } else {
          updated++
        }
      }
    } catch (err: any) {
      console.error(`Exception seeding ${page.route}:`, err.message)
      errors++
    }
  }

  console.log('\n--- Summary ---')
  console.log(`Created/Updated: ${created + updated}`)
  console.log(`Errors: ${errors}`)

  // Show category breakdown
  const categories = DASHBOARD_PAGES.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  console.log('\n--- Pages by Category ---')
  Object.entries(categories)
    .sort(([, a], [, b]) => b - a)
    .forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}`)
    })

  // Show status breakdown
  const statuses = DASHBOARD_PAGES.reduce((acc, p) => {
    acc[p.implementation_status] = (acc[p.implementation_status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  console.log('\n--- Pages by Status ---')
  Object.entries(statuses).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`)
  })
}

seedPages()
  .then(() => {
    console.log('\nSeeding complete!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
