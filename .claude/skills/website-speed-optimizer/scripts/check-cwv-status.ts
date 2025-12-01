#!/usr/bin/env npx tsx

/**
 * Check Core Web Vitals Status
 *
 * Quick status check of CWV metrics across all businesses.
 * Pulls from database or runs fresh audits.
 *
 * Usage:
 *   npx tsx check-cwv-status.ts
 *   npx tsx check-cwv-status.ts --detailed
 *   npx tsx check-cwv-status.ts --export
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const config = {
  supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
}

interface CwvSummary {
  business: string
  device: string
  auditCount: number
  avgPerformance: number
  avgLcpMs: number
  avgInpMs: number | null
  avgCls: number
  avgTtfbMs: number
  lcpPassRate: number
  inpPassRate: number
  clsPassRate: number
  overallPass: boolean
}

// CWV thresholds
const THRESHOLDS = {
  lcp: 2500,
  inp: 200,
  cls: 0.1,
  ttfb: 800
}

function getSupabase() {
  if (!config.supabaseUrl || !config.supabaseKey) {
    return null
  }
  return createClient(config.supabaseUrl, config.supabaseKey)
}

function getStatusEmoji(pass: boolean): string {
  return pass ? '🟢' : '🔴'
}

function getRatingEmoji(value: number, threshold: number): string {
  if (value <= threshold) return '🟢'
  if (value <= threshold * 1.6) return '🟡'
  return '🔴'
}

async function getCwvStatus(supabase: any): Promise<CwvSummary[]> {
  // Query recent audits grouped by business and device
  const { data, error } = await supabase
    .from('lighthouse_audits')
    .select('*')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Database error: ${error.message}`)
  }

  if (!data || data.length === 0) {
    return []
  }

  // Group by business and device
  const groups: Record<string, any[]> = {}
  for (const audit of data) {
    const key = `${audit.business}-${audit.device}`
    if (!groups[key]) groups[key] = []
    groups[key].push(audit)
  }

  // Calculate summaries
  const summaries: CwvSummary[] = []
  for (const [key, audits] of Object.entries(groups)) {
    const [business, device] = key.split('-')

    const avgLcpMs = Math.round(audits.reduce((sum, a) => sum + (a.lcp_ms || 0), 0) / audits.length)
    const avgInpMs = audits.some(a => a.inp_ms !== null)
      ? Math.round(audits.filter(a => a.inp_ms !== null).reduce((sum, a) => sum + a.inp_ms, 0) / audits.filter(a => a.inp_ms !== null).length)
      : null
    const avgCls = audits.reduce((sum, a) => sum + (a.cls || 0), 0) / audits.length
    const avgTtfbMs = Math.round(audits.reduce((sum, a) => sum + (a.ttfb_ms || 0), 0) / audits.length)
    const avgPerformance = Math.round(audits.reduce((sum, a) => sum + (a.performance_score || 0), 0) / audits.length)

    const lcpPassRate = Math.round(audits.filter(a => a.lcp_ms <= THRESHOLDS.lcp).length / audits.length * 100)
    const inpPassRate = avgInpMs !== null
      ? Math.round(audits.filter(a => a.inp_ms !== null && a.inp_ms <= THRESHOLDS.inp).length / audits.filter(a => a.inp_ms !== null).length * 100)
      : 100
    const clsPassRate = Math.round(audits.filter(a => a.cls <= THRESHOLDS.cls).length / audits.length * 100)

    const overallPass = lcpPassRate >= 75 && inpPassRate >= 75 && clsPassRate >= 75

    summaries.push({
      business,
      device,
      auditCount: audits.length,
      avgPerformance,
      avgLcpMs,
      avgInpMs,
      avgCls,
      avgTtfbMs,
      lcpPassRate,
      inpPassRate,
      clsPassRate,
      overallPass
    })
  }

  return summaries.sort((a, b) => a.business.localeCompare(b.business) || a.device.localeCompare(b.device))
}

function printSummaryTable(summaries: CwvSummary[]): void {
  console.log('\n┌─────────────┬─────────┬───────┬────────┬────────┬────────┬────────┬────────┐')
  console.log('│ Business    │ Device  │ Score │ LCP    │ INP    │ CLS    │ Pass?  │ Count  │')
  console.log('├─────────────┼─────────┼───────┼────────┼────────┼────────┼────────┼────────┤')

  for (const s of summaries) {
    const lcpStr = `${(s.avgLcpMs / 1000).toFixed(1)}s`
    const inpStr = s.avgInpMs !== null ? `${s.avgInpMs}ms` : 'N/A'
    const clsStr = s.avgCls.toFixed(2)

    const lcpEmoji = getRatingEmoji(s.avgLcpMs, THRESHOLDS.lcp)
    const inpEmoji = s.avgInpMs !== null ? getRatingEmoji(s.avgInpMs, THRESHOLDS.inp) : '⚪'
    const clsEmoji = getRatingEmoji(s.avgCls, THRESHOLDS.cls)
    const passEmoji = getStatusEmoji(s.overallPass)

    console.log(
      `│ ${s.business.padEnd(11)} │ ${s.device.padEnd(7)} │ ${String(s.avgPerformance).padStart(3)}   │ ${lcpEmoji} ${lcpStr.padStart(4)} │ ${inpEmoji} ${inpStr.padStart(4)} │ ${clsEmoji} ${clsStr.padStart(4)} │ ${passEmoji}      │ ${String(s.auditCount).padStart(4)}   │`
    )
  }

  console.log('└─────────────┴─────────┴───────┴────────┴────────┴────────┴────────┴────────┘')
}

function printDetailedSummary(summaries: CwvSummary[]): void {
  for (const s of summaries) {
    console.log(`\n${'='.repeat(50)}`)
    console.log(`📊 ${s.business.toUpperCase()} (${s.device})`)
    console.log('='.repeat(50))

    console.log(`\nPerformance Score: ${s.avgPerformance}/100`)

    console.log(`\nCore Web Vitals:`)
    console.log(`  ${getRatingEmoji(s.avgLcpMs, THRESHOLDS.lcp)} LCP:  ${(s.avgLcpMs / 1000).toFixed(2)}s (target: ≤2.5s) - ${s.lcpPassRate}% pass rate`)

    if (s.avgInpMs !== null) {
      console.log(`  ${getRatingEmoji(s.avgInpMs, THRESHOLDS.inp)} INP:  ${s.avgInpMs}ms (target: ≤200ms) - ${s.inpPassRate}% pass rate`)
    } else {
      console.log(`  ⚪ INP:  Not measured`)
    }

    console.log(`  ${getRatingEmoji(s.avgCls, THRESHOLDS.cls)} CLS:  ${s.avgCls.toFixed(3)} (target: ≤0.1) - ${s.clsPassRate}% pass rate`)
    console.log(`  ${getRatingEmoji(s.avgTtfbMs, THRESHOLDS.ttfb)} TTFB: ${s.avgTtfbMs}ms (target: ≤800ms)`)

    console.log(`\nOverall CWV Status: ${s.overallPass ? '✅ PASSING' : '❌ FAILING'}`)
    console.log(`Based on ${s.auditCount} audits in last 7 days`)
  }
}

function exportCsv(summaries: CwvSummary[]): void {
  const headers = [
    'business',
    'device',
    'audit_count',
    'avg_performance',
    'avg_lcp_ms',
    'avg_inp_ms',
    'avg_cls',
    'avg_ttfb_ms',
    'lcp_pass_rate',
    'inp_pass_rate',
    'cls_pass_rate',
    'overall_pass'
  ]

  console.log(headers.join(','))

  for (const s of summaries) {
    console.log([
      s.business,
      s.device,
      s.auditCount,
      s.avgPerformance,
      s.avgLcpMs,
      s.avgInpMs ?? '',
      s.avgCls.toFixed(3),
      s.avgTtfbMs,
      s.lcpPassRate,
      s.inpPassRate,
      s.clsPassRate,
      s.overallPass
    ].join(','))
  }
}

async function main() {
  const args = process.argv.slice(2)
  const detailed = args.includes('--detailed')
  const exportMode = args.includes('--export')
  const help = args.includes('--help')

  if (help) {
    console.log(`
Core Web Vitals Status Check

Usage:
  npx tsx check-cwv-status.ts [options]

Options:
  --detailed    Show detailed breakdown per business
  --export      Export results as CSV
  --help        Show this help message
    `)
    process.exit(0)
  }

  const supabase = getSupabase()

  if (!supabase) {
    console.error('❌ Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
    console.log('\nTo run audits and populate data, use:')
    console.log('  npx tsx run-lighthouse-audit.ts --all')
    process.exit(1)
  }

  console.log('🔍 Checking Core Web Vitals Status...')

  try {
    const summaries = await getCwvStatus(supabase)

    if (summaries.length === 0) {
      console.log('\n⚠️ No audit data found in the last 7 days.')
      console.log('Run audits first:')
      console.log('  npx tsx run-lighthouse-audit.ts --all')
      process.exit(0)
    }

    if (exportMode) {
      exportCsv(summaries)
    } else if (detailed) {
      printDetailedSummary(summaries)
    } else {
      printSummaryTable(summaries)
    }

    // Summary stats
    if (!exportMode) {
      const passingCount = summaries.filter(s => s.overallPass).length
      const totalCount = summaries.length
      const overallPassRate = Math.round(passingCount / totalCount * 100)

      console.log(`\n📈 Overall: ${passingCount}/${totalCount} passing CWV (${overallPassRate}%)`)

      if (overallPassRate < 100) {
        const failing = summaries.filter(s => !s.overallPass)
        console.log(`\n⚠️ Needs attention:`)
        for (const f of failing) {
          const issues = []
          if (f.lcpPassRate < 75) issues.push(`LCP (${f.lcpPassRate}% pass)`)
          if (f.inpPassRate < 75) issues.push(`INP (${f.inpPassRate}% pass)`)
          if (f.clsPassRate < 75) issues.push(`CLS (${f.clsPassRate}% pass)`)
          console.log(`   - ${f.business} (${f.device}): ${issues.join(', ')}`)
        }
      }
    }

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : error}`)
    process.exit(1)
  }
}

main()
