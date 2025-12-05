import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export interface UnifiedIssue {
  id: string
  source: 'task' | 'cicd' | 'health'
  title: string
  description: string
  severity: 'high' | 'medium' | 'low'
  category: string
  business: string | null
  status: string
  execution_type: 'auto' | 'manual' | null
  auto_fixable: boolean
  estimated_cost: number // in cents
  created_at: string
  updated_at: string | null
  metadata: Record<string, unknown>
}

interface AutoSolveStats {
  total_auto_attempted: number
  total_auto_succeeded: number
  total_auto_failed: number
  success_rate: number
  avg_cost_cents: number
  avg_duration_ms: number
  by_model: Record<string, { attempts: number; successes: number; avg_cost: number }>
}

// Severity mapping
function getTaskSeverity(priority: number): 'high' | 'medium' | 'low' {
  if (priority === 1) return 'high'
  if (priority === 2) return 'medium'
  return 'low'
}

function getCicdSeverity(issueType: string): 'high' | 'medium' | 'low' {
  if (issueType === 'build_error') return 'high'
  if (issueType === 'typescript_error' || issueType === 'test_failure') return 'medium'
  return 'low'
}

function getHealthSeverity(status: string): 'high' | 'medium' | 'low' {
  if (status === 'down') return 'high'
  if (status === 'degraded') return 'medium'
  return 'low'
}

