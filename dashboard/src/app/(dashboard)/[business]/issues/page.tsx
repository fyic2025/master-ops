'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  AlertCircle,
  Info,
  RefreshCw,
  CheckSquare,
  Square,
  Zap,
  Hand,
  TrendingUp,
  DollarSign,
  Clock,
  Filter,
  ChevronDown,
  ChevronRight,
  FileCode,
  ListTodo,
  Activity,
  BarChart3,
  Check,
  X,
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'

interface UnifiedIssue {
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
  estimated_cost: number
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

interface UnifiedResponse {
  issues: UnifiedIssue[]
  bySource: Record<string, UnifiedIssue[]>
  bySeverity: Record<string, UnifiedIssue[]>
  byBusiness: Record<string, UnifiedIssue[]>
  byCategory: Record<string, UnifiedIssue[]>
  summary: {
    total: number
    high: number
    medium: number
    low: number
    auto_fixable: number
    total_estimated_cost: number
    by_source: { task: number; cicd: number; health: number }
  }
  autoSolveStats: AutoSolveStats
}

async function fetchUnifiedIssues(): Promise<UnifiedResponse> {
  const res = await fetch('/api/issues/unified')
  if (!res.ok) throw new Error('Failed to fetch issues')
  return res.json()
}

async function bulkUpdateExecutionType(ids: string[], execution_type: 'auto' | 'manual') {
  const res = await fetch('/api/issues/unified', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, execution_type })
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Update failed')
  }
  return res.json()
}

