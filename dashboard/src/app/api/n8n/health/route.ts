import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

interface N8nHealthStatus {
  n8n: 'healthy' | 'degraded' | 'down'
  webhooks: 'healthy' | 'degraded' | 'down'
  integrations: 'healthy' | 'degraded' | 'down'
}

interface ResolverRun {
  id: string
  timestamp: string
  duration_ms: number
  issues_detected: number
  auto_resolved: number
  tasks_created: number
  skipped: number
  failed: number
  health_status: N8nHealthStatus
  recommendations: string[]
}

interface ActiveIssue {
  id: string
  type: string
  workflow_name: string
  message: string
  created_at: string
  status: string
}

export async function GET() {
  try {
    const supabase = createServerClient()

    // Fetch recent resolver runs from integration_logs
    const { data: resolverLogs, error: logsError } = await supabase
      .from('integration_logs')
      .select('*')
      .eq('service', 'n8n-resolver')
      .eq('operation', 'daily_run')
      .order('created_at', { ascending: false })
      .limit(10)

    if (logsError) {
      console.error('Resolver logs fetch error:', logsError)
    }

    // Parse resolver runs
    const recentRuns: ResolverRun[] = (resolverLogs || []).map(log => {
      const details = log.details_json || {}
      const summary = details.summary || {}
      return {
        id: log.id,
        timestamp: log.created_at,
        duration_ms: details.duration_ms || 0,
        issues_detected: summary.issuesDetected || 0,
        auto_resolved: summary.autoResolved || 0,
        tasks_created: summary.tasksCreated || 0,
        skipped: summary.skipped || 0,
        failed: summary.failed || 0,
        health_status: details.health_status || { n8n: 'healthy', webhooks: 'healthy', integrations: 'healthy' },
        recommendations: details.recommendations || []
      }
    })

    // Get the latest health status
    const latestRun = recentRuns[0]
    const currentHealth: N8nHealthStatus = latestRun?.health_status || {
      n8n: 'healthy',
      webhooks: 'healthy',
      integrations: 'healthy'
    }

    // Fetch active issues (recent errors that weren't auto-resolved)
    const { data: issueLogs, error: issueError } = await supabase
      .from('integration_logs')
      .select('*')
      .eq('service', 'n8n-resolver')
      .neq('operation', 'daily_run')
      .eq('status', 'error')
      .order('created_at', { ascending: false })
      .limit(20)

    if (issueError) {
      console.error('Issue logs fetch error:', issueError)
    }

    const activeIssues: ActiveIssue[] = (issueLogs || []).map(log => {
      const details = log.details_json || {}
      return {
        id: log.id,
        type: details.issue_type || 'UNKNOWN',
        workflow_name: details.workflow_name || 'Unknown',
        message: log.message || '',
        created_at: log.created_at,
        status: details.action || 'unknown'
      }
    })

    // Calculate summary stats
    const last7Days = recentRuns.filter(run => {
      const runDate = new Date(run.timestamp)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return runDate >= weekAgo
    })

    const summary = {
      total_runs: last7Days.length,
      total_issues_detected: last7Days.reduce((sum, r) => sum + r.issues_detected, 0),
      total_auto_resolved: last7Days.reduce((sum, r) => sum + r.auto_resolved, 0),
      total_tasks_created: last7Days.reduce((sum, r) => sum + r.tasks_created, 0),
      resolution_rate: last7Days.length > 0
        ? Math.round(100 * last7Days.reduce((sum, r) => sum + r.auto_resolved, 0) /
            Math.max(1, last7Days.reduce((sum, r) => sum + r.issues_detected, 0)))
        : 0,
      last_run: latestRun?.timestamp || null
    }

    return NextResponse.json({
      health: currentHealth,
      summary,
      recentRuns,
      activeIssues,
      recommendations: latestRun?.recommendations || [],
      lastUpdated: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('n8n health API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
