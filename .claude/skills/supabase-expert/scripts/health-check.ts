#!/usr/bin/env npx tsx

/**
 * Supabase Health Check Script
 *
 * Comprehensive health monitoring for the shared Supabase database
 * Used across all 4 businesses: Teelixir, Elevate Wholesale, Buy Organics Online, Red Hill Fresh
 *
 * Usage: npx tsx .claude/skills/supabase-expert/scripts/health-check.ts
 */

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const config = {
  url: process.env.SUPABASE_URL!,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
}

if (!config.url || !config.serviceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('  - SUPABASE_URL')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(config.url, config.serviceKey)

interface HealthCheckResult {
  timestamp: string
  overall_status: 'healthy' | 'warning' | 'critical'
  checks: {
    connectivity: boolean
    businesses: {
      total: number
      with_hubspot: number
      with_unleashed: number
    }
    integrations: {
      last_24h: {
        total: number
        errors: number
        error_rate: number
      }
      by_source: Array<{
        source: string
        total: number
        errors: number
        error_rate: number
        status: 'healthy' | 'warning' | 'critical'
      }>
    }
    workflows: {
      last_24h: {
        total: number
        failures: number
        failure_rate: number
      }
      recent_failures: Array<{
        workflow_name: string
        execution_id: string
        error: string
      }>
    }
    tasks: {
      pending: number
      in_progress: number
      failed: number
      needs_fix: number
      tasks_needing_attention: Array<{
        id: string
        title: string
        status: string
        retry_count: number
      }>
    }
    stale_integrations: string[]
  }
  warnings: string[]
  critical_issues: string[]
}

async function runHealthCheck(): Promise<HealthCheckResult> {
  const result: HealthCheckResult = {
    timestamp: new Date().toISOString(),
    overall_status: 'healthy',
    checks: {
      connectivity: false,
      businesses: {
        total: 0,
        with_hubspot: 0,
        with_unleashed: 0,
      },
      integrations: {
        last_24h: {
          total: 0,
          errors: 0,
          error_rate: 0,
        },
        by_source: [],
      },
      workflows: {
        last_24h: {
          total: 0,
          failures: 0,
          failure_rate: 0,
        },
        recent_failures: [],
      },
      tasks: {
        pending: 0,
        in_progress: 0,
        failed: 0,
        needs_fix: 0,
        tasks_needing_attention: [],
      },
      stale_integrations: [],
    },
    warnings: [],
    critical_issues: [],
  }

  console.log('🏥 Supabase Health Check')
  console.log('='.repeat(60))
  console.log(`Timestamp: ${result.timestamp}`)
  console.log()

  // 1. Test Connectivity
  console.log('1️⃣  Testing connectivity...')
  try {
    const { data, error } = await supabase.from('businesses').select('id').limit(1)
    if (error) throw error
    result.checks.connectivity = true
    console.log('   ✅ Connected to Supabase')
  } catch (error) {
    result.checks.connectivity = false
    result.critical_issues.push('Database connectivity failed')
    result.overall_status = 'critical'
    console.log('   ❌ Connection failed:', error instanceof Error ? error.message : String(error))
    return result
  }

  // 2. Check Businesses
  console.log('\n2️⃣  Checking businesses...')
  try {
    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('*')

    if (error) throw error

    result.checks.businesses.total = businesses?.length || 0
    result.checks.businesses.with_hubspot = businesses?.filter(b => b.hubspot_company_id).length || 0
    result.checks.businesses.with_unleashed = businesses?.filter(b => b.unleashed_customer_code).length || 0

    console.log(`   📊 Total businesses: ${result.checks.businesses.total}`)
    console.log(`   🔗 HubSpot synced: ${result.checks.businesses.with_hubspot}`)
    console.log(`   📦 Unleashed synced: ${result.checks.businesses.with_unleashed}`)

    if (result.checks.businesses.total !== 4) {
      result.warnings.push(`Expected 4 businesses, found ${result.checks.businesses.total}`)
    }
  } catch (error) {
    result.warnings.push('Failed to check businesses: ' + (error instanceof Error ? error.message : String(error)))
  }

  // 3. Check Integration Health (last 24 hours)
  console.log('\n3️⃣  Checking integration health (last 24h)...')
  try {
    const { data: healthData, error } = await supabase
      .from('integration_health_summary')
      .select('*')

    if (error) throw error

    if (healthData && healthData.length > 0) {
      const allLogs = healthData.reduce((sum, source) => sum + (source.total_logs || 0), 0)
      const allErrors = healthData.reduce((sum, source) => sum + (source.error_count || 0), 0)

      result.checks.integrations.last_24h.total = allLogs
      result.checks.integrations.last_24h.errors = allErrors
      result.checks.integrations.last_24h.error_rate = allLogs > 0 ? (allErrors / allLogs) * 100 : 0

      result.checks.integrations.by_source = healthData.map((source: any) => {
        const errorRate = source.total_logs > 0 ? (source.error_count / source.total_logs) * 100 : 0
        let status: 'healthy' | 'warning' | 'critical' = 'healthy'

        if (errorRate > 25) status = 'critical'
        else if (errorRate > 10) status = 'warning'

        return {
          source: source.source,
          total: source.total_logs,
          errors: source.error_count,
          error_rate: errorRate,
          status,
        }
      })

      console.log(`   📊 Total operations: ${allLogs}`)
      console.log(`   ❌ Total errors: ${allErrors}`)
      console.log(`   📈 Error rate: ${result.checks.integrations.last_24h.error_rate.toFixed(2)}%`)
      console.log()
      console.log('   By source:')
      result.checks.integrations.by_source.forEach(source => {
        const icon = source.status === 'healthy' ? '✅' : source.status === 'warning' ? '⚠️' : '🔴'
        console.log(`     ${icon} ${source.source}: ${source.error_rate.toFixed(1)}% (${source.errors}/${source.total})`)

        if (source.status === 'critical') {
          result.critical_issues.push(`${source.source} has critical error rate: ${source.error_rate.toFixed(1)}%`)
          result.overall_status = 'critical'
        } else if (source.status === 'warning') {
          result.warnings.push(`${source.source} has elevated error rate: ${source.error_rate.toFixed(1)}%`)
          if (result.overall_status === 'healthy') result.overall_status = 'warning'
        }
      })

      if (result.checks.integrations.last_24h.error_rate > 25) {
        result.critical_issues.push(`Overall error rate is critical: ${result.checks.integrations.last_24h.error_rate.toFixed(1)}%`)
        result.overall_status = 'critical'
      } else if (result.checks.integrations.last_24h.error_rate > 10) {
        result.warnings.push(`Overall error rate is elevated: ${result.checks.integrations.last_24h.error_rate.toFixed(1)}%`)
        if (result.overall_status === 'healthy') result.overall_status = 'warning'
      }
    }
  } catch (error) {
    result.warnings.push('Failed to check integration health: ' + (error instanceof Error ? error.message : String(error)))
  }

  // 4. Check Workflow Performance
  console.log('\n4️⃣  Checking workflow performance (last 24h)...')
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: workflows, error } = await supabase
      .from('workflow_execution_logs')
      .select('workflow_name, execution_id, status, error_message')
      .gte('started_at', twentyFourHoursAgo)

    if (error) throw error

    if (workflows) {
      result.checks.workflows.last_24h.total = workflows.length
      const failures = workflows.filter(w => w.status === 'error' || w.status === 'failed')
      result.checks.workflows.last_24h.failures = failures.length
      result.checks.workflows.last_24h.failure_rate = workflows.length > 0
        ? (failures.length / workflows.length) * 100
        : 0

      result.checks.workflows.recent_failures = failures.slice(0, 5).map(f => ({
        workflow_name: f.workflow_name,
        execution_id: f.execution_id,
        error: f.error_message || 'Unknown error',
      }))

      console.log(`   📊 Total executions: ${result.checks.workflows.last_24h.total}`)
      console.log(`   ❌ Failures: ${result.checks.workflows.last_24h.failures}`)
      console.log(`   📈 Failure rate: ${result.checks.workflows.last_24h.failure_rate.toFixed(2)}%`)

      if (result.checks.workflows.last_24h.failure_rate > 20) {
        result.warnings.push(`Workflow failure rate is high: ${result.checks.workflows.last_24h.failure_rate.toFixed(1)}%`)
        if (result.overall_status === 'healthy') result.overall_status = 'warning'
      }

      if (result.checks.workflows.recent_failures.length > 0) {
        console.log('\n   Recent failures:')
        result.checks.workflows.recent_failures.forEach(f => {
          console.log(`     - ${f.workflow_name}: ${f.error.substring(0, 80)}`)
        })
      }
    }
  } catch (error) {
    result.warnings.push('Failed to check workflows: ' + (error instanceof Error ? error.message : String(error)))
  }

  // 5. Check Tasks Status
  console.log('\n5️⃣  Checking tasks status...')
  try {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, title, status, retry_count')

    if (error) throw error

    if (tasks) {
      result.checks.tasks.pending = tasks.filter(t => t.status === 'pending').length
      result.checks.tasks.in_progress = tasks.filter(t => t.status === 'in_progress').length
      result.checks.tasks.failed = tasks.filter(t => t.status === 'failed').length
      result.checks.tasks.needs_fix = tasks.filter(t => t.status === 'needs_fix').length

      result.checks.tasks.tasks_needing_attention = tasks
        .filter(t => t.status === 'failed' || t.status === 'needs_fix')
        .map(t => ({
          id: t.id,
          title: t.title,
          status: t.status,
          retry_count: t.retry_count || 0,
        }))

      console.log(`   ⏳ Pending: ${result.checks.tasks.pending}`)
      console.log(`   🔄 In Progress: ${result.checks.tasks.in_progress}`)
      console.log(`   ❌ Failed: ${result.checks.tasks.failed}`)
      console.log(`   🔧 Needs Fix: ${result.checks.tasks.needs_fix}`)

      if (result.checks.tasks.failed > 0 || result.checks.tasks.needs_fix > 0) {
        result.warnings.push(`${result.checks.tasks.failed + result.checks.tasks.needs_fix} tasks need attention`)
        if (result.overall_status === 'healthy') result.overall_status = 'warning'
      }
    }
  } catch (error) {
    result.warnings.push('Failed to check tasks: ' + (error instanceof Error ? error.message : String(error)))
  }

  // 6. Check for Stale Integrations
  console.log('\n6️⃣  Checking for stale integrations (>24h inactive)...')
  try {
    const { data: stale, error } = await supabase
      .from('stale_integrations')
      .select('source')

    if (error) throw error

    if (stale && stale.length > 0) {
      result.checks.stale_integrations = stale.map(s => s.source)
      console.log(`   ⚠️  Stale integrations: ${result.checks.stale_integrations.join(', ')}`)
      result.warnings.push(`${stale.length} integrations inactive >24 hours: ${result.checks.stale_integrations.join(', ')}`)
      if (result.overall_status === 'healthy') result.overall_status = 'warning'
    } else {
      console.log('   ✅ All integrations active')
    }
  } catch (error) {
    result.warnings.push('Failed to check stale integrations: ' + (error instanceof Error ? error.message : String(error)))
  }

  return result
}

