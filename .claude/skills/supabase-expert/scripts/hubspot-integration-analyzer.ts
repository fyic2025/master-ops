#!/usr/bin/env npx tsx

/**
 * HubSpot Integration Deep-Dive Analyzer
 *
 * Comprehensive analysis of HubSpot integration health, sync status,
 * rate limiting, and common issues
 *
 * Usage: npx tsx .claude/skills/supabase-expert/scripts/hubspot-integration-analyzer.ts [--hours=24]
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

const supabase = createClient(config.url, config.serviceKey)

const hours = parseInt(process.argv.find(a => a.startsWith('--hours='))?.split('=')[1] || '24')

interface HubSpotAnalysis {
  timestamp: string
  time_range_hours: number
  sync_status: {
    total_businesses: number
    synced_businesses: number
    unsynced_businesses: string[]
    sync_rate: number
  }
  activity: {
    total_operations: number
    successful_operations: number
    failed_operations: number
    success_rate: number
  }
  rate_limiting: {
    rate_limit_hits: number
    avg_remaining_calls: number
    potential_throttling: boolean
  }
  operations_breakdown: {
    [operation: string]: {
      count: number
      success_count: number
      error_count: number
      avg_duration_ms: number
    }
  }
  errors: {
    by_type: { [type: string]: number }
    recent_errors: Array<{
      operation: string
      message: string
      business: string
      timestamp: string
    }>
  }
  performance: {
    avg_response_time_ms: number
    p95_response_time_ms: number
    slowest_operations: Array<{
      operation: string
      duration_ms: number
      timestamp: string
    }>
  }
  recommendations: string[]
  health_status: 'healthy' | 'warning' | 'critical'
}

async function analyzeHubSpotIntegration(): Promise<HubSpotAnalysis> {
  const result: HubSpotAnalysis = {
    timestamp: new Date().toISOString(),
    time_range_hours: hours,
    sync_status: {
      total_businesses: 0,
      synced_businesses: 0,
      unsynced_businesses: [],
      sync_rate: 0,
    },
    activity: {
      total_operations: 0,
      successful_operations: 0,
      failed_operations: 0,
      success_rate: 0,
    },
    rate_limiting: {
      rate_limit_hits: 0,
      avg_remaining_calls: 0,
      potential_throttling: false,
    },
    operations_breakdown: {},
    errors: {
      by_type: {},
      recent_errors: [],
    },
    performance: {
      avg_response_time_ms: 0,
      p95_response_time_ms: 0,
      slowest_operations: [],
    },
    recommendations: [],
    health_status: 'healthy',
  }

  console.log('🔗 HubSpot Integration Deep-Dive Analysis')
  console.log('='.repeat(60))
  console.log(`Time range: Last ${hours} hours`)
  console.log()

  // 1. Check Business Sync Status
  console.log('1️⃣  Checking business sync status...')
  const { data: businesses, error: bizError } = await supabase
    .from('businesses')
    .select('id, name, slug, hubspot_company_id')

  if (bizError) {
    console.error('   ❌ Failed to fetch businesses:', bizError.message)
    process.exit(1)
  }

  result.sync_status.total_businesses = businesses?.length || 0
  result.sync_status.synced_businesses = businesses?.filter(b => b.hubspot_company_id).length || 0
  result.sync_status.unsynced_businesses = businesses?.filter(b => !b.hubspot_company_id).map(b => b.slug) || []
  result.sync_status.sync_rate = result.sync_status.total_businesses > 0
    ? (result.sync_status.synced_businesses / result.sync_status.total_businesses) * 100
    : 0

  console.log(`   📊 Total businesses: ${result.sync_status.total_businesses}`)
  console.log(`   ✅ Synced to HubSpot: ${result.sync_status.synced_businesses} (${result.sync_status.sync_rate.toFixed(0)}%)`)
  if (result.sync_status.unsynced_businesses.length > 0) {
    console.log(`   ⚠️  Unsynced: ${result.sync_status.unsynced_businesses.join(', ')}`)
    result.recommendations.push(`Sync unsynced businesses: ${result.sync_status.unsynced_businesses.join(', ')}`)
  }

  // 2. Analyze HubSpot Operations
  console.log('\n2️⃣  Analyzing HubSpot operations...')
  const timeAgo = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

  const { data: logs, error: logsError } = await supabase
    .from('integration_logs')
    .select('*')
    .eq('source', 'hubspot')
    .gte('created_at', timeAgo)
    .order('created_at', { ascending: false })

  if (logsError) {
    console.error('   ❌ Failed to fetch logs:', logsError.message)
    process.exit(1)
  }

  result.activity.total_operations = logs?.length || 0
  result.activity.successful_operations = logs?.filter(l => l.status === 'success').length || 0
  result.activity.failed_operations = logs?.filter(l => l.status === 'failure').length || 0
  result.activity.success_rate = result.activity.total_operations > 0
    ? (result.activity.successful_operations / result.activity.total_operations) * 100
    : 0

  console.log(`   📊 Total operations: ${result.activity.total_operations}`)
  console.log(`   ✅ Successful: ${result.activity.successful_operations}`)
  console.log(`   ❌ Failed: ${result.activity.failed_operations}`)
  console.log(`   📈 Success rate: ${result.activity.success_rate.toFixed(2)}%`)

  if (result.activity.success_rate < 90) {
    result.health_status = 'warning'
    result.recommendations.push(`Success rate (${result.activity.success_rate.toFixed(1)}%) is below 90% - investigate failures`)
  }
  if (result.activity.success_rate < 75) {
    result.health_status = 'critical'
  }

  // 3. Operations Breakdown
  console.log('\n3️⃣  Breaking down operations by type...')
  const operationMap = new Map<string, { count: number, success: number, error: number, durations: number[] }>()

  logs?.forEach(log => {
    const op = log.operation || 'unknown'
    if (!operationMap.has(op)) {
      operationMap.set(op, { count: 0, success: 0, error: 0, durations: [] })
    }
    const opData = operationMap.get(op)!
    opData.count++
    if (log.status === 'success') opData.success++
    if (log.status === 'failure') opData.error++
    if (log.duration_ms) opData.durations.push(log.duration_ms)
  })

  for (const [operation, data] of operationMap.entries()) {
    const avgDuration = data.durations.length > 0
      ? data.durations.reduce((a, b) => a + b, 0) / data.durations.length
      : 0

    result.operations_breakdown[operation] = {
      count: data.count,
      success_count: data.success,
      error_count: data.error,
      avg_duration_ms: avgDuration,
    }

    console.log(`   📌 ${operation}:`)
    console.log(`      Count: ${data.count}, Success: ${data.success}, Errors: ${data.error}`)
    if (avgDuration > 0) {
      console.log(`      Avg duration: ${avgDuration.toFixed(0)}ms`)
    }
  }

  // 4. Rate Limiting Analysis
  console.log('\n4️⃣  Analyzing rate limiting...')
  const rateLimitErrors = logs?.filter(l =>
    l.message?.toLowerCase().includes('rate limit') ||
    l.message?.toLowerCase().includes('429') ||
    l.message?.toLowerCase().includes('too many requests')
  ) || []

  result.rate_limiting.rate_limit_hits = rateLimitErrors.length

  // Check API metrics for rate limit data
  const { data: apiMetrics } = await supabase
    .from('api_metrics')
    .select('rate_limit_remaining')
    .eq('service', 'hubspot')
    .gte('created_at', timeAgo)
    .not('rate_limit_remaining', 'is', null)

  if (apiMetrics && apiMetrics.length > 0) {
    const avgRemaining = apiMetrics.reduce((sum, m) => sum + (m.rate_limit_remaining || 0), 0) / apiMetrics.length
    result.rate_limiting.avg_remaining_calls = avgRemaining
    result.rate_limiting.potential_throttling = avgRemaining < 100

    console.log(`   📊 Rate limit hits: ${result.rate_limiting.rate_limit_hits}`)
    console.log(`   📈 Avg remaining calls: ${avgRemaining.toFixed(0)}`)

    if (result.rate_limiting.potential_throttling) {
      console.log(`   ⚠️  Low remaining rate limit - potential throttling`)
      result.recommendations.push('Implement request throttling and caching to avoid rate limits')
      if (result.health_status === 'healthy') result.health_status = 'warning'
    }
  } else {
    console.log(`   ℹ️  No rate limit data available in api_metrics`)
  }

  // 5. Error Analysis
  console.log('\n5️⃣  Analyzing errors...')
  const errors = logs?.filter(l => l.level === 'error') || []

  errors.forEach(err => {
    const errorType = err.message?.includes('401') || err.message?.includes('unauthorized') ? 'Authentication'
      : err.message?.includes('403') || err.message?.includes('forbidden') ? 'Authorization'
      : err.message?.includes('404') ? 'Not Found'
      : err.message?.includes('429') || err.message?.includes('rate limit') ? 'Rate Limit'
      : err.message?.includes('500') || err.message?.includes('502') ? 'Server Error'
      : 'Other'

    result.errors.by_type[errorType] = (result.errors.by_type[errorType] || 0) + 1
  })

  result.errors.recent_errors = errors.slice(0, 10).map(err => {
    const business = businesses?.find(b => b.id === err.business_id)
    return {
      operation: err.operation || 'unknown',
      message: err.message,
      business: business?.slug || 'unknown',
      timestamp: err.created_at,
    }
  })

  if (Object.keys(result.errors.by_type).length > 0) {
    console.log(`   ❌ Errors by type:`)
    Object.entries(result.errors.by_type)
      .sort(([, a], [, b]) => b - a)
      .forEach(([type, count]) => {
        console.log(`      ${type}: ${count}`)
      })
  } else {
    console.log(`   ✅ No errors in time period`)
  }

  // 6. Performance Analysis
  console.log('\n6️⃣  Analyzing performance...')
  const durations = logs?.filter(l => l.duration_ms).map(l => l.duration_ms!) || []

  if (durations.length > 0) {
    durations.sort((a, b) => a - b)
    result.performance.avg_response_time_ms = durations.reduce((a, b) => a + b, 0) / durations.length
    result.performance.p95_response_time_ms = durations[Math.floor(durations.length * 0.95)]

    const slowest = logs
      ?.filter(l => l.duration_ms)
      .sort((a, b) => (b.duration_ms || 0) - (a.duration_ms || 0))
      .slice(0, 5) || []

    result.performance.slowest_operations = slowest.map(l => ({
      operation: l.operation || 'unknown',
      duration_ms: l.duration_ms!,
      timestamp: l.created_at,
    }))

    console.log(`   ⚡ Avg response time: ${result.performance.avg_response_time_ms.toFixed(0)}ms`)
    console.log(`   📊 P95 response time: ${result.performance.p95_response_time_ms.toFixed(0)}ms`)

    if (result.performance.avg_response_time_ms > 2000) {
      result.recommendations.push(`Average response time (${result.performance.avg_response_time_ms.toFixed(0)}ms) is slow - optimize API calls`)
    }
  } else {
    console.log(`   ℹ️  No duration data available`)
  }

  // 7. Generate Recommendations
  if (result.activity.total_operations === 0) {
    result.recommendations.push('No HubSpot activity detected - verify integration is active')
    result.health_status = 'warning'
  }

  if (result.errors.by_type['Authentication']) {
    result.recommendations.push('Authentication errors detected - verify HubSpot API token is valid')
    result.health_status = 'critical'
  }

  if (result.errors.by_type['Rate Limit'] && result.errors.by_type['Rate Limit'] > 5) {
    result.recommendations.push('Multiple rate limit errors - implement exponential backoff and request batching')
  }

  return result
}

async function main() {
  try {
    const result = await analyzeHubSpotIntegration()

    console.log('\n' + '='.repeat(60))
    console.log('📊 HUBSPOT INTEGRATION SUMMARY')
    console.log('='.repeat(60))

    const statusIcon = result.health_status === 'healthy' ? '✅' :
                       result.health_status === 'warning' ? '⚠️' : '🔴'

    console.log(`\nHealth Status: ${statusIcon} ${result.health_status.toUpperCase()}`)
    console.log(`Sync Rate: ${result.sync_status.sync_rate.toFixed(0)}% (${result.sync_status.synced_businesses}/${result.sync_status.total_businesses})`)
    console.log(`Success Rate: ${result.activity.success_rate.toFixed(2)}%`)
    console.log(`Rate Limit Hits: ${result.rate_limiting.rate_limit_hits}`)

    if (result.recommendations.length > 0) {
      console.log(`\n💡 RECOMMENDATIONS:`)
      result.recommendations.forEach((rec, idx) => {
        console.log(`   ${idx + 1}. ${rec}`)
      })
    } else {
      console.log(`\n✅ All systems operational`)
    }

    // Write results
    const fs = await import('fs/promises')
    const resultsPath = 'logs/hubspot-integration-analysis.json'
    await fs.mkdir('logs', { recursive: true })
    await fs.writeFile(resultsPath, JSON.stringify(result, null, 2))
    console.log(`\n📄 Full analysis saved to: ${resultsPath}`)

    if (result.health_status === 'critical') {
      process.exit(1)
    }

  } catch (error) {
    console.error('\n❌ Analysis failed:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

main()
