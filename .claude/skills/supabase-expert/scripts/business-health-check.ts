#!/usr/bin/env npx tsx

/**
 * Business-Specific Supabase Health Check
 *
 * Detailed health analysis for a single business
 * Usage: npx tsx .claude/skills/supabase-expert/scripts/business-health-check.ts <business-slug>
 *
 * Examples:
 *   npx tsx .claude/skills/supabase-expert/scripts/business-health-check.ts teelixir
 *   npx tsx .claude/skills/supabase-expert/scripts/business-health-check.ts elevate-wholesale
 */

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const config = {
  url: process.env.SUPABASE_URL!,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
}

if (!config.url || !config.serviceKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const businessSlug = process.argv[2]

if (!businessSlug) {
  console.error('❌ Business slug required')
  console.error('\nUsage: npx tsx business-health-check.ts <business-slug>')
  console.error('\nAvailable businesses:')
  console.error('  - teelixir')
  console.error('  - elevate-wholesale')
  console.error('  - buy-organics-online')
  console.error('  - red-hill-fresh')
  process.exit(1)
}

const supabase = createClient(config.url, config.serviceKey)

interface BusinessHealthResult {
  timestamp: string
  business: {
    id: string
    name: string
    slug: string
    type: string
    status: string
    hubspot_synced: boolean
    unleashed_synced: boolean
  }
  health_status: 'healthy' | 'warning' | 'critical'
  metrics: {
    total_operations_24h: number
    success_rate_24h: number
    error_count_24h: number
    avg_duration_ms: number
    active_integrations: string[]
  }
  integrations: {
    hubspot: {
      synced: boolean
      company_id?: string
      recent_operations: number
      error_rate: number
    }
    unleashed: {
      synced: boolean
      customer_code?: string
      recent_operations: number
      error_rate: number
    }
    n8n: {
      workflow_count: number
      recent_executions: number
      failure_rate: number
    }
  }
  recent_errors: Array<{
    source: string
    message: string
    timestamp: string
  }>
  recommendations: string[]
}

async function runBusinessHealthCheck(): Promise<BusinessHealthResult> {
  const result: BusinessHealthResult = {
    timestamp: new Date().toISOString(),
    business: {
      id: '',
      name: '',
      slug: businessSlug,
      type: '',
      status: '',
      hubspot_synced: false,
      unleashed_synced: false,
    },
    health_status: 'healthy',
    metrics: {
      total_operations_24h: 0,
      success_rate_24h: 0,
      error_count_24h: 0,
      avg_duration_ms: 0,
      active_integrations: [],
    },
    integrations: {
      hubspot: {
        synced: false,
        recent_operations: 0,
        error_rate: 0,
      },
      unleashed: {
        synced: false,
        recent_operations: 0,
        error_rate: 0,
      },
      n8n: {
        workflow_count: 0,
        recent_executions: 0,
        failure_rate: 0,
      },
    },
    recent_errors: [],
    recommendations: [],
  }

  console.log(`🏥 Business Health Check: ${businessSlug}`)
  console.log('='.repeat(60))
  console.log(`Timestamp: ${result.timestamp}`)
  console.log()

  // 1. Get Business Details
  console.log('1️⃣  Loading business details...')
  try {
    const { data: business, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('slug', businessSlug)
      .single()

    if (error) throw error
    if (!business) {
      console.error(`   ❌ Business '${businessSlug}' not found`)
      console.error('\nAvailable businesses:')
      const { data: allBusinesses } = await supabase
        .from('businesses')
        .select('slug, name')
      allBusinesses?.forEach(b => console.error(`   - ${b.slug} (${b.name})`))
      process.exit(1)
    }

    result.business = {
      id: business.id,
      name: business.name,
      slug: business.slug,
      type: business.type,
      status: business.status,
      hubspot_synced: !!business.hubspot_company_id,
      unleashed_synced: !!business.unleashed_customer_code,
    }

    console.log(`   📊 Name: ${business.name}`)
    console.log(`   🏷️  Type: ${business.type}`)
    console.log(`   ✅ Status: ${business.status}`)
    console.log(`   🔗 HubSpot: ${business.hubspot_company_id ? 'Synced (' + business.hubspot_company_id + ')' : 'Not synced'}`)
    console.log(`   📦 Unleashed: ${business.unleashed_customer_code ? 'Synced (' + business.unleashed_customer_code + ')' : 'Not synced'}`)

  } catch (error) {
    console.error('   ❌ Failed to load business:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }

  // 2. Get Business Statistics (last 24h)
  console.log('\n2️⃣  Analyzing activity (last 24h)...')
  try {
    const { data: stats, error } = await supabase.rpc('get_business_stats', {
      p_business_slug: businessSlug,
      p_hours: 24,
    })

    if (error) throw error

    if (stats) {
      result.metrics = {
        total_operations_24h: stats.total_ops || 0,
        success_rate_24h: stats.success_rate || 0,
        error_count_24h: stats.failed_ops || 0,
        avg_duration_ms: stats.avg_duration_ms || 0,
        active_integrations: stats.error_sources || [],
      }

      console.log(`   📊 Total operations: ${result.metrics.total_operations_24h}`)
      console.log(`   ✅ Success rate: ${result.metrics.success_rate_24h.toFixed(2)}%`)
      console.log(`   ❌ Errors: ${result.metrics.error_count_24h}`)
      console.log(`   ⚡ Avg duration: ${result.metrics.avg_duration_ms.toFixed(0)}ms`)
      console.log(`   🔌 Active integrations: ${result.metrics.active_integrations.join(', ') || 'None'}`)

      // Determine health status
      if (result.metrics.success_rate_24h < 75) {
        result.health_status = 'critical'
        result.recommendations.push('Success rate is critically low (<75%) - investigate immediately')
      } else if (result.metrics.success_rate_24h < 90) {
        result.health_status = 'warning'
        result.recommendations.push('Success rate is below optimal (<90%) - review error patterns')
      }
    }
  } catch (error) {
    console.log('   ⚠️  Could not fetch business stats:', error instanceof Error ? error.message : String(error))
  }

  // 3. Check Integration Status
  console.log('\n3️⃣  Checking integration status...')

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // HubSpot Integration
  try {
    const { data: hubspotLogs, error } = await supabase
      .from('integration_logs')
      .select('*')
      .eq('business_id', result.business.id)
      .eq('source', 'hubspot')
      .gte('created_at', twentyFourHoursAgo)

    if (!error && hubspotLogs) {
      const total = hubspotLogs.length
      const errors = hubspotLogs.filter(log => log.level === 'error').length

      result.integrations.hubspot = {
        synced: result.business.hubspot_synced,
        company_id: result.business.hubspot_synced ? 'Yes' : undefined,
        recent_operations: total,
        error_rate: total > 0 ? (errors / total) * 100 : 0,
      }

      console.log(`   🔗 HubSpot:`)
      console.log(`      - Synced: ${result.integrations.hubspot.synced ? 'Yes' : 'No'}`)
      console.log(`      - Operations (24h): ${total}`)
      console.log(`      - Error rate: ${result.integrations.hubspot.error_rate.toFixed(1)}%`)

      if (result.integrations.hubspot.error_rate > 10) {
        result.recommendations.push(`HubSpot integration has high error rate: ${result.integrations.hubspot.error_rate.toFixed(1)}%`)
        if (result.health_status === 'healthy') result.health_status = 'warning'
      }
    }
  } catch (error) {
    console.log(`   ⚠️  Could not check HubSpot integration`)
  }

  // Unleashed Integration
  try {
    const { data: unleashedLogs, error } = await supabase
      .from('integration_logs')
      .select('*')
      .eq('business_id', result.business.id)
      .eq('source', 'unleashed')
      .gte('created_at', twentyFourHoursAgo)

    if (!error && unleashedLogs) {
      const total = unleashedLogs.length
      const errors = unleashedLogs.filter(log => log.level === 'error').length

      result.integrations.unleashed = {
        synced: result.business.unleashed_synced,
        customer_code: result.business.unleashed_synced ? 'Yes' : undefined,
        recent_operations: total,
        error_rate: total > 0 ? (errors / total) * 100 : 0,
      }

      console.log(`   📦 Unleashed:`)
      console.log(`      - Synced: ${result.integrations.unleashed.synced ? 'Yes' : 'No'}`)
      console.log(`      - Operations (24h): ${total}`)
      console.log(`      - Error rate: ${result.integrations.unleashed.error_rate.toFixed(1)}%`)
    }
  } catch (error) {
    console.log(`   ⚠️  Could not check Unleashed integration`)
  }

  // n8n Workflows
  try {
    const { data: workflows, error } = await supabase
      .from('workflow_execution_logs')
      .select('*')
      .eq('business_id', result.business.id)
      .gte('started_at', twentyFourHoursAgo)

    if (!error && workflows) {
      const total = workflows.length
      const failures = workflows.filter(w => w.status === 'error' || w.status === 'failed').length
      const uniqueWorkflows = new Set(workflows.map(w => w.workflow_id)).size

      result.integrations.n8n = {
        workflow_count: uniqueWorkflows,
        recent_executions: total,
        failure_rate: total > 0 ? (failures / total) * 100 : 0,
      }

      console.log(`   🔄 n8n Workflows:`)
      console.log(`      - Active workflows: ${uniqueWorkflows}`)
      console.log(`      - Executions (24h): ${total}`)
      console.log(`      - Failure rate: ${result.integrations.n8n.failure_rate.toFixed(1)}%`)

      if (result.integrations.n8n.failure_rate > 10) {
        result.recommendations.push(`n8n workflows have high failure rate: ${result.integrations.n8n.failure_rate.toFixed(1)}%`)
        if (result.health_status === 'healthy') result.health_status = 'warning'
      }
    }
  } catch (error) {
    console.log(`   ⚠️  Could not check n8n workflows`)
  }

  // 4. Get Recent Errors
  console.log('\n4️⃣  Reviewing recent errors...')
  try {
    const { data: errors, error } = await supabase
      .from('integration_logs')
      .select('source, message, created_at')
      .eq('business_id', result.business.id)
      .eq('level', 'error')
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false })
      .limit(10)

    if (!error && errors && errors.length > 0) {
      result.recent_errors = errors.map(e => ({
        source: e.source,
        message: e.message,
        timestamp: e.created_at,
      }))

      console.log(`   ❌ Found ${errors.length} recent errors:`)
      errors.slice(0, 5).forEach(err => {
        const time = new Date(err.created_at).toLocaleTimeString()
        console.log(`      [${time}] ${err.source}: ${err.message.substring(0, 60)}${err.message.length > 60 ? '...' : ''}`)
      })
      if (errors.length > 5) {
        console.log(`      ... and ${errors.length - 5} more`)
      }
    } else {
      console.log(`   ✅ No errors in last 24 hours`)
    }
  } catch (error) {
    console.log('   ⚠️  Could not fetch recent errors')
  }

  // 5. Generate Recommendations
  if (result.metrics.total_operations_24h === 0) {
    result.recommendations.push('No activity detected in last 24 hours - verify integrations are active')
    if (result.health_status === 'healthy') result.health_status = 'warning'
  }

  if (!result.business.hubspot_synced) {
    result.recommendations.push('Business not synced to HubSpot - run sync script if needed')
  }

  if (result.recent_errors.length > 20) {
    result.recommendations.push(`High error volume: ${result.recent_errors.length} errors in 24h - requires investigation`)
    result.health_status = 'critical'
  }

  return result
}

async function main() {
  try {
    const result = await runBusinessHealthCheck()

    console.log('\n' + '='.repeat(60))
    console.log('📊 HEALTH CHECK SUMMARY')
    console.log('='.repeat(60))

    const statusIcon = result.health_status === 'healthy' ? '✅' :
                       result.health_status === 'warning' ? '⚠️' : '🔴'
    console.log(`\nBusiness: ${result.business.name} (${result.business.slug})`)
    console.log(`Overall Status: ${statusIcon} ${result.health_status.toUpperCase()}`)

    if (result.recommendations.length > 0) {
      console.log(`\n💡 RECOMMENDATIONS:`)
      result.recommendations.forEach((rec, idx) => {
        console.log(`   ${idx + 1}. ${rec}`)
      })
    } else {
      console.log('\n✅ All systems operational for this business')
    }

    // Write results to file
    const fs = await import('fs/promises')
    const resultsPath = `logs/supabase-health-check-${result.business.slug}.json`
    await fs.mkdir('logs', { recursive: true })
    await fs.writeFile(resultsPath, JSON.stringify(result, null, 2))
    console.log(`\n📄 Full results saved to: ${resultsPath}`)

    // Exit with appropriate code
    if (result.health_status === 'critical') {
      process.exit(1)
    } else {
      process.exit(0)
    }

  } catch (error) {
    console.error('\n❌ Health check failed:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

main()