// Cost estimation (in cents)
function estimateAutomationCost(source: string, complexity: string = 'medium'): number {
  const baseCosts: Record<string, number> = {
    task: 50, // ~$0.50 avg for task automation
    cicd: 20, // ~$0.20 for CI/CD fixes (usually simpler)
    health: 10, // ~$0.10 for health check resolution
  }
  const multipliers: Record<string, number> = {
    simple: 0.5,
    medium: 1,
    complex: 2.5,
  }
  return Math.round((baseCosts[source] || 30) * (multipliers[complexity] || 1))
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const searchParams = request.nextUrl.searchParams

    const severityFilter = searchParams.get('severity')
    const sourceFilter = searchParams.get('source')
    const businessFilter = searchParams.get('business')
    const executionTypeFilter = searchParams.get('execution_type')

    const issues: UnifiedIssue[] = []

    // Fetch tasks (non-completed)
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .neq('status', 'completed')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(200)

    for (const task of tasks || []) {
      const severity = getTaskSeverity(task.priority)
      if (severityFilter && severity !== severityFilter) continue
      if (sourceFilter && sourceFilter !== 'task') continue
      if (businessFilter && task.business !== businessFilter) continue
      if (executionTypeFilter && task.execution_type !== executionTypeFilter) continue

      issues.push({
        id: `task-${task.id}`,
        source: 'task',
        title: task.title,
        description: task.description || '',
        severity,
        category: task.category || 'general',
        business: task.business,
        status: task.status,
        execution_type: task.execution_type,
        auto_fixable: task.execution_type === 'auto',
        estimated_cost: estimateAutomationCost('task', task.priority === 1 ? 'complex' : 'medium'),
        created_at: task.created_at,
        updated_at: task.updated_at,
        metadata: {
          task_id: task.id,
          priority: task.priority,
          retry_count: task.retry_count,
          assigned_to: task.assigned_to,
          instructions: task.instructions,
        }
      })
    }

    // Fetch CI/CD issues
    const { data: cicdIssues } = await supabase
      .from('cicd_issues')
      .select('*')
      .eq('resolved', false)
      .order('severity', { ascending: false })
      .order('last_seen_at', { ascending: false })
      .limit(200)

    for (const issue of cicdIssues || []) {
      const severity = getCicdSeverity(issue.issue_type)
      if (severityFilter && severity !== severityFilter) continue
      if (sourceFilter && sourceFilter !== 'cicd') continue

      issues.push({
        id: `cicd-${issue.id}`,
        source: 'cicd',
        title: `[${issue.code || issue.issue_type}] ${issue.message?.slice(0, 80) || 'CI/CD Issue'}`,
        description: `${issue.file_path || 'Unknown file'}${issue.line_number ? `:${issue.line_number}` : ''}`,
        severity,
        category: issue.issue_type,
        business: null, // CI/CD issues are cross-business
        status: issue.resolved ? 'resolved' : 'active',
        execution_type: issue.auto_fixable ? 'auto' : 'manual',
        auto_fixable: issue.auto_fixable,
        estimated_cost: estimateAutomationCost('cicd', issue.auto_fixable ? 'simple' : 'medium'),
        created_at: issue.first_seen_at,
        updated_at: issue.last_seen_at,
        metadata: {
          cicd_id: issue.id,
          issue_type: issue.issue_type,
          code: issue.code,
          file_path: issue.file_path,
          line_number: issue.line_number,
          occurrence_count: issue.occurrence_count,
        }
      })
    }

    // Fetch health check issues (non-healthy)
    const { data: healthIssues } = await supabase
      .from('dashboard_health_checks')
      .select('*')
      .neq('status', 'healthy')
      .order('status', { ascending: false })

    for (const health of healthIssues || []) {
      const severity = getHealthSeverity(health.status)
      if (severityFilter && severity !== severityFilter) continue
      if (sourceFilter && sourceFilter !== 'health') continue
      if (businessFilter && health.business !== businessFilter) continue

      issues.push({
        id: `health-${health.id}`,
        source: 'health',
        title: `${health.integration} - ${health.status}`,
        description: health.error_message || `Integration ${health.status}`,
        severity,
        category: 'integration',
        business: health.business,
        status: health.status,
        execution_type: null,
        auto_fixable: false, // Health issues usually need investigation
        estimated_cost: estimateAutomationCost('health'),
        created_at: health.last_check,
        updated_at: health.last_check,
        metadata: {
          health_id: health.id,
          integration: health.integration,
          latency_ms: health.latency_ms,
          details: health.details,
        }
      })
    }

    // Calculate auto-solve stats from notifications/task_logs
    const { data: autoSolveData } = await supabase
      .from('notifications')
      .select('*')
      .in('type', ['completed', 'failed', 'needs_manual'])
      .order('created_at', { ascending: false })
      .limit(500)

    const autoStats: AutoSolveStats = {
      total_auto_attempted: 0,
      total_auto_succeeded: 0,
      total_auto_failed: 0,
      success_rate: 0,
      avg_cost_cents: 0,
      avg_duration_ms: 0,
      by_model: {}
    }

    let totalCost = 0
    let totalDuration = 0

    for (const notif of autoSolveData || []) {
      autoStats.total_auto_attempted++

      if (notif.type === 'completed') {
        autoStats.total_auto_succeeded++
      } else {
        autoStats.total_auto_failed++
      }

      const meta = notif.metadata || {}
      if (meta.cost_usd) {
        totalCost += meta.cost_usd * 100 // Convert to cents
      }
      if (meta.duration_ms) {
        totalDuration += meta.duration_ms
      }

      // Track by model
      const model = meta.model_used || 'unknown'
      if (!autoStats.by_model[model]) {
        autoStats.by_model[model] = { attempts: 0, successes: 0, avg_cost: 0 }
      }
      autoStats.by_model[model].attempts++
      if (notif.type === 'completed') {
        autoStats.by_model[model].successes++
      }
      if (meta.cost_usd) {
        autoStats.by_model[model].avg_cost += meta.cost_usd * 100
      }
    }

    if (autoStats.total_auto_attempted > 0) {
      autoStats.success_rate = Math.round((autoStats.total_auto_succeeded / autoStats.total_auto_attempted) * 100)
      autoStats.avg_cost_cents = Math.round(totalCost / autoStats.total_auto_attempted)
      autoStats.avg_duration_ms = Math.round(totalDuration / autoStats.total_auto_attempted)

      // Calculate avg cost per model
      for (const model of Object.keys(autoStats.by_model)) {
        if (autoStats.by_model[model].attempts > 0) {
          autoStats.by_model[model].avg_cost = Math.round(
            autoStats.by_model[model].avg_cost / autoStats.by_model[model].attempts
          )
        }
      }
    }

    // Sort by severity (high first), then by created_at
    const severityOrder = { high: 0, medium: 1, low: 2 }
    issues.sort((a, b) => {
      const sevDiff = severityOrder[a.severity] - severityOrder[b.severity]
      if (sevDiff !== 0) return sevDiff
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    // Group issues
    const bySource: Record<string, UnifiedIssue[]> = {}
    const bySeverity: Record<string, UnifiedIssue[]> = {}
    const byBusiness: Record<string, UnifiedIssue[]> = {}
    const byCategory: Record<string, UnifiedIssue[]> = {}

    for (const issue of issues) {
      // By source
      if (!bySource[issue.source]) bySource[issue.source] = []
      bySource[issue.source].push(issue)

      // By severity
      if (!bySeverity[issue.severity]) bySeverity[issue.severity] = []
      bySeverity[issue.severity].push(issue)

      // By business
      const biz = issue.business || 'overall'
      if (!byBusiness[biz]) byBusiness[biz] = []
      byBusiness[biz].push(issue)

      // By category
      if (!byCategory[issue.category]) byCategory[issue.category] = []
      byCategory[issue.category].push(issue)
    }

    // Summary stats
    const summary = {
      total: issues.length,
      high: bySeverity.high?.length || 0,
      medium: bySeverity.medium?.length || 0,
      low: bySeverity.low?.length || 0,
      auto_fixable: issues.filter(i => i.auto_fixable).length,
      total_estimated_cost: issues.reduce((sum, i) => sum + i.estimated_cost, 0),
      by_source: {
        task: bySource.task?.length || 0,
        cicd: bySource.cicd?.length || 0,
        health: bySource.health?.length || 0,
      }
    }

    return NextResponse.json({
      issues,
      bySource,
      bySeverity,
      byBusiness,
      byCategory,
      summary,
      autoSolveStats: autoStats,
    })
  } catch (error: any) {
    console.error('Unified issues API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH - Bulk update execution_type for tasks
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()

    const { ids, execution_type } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No issue IDs provided' }, { status: 400 })
    }

    if (!execution_type || !['auto', 'manual'].includes(execution_type)) {
      return NextResponse.json({ error: 'Invalid execution_type' }, { status: 400 })
    }

    // Extract task IDs (only tasks can have execution_type updated)
    const taskIds = ids
      .filter((id: string) => id.startsWith('task-'))
      .map((id: string) => parseInt(id.replace('task-', '')))

    if (taskIds.length === 0) {
      return NextResponse.json({
        error: 'No task issues in selection. Only tasks can be set to auto/manual.',
        updated: 0
      }, { status: 400 })
    }

    const { error, count } = await supabase
      .from('tasks')
      .update({ execution_type })
      .in('id', taskIds)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log the bulk update
    for (const taskId of taskIds) {
      await supabase.from('task_logs').insert({
        task_id: taskId,
        source: 'dashboard',
        status: 'info',
        message: `Execution type changed to: ${execution_type} (bulk update)`,
      })
    }

    return NextResponse.json({
      success: true,
      updated: count || taskIds.length,
      message: `Updated ${count || taskIds.length} tasks to ${execution_type}`
    })
  } catch (error: any) {
    console.error('Bulk update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
