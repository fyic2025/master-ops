'use client'

import { useState, useEffect } from 'react'
import {
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  Clock,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Filter,
  ChevronDown
} from 'lucide-react'
import { SeoFixSingleButton, SeoFixBatchButton } from './FixWithClaudeButton'
import type { SeoIssue } from '@/lib/seo/prompt-generator'

interface SeoIssuesPanelProps {
  business: string
  className?: string
}

const issueTypeLabels: Record<string, string> = {
  not_found_404: '404 Not Found',
  soft_404: 'Soft 404',
  server_error: 'Server Error',
  blocked_robots: 'Blocked by robots.txt',
  blocked_noindex: 'Blocked by noindex',
  crawled_not_indexed: 'Crawled but Not Indexed',
}

const issueTypeIcons: Record<string, React.ReactNode> = {
  not_found_404: <XCircle className="w-4 h-4 text-red-400" />,
  soft_404: <AlertTriangle className="w-4 h-4 text-orange-400" />,
  server_error: <AlertCircle className="w-4 h-4 text-red-400" />,
  blocked_robots: <AlertTriangle className="w-4 h-4 text-yellow-400" />,
  blocked_noindex: <AlertTriangle className="w-4 h-4 text-yellow-400" />,
  crawled_not_indexed: <AlertCircle className="w-4 h-4 text-orange-400" />,
}

const fixStatusColors: Record<string, string> = {
  pending: 'bg-zinc-600 text-zinc-200',
  in_progress: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  failed: 'bg-red-500/20 text-red-400 border border-red-500/30',
  resolved: 'bg-green-500/20 text-green-400 border border-green-500/30',
}

export function SeoIssuesPanel({ business, className = '' }: SeoIssuesPanelProps) {
  const [issues, setIssues] = useState<SeoIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [summary, setSummary] = useState<{
    total: number
    critical: number
    warning: number
    byType: Record<string, number>
    byFixStatus: Record<string, number>
  } | null>(null)

  const fetchIssues = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ business })
      if (filterType !== 'all') params.set('issue_type', filterType)

      const response = await fetch(`/api/seo/issues?${params}`)
      const data = await response.json()

      if (!response.ok) throw new Error(data.error)

      setIssues(data.issues || [])
      setSummary(data.summary)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIssues()
  }, [business, filterType])

  // Filter by fix status on client side
  const filteredIssues = issues.filter(issue => {
    if (filterStatus === 'all') return true
    return issue.fix_status === filterStatus
  })

  // Group issues by status for bucket display
  const pendingIssues = filteredIssues.filter(i => i.fix_status === 'pending' || !i.fix_status)
  const inProgressIssues = filteredIssues.filter(i => i.fix_status === 'in_progress')
  const failedIssues = filteredIssues.filter(i => i.fix_status === 'failed')

  if (loading && issues.length === 0) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-red-400">{error}</p>
        <button
          onClick={fetchIssues}
          className="mt-4 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Header with filters and batch actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-zinc-100">SEO Issues</h3>
          {summary && (
            <div className="flex items-center gap-2 text-sm">
              <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400">
                {summary.critical} critical
              </span>
              <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                {summary.warning} warning
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Type filter */}
          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="appearance-none bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 pr-8 text-sm text-zinc-300 focus:outline-none focus:border-zinc-600"
            >
              <option value="all">All Types</option>
              {Object.entries(issueTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          </div>

          {/* Status filter */}
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="appearance-none bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 pr-8 text-sm text-zinc-300 focus:outline-none focus:border-zinc-600"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="failed">Failed</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          </div>

          {/* Refresh button */}
          <button
            onClick={fetchIssues}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200"
            title="Refresh issues"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Batch fix buttons */}
      {(pendingIssues.length > 0 || failedIssues.length > 0) && (
        <div className="flex gap-3 mb-6">
          {pendingIssues.length > 0 && (
            <SeoFixBatchButton
              issues={pendingIssues}
              business={business}
              onFixStarted={fetchIssues}
            />
          )}
          {failedIssues.length > 0 && (
            <SeoFixBatchButton
              issues={failedIssues}
              business={business}
              variant="retry"
              onFixStarted={fetchIssues}
            />
          )}
        </div>
      )}

      {/* Three-bucket layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending bucket */}
        <IssuesBucket
          title="Pending"
          issues={pendingIssues}
          business={business}
          emptyText="No pending issues"
          color="zinc"
          onRefresh={fetchIssues}
        />

        {/* In Progress bucket */}
        <IssuesBucket
          title="In Progress"
          issues={inProgressIssues}
          business={business}
          emptyText="No fixes in progress"
          color="yellow"
          onRefresh={fetchIssues}
        />

        {/* Failed bucket */}
        <IssuesBucket
          title="Failed"
          issues={failedIssues}
          business={business}
          emptyText="No failed fixes"
          color="red"
          onRefresh={fetchIssues}
        />
      </div>
    </div>
  )
}

