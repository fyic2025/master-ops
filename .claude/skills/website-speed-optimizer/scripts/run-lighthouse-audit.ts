#!/usr/bin/env npx tsx

/**
 * Run Lighthouse Audit
 *
 * Runs Lighthouse performance audits for specified URLs or businesses.
 * Stores results in Supabase for tracking and comparison.
 *
 * Usage:
 *   npx tsx run-lighthouse-audit.ts --url https://teelixir.com
 *   npx tsx run-lighthouse-audit.ts --business teelixir
 *   npx tsx run-lighthouse-audit.ts --all
 *   npx tsx run-lighthouse-audit.ts --business boo --device mobile
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

// Configuration
const config = {
  supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  pagespeedApiKey: process.env.PAGESPEED_API_KEY,
}

// Business site configurations
const BUSINESS_SITES = {
  boo: {
    name: 'Buy Organics Online',
    baseUrl: 'https://buyorganicsonline.com.au',
    pages: [
      { path: '/', type: 'homepage' },
      { path: '/teelixir-tremella-mushroom-50g/', type: 'product' },
      { path: '/superfoods/', type: 'collection' },
    ]
  },
  teelixir: {
    name: 'Teelixir',
    baseUrl: 'https://teelixir.com',
    pages: [
      { path: '/', type: 'homepage' },
      { path: '/products/tremella-mushroom-powder', type: 'product' },
      { path: '/collections/all', type: 'collection' },
    ]
  },
  elevate: {
    name: 'Elevate Wholesale',
    baseUrl: 'https://elevatewholesale.com.au',
    pages: [
      { path: '/', type: 'homepage' },
      { path: '/collections/all', type: 'collection' },
    ]
  },
  rhf: {
    name: 'Red Hill Fresh',
    baseUrl: 'https://redhillfresh.com.au',
    pages: [
      { path: '/', type: 'homepage' },
      { path: '/shop/', type: 'collection' },
    ]
  }
}

// CWV thresholds
const THRESHOLDS = {
  lcp: { good: 2500, poor: 4000 },
  inp: { good: 200, poor: 500 },
  cls: { good: 0.1, poor: 0.25 },
  ttfb: { good: 800, poor: 1800 },
  fcp: { good: 1800, poor: 3000 },
  performance: { good: 70, poor: 50 }
}

interface AuditResult {
  url: string
  business: string
  pageType: string
  device: 'mobile' | 'desktop'
  performanceScore: number
  accessibilityScore: number
  bestPracticesScore: number
  seoScore: number
  lcpMs: number
  inpMs: number | null
  cls: number
  ttfbMs: number
  fcpMs: number
  totalBlockingTimeMs: number
  speedIndexMs: number
  opportunities: object[]
  diagnostics: object
  source: string
  isFieldData: boolean
}

// Initialize Supabase client
function getSupabase() {
  if (!config.supabaseUrl || !config.supabaseKey) {
    console.warn('Supabase not configured - results will not be stored')
    return null
  }
  return createClient(config.supabaseUrl, config.supabaseKey)
}

// Fetch PageSpeed Insights data
async function fetchPageSpeedInsights(
  url: string,
  strategy: 'mobile' | 'desktop' = 'mobile'
): Promise<any> {
  const apiUrl = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed')
  apiUrl.searchParams.set('url', url)
  apiUrl.searchParams.set('strategy', strategy)
  apiUrl.searchParams.set('category', 'performance')
  apiUrl.searchParams.set('category', 'accessibility')
  apiUrl.searchParams.set('category', 'best-practices')
  apiUrl.searchParams.set('category', 'seo')

  if (config.pagespeedApiKey) {
    apiUrl.searchParams.set('key', config.pagespeedApiKey)
  }

  console.log(`  Fetching PSI data for ${url} (${strategy})...`)

  const response = await fetch(apiUrl.toString())

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`PageSpeed API error: ${response.status} - ${error}`)
  }

  return response.json()
}

// Parse PSI response into audit result
function parseAuditResult(
  psiData: any,
  business: string,
  pageType: string,
  device: 'mobile' | 'desktop'
): AuditResult {
  const lighthouse = psiData.lighthouseResult
  const categories = lighthouse.categories
  const audits = lighthouse.audits

  return {
    url: psiData.id,
    business,
    pageType,
    device,
    performanceScore: Math.round((categories.performance?.score || 0) * 100),
    accessibilityScore: Math.round((categories.accessibility?.score || 0) * 100),
    bestPracticesScore: Math.round((categories['best-practices']?.score || 0) * 100),
    seoScore: Math.round((categories.seo?.score || 0) * 100),
    lcpMs: Math.round(audits['largest-contentful-paint']?.numericValue || 0),
    inpMs: audits['experimental-interaction-to-next-paint']?.numericValue
      ? Math.round(audits['experimental-interaction-to-next-paint'].numericValue)
      : null,
    cls: audits['cumulative-layout-shift']?.numericValue || 0,
    ttfbMs: Math.round(audits['server-response-time']?.numericValue || 0),
    fcpMs: Math.round(audits['first-contentful-paint']?.numericValue || 0),
    totalBlockingTimeMs: Math.round(audits['total-blocking-time']?.numericValue || 0),
    speedIndexMs: Math.round(audits['speed-index']?.numericValue || 0),
    opportunities: extractOpportunities(audits),
    diagnostics: extractDiagnostics(audits),
    source: 'pagespeed_api',
    isFieldData: false
  }
}

// Extract optimization opportunities
function extractOpportunities(audits: any): object[] {
  const opportunityAudits = [
    'render-blocking-resources',
    'unused-css-rules',
    'unused-javascript',
    'modern-image-formats',
    'offscreen-images',
    'unminified-css',
    'unminified-javascript',
    'uses-responsive-images',
    'efficient-animated-content',
    'duplicated-javascript',
    'legacy-javascript'
  ]

  return opportunityAudits
    .filter(id => audits[id]?.score !== null && audits[id]?.score < 1)
    .map(id => ({
      id,
      title: audits[id].title,
      description: audits[id].description,
      score: audits[id].score,
      savings: audits[id].numericValue || 0,
      displayValue: audits[id].displayValue
    }))
    .sort((a, b) => b.savings - a.savings)
}

// Extract diagnostic information
function extractDiagnostics(audits: any): object {
  return {
    domSize: audits['dom-size']?.numericValue,
    jsExecutionTime: audits['bootup-time']?.numericValue,
    mainThreadWork: audits['mainthread-work-breakdown']?.numericValue,
    thirdPartySummary: audits['third-party-summary']?.details?.items?.slice(0, 5),
    lcpElement: audits['largest-contentful-paint-element']?.details?.items?.[0]
  }
}

// Get CWV status emoji
function getCwvStatus(value: number, metric: keyof typeof THRESHOLDS): string {
  const threshold = THRESHOLDS[metric]
  if (value <= threshold.good) return '🟢'
  if (value <= threshold.poor) return '🟡'
  return '🔴'
}

// Print audit summary
function printAuditSummary(result: AuditResult): void {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`📊 ${result.url}`)
  console.log(`   Device: ${result.device.toUpperCase()}`)
  console.log(`${'='.repeat(60)}`)

  // Scores
  const perfEmoji = result.performanceScore >= 70 ? '🟢' : result.performanceScore >= 50 ? '🟡' : '🔴'
  console.log(`\n   Performance:     ${perfEmoji} ${result.performanceScore}/100`)
  console.log(`   Accessibility:   ${result.accessibilityScore}/100`)
  console.log(`   Best Practices:  ${result.bestPracticesScore}/100`)
  console.log(`   SEO:             ${result.seoScore}/100`)

  // Core Web Vitals
  console.log(`\n   Core Web Vitals:`)
  console.log(`   ${getCwvStatus(result.lcpMs, 'lcp')} LCP:   ${(result.lcpMs / 1000).toFixed(2)}s`)
  if (result.inpMs !== null) {
    console.log(`   ${getCwvStatus(result.inpMs, 'inp')} INP:   ${result.inpMs}ms`)
  }
  console.log(`   ${getCwvStatus(result.cls, 'cls')} CLS:   ${result.cls.toFixed(3)}`)
  console.log(`   ${getCwvStatus(result.ttfbMs, 'ttfb')} TTFB:  ${result.ttfbMs}ms`)
  console.log(`   ${getCwvStatus(result.fcpMs, 'fcp')} FCP:   ${(result.fcpMs / 1000).toFixed(2)}s`)

  // Top opportunities
  if (result.opportunities.length > 0) {
    console.log(`\n   Top Opportunities:`)
    result.opportunities.slice(0, 3).forEach((opp: any, i: number) => {
      console.log(`   ${i + 1}. ${opp.title}`)
      if (opp.displayValue) {
        console.log(`      Potential savings: ${opp.displayValue}`)
      }
    })
  }
}

// Store result in Supabase
async function storeResult(supabase: any, result: AuditResult): Promise<void> {
  if (!supabase) return

  const { error } = await supabase.from('lighthouse_audits').insert({
    business: result.business,
    url: result.url,
    page_type: result.pageType,
    device: result.device,
    performance_score: result.performanceScore,
    accessibility_score: result.accessibilityScore,
    best_practices_score: result.bestPracticesScore,
    seo_score: result.seoScore,
    lcp_ms: result.lcpMs,
    inp_ms: result.inpMs,
    cls: result.cls,
    ttfb_ms: result.ttfbMs,
    fcp_ms: result.fcpMs,
    total_blocking_time_ms: result.totalBlockingTimeMs,
    speed_index_ms: result.speedIndexMs,
    opportunities: result.opportunities,
    diagnostics: result.diagnostics,
    source: result.source,
    is_field_data: result.isFieldData
  })

  if (error) {
    console.error(`   ⚠️ Failed to store result: ${error.message}`)
  } else {
    console.log(`   ✅ Result stored in database`)
  }
}

// Run audit for a single URL
async function auditUrl(
  url: string,
  business: string,
  pageType: string,
  device: 'mobile' | 'desktop',
  supabase: any
): Promise<AuditResult | null> {
  try {
    const psiData = await fetchPageSpeedInsights(url, device)
    const result = parseAuditResult(psiData, business, pageType, device)
    printAuditSummary(result)
    await storeResult(supabase, result)
    return result
  } catch (error) {
    console.error(`   ❌ Failed to audit ${url}: ${error instanceof Error ? error.message : error}`)
    return null
  }
}

// Run audits for a business
async function auditBusiness(
  businessKey: string,
  device: 'mobile' | 'desktop' | 'both',
  supabase: any
): Promise<AuditResult[]> {
  const business = BUSINESS_SITES[businessKey as keyof typeof BUSINESS_SITES]
  if (!business) {
    console.error(`Unknown business: ${businessKey}`)
    return []
  }

  console.log(`\n🏢 Auditing ${business.name}...`)

  const results: AuditResult[] = []
  const devices: ('mobile' | 'desktop')[] = device === 'both' ? ['mobile', 'desktop'] : [device]

  for (const page of business.pages) {
    const url = `${business.baseUrl}${page.path}`
    for (const dev of devices) {
      const result = await auditUrl(url, businessKey, page.type, dev, supabase)
      if (result) results.push(result)

      // Rate limiting - wait 2 seconds between requests
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }

  return results
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  const supabase = getSupabase()

  // Parse arguments
  let url: string | null = null
  let business: string | null = null
  let all = false
  let device: 'mobile' | 'desktop' | 'both' = 'both'
  let detailed = false

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--url':
        url = args[++i]
        break
      case '--business':
        business = args[++i]
        break
      case '--all':
        all = true
        break
      case '--device':
        device = args[++i] as 'mobile' | 'desktop' | 'both'
        break
      case '--detailed':
        detailed = true
        break
      case '--help':
        console.log(`
Website Speed Optimizer - Lighthouse Audit

Usage:
  npx tsx run-lighthouse-audit.ts [options]

Options:
  --url <url>           Audit a specific URL
  --business <name>     Audit all pages for a business (boo, teelixir, elevate, rhf)
  --all                 Audit all businesses
  --device <type>       Device type: mobile, desktop, or both (default: both)
  --detailed            Show detailed diagnostics
  --help                Show this help message

Examples:
  npx tsx run-lighthouse-audit.ts --url https://teelixir.com
  npx tsx run-lighthouse-audit.ts --business teelixir --device mobile
  npx tsx run-lighthouse-audit.ts --all
        `)
        process.exit(0)
    }
  }

  console.log('🚀 Website Speed Optimizer - Lighthouse Audit')
  console.log('='.repeat(60))

  const allResults: AuditResult[] = []

  if (url) {
    // Single URL audit
    const result = await auditUrl(url, 'unknown', 'unknown', device === 'both' ? 'mobile' : device, supabase)
    if (result) allResults.push(result)

    if (device === 'both') {
      const desktopResult = await auditUrl(url, 'unknown', 'unknown', 'desktop', supabase)
      if (desktopResult) allResults.push(desktopResult)
    }
  } else if (business) {
    // Business audit
    const results = await auditBusiness(business, device, supabase)
    allResults.push(...results)
  } else if (all) {
    // All businesses
    for (const businessKey of Object.keys(BUSINESS_SITES)) {
      const results = await auditBusiness(businessKey, device, supabase)
      allResults.push(...results)
    }
  } else {
    console.error('Please specify --url, --business, or --all')
    console.log('Use --help for usage information')
    process.exit(1)
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`)
  console.log('📈 AUDIT SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total audits: ${allResults.length}`)

  if (allResults.length > 0) {
    const avgPerformance = Math.round(
      allResults.reduce((sum, r) => sum + r.performanceScore, 0) / allResults.length
    )
    const passingCwv = allResults.filter(r =>
      r.lcpMs <= 2500 && r.cls <= 0.1 && (r.inpMs === null || r.inpMs <= 200)
    ).length

    console.log(`Average performance score: ${avgPerformance}`)
    console.log(`Passing CWV: ${passingCwv}/${allResults.length} (${Math.round(passingCwv / allResults.length * 100)}%)`)

    // Issues summary
    const issues = {
      lcpPoor: allResults.filter(r => r.lcpMs > 4000).length,
      clsPoor: allResults.filter(r => r.cls > 0.25).length,
      scorePoor: allResults.filter(r => r.performanceScore < 50).length
    }

    if (issues.lcpPoor + issues.clsPoor + issues.scorePoor > 0) {
      console.log(`\n⚠️ Critical issues:`)
      if (issues.lcpPoor > 0) console.log(`   - ${issues.lcpPoor} pages with poor LCP (>4s)`)
      if (issues.clsPoor > 0) console.log(`   - ${issues.clsPoor} pages with poor CLS (>0.25)`)
      if (issues.scorePoor > 0) console.log(`   - ${issues.scorePoor} pages with poor performance (<50)`)
    }
  }

  console.log('\n✅ Audit complete!')
}

main().catch(console.error)
