#!/usr/bin/env npx tsx

/**
 * Error Pattern Detection & Analysis
 *
 * Analyzes integration logs to identify error patterns, suggest fixes,
 * and detect root causes of recurring issues
 *
 * Usage: npx tsx .claude/skills/supabase-expert/scripts/error-pattern-analyzer.ts [--hours=24] [--min-occurrences=3]
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

// Parse command line arguments
const args = process.argv.slice(2)
const hours = parseInt(args.find(a => a.startsWith('--hours='))?.split('=')[1] || '24')
const minOccurrences = parseInt(args.find(a => a.startsWith('--min-occurrences='))?.split('=')[1] || '3')

// Known error patterns and solutions
const ERROR_PATTERNS = [
  {
    pattern: /rate limit|429|too many requests/i,
    category: 'Rate Limiting',
    severity: 'warning',
    solution: 'Implement exponential backoff and reduce request frequency. Consider request batching or caching.',
    auto_fix: 'Add retry logic with exponential backoff: wait 1s, 2s, 4s, 8s between retries'
  },
  {
    pattern: /timeout|ETIMEDOUT|connection timeout/i,
    category: 'Timeout',
    severity: 'warning',
    solution: 'Increase timeout values or optimize slow operations. Check network connectivity and API response times.',
    auto_fix: 'Increase timeout from default (usually 30s) to 60s or 120s'
  },
  {
    pattern: /unauthorized|401|invalid token|expired token/i,
    category: 'Authentication',
    severity: 'critical',
    solution: 'Token has expired or is invalid. Refresh authentication token or verify API credentials.',
    auto_fix: 'Implement token refresh logic before expiration. Check .env for valid credentials.'
  },
  {
    pattern: /forbidden|403|insufficient permissions/i,
    category: 'Authorization',
    severity: 'critical',
    solution: 'API key lacks required permissions. Review and update API key scopes/permissions.',
    auto_fix: 'Verify API key has required scopes in service provider dashboard'
  },
  {
    pattern: /not found|404|does not exist/i,
    category: 'Resource Not Found',
    severity: 'error',
    solution: 'Resource ID is incorrect or resource has been deleted. Verify resource exists before accessing.',
    auto_fix: 'Add existence check before operations: if (!resource) { handle_missing() }'
  },
  {
    pattern: /validation|invalid input|bad request|400/i,
    category: 'Validation Error',
    severity: 'error',
    solution: 'Request payload is malformed or missing required fields. Validate data before sending.',
    auto_fix: 'Add schema validation using Zod or Joi before API calls'
  },
  {
    pattern: /network|ECONNREFUSED|ENOTFOUND|DNS/i,
    category: 'Network Error',
    severity: 'critical',
    solution: 'Network connectivity issue or service is down. Check service status and network configuration.',
    auto_fix: 'Implement health check endpoint ping before operations'
  },
  {
    pattern: /duplicate|unique constraint|already exists/i,
    category: 'Duplicate Entry',
    severity: 'warning',
    solution: 'Resource already exists. Use update instead of create, or check for existence first.',
    auto_fix: 'Implement upsert pattern: try update first, create if not exists'
  },
  {
    pattern: /internal server error|500|502|503/i,
    category: 'Server Error',
    severity: 'critical',
    solution: 'Third-party service is experiencing issues. Implement retry logic and monitor service status.',
    auto_fix: 'Add retry with exponential backoff. Check service status page.'
  },
  {
    pattern: /memory|out of memory|heap/i,
    category: 'Memory Issue',
    severity: 'critical',
    solution: 'Application or script is running out of memory. Optimize memory usage or increase allocation.',
    auto_fix: 'Process data in smaller chunks. Use streaming for large datasets.'
  }
]

interface ErrorPattern {
  pattern_signature: string
  category: string
  severity: 'critical' | 'error' | 'warning'
  occurrences: number
  first_seen: string
  last_seen: string
  affected_sources: string[]
  affected_businesses: string[]
  sample_messages: string[]
  suggested_solution: string
  auto_fix_suggestion: string
  trend: 'increasing' | 'stable' | 'decreasing'
}

interface AnalysisResult {
  timestamp: string
  time_range_hours: number
  total_errors: number
  unique_patterns: number
  patterns: ErrorPattern[]
  critical_issues: number
  recommendations: string[]
  health_impact: 'low' | 'medium' | 'high' | 'critical'
}

async function analyzeErrorPatterns(): Promise<AnalysisResult> {
  const result: AnalysisResult = {
    timestamp: new Date().toISOString(),
    time_range_hours: hours,
    total_errors: 0,
    unique_patterns: 0,
    patterns: [],
    critical_issues: 0,
    recommendations: [],
    health_impact: 'low',
  }

  console.log('🔍 Error Pattern Analysis')
  console.log('='.repeat(60))
  console.log(`Time range: Last ${hours} hours`)
  console.log(`Min occurrences: ${minOccurrences}`)
  console.log()

  // 1. Fetch all errors in time range
  console.log('1️⃣  Fetching error logs...')
  const timeAgo = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

  const { data: errors, error } = await supabase
    .from('integration_logs')
    .select('id, source, service, message, details_json, business_id, created_at')
    .eq('level', 'error')
    .gte('created_at', timeAgo)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('   ❌ Failed to fetch errors:', error.message)
    process.exit(1)
  }

  result.total_errors = errors?.length || 0
  console.log(`   📊 Found ${result.total_errors} errors`)

  if (result.total_errors === 0) {
    console.log('\n✅ No errors found in the specified time range!')
    return result
  }

  // 2. Categorize errors by pattern
  console.log('\n2️⃣  Analyzing error patterns...')

  const patternMap = new Map<string, {
    category: string
    severity: 'critical' | 'error' | 'warning'
    messages: Array<{ source: string, business_id: string, message: string, timestamp: string }>
    solution: string
    auto_fix: string
  }>()

  errors?.forEach(err => {
    let matched = false

    for (const knownPattern of ERROR_PATTERNS) {
      if (knownPattern.pattern.test(err.message)) {
        const key = knownPattern.category

        if (!patternMap.has(key)) {
          patternMap.set(key, {
            category: knownPattern.category,
            severity: knownPattern.severity,
            messages: [],
            solution: knownPattern.solution,
            auto_fix: knownPattern.auto_fix,
          })
        }

        patternMap.get(key)!.messages.push({
          source: err.source,
          business_id: err.business_id || 'unknown',
          message: err.message,
          timestamp: err.created_at,
        })

        matched = true
        break
      }
    }

    // Uncategorized errors
    if (!matched) {
      const key = 'Uncategorized'
      if (!patternMap.has(key)) {
        patternMap.set(key, {
          category: 'Uncategorized',
          severity: 'error',
          messages: [],
          solution: 'Review error message for specific issue. Check service logs for more details.',
          auto_fix: 'Manual investigation required',
        })
      }

      patternMap.get(key)!.messages.push({
        source: err.source,
        business_id: err.business_id || 'unknown',
        message: err.message,
        timestamp: err.created_at,
      })
    }
  })

  // 3. Build pattern summaries
  for (const [signature, data] of patternMap.entries()) {
    if (data.messages.length < minOccurrences) continue

    const uniqueSources = [...new Set(data.messages.map(m => m.source))]
    const uniqueBusinesses = [...new Set(data.messages.map(m => m.business_id))]
    const timestamps = data.messages.map(m => new Date(m.timestamp).getTime())

    // Calculate trend (compare first half vs second half of time period)
    const midpoint = Date.now() - (hours / 2) * 60 * 60 * 1000
    const firstHalf = timestamps.filter(t => t < midpoint).length
    const secondHalf = timestamps.filter(t => t >= midpoint).length
    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable'

    if (secondHalf > firstHalf * 1.5) trend = 'increasing'
    else if (firstHalf > secondHalf * 1.5) trend = 'decreasing'

    const pattern: ErrorPattern = {
      pattern_signature: signature,
      category: data.category,
      severity: data.severity,
      occurrences: data.messages.length,
      first_seen: new Date(Math.min(...timestamps)).toISOString(),
      last_seen: new Date(Math.max(...timestamps)).toISOString(),
      affected_sources: uniqueSources,
      affected_businesses: uniqueBusinesses,
      sample_messages: data.messages.slice(0, 3).map(m => m.message),
      suggested_solution: data.solution,
      auto_fix_suggestion: data.auto_fix,
      trend,
    }

    result.patterns.push(pattern)

    if (data.severity === 'critical') {
      result.critical_issues++
    }
  }

  // Sort by occurrences
  result.patterns.sort((a, b) => b.occurrences - a.occurrences)
  result.unique_patterns = result.patterns.length

  // 4. Print patterns
  console.log(`   Found ${result.unique_patterns} unique error patterns\n`)

  result.patterns.forEach((pattern, idx) => {
    const severityIcon = pattern.severity === 'critical' ? '🔴' :
                         pattern.severity === 'error' ? '🟠' : '🟡'
    const trendIcon = pattern.trend === 'increasing' ? '📈' :
                      pattern.trend === 'decreasing' ? '📉' : '➡️'

    console.log(`   ${severityIcon} Pattern ${idx + 1}: ${pattern.category}`)
    console.log(`      Occurrences: ${pattern.occurrences} ${trendIcon} ${pattern.trend}`)
    console.log(`      Severity: ${pattern.severity.toUpperCase()}`)
    console.log(`      Sources: ${pattern.affected_sources.join(', ')}`)
    console.log(`      First seen: ${new Date(pattern.first_seen).toLocaleString()}`)
    console.log(`      Last seen: ${new Date(pattern.last_seen).toLocaleString()}`)
    console.log(`      Sample: "${pattern.sample_messages[0].substring(0, 80)}..."`)
    console.log()
  })

  // 5. Generate recommendations
  console.log('3️⃣  Generating recommendations...\n')

  // Critical issues
  const criticalPatterns = result.patterns.filter(p => p.severity === 'critical')
  if (criticalPatterns.length > 0) {
    result.health_impact = 'critical'
    result.recommendations.push(`🔴 CRITICAL: ${criticalPatterns.length} critical error patterns detected`)
    criticalPatterns.forEach(p => {
      result.recommendations.push(`   → ${p.category}: ${p.suggested_solution}`)
      result.recommendations.push(`      Auto-fix: ${p.auto_fix_suggestion}`)
    })
  }

  // Increasing trends
  const increasingPatterns = result.patterns.filter(p => p.trend === 'increasing')
  if (increasingPatterns.length > 0) {
    if (result.health_impact !== 'critical') result.health_impact = 'high'
    result.recommendations.push(`📈 ${increasingPatterns.length} error patterns are increasing`)
    increasingPatterns.forEach(p => {
      result.recommendations.push(`   → ${p.category} (${p.occurrences} errors): ${p.suggested_solution}`)
    })
  }

  // High frequency patterns
  const highFrequency = result.patterns.filter(p => p.occurrences > 20)
  if (highFrequency.length > 0) {
    if (result.health_impact === 'low') result.health_impact = 'medium'
    result.recommendations.push(`⚠️  ${highFrequency.length} high-frequency error patterns (>20 occurrences)`)
  }

  // General recommendations
  if (result.total_errors > 100) {
    result.recommendations.push('Consider implementing centralized error handling and retry logic')
  }

  if (result.patterns.some(p => p.category === 'Rate Limiting')) {
    result.recommendations.push('Implement request throttling and caching to reduce API calls')
  }

  if (result.patterns.some(p => p.category === 'Authentication' || p.category === 'Authorization')) {
    result.recommendations.push('Review and refresh API credentials. Implement token rotation.')
  }

  return result
}

async function main() {
  try {
    const result = await analyzeErrorPatterns()

    console.log('='.repeat(60))
    console.log('📊 ANALYSIS SUMMARY')
    console.log('='.repeat(60))

    const impactIcon = result.health_impact === 'critical' ? '🔴' :
                       result.health_impact === 'high' ? '🟠' :
                       result.health_impact === 'medium' ? '🟡' : '🟢'

    console.log(`\nTotal errors analyzed: ${result.total_errors}`)
    console.log(`Unique patterns found: ${result.unique_patterns}`)
    console.log(`Critical issues: ${result.critical_issues}`)
    console.log(`Health impact: ${impactIcon} ${result.health_impact.toUpperCase()}`)

    if (result.patterns.length > 0) {
      console.log(`\n🔝 TOP 3 ERROR PATTERNS:`)
      result.patterns.slice(0, 3).forEach((p, idx) => {
        console.log(`\n${idx + 1}. ${p.category} (${p.occurrences} occurrences)`)
        console.log(`   💡 Solution: ${p.suggested_solution}`)
        console.log(`   🔧 Auto-fix: ${p.auto_fix_suggestion}`)
      })
    }

    if (result.recommendations.length > 0) {
      console.log(`\n💡 RECOMMENDATIONS:`)
      result.recommendations.forEach(rec => {
        console.log(`${rec}`)
      })
    }

    // Write results to file
    const fs = await import('fs/promises')
    const resultsPath = 'logs/error-pattern-analysis.json'
    await fs.mkdir('logs', { recursive: true })
    await fs.writeFile(resultsPath, JSON.stringify(result, null, 2))
    console.log(`\n📄 Full analysis saved to: ${resultsPath}`)

    // Exit with appropriate code
    if (result.health_impact === 'critical') {
      process.exit(1)
    } else {
      process.exit(0)
    }

  } catch (error) {
    console.error('\n❌ Analysis failed:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

main()