const severityConfig = {
  high: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' },
  medium: { icon: AlertCircle, color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' },
  low: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' },
}

const sourceConfig = {
  task: { icon: ListTodo, label: 'Task', color: 'text-purple-400', bg: 'bg-purple-500/20' },
  cicd: { icon: FileCode, label: 'CI/CD', color: 'text-orange-400', bg: 'bg-orange-500/20' },
  health: { icon: Activity, label: 'Health', color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

function formatCost(cents: number): string {
  if (cents < 100) return `${cents}c`
  return `$${(cents / 100).toFixed(2)}`
}

export default function UnifiedIssuesPage() {
  const queryClient = useQueryClient()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [groupBy, setGroupBy] = useState<'severity' | 'source' | 'business' | 'category'>('severity')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['high', 'medium']))
  const [filters, setFilters] = useState({
    severity: '' as '' | 'high' | 'medium' | 'low',
    source: '' as '' | 'task' | 'cicd' | 'health',
    execution_type: '' as '' | 'auto' | 'manual',
  })

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['unified-issues'],
    queryFn: fetchUnifiedIssues,
    refetchInterval: 60000,
  })

  const bulkMutation = useMutation({
    mutationFn: ({ ids, execution_type }: { ids: string[]; execution_type: 'auto' | 'manual' }) =>
      bulkUpdateExecutionType(ids, execution_type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-issues'] })
      setSelectedIds(new Set())
    },
  })

  // Filter issues
  const filteredIssues = useMemo(() => {
    if (!data?.issues) return []
    return data.issues.filter(issue => {
      if (filters.severity && issue.severity !== filters.severity) return false
      if (filters.source && issue.source !== filters.source) return false
      if (filters.execution_type && issue.execution_type !== filters.execution_type) return false
      return true
    })
  }, [data?.issues, filters])

  // Group filtered issues
  const groupedIssues = useMemo(() => {
    const groups: Record<string, UnifiedIssue[]> = {}
    for (const issue of filteredIssues) {
      let key: string
      switch (groupBy) {
        case 'severity':
          key = issue.severity
          break
        case 'source':
          key = issue.source
          break
        case 'business':
          key = issue.business || 'overall'
          break
        case 'category':
          key = issue.category
          break
      }
      if (!groups[key]) groups[key] = []
      groups[key].push(issue)
    }
    return groups
  }, [filteredIssues, groupBy])

  // Selection helpers
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredIssues.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredIssues.map(i => i.id)))
    }
  }

  const toggleGroup = (group: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(group)) {
      newExpanded.delete(group)
    } else {
      newExpanded.add(group)
    }
    setExpandedGroups(newExpanded)
  }

  const selectGroup = (issues: UnifiedIssue[]) => {
    const newSelected = new Set(selectedIds)
    const allSelected = issues.every(i => selectedIds.has(i.id))
    if (allSelected) {
      issues.forEach(i => newSelected.delete(i.id))
    } else {
      issues.forEach(i => newSelected.add(i.id))
    }
    setSelectedIds(newSelected)
  }

  const selectedTaskCount = Array.from(selectedIds).filter(id => id.startsWith('task-')).length

  const stats = data?.autoSolveStats
  const summary = data?.summary

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Unified Issues</h1>
          <p className="text-gray-400 mt-1">All issues across tasks, CI/CD, and health checks</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </header>

      {/* Summary Stats */}
      {!isLoading && summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <StatCard
            label="Total Issues"
            value={summary.total}
            icon={AlertCircle}
            color="text-white"
          />
          <StatCard
            label="High Severity"
            value={summary.high}
            icon={AlertTriangle}
            color={summary.high > 0 ? 'text-red-400' : 'text-green-400'}
          />
          <StatCard
            label="Medium"
            value={summary.medium}
            icon={AlertCircle}
            color={summary.medium > 0 ? 'text-yellow-400' : 'text-green-400'}
          />
          <StatCard
            label="Low"
            value={summary.low}
            icon={Info}
            color="text-blue-400"
          />
          <StatCard
            label="Auto-Fixable"
            value={summary.auto_fixable}
            icon={Zap}
            color="text-purple-400"
          />
          <StatCard
            label="Est. Cost"
            value={formatCost(summary.total_estimated_cost)}
            icon={DollarSign}
            color="text-green-400"
            isText
          />
          <StatCard
            label="Tasks"
            value={summary.by_source.task}
            subValue={`CI/CD: ${summary.by_source.cicd} | Health: ${summary.by_source.health}`}
            icon={ListTodo}
            color="text-gray-400"
          />
        </div>
      )}

      {/* Auto-Solve Success Rate */}
      {stats && stats.total_auto_attempted > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-400" />
            Auto-Solve Performance
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-400">{stats.success_rate}%</p>
              <p className="text-sm text-gray-400">Success Rate</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{stats.total_auto_attempted}</p>
              <p className="text-sm text-gray-400">Total Attempts</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-400">{stats.total_auto_succeeded}</p>
              <p className="text-sm text-gray-400">Succeeded</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-400">{stats.total_auto_failed}</p>
              <p className="text-sm text-gray-400">Failed</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-400">{formatCost(stats.avg_cost_cents)}</p>
              <p className="text-sm text-gray-400">Avg Cost/Task</p>
            </div>
          </div>
          {Object.keys(stats.by_model).length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-800">
              <p className="text-sm text-gray-400 mb-2">By Model:</p>
              <div className="flex flex-wrap gap-3">
                {Object.entries(stats.by_model).map(([model, modelStats]) => (
                  <div key={model} className="bg-gray-800 rounded px-3 py-1.5 text-sm">
                    <span className="text-white font-medium">{model}</span>
                    <span className="text-gray-400 ml-2">
                      {modelStats.successes}/{modelStats.attempts}
                      ({Math.round((modelStats.successes / modelStats.attempts) * 100)}%)
                    </span>
                    <span className="text-green-400 ml-2">{formatCost(modelStats.avg_cost)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters and Group By */}
      <div className="flex flex-wrap items-center gap-4 bg-gray-900 border border-gray-800 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-400">Filters:</span>
        </div>

        <select
          value={filters.severity}
          onChange={(e) => setFilters(f => ({ ...f, severity: e.target.value as any }))}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white"
        >
          <option value="">All Severity</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          value={filters.source}
          onChange={(e) => setFilters(f => ({ ...f, source: e.target.value as any }))}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white"
        >
          <option value="">All Sources</option>
          <option value="task">Tasks</option>
          <option value="cicd">CI/CD</option>
          <option value="health">Health</option>
        </select>

        <select
          value={filters.execution_type}
          onChange={(e) => setFilters(f => ({ ...f, execution_type: e.target.value as any }))}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white"
        >
          <option value="">All Types</option>
          <option value="auto">Auto</option>
          <option value="manual">Manual</option>
        </select>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Group by:</span>
          {(['severity', 'source', 'business', 'category'] as const).map(g => (
            <button
              key={g}
              onClick={() => setGroupBy(g)}
              className={`px-3 py-1.5 rounded text-sm font-medium ${
                groupBy === g
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-14 z-40 bg-blue-600 rounded-lg p-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-white hover:text-blue-200"
            >
              {selectedIds.size === filteredIssues.length ? (
                <CheckSquare className="w-5 h-5" />
              ) : (
                <Square className="w-5 h-5" />
              )}
              <span className="font-medium">{selectedIds.size} selected</span>
            </button>
            {selectedTaskCount < selectedIds.size && (
              <span className="text-blue-200 text-sm">
                ({selectedTaskCount} tasks, {selectedIds.size - selectedTaskCount} non-tasks)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => bulkMutation.mutate({
                ids: Array.from(selectedIds),
                execution_type: 'auto'
              })}
              disabled={bulkMutation.isPending || selectedTaskCount === 0}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              Set Auto ({selectedTaskCount})
            </button>
            <button
              onClick={() => bulkMutation.mutate({
                ids: Array.from(selectedIds),
                execution_type: 'manual'
              })}
              disabled={bulkMutation.isPending || selectedTaskCount === 0}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
            >
              <Hand className="w-4 h-4" />
              Set Manual ({selectedTaskCount})
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-2 text-white hover:text-blue-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Issues List */}
      {isLoading ? (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
          <RefreshCw className="w-12 h-12 text-gray-500 mx-auto mb-2 animate-spin" />
          <p className="text-gray-400">Loading issues...</p>
        </div>
      ) : filteredIssues.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
          <Check className="w-12 h-12 text-green-500 mx-auto mb-2" />
          <p className="text-gray-400">No issues found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(groupedIssues)
            .sort(([a], [b]) => {
              if (groupBy === 'severity') {
                const order = { high: 0, medium: 1, low: 2 }
                return (order[a as keyof typeof order] || 99) - (order[b as keyof typeof order] || 99)
              }
              return a.localeCompare(b)
            })
            .map(([group, issues]) => {
              const isExpanded = expandedGroups.has(group)
              const allSelected = issues.every(i => selectedIds.has(i.id))
              const someSelected = issues.some(i => selectedIds.has(i.id))

              return (
                <div key={group} className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                  {/* Group Header */}
                  <div className="p-4 flex items-center gap-3 border-b border-gray-800">
                    <button
                      onClick={() => selectGroup(issues)}
                      className="text-gray-400 hover:text-white"
                    >
                      {allSelected ? (
                        <CheckSquare className="w-5 h-5 text-blue-400" />
                      ) : someSelected ? (
                        <div className="w-5 h-5 border-2 border-blue-400 rounded flex items-center justify-center">
                          <div className="w-2 h-2 bg-blue-400 rounded-sm" />
                        </div>
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>

                    <button
                      onClick={() => toggleGroup(group)}
                      className="flex items-center gap-3 flex-1 text-left hover:opacity-80"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}

                      {groupBy === 'severity' && (
                        <SeverityBadge severity={group as 'high' | 'medium' | 'low'} />
                      )}
                      {groupBy === 'source' && (
                        <SourceBadge source={group as 'task' | 'cicd' | 'health'} />
                      )}
                      {groupBy !== 'severity' && groupBy !== 'source' && (
                        <span className="text-white font-medium capitalize">{group}</span>
                      )}

                      <span className="text-gray-400 text-sm">({issues.length} issues)</span>
                    </button>

                    <span className="text-sm text-gray-500">
                      Est: {formatCost(issues.reduce((sum, i) => sum + i.estimated_cost, 0))}
                    </span>
                  </div>

                  {/* Issues */}
                  {isExpanded && (
                    <div className="divide-y divide-gray-800">
                      {issues.map(issue => (
                        <IssueRow
                          key={issue.id}
                          issue={issue}
                          selected={selectedIds.has(issue.id)}
                          onToggle={() => toggleSelect(issue.id)}
                          showSource={groupBy !== 'source'}
                          showSeverity={groupBy !== 'severity'}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  subValue,
  icon: Icon,
  color,
  isText = false,
}: {
  label: string
  value: number | string
  subValue?: string
  icon: typeof AlertCircle
  color: string
  isText?: boolean
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-gray-400 text-sm">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {subValue && <p className="text-xs text-gray-500 mt-1">{subValue}</p>}
    </div>
  )
}

function SeverityBadge({ severity }: { severity: 'high' | 'medium' | 'low' }) {
  const config = severityConfig[severity]
  const Icon = config.icon
  return (
    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded ${config.bg} ${config.color} text-sm font-medium capitalize`}>
      <Icon className="w-4 h-4" />
      {severity}
    </span>
  )
}

function SourceBadge({ source }: { source: 'task' | 'cicd' | 'health' }) {
  const config = sourceConfig[source]
  const Icon = config.icon
  return (
    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded ${config.bg} ${config.color} text-sm font-medium`}>
      <Icon className="w-4 h-4" />
      {config.label}
    </span>
  )
}

function IssueRow({
  issue,
  selected,
  onToggle,
  showSource,
  showSeverity,
}: {
  issue: UnifiedIssue
  selected: boolean
  onToggle: () => void
  showSource: boolean
  showSeverity: boolean
}) {
  const sevConfig = severityConfig[issue.severity]
  const srcConfig = sourceConfig[issue.source]

  // Build link to issue
  const getIssueLink = () => {
    if (issue.source === 'task') {
      const taskId = issue.metadata.task_id
      const business = issue.business || 'overall'
      return `/${business}/tasks?highlight=${taskId}`
    }
    if (issue.source === 'cicd') {
      return '/home/cicd'
    }
    if (issue.source === 'health') {
      return '/home/health'
    }
    return '#'
  }

  return (
    <div className={`p-4 hover:bg-gray-800/30 ${selected ? 'bg-blue-500/10' : ''}`}>
      <div className="flex items-start gap-3">
        <button onClick={onToggle} className="mt-0.5 text-gray-400 hover:text-white">
          {selected ? (
            <CheckSquare className="w-5 h-5 text-blue-400" />
          ) : (
            <Square className="w-5 h-5" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {showSeverity && <SeverityBadge severity={issue.severity} />}
            {showSource && <SourceBadge source={issue.source} />}

            {issue.business && (
              <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                {issue.business}
              </span>
            )}

            {issue.execution_type && (
              <span className={`text-xs px-2 py-0.5 rounded ${
                issue.execution_type === 'auto'
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'bg-gray-700 text-gray-400'
              }`}>
                {issue.execution_type === 'auto' ? 'Auto' : 'Manual'}
              </span>
            )}

            {issue.auto_fixable && !issue.execution_type && (
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Auto-fixable
              </span>
            )}
          </div>

          <Link href={getIssueLink()} className="group">
            <p className="text-white font-medium group-hover:text-blue-400 flex items-center gap-1">
              {issue.title}
              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100" />
            </p>
          </Link>

          {issue.description && (
            <p className="text-gray-400 text-sm mt-0.5 truncate">{issue.description}</p>
          )}

          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTimeAgo(issue.created_at)}
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              Est: {formatCost(issue.estimated_cost)}
            </span>
            <span className="text-gray-600">{issue.category}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