interface IssuesBucketProps {
  title: string
  issues: SeoIssue[]
  business: string
  emptyText: string
  color: 'zinc' | 'yellow' | 'red'
  onRefresh: () => void
}

function IssuesBucket({ title, issues, business, emptyText, color, onRefresh }: IssuesBucketProps) {
  const colorClasses = {
    zinc: 'border-zinc-700',
    yellow: 'border-yellow-500/30',
    red: 'border-red-500/30',
  }

  const headerColors = {
    zinc: 'text-zinc-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
  }

  return (
    <div className={`border rounded-lg ${colorClasses[color]} bg-zinc-900/50`}>
      <div className="px-4 py-3 border-b border-zinc-800">
        <h4 className={`font-medium ${headerColors[color]}`}>
          {title} ({issues.length})
        </h4>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {issues.length === 0 ? (
          <div className="px-4 py-8 text-center text-zinc-500 text-sm">
            {emptyText}
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {issues.map((issue) => (
              <IssueRow
                key={issue.id}
                issue={issue}
                business={business}
                onFixStarted={onRefresh}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface IssueRowProps {
  issue: SeoIssue
  business: string
  onFixStarted: () => void
}

function IssueRow({ issue, business, onFixStarted }: IssueRowProps) {
  const [expanded, setExpanded] = useState(false)

  // Extract path from URL for display
  const urlPath = (() => {
    try {
      const url = new URL(issue.url)
      return url.pathname
    } catch {
      return issue.url
    }
  })()

  // Calculate traffic impact
  const trafficImpact = issue.traffic_before && issue.traffic_after !== undefined && issue.traffic_after !== null
    ? Math.round(((issue.traffic_after - issue.traffic_before) / issue.traffic_before) * 100)
    : null

  return (
    <div className="px-4 py-3 hover:bg-zinc-800/50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {issueTypeIcons[issue.issue_type] || <AlertCircle className="w-4 h-4 text-zinc-400" />}
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              issue.severity === 'critical'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              {issue.severity}
            </span>
            <span className="text-xs text-zinc-500">
              {issueTypeLabels[issue.issue_type] || issue.issue_type}
            </span>
          </div>

          <a
            href={issue.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-300 hover:text-blue-400 truncate block"
            title={issue.url}
          >
            {urlPath}
            <ExternalLink className="w-3 h-3 inline-block ml-1 opacity-50" />
          </a>

          <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(issue.first_detected).toLocaleDateString()}
            </span>
            {trafficImpact !== null && (
              <span className={`flex items-center gap-1 ${
                trafficImpact < 0 ? 'text-red-400' : 'text-green-400'
              }`}>
                <TrendingDown className="w-3 h-3" />
                {trafficImpact}%
              </span>
            )}
            {issue.linked_task_id && (
              <a
                href={`/tasks?id=${issue.linked_task_id}`}
                className="text-blue-400 hover:underline"
              >
                View Task
              </a>
            )}
          </div>
        </div>

        <SeoFixSingleButton
          issue={issue}
          business={business}
          compact
          onFixStarted={onFixStarted}
        />
      </div>
    </div>
  )
}

export default SeoIssuesPanel