async function main() {
  try {
    const result = await runHealthCheck()

    // Print Summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 HEALTH CHECK SUMMARY')
    console.log('='.repeat(60))

    const statusIcon = result.overall_status === 'healthy' ? '✅' :
                       result.overall_status === 'warning' ? '⚠️' : '🔴'
    console.log(`\nOverall Status: ${statusIcon} ${result.overall_status.toUpperCase()}`)

    if (result.critical_issues.length > 0) {
      console.log('\n🔴 CRITICAL ISSUES:')
      result.critical_issues.forEach(issue => console.log(`  - ${issue}`))
    }

    if (result.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:')
      result.warnings.forEach(warning => console.log(`  - ${warning}`))
    }

    if (result.critical_issues.length === 0 && result.warnings.length === 0) {
      console.log('\n✅ All systems operational')
    }

    // Write results to file
    const fs = await import('fs/promises')
    const resultsPath = 'logs/supabase-health-check.json'
    await fs.mkdir('logs', { recursive: true })
    await fs.writeFile(resultsPath, JSON.stringify(result, null, 2))
    console.log(`\n📄 Full results saved to: ${resultsPath}`)

    // Exit with appropriate code
    if (result.overall_status === 'critical') {
      process.exit(1)
    } else if (result.overall_status === 'warning') {
      process.exit(0) // Don't fail on warnings, just report
    } else {
      process.exit(0)
    }

  } catch (error) {
    console.error('\n❌ Health check failed:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

main()
