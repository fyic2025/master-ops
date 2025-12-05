'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Activity,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Loader2,
  Zap,
  Webhook,
  Link2,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  ClipboardList,
  ExternalLink
} from 'lucide-react'

type HealthStatus = 'healthy' | 'degraded' | 'down'

interface N8nHealthStatus {
  n8n: HealthStatus
  webhooks: HealthStatus
  integrations: HealthStatus
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

interface Summary {
  total_runs: number
  total_issues_detected: number
  total_auto_resolved: number
  total_tasks_created: number
  resolution_rate: number
  last_run: string | null
}

interface N8nHealthData {
  health: N8nHealthStatus
  summary: Summary
  recentRuns: ResolverRun[]
  activeIssues: ActiveIssue[]
  recommendations: string[]
  lastUpdated: string
}

export default function N8nHealthPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<N8nHealthData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/n8n/health')
      if (!res.ok) {
        throw new Error('Failed to fetch n8n health data')
      }
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const getHealthIcon = (status: HealthStatus) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="w-5 h-5 text-green-400" />
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />
      case 'down':
        return <XCircle className="w-5 h-5 text-red-400" />
    }
  }

  const getHealthColor = (status: HealthStatus) => {
    switch (status) {
      case 'healthy':
        return 'text-green-400 bg-green-500/10 border-green-500/20'
      case 'degraded':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
      case 'down':
        return 'text-red-400 bg-red-500/10 border-red-500/20'
    }
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}min`
  }

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    return `${diffDays}d ago`
  }

  const getIssueTypeColor = (type: string) => {
    switch (type) {
      case 'HIGH_ERROR_RATE':
        return 'text-red-400 bg-red-500/10'
      case 'AUTH_EXPIRED':
      case 'CREDENTIAL_MISSING':
        return 'text-orange-400 bg-orange-500/10'
      case 'STALE_WORKFLOW':
        return 'text-yellow-400 bg-yellow-500/10'
      case 'WEBHOOK_FAILED':
        return 'text-blue-400 bg-blue-500/10'
      default:
        return 'text-gray-400 bg-gray-500/10'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">n8n Health</h1>
          <p className="text-gray-400 mt-1">Workflow automation monitoring</p>
        </div>
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-400">
          {error}
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">n8n Health</h1>
          <p className="text-gray-400 mt-1">Workflow automation monitoring & daily resolver</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://automation.growthcohq.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open n8n
          </a>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Health Status Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className={`border rounded-lg p-4 ${getHealthColor(data.health.n8n)}`}>
          <div className="flex items-center gap-3">
            {getHealthIcon(data.health.n8n)}
            <div>
              <p className="text-sm text-gray-400">n8n Instance</p>
              <p className="text-lg font-semibold capitalize">{data.health.n8n}</p>
            </div>
          </div>
        </div>
        <div className={`border rounded-lg p-4 ${getHealthColor(data.health.webhooks)}`}>
          <div className="flex items-center gap-3">
            {getHealthIcon(data.health.webhooks)}
            <div>
              <p className="text-sm text-gray-400">Webhooks</p>
              <p className="text-lg font-semibold capitalize">{data.health.webhooks}</p>
            </div>
          </div>
        </div>
        <div className={`border rounded-lg p-4 ${getHealthColor(data.health.integrations)}`}>
          <div className="flex items-center gap-3">
            {getHealthIcon(data.health.integrations)}
            <div>
              <p className="text-sm text-gray-400">Integrations</p>
              <p className="text-lg font-semibold capitalize">{data.health.integrations}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Last Run</span>
          </div>
          <p className="text-xl font-semibold text-white">
            {data.summary.last_run ? formatRelativeTime(data.summary.last_run) : 'Never'}
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">Issues (7d)</span>
          </div>
          <p className="text-xl font-semibold text-white">{data.summary.total_issues_detected}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm">Auto-Resolved</span>
          </div>
          <p className="text-xl font-semibold text-green-400">{data.summary.total_auto_resolved}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <ClipboardList className="w-4 h-4" />
            <span className="text-sm">Tasks Created</span>
          </div>
          <p className="text-xl font-semibold text-yellow-400">{data.summary.total_tasks_created}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Resolution Rate</span>
          </div>
          <p className="text-xl font-semibold text-blue-400">{data.summary.resolution_rate}%</p>
        </div>
      </div>

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-lg p-4">
          <h3 className="text-yellow-400 font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Recommendations
          </h3>
          <ul className="space-y-2">
            {data.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-gray-300">
                <ArrowRight className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* Recent Resolver Runs */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg">
          <div className="p-4 border-b border-gray-800">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              Recent Resolver Runs
            </h3>
          </div>
          <div className="divide-y divide-gray-800">
            {data.recentRuns.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No resolver runs recorded yet
              </div>
            ) : (
              data.recentRuns.slice(0, 5).map(run => (
                <div key={run.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">
                      {formatRelativeTime(run.timestamp)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDuration(run.duration_ms)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-white">
                      {run.issues_detected} detected
                    </span>
                    <span className="text-green-400">
                      {run.auto_resolved} resolved
                    </span>
                    {run.tasks_created > 0 && (
                      <span className="text-yellow-400">
                        {run.tasks_created} tasks
                      </span>
                    )}
                    {run.failed > 0 && (
                      <span className="text-red-400">
                        {run.failed} failed
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Issues */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg">
          <div className="p-4 border-b border-gray-800">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              Recent Issues
            </h3>
          </div>
          <div className="divide-y divide-gray-800">
            {data.activeIssues.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No recent issues
              </div>
            ) : (
              data.activeIssues.slice(0, 5).map(issue => (
                <div key={issue.id} className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded ${getIssueTypeColor(issue.type)}`}>
                      {issue.type}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatRelativeTime(issue.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-white font-medium truncate">
                    {issue.workflow_name}
                  </p>
                  <p className="text-xs text-gray-400 truncate mt-1">
                    {issue.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-indigo-400 mt-0.5" />
          <div>
            <h4 className="text-white font-medium">Daily n8n Resolver</h4>
            <p className="text-sm text-gray-400 mt-1">
              The resolver runs automatically 2 minutes after Windows login. It detects issues from most recent to oldest,
              auto-fixes what it can (rate limits, stale workflows, connection failures), and creates dashboard tasks
              for issues needing human attention (credential refresh, high error rates).
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Run manually: <code className="text-indigo-400">npx tsx scripts/daily-n8n-resolver.ts</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
