#!/usr/bin/env npx tsx

/**
 * Database Capacity Planning & Growth Projection
 *
 * Analyzes database growth patterns and projects future capacity needs
 * Provides optimization recommendations and archival strategies
 *
 * Usage: npx tsx .claude/skills/supabase-expert/scripts/capacity-planner.ts [--projection-days=90]
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

const projectionDays = parseInt(process.argv.find(a => a.startsWith('--projection-days='))?.split('=')[1] || '90')

interface CapacityPlan {
  timestamp: string
  projection_days: number
  current_state: {
    total_tables: number
    total_rows: number
    estimated_size_gb: number
  }
  table_analysis: Array<{
    table_name: string
    current_rows: number
    growth_rate_per_day: number
    projected_rows_30d: number
    projected_rows_90d: number
    estimated_size_mb: number
    retention_policy: string
    recommendation: string
  }>
  growth_projections: {
    daily_growth_rate: number
    weekly_growth_rate: number
    monthly_growth_rate: number
    projected_size_30d_gb: number
    projected_size_90d_gb: number
    projected_size_365d_gb: number
  }
  capacity_alerts: Array<{
    severity: 'info' | 'warning' | 'critical'
    message: string
    impact_days: number
  }>
  optimization_opportunities: Array<{
    table_name: string
    opportunity: string
    potential_savings_mb: number
    implementation_effort: 'low' | 'medium' | 'high'
  }>
  archival_strategy: {
    tables_needing_archival: string[]
    recommended_archival_age_days: { [table: string]: number }
    estimated_archival_savings_gb: number
  }
  recommendations: string[]
}

// Table size estimates (average bytes per row - rough estimates)
const TABLE_SIZE_ESTIMATES: { [key: string]: number } = {
  integration_logs: 500, // bytes per row
  workflow_execution_logs: 800,
  api_metrics: 300,
  task_logs: 400,
  tasks: 600,
  businesses: 1000,
  lighthouse_audits: 2000,
  theme_changes: 1500,
  performance_alerts: 500,
  seo_implementation_tasks: 600,
  deployment_history: 1000,
  agent_activity_log: 400,
  performance_trends: 600,
  performance_budgets: 300,
  accessibility_audits: 1200,
}

async function analyzeCapacity(): Promise<CapacityPlan> {
  const result: CapacityPlan = {
    timestamp: new Date().toISOString(),
    projection_days: projectionDays,
    current_state: {
      total_tables: 0,
      total_rows: 0,
      estimated_size_gb: 0,
    },
    table_analysis: [],
    growth_projections: {
      daily_growth_rate: 0,
      weekly_growth_rate: 0,
      monthly_growth_rate: 0,
      projected_size_30d_gb: 0,
      projected_size_90d_gb: 0,
      projected_size_365d_gb: 0,
    },
    capacity_alerts: [],
    optimization_opportunities: [],
    archival_strategy: {
      tables_needing_archival: [],
      recommended_archival_age_days: {},
      estimated_archival_savings_gb: 0,
    },
    recommendations: [],
  }

  console.log('📊 Database Capacity Planning & Growth Projection')
  console.log('='.repeat(60))
  console.log(`Projection period: ${projectionDays} days`)
  console.log()

  // 1. Analyze current table sizes
  console.log('1️⃣  Analyzing current table sizes...')

  const tables = Object.keys(TABLE_SIZE_ESTIMATES)
  let totalRows = 0
  let totalSizeMB = 0

  for (const tableName of tables) {
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.log(`   ⚠️  Could not query ${tableName}: ${error.message}`)
        continue
      }

      const rowCount = count || 0
      const estimatedSizeMB = (rowCount * TABLE_SIZE_ESTIMATES[tableName]) / 1024 / 1024

      totalRows += rowCount
      totalSizeMB += estimatedSizeMB

      // Calculate growth rate (approximate based on created_at if available)
      let growthRate = 0
      let projectedRows30d = rowCount
      let projectedRows90d = rowCount

      // For high-activity tables, estimate growth
      if (['integration_logs', 'workflow_execution_logs', 'api_metrics', 'task_logs'].includes(tableName)) {
        // Sample recent data to estimate growth
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        const { count: recentCount } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgo)

        if (recentCount) {
          growthRate = recentCount / 30 // rows per day
          projectedRows30d = rowCount + (growthRate * 30)
          projectedRows90d = rowCount + (growthRate * 90)
        }
      }

      // Determine retention policy
      let retentionPolicy = 'No policy'
      let recommendation = 'Monitor growth'

      if (tableName === 'integration_logs') {
        retentionPolicy = '30 days (recommended)'
        recommendation = 'Implement automated cleanup via cleanup_old_logs function'
      } else if (tableName === 'workflow_execution_logs') {
        retentionPolicy = '90 days (recommended)'
        recommendation = 'Archive old executions to cold storage'
      } else if (tableName === 'api_metrics') {
        retentionPolicy = '30 days (recommended)'
        recommendation = 'Aggregate to daily summaries after 30 days'
      } else if (tableName === 'task_logs') {
        retentionPolicy = 'Keep with task (cascading)'
        recommendation = 'Clean up completed tasks older than 90 days'
      } else if (growthRate === 0 && rowCount < 100) {
        recommendation = 'Low activity - no action needed'
      }

      result.table_analysis.push({
        table_name: tableName,
        current_rows: rowCount,
        growth_rate_per_day: growthRate,
        projected_rows_30d: Math.round(projectedRows30d),
        projected_rows_90d: Math.round(projectedRows90d),
        estimated_size_mb: estimatedSizeMB,
        retention_policy: retentionPolicy,
        recommendation,
      })

      console.log(`   📊 ${tableName}:`)
      console.log(`      Current: ${rowCount.toLocaleString()} rows (${estimatedSizeMB.toFixed(1)} MB)`)
      if (growthRate > 0) {
        console.log(`      Growth: ${Math.round(growthRate).toLocaleString()} rows/day`)
        console.log(`      Projected (90d): ${Math.round(projectedRows90d).toLocaleString()} rows`)
      }

    } catch (error) {
      console.log(`   ❌ Error analyzing ${tableName}`)
    }
  }

  result.current_state.total_tables = result.table_analysis.length
  result.current_state.total_rows = totalRows
  result.current_state.estimated_size_gb = totalSizeMB / 1024

  console.log(`\n   📈 TOTAL: ${totalRows.toLocaleString()} rows, ~${result.current_state.estimated_size_gb.toFixed(2)} GB`)

  // 2. Calculate growth projections
  console.log('\n2️⃣  Calculating growth projections...')

  const totalDailyGrowth = result.table_analysis.reduce((sum, t) => sum + t.growth_rate_per_day, 0)
  const avgBytesPerRow = totalSizeMB / totalRows * 1024 * 1024 || 500

  result.growth_projections.daily_growth_rate = totalDailyGrowth
  result.growth_projections.weekly_growth_rate = totalDailyGrowth * 7
  result.growth_projections.monthly_growth_rate = totalDailyGrowth * 30

  const dailySizeGrowthGB = (totalDailyGrowth * avgBytesPerRow) / 1024 / 1024 / 1024
  result.growth_projections.projected_size_30d_gb = result.current_state.estimated_size_gb + (dailySizeGrowthGB * 30)
  result.growth_projections.projected_size_90d_gb = result.current_state.estimated_size_gb + (dailySizeGrowthGB * 90)
  result.growth_projections.projected_size_365d_gb = result.current_state.estimated_size_gb + (dailySizeGrowthGB * 365)

  console.log(`   📊 Daily growth: ${Math.round(totalDailyGrowth).toLocaleString()} rows (~${(dailySizeGrowthGB * 1024).toFixed(1)} MB)`)
  console.log(`   📅 30-day projection: ~${result.growth_projections.projected_size_30d_gb.toFixed(2)} GB`)
  console.log(`   📅 90-day projection: ~${result.growth_projections.projected_size_90d_gb.toFixed(2)} GB`)
  console.log(`   📅 1-year projection: ~${result.growth_projections.projected_size_365d_gb.toFixed(2)} GB`)

  // 3. Generate capacity alerts
  console.log('\n3️⃣  Generating capacity alerts...')

  // Supabase free tier: 500 MB, Pro: 8 GB, Team: 32 GB, Enterprise: Custom
  const CAPACITY_TIERS = {
    free: 0.5,
    pro: 8,
    team: 32,
  }

  const currentTier = result.current_state.estimated_size_gb < CAPACITY_TIERS.free ? 'free'
    : result.current_state.estimated_size_gb < CAPACITY_TIERS.pro ? 'pro'
    : result.current_state.estimated_size_gb < CAPACITY_TIERS.team ? 'team'
    : 'enterprise'

  // Check if approaching tier limits
  if (currentTier === 'free' && result.growth_projections.projected_size_90d_gb > CAPACITY_TIERS.free) {
    const daysUntilLimit = Math.floor((CAPACITY_TIERS.free - result.current_state.estimated_size_gb) / dailySizeGrowthGB)
    result.capacity_alerts.push({
      severity: 'warning',
      message: `Will exceed free tier (500 MB) in ~${daysUntilLimit} days. Consider upgrading to Pro tier.`,
      impact_days: daysUntilLimit,
    })
  }

  if (currentTier === 'pro' && result.growth_projections.projected_size_365d_gb > CAPACITY_TIERS.pro) {
    const daysUntilLimit = Math.floor((CAPACITY_TIERS.pro - result.current_state.estimated_size_gb) / dailySizeGrowthGB)
    result.capacity_alerts.push({
      severity: 'info',
      message: `Will exceed Pro tier (8 GB) in ~${daysUntilLimit} days. Plan for Team tier upgrade.`,
      impact_days: daysUntilLimit,
    })
  }

  // Fast growth alert
  if (result.growth_projections.monthly_growth_rate > totalRows * 0.5) {
    result.capacity_alerts.push({
      severity: 'warning',
      message: 'Database is growing >50% per month. Review retention policies and implement archival.',
      impact_days: 30,
    })
  }

  // Large table alerts
  const largeTables = result.table_analysis.filter(t => t.current_rows > 100000)
  if (largeTables.length > 0) {
    result.capacity_alerts.push({
      severity: 'info',
      message: `${largeTables.length} tables have >100k rows: ${largeTables.map(t => t.table_name).join(', ')}. Consider partitioning.`,
      impact_days: 0,
    })
  }

  if (result.capacity_alerts.length > 0) {
    result.capacity_alerts.forEach(alert => {
      const icon = alert.severity === 'critical' ? '🔴' : alert.severity === 'warning' ? '⚠️' : 'ℹ️'
      console.log(`   ${icon} ${alert.message}`)
    })
  } else {
    console.log(`   ✅ No capacity concerns at current growth rate`)
  }

  // 4. Find optimization opportunities
  console.log('\n4️⃣  Identifying optimization opportunities...')

  for (const table of result.table_analysis) {
    // High-growth tables without retention
    if (table.growth_rate_per_day > 100 && table.retention_policy === 'No policy') {
      result.optimization_opportunities.push({
        table_name: table.table_name,
        opportunity: 'Implement retention policy to prevent unbounded growth',
        potential_savings_mb: table.estimated_size_mb * 0.5, // Assume 50% savings
        implementation_effort: 'low',
      })
    }

    // Large tables that could be archived
    if (table.current_rows > 50000 && ['integration_logs', 'workflow_execution_logs', 'api_metrics'].includes(table.table_name)) {
      result.optimization_opportunities.push({
        table_name: table.table_name,
        opportunity: 'Archive records older than 90 days to cold storage',
        potential_savings_mb: table.estimated_size_mb * 0.7, // Assume 70% savings
        implementation_effort: 'medium',
      })

      result.archival_strategy.tables_needing_archival.push(table.table_name)
      result.archival_strategy.recommended_archival_age_days[table.table_name] = 90
    }

    // Tables with JSONB that could be optimized
    if (['integration_logs', 'tasks', 'workflow_execution_logs'].includes(table.table_name) && table.current_rows > 10000) {
      result.optimization_opportunities.push({
        table_name: table.table_name,
        opportunity: 'Add GIN indexes on JSONB columns for faster queries',
        potential_savings_mb: 0, // Performance improvement, not size
        implementation_effort: 'low',
      })
    }
  }

  // Calculate archival savings
  result.archival_strategy.estimated_archival_savings_gb =
    result.optimization_opportunities
      .filter(o => o.opportunity.includes('Archive'))
      .reduce((sum, o) => sum + o.potential_savings_mb, 0) / 1024

  if (result.optimization_opportunities.length > 0) {
    console.log(`   💡 Found ${result.optimization_opportunities.length} optimization opportunities:`)
    result.optimization_opportunities.slice(0, 5).forEach(opp => {
      console.log(`      • ${opp.table_name}: ${opp.opportunity}`)
      if (opp.potential_savings_mb > 0) {
        console.log(`        Savings: ~${opp.potential_savings_mb.toFixed(1)} MB`)
      }
    })
  } else {
    console.log(`   ✅ Database is well-optimized`)
  }

  // 5. Generate recommendations
  if (result.growth_projections.projected_size_365d_gb > 5) {
    result.recommendations.push('Database will grow significantly (>5 GB) in next year. Implement aggressive retention policies.')
  }

  if (result.archival_strategy.tables_needing_archival.length > 0) {
    result.recommendations.push(`Archive old data from: ${result.archival_strategy.tables_needing_archival.join(', ')}. Estimated savings: ${result.archival_strategy.estimated_archival_savings_gb.toFixed(2)} GB`)
  }

  if (result.table_analysis.some(t => t.growth_rate_per_day > 1000)) {
    result.recommendations.push('Some tables growing >1k rows/day. Schedule weekly cleanup jobs.')
  }

  const highGrowthTables = result.table_analysis.filter(t => t.growth_rate_per_day > 100)
  if (highGrowthTables.length > 0) {
    result.recommendations.push(`Monitor high-growth tables: ${highGrowthTables.map(t => t.table_name).join(', ')}`)
  }

  if (result.current_state.estimated_size_gb > 1) {
    result.recommendations.push('Consider implementing table partitioning for large tables (>1M rows)')
  }

  result.recommendations.push('Run cleanup_old_logs() weekly to maintain retention policies')
  result.recommendations.push('Review and apply performance indexes from migrations/20251120_001_performance_indexes.sql')

  return result
}

async function main() {
  try {
    const result = await analyzeCapacity()

    console.log('\n' + '='.repeat(60))
    console.log('📊 CAPACITY PLANNING SUMMARY')
    console.log('='.repeat(60))

    console.log(`\n📈 Current State:`)
    console.log(`   Total rows: ${result.current_state.total_rows.toLocaleString()}`)
    console.log(`   Estimated size: ${result.current_state.estimated_size_gb.toFixed(2)} GB`)

    console.log(`\n📅 Growth Projections:`)
    console.log(`   Daily: ${Math.round(result.growth_projections.daily_growth_rate).toLocaleString()} rows`)
    console.log(`   30-day size: ${result.growth_projections.projected_size_30d_gb.toFixed(2)} GB`)
    console.log(`   90-day size: ${result.growth_projections.projected_size_90d_gb.toFixed(2)} GB`)
    console.log(`   1-year size: ${result.growth_projections.projected_size_365d_gb.toFixed(2)} GB`)

    if (result.archival_strategy.tables_needing_archival.length > 0) {
      console.log(`\n💾 Archival Strategy:`)
      console.log(`   Tables needing archival: ${result.archival_strategy.tables_needing_archival.join(', ')}`)
      console.log(`   Estimated savings: ${result.archival_strategy.estimated_archival_savings_gb.toFixed(2)} GB`)
    }

    if (result.recommendations.length > 0) {
      console.log(`\n💡 RECOMMENDATIONS:`)
      result.recommendations.forEach((rec, idx) => {
        console.log(`   ${idx + 1}. ${rec}`)
      })
    }

    // Write results
    const fs = await import('fs/promises')
    const resultsPath = 'logs/capacity-planning.json'
    await fs.mkdir('logs', { recursive: true })
    await fs.writeFile(resultsPath, JSON.stringify(result, null, 2))
    console.log(`\n📄 Full analysis saved to: ${resultsPath}`)

    console.log(`\n✅ Capacity planning complete!`)

  } catch (error) {
    console.error('\n❌ Analysis failed:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

main()
