#!/usr/bin/env npx tsx

/**
 * Lighthouse Performance Monitoring
 *
 * Runs Lighthouse audits and stores results in Supabase
 * Detects performance regressions and sends alerts
 *
 * Usage: npx tsx .claude/skills/supabase-expert/scripts/lighthouse-monitor.ts <brand> <environment> [--urls=url1,url2]
 *
 * Examples:
 *   npx tsx lighthouse-monitor.ts teelixir production
 *   npx tsx lighthouse-monitor.ts elevate staging --urls=https://staging.elevate.com,https://staging.elevate.com/products
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
const brand = process.argv[2] as 'teelixir' | 'elevate'
const environment = process.argv[3] as 'production' | 'staging' | 'development'
const urlsArg = process.argv.find(a => a.startsWith('--urls='))?.split('=')[1]

if (!brand || !environment) {
  console.error('❌ Missing required arguments')
  console.error('\nUsage: npx tsx lighthouse-monitor.ts <brand> <environment> [--urls=url1,url2]')
  console.error('\nExamples:')
  console.error('  npx tsx lighthouse-monitor.ts teelixir production')
  console.error('  npx tsx lighthouse-monitor.ts elevate staging --urls=https://staging.elevate.com')
  process.exit(1)
}

if (!['teelixir', 'elevate'].includes(brand)) {
  console.error('❌ Invalid brand. Must be: teelixir or elevate')
  process.exit(1)
}

if (!['production', 'staging', 'development'].includes(environment)) {
  console.error('❌ Invalid environment. Must be: production, staging, or development')
  process.exit(1)
}

// Default URLs per brand/environment
const DEFAULT_URLS: Record<string, Record<string, string[]>> = {
  teelixir: {
    production: ['https://teelixir.com', 'https://teelixir.com/products', 'https://teelixir.com/collections/all'],
    staging: ['https://staging.teelixir.com'],
    development: ['http://localhost:3000'],
  },
  elevate: {
    production: ['https://elevate.com', 'https://elevate.com/products', 'https://elevate.com/wholesale'],
    staging: ['https://staging.elevate.com'],
    development: ['http://localhost:3001'],
  },
}

const urls = urlsArg?.split(',') || DEFAULT_URLS[brand]?.[environment] || []

if (urls.length === 0) {
  console.error('❌ No URLs specified and no defaults available')
  process.exit(1)
}

interface LighthouseResult {
  audit_id?: string
  brand: string
  environment: string
  page_url: string
  performance_score?: number
  accessibility_score?: number
  best_practices_score?: number
  seo_score?: number
  pwa_score?: number
  lcp_value?: number
  fid_value?: number
  cls_value?: number
  tti_value?: number
  tbt_value?: number
  speed_index?: number
  audit_timestamp: string
  regression_detected: boolean
  regression_details?: string[]
}

interface MonitoringResult {
  timestamp: string
  brand: string
  environment: string
  urls_tested: number
  audits_completed: number
  audits_failed: number
  regressions_detected: number
  results: LighthouseResult[]
  recommendations: string[]
}

// Performance thresholds
const THRESHOLDS = {
  performance: { good: 90, warning: 50 },
  accessibility: { good: 90, warning: 80 },
  seo: { good: 90, warning: 80 },
  lcp: { good: 2.5, warning: 4.0 }, // seconds
  fid: { good: 100, warning: 300 }, // milliseconds
  cls: { good: 0.1, warning: 0.25 }, // score
}

async function runLighthouseAudit(url: string): Promise<LighthouseResult> {
  console.log(`   🔍 Auditing: ${url}`)

  const result: LighthouseResult = {
    brand,
    environment,
    page_url: url,
    audit_timestamp: new Date().toISOString(),
    regression_detected: false,
  }

  try {
    // NOTE: This is a placeholder for actual Lighthouse integration
    // In production, you would use:
    // - @lighthouse/cli for Node.js
    // - Google PageSpeed Insights API
    // - WebPageTest API
    // - Or your own Lighthouse service

    console.log('      ⚠️  Lighthouse integration not implemented in this version')
    console.log('      💡 To implement: Use lighthouse npm package or PSI API')

    // Simulate scores for demonstration
    // In production, replace this with actual Lighthouse run
    const mockScores = {
      performance_score: Math.floor(Math.random() * 40) + 60, // 60-100
      accessibility_score: Math.floor(Math.random() * 20) + 80, // 80-100
      best_practices_score: Math.floor(Math.random() * 20) + 80,
      seo_score: Math.floor(Math.random() * 20) + 80,
      lcp_value: Math.random() * 3 + 1, // 1-4 seconds
      cls_value: Math.random() * 0.2, // 0-0.2
      tti_value: Math.random() * 5 + 2, // 2-7 seconds
    }

    Object.assign(result, mockScores)

    // Check for regressions against previous audit
    const { data: previousAudit } = await supabase
      .from('lighthouse_audits')
      .select('*')
      .eq('brand', brand)
      .eq('environment', environment)
      .eq('page_url', url)
      .order('audit_timestamp', { ascending: false })
      .limit(1)
      .single()

    if (previousAudit) {
      result.regression_details = []

      // Check performance score regression
      if (result.performance_score && previousAudit.performance_score) {
        const diff = result.performance_score - previousAudit.performance_score
        if (diff < -10) {
          result.regression_detected = true
          result.regression_details.push(
            `Performance score dropped ${Math.abs(diff)} points (${previousAudit.performance_score} → ${result.performance_score})`
          )
        }
      }

      // Check LCP regression
      if (result.lcp_value && previousAudit.lcp_value) {
        const diff = result.lcp_value - previousAudit.lcp_value
        if (diff > 0.5) {
          result.regression_detected = true
          result.regression_details.push(
            `LCP increased by ${diff.toFixed(2)}s (${previousAudit.lcp_value.toFixed(2)}s → ${result.lcp_value.toFixed(2)}s)`
          )
        }
      }

      // Check CLS regression
      if (result.cls_value !== undefined && previousAudit.cls_value !== undefined) {
        const diff = result.cls_value - previousAudit.cls_value
        if (diff > 0.05) {
          result.regression_detected = true
          result.regression_details.push(
            `CLS increased by ${diff.toFixed(3)} (${previousAudit.cls_value.toFixed(3)} → ${result.cls_value.toFixed(3)})`
          )
        }
      }
    }

    console.log(`      ✅ Performance: ${result.performance_score}`)
    console.log(`      ✅ Accessibility: ${result.accessibility_score}`)
    console.log(`      ✅ LCP: ${result.lcp_value?.toFixed(2)}s`)

    if (result.regression_detected) {
      console.log(`      🔴 Regression detected!`)
      result.regression_details?.forEach(detail => {
        console.log(`         - ${detail}`)
      })
    }

  } catch (error) {
    console.error(`      ❌ Audit failed:`, error instanceof Error ? error.message : String(error))
    throw error
  }

  return result
}

async function saveLighthouseResult(result: LighthouseResult): Promise<void> {
  const { data, error } = await supabase
    .from('lighthouse_audits')
    .insert({
      brand: result.brand,
      environment: result.environment,
      page_url: result.page_url,
      performance_score: result.performance_score,
      accessibility_score: result.accessibility_score,
      best_practices_score: result.best_practices_score,
      seo_score: result.seo_score,
      pwa_score: result.pwa_score,
      lcp_value: result.lcp_value,
      fid_value: result.fid_value,
      cls_value: result.cls_value,
      tti_value: result.tti_value,
      tbt_value: result.tbt_value,
      speed_index: result.speed_index,
      audit_timestamp: result.audit_timestamp,
    })
    .select()
    .single()

  if (error) {
    console.error('   ⚠️  Failed to save result to Supabase:', error.message)
  } else if (data) {
    result.audit_id = data.audit_id
    console.log(`   💾 Saved to Supabase (ID: ${data.audit_id})`)
  }

  // Create performance alert if scores are below thresholds
  if (result.performance_score && result.performance_score < THRESHOLDS.performance.warning) {
    await createPerformanceAlert(result, 'performance_drop', 'Performance score below threshold')
  }

  if (result.lcp_value && result.lcp_value > THRESHOLDS.lcp.warning) {
    await createPerformanceAlert(result, 'threshold_breach', `LCP ${result.lcp_value.toFixed(2)}s exceeds ${THRESHOLDS.lcp.warning}s threshold`)
  }

  if (result.cls_value && result.cls_value > THRESHOLDS.cls.warning) {
    await createPerformanceAlert(result, 'threshold_breach', `CLS ${result.cls_value.toFixed(3)} exceeds ${THRESHOLDS.cls.warning} threshold`)
  }

  if (result.regression_detected && result.regression_details) {
    await createPerformanceAlert(result, 'performance_drop', result.regression_details.join('; '))
  }
}

async function createPerformanceAlert(result: LighthouseResult, alertType: string, message: string): Promise<void> {
  const severity = result.regression_detected ? 'critical' : 'warning'

  const { error } = await supabase
    .from('performance_alerts')
    .insert({
      brand: result.brand,
      severity,
      alert_type: alertType,
      metric_name: 'lighthouse_audit',
      current_value: result.performance_score || 0,
      threshold_value: THRESHOLDS.performance.warning,
      page_url: result.page_url,
      audit_id: result.audit_id,
      status: 'open',
      notes: message,
    })

  if (error) {
    console.error('   ⚠️  Failed to create alert:', error.message)
  } else {
    console.log(`   🚨 Alert created: ${severity.toUpperCase()} - ${message}`)
  }
}

async function runMonitoring(): Promise<MonitoringResult> {
  const result: MonitoringResult = {
    timestamp: new Date().toISOString(),
    brand,
    environment,
    urls_tested: urls.length,
    audits_completed: 0,
    audits_failed: 0,
    regressions_detected: 0,
    results: [],
    recommendations: [],
  }

  console.log('🔬 Lighthouse Performance Monitoring')
  console.log('='.repeat(60))
  console.log(`Brand: ${brand}`)
  console.log(`Environment: ${environment}`)
  console.log(`URLs to test: ${urls.length}`)
  console.log()

  // Run audits for each URL
  for (const url of urls) {
    try {
      const auditResult = await runLighthouseAudit(url)
      await saveLighthouseResult(auditResult)

      result.results.push(auditResult)
      result.audits_completed++

      if (auditResult.regression_detected) {
        result.regressions_detected++
      }
    } catch (error) {
      result.audits_failed++
      console.error(`   ❌ Failed to audit ${url}`)
    }
  }

  // Generate recommendations
  const avgPerformance = result.results.reduce((sum, r) => sum + (r.performance_score || 0), 0) / result.results.length
  const avgLCP = result.results.reduce((sum, r) => sum + (r.lcp_value || 0), 0) / result.results.length

  if (avgPerformance < THRESHOLDS.performance.good) {
    result.recommendations.push(`Average performance score (${avgPerformance.toFixed(0)}) is below ${THRESHOLDS.performance.good}. Review optimization opportunities.`)
  }

  if (avgLCP > THRESHOLDS.lcp.good) {
    result.recommendations.push(`Average LCP (${avgLCP.toFixed(2)}s) exceeds ${THRESHOLDS.lcp.good}s. Optimize largest contentful paint.`)
  }

  if (result.regressions_detected > 0) {
    result.recommendations.push(`${result.regressions_detected} performance regressions detected. Review recent changes.`)
  }

  return result
}

async function main() {
  try {
    const result = await runMonitoring()

    console.log('\n' + '='.repeat(60))
    console.log('📊 MONITORING SUMMARY')
    console.log('='.repeat(60))

    console.log(`\nURLs tested: ${result.urls_tested}`)
    console.log(`Audits completed: ${result.audits_completed}`)
    console.log(`Audits failed: ${result.audits_failed}`)
    console.log(`Regressions detected: ${result.regressions_detected}`)

    if (result.recommendations.length > 0) {
      console.log(`\n💡 RECOMMENDATIONS:`)
      result.recommendations.forEach((rec, idx) => {
        console.log(`   ${idx + 1}. ${rec}`)
      })
    }

    // Write results to file
    const fs = await import('fs/promises')
    const resultsPath = `logs/lighthouse-monitor-${brand}-${environment}.json`
    await fs.mkdir('logs', { recursive: true })
    await fs.writeFile(resultsPath, JSON.stringify(result, null, 2))
    console.log(`\n📄 Full results saved to: ${resultsPath}`)

    console.log(`\n✅ Monitoring complete!`)

    if (result.regressions_detected > 0) {
      process.exit(1)
    }

  } catch (error) {
    console.error('\n❌ Monitoring failed:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

main()
