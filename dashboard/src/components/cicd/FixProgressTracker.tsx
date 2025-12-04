'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle,
  Circle,
  FileCode,
  TestTube,
  Bug,
  Wrench,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Trophy,
  Target
} from 'lucide-react'

export interface TrackableIssue {
  id: string
  issue_type: string
  file_path: string | null
  line_number: number | null
  message: string
  code: string | null
}

interface FixProgressTrackerProps {
  issues: TrackableIssue[]
  title?: string
  onIssueFixed?: (issueId: string) => void
  onAllFixed?: () => void
}

const issueTypeConfig: Record<string, { icon: typeof AlertCircle; label: string; color: string; bgColor: string }> = {
  typescript_error: { icon: FileCode, label: 'TypeScript', color: 'text-red-400', bgColor: 'bg-red-500' },
  test_failure: { icon: TestTube, label: 'Tests', color: 'text-yellow-400', bgColor: 'bg-yellow-500' },
  lint_error: { icon: Bug, label: 'Lint', color: 'text-orange-400', bgColor: 'bg-orange-500' },
  build_error: { icon: Wrench, label: 'Build', color: 'text-red-500', bgColor: 'bg-red-600' },
}

export function FixProgressTracker({
  issues,
  title = 'Fix Progress',
  onIssueFixed,
  onAllFixed
}: FixProgressTrackerProps) {
  const [fixedIds, setFixedIds] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'type' | 'file'>('type')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [isAnimating, setIsAnimating] = useState(false)

  const totalIssues = issues.length
  const fixedCount = fixedIds.size
  const remainingCount = totalIssues - fixedCount
  const progressPercent = totalIssues > 0 ? Math.round((fixedCount / totalIssues) * 100) : 100

  // Group issues by type
  const byType = issues.reduce((acc, issue) => {
    const type = issue.issue_type || 'unknown'
    if (!acc[type]) acc[type] = []
    acc[type].push(issue)
    return acc
  }, {} as Record<string, TrackableIssue[]>)

  // Group issues by file
  const byFile = issues.reduce((acc, issue) => {
    const file = issue.file_path || 'Unknown File'
    if (!acc[file]) acc[file] = []
    acc[file].push(issue)
    return acc
  }, {} as Record<string, TrackableIssue[]>)

  const toggleFixed = useCallback((issueId: string) => {
    setFixedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(issueId)) {
        newSet.delete(issueId)
      } else {
        newSet.add(issueId)
        onIssueFixed?.(issueId)
      }
      return newSet
    })
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 300)
  }, [onIssueFixed])

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(section)) {
        newSet.delete(section)
      } else {
        newSet.add(section)
      }
      return newSet
    })
  }

  const markAllFixed = () => {
    setFixedIds(new Set(issues.map(i => i.id)))
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 300)
  }

  const resetProgress = () => {
    setFixedIds(new Set())
  }

  // Check if all fixed
  useEffect(() => {
    if (fixedCount === totalIssues && totalIssues > 0) {
      onAllFixed?.()
    }
  }, [fixedCount, totalIssues, onAllFixed])

  const getTypeStats = (type: string) => {
    const typeIssues = byType[type] || []
    const fixed = typeIssues.filter(i => fixedIds.has(i.id)).length
    return { total: typeIssues.length, fixed, remaining: typeIssues.length - fixed }
  }

  const getFileStats = (file: string) => {
    const fileIssues = byFile[file] || []
    const fixed = fileIssues.filter(i => fixedIds.has(i.id)).length
    return { total: fileIssues.length, fixed, remaining: fileIssues.length - fixed }
  }

  if (totalIssues === 0) {
    return (
      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6 text-center">
        <Trophy className="w-12 h-12 text-green-500 mx-auto mb-2" />
        <h3 className="text-lg font-semibold text-green-400">All Clear!</h3>
        <p className="text-gray-400 text-sm mt-1">No issues to fix</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      {/* Header with overall progress */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-white">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetProgress}
              className="p-1.5 text-gray-400 hover:text-white transition-colors"
              title="Reset progress"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={markAllFixed}
              className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              Mark All Fixed
            </button>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="relative">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-400">
              <span className="text-green-400 font-semibold">{fixedCount}</span> fixed of{' '}
              <span className="text-white font-semibold">{totalIssues}</span> issues
            </span>
            <span className={`font-bold ${
              progressPercent === 100 ? 'text-green-400' :
              progressPercent >= 75 ? 'text-blue-400' :
              progressPercent >= 50 ? 'text-yellow-400' :
              'text-gray-400'
            }`}>
              {progressPercent}%
            </span>
          </div>
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progressPercent === 100 ? 'bg-green-500' :
                progressPercent >= 75 ? 'bg-blue-500' :
                progressPercent >= 50 ? 'bg-yellow-500' :
                'bg-gray-600'
              } ${isAnimating ? 'animate-pulse' : ''}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center p-2 bg-gray-800/50 rounded-lg">
            <div className="text-2xl font-bold text-green-400">{fixedCount}</div>
            <div className="text-xs text-gray-500">Fixed</div>
          </div>
          <div className="text-center p-2 bg-gray-800/50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-400">{remainingCount}</div>
            <div className="text-xs text-gray-500">Remaining</div>
          </div>
          <div className="text-center p-2 bg-gray-800/50 rounded-lg">
            <div className="text-2xl font-bold text-white">{totalIssues}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
        </div>
      </div>

      {/* View mode toggle */}
      <div className="p-3 border-b border-gray-800 flex gap-2">
        <button
          onClick={() => setViewMode('type')}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            viewMode === 'type'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          By Type
        </button>
        <button
          onClick={() => setViewMode('file')}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            viewMode === 'file'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          By File
        </button>
      </div>

      {/* Issues by Type */}
      {viewMode === 'type' && (
        <div className="divide-y divide-gray-800">
          {Object.entries(byType).map(([type, typeIssues]) => {
            const config = issueTypeConfig[type] || { icon: AlertCircle, label: type, color: 'text-gray-400', bgColor: 'bg-gray-500' }
            const Icon = config.icon
            const stats = getTypeStats(type)
            const typeProgress = stats.total > 0 ? Math.round((stats.fixed / stats.total) * 100) : 100
            const isExpanded = expandedSections.has(type)

            return (
              <div key={type}>
                <button
                  onClick={() => toggleSection(type)}
                  className="w-full p-4 flex items-center gap-3 hover:bg-gray-800/30 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                  <Icon className={`w-5 h-5 ${config.color}`} />
                  <span className="font-medium text-white flex-1 text-left">{config.label}</span>

                  {/* Mini progress bar */}
                  <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${stats.remaining === 0 ? 'bg-green-500' : config.bgColor} transition-all duration-300`}
                      style={{ width: `${typeProgress}%` }}
                    />
                  </div>

                  <span className={`text-sm ${stats.remaining === 0 ? 'text-green-400' : 'text-gray-400'}`}>
                    {stats.fixed}/{stats.total}
                  </span>

                  {stats.remaining === 0 && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                </button>

                {isExpanded && (
                  <div className="bg-gray-950/50 divide-y divide-gray-800/50">
                    {typeIssues.map((issue) => (
                      <IssueCheckItem
                        key={issue.id}
                        issue={issue}
                        isFixed={fixedIds.has(issue.id)}
                        onToggle={() => toggleFixed(issue.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Issues by File */}
      {viewMode === 'file' && (
        <div className="divide-y divide-gray-800">
          {Object.entries(byFile).map(([file, fileIssues]) => {
            const stats = getFileStats(file)
            const fileProgress = stats.total > 0 ? Math.round((stats.fixed / stats.total) * 100) : 100
            const isExpanded = expandedSections.has(file)
            const shortFile = file.split('/').slice(-2).join('/')

            return (
              <div key={file}>
                <button
                  onClick={() => toggleSection(file)}
                  className="w-full p-4 flex items-center gap-3 hover:bg-gray-800/30 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                  <FileCode className="w-4 h-4 text-gray-400" />
                  <span className="font-mono text-sm text-white flex-1 text-left truncate" title={file}>
                    {shortFile}
                  </span>

                  {/* Mini progress bar */}
                  <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${stats.remaining === 0 ? 'bg-green-500' : 'bg-blue-500'} transition-all duration-300`}
                      style={{ width: `${fileProgress}%` }}
                    />
                  </div>

                  <span className={`text-sm ${stats.remaining === 0 ? 'text-green-400' : 'text-gray-400'}`}>
                    {stats.fixed}/{stats.total}
                  </span>

                  {stats.remaining === 0 && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                </button>

                {isExpanded && (
                  <div className="bg-gray-950/50 divide-y divide-gray-800/50">
                    {fileIssues.map((issue) => (
                      <IssueCheckItem
                        key={issue.id}
                        issue={issue}
                        isFixed={fixedIds.has(issue.id)}
                        onToggle={() => toggleFixed(issue.id)}
                        showLine
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Completion celebration */}
      {progressPercent === 100 && (
        <div className="p-4 bg-green-500/10 border-t border-green-500/20">
          <div className="flex items-center justify-center gap-2 text-green-400">
            <Trophy className="w-5 h-5" />
            <span className="font-semibold">All issues fixed!</span>
          </div>
        </div>
      )}
    </div>
  )
}

function IssueCheckItem({
  issue,
  isFixed,
  onToggle,
  showLine = false
}: {
  issue: TrackableIssue
  isFixed: boolean
  onToggle: () => void
  showLine?: boolean
}) {
  const config = issueTypeConfig[issue.issue_type] || { icon: AlertCircle, label: issue.issue_type, color: 'text-gray-400', bgColor: 'bg-gray-500' }
  const Icon = config.icon

  return (
    <button
      onClick={onToggle}
      className={`w-full px-4 py-3 flex items-start gap-3 text-left transition-all duration-200 ${
        isFixed ? 'bg-green-500/5' : 'hover:bg-gray-800/30'
      }`}
    >
      <div className="mt-0.5">
        {isFixed ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : (
          <Circle className="w-5 h-5 text-gray-600 hover:text-gray-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${isFixed ? 'text-gray-500' : config.color}`} />
          {showLine && issue.line_number && (
            <span className="text-xs text-gray-500">Line {issue.line_number}</span>
          )}
          {issue.code && (
            <span className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">
              {issue.code}
            </span>
          )}
        </div>
        <p className={`text-sm mt-1 ${isFixed ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
          {issue.message}
        </p>
      </div>
    </button>
  )
}

export default FixProgressTracker
